//Data Access Object per i biglietti.

class BigliettiDAO {
  constructor(db) {
    this.db = db;
  }

  //ritorna tutti i biglietti
  async getTutti() {
    const sql = "SELECT * FROM biglietti";
    return await this.db.all(sql);
  }

  // Ritorna solo i biglietti disponibili (> 0)
  async getDisponibili() {
    const sql =
      "SELECT * FROM biglietti WHERE disponibili > 0 ORDER BY CASE WHEN prezzo = 0 THEN 1 ELSE 0 END, prezzo DESC";
    return await this.db.all(sql);
  }

  // Dato un ID, ritorna i dettagli del biglietto
  async getById(id) {
    const sql = "SELECT * FROM biglietti WHERE id = ?";
    return await this.db.get(sql, [id]);
  }

  // Aggiorna la quantità disponibile (dopo acquisto)
  async aggiornaDisponibili(id, nuovaQuantita) {
    const sql = `
    UPDATE biglietti 
    SET disponibili = disponibili - ? 
    WHERE id = ? AND disponibili >= ?
  `;
    const result = await this.db.run(sql, [nuovaQuantita, id, nuovaQuantita]);

    if (result.changes === 0) {
      throw new Error(`Disponibilità insufficiente per biglietto ID ${id}`);
    }

    return result.changes;
  }

  // Cerca un biglietto per nome (decommenta se serve)
  async getByNome(nome) {
    const sql = "SELECT * FROM biglietti WHERE nome = ?";
    return await this.db.get(sql, [nome]);
  }

  // Ritorna il totale biglietti venduti e incasso
  async getStatisticheVendite() {
    const sql = `
    SELECT 
      b.nome,
      SUM(ba.quantita) as totale_venduti,
      SUM(ba.totale_riga) as incasso_totale
    FROM biglietti b
    LEFT JOIN biglietti_acquistati ba ON b.id = ba.biglietto_id
    GROUP BY b.id
    ORDER BY incasso_totale DESC
  `;
    return await this.db.all(sql);
  }
}

module.exports = BigliettiDAO;
