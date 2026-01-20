function getFlashMessage(req) {
  const successMessages = {
    //LOGIN / ACCOUNT
    login_complete: "Login effettuato con successo!",
    registration_complete: "Registrazione completata!",
    logout: "Logout effettuato con successo!",
    profilo_aggiornato: "Profilo aggiornato con successo!",
    password_changed: "Password modificata con successo!",

    //EVENTI
    evento_prenotato: "Evento prenotato con successo!",
    prenotazione_annullata: "Prenotazione annullata con successo!",
    evento_creato: "Evento creato con successo!",
    evento_modificato: "Evento modificato con successo!",
    evento_eliminato: "Evento eliminato con successo!",
    evento_non_prenotabile: "Questo evento non è prenotabile.",
    errore_generico: "Si è verificato un errore inatteso.",

    //STAND
    stand_prenotato: "Stand prenotato con successo!",
    stand_annullato: "Prenotazione stand annullata!",
    stand_creato: "Stand creato con successo!",

    //CARRELLO / BIGLIETTI
    biglietto_aggiunto: "Biglietto aggiunto al carrello!",
    rimosso: "Biglietto rimosso dal carrello!",
    carrello_svuotato: "Carrello svuotato!",
    acquisto_completato: "Acquisto completato con successo!",
  };

  const errorMessages = {
    //LOGIN / ACCOUNT
    invalid_credentials: "Email o password errati.",
    missing_credentials: "Email e password obbligatorie.",
    rate_limited: "Troppi tentativi. Account temporaneamente bloccato.",
    account_locked: "Account bloccato. Contatta l’assistenza.",
    accesso_negato: "Non hai i permessi per accedere.",
    email_exists: "Esiste già un account registrato con questa email.",
    username_exists: "Questo username è già stato utilizzato.",

    //EVENTI
    evento_non_trovato: "Evento non trovato.",
    già_prenotato: "Hai già prenotato questo evento.",
    non_prenotato: "Non risulti iscritto a questo evento.",

    //STAND
    stand_non_disponibile: "Lo stand selezionato non è più disponibile.",
    stand_gia_prenotato: "Lo stand è già stato prenotato.",
    stand_non_trovato: "Stand non trovato.",
    stand_id_non_valido: "ID stand non valido.",
    stand_appena_prenotato:
      "Lo stand è stato appena prenotato da un altro utente.",
    prenotazione_non_trovata: "Prenotazione non trovata o già annullata.",
    stand_completo: "Lo stand selezionato non ha più posti disponibili.",
    gia_prenotato_questo: "Hai già prenotato questo stand.",

    //CARRELLO
    carrello_vuoto: "Il carrello è vuoto.",
    totale_invalido: "Errore nel calcolo del totale.",
    prezzo_modificato: "Prezzo non valido, transazione annullata.",
    index_non_valido: "Indice carrello non valido.",
    termini_non_accettati:
      "Devi accettare i termini e le condizioni per procedere.",
    dati_fatturazione_mancanti: "Dati di fatturazione mancanti o incompleti.",
    dati_carta_mancanti: "Dati carta di credito mancanti.",
    numero_carta_invalido: "Numero di carta non valido.",
    data_scadenza_invalida: "Data di scadenza non valida.",
    cvv_invalido: "Codice CVV non valido.",
    errore_log: "Errore durante la registrazione della transazione.",
    pagamento_rifiutato: "Pagamento rifiutato o non autorizzato.",
    biglietto_non_trovato: "Biglietto non trovato.",
    disponibilita_insufficiente:
      "Disponibilità insufficiente per il biglietto selezionato.",
    limite_superato:
      "Hai raggiunto il limite massimo di biglietti acquistabili per questo tipo.",
    errore_server: "Errore interno del server durante il checkout.",

    //ADMIN
    no_data: "Nessun dato disponibile per l’esportazione.",
    internal: "Errore interno del server durante l’elaborazione.",

    // ===== AREA PERSONALE =====
    nessun_cambio: "Nessuna modifica effettuata.",
    email_in_uso: "Email già in uso da un altro utente.",
    username_in_uso: "Username già in uso da un altro utente.",
    sessione_non_aggiornata: "Errore aggiornamento sessione. Riprova.",
    utente_non_trovato: "Utente non trovato.",
    password_attuale_errata: "Password attuale errata.",
    password_troppo_corta: "La password deve essere di almeno 8 caratteri.",
    password_non_coincidono: "Le password non coincidono.",
    password_uguale: "La nuova password deve essere diversa da quella attuale.",
  };

  const infoMessages = {
    not_logged_in: "Devi effettuare il login per continuare.",
    registrazione_richiesta: "Registrati per prenotare eventi.",
    login_richiesto: "Devi effettuare il login per acquistare biglietti.",
  };

  // Priorità: leggi da session flash (auto-distrutto alla lettura)
  if (req.session && req.session.flash) {
    const flash = req.session.flash;
    delete req.session.flash; // Auto-distruggi dopo lettura
    
    if (flash.success) {
      return {
        type: "success",
        text: successMessages[flash.success] || "Operazione completata.",
      };
    }
    if (flash.error) {
      return {
        type: "error",
        text: errorMessages[flash.error] || "Si è verificato un errore.",
      };
    }
    if (flash.info) {
      return { type: "info", text: infoMessages[flash.info] || null };
    }
  }

  // Fallback: query string (retrocompatibilità durante migrazione)
  if (req.query && req.query.success)
    return {
      type: "success",
      text: successMessages[req.query.success] || "Operazione completata.",
    };
  if (req.query && req.query.error)
    return {
      type: "error",
      text: errorMessages[req.query.error] || "Si è verificato un errore.",
    };
  if (req.query && req.query.info)
    return { type: "info", text: infoMessages[req.query.info] || null };
  return null;
}

/**
 * Imposta un flash message nella session (auto-distrutto alla prossima richiesta)
 * @param {Object} req - Express request object
 * @param {string} type - Tipo di messaggio: 'success' | 'error' | 'info'
 * @param {string} key - Chiave del messaggio (es: 'login_complete', 'invalid_credentials')
 */
function setFlash(req, type, key) {
  if (!req.session) {
    console.error('[flashHelper] Session non inizializzata! Impossibile impostare flash message.');
    return;
  }
  req.session.flash = { [type]: key };
}

module.exports = { getFlashMessage, setFlash };
