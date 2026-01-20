// middleware/sessionLogger.js - LOGGER COME MIDDLEWARE

const getDb = require('../db');

class SessionLogger {
  
  // LOG LOGIN RIUSCITO
  static async logSuccessfulLogin(user, req) {
    try {
      const db = await getDb();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      await db.run(`
        INSERT INTO user_sessions_log (
          utente_id, username, email, action, ip_address, timestamp
        ) VALUES (?, ?, ?, 'login', ?, datetime('now'))
      `, [user.id, user.username, user.email, ip]);
      
      console.log(`LOGIN: ${user.username} from ${ip}`);
    } catch (error) {
      console.error('Errore log login:', error);
    }
  }

  // LOG LOGIN FALLITO
  static async logFailedLogin(email, reason, req) {
    try {
      const db = await getDb();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      await db.run(`
        INSERT INTO user_sessions_log (
          utente_id, username, email, action, ip_address, failure_reason, timestamp
        ) VALUES (null, null, ?, 'login_failed', ?, ?, datetime('now'))
      `, [email || 'unknown', ip, reason]);
      
      console.log(`LOGIN FAILED: ${email} from ${ip} - ${reason}`);
    } catch (error) {
      console.error('Errore log login fallito:', error);
    }
  }

  // LOG RATE LIMITING
  static async logRateLimited(email, reason, req) {
    try {
      const db = await getDb();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      await db.run(`
        INSERT INTO user_sessions_log (
          utente_id, username, email, action, ip_address, failure_reason, timestamp
        ) VALUES (null, null, ?, 'rate_limited', ?, ?, datetime('now'))
      `, [email || 'unknown', ip, reason]);
      
      console.log(`RATE LIMITED: ${email} from ${ip}`);
    } catch (error) {
      console.error('Errore log rate limit:', error);
    }
  }

  // LOG LOGOUT
  static async logLogout(user, req) {
    try {
      const db = await getDb();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      await db.run(`
        INSERT INTO user_sessions_log (
          utente_id, username, email, action, ip_address, timestamp
        ) VALUES (?, ?, ?, 'logout', ?, datetime('now'))
      `, [user.id, user.username, user.email, ip]);
      
      console.log(`LOGOUT: ${user.username} from ${ip}`);
    } catch (error) {
      console.error('Errore log logout:', error);
    }
  }
}

module.exports = SessionLogger;