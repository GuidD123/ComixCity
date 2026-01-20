const express = require("express");
const router = express.Router();


router.get("/", (req, res, next) => {
  // Se non c'è utente loggato, redirect immediato
  if (!req.user) {
    return res.redirect("/?info=not_logged_in");
  }

  const user = req.user;

  // Salva carrello PRIMA di distruggere la sessione
  const carrelloBackup = req.session.carrello || [];

  //Logout Passport
  req.logout((err) => {
    if (err) {
      console.error("Errore durante logout:", err);
      return next(err); // Passa l'errore al middleware di gestione errori
    }

    //Distruggi sessione
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Errore distruzione sessione:", destroyErr);
        return res.redirect("/?error=logout_failed");
      }

      //Cancella cookie di sessione
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
      });

      //Salva carrello in cookie temporaneo SE presente
      if (Array.isArray(carrelloBackup) && carrelloBackup.length > 0) {
        res.cookie("carrello_temp", JSON.stringify(carrelloBackup), {
          maxAge: 3600000,
          httpOnly: true,
          sameSite: "lax",
        });
      }

      //Log e redirect
      console.log(`Logout: ${user.username} (ID: ${user.id})`);
      res.redirect("/?logout=success");
    });
  });
});


function ripristinaCarrelloDaCookie(req, res, next) {
  // Solo se non c'è già un carrello in sessione E c'è il cookie temporaneo
  if (!req.session.carrello && req.cookies?.carrello_temp) {
    try {
      const carrello = JSON.parse(req.cookies.carrello_temp);
      if (Array.isArray(carrello) && carrello.length > 0) {
        req.session.carrello = carrello;
        console.log(`Carrello ripristinato: ${carrello.length} items`);
      }
      res.clearCookie("carrello_temp", { path: "/", httpOnly: true });
    } catch (err) {
      console.error("Errore ripristino carrello:", err);
    }
  }
  next();
}

module.exports = router;
module.exports.ripristinaCarrelloDaCookie = ripristinaCarrelloDaCookie;
