const express = require("express");
const router = express.Router();
const getDb = require("../db");
const EventiDAO = require("../daos/EventiDAO");
const PrenotazioneEventiDAO = require("../daos/PrenotazioneEventiDAO");
const { onlyAdmin, ensureAuthenticated } = require("../middleware/auth");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const { validators } = require("../middleware/validators");
const TransactionLogger = require("../middleware/transactionLogger");
const { getFlashMessage, setFlash } = require("../middleware/flashHelper");

//ROUTES PUBBLICHE
router.get(
  "/",
  catchAsync(async (req, res) => {
    const db = await getDb();
    const eventiDao = new EventiDAO(db);
    const prenotazioniDao = new PrenotazioneEventiDAO(db);
    const query = req.query.q;

    //Recupera eventi (con o senza ricerca)
    let eventi =
      query && query.trim().length > 0
        ? await eventiDao.cerca(query)
        : await eventiDao.getTutti();

    //Se utente loggato, recupera sue prenotazioni
    let eventiPrenotati = [];
    if (req.user) {
      const prenotazioni = await prenotazioniDao.getPrenotazioniByUtente(
        req.user.id
      );
      eventiPrenotati = prenotazioni
        .filter((p) => p.stato === "attiva")
        .map((p) => p.evento_id);
    }

    //Aggiungi conteggio iscritti per eventi in parallelo
    await Promise.all(
      eventi.map(async (evento) => {
        evento.iscritti_count = await prenotazioniDao.contaIscritti(evento.id);
        evento.prenotato = eventiPrenotati.includes(evento.id);
      })
    );

    res.render("eventi", {
      eventi,
      user: req.user || null,
      query: req.query || {},
      flashMessage: getFlashMessage(req),
    });
  })
);

router.post(
  "/:id/prenota",
  ensureAuthenticated,
  catchAsync(async (req, res) => {
    const eventoId = parseInt(req.params.id);
    const utenteId = req.user.id;
    const { note, tipo_partecipazione } = req.body;

    //Validazione
    if (isNaN(eventoId) || eventoId <= 0) {
      throw new AppError("ID evento non valido", 400);
    }

    const db = await getDb();
    //Inizio transazione con lock
    await db.run("BEGIN IMMEDIATE");

    try {
      //Verifica esistenza evento (dentro transazione)
      const evento = await db.get("SELECT * FROM eventi WHERE id = ?", [
        eventoId,
      ]);

      if (!evento) {
        await db.run("ROLLBACK");
        throw new AppError("Evento non trovato", 404);
      }

      if (evento.prenotabile !== 1) {
        await db.run("ROLLBACK");
        throw new AppError("Questo evento non è prenotabile", 403);
      }

      //Verifica se già prenotato
      const giaPrenotato = await db.get(
        "SELECT * FROM eventi_prenotati WHERE evento_id = ? AND utente_id = ? AND stato = 'attiva'",
        [eventoId, utenteId]
      );

      if (giaPrenotato) {
        await db.run("ROLLBACK");
        throw new AppError("Sei già prenotato per questo evento", 409);
      }

      //Inserisci prenotazione
      await db.run(
        `INSERT INTO eventi_prenotati 
       (evento_id, utente_id, stato, tipo_partecipazione, note, data_prenotazione) 
       VALUES (?, ?, 'attiva', ?, ?, datetime('now'))`,
        [
          eventoId,
          utenteId,
          tipo_partecipazione || "partecipante",
          note || null,
        ]
      );

      await db.run("COMMIT");

      console.log(`Evento prenotato: User ${req.user.id} -> Evento ${eventoId}`);

      setFlash(req, 'success', 'evento_prenotato');
      res.redirect("/eventi");
    } catch (error) {
      //Rollback sicuro
      try {
        await db.run("ROLLBACK");
      } catch (rollbackError) {
        console.error("Transazione già chiusa:", rollbackError.message);
      }
      throw error;
    }
  })
);

router.post(
  "/:id/annulla",
  ensureAuthenticated,
  catchAsync(async (req, res) => {
    const eventoId = parseInt(req.params.id);
    const utenteId = req.user.id;

    //Validazione
    if (isNaN(eventoId) || eventoId <= 0) {
      throw new AppError("ID evento non valido", 400);
    }

    const db = await getDb();

    //annullamento
    await db.run("BEGIN IMMEDIATE");

    try {
      //Verifica prenotazione esistente (dentro transazione)
      const prenotazione = await db.get(
        "SELECT * FROM eventi_prenotati WHERE evento_id = ? AND utente_id = ? AND stato = 'attiva'",
        [eventoId, utenteId]
      );

      if (!prenotazione) {
        await db.run("ROLLBACK");
        throw new AppError(
          "Non hai una prenotazione attiva per questo evento",
          404
        );
      }

      //Aggiorna stato a 'annullata'
      await db.run(
        "UPDATE eventi_prenotati SET stato = 'annullata' WHERE evento_id = ? AND utente_id = ?",
        [eventoId, utenteId]
      );

      //COMMIT
      await db.run("COMMIT");

      setFlash(req, 'success', 'prenotazione_annullata');
      res.redirect("/eventi");
    } catch (error) {
      try {
        await db.run("ROLLBACK");
      } catch (rollbackError) {
        console.error("Transazione già chiusa:", rollbackError.message);
      }
      throw error;
    }
  })
);

//EVENTI UTENTE
router.get(
  "/miei",
  ensureAuthenticated,
  catchAsync(async (req, res) => {
    const db = await getDb();
    const prenotazioniDao = new PrenotazioneEventiDAO(db);
    const eventiPrenotati = await prenotazioniDao.getPrenotazioniByUtente(
      req.user.id
    );

    res.render("eventi-miei", {
      eventiPrenotati,
      user: req.user,
      flashMessage: getFlashMessage(req),
    });
  })
);

//LISTA PARTECIPANTI (ADMIN)
router.get(
  "/:id/partecipanti",
  onlyAdmin,
  catchAsync(async (req, res) => {
    const eventoId = parseInt(req.params.id);

    if (isNaN(eventoId) || eventoId <= 0) {
      throw new AppError("ID evento non valido", 400);
    }

    const db = await getDb();
    const eventiDao = new EventiDAO(db);
    const prenotazioniDao = new PrenotazioneEventiDAO(db);

    const evento = await eventiDao.getById(eventoId);
    if (!evento) {
      throw new AppError("Evento non trovato", 404);
    }

    const partecipanti = await prenotazioniDao.getPartecipanti(eventoId);

    res.render("admin/partecipanti-evento", {
      evento,
      partecipanti,
      user: req.user,
      flashMessage: getFlashMessage(req),
    });
  })
);



//ADMIN ROUTES - GESTIONE EVENTI

router.get("/nuovo", onlyAdmin, (req, res) => {
  res.render("evento-form", {
    evento: null,
    titolo: "Nuovo Evento - ComixCity",
    user: req.user,
    flashMessage: getFlashMessage(req),
  });
});

//Crea nuovo evento (solo admin)
router.post(
  "/nuovo",
  onlyAdmin,
  validators.evento, //validazione tramite validators
  catchAsync(async (req, res) => {
    const {
      titolo,
      descrizione,
      data,
      img,
      luogo,
      categoria,
      caratteristiche,
      prenotabile,
    } = req.body;

    const db = await getDb();
    const eventiDao = new EventiDAO(db);

    await eventiDao.aggiungi({
      titolo: titolo.trim(),
      descrizione: descrizione.trim(),
      data,
      img: img?.trim() || null,
      luogo: luogo?.trim() || null,
      categoria: categoria || null,
      caratteristiche: caratteristiche?.trim() || null,
      prenotabile: prenotabile === "on" || prenotabile === "1" ? 1 : 0,
      creato_da: req.user.id,
    });

    setFlash(req, 'success', 'evento_creato');
    res.redirect("/eventi");
  })
);

//Form modifica evento (solo admin)
router.get(
  "/modifica/:id",
  onlyAdmin,
  catchAsync(async (req, res) => {
    const eventoId = parseInt(req.params.id);

    if (isNaN(eventoId) || eventoId <= 0) {
      throw new AppError("ID evento non valido", 400);
    }

    const db = await getDb();
    const eventiDao = new EventiDAO(db);
    const evento = await eventiDao.getById(eventoId);

    if (!evento) {
      throw new AppError("Evento non trovato", 404);
    }

    res.render("evento-form", {
      evento,
      titolo: "Modifica Evento - ComixCity",
      user: req.user,
      flashMessage: getFlashMessage(req),
    });
  })
);

router.post(
  "/modifica/:id",
  onlyAdmin,
  validators.evento, //validazione
  catchAsync(async (req, res) => {
    const eventoId = parseInt(req.params.id);
    const {
      titolo,
      descrizione,
      data,
      img,
      luogo,
      categoria,
      caratteristiche,
      prenotabile,
    } = req.body;

    if (isNaN(eventoId) || eventoId <= 0) {
      throw new AppError("ID evento non valido", 400);
    }

    const db = await getDb();
    const eventiDao = new EventiDAO(db);
    const eventoEsistente = await eventiDao.getById(eventoId);

    if (!eventoEsistente) {
      throw new AppError("Evento non trovato", 404);
    }

    await eventiDao.modifica(eventoId, {
      titolo: titolo.trim(),
      descrizione: descrizione.trim(),
      data,
      img: img?.trim() || null,
      luogo: luogo?.trim() || null,
      categoria: categoria || null,
      caratteristiche: caratteristiche?.trim() || null,
      prenotabile: prenotabile === "on" || prenotabile === "1" ? 1 : 0,
    });

    setFlash(req, 'success', 'evento_modificato');
    res.redirect("/eventi");
  })
);

//Elimina evento (solo admin)
router.post(
  "/elimina/:id",
  onlyAdmin,
  catchAsync(async (req, res) => {
    const eventoId = parseInt(req.params.id);

    if (isNaN(eventoId) || eventoId <= 0) {
      throw new AppError("ID evento non valido", 400);
    }

    const db = await getDb();
    const eventiDao = new EventiDAO(db);
    const evento = await eventiDao.getById(eventoId);
    if (!evento) {
      throw new AppError("Evento non trovato", 404);
    }

    //elimina prenotazioni + evento
    await db.run("BEGIN IMMEDIATE");

    try {
      await db.run("DELETE FROM eventi_prenotati WHERE evento_id = ?", [
        eventoId,
      ]);
      await eventiDao.elimina(eventoId);
      await db.run("COMMIT");

      setFlash(req, 'success', 'evento_eliminato');
      res.redirect("/eventi");
    } catch (error) {
      try {
        await db.run("ROLLBACK");
      } catch (rollbackError) {
        console.error("Transazione già chiusa:", rollbackError.message);
      }
      throw error;
    }
  })
);

module.exports = router;
