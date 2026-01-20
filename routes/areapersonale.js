const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const { catchAsync } = require("../middleware/errorHandler");
const { validators } = require("../middleware/validators");
const getDb = require("../db");
const bcrypt = require("bcrypt");
const UtentiDAO = require("../daos/UtentiDAO");
const PrenotazioneEventiDAO = require("../daos/PrenotazioneEventiDAO");
const { getFlashMessage, setFlash } = require("../middleware/flashHelper");

//GET /areapersonale - Visualizza area personale utente
//Mostra biglietti acquistati, stand prenotati, eventi prenotati
router.get(
  "/",
  ensureAuthenticated,
  catchAsync(async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    const db = await getDb();
    const user = req.user;

    let biglietti = [];
    let stand = [];
    let eventiPrenotati = [];

    // Biglietti acquistati (solo per utenti/visitatori)
    if (user.ruolo === "utente") {
      biglietti = await db.all(
        `SELECT ba.id, ba.quantita, ba.prezzo_unitario, ba.totale_riga, 
              ba.data_acquisto, ba.transaction_id, b.nome as tipo_biglietto, 
              b.prezzo as prezzo_originale
       FROM biglietti_acquistati ba
       JOIN biglietti b ON ba.biglietto_id = b.id
       WHERE ba.utente_id = ?
       ORDER BY ba.data_acquisto DESC`,
        [user.id]
      );
    }

    // Stand prenotati (solo per espositori)
    if (user.ruolo === "espositore") {
      stand = await db.all(
        `SELECT s.id, s.nome,
              s.padiglione,
              s.posizione,
              s.tema,
              s.dimensione,
              s.capienza,
              s.servizi_inclusi,
              s.note,
              p.data_prenotazione,
              p.id AS prenotazione_id
       FROM stand_prenotati p
       JOIN stand s ON s.id = p.stand_id
       WHERE p.utente_id = ?
       ORDER BY p.data_prenotazione DESC`,
        [user.id]
      );
    }

    // Eventi prenotati (per tutti gli utenti)
    const eventiDAO = new PrenotazioneEventiDAO(db);
    eventiPrenotati = await eventiDAO.getPrenotazioniByUtente(user.id);

    res.render("areapersonale", {
      user,
      biglietti,
      stand,
      eventiPrenotati,
      query: req.query,
      flashMessage: getFlashMessage(req),
    });
  })
);

//POST /areapersonale/modifica - Modifica username e email
//Usa validators.updateProfile per validare input
router.post(
  "/modifica",
  ensureAuthenticated,
  validators.updateProfile,
  catchAsync(async (req, res) => {
    const db = await getDb();
    const utentiDAO = new UtentiDAO(db);
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const userId = req.user.id;

    // Controllo se nessun cambio
    if (username === req.user.username && email === req.user.email) {
      return res.redirect("/areapersonale?error=nessun_cambio");
    }

    // Verifica unicità email (se cambiata)
    if (email !== req.user.email) {
      const emailEsistente = await db.get(
        "SELECT id FROM utenti WHERE LOWER(email) = LOWER(?) AND id != ?",
        [email, userId]
      );
      if (emailEsistente) {
        return res.redirect("/areapersonale?error=email_in_uso");
      }
    }

    // Verifica unicità username (se cambiato)
    if (username !== req.user.username) {
      const usernameEsistente = await db.get(
        "SELECT id FROM utenti WHERE username = ? AND id != ?",
        [username, userId]
      );
      if (usernameEsistente) {
        return res.redirect("/areapersonale?error=username_in_uso");
      }
    }

    // Aggiorna profilo
    await utentiDAO.modificaUtente(userId, { username, email });

    // Aggiorna sessione
    req.login({ ...req.user, username, email }, (err) => {
      if (err) {
        console.error("Errore aggiornamento sessione:", err);
        setFlash(req, 'error', 'sessione_non_aggiornata');
        return res.redirect("/areapersonale");
      }
      setFlash(req, 'success', 'profilo_aggiornato');
      res.redirect("/areapersonale");
    });
  })
);

//POST /areapersonale/cambia-password - Cambia password utente
//Validazione inline (specifica per questa route, non serve centralizzarla)
router.post(
  "/cambia-password",
  ensureAuthenticated,
  catchAsync(async (req, res) => {
    const db = await getDb();
    const utentiDAO = new UtentiDAO(db);
    const { passwordAttuale, nuovaPassword, confermaPassword } = req.body;
    const userId = req.user.id;

    // Validazione input
    if (!passwordAttuale || !nuovaPassword || !confermaPassword) {
      return res.redirect("/areapersonale?error=password_non_coincidono");
    }

    if (nuovaPassword !== confermaPassword) {
      return res.redirect("/areapersonale?error=password_non_coincidono");
    }

    if (nuovaPassword.length < 8) {
      return res.redirect("/areapersonale?error=password_troppo_corta");
    }

    if (passwordAttuale === nuovaPassword) {
      return res.redirect("/areapersonale?error=password_uguale");
    }

    // Recupera utente
    const user = await utentiDAO.getById(userId);
    if (!user) {
      return res.redirect("/areapersonale?error=utente_non_trovato");
    }

    // Verifica password attuale
    const match = await bcrypt.compare(passwordAttuale, user.password);
    if (!match) {
      return res.redirect("/areapersonale?error=password_attuale_errata");
    }

    // Hash nuova password
    const saltRounds = parseInt(process.env.BCRYPT_SALT || "10");
    const hash = await bcrypt.hash(nuovaPassword, saltRounds);

    // Aggiorna password
    await utentiDAO.cambiaPassword(userId, hash);

    setFlash(req, 'success', 'password_changed');
    res.redirect("/areapersonale");
  })
);

module.exports = router;
