const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const getDb = require("../db");
const UtentiDAO = require("../daos/UtentiDAO");
const { catchAsync } = require("../middleware/errorHandler");
const { validators } = require("../middleware/validators");
const { getFlashMessage, setFlash } = require("../middleware/flashHelper");


//Mostra html con form registrazione - gstisce creazione nuovi account
//Accessibile a tutti (loggati e non)
router.get("/", (req, res) => {
  res.render("register", {
    user: req.user || null,
    query: req.query || {},
    flashMessage: getFlashMessage(req)
  });
});


/*POST /register crea account
validators.register controlla username che sia valida (3-30 caratteri alfanumerici ecc..), email (formato valido), password, ruolo */
router.post(
  "/",
  validators.register,
  catchAsync(async (req, res) => {
    const db = await getDb();
    const utentiDAO = new UtentiDAO(db);

    //Email: lowercase evita duplicati 
    //Username/email -> trim() rimuove spazi
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const username = String(req.body.username || "").trim();
    const password = req.body.password;
    const ruolo = req.body.ruolo;

    //verifica unicità -> controlli nel db
    if (await utentiDAO.emailExists(email)) {
      return res.redirect("/register?error=email_exists");
    }

    if (await utentiDAO.usernameExists(username)) {
      return res.redirect("/register?error=username_exists");
    }

    //Hashing password con salt configurabile
    //Sicurezza bcrypt non salva password in chiaro nel db!
    const saltRounds = parseInt(process.env.BCRYPT_SALT || "10");
    const hash = await bcrypt.hash(password, saltRounds);

    //Creazione utente 
    //DEntro il DAO fa query SQL con cui si salvano dati inseriti: username, email lowercase, password hashata, ruolo scelto!
    await utentiDAO.creaUtente({
      username,
      email,
      password: hash,
      ruolo,
    });

    setFlash(req, 'success', 'registration_complete');
    res.redirect("/login");
  })
);

module.exports = router;