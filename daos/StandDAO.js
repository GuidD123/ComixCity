class StandDAO {
  constructor(db) {
    this.db = db;
  }

  /**
   * Recupera tutti gli stand con calcolo dinamico posti
   */
  async getTutti() {
    const sql = `
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
      ORDER BY s.padiglione ASC, s.nome ASC
    `;
    return await this.db.all(sql);
  }

  /**
   * Recupera solo stand con posti disponibili
   */
  async getDisponibili() {
    const sql = `
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
      HAVING posti_disponibili > 0
      ORDER BY s.padiglione ASC, s.nome ASC
    `;
    return await this.db.all(sql);
  }

  /**
   * Recupera singolo stand con info posti
   */
  async getById(id) {
    const sql = `
      SELECT 
        s.*,
        s.capienza as posti_totali,
        COUNT(sp.id) as posti_occupati,
        (s.capienza - COUNT(sp.id)) as posti_disponibili,
        GROUP_CONCAT(u.username, ', ') as espositori
      FROM stand s
      LEFT JOIN stand_prenotati sp ON s.id = sp.stand_id
      LEFT JOIN utenti u ON sp.utente_id = u.id
      WHERE s.id = ?
      GROUP BY s.id
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Verifica se un utente ha già prenotato questo stand
   */
  async haPrenotato(userId, standId) {
    const sql = "SELECT * FROM stand_prenotati WHERE utente_id = ? AND stand_id = ?";
    return await this.db.get(sql, [userId, standId]);
  }

  /**
   * Prenota un posto nello stand
   * La disponibilità viene calcolata dinamicamente
   */
  async prenota(userId, standId) {
    const insertSql = `
      INSERT INTO stand_prenotati (utente_id, stand_id, data_prenotazione)
      VALUES (?, ?, datetime('now'))
    `;
    const result = await this.db.run(insertSql, [userId, standId]);
    return result.lastID;
  }

  /**
   * Annulla prenotazione di un posto
   * La disponibilità viene calcolata dinamicamente
   */
  async annulla(userId, standId) {
    const deleteSql = "DELETE FROM stand_prenotati WHERE utente_id = ? AND stand_id = ?";
    const result = await this.db.run(deleteSql, [userId, standId]);
    return result.changes;
  }
}

module.exports = StandDAO;