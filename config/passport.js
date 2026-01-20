const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const getDb = require('../db'); //Importa la funzione getDb
const UtentiDAO = require('../daos/UtentiDAO');

async function initialize(passport) {
  //CHIAMA getDb() per ottenere l'istanza database
  const db = await getDb(); 
  const utentiDAO = new UtentiDAO(db);

  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const e = String(email || '').trim().toLowerCase();
      const user = await utentiDAO.getByEmail(e);

      if (!user) {
        return done(null, false, { message: 'Credenziali non valide' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: 'Credenziali non valide' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await utentiDAO.getById(id);
      if (!user) return done(null, false);
      const { password, ...safeUser } = user;
      done(null, safeUser);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = initialize;