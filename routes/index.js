const express = require("express");
const router = express.Router();
const { getFlashMessage } = require('../middleware/flashHelper');


router.get('/', (req, res) => {
  // Genera messaggio flash sicuro
  const flashMessage = getFlashMessage(req);

  // Parametri query sicuri
  const safeQuery = {
    q: req.query.q ? String(req.query.q).trim().substring(0, 100) : null,
    page: parseInt(req.query.page) || 1,
  };

  res.render('index', {
    user: req.user || null,
     query: req.query || {},
    flashMessage, 
    successMessage: flashMessage && flashMessage.type === 'success' ? flashMessage.text : null
  });
});


router.get('/chisiamo', (req, res) => {
  res.render('chisiamo', {
    user: req.user || null,  
    titolo: "Chi Siamo - ComixCity",
    flashMessage: getFlashMessage(req) 
  });
});


router.get('/privacy', (req, res) => {
  res.render('privacy', {
    user: req.user || null,
    titolo: "Privacy Policy - ComixCity",
    flashMessage: getFlashMessage(req)
  });
});


router.get('/terms', (req, res) => {
  res.render('terms', {
    user: req.user || null,  
    titolo: "Termini e Condizioni - ComixCity",
    flashMessage: getFlashMessage(req)
  });
});

module.exports = router;