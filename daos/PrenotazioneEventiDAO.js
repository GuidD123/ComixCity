class PrenotazioneEventiDAO {
  constructor(db) {
    this.db = db;
  }

  // Prenota un utente a un evento
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
      throw err; // altri errori (DB, connessione, ecc.)
    }
  }

  // Annulla una prenotazione (cambia stato in 'annullata')
  async annullaPrenotazione(eventoId, utenteId) {
    const sql = `
      UPDATE eventi_prenotati
      SET stato = 'annullata'
      WHERE evento_id = ? AND utente_id = ? AND stato = 'attiva'`;
    const result = await this.db.run(sql, [eventoId, utenteId]);
    return result.changes;
  }

  // Elimina definitivamente una prenotazione (opzionale, usalo solo se vuoi davvero cancellare la riga)
  async eliminaPrenotazione(eventoId, utenteId) {
    const sql = `DELETE FROM eventi_prenotati WHERE evento_id = ? AND utente_id = ?`;
    const result = await this.db.run(sql, [eventoId, utenteId]);
    return result.changes;
  }

  // Lista tutti gli eventi prenotati da un utente
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

  // Lista tutti i partecipanti di un evento
  async getPartecipanti(eventoId, stato = "attiva") {
    const sql = `
      SELECT u.*, u.username, u.email,  p.data_prenotazione, p.stato, p.tipo_partecipazione, p.note
      FROM eventi_prenotati p
      JOIN utenti u ON u.id = p.utente_id
      WHERE p.evento_id = ? AND p.stato = ?
      ORDER BY p.data_prenotazione`;
    return await this.db.all(sql, [eventoId, stato]);
  }

  // Verifica se un utente è già prenotato per un evento (utile per evitare doppioni)
  async isPrenotato(eventoId, utenteId) {
    const sql = `
      SELECT * FROM eventi_prenotati
      WHERE evento_id = ? AND utente_id = ? AND stato = 'attiva'`;
    return await this.db.get(sql, [eventoId, utenteId]);
  }

  // Conta quanti iscritti attivi ha un evento
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
