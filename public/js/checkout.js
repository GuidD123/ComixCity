//public/js/checkout.js
//Gestione di 3 elementi:
//cambio metodo di pagamento mostrando/nascondendo form, validazioni e formattazioni real-time dei campi carta + cap con feedback visivo
//Sicurezza logica: il submit si blocca se il server segnala che alcuni biglietti non sono + disponibili

//recupera form principale, button di pagamento e scelta metodo di pagamento
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('checkoutForm');
  const submitButton = document.getElementById('submitPayment');
  const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
  
  //Cambio metodo di pagamento
  paymentMethods.forEach(method => {
    method.addEventListener('change', function() {
      togglePaymentForms(this.value); //sceglie il metodo
    });
  });
  
  //Attiva validazioni e formattazioni
  setupRealTimeValidation(); //controllo su input mentre scrivo
  setupFieldFormatting(); //auto-formattazione spazi

  //Al submit Disabilita bottone durante il submit (ma lascia POST nativo attivo) -> anti doppio click
  //Non si fa preventDefault quindi il POST procede normalmente
  form.addEventListener('submit', () => {
    submitButton.disabled = true;
    submitButton.querySelector('.btn-text').style.display = 'none';
    submitButton.querySelector('.btn-loading').style.display = 'inline';
  });
});

//Mostra/nasconde form pagamento
function togglePaymentForms(selectedMethod) {
  const cardForm = document.getElementById('cardForm');
  const paypalForm = document.getElementById('paypalForm');
  const bankForm = document.getElementById('bankForm');
  
  //Nascondi tutti con data-attribute
  cardForm.dataset.hidden = 'true';
  paypalForm.dataset.hidden = 'true';
  bankForm.dataset.hidden = 'true';
  
  //Rimuovi required dai campi nascosti della carta
  //Se lascio required sui campi nascosti il browser blocca il submit anch se sto pagando con Paypal/bonifico
  cardForm.querySelectorAll('input[required]').forEach(input => input.removeAttribute('required'));
  
  //Mostra form selezionato e rende required tutti gli input 
  switch(selectedMethod) {
    case 'card':
      cardForm.dataset.hidden = 'false';
      cardForm.querySelectorAll('input').forEach(input => input.setAttribute('required', 'required'));
      break;
    case 'paypal':
      paypalForm.dataset.hidden = 'false';
      break;
    case 'bank':
      bankForm.dataset.hidden = 'false';
      break;
  }
}

//Validazione real-time - mentre utente sta scrivendo il codice:
//controlla se ciò che scrive ha senso, corregge automaticamente il formato, gli dice subito se giusto o sbagliato senza aspettare che faccia submit premendo invio
function setupRealTimeValidation() {
  //se HTML ha <input id="cardNumber"> ottiene l'elemento
  const cardNumber = document.getElementById('cardNumber');
  const expiryDate = document.getElementById('expiryDate');
  const cvv = document.getElementById('cvv');
  const billingZip = document.getElementById('billingZip');

  //input - evento creato dal browser quando utente scrive una cifra, cancella una cifra, incolla qualcosa
  //nell'if qua sotto fa: ogni volta che succede qaualcosa nell'input cardNumber allora chiama la funzione e così tutti gli altri in tempo reale 
  //utente digita -> evento input -> JS reagisce ed esegue la validazione
  if (cardNumber) cardNumber.addEventListener('input', () => validateCardNumber(cardNumber));
  if (expiryDate) expiryDate.addEventListener('input', () => validateExpiryDate(expiryDate));
  if (cvv) cvv.addEventListener('input', () => validateCVV(cvv));
  if (billingZip) billingZip.addEventListener('input', () => validateZipCode(billingZip));
}

//Formattazione automatica dell'input inserito dall'utente
function setupFieldFormatting() {
  const cardNumber = document.getElementById('cardNumber');
  const expiryDate = document.getElementById('expiryDate');
  
  if (cardNumber) cardNumber.addEventListener('input', () => formatCardNumber(cardNumber));
  if (expiryDate) expiryDate.addEventListener('input', () => formatExpiryDate(expiryDate));
}

//Utility di formattazione
function formatCardNumber(input) {
  let v = input.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
  input.value = v.match(/.{1,4}/g)?.join(' ') || v;
}
function formatExpiryDate(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
  input.value = v;
}

//Validazioni campi carta e CAP
function validateCardNumber(input) {
  const value = input.value.replace(/\s/g, '');
  const isValid = /^[0-9]{13,19}$/.test(value) && luhnCheck(value);
  setFieldValidation(input, isValid, 'Numero carta non valido');
  detectCardType(value);
  return isValid;
}

function luhnCheck(cardNumber) {
  let sum = 0, isEven = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return (sum % 10) === 0;
}

function detectCardType(num) {
  document.querySelectorAll('.card-icon').forEach(i => i.classList.remove('active'));
  if (/^4/.test(num)) document.querySelector('.card-icon.visa')?.classList.add('active');
  else if (/^5[1-5]/.test(num)) document.querySelector('.card-icon.mastercard')?.classList.add('active');
}

function validateExpiryDate(input) {
  const val = input.value;
  const [m, y] = val.split('/');
  const now = new Date();
  const year = parseInt(`20${y}`, 10);
  const month = parseInt(m, 10);
  const valid = /^[0-9]{2}\/[0-9]{2}$/.test(val)
    && month >= 1 && month <= 12
    && (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1));
  setFieldValidation(input, valid, valid ? '' : 'Data non valida');
  return valid;
}

function validateCVV(input) {
  const valid = /^[0-9]{3,4}$/.test(input.value);
  setFieldValidation(input, valid, 'CVV non valido');
  return valid;
}

function validateZipCode(input) {
  const valid = /^[0-9]{5}$/.test(input.value);
  setFieldValidation(input, valid, 'CAP deve avere 5 cifre');
  return valid;
}

//Visual feedback
function setFieldValidation(input, ok, msg = '') {
  const g = input.closest('.form-group');
  g?.querySelector('.field-error')?.remove();
  input.classList.remove('valid', 'invalid');
  if (input.value.trim().length === 0) return;
  if (ok) input.classList.add('valid');
  else {
    input.classList.add('invalid');
    if (msg) {
      const e = document.createElement('div');
      e.className = 'field-error';
      e.textContent = msg;
      g.appendChild(e);
    }
  }
}

//Protezione disponibilità biglietti
document.addEventListener('DOMContentLoaded', function() {
  //Ottieni stato disponibilità dal server (inserito nel DOM)
  const disponibilitaEl = document.getElementById('tuttoDisponibile');
  const tuttoDisponibile = disponibilitaEl ? disponibilitaEl.value === 'true' : true;
  
  const form = document.getElementById('checkoutForm');
  
  if (!tuttoDisponibile && form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('⚠️ Alcuni biglietti non sono disponibili. Torna al carrello per aggiornare le quantità.');
      return false;
    });
  }
});
