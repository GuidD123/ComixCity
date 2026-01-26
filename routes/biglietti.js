const express = require("express");
const router = express.Router();
const getDb = require("../db");
const BigliettiDAO = require("../daos/BigliettiDAO");
const { catchAsync } = require("../middleware/errorHandler");
const { getFlashMessage } = require("../middleware/flashHelper");


//GET /biglietti - Visualizza biglietti disponibili per l'acquisto -  accessibile a tutti, loggati e non loggati 
//carica biglietti disponibili - dao.getDisponibili() solo con disponibili > 0
//legge carrello dalla sessione (req.session.carrello)
//Calcola badge carrello - somma quantità totale elementi
//infine passa tutto alla view biglietti.ejs
router.get("/", catchAsync(async (req, res) => {
  const db = await getDb();
  const carrello = req.session.carrello || [];
  const dao = new BigliettiDAO(db);
  const biglietti = await dao.getDisponibili();
  const cartCount = carrello.reduce((tot, item) => tot + item.quantita, 0);
   
  res.render("biglietti", {
    biglietti,
    carrello,
    cartCount,
    query: req.query,
    user: req.user || null,
    flashMessage: getFlashMessage(req)
  });
}));

module.exports = router;