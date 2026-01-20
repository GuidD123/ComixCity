class EventiDAO {
  constructor(db) {
    this.db = db;
  }

  //Recupera TUTTI gli eventi dal database, ordinati per data
  async getTutti() {
    const sql = "SELECT * FROM eventi ORDER BY data";
    return await this.db.all(sql);
  }

  //Recupera UN SINGOLO evento tramite il suo ID
  async getById(id) {
    const sql = "SELECT * FROM eventi WHERE id = ?";
    return await this.db.get(sql, [id]);
  }

  //Cerca eventi che contengono un termine nel titolo O nella descrizione
  async cerca(termine) {
    const q = `%${termine}%`;
    const sql = `SELECT * FROM eventi WHERE titolo LIKE ? OR descrizione LIKE ? ORDER BY data`;
    return await this.db.all(sql, [q, q]);
  }

  // ggiunge un NUOVO evento nel database
  async aggiungi({
    titolo,
    descrizione,
    data,
    img,
    creato_da,
    luogo,
    categoria,
    caratteristiche,
    prenotabile
  }) {
    const sql = `INSERT INTO eventi (titolo, descrizione, data, img, creato_da, luogo, categoria, caratteristiche, prenotabile)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = await this.db.run(sql, [
      titolo,
      descrizione,
      data,
      img,
      creato_da,
      luogo || null,
      categoria || null,
      caratteristiche || null,
      prenotabile !== undefined ? prenotabile : 1
    ]);
    return result.lastID; //Restituisce l'ID del record appena inserito (auto-incrementale)
  }

  //Modifica un evento esistente
  async modifica(
    id,
    { titolo, descrizione, data, img, luogo, categoria, caratteristiche, prenotabile }
  ) {
    const sql = `UPDATE eventi SET titolo = ?, descrizione = ?, data = ?, img = ?, luogo = ?, categoria = ?, caratteristiche = ?, prenotabile = ?  WHERE id = ?`;
    const result = await this.db.run(sql, [
      titolo,
      descrizione,
      data,
      img,
      luogo || null,
      categoria || null,
      caratteristiche || null,
      prenotabile !== undefined ? prenotabile : 1,
      id,
    ]);
    return result.changes;
  }

  //Elimina un evento dal database
  async elimina(id) {
    const sql = `DELETE FROM eventi WHERE id = ?`;
    const result = await this.db.run(sql, [id]);
    return result.changes;
  }
}

module.exports = EventiDAO;
