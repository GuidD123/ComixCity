//errorHandler.js - Sistema centralizzato gestione errori ComixCity
const { setFlash } = require('./flashHelper');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  //Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', {
      message: err.message,
      statusCode: err.statusCode,
      url: req.originalUrl
    });
  }

  if (err.isOperational) {
    
    if (req.accepts('html') && !req.xhr) {
      //Determina dove fare redirect in base all'URL
      let redirectUrl = '/';
      
      if (req.originalUrl.includes('/carrello/checkout')) redirectUrl = '/carrello/checkout';
      else if (req.originalUrl.includes('/eventi')) redirectUrl = '/eventi';
      else if (req.originalUrl.includes('/stand')) redirectUrl = '/stand';
      else if (req.originalUrl.includes('/biglietti')) redirectUrl = '/biglietti';
      else if (req.originalUrl.includes('/carrello')) redirectUrl = '/carrello';
      else if (req.originalUrl.includes('/admin')) redirectUrl = '/admin';
      else if (req.originalUrl.includes('/areapersonale')) redirectUrl = '/areapersonale';
      else if (req.originalUrl.includes('/login')) redirectUrl = '/login';
      else if (req.originalUrl.includes('/register')) redirectUrl = '/register';
      
      //Redirect con messaggio errore in session flash
      setFlash(req, 'error', err.message || 'errore_generico');
      return res.redirect(redirectUrl);
    }
    
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  console.error('PROGRAMMING ERROR:', err);
  
  if (req.accepts('html') && !req.xhr) {
    return res.status(500).render('500', {
      titolo: 'Errore interno',
      user: req.user || null
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Qualcosa è andato storto!'
  });
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const notFound = (req, res, next) => {
  //Usa il tuo 404.ejs esistente
  res.status(404).render('404', { 
    titolo: 'Pagina non trovata',
    user: req.user || null
  });
};

module.exports = { 
  AppError, 
  errorHandler, 
  catchAsync, 
  notFound 
};