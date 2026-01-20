//AUTENTICAZIONE LOGIN -> verifica se utente è verificato tramite passport
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // Salva la URL originale per redirect dopo login
  req.session.redirectTo = req.originalUrl;
  res.redirect('/login');
}

//AUTENTICAZIONE ESPOSITORE -> verifica che utente sia loggato e che il suo ruolo sia espositore
function onlyEspositore(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    req.session.redirectTo = req.originalUrl;
    return res.redirect('/login');
  }
  
  if (!req.user || req.user.ruolo !== 'espositore') {
    //Utente loggato ma non espositore
    return res.status(403).render('error', { 
      titolo: 'Accesso negato',
      messaggio: 'Questa area è riservata agli espositori.',
      codice: 403
    });
  }
  
  return next();
}

//AUTENTICAZIONE ADMIN -> verifica che utente sia loggato e che il suo ruolo sia admin
function onlyAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  if (!req.user || req.user.ruolo !== 'admin') {
    // Utente loggato ma non admin - redirect alla home
    return res.status(403).render('error', { 
      titolo: 'Accesso negato',
      messaggio: 'Non hai i permessi per accedere a questa area.',
      codice: 403
    });
  }
  
  return next();
}

//verifica ruoli multipli
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
    }
    
    //verifica se ruolo giusto
    if (!req.user || !roles.includes(req.user.ruolo)) {
      return res.status(403).render('error', { 
        titolo: 'Accesso negato',
        messaggio: `Questa area è riservata a: ${roles.join(', ')}.`,
        codice: 403
      });
    }
    return next();
  };
}

module.exports = {
  ensureAuthenticated,
  onlyEspositore,
  onlyAdmin,
  requireRole
};