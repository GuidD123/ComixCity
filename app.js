require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const passport = require("passport");
const cookieParser = require('cookie-parser');
const initializePassport = require("./config/passport");
const app = express();
app.disable("x-powered-by");
const port = process.env.PORT || 3000;

//IMPORT MIDDLEWARE CUSTOM
const { notFound, errorHandler } = require('./middleware/errorHandler');

//CONTROLLO ENV
if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET non trovato nel file .env');
  process.exit(1); 
}

//MIDDLEWARE GLOBALI

//Static files
app.use(express.static("public"));

//Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());

//Security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  //if (res.removeHeader) res.removeHeader('X-Powered-By');
  next();
});

//Favicon stub (evita 404 in console)
app.get('/favicon.ico', (req, res) => res.status(204).end());

//TEMPLATE ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//SESSION
app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: './temp',
      ttl: 24 * 60 * 60 * 1000, // 24 ore - auto-cleanup sessioni scadute
      cleanupInterval: 60 * 60 * 1000 // Pulizia ogni ora
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

//PASSPORT
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

//ripristina carrello da cookie 
const { ripristinaCarrelloDaCookie } = require('./routes/logout');
app.use(ripristinaCarrelloDaCookie);

//DATI GLOBALI PER LE VIEW
/**
 * Questi dati sono disponibili in TUTTE le view automaticamente
 * Necessari per:
 * - navbar: mostra user, cartCount
 * - flash-messages: legge query params per messaggi
 */
app.use((req, res, next) => {
  //Utente corrente (se loggato)
  res.locals.user = req.user || null;
  
  //Carrello dalla sessione
  res.locals.carrello = req.session.carrello || [];
  
  //Conteggio items nel carrello
  res.locals.cartCount = res.locals.carrello.reduce(
    (tot, item) => tot + item.quantita, 0
  );
  
  //Query params per flash messages
  res.locals.query = req.query || {};
  
  next();
});



//ROUTES

//Autenticazione
app.use("/login", require("./routes/login"));
app.use("/register", require("./routes/register"));
app.use("/logout", require("./routes/logout"));

//Funzionalità principali
app.use("/eventi", require("./routes/eventi"));
app.use("/biglietti", require("./routes/biglietti"));
app.use("/stand", require("./routes/stand"));
app.use("/carrello", require("./routes/carrello"));

//Area utente e admin
app.use("/areapersonale", require("./routes/areapersonale"));
app.use("/admin", require("./routes/admin"));

//Ricerca
app.use('/research', require('./routes/research'));

//Homepage e pagine statiche (SEMPRE ULTIMA!)
app.use("/", require("./routes/index"));

//ERROR HANDLERS

//404 - Not Found
app.use(notFound);

//Gestione errori centralizzata
app.use(errorHandler);

//AVVIO SERVER
app.listen(port, () => {
  console.log(`\n====================================`);
  console.log(`Server ComixCity attivo!`);
  console.log(`URL: http://localhost:${port}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================\n`);
  
  //Auto-open browser solo in development
  if (process.env.NODE_ENV !== "production") {
    import("open").then((open) => {
      open.default(`http://localhost:${port}`);
    }).catch(() => {
      //opzionale
  });
  }
});