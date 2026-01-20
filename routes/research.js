const express = require("express");
const router = express.Router();
const getDb = require("../db");
const { catchAsync } = require("../middleware/errorHandler");


router.get("/", catchAsync(async (req, res) => {
  const q = req.query.q?.trim();
  const type = req.query.type || 'all';
 
  // Se query vuota, ritorna array vuoto
  if (!q) {
    return res.json([]);
  }

  const db = await getDb();
  const like = `%${q}%`;
  let risultati = [];

  // RICERCA EVENTI
  if (type === 'eventi' || type === 'all') {
    try {
      const eventi = await db.all(
        `SELECT
          'evento' as tipo,
          id,
          titolo as nome,
          descrizione,
          caratteristiche,
          categoria,
          data,
          img
        FROM eventi
        WHERE titolo LIKE ?
           OR descrizione LIKE ?
           OR caratteristiche LIKE ?
           OR categoria LIKE ?
        ORDER BY data DESC`,
        [like, like, like, like]
      );
     
      risultati.push(...eventi);
    } catch (eventiErr) {
      console.error("Errore ricerca eventi:", eventiErr.message);
      // Non bloccare la ricerca se una tabella fallisce
    }
  }

  // RICERCA BIGLIETTI
  if (type === 'biglietti' || type === 'all') {
    try {
      const biglietti = await db.all(
        `SELECT
          'biglietto' as tipo,
          id,
          nome,
          descrizione,
          caratteristiche,
          categoria,
          prezzo,
          disponibili,
          img
        FROM biglietti
        WHERE nome LIKE ?
           OR descrizione LIKE ?
           OR caratteristiche LIKE ?
           OR categoria LIKE ?
        ORDER BY prezzo`,
        [like, like, like, like]
      );
     
      risultati.push(...biglietti);
    } catch (bigliettiErr) {
      console.error("Errore ricerca biglietti:", bigliettiErr.message);
    }
  }

  // Ordina per rilevanza (eventi prima, poi biglietti)
  risultati.sort((a, b) => {
    const priorita = { evento: 1, biglietto: 2 };
    return priorita[a.tipo] - priorita[b.tipo];
  });

  // Limita risultati (performance + UX)
  risultati = risultati.slice(0, 15);

  res.json(risultati);
}));

router.get("/test", catchAsync(async (req, res) => {
  const db = await getDb();
  
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: "connected"
  });
}));

module.exports = router;