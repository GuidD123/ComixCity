/*Route per ricerca in real-time -> utente digita "gaming" e vede subito gli eventi e biglietti correlati senza ricaricare la pagina*/

const express = require("express");
const router = express.Router();
const getDb = require("../db");
const { catchAsync } = require("../middleware/errorHandler");


/*GET /research - ricerca eventi e biglietti
query params: q: testo digitato dall'utente; type: filtro categoria (eventi, biglietti..); esempio: /research?q=gaming&type=eventi*/
router.get("/", catchAsync(async (req, res) => {
  const q = req.query.q?.trim();
  const type = req.query.type || 'all';
 
  //Se query vuota, ritorna array vuoto - se utente non ha digitato nulla - torna array vuoto ed evita query database inutili -> Interfaccia Utente il dropdown ricerca resta chiuso se campo vuoto
  if (!q) {
    return res.json([]);
  }

  const db = await getDb();
  const like = `%${q}%`;
  let risultati = [];

  //RICERCA EVENTI ---> case sensitive in SQLite, cerca in 4 campi: titolo, descrizione, caratteristiche, categoria 
  //Eventi ordinati per + recenti prima 
  if (type === 'eventi' || type === 'all') {

    //Se tabella eventi non esiste - non blocca ricerca biglietti
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
      //Non blocca la ricerca se una tabella fallisce
    }
  }

  //RICERCA BIGLIETTI --> Ordinamento per prezzo crescente --  campi in più: prezzo, disponibili
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

  //Ordina per rilevanza (eventi prima, poi biglietti)
  risultati.sort((a, b) => {
    const priorita = { evento: 1, biglietto: 2 };
    return priorita[a.tipo] - priorita[b.tipo];
  });

  //Limita risultati
  risultati = risultati.slice(0, 15);

  res.json(risultati);
}));

//GET /research/test -> health check API - verifica API funzionante + test connessione database
router.get("/test", catchAsync(async (req, res) => {
  const db = await getDb();
  
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: "connected"
  });
}));

module.exports = router;