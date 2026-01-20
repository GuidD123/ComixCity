const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: path.join(__dirname, 'database.db'),
      driver: sqlite3.Database
    });
  }
  return dbInstance;
}

module.exports = getDb;
