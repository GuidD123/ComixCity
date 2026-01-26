/*DAO per le prenotazioni eventi: gestisce le iscrizioni degli utenti agli eventi nella tabella eventi_prenotati
Gestione completa delle prenotazioni, storico conservato, prevenzione dei duplicati
Quando utente prenota un evento, il sistema chiama prenotazioneEventiDAO.prenotaUtente(), e nell'area personale usa getPrenotazioniByUtente() per mostrare "I miei eventi"!*/ 

class PrenotazioneEventiDAO {
  constructor(db) {
    this.db = db;
  }

  //Prenota un utente a un evento
  //Iscrive un utente ad un evento - inserisce record in eventi_prenotati
  //Gestisce duplicati: se già iscritto ritorna null -> usato quando utente clicca prenota su evento 
  async prenotaUtente(
    eventoId,
    utenteId,
    stato = "attiva",
    tipo_partecipazione = null,
    note = null
  ) {
    const sql = `
      INSERT INTO eventi_prenotati (evento_id, utente_id, stato, tipo_partecipazione, note)
      VALUES (?, ?, ?, ?, ?)`;
    try {
      const result = await this.db.run(sql, [
        eventoId,
        utenteId,
        stato,
        tipo_partecipazione,
        note,
      ]);
      return result.lastID;
    } catch (err) {
      //Gestione errore per duplicato
      if (err && err.message.includes("UNIQUE constraint failed")) {
        //già iscritto, restituisco null o errore controllato
        console.warn(`Utente ${utenteId} già prenotato all'evento ${eventoId}`);
        return null;
      }

      console.error("Errore in prenotaUtente:", err);
      throw err; //altri errori (DB, connessione, ecc.)
    }
  }

  //Annulla una prenotazione (cambia stato in 'annullata')
  //cancella prenotazione -> cambia stato da attiva ad annullata (non elimina dal db) ma mantiene storico di chi si è cancellato -> uso in area personale
  async annullaPrenotazione(eventoId, utenteId) {
    const sql = `
      UPDATE eventi_prenotati
      SET stato = 'annullata'
      WHERE evento_id = ? AND utente_id = ? AND stato = 'attiva'`;
    const result = await this.db.run(sql, [eventoId, utenteId]);
    return result.changes;
  }

  //Elimina definitivamente una prenotazione -> hard delete, fa il delete dalla tabella, elimina riga -> usato da admin 
  async eliminaPrenotazione(eventoId, utenteId) {
    const sql = `DELETE FROM eventi_prenotati WHERE evento_id = ? AND utente_id = ?`;
    const result = await this.db.run(sql, [eventoId, utenteId]);
    return result.changes;
  }

  //Lista tutti gli eventi prenotati da un utente -> fa join con tabella eventi per avere titolo/descrizione/data -> di default solo prenotazioni attive -> uso in area personale "I miei eventi"
  async getPrenotazioniByUtente(utenteId, includeAnnullate = false) {
    const params = [utenteId];
    let sql = `
    SELECT 
      e.id as evento_id,           
      e.titolo, 
      e.descrizione, 
      e.data, 
      e.img,
      p.id as prenotazione_id,      
      p.data_prenotazione, 
      p.stato, 
      p.tipo_partecipazione, 
      p.note
    FROM eventi_prenotati p
    JOIN eventi e ON e.id = p.evento_id
    WHERE p.utente_id = ?`;

    if (!includeAnnullate) {
      sql += ` AND p.stato = 'attiva'`;
    }
    sql += ` ORDER BY p.data_prenotazione DESC`;

    try {
      return await this.db.all(sql, params);
    } catch (err) {
      console.error("Errore in getPrenotazioniByUtente:", err);
      throw err;
    }
  }

  //Lista tutti i partecipanti di un evento -> ritorna elenco degli iscritti ad un evento facendo join con tabella utenti per avere usernam/email -> uso admin dalla dashboard
  async getPartecipanti(eventoId, stato = "attiva") {
    const sql = `
      SELECT u.*, u.username, u.email,  p.data_prenotazione, p.stato, p.tipo_partecipazione, p.note
      FROM eventi_prenotati p
      JOIN utenti u ON u.id = p.utente_id
      WHERE p.evento_id = ? AND p.stato = ?
      ORDER BY p.data_prenotazione`;
    return await this.db.all(sql, [eventoId, stato]);
  }

  //Verifica se un utente è già prenotato per un evento - ritorna record se iscritto altrimenti undefined -> usato per mostrare/nascondere button Prenota o Annulla
  async isPrenotato(eventoId, utenteId) {
    const sql = `
      SELECT * FROM eventi_prenotati
      WHERE evento_id = ? AND utente_id = ? AND stato = 'attiva'`;
    return await this.db.get(sql, [eventoId, utenteId]);
  }

  //Conta quanti iscritti attivi ha un evento -> count prenotazioni attive
  async contaIscritti(eventoId) {
    const sql = `
      SELECT COUNT(*) as totale
      FROM eventi_prenotati
      WHERE evento_id = ? AND stato = 'attiva'`;
    const row = await this.db.get(sql, [eventoId]);
    return row ? row.totale : 0;
  }
}

module.exports = PrenotazioneEventiDAO;
