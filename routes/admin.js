/*Gestisce la dashboard dell'admin - area riservata per visualizzar statistiche e dati del sito
Ottimizzazione - Promise.all() esegue tutte le query contemporaneamente invece che in sequenza, cosè la dashboard carica + veloce
Pagina /admin mostra panoramica completa del sito con i dati e statistiche in real-time ed è accessibile solo agli amministratori*/
const express = require("express");
const router = express.Router();
const getDb = require("../db");
const { onlyAdmin } = require("../middleware/auth");
const { catchAsync } = require("../middleware/errorHandler");
const fs = require("fs");
const path = require("path");
const { getFlashMessage } = require("../middleware/flashHelper");

//Configurazione
const tempDir = path.join(__dirname, "../temp");

//Crea cartella temp se non esiste
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}


//DASHBOARD ADMIN
//onlyAdmin - middleware che blocca accessi non autorizzati (accesso esclusivo all'admin)
//Dashboard GET /admin - fa 9 query parallele e per valocità nel caricamento, carica tutti i dati simultaneamente
//Dati delle tabelle: utenti registrati, stand prenotati, eventi prenotati attivi, biglietti acquistati
//Statistiche: totale utenti, stand prenotati, eventi attivi, biglietti venduti, incasso totale 
router.get("/", onlyAdmin, catchAsync(async (req, res) => {
  const db = await getDb();

  // Query parallele per performance
  const [
    users,
    standPrenotati,
    purchases,
    eventiPrenotati,
    totalTickets,
    totalRevenue,
    totalUsers,
    totalStandBookings,
    totalEventBookings
  ] = await Promise.all([
    // Dati principali
    db.all("SELECT id, username, email, ruolo FROM utenti"),
    
    db.all(`
      SELECT p.id, p.data_prenotazione, u.username AS espositore, s.nome AS stand 
      FROM stand_prenotati p 
      JOIN utenti u ON p.utente_id = u.id 
      JOIN stand s ON p.stand_id = s.id
      ORDER BY p.data_prenotazione DESC
    `),
    
    db.all(`
      SELECT ba.id, ba.data_acquisto as data, ba.totale_riga as totale, 
             u.username AS acquirente, b.nome AS biglietto, ba.quantita, ba.metodo_pagamento
      FROM biglietti_acquistati ba
      JOIN utenti u ON ba.utente_id = u.id
      JOIN biglietti b ON ba.biglietto_id = b.id
      ORDER BY ba.data_acquisto DESC
    `),
    
    db.all(`
      SELECT ep.id, ep.data_prenotazione, u.username AS utente, e.titolo AS evento, ep.stato
      FROM eventi_prenotati ep 
      JOIN utenti u ON ep.utente_id = u.id 
      JOIN eventi e ON ep.evento_id = e.id 
      WHERE ep.stato = 'attiva'
      ORDER BY ep.data_prenotazione DESC
    `),
    
    // Statistiche
    db.get("SELECT COALESCE(SUM(quantita), 0) AS totale FROM biglietti_acquistati"),
    db.get("SELECT COALESCE(SUM(totale_riga), 0) AS totale FROM biglietti_acquistati"),
    db.get("SELECT COUNT(*) AS totale FROM utenti"),
    db.get(`SELECT COUNT(*) AS totale FROM stand_prenotati p JOIN utenti u ON p.utente_id = u.id JOIN stand s ON p.stand_id = s.id`),
    db.get("SELECT COUNT(*) AS totale FROM eventi_prenotati WHERE stato = 'attiva'")
  ]);

  res.render("admin", {
    user: req.user,
    utenti: users,
    flashMessage: getFlashMessage(req),
    stand_prenotati: standPrenotati,
    eventi_prenotati: eventiPrenotati,
    acquisti: purchases,
    stats: {
      utenti: totalUsers.totale || 0,
      stand_prenotati: totalStandBookings.totale || 0,
      eventi_prenotati: totalEventBookings.totale || 0,
      biglietti: totalTickets.totale || 0,
      incasso: totalRevenue.totale?.toFixed(2) || "0.00",
    },
  });
}));

module.exports = router;