# ComixCity - Fiera del Fumetto

**Progetto Esame Sviluppo di Applicazioni Web** - A.A. 2024/2025  
**Studente**: Dario Guidotti - 20044165  
**Università**: Università del Piemonte Orientale

---

## 📋 Descrizione

ComixCity è un'applicazione web per gestire una fiera del fumetto. Permette di:
- Acquistare biglietti d'ingresso
- Prenotare eventi
- Prenotare stand espositivi (per espositori)
- Gestire il sistema (per amministratori)

Il progetto usa **Node.js + Express** con rendering lato server (EJS) e database SQLite.

---

## 🚀 Installazione Rapida

### Prerequisiti
- Node.js 16 o superiore
- npm

### Passi per l'installazione

1. **Scarica il progetto**
   ```bash
   cd ComixCity
   ```

2. **Installa dipendenze**
   ```bash
   npm install
   ```

3. **Crea file `.env`** nella cartella principale:
   ```
   SESSION_SECRET=stringa_segreta_molto_lunga_e_casuale_minimo_32_caratteri
   PORT=3000
   NODE_ENV=development
   BCRYPT_SALT=10
   ```

4. **Avvia il server**
   ```bash
   npm start
   ```

5. **Apri il browser** su: `http://localhost:3000`

---

## 🛠️ Tecnologie Utilizzate

### Backend
- **Node.js** + **Express 5.1**
- **SQLite3** - Database
- **EJS** - Template engine
- **Passport.js** - Autenticazione
- **bcrypt** - Hashing password
- **express-session** + **connect-sqlite3** - Sessioni persistenti

### Frontend
- **HTML5** + **CSS3**
- **JavaScript ES6+**
- **Bootstrap 5** - Layout responsive
- Nessun framework JS (niente React/Vue/Angular)

### Sicurezza
- Password hashate con bcrypt
- Sessioni sicure (httpOnly, sameSite)
- Validazione input lato server
- Security headers (X-Frame-Options, XSS-Protection, etc.)

---

## 📱 Funzionalità Principali

### Per Tutti gli Utenti
- **Homepage**: presentazione fiera con slider
- **Eventi**: lista eventi con ricerca
- **Biglietti**: visualizzazione tipologie disponibili

### Per Utenti Registrati
- **Carrello**: aggiunta biglietti, modifica quantità
- **Checkout**: acquisto con dati fatturazione
- **Area Personale**: storico acquisti e prenotazioni
- **Prenotazione Eventi**: iscrizione a workshop/tornei

### Per Espositori
- **Stand**: visualizzazione stand disponibili
- **Prenotazione Stand**: prenotazione spazio (limite: 1 stand per espositore)

### Per Amministratori
- **Dashboard**: statistiche (utenti, stand, eventi, incasso)
- **Gestione Eventi**: crea, modifica, elimina eventi
- **Visualizzazione Dati**: lista utenti e prenotazioni

---

## 📊 Database

Il database SQLite (`database.db`) contiene queste tabelle:

- **utenti**: account (username, email, password hashata, ruolo)
- **biglietti**: tipologie biglietti (nome, prezzo, disponibili)
- **biglietti_acquistati**: storico acquisti
- **eventi**: eventi della fiera (titolo, descrizione, data)
- **eventi_prenotati**: prenotazioni eventi
- **stand**: spazi espositivi (nome, padiglione, capienza)
- **stand_prenotati**: prenotazioni stand
- **transaction_log**: log transazioni
- **user_sessions_log**: log accessi

---

## 🧪 Test dell'Applicazione

### Test Utente Base
1. Vai su `http://localhost:3000`
2. Clicca "Registrati" e crea un account
3. Naviga su "Biglietti" → aggiungi al carrello
4. Vai al carrello → "Procedi al Pagamento"
5. Compila form checkout → conferma
6. Vai in "Area Personale" → verifica acquisti

### Test Espositore
1. Login con account espositore
2. Vai su "Stand"
3. Prenota uno stand disponibile
4. Verifica in "Area Personale"

### Test Admin
1. Login con account admin
2. Vai su "Admin" (menu)
3. Visualizza statistiche
4. Crea un nuovo evento
5. Verifica in pagina "Eventi"

---

## 📁 Struttura Progetto

```
ComixCity/
├── app.js                 # File principale server
├── db.js                  # Connessione database
├── database.db            # Database SQLite (con dati test)
├── package.json           # Dipendenze npm
├── .env                   # Configurazione (NON committare!)
│
├── config/
│   └── passport.js        # Configurazione autenticazione
│
├── daos/                  # Data Access Objects
│   ├── BigliettiDAO.js
│   ├── EventiDAO.js
│   ├── PrenotazioneEventiDAO.js
│   ├── StandDAO.js
│   └── UtentiDAO.js
│
├── middleware/            # Middleware Express
│   ├── auth.js            # Protezione route
│   ├── errorHandler.js    # Gestione errori
│   ├── flashHelper.js     # Messaggi flash
│   ├── validators.js      # Validazione input
│   └── ...
│
├── routes/                # Route Express
│   ├── admin.js
│   ├── areapersonale.js
│   ├── biglietti.js
│   ├── carrello.js
│   ├── eventi.js
│   ├── login.js
│   ├── register.js
│   └── ...
│
├── views/                 # Template EJS
│   ├── *.ejs
│   └── partials/
│
├── public/                # File statici
│   ├── css/stile.css
│   ├── js/
│   └── img/
│
└── temp/                  # Auto-generati
    └── sessions.db
```

---

## 🔒 Sicurezza

- **Autenticazione**: Passport.js con sessioni persistenti
- **Password**: Hashing bcrypt (10 salt rounds)
- **Validazione**: Controllo input lato server
- **Sessioni**: Cookie httpOnly, sameSite=lax
- **Headers**: X-Frame-Options, XSS-Protection
- **Transazioni**: ACID per checkout (previene overselling)

---

## 📱 Responsive Design

Ottimizzato per:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

Testato su Chrome 133+ e Firefox 135+.

---

## ⚠️ Note Importanti

### File `.env`
**NON committare su GitHub!** Contiene segreti.

Esempio:
```
SESSION_SECRET=stringa_casuale_molto_lunga
PORT=3000
NODE_ENV=development
BCRYPT_SALT=10
```

### Database
`database.db` è già popolato con:
- 3 utenti test
- 4 tipologie biglietti
- 12 eventi
- 5 stand

### Sessioni
Salvate in `temp/sessions.db` (auto-creato). Durata: 24 ore.

---

## 📝 Script npm

```bash
npm start        # Avvia server
npm run dev      # Avvia con nodemon (auto-restart)
```

---

## 🐛 Problemi Comuni

**Server non parte?**
1. Verifica porta 3000 libera
2. Controlla `.env` esista con `SESSION_SECRET`
3. Esegui `npm install`

**Errori database?**
- Verifica `database.db` esista nella cartella principale

---

## 📧 Contatti

**Studente**: Dario Guidotti  
**Matricola**: 20044165  
**Email**: 20044165@studenti.uniupo.it  
**Università**: Università del Piemonte Orientale

---

## 📄 Licenza

Progetto accademico per esame universitario - A.A. 2024/2025
