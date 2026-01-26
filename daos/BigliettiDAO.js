//Data Access Object per i biglietti.
/*BigliettiDAO.js → DAO - Data Access Object per i biglietti: è il ponte tra il codice e il db, cioè gestisce tutte le operazioni sui biglietti nella tabella biglietti (database) 
Pattern DAO: separa la logica di business (route/controller) dall’accesso ai dati (SQL). Le route chiamano metodi DAO invece di scrivere SQL direttamente. */ 

class BigliettiDAO {
  constructor(db) {
    this.db = db;
  }

  //ritorna tutti i biglietti (anche quelli esauriti) → usato da admin
  async getTutti() {
    const sql = "SELECT * FROM biglietti";
    return await this.db.all(sql);
  }

  //Ritorna solo i biglietti disponibili (> 0): ordinamento gratis per primi, poi prezzo decrescente. Usato da pagine pubbliche dei biglietti 
  async getDisponibili() {
    const sql =
      "SELECT * FROM biglietti WHERE disponibili > 0 ORDER BY CASE WHEN prezzo = 0 THEN 1 ELSE 0 END, prezzo DESC";
    return await this.db.all(sql);
  }

  //Dato un ID, ritorna i dettagli del singolo biglietto
  async getById(id) {
    const sql = "SELECT * FROM biglietti WHERE id = ?";
    return await this.db.get(sql, [id]);
  }

  //Aggiorna la quantità disponibile (dopo acquisto) - scala disponibilità dopo acquisto 
  //Logica critica: verifica che ci siano abbastanza biglietti, se insufficienti lancia errore (previene overselling)
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

  //Cerca un biglietto per nome
  async getByNome(nome) {
    const sql = "SELECT * FROM biglietti WHERE nome = ?";
    return await this.db.get(sql, [nome]);
  }

  //Ritorna il totale biglietti venduti e incasso
  //Statistiche per admin: ritorna il totale venduti + incasso per tipo di biglietto - fa JOIN con tabella biglietti_acquistati 
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
