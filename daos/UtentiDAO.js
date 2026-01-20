//UtentiDAO - Data Access Object per la tabella utenti
class UtentiDAO {
  constructor(db) {
    this.db = db;
  }

  //LETTURA DATI
  async getByEmail(email) {
    const sql = "SELECT * FROM utenti WHERE LOWER(email) = LOWER(?) LIMIT 1";
    return await this.db.get(sql, [email]) || null;
  }

 
  async getByUsername(username) {
    const sql = "SELECT * FROM utenti WHERE LOWER(username) = LOWER(?) LIMIT 1";
    return await this.db.get(sql, [username]) || null;
  }


  async emailExists(email) {
    const sql = "SELECT COUNT(*) as count FROM utenti WHERE LOWER(email) = LOWER(?)";
    const result = await this.db.get(sql, [email]);
    return result.count > 0;
  }

 
  async usernameExists(username) {
    const sql = "SELECT COUNT(*) as count FROM utenti WHERE LOWER(username) = LOWER(?)";
    const result = await this.db.get(sql, [username]);
    return result.count > 0;
  }


  async getById(id) {
    const sql = "SELECT * FROM utenti WHERE id = ?";
    return await this.db.get(sql, [id]) || null;

  }


  async creaUtente({ username, email, password, ruolo }) {
    const sql = `INSERT INTO utenti (username, email, password, ruolo)
                 VALUES (?, ?, ?, ?)`;
    const result = await this.db.run(sql, [username, email, password, ruolo]);
    return result.lastID;
  }


  async modificaUtente(id, { username, email }) {
    const sql = `UPDATE utenti SET username = ?, email = ? WHERE id = ?`;
    const result = await this.db.run(sql, [username, email, id]);
    return result.changes;
  }

  
  async cambiaPassword(id, nuovaPassword) {
    const sql = `UPDATE utenti SET password = ? WHERE id = ?`;
    const result = await this.db.run(sql, [nuovaPassword, id]);
    return result.changes;
  }

  async getTutti() {
    const sql = "SELECT id, username, email, ruolo FROM utenti ORDER BY id";
    return await this.db.all(sql);
  }

  
  async eliminaUtente(id) {
    const sql = "DELETE FROM utenti WHERE id = ?";
    const result = await this.db.run(sql, [id]);
    return result.changes;
  }

 
  async contaUtenti(ruolo = null) {
    let sql = "SELECT COUNT(*) as count FROM utenti";
    const params = [];
    
    if (ruolo) {
      sql += " WHERE ruolo = ?";
      params.push(ruolo);
    }
    
    const result = await this.db.get(sql, params);
    return result.count;
  }
}

module.exports = UtentiDAO;