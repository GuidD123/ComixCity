document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("mainNav");

  //SHRINK NAVBAR
  const toggleNavbar = () => {
    if (window.scrollY > 1) {
      navbar.classList.add("navbar-shrink");
    } else {
      navbar.classList.remove("navbar-shrink");
    }
  };

  if (navbar) {
    toggleNavbar(); 

    let ticking = false;

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          toggleNavbar();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  //SCROLL TO TOP
  const scrollBtn = document.getElementById("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", () => {
      if (
        document.body.scrollTop > 400 ||
        document.documentElement.scrollTop > 400
      ) {
        scrollBtn.style.display = "block";
      } else {
        scrollBtn.style.display = "none";
      }
    });

    scrollBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // LENTE DI RICERCA
  const searchToggle = document.querySelector(".search-toggle");
  const searchBar = document.getElementById("searchBar");
  const searchInput = document.querySelector(".search-form input");
  if (searchToggle && searchBar && searchInput) {
    searchToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      searchBar.classList.toggle("active");
      searchInput.focus();
    });
    searchBar.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", (e) => {
      if (!searchBar.contains(e.target) && !searchToggle.contains(e.target)) {
        searchBar.classList.remove("active");
      }
    });
    searchInput.addEventListener("focusout", () => {
      setTimeout(() => {
        if (
          !searchBar.contains(document.activeElement) &&
          document.activeElement !== searchToggle
        ) {
          searchBar.classList.remove("active");
        }
      }, 100);
    });
  }

  //RICERCA DA BARRA
  const searchInputLive = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  
  // Previeni submit form ricerca
  const searchForms = document.querySelectorAll('form[data-prevent-submit]');
  searchForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      return false;
    });
  });

  if (searchInputLive && searchResults) {
    let timeout;

    searchInputLive.addEventListener("input", () => {
      const query = searchInputLive.value.trim();
      clearTimeout(timeout);

      if (!query) {
        searchResults.innerHTML = "";
        return;
      }

      // Mostra stato loading
      searchResults.innerHTML =
        '<div class="search-item loading">🔍 Cercando...</div>';

      timeout = setTimeout(async () => {
        try {
          const res = await fetch(`/research?q=${encodeURIComponent(query)}`);

          if (!res.ok) {
            throw new Error(`Errore HTTP ${res.status}`);
          }

          const risultati = await res.json();

          if (Array.isArray(risultati)) {
            if (risultati.length === 0) {
              searchResults.innerHTML =
                '<div class="search-item no-results">❌ Nessun risultato trovato per "' +
                query +
                '"</div>';
            } else {
              searchResults.innerHTML = risultati
                .map((item) => {
                  const titolo = item.nome || item.titolo || "Elemento";
                  const descrizione = item.descrizione || "";
                  const tipo = item.tipo || "sconosciuto";
                  const id = item.id;
                  const categoria = item.categoria || "";
                  const caratteristiche = item.caratteristiche || "";

                  // Icone per tipo (solo eventi e biglietti)
                  const icons = {
                    evento: "🎭",
                    biglietto: "🎫",
                  };
                  const icon = icons[tipo] || "🔍";

                  // Prezzo se disponibile
                  let prezzoHtml = "";
                  if (item.prezzo && parseFloat(item.prezzo) > 0) {
                    prezzoHtml = `<span class="search-price">€${parseFloat(
                      item.prezzo
                    ).toFixed(2)}</span>`;
                  } else if (item.prezzo === 0 || item.prezzo === "0") {
                    prezzoHtml = `<span class="search-price free">Gratuito</span>`;
                  }

                  // Data se disponibile (solo eventi)
                  let dataHtml = "";
                  if (item.data && tipo === "evento") {
                    try {
                      const data = new Date(item.data).toLocaleDateString(
                        "it-IT"
                      );
                      dataHtml = `<small class="search-date">📅 ${data}</small>`;
                    } catch (e) {
                      // Ignora date non valide
                    }
                  }

                  // Disponibilità per biglietti
                  let disponibilitaHtml = "";
                  if (tipo === "biglietto" && item.disponibili !== undefined) {
                    const disponibili = parseInt(item.disponibili);
                    if (disponibili > 0) {
                      disponibilitaHtml = `<small class="search-stock">📦 ${disponibili} disponibili</small>`;
                    } else {
                      disponibilitaHtml = `<small class="search-stock sold-out">❌ Esaurito</small>`;
                    }
                  }

                  // Categoria se disponibile
                  let categoriaHtml = "";
                  if (categoria) {
                    categoriaHtml = `<small class="search-category">🏷️ ${categoria}</small>`;
                  }

                  // URL di destinazione con evidenziazione
                  let targetUrl = "/";
                  if (tipo === "evento") {
                    targetUrl = `/eventi?highlight=${id}&search=${encodeURIComponent(
                      query
                    )}`;
                  } else if (tipo === "biglietto") {
                    targetUrl = `/biglietti?highlight=${id}&search=${encodeURIComponent(
                      query
                    )}`;
                  }

                  // Descrizione completa
                  let fullDesc = descrizione;
                  if (caratteristiche && caratteristiche !== descrizione) {
                    fullDesc += (fullDesc ? " • " : "") + caratteristiche;
                  }

                  return `
                    <div class="search-item" data-type="${tipo}">
                      <a href="${targetUrl}">
                        <div class="search-header">
                          <span class="search-icon">${icon}</span>
                          <strong class="search-title">${titolo}</strong>
                          ${prezzoHtml}
                        </div>
                        ${
                          fullDesc
                            ? `<div class="search-desc">${fullDesc.slice(
                                0,
                                100
                              )}${fullDesc.length > 100 ? "..." : ""}</div>`
                            : ""
                        }
                        <div class="search-meta">
                          ${dataHtml}
                          ${disponibilitaHtml}
                          ${categoriaHtml}
                          <span class="search-badge search-badge-${tipo}">${tipo}</span>
                        </div>
                      </a>
                    </div>
                  `;
                })
                .join("");
            }
          } else {
            searchResults.innerHTML =
              '<div class="search-item error">⚠️ Formato risposta non valido</div>';
          }
        } catch (err) {
          searchResults.innerHTML =
            '<div class="search-item error">💥 Errore di connessione. Riprova.</div>';
        }
      }, 300);
    });

    // Chiudi risultati se clicchi fuori
    document.addEventListener("click", (e) => {
      if (
        !searchResults.contains(e.target) &&
        !searchInputLive.contains(e.target)
      ) {
        searchResults.innerHTML = "";
      }
    });

    // Gestione tastiera
    searchInputLive.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchResults.innerHTML = "";
        searchInputLive.blur();
      } else if (e.key === "Enter") {
        const firstResult = searchResults.querySelector(".search-item a");
        if (firstResult) {
          firstResult.click();
        }
      }
    });
  }

  // SVUOTA CARRELLO CONFERMA
  const form = document.getElementById("svuotaCarrelloForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      const conferma = confirm("Sei sicuro di voler svuotare il carrello?");
      if (!conferma) e.preventDefault();
    });
  }

  // GESTIONE PULSANTI QUANTITÀ CARRELLO SOLAMENTE
  const quantityBtns = document.querySelectorAll(
    ".btn-incrementa[data-index], .btn-decrementa[data-index]"
  );

  quantityBtns.forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      if (this.disabled) {
        e.preventDefault();
        return false;
      }

      this.disabled = true;
      const originalText = this.textContent;
      this.textContent = "...";

      // Solo per pulsanti del carrello con data-index
      if (this.dataset.index) {
        e.preventDefault();

        const index = this.dataset.index;
        const action = this.classList.contains("btn-incrementa")
          ? "incrementa"
          : "decrementa";

        try {
          const res = await fetch(`/carrello/${action}/${index}`, {
            method: "POST",
          });

          if (res.ok) {
            location.reload();
          } else {
            console.error("Errore nella richiesta");
            this.textContent = originalText;
            this.disabled = false;
          }
        } catch (error) {
          console.error("Errore:", error);
          this.textContent = originalText;
          this.disabled = false;
        }
      }
    });
  });

  // CONTROLLI QUANTITÀ PER BIGLIETTI
  document.querySelectorAll(".qty-btn-increment").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const bigliettoId = this.dataset.bigliettoId;
      incrementQuantity(bigliettoId);
    });
  });

  document.querySelectorAll(".qty-btn-decrement").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const bigliettoId = this.dataset.bigliettoId;
      decrementQuantity(bigliettoId);
    });
  });

  document
    .querySelectorAll(".form-aggiungi-carrello[data-ajax='true']")
    .forEach((form) => {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        // Elementi per gestione loading
        const button = this.querySelector("button[type='submit']");
        const originalText = button.textContent;

        // Stato loading - disabilita bottone
        button.disabled = true;
        button.textContent = "Aggiungendo...";

        try {
          // Conversione tipi corretta
          const id = parseInt(form.querySelector("[name=id]").value);
          const quantita = parseInt(
            form.querySelector("[name=quantita]").value
          );
          const prezzo = parseFloat(form.querySelector("[name=prezzo]").value);

          // Validazione lato client
          if (
            isNaN(id) ||
            isNaN(quantita) ||
            isNaN(prezzo) ||
            quantita < 1 ||
            quantita > 5
          ) {
            throw new Error("Dati non validi");
          }

          
          const formData = new URLSearchParams();
          formData.append("id", id);
          formData.append("quantita", quantita);
          formData.append("prezzo", prezzo);

          const res = await fetch("/carrello/aggiungi", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
          });

          const result = await res.json();

          // Usa la funzione helper per mostrare feedback
          if (result.success) {
            showFeedback(
              form,
              "success",
              result.message || "Biglietto aggiunto al carrello!"
            );

            // Aggiorna badge carrello
            const cartBadge = document.getElementById("cartBadge");
            if (cartBadge && result.carrelloLength != null) {
              cartBadge.textContent = result.carrelloLength;
              cartBadge.classList.add("badge-pop");
              setTimeout(() => cartBadge.classList.remove("badge-pop"), 300);
            }
          } else {
            showFeedback(
              form,
              "error",
              result.message || "Errore durante aggiunta al carrello"
            );
          }
        } catch (err) {
          console.error("Errore AJAX carrello:", err);
          showFeedback(form, "error", "Errore di connessione. Riprova.");
        } finally {
          // Ripristina sempre il bottone
          button.disabled = false;
          button.textContent = originalText;
        }
      });
    });


  function showFeedback(form, type, message) {
    // Crea un alert fisso usando il tuo sistema esistente
    const alertClass =
      type === "success"
        ? "alert-success"
        : type === "error"
        ? "alert-danger"
        : type === "warning"
        ? "alert-warning"
        : "alert-info";

    // Crea l'alert
    const alert = document.createElement("div");
    alert.className = `alert ${alertClass}`;
    alert.setAttribute("role", "alert");
    alert.textContent = message;

    // Aggiungi al body 
    document.body.appendChild(alert);

    // Auto-rimozione dopo 5 secondi 
    setTimeout(() => {
      alert.style.animation = "fadeOut 0.5s ease-in forwards";
      setTimeout(() => alert.remove(), 500);
    }, 5000);

    // Click per chiudere
    alert.addEventListener("click", () => {
      alert.style.animation = "fadeOut 0.5s ease-in forwards";
      setTimeout(() => alert.remove(), 500);
    });
  }

  // HAMBURGER MENU
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("menuOverlay");
  if (hamburger && menu && overlay) {
    hamburger.addEventListener("click", () => {
      menu.classList.toggle("active");
      overlay.classList.toggle("active");
    });
    overlay.addEventListener("click", () => {
      menu.classList.remove("active");
      overlay.classList.remove("active");
    });
    document.querySelectorAll(".menu a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("active");
        overlay.classList.remove("active");
      });
    });
  }

  // Smooth scroll per anchor interni
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId && targetId.length > 1) {
        e.preventDefault();
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // APERTURA MODAL EVENTI
  document.querySelectorAll(".btn-info").forEach((btn) => {
    btn.addEventListener("click", function () {
      const card = this.closest(".evento-card");
      const modal = document.getElementById("eventoModal");

      if (modal && card) {
        document.getElementById("modalTitle").textContent =
          card.dataset.title || "";
        document.getElementById("modalDesc").textContent =
          card.dataset.desc || "";
        document.getElementById("modalImg").src = card.dataset.img || "";
        document.getElementById("modalImg").alt = card.dataset.title || "";

        const features = card.dataset.features;
        if (features) {
          try {
            const featArray = JSON.parse(features);
            document.getElementById("modalFeat").innerHTML = featArray
              .map((f) => `<li>${f}</li>`)
              .join("");
          } catch (e) {
            document.getElementById("modalFeat").innerHTML = "";
          }
        }

        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
      }
    });
  });

  // Modal eventi - gestione chiusura
  const modal = document.getElementById("eventoModal");
  if (modal) {
    modal.querySelectorAll("[data-close]").forEach((closeBtn) => {
      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      });
    });

    // Chiudi modal cliccando fuori
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
    });
  }
});

//GESTIONE QUANTITÀ BIGLIETTI

function incrementQuantity(bigliettoId) {
  const input = document.getElementById(`qty-${bigliettoId}`);
  if (!input) return;

  const currentValue = parseInt(input.value) || 1;
  const maxQuantity = parseInt(input.getAttribute("max")) || 5;

  if (currentValue < maxQuantity) {
    const newValue = currentValue + 1;
    input.value = newValue;

    // Aggiorna hidden input
    const hiddenInput = input
      .closest("form")
      ?.querySelector('input[name="quantita"]');
    if (hiddenInput) {
      hiddenInput.value = newValue;
    }

    // Aggiorna prezzo
    updateItemPrice(bigliettoId);
  }
}


function decrementQuantity(bigliettoId) {
  const input = document.getElementById(`qty-${bigliettoId}`);
  if (!input) return;

  const currentValue = parseInt(input.value) || 1;
  const minQuantity = parseInt(input.getAttribute("min")) || 1;

  if (currentValue > minQuantity) {
    const newValue = currentValue - 1;
    input.value = newValue;

    // Aggiorna hidden input
    const hiddenInput = input
      .closest("form")
      ?.querySelector('input[name="quantita"]');
    if (hiddenInput) {
      hiddenInput.value = newValue;
    }

    // Aggiorna prezzo
    updateItemPrice(bigliettoId);
  }
}


function updateItemPrice(bigliettoId) {
  try {
    const qtyInput = document.getElementById(`qty-${bigliettoId}`);
    const totalSpan = document.getElementById(`total-${bigliettoId}`);
    const priceInput = document.querySelector(
      `form[data-biglietto-id="${bigliettoId}"] input[name="prezzo"]`
    );

    // Verifica esistenza elementi
    if (!qtyInput || !totalSpan || !priceInput) return;

    const prezzoPulito = parseFloat(priceInput.value);
    const quantity = parseInt(qtyInput.value) || 1;

    if (!isNaN(prezzoPulito)) {
      const total = (prezzoPulito * quantity).toFixed(2);
      totalSpan.textContent = `€${total}`;

      // Feedback visivo (opzionale)
      totalSpan.classList.add("price-updated");
      setTimeout(() => totalSpan.classList.remove("price-updated"), 300);
    }
  } catch (error) {
    console.error(
      `Errore aggiornamento prezzo biglietto ${bigliettoId}:`,
      error
    );
  }
}

// Rendi disponibili globalmente
window.incrementQuantity = incrementQuantity;
window.decrementQuantity = decrementQuantity;
window.updateItemPrice = updateItemPrice;

//OVERRIDE DELLE FUNZIONI PER INCLUDERE AGGIORNAMENTO PREZZO
const originalIncrement = incrementQuantity;
const originalDecrement = decrementQuantity;

window.incrementQuantity = function (bigliettoId) {
  originalIncrement(bigliettoId);
  updateItemPrice(bigliettoId);
};

window.decrementQuantity = function (bigliettoId) {
  originalDecrement(bigliettoId);
  updateItemPrice(bigliettoId);
};

//SWIPER
document.addEventListener("DOMContentLoaded", function () {
  if (window.Swiper && document.querySelector(".mySwiper")) {
    new Swiper(".mySwiper", {
      speed: 1200,
      loop: true,
      autoplay: { delay: 3500, disableOnInteraction: false },
      slidesPerView: 1,
      spaceBetween: 10,
      pagination: { el: ".swiper-pagination", clickable: true },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      effect: "fade",
      fadeEffect: { crossFade: true },
    });
  }
});

// Smart scroll reveal - SOSTITUTO AOS
document.addEventListener("DOMContentLoaded", function () {
  const animatedElems = document.querySelectorAll(
    ".anim-slide-right, .anim-slide-left, .anim-fade-up, .anim-slide-up"
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    animatedElems.forEach((el) => observer.observe(el));
  } else {
    animatedElems.forEach((el) => el.classList.add("in-view"));
  }
});

// ===== AUTO-DISMISS MESSAGGI FLASH (TOAST) =====
document.addEventListener("DOMContentLoaded", () => {
  const alerts = document.querySelectorAll(".alert");

  alerts.forEach((alert) => {
    // Auto-dismiss dopo 5 secondi
    const dismissTimeout = setTimeout(() => {
      dismissAlert(alert);
    }, 5000);

    //Click per chiudere manualmente
    alert.style.cursor = "pointer";
    alert.title = "Clicca per chiudere";

    alert.addEventListener("click", () => {
      clearTimeout(dismissTimeout); // Cancella timeout se chiuso manualmente
      dismissAlert(alert);
    });

    //Aggiungi pulsante chiusura visibile (opzionale ma consigliato)
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.className = "alert-close-btn";
    closeBtn.setAttribute("aria-label", "Chiudi messaggio");
    closeBtn.style.cssText = `
      position: absolute;
      top: 50%;
      right: 1rem;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: inherit;
      font-size: 1.8rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s ease;
      padding: 0;
      width: 24px;
      height: 24px;
    `;

    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.opacity = "1";
    });

    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.opacity = "0.7";
    });

    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Evita doppio trigger
      clearTimeout(dismissTimeout);
      dismissAlert(alert);
    });

    // Posiziona il pulsante solo se l'alert non è già dismissable
    if (!alert.classList.contains("alert-dismissible")) {
      alert.style.position = "relative";
      alert.style.paddingRight = "3rem";
      alert.appendChild(closeBtn);
    }
  });
});


function dismissAlert(alert) {
  // Animazione fade-out
  alert.style.animation = "fadeOut 0.4s ease-out forwards";

  // Rimuovi elemento dal DOM dopo animazione
  setTimeout(() => {
    alert.remove();
  }, 400);
}

// === GESTIONE CARRELLO ===
// Previeni doppio submit sul form checkout
document.addEventListener("DOMContentLoaded", function () {
  const checkoutForm = document.querySelector('form[action="/carrello/checkout"]');
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function () {
      const btn = checkoutForm.querySelector("button[type=submit]");
      if (btn && !btn.disabled) {
        btn.disabled = true;
        btn.innerText = "Attendi...";
      }
    });
  }
});

// === GESTIONE EVENTI ===
// Conferma annullamento prenotazione
document.addEventListener("DOMContentLoaded", function () {
  const formAnnulla = document.querySelectorAll('form[action*="/eventi/"][action$="/annulla"]');
  formAnnulla.forEach(form => {
    form.addEventListener("submit", function (e) {
      if (!confirm('Sicuro di voler annullare la prenotazione?')) {
        e.preventDefault();
      }
    });
  });
});

// === GESTIONE EVENTO-FORM (ADMIN) ===
// Conferma eliminazione evento
document.addEventListener("DOMContentLoaded", function () {
  const formElimina = document.querySelector('form[action*="/eventi/"][action$="/elimina"]');
  if (formElimina) {
    const titoloEvento = formElimina.dataset.titoloEvento || "questo evento";
    formElimina.addEventListener("submit", function (e) {
      const conferma = confirm(
        `⚠️ SEI SICURO?\n\nQuesta azione eliminerà definitivamente l'evento:\n\n📌 ${titoloEvento}\n\n❌ Non sarà possibile recuperarlo!`
      );
      if (!conferma) {
        e.preventDefault();
      }
    });
  }
});

// === GESTIONE STAND ===
// Prenotazione stand con data-attributes
document.addEventListener("DOMContentLoaded", function () {
  const bottoniPrenota = document.querySelectorAll('[data-prenota-stand]');
  
  bottoniPrenota.forEach(btn => {
    btn.addEventListener('click', function() {
      const standId = this.dataset.standId;
      const nomeStand = this.dataset.standNome;
      const postiDisponibili = this.dataset.posti;
      
      // Conferma prenotazione
      const conferma = confirm(
        `🏪 Vuoi prenotare uno stand in "${nomeStand}"?\n\n` +
        `Posti disponibili: ${postiDisponibili}\n\n` +
        `Clicca OK per confermare.`
      );
      
      if (conferma) {
        const form = document.getElementById('prenotazioneForm');
        if (form) {
          document.getElementById('standIdHidden').value = standId;
          form.submit();
        }
      }
    });
  });
});

// === GESTIONE EVENTO-FORM - PREVIEW IMMAGINE ===
document.addEventListener("DOMContentLoaded", function () {
  const imgInput = document.getElementById('immagine');
  const imgPreview = document.getElementById('imgPreview');
  
  if (imgInput && imgPreview) {
    imgInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          imgPreview.src = e.target.result;
          imgPreview.dataset.hidden = 'false';
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Applica width dinamico per progress bar stand
  const occupazioneFills = document.querySelectorAll('.occupazione-fill[data-width]');
  occupazioneFills.forEach(fill => {
    fill.style.width = fill.dataset.width + '%';
  });
});
