const express = require("express");
const router = express.Router();
const getDb = require("../db");
const StandDAO = require("../daos/StandDAO");
const { onlyEspositore } = require("../middleware/auth");
const { AppError, catchAsync } = require("../middleware/errorHandler");
const { validate } = require("../middleware/validators");
const { getFlashMessage } = require("../middleware/flashHelper");


const validaPrenotazioneStand = validate({
  standId: {
    required: true,
    custom: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    customMessage: "ID stand non valido",
  },
});

const validaAnnullamentoStand = validate({
  standId: {
    required: true,
    custom: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    customMessage: "ID stand non valido",
  },
});

const validaStandIdParam = (req, res, next) => {
  const standId = parseInt(req.params.standId);
  if (isNaN(standId) || standId <= 0) {
    throw new AppError("ID stand non valido", 400);
  }
  req.standId = standId;
  next();
};

// ==================== ROUTES ====================

router.get(
  "/",
  catchAsync(async (req, res) => {
    const db = await getDb();

    // Query per recuperare stand con conteggio posti occupati usando CAPIENZA
    const tuttiGliStand = await db.all(`
      SELECT 
        s.*,
        s.capienza as posti_totali,
        COUNT(sp.id) as posti_occupati,
        (s.capienza - COUNT(sp.id)) as posti_disponibili,
        GROUP_CONCAT(u.username, ', ') as espositori
      FROM stand s
      LEFT JOIN stand_prenotati sp ON s.id = sp.stand_id
      LEFT JOIN utenti u ON sp.utente_id = u.id
      GROUP BY s.id
      ORDER BY s.padiglione ASC, s.nome ASC;
    `);

    const isLoggedIn = !!req.user;
    const isEspositore =
      req.user && (req.user.ruolo === "espositore" || req.user.ruolo === "admin");
    const isUtenteNormale = req.user && req.user.ruolo === "utente";

    // Verifica quali stand l'espositore ha già prenotato
    let mieiStand = [];
    if (isEspositore) {
      const prenotazioni = await db.all(
        `SELECT stand_id FROM stand_prenotati WHERE utente_id = ?`,
        [req.user.id]
      );
      mieiStand = prenotazioni.map(p => p.stand_id);
    }

    res.render("stand", {
      stand: tuttiGliStand,
      tuttiStand: tuttiGliStand,
      isLoggedIn,
      isEspositore,
      isUtenteNormale,
      mieiStand,
      user: req.user || null,
      flashMessage: getFlashMessage(req),
    });
  })
);

router.post(
  "/prenota",
  onlyEspositore,
  validaPrenotazioneStand,
  catchAsync(async (req, res) => {
    const userId = req.user.id;
    const standId = parseInt(req.body.standId);
    const db = await getDb();
    const standDao = new StandDAO(db);

    await db.run("BEGIN IMMEDIATE");
    try {
      // Verifica se lo stand esiste e ha posti disponibili
      const stand = await db.get(
        `SELECT 
          s.*,
          s.capienza as posti_totali,
          COUNT(sp.id) as posti_occupati,
          (s.capienza - COUNT(sp.id)) as posti_disponibili
         FROM stand s
         LEFT JOIN stand_prenotati sp ON s.id = sp.stand_id
         WHERE s.id = ?
         GROUP BY s.id`,
        [standId]
      );

      if (!stand) {
        await db.run("ROLLBACK");
        return res.redirect("/stand?error=stand_non_trovato");
      }

      if (stand.posti_disponibili <= 0) {
        await db.run("ROLLBACK");
        return res.redirect(
          `/stand?error=stand_completo&stand=${encodeURIComponent(stand.nome)}`
        );
      }

      // Verifica se l'utente ha già prenotato QUESTO stand
      const giaPrenotatoQuestoStand = await db.get(
        "SELECT id FROM stand_prenotati WHERE utente_id = ? AND stand_id = ?",
        [userId, standId]
      );

      if (giaPrenotatoQuestoStand) {
        await db.run("ROLLBACK");
        return res.redirect(
          `/stand?error=gia_prenotato_questo&stand=${encodeURIComponent(stand.nome)}`
        );
      }

      // Prenota un posto
      await standDao.prenota(userId, standId);
      await db.run("COMMIT");

      res.redirect(
        `/stand?success=stand_prenotato&stand=${encodeURIComponent(stand.nome)}&posti=${stand.posti_disponibili - 1}`
      );
    } catch (error) {
      await db.run("ROLLBACK");
      console.error("Errore prenotazione stand:", error);
      res.redirect("/stand?error=internal");
    }
  })
);

router.post(
  "/annulla",
  onlyEspositore,
  validaAnnullamentoStand,
  catchAsync(async (req, res) => {
    const userId = req.user.id;
    const standId = parseInt(req.body.standId);
    const db = await getDb();
    const standDao = new StandDAO(db);

    await db.run("BEGIN IMMEDIATE");
    try {
      const prenotazione = await db.get(
        `SELECT p.*, s.nome as stand_nome 
         FROM stand_prenotati p 
         JOIN stand s ON p.stand_id = s.id 
         WHERE p.utente_id = ? AND p.stand_id = ?`,
        [userId, standId]
      );

      if (!prenotazione) {
        await db.run("ROLLBACK");
        return res.redirect("/areapersonale?error=prenotazione_non_trovata");
      }

      await standDao.annulla(userId, standId);
      await db.run("COMMIT");

      res.redirect(
        `/areapersonale?success=stand_annullato&stand=${encodeURIComponent(
          prenotazione.stand_nome
        )}`
      );
    } catch (error) {
      await db.run("ROLLBACK");
      console.error("Errore annullamento prenotazione:", error);
      res.redirect("/areapersonale?error=internal");
    }
  })
);


router.get(
  "/api/disponibilita/:standId",
  validaStandIdParam,
  catchAsync(async (req, res) => {
    const db = await getDb();
    
    const stand = await db.get(
      `SELECT 
        s.*,
        s.capienza as posti_totali,
        COUNT(sp.id) as posti_occupati,
        (s.capienza - COUNT(sp.id)) as posti_disponibili
       FROM stand s
       LEFT JOIN stand_prenotati sp ON s.id = sp.stand_id
       WHERE s.id = ?
       GROUP BY s.id`,
      [req.standId]
    );

    if (!stand) throw new AppError("Stand non trovato", 404);

    res.json({
      success: true,
      disponibile: stand.posti_disponibili > 0,
      posti_totali: stand.posti_totali,
      posti_occupati: stand.posti_occupati,
      posti_disponibili: stand.posti_disponibili,
      nome: stand.nome,
      padiglione: stand.padiglione,
      tema: stand.tema,
      dimensione: stand.dimensione,
      servizi_inclusi: stand.servizi_inclusi,
      note: stand.note,
    });
  })
);

// Info regolamento
router.get("/info_regolamento", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.render("info_regolamento", { user: req.user || null });
});

module.exports = router;