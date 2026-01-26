//Middleware di autenticazione e autorizzazione - proteggono le route verificando se utente loggato e ha i permessi giusti
//req.session.redirectTo salva URL che utente visitava così dopo login viene fatto redirect a quella URL
//req.user - oggetto utente fornito da Passport- popolato da deserializeUser

/*AUTENTICAZIONE LOGIN -> verifica se utente è verificato tramite passport
Controlla req.isAuthenticated (metodo di Passport) -> se loggato passa alla route (next()), altrimenti salva URL originale in sessione e fa redirect a /login 
Usato per proteggere area personale, carrello, prenotazioni e aree accessibili da utenti autenticati
ES: router.get('/areapersonale', ensureAuthenticated, (req, res) =>{...}*/
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  //Salva la URL originale per redirect dopo login
  req.session.redirectTo = req.originalUrl;
  res.redirect('/login');
}

//AUTENTICAZIONE ESPOSITORE -> verifica che utente sia loggato e che il suo ruolo sia espositore
//Controlla che sia loggato e il suo ruolo con req.user.ruolo === espositore
//se non loggato -> redirect a /login
//altrimenti loggato ma ruolo sbagliato -> error 403 "Area riservata agli espositori"
//Uso proteggere pagina stand (solo espositori)
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
//Controlla se loggato e ruolo tramite req.user.ruolo === admin
//Se non loggato -> redirect a /login
//Altrimenti se loggato ma ruolo sbagliato -> error 403 "Non hai i permessi"
//Uso proteggere dashboard admin
function onlyAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  if (!req.user || req.user.ruolo !== 'admin') {
    //Utente loggato ma non admin - redirect alla home
    return res.status(403).render('error', { 
      titolo: 'Accesso negato',
      messaggio: 'Non hai i permessi per accedere a questa area.',
      codice: 403
    });
  }
  
  return next();
}

//Verifica ruoli multipli - accetta array di ruoli - requireRole('admin', 'espositore'), controlla se loggato + ruolo dell'utente è nell'array
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