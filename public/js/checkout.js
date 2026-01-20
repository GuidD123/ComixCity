// /public/js/checkout.js
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('checkoutForm');
  const submitButton = document.getElementById('submitPayment');
  const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
  
  // Cambio metodo di pagamento
  paymentMethods.forEach(method => {
    method.addEventListener('change', function() {
      togglePaymentForms(this.value);
    });
  });
  
  // Attiva validazioni e formattazioni
  setupRealTimeValidation();
  setupFieldFormatting();

  // Disabilita bottone durante il submit (ma lascia POST nativo attivo)
  form.addEventListener('submit', () => {
    submitButton.disabled = true;
    submitButton.querySelector('.btn-text').style.display = 'none';
    submitButton.querySelector('.btn-loading').style.display = 'inline';
  });
});

// === Mostra/nasconde form pagamento ===
function togglePaymentForms(selectedMethod) {
  const cardForm = document.getElementById('cardForm');
  const paypalForm = document.getElementById('paypalForm');
  const bankForm = document.getElementById('bankForm');
  
  // Nascondi tutti
  cardForm.style.display = 'none';
  paypalForm.style.display = 'none';
  bankForm.style.display = 'none';
  
  // Rimuovi required dai campi nascosti
  cardForm.querySelectorAll('input[required]').forEach(input => input.removeAttribute('required'));
  
  // Mostra quello selezionato
  switch(selectedMethod) {
    case 'card':
      cardForm.style.display = 'block';
      cardForm.querySelectorAll('input').forEach(input => input.setAttribute('required', 'required'));
      break;
    case 'paypal':
      paypalForm.style.display = 'block';
      break;
    case 'bank':
      bankForm.style.display = 'block';
      break;
  }
}

// === Validazioni ===
function setupRealTimeValidation() {
  const cardNumber = document.getElementById('cardNumber');
  const expiryDate = document.getElementById('expiryDate');
  const cvv = document.getElementById('cvv');
  const billingZip = document.getElementById('billingZip');

  if (cardNumber) cardNumber.addEventListener('input', () => validateCardNumber(cardNumber));
  if (expiryDate) expiryDate.addEventListener('input', () => validateExpiryDate(expiryDate));
  if (cvv) cvv.addEventListener('input', () => validateCVV(cvv));
  if (billingZip) billingZip.addEventListener('input', () => validateZipCode(billingZip));
}

// === Formattazione automatica ===
function setupFieldFormatting() {
  const cardNumber = document.getElementById('cardNumber');
  const expiryDate = document.getElementById('expiryDate');
  
  if (cardNumber) cardNumber.addEventListener('input', () => formatCardNumber(cardNumber));
  if (expiryDate) expiryDate.addEventListener('input', () => formatExpiryDate(expiryDate));
}

// === Utility di formattazione ===
function formatCardNumber(input) {
  let v = input.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
  input.value = v.match(/.{1,4}/g)?.join(' ') || v;
}
function formatExpiryDate(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
  input.value = v;
}

// === Validazioni campi carta e CAP ===
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

// === Visual feedback ===
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
