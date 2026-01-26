//UtentiDAO - Data Access Object che gestisce le operazioni sulla tabella utenti - registrazione, login, profilo personale, admin)
class UtentiDAO {
  constructor(db) {
    this.db = db;
  }

  //METODI DI LETTURA

  /*Cerca utente per email (case-insensitive)
  Ritorna utente completo con password hashata
  Uso: login, verifica credenziali in Passport*/
  async getByEmail(email) {
    const sql = "SELECT * FROM utenti WHERE LOWER(email) = LOWER(?) LIMIT 1";
    return (await this.db.get(sql, [email])) || null;
  }

  /*Cerca utente per username (case-insensitive)
  Uso: verifica disponibilità username, ricerca profilo*/
  async getByUsername(username) {
    const sql = "SELECT * FROM utenti WHERE LOWER(username) = LOWER(?) LIMIT 1";
    return (await this.db.get(sql, [username])) || null;
  }

  /*Verifica se email è già usata
  Ritorna true/false
  Uso: validazione registrazione (blocca duplicati)*/
  async emailExists(email) {
    const sql =
      "SELECT COUNT(*) as count FROM utenti WHERE LOWER(email) = LOWER(?)";
    const result = await this.db.get(sql, [email]);
    return result.count > 0;
  }

  /*Verifica se username è già usato
  Ritorna true/false
  Uso: validazione registrazione (blocca duplicati) */
  async usernameExists(username) {
    const sql =
      "SELECT COUNT(*) as count FROM utenti WHERE LOWER(username) = LOWER(?)";
    const result = await this.db.get(sql, [username]);
    return result.count > 0;
  }

  /*Cerca utente per ID
  Uso: deserializeUser in Passport, area personale, verifica permessi */
  async getById(id) {
    const sql = "SELECT * FROM utenti WHERE id = ?";
    return (await this.db.get(sql, [id])) || null;
  }

  //Conta utenti (opzionalmente filtrati per ruolo)
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

  //METODI DI SCRITTURA
  //Registrazione nuovo utente - insert in utenti, ritorna ID del nuovo utente -> uso: route /register 
  async creaUtente({ username, email, password, ruolo }) {
    const sql = `INSERT INTO utenti (username, email, password, ruolo)
                 VALUES (?, ?, ?, ?)`;
    const result = await this.db.run(sql, [username, email, password, ruolo]);
    return result.lastID;
  }

  //Aggiorna profilo - fa update username/email, ritorna il numero di righe modificate -> uso: area personale (modifica profilo)
  async modificaUtente(id, { username, email }) {
    const sql = `UPDATE utenti SET username = ?, email = ? WHERE id = ?`;
    const result = await this.db.run(sql, [username, email, id]);
    return result.changes;
  }

  //cambia password - update solo campo password (hash già fatto da bcrypt) -> uso "Cambia password" in area personale 
  async cambiaPassword(id, nuovaPassword) {
    const sql = `UPDATE utenti SET password = ? WHERE id = ?`;
    const result = await this.db.run(sql, [nuovaPassword, id]);
    return result.changes;
  }

  async getTutti() {
    const sql = "SELECT id, username, email, ruolo FROM utenti ORDER BY id";
    return await this.db.all(sql);
  }

  //Elimina utenti facendo delete dalla tabella  -> uso admin (cancellazione account)
  async eliminaUtente(id) {
    const sql = "DELETE FROM utenti WHERE id = ?";
    const result = await this.db.run(sql, [id]);
    return result.changes;
  }
}

module.exports = UtentiDAO;
