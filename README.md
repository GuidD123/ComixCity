# ComixCity - Fiera del Fumetto

**Progetto di Sviluppo di Applicazioni Web** - A.A. 2024/2025  
**Studente**: [Dario Guidotti - 20044165]

## Descrizione del Progetto

ComixCity è un’applicazione web dinamica, realizzata con Node.js ed Express, che gestisce in modo completo la fiera del fumetto:
acquisto biglietti, prenotazione stand, iscrizione agli eventi, area personale con storico acquisti e prenotazioni e amministrazione centralizzata(Pannello di amministrazione centralizzato).

L’app segue un’architettura server-side rendering (SSR) basata su EJS, senza framework SPA, per garantire semplicità, chiarezza e controllo completo sul flusso server-client.

## Tecnologie principali

### Backend
- **Node.js** + **Express.js**
- **SQLite** come database relazionale
- **EJS** per il templating server-side
- **Passport.js** per l'autenticazione
- **bcrypt** per l'hashing delle password
- **express-session** per la gestione delle sessioni
- **Middleware personalizzati**: validators (validazione input), errorHandler (gestione errori centralizzata), auth (autenticazione e ruoli), transactionLogger, sessionLogger (monitoraggio attività)

### Frontend
- **HTML5** e **CSS3** responsive
- **JavaScript ES6+** con classi e moduli
- **Fetch API** per chiamate AJAX
- **Bootstrap 5**  per layout responsive
- **Routing server-side** con Express ed EJS per il rendering dinamico.

## Sicurezza Implementata

- **Autenticazione**: Sistema Passport.js login/logout con sessioni
- **Autorizzazione**: Middleware per ruoli (admin, utente, espositore)
- **Validazione Input**: tramite middleware server-side
- **Headers Sicurezza**: XSS Protection, CSRF, Content-Type-Options
- **Password Hashing**: bcrypt con salt rounds configurabili
- **HTTP** headers di sicurezza (X-Content-Type-Options, Frame-Options, Referrer-Policy, ecc.)
- **Sessioni sicure** con cookie httpOnly e secure
- **Log attività** su database



## Installazione e Avvio

### Prerequisiti
- Node.js (versione 16+)
- npm

### Istruzioni per l'installazione

1. **Clona il repository**
   ```bash
   git clone [URL_REPOSITORY]
   cd fiera-comics
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   Crea un file `.env` nella root del progetto con:
   ```
   SESSION_SECRET=il_tuo_secret_molto_sicuro_qui
   PORT=3000
   NODE_ENV=development
   BCRYPT_SALT=10
   ```

4. **Avvia l'applicazione**
   ```bash
   npm run dev
   # oppure
   npm start
   ```

5. **Accedi all'applicazione**
   Apri il browser e vai su: `http://localhost:3000`


## Credenziali di Accesso

### Account Amministratore
- **Username**: admin123
- **Email**: admin123@comixcity.com
- **Password**: AdminTest1
- **Ruolo**: admin

### Account Utente Test
- **Username**: utente_test
- **Email**: utente_test@gmail.com  
- **Password**: UtenteTest1
- **Ruolo**: utente

### Account Espositore Test
- **Username**: espositore_test
- **Email**: espositore_test@gmail.com
- **Password**: EspositoreTest1
- **Ruolo**: espositore


## Funzionalità Principali

### **Homepage**
- Hero con slider immagini e presentazione fiera
- Anteprima eventi e biglietti disponibili

### **Biglietti**
- Visualizzazione biglietti disponibili
- Aggiunta al carrello e calcolo totale
- Calcolo automatico totali
- Simulazione checkout e conferma acquisto
- Storico biglietti acquistati in area personale

### **Gestione Eventi**
- Lista eventi con ricerca 
- Prenotazione eventi per utenti autenticati
- Modal con dettagli completi
- Gestione CRUD completa per admin

### **Stand per Espositori**
- Visualizzazione stand disponibili con dettagli
- Prenotazione per utenti con ruolo "espositore"
- Gestione disponibilità in tempo reale
- Riepilogo prenotazioni nello spazio personale

### **Area Personale**
- Visualizzazione acquisti e prenotazioni
- Storico biglietti, eventi e stand prenotati
- Modifica profilo utente
- Cambio password sicuro
- Accesso sicuro tramite autenticazione e interfaccia adattiva per ruolo (utente / espositore)

### **Pannello Amministratore**
- Dashboard con visualizzazione prenotazioni e statistiche
- Gestione utenti, eventi, biglietti e stand
- Gestione completa del sistema
- Log transazioni e sessioni


## Responsive Design

L'applicazione è completamente responsive e ottimizzata per:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

### Breakpoint principali:
```css
@media (max-width: 768px) { /* Mobile */ }
@media (max-width: 480px) { /* Mobile piccolo */ }
```

## Accessibilità, UX e Performance:
- Struttura semantica con ARIA labels
- Feedback visuali e messaggi flash chiari
- Immagini ottimizzate e cache-control server



## Database Schema

### Tabelle Principali:
- **utenti**: Gestione utente (id, username, email, password, ruolo)
- **eventi**: Eventi della fiera (id, titolo, descrizione, data, img)
- **eventi_prenotati**: Prenotazioni eventi (id, evento_id, utente_id, data_prenotazione, stato, note, tipo_partecipazione)
- **biglietti**: Tipologie biglietti (id, nome, prezzo, disponibilita)
- **biglietti_acquistati**: Acquisti biglietti (id, utente_id, biglietto_id, quantita, data_acquisto, metodo_pagamento, transaction_id, prezzo_unitario, totale_riga, billing_name,billing_email, status)
- **stand**: Stand espositivi (id, nome, padiglione, posizione, tema, dimensione, capienza, servizi_inclusi, note)
- **stand_prenotati**: Prenotazioni stand (id, utente_id, stand_id, data_prenotazione)
- **transaction_log**: Transazioni utenti (id, utente_id, acquisto_id, transaction_id, payment_method, amount, status, ip_address, user_agent, created_at, updated_at)
- **user_sessions_log**: Sessioni utenti (id, utente_id, username, email, action, ip_address, failure_reason, timestamp)

## Test delle Funzionalità

### Percorso Utente Normale:
1. Registrazione/Login
2. Navigazione eventi e biglietti
3. Aggiunta al carrello
4. Checkout e conferma
5. Controllo storico in area personale

### Percorso Espositore:
1. Login come espositore
2. Visualizzazione stand disponibili
3. Prenotazione stand
4. Verifica prenotazione in area personale

### Percorso Amministratore:
1. Login come admin
2. Accesso pannello admin
3. Creazione/modifica eventi
4. Visualizzazione statistiche globali


## Note per la Valutazione

- **Responsive**: Testato su Chrome (133+) e Firefox (135+)
- **Accessibilità**: Implementati alt-text, ARIA labels, contrasti conformi
- **Performance**: Immagini ottimizzate, CSS minimizzato
- **SEO**: Meta tags appropriati, struttura semantica
- **UX**: Feedback utente, loading states, validazione form

## Problemi Noti

Nessun problema critico identificato. L'applicazione è completamente funzionale e pronta per la valutazione.

## Contatti

Per domande sul progetto:
- **Email**: [20044165@studenti.uniupo.it]
- **Matricola**: [20044165]
