const express = require("express");
const router = express.Router();
const getDb = require("../db");
const BigliettiDAO = require("../daos/BigliettiDAO");
const { catchAsync } = require("../middleware/errorHandler");
const { getFlashMessage } = require("../middleware/flashHelper");


//GET /biglietti - Visualizza biglietti disponibili per l'acquisto
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