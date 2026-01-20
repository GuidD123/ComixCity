const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const getDb = require("../db");
const UtentiDAO = require("../daos/UtentiDAO");
const { catchAsync } = require("../middleware/errorHandler");
const { validators } = require("../middleware/validators");
const { getFlashMessage, setFlash } = require("../middleware/flashHelper");


router.get("/", (req, res) => {
  res.render("register", {
    user: req.user || null,
    query: req.query || {},
    flashMessage: getFlashMessage(req)
  });
});


router.post(
  "/",
  validators.register,
  catchAsync(async (req, res) => {
    const db = await getDb();
    const utentiDAO = new UtentiDAO(db);

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const username = String(req.body.username || "").trim();
    const password = req.body.password;
    const ruolo = req.body.ruolo;

    if (await utentiDAO.emailExists(email)) {
      return res.redirect("/register?error=email_exists");
    }

    if (await utentiDAO.usernameExists(username)) {
      return res.redirect("/register?error=username_exists");
    }

    // Hash password con salt configurabile
    const saltRounds = parseInt(process.env.BCRYPT_SALT || "10");
    const hash = await bcrypt.hash(password, saltRounds);

    // Crea utente
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