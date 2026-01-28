//SERVE PER LE CARD EVENTO
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("eventoModal");
  if (!modal) return;

  const panel = modal.querySelector(".modal__panel");
  const img = document.getElementById("modalImg");
  const title = document.getElementById("modalTitle");
  const desc = document.getElementById("modalDesc");
  const feat = document.getElementById("modalFeat");
  const cta = document.getElementById("modalCta");

  let lastFocus = null;
  let closingTimer = null;

  const FOCUS_SEL =
    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

  function parseFeatures(str) {
    if (!str) return [];
    try {
      const v = JSON.parse(str);
      return Array.isArray(v) ? v : [];
    } catch {
      return String(str)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  function fillContent(card) {
    const t = card.dataset.title || "Evento";
    const d = card.dataset.desc || "";
    const s = card.dataset.img || "";
    const list = parseFeatures(card.dataset.features || "");

    title.textContent = t;
    desc.textContent = d;
    img.src = s;
    img.alt = t;

    feat.innerHTML = "";
    list.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      feat.appendChild(li);
    });

    const luogo = card.dataset.luogo;
    if (luogo) {
      const li = document.createElement("li");
      li.textContent = `📍 Luogo: ${luogo}`;
      feat.appendChild(li);
    }

    //Gestione pulsante in base alla prenotabilità
    const prenotabile = card.dataset.prenotabile === "1"; 
    const isLogged = document.body.dataset.user === "1"; 

    if (prenotabile) {
      if (isLogged) {
        cta.textContent = "Prenota / Partecipa";
        cta.setAttribute("href", `/eventi/${card.dataset.id}/prenota`);
        cta.classList.remove("disabled");
      } else {
        cta.textContent = "Login per prenotare";
        cta.setAttribute("href", "/login");
        cta.classList.remove("disabled");
      }
    } else {
      cta.textContent = "Accesso libero";
      cta.removeAttribute("href");
      cta.classList.add("disabled");
    }
  }

  function lockScroll() {
    document.body.classList.add("body-lock");
  }
  function unlockScroll() {
    document.body.classList.remove("body-lock");
  }

  function focusTrap(e) {
    if (e.key !== "Tab") return;
    const items = Array.from(modal.querySelectorAll(FOCUS_SEL)).filter(
      (el) => !el.hasAttribute("disabled")
    );
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function closeModal() {
    modal.removeEventListener("keydown", focusTrap);
    modal.classList.remove("is-open");
    unlockScroll();

    if (closingTimer) clearTimeout(closingTimer);
    closingTimer = setTimeout(() => {
      modal.style.display = "none";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }, 280); 
  }

  function openFromCard(card, clientX, clientY) {
    fillContent(card);
    lastFocus = document.activeElement;

    //Preparazione: mostra il modal invisibile per calcolare i bounds
    modal.style.display = "block";
    modal.classList.remove("is-open");
    lockScroll();

    //Calcolo origine animazione rispetto al pannello già visibile
    requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      const ox = rect.width ? ((clientX - rect.left) / rect.width) * 100 : 50;
      const oy = rect.height ? ((clientY - rect.top) / rect.height) * 100 : 50;
      panel.style.setProperty("--ox", `${Math.max(0, Math.min(100, ox))}%`);
      panel.style.setProperty("--oy", `${Math.max(0, Math.min(100, oy))}%`);

      const cardRect = card.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const modalHeight = Math.min(viewportHeight * 0.9, 600); // max altezza modal

      //Calcola la posizione Y ottimale
      let modalTop = cardRect.top + cardRect.height / 2 - modalHeight / 2;

      //Assicura che il modal non esca dal viewport
      const margin = 20; 
      modalTop = Math.max(
        margin,
        Math.min(modalTop, viewportHeight - modalHeight - margin)
      );

      //Applica la posizione al modal
      panel.style.position = "fixed";
      panel.style.top = `${modalTop}px`;
      panel.style.left = "50%";
      panel.style.transform = "translateX(-50%) scale(0.94)";
      panel.style.margin = "0";
      //Avvio animazione
      modal.classList.add("is-open");
      modal.addEventListener("keydown", focusTrap);
      //Focus iniziale
      const firstFocusable = modal.querySelector(FOCUS_SEL);
      (firstFocusable || panel).focus();
    });
  }

  //Delegazione click
  document.addEventListener("click", (e) => {
    //Apri da bottone Info
    const btn = e.target.closest(".btn-info");
    if (btn) {
      const card = btn.closest(".evento-card");
      if (!card) return;
      openFromCard(card, e.clientX, e.clientY);
      return;
    }

    //Chiudi: X o backdrop
    if (e.target.matches("[data-close]")) {
      closeModal();
      return;
    }
    //Chiudi cliccando fuori dal pannello
    if (e.target === modal) {
      closeModal();
    }
  });

  //ESC chiude
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
});
