const validator = require('validator');
const { AppError } = require('./errorHandler');

const validate = (validationRules) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = req.body[field];
      
      // Required
      if (rules.required && !value) {
        errors.push(`${field} è obbligatorio`);
        continue;
      }
      
      if (!value && !rules.required) continue;
      
      // Email
      if (rules.email && !validator.isEmail(value)) {
        errors.push(`${field} deve essere una email valida`);
      }
      
      // Min length
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} deve essere almeno ${rules.minLength} caratteri`);
      }
      
      // Max length
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} deve essere massimo ${rules.maxLength} caratteri`);
      }
      
      // Pattern
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.patternMessage || `${field} non valido`);
      }
      
      // Enum
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} deve essere uno di: ${rules.enum.join(', ')}`);
      }
      
      // Custom validator
      if (rules.custom && !rules.custom(value, req.body)) {
        errors.push(rules.customMessage || `${field} non valido`);
      }
      
      // Validazione numerica
      if (rules.numeric) {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push(`${field} deve essere un numero valido`);
        } else {
          if (rules.min !== undefined && num < rules.min) {
            errors.push(`${field} deve essere almeno ${rules.min}`);
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push(`${field} deve essere massimo ${rules.max}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return next(new AppError(errors.join('. '), 400));
    }
    
    next();
  };
};

/**
 * Validatori predefiniti
 */
const validators = {
  // Registrazione utente
  register: validate({
    username: {
      required: true,
      minLength: 3,
      maxLength: 30,
      pattern: /^[a-zA-Z0-9_]{3,30}$/,
      patternMessage: 'Username deve contenere solo lettere, numeri e underscore'
    },
    email: {
      required: true,
      email: true
    },
    password: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      patternMessage: 'Password deve contenere almeno una maiuscola, una minuscola e un numero'
    },
    ruolo: {
      required: true,
      enum: ['utente', 'espositore', 'admin']
    }
  }),
  
  // Creazione/Modifica evento
  evento: validate({
    titolo: {
      required: true,
      minLength: 3,
      maxLength: 200
    },
    descrizione: {
      required: true,
      minLength: 10
    },
    data: {
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      patternMessage: 'Data deve essere in formato YYYY-MM-DD',
      custom: (value) => {
        const dataEvento = new Date(value);
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        return dataEvento >= oggi;
      },
      customMessage: 'La data dell\'evento non può essere nel passato'
    }
  }),
  
  // Aggiunta biglietto al carrello
  carrelloItem: validate({
    id: {
      required: true,
      custom: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
      customMessage: 'ID biglietto non valido'
    },
    quantita: {
      required: true,
      custom: (val) => {
        const q = parseInt(val);
        return !isNaN(q) && q >= 1 && q <= 5;
      },
      customMessage: 'Quantità deve essere tra 1 e 5'
    },
    prezzo: {
      required: true,
      custom: (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      customMessage: 'Prezzo non valido'
    }
  }),

  // Dati fatturazione (sempre richiesti)
  billingData: validate({
    billingName: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    billingEmail: {
      required: true,
      email: true
    },
    billingCity: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    billingZip: {
      required: true,
      pattern: /^\d{5}$/,
      patternMessage: 'CAP non valido (5 cifre richieste)',
      custom: (val) => {
        const cap = parseInt(val);
        return cap >= 10000 && cap <= 98168;
      },
      customMessage: 'CAP italiano non valido (range 10000-98168)'
    },
    acceptTerms: {
      required: true,
      custom: (val) => val === 'on' || val === true || val === 'true',
      customMessage: 'Devi accettare i termini e condizioni'
    }
  }),

  //Dati carta (solo se paymentMethod === 'card')
  cardData: validate({
    cardNumber: {
      required: true,
      custom: (val) => {
        const cleaned = val.replace(/\s/g, '');
        return /^[0-9]{13,19}$/.test(cleaned);
      },
      customMessage: 'Numero carta non valido (13-19 cifre)'
    },
    cardName: {
      required: true,
      minLength: 3,
      maxLength: 100
    },
    expiryDate: {
      required: true,
      pattern: /^(0[1-9]|1[0-2])\/\d{2}$/,
      patternMessage: 'Data scadenza non valida (formato MM/YY)',
      custom: (val) => {
        const [month, year] = val.split('/').map(Number);
        const now = new Date();
        
        // Validazione mese
        if (month < 1 || month > 12) return false;
        
        // Se year < 50 assume 20YY, altrimenti 19YY
        const fullYear = year < 50 ? 2000 + year : 1900 + year;
        
        // Crea data ultimo giorno del mese di scadenza
        const expiryDate = new Date(fullYear, month, 0, 23, 59, 59);
        
        // Verifica se scaduta
        if (expiryDate < now) return false;
        
        return true;
      },
      customMessage: 'Carta di credito scaduta'
    },
    cvv: {
      required: true,
      pattern: /^[0-9]{3,4}$/,
      patternMessage: 'CVV non valido (3-4 cifre)'
    }
  }),

  // Modifica profilo
  updateProfile: validate({
    username: {
      required: true,
      minLength: 3,
      maxLength: 30,
      pattern: /^[a-zA-Z0-9_]{3,30}$/,
      patternMessage: 'Username non valido'
    },
    email: {
      required: true,
      email: true
    }
  }),

  // Cambio password
  changePassword: validate({
    currentPassword: {
      required: true,
      minLength: 1
    },
    newPassword: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      patternMessage: 'Password deve contenere almeno 8 caratteri, una maiuscola, una minuscola e un numero'
    },
    confirmPassword: {
      required: true,
      custom: (value, body) => value === body.newPassword,
      customMessage: 'Le password non coincidono'
    }
  })
};


 //Validatore combinato per checkout
 //Valida billing sempre + carta solo se paymentMethod === 'card'

const validateCheckout = (req, res, next) => {
  const errors = [];
  
  //Valida sempre i dati di fatturazione
  const billingRules = {
    billingName: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    billingEmail: {
      required: true,
      email: true
    },
    billingCity: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    billingZip: {
      required: true,
      pattern: /^\d{5}$/,
      custom: (val) => {
        const cap = parseInt(val);
        return cap >= 10000 && cap <= 98168;
      }
    },
    acceptTerms: {
      required: true,
      custom: (val) => val === 'on' || val === true || val === 'true'
    }
  };
  
  //Valida billing
  for (const [field, rules] of Object.entries(billingRules)) {
    const value = req.body[field];
    
    if (rules.required && !value) {
      errors.push(`${field} è obbligatorio`);
      continue;
    }
    
    if (!value) continue;
    
    if (rules.email && !validator.isEmail(value)) {
      errors.push(`Email non valida`);
    }
    
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} troppo corto`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${field} troppo lungo`);
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} formato non valido`);
    }
    
    if (rules.custom && !rules.custom(value, req.body)) {
      if (field === 'billingZip') {
        errors.push('CAP italiano non valido (range 10000-98168)');
      } else if (field === 'acceptTerms') {
        errors.push('Devi accettare i termini e condizioni');
      } else {
        errors.push(`${field} non valido`);
      }
    }
  }
  
  //Valida carta solo se paymentMethod === 'card'
  if (req.body.paymentMethod === 'card') {
    const cardRules = {
      cardNumber: {
        required: true,
        custom: (val) => {
          const cleaned = val.replace(/\s/g, '');
          return /^[0-9]{13,19}$/.test(cleaned);
        }
      },
      cardName: {
        required: true,
        minLength: 3,
        maxLength: 100
      },
      expiryDate: {
        required: true,
        pattern: /^(0[1-9]|1[0-2])\/\d{2}$/,
        custom: (val) => {
          const [month, year] = val.split('/').map(Number);
          if (month < 1 || month > 12) return false;
          
          const fullYear = year < 50 ? 2000 + year : 1900 + year;
          const expiryDate = new Date(fullYear, month, 0, 23, 59, 59);
          
          return expiryDate > new Date();
        }
      },
      cvv: {
        required: true,
        pattern: /^[0-9]{3,4}$/
      }
    };
    
    //Valida carta
    for (const [field, rules] of Object.entries(cardRules)) {
      const value = req.body[field];
      
      if (rules.required && !value) {
        errors.push(`${field} carta è obbligatorio`);
        continue;
      }
      
      if (!value) continue;
      
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} troppo corto`);
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        if (field === 'expiryDate') {
          errors.push('Data scadenza non valida (formato MM/YY)');
        } else if (field === 'cvv') {
          errors.push('CVV non valido (3-4 cifre)');
        } else {
          errors.push(`${field} formato non valido`);
        }
      }
      
      if (rules.custom && !rules.custom(value, req.body)) {
        if (field === 'cardNumber') {
          errors.push('Numero carta non valido (13-19 cifre)');
        } else if (field === 'expiryDate') {
          errors.push('Carta di credito scaduta');
        } else {
          errors.push(`${field} non valido`);
        }
      }
    }
  }
  
  //Se ci sono errori, passa al error handler
  if (errors.length > 0) {
    return next(new AppError(errors.join('. '), 400));
  }
  
  next();
};

module.exports = { 
  validate, 
  validators,
  validateCheckout 
};