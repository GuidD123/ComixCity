const express = require("express");
const router = express.Router();
const getDb = require("../db");
const { requireRole } = require("../middleware/auth");
const { catchAsync } = require("../middleware/errorHandler");
const { validators, validateCheckout } = require("../middleware/validators");
const BigliettiDAO = require("../daos/BigliettiDAO");
const TransactionLogger = require("../middleware/transactionLogger");
const { getFlashMessage, setFlash } = require("../middleware/flashHelper");

const MAX_TICKETS_PER_USER = 5;

//Inizializza carrello
function initCarrello(req, res, next) {
  if (!req.session.carrello) req.session.carrello = [];
  next();
}

//GET /carrello
router.get(
  "/",
  initCarrello,
  catchAsync(async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    const carrello = req.session.carrello;
    const db = await getDb();

    //Aggiorna i prezzi dal database e rimuovi biglietti non più disponibili
    const carrelloAggiornato = [];
    for (let item of carrello) {
      const bigliettoDB = await db.get(
        "SELECT id, prezzo, nome FROM biglietti WHERE id = ?",
        [item.id]
      );

      if (bigliettoDB) {
        item.prezzo = parseFloat(bigliettoDB.prezzo);
        item.nome = bigliettoDB.nome;
        carrelloAggiornato.push(item);
      }
    }

    req.session.carrello = carrelloAggiornato;

    const totale = carrelloAggiornato.reduce(
      (sum, i) => sum + i.prezzo * i.quantita,
      0
    );
    const isLoggedIn = req.isAuthenticated && req.isAuthenticated();
    const canCheckout =
      isLoggedIn && ["utente", "admin"].includes(req.user?.ruolo);

    res.render("carrello", {
      carrello: carrelloAggiornato,
      totale,
      user: req.user || null,
      isLoggedIn,
      canCheckout,
      query: req.query || {},
      flashMessage: getFlashMessage(req),
    });
  })
);

//POST /carrello/aggiungi
router.post(
  "/aggiungi",
  initCarrello,
  validators.carrelloItem,
  catchAsync(async (req, res) => {
    const id = parseInt(req.body.id);
    const quantita = parseInt(req.body.quantita);
    const db = await getDb();
    const biglietto = await db.get("SELECT * FROM biglietti WHERE id = ?", [
      id,
    ]);

    if (!biglietto)
      return res
        .status(404)
        .json({ success: false, message: "Biglietto non trovato" });

    const prezzoF = parseFloat(biglietto.prezzo);
    const esiste = req.session.carrello.find((i) => i.id === id);
    const nuovaQuantitaCarrello = (esiste?.quantita || 0) + quantita;

    if (nuovaQuantitaCarrello > MAX_TICKETS_PER_USER)
      return res.status(400).json({
        success: false,
        message: `Massimo ${MAX_TICKETS_PER_USER} biglietti per tipo nel carrello`,
      });

    if (req.isAuthenticated && req.isAuthenticated()) {
      const acquistiPrecedenti = await db.get(
        `SELECT COALESCE(SUM(quantita), 0) as tot
         FROM biglietti_acquistati 
         WHERE utente_id = ? AND biglietto_id = ?`,
        [req.user.id, id]
      );

      const totaleComplessivo =
        (acquistiPrecedenti?.tot || 0) + nuovaQuantitaCarrello;

      if (totaleComplessivo > MAX_TICKETS_PER_USER) {
        return res.status(400).json({
          success: false,
          message: `Hai già acquistato questo biglietto. Limite massimo: ${MAX_TICKETS_PER_USER}`,
        });
      }
    }

    if (esiste) esiste.quantita += quantita;
    else
      req.session.carrello.push({
        id: biglietto.id,
        nome: biglietto.nome,
        quantita,
        prezzo: prezzoF,
      });

    return res.json({
      success: true,
      carrelloLength: req.session.carrello.length,
      message: "Biglietto aggiunto al carrello",
    });
  })
);

//POST /carrello/incrementa/:index
router.post("/incrementa/:index", initCarrello, (req, res) => {
  const i = parseInt(req.params.index);
  if (isNaN(i) || i < 0 || i >= req.session.carrello.length) {
    setFlash(req, 'error', 'index_non_valido');
    return res.redirect("/carrello");
  }

  if (req.session.carrello[i].quantita < 5)
    req.session.carrello[i].quantita += 1;
  res.redirect("/carrello");
});

//POST /carrello/decrementa/:index
router.post("/decrementa/:index", initCarrello, (req, res) => {
  const i = parseInt(req.params.index);
  if (isNaN(i) || i < 0 || i >= req.session.carrello.length) {
    setFlash(req, 'error', 'index_non_valido');
    return res.redirect("/carrello");
  }

  const item = req.session.carrello[i];
  if (item.quantita > 1) item.quantita -= 1;
  else req.session.carrello.splice(i, 1);

  res.redirect("/carrello");
});

//POST /carrello/rimuovi/:index
router.post("/rimuovi/:index", initCarrello, (req, res) => {
  const i = parseInt(req.params.index);
  if (isNaN(i) || i < 0 || i >= req.session.carrello.length) {
    setFlash(req, 'error', 'index_non_valido');
    return res.redirect("/carrello");
  }

  req.session.carrello.splice(i, 1);
  res.redirect("/carrello?rimosso=ok");
});

//POST /carrello/svuota
router.post("/svuota", initCarrello, (req, res) => {
  req.session.carrello = [];
  res.redirect("/carrello?svuotato=ok");
});

//GET /carrello/checkout
router.get(
  "/checkout",
  requireRole("utente", "admin"),
  initCarrello,
  catchAsync(async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    const carrello = req.session.carrello;
    if (!carrello || carrello.length === 0) {
      setFlash(req, 'error', 'carrello_vuoto');
      return res.redirect("/carrello");
    }

    const db = await getDb();
    const carrelloAggiornato = [];
    let tuttoDisponibile = true;

    for (let item of carrello) {
      const bigliettoDB = await db.get(
        "SELECT id, nome, prezzo, disponibili FROM biglietti WHERE id = ?",
        [item.id]
      );

      if (!bigliettoDB) {
        req.session.carrello = carrello.filter((i) => i.id !== item.id);
        setFlash(req, 'error', 'biglietto_non_trovato');
        return res.redirect("/carrello");
      }

      if (bigliettoDB.disponibili < item.quantita) {
        tuttoDisponibile = false;
      }

      item.prezzo = parseFloat(bigliettoDB.prezzo);
      item.nome = bigliettoDB.nome;
      item.disponibili = bigliettoDB.disponibili;
      carrelloAggiornato.push(item);
    }

    req.session.carrello = carrelloAggiornato;

    const totale = carrelloAggiornato.reduce(
      (sum, i) => sum + i.prezzo * i.quantita,
      0
    );

    res.render("checkout", {
      carrello: carrelloAggiornato,
      totale,
      user: req.user,
      tuttoDisponibile,
      flashMessage: getFlashMessage(req),
    });
  })
);

//POST /carrello/checkout
router.post(
  "/checkout",
  requireRole("utente", "admin"),
  initCarrello,
  validateCheckout,
  catchAsync(async (req, res) => {
    const db = await getDb();
    const userId = req.user.id;
    const carrello = req.session.carrello;

    if (!carrello?.length) {
      setFlash(req, 'error', 'carrello_vuoto');
      return res.redirect("/carrello");
    }

    const {
      paymentMethod,
      cardNumber,
      cardName,
      expiryDate,
      cvv,
      billingName,
      billingEmail,
      billingCity,
      billingZip,
    } = req.body;

    await db.run("BEGIN IMMEDIATE");

    try {
      //Ricalcola totale DENTRO la transazione con lock
      let totaleReale = 0;
      const bigliettiVerificati = [];

      for (const item of carrello) {
        //Lock esplicito sulla riga
        const bigliettoDB = await db.get(
          "SELECT id, nome, prezzo, disponibili FROM biglietti WHERE id = ?",
          [item.id]
        );

        if (!bigliettoDB) {
          throw new Error(`Biglietto non trovato: ID ${item.id}`);
        }

        //Verifica disponibilità DENTRO la transazione
        if (bigliettoDB.disponibili < item.quantita) {
          throw new Error(
            `Biglietti insufficienti per ${bigliettoDB.nome}. ` +
              `Disponibili: ${bigliettoDB.disponibili}, Richiesti: ${item.quantita}`
          );
        }

        const prezzoReale = parseFloat(bigliettoDB.prezzo);
        totaleReale += prezzoReale * item.quantita;

        bigliettiVerificati.push({
          ...item,
          prezzoReale,
          nomeDB: bigliettoDB.nome,
          disponibiliDB: bigliettoDB.disponibili,
        });
      }

      //Validazione totale (consente anche biglietti gratuiti con totale = 0)
      if (isNaN(totaleReale) || totaleReale < 0) {
        throw new Error("Totale non valido");
      }

      //Log transazione (opzionale, non blocca checkout se fallisce)
      const transactionLog = await TransactionLogger.startTransaction(
        userId,
        paymentMethod || "standard",
        totaleReale,
        req
      );

      const finalTransactionId = transactionLog?.transactionId || generateTransactionId();
      
      //Aggiorna log solo se è stato creato
      if (transactionLog?.transactionId) {
        await TransactionLogger.updateTransactionStatus(
          finalTransactionId,
          "processing"
        );
      }

      //Simulazione pagamento (questo può restare fuori dalla transazione DB)
      //NOTA: In produzione, questa chiamata API esterna dovrebbe avere timeout
      const paymentResult = await simulatePaymentProcessing(paymentMethod, {
        cardNumber,
        expiryDate,
        cvv,
        amount: totaleReale,
      });

      if (!paymentResult.success) {
        if (transactionLog?.transactionId) {
          await TransactionLogger.logFailedTransaction(
            finalTransactionId,
            paymentResult.error || "Pagamento rifiutato"
          );
        }
        throw new Error(paymentResult.error || "Pagamento rifiutato");
      }

      for (const item of bigliettiVerificati) {
        const updateResult = await db.run(
          `UPDATE biglietti 
           SET disponibili = disponibili - ? 
           WHERE id = ? AND disponibili >= ?`,
          [item.quantita, item.id, item.quantita]
        );

        //Double-check (dovrebbe sempre passare grazie al lock)
        if (updateResult.changes === 0) {
          throw new Error(
            `Errore aggiornamento disponibilità per ${item.nomeDB}. ` +
              `Possibile race condition rilevata.`
          );
        }

        //Verifica limite acquisti per utente
        const acquistiPrecedenti = await db.get(
          `SELECT COALESCE(SUM(quantita), 0) as tot
           FROM biglietti_acquistati 
           WHERE utente_id = ? AND biglietto_id = ?`,
          [userId, item.id]
        );

        const MAX_TICKETS_PER_USER = 5; //Dovrebbe venire da config
        if (
          (acquistiPrecedenti?.tot || 0) + item.quantita >
          MAX_TICKETS_PER_USER
        ) {
          throw new Error(`Limite massimo superato per ${item.nomeDB}`);
        }
      }

      //Inserisci acquisti
      let primoAcquistoId = null;
      for (const item of bigliettiVerificati) {
        const totaleRiga = item.quantita * item.prezzoReale;

        const result = await db.run(
          `INSERT INTO biglietti_acquistati (
            utente_id, biglietto_id, quantita, data_acquisto,
            metodo_pagamento, transaction_id, prezzo_unitario, totale_riga,
            billing_name, billing_email
          ) VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            item.id,
            item.quantita,
            paymentMethod || "standard",
            finalTransactionId,
            item.prezzoReale,
            totaleRiga,
            billingName || req.user.username,
            billingEmail || req.user.email,
          ]
        );

        if (!primoAcquistoId) primoAcquistoId = result.lastID;
      }

      await db.run("COMMIT");

      //Log successo (solo se logging attivo)
      if (transactionLog?.transactionId) {
        await TransactionLogger.logCompletedTransaction(
          finalTransactionId,
          primoAcquistoId,
          { items: carrello, total: totaleReale, paymentMethod }
        );
      }

      //Svuota carrello
      req.session.carrello = [];

      console.log(`Checkout completato. Transaction ${finalTransactionId}`);

      res.redirect(
        `/carrello?success=acquisto_completato&acquisto=${primoAcquistoId}&transaction=${finalTransactionId}`
      );
    } catch (err) {
      try {
        await db.run("ROLLBACK");
      } catch (rollbackError) {
        console.error("Errore durante rollback:", rollbackError.message);
      }

      console.error("Errore checkout:", err.message);

      //Log errore se transaction ID disponibile
      if (err.message.includes("Transaction")) {
        const transactionId = err.message.match(/TXN_\w+/)?.[0];
        if (typeof transactionId !== "undefined") {
          await TransactionLogger.logFailedTransaction(transactionId);
        }
      }

      //Redirect con messaggio appropriato
      const errorParam = err.message.includes("disponibili")
        ? "disponibilita_insufficiente"
        : err.message.includes("Limite")
        ? "limite_superato"
        : err.message.includes("Pagamento")
        ? "pagamento_rifiutato"
        : "errore_server";

      return res.redirect(
        `/carrello/checkout?errore=${errorParam}&dettaglio=${encodeURIComponent(
          err.message
        )}`
      );
    }
  })
);

// ===== FUNZIONI DI SUPPORTO =====
async function simulatePaymentProcessing(paymentMethod, paymentData) {
  //Per demo/esame: pagamento sempre accettato, nessun esito casuale
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: generateTransactionId(),
        paymentMethod,
        processedAt: new Date().toISOString(),
      });
    }, 500);
  });
}

function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN_${timestamp}_${random}`;
}

module.exports = router;
