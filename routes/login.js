const express = require('express');
const passport = require('passport');
const SessionLogger = require('../middleware/sessionLogger');
const router = express.Router();
const { getFlashMessage, setFlash } = require('../middleware/flashHelper');


const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 900000; // 15 minuti
const MAX_LOGIN_ATTEMPTS = 5; // Max 5 tentativi ogni 15 minuti
const LOCKOUT_TIME = 1800000; // 30 minuti di lockout dopo troppi tentativi

function checkLoginRateLimit(identifier) {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now, lockedUntil: null };
  
  // Se è in lockout, controlla se è scaduto
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    const remainingMinutes = Math.ceil((attempts.lockedUntil - now) / 60000);
    return { 
      allowed: false, 
      reason: `Account temporaneamente bloccato. Riprova tra ${remainingMinutes} minuti.` 
    };
  }
  
  // Reset se è passato troppo tempo dall'ultimo tentativo
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    attempts.count = 0;
    attempts.firstAttempt = now;
    attempts.lockedUntil = null;
  }
  
  // Se ha superato il limite, blocca
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_TIME;
    loginAttempts.set(identifier, attempts);
    return { 
      allowed: false, 
      reason: `Troppi tentativi di login. Account bloccato per 30 minuti.` 
    };
  }
  
  return { allowed: true };
}

function recordLoginAttempt(identifier, success = false) {
  if (success) {
    // Se login riuscito, reset counter
    loginAttempts.delete(identifier);
    return;
  }
  
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now, lockedUntil: null };
  
  attempts.count++;
  if (attempts.count === 1) {
    attempts.firstAttempt = now;
  }
  
  loginAttempts.set(identifier, attempts);
}



// ========== ROUTES ==========
router.get('/', (req, res) => {
  // Passa query e user al template per flash-messages partial
  res.render('login', { 
    user: req.user || null,
    flashMessage: getFlashMessage(req),
    email: req.query.email || ""
  });
});

router.post('/', (req, res, next) => {
  const email = req.body.email?.toLowerCase()?.trim() || '';
  const ip = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Identifica per email E IP per evitare bypass
  const identifier = `${email}_${ip}`;
  
  if (!email || !req.body.password) {
    
    SessionLogger.logFailedLogin(email, 'Email o password mancanti', req);
    
    recordLoginAttempt(identifier, false);
    
   
    return res.redirect('/login?error=missing_credentials&email=' + encodeURIComponent(email));
  }

  const rateLimitCheck = checkLoginRateLimit(identifier);
  if (!rateLimitCheck.allowed) {
    SessionLogger.logRateLimited(email, rateLimitCheck.reason, req);
    return res.redirect('/login?error=rate_limited&email=' + encodeURIComponent(email));
  }
  
  // ========== PASSPORT AUTHENTICATION ==========
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      SessionLogger.logFailedLogin(email, `Errore sistema: ${err.message}`, req);
      recordLoginAttempt(identifier, false);
      return next(err);
    }
    
    if (!user) {
      SessionLogger.logFailedLogin(email, info?.message || 'Credenziali non valide', req);
      recordLoginAttempt(identifier, false);
      return res.redirect('/login?error=invalid_credentials&email=' + encodeURIComponent(email));
    }
    
    // ========== LOGIN RIUSCITO ==========
    req.logIn(user, (err) => {
      if (err) {
        SessionLogger.logFailedLogin(email, `Errore creazione sessione: ${err.message}`, req);
        recordLoginAttempt(identifier, false);
        return next(err);
      }
      
      SessionLogger.logSuccessfulLogin(user, req);
      
      recordLoginAttempt(identifier, true);

      console.log(`Login riuscito: ${user.username} (${user.id}) da IP ${ip}`);
      
      const redirectTo = req.session.redirectTo || '/';
      delete req.session.redirectTo;
      
      if (redirectTo.startsWith('/')) {
        if (redirectTo === '/') {
          setFlash(req, 'success', 'login_complete');
          return res.redirect('/');
        }
        return res.redirect(redirectTo);
      } else {
        setFlash(req, 'success', 'login_complete');
        return res.redirect('/');
      }
    });
  })(req, res, next);
});

// ========== PULIZIA PERIODICA ==========

// Pulizia periodica rate limits
setInterval(() => {
  const now = Date.now();
  for (const [identifier, data] of loginAttempts.entries()) {
    // Rimuovi record vecchi
    if (now - data.firstAttempt > LOCKOUT_TIME * 2) {
      loginAttempts.delete(identifier);
    }
  }
}, 300000);

module.exports = router;