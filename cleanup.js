const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database("./database.db");

console.log("🧹 Pulizia database in corso...\n");

db.serialize(() => {
  // Pulisci log vecchi
  db.run("DELETE FROM user_sessions_log", function () {
    console.log(`✅ Log sessioni: ${this.changes} eliminati`);
  });

  // Pulisci log transazioni
  db.run("DELETE FROM transaction_log", function () {
    console.log(`✅ Log transazioni: ${this.changes} eliminati`);
  });

  // Pulisci prenotazioni
  db.run("DELETE FROM stand_prenotati", function () {
    console.log(`✅ Stand prenotati: ${this.changes} eliminati`);
  });

  db.run("DELETE FROM eventi_prenotati", function () {
    console.log(`✅ Eventi prenotati: ${this.changes} eliminati`);
  });

  db.run("DELETE FROM biglietti_acquistati", function () {
    console.log(`✅ Biglietti: ${this.changes} eliminati`);
  });

  // Rimetti stand disponibili
  db.run("UPDATE stand SET disponibile = 1", function () {
    console.log(`✅ Stand rimessi disponibili: ${this.changes}`);
  });

  // Verifica
  console.log("\n📊 Stato database:");
  db.all(
    `
    SELECT 'Utenti' as Tabella, COUNT(*) as Records FROM utenti
    UNION ALL SELECT 'Stand prenotati', COUNT(*) FROM stand_prenotati
    UNION ALL SELECT 'Eventi prenotati', COUNT(*) FROM eventi_prenotati
    UNION ALL SELECT 'Biglietti', COUNT(*) FROM biglietti_acquistati
    UNION ALL SELECT 'Log sessioni', COUNT(*) FROM user_sessions_log
    UNION ALL SELECT 'Transaction log', COUNT(*) FROM transaction_log
  `,
    (err, rows) => {
      console.table(rows);
      console.log("\n✨ Pulizia completata!\n");
      db.close();
    }
  );
});

//node cleanup.js
