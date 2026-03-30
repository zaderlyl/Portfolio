/**
 * CONFIGURATION & ÉTAT
 */
const ring = document.getElementById("ring");
const elements = Array.from(ring.children);
const titleDisplay = document.getElementById("category-title");
const overlay = document.getElementById("overlay");
const popup = document.getElementById("project-detail");

const sideTitle = document.getElementById("side-title");
const sideCategory = document.getElementById("side-category");
const sideYear = document.getElementById("side-year"); 
const progressBar = document.getElementById("progress-bar");

const total = elements.length;

// Rayon adaptatif selon la taille de l'écran
function getRadius() {
  return window.innerWidth < 600 ? 130 : window.innerWidth < 900 ? 190 : 260;
}
let radius = getRadius();
window.addEventListener("resize", () => { radius = getRadius(); positionCards(rotation); });

const SEUIL_CENTRE = 10;

let rotation = 0;
let selectedCard = null;
let snapTimeout = null;

/**
 * INITIALISATION & ARRIVÉE DEPUIS LA BIO
 */
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const fromBio = urlParams.get('from') === 'bio';
  const fromEtage2 = urlParams.get('from') === 'etage2'; // On détecte la provenance de l'étage 2

  if (fromBio || fromEtage2) {
    const tl = gsap.timeline();
    
    if (fromBio) {
      // --- ARRIVÉE DEPUIS LE HAUT (BIO) ---
      rotation = 1080; 
      gsap.set(ring, { y: -1200, rotationX: -80, opacity: 0, scale: 0.5 });
    } else if (fromEtage2) {
      // --- ARRIVÉE DEPUIS LE BAS (ÉTAGE 2) ---
      rotation = -1080; // Rotation inverse
      gsap.set(ring, { 
        y: 1200,        // Part du bas (sol)
        rotationX: 80,  // Inclinaison inverse
        opacity: 0, 
        scale: 0.5 
      });
    }

    // Animation commune pour revenir à la position normale
    tl.to(ring, {
      y: 0,
      rotationX: 0,
      opacity: 1,
      scale: 1,
      duration: 2.5,
      ease: "expo.out",
      clearProps: "all"
    });

    tl.to({ val: rotation }, {
      val: 0,
      duration: 2.5,
      ease: "expo.out",
      onUpdate: function() {
        rotation = this.targets()[0].val;
        positionCards(rotation);
      }
    }, "<");

  } else {
    positionCards(rotation);
  }

  setTimeout(() => {
    document.body.classList.add("loaded");
  }, 100);
});

/**
 * LOGIQUE DU RING (3D)
 */
function positionCards(rot) {
  const angleStep = 360 / total;
  let activeDivider = null;
  let closestEl = null;
  let minDistance = Infinity;

  elements.forEach((el, i) => {
    const angle = i * angleStep + rot;
    const rad = (angle * Math.PI) / 180;
    const x = radius * Math.sin(rad);
    const z = radius * Math.cos(rad);

    /** * 1. CALCUL DE PROFONDEUR (Factor)
     * factor = 1 quand la carte est devant (z = radius)
     * factor = 0 quand la carte est derrière (z = -radius)
     */
    const factor = (z + radius) / (2 * radius);

    /** * 2. EFFETS VISUELS (Gris et Opacité)
     */
    const gray = (1 - factor) * 100;      // 100% gris derrière, 0% devant
    const bright = 0.8 + (factor * 0.7); // 30% de lumière derrière, 100% devant
    const opacity = 0.5 + (factor * 0.5); // 50% d'opacité derrière, 100% devant

    el.style.filter = `grayscale(${gray}%) brightness(${bright})`;
    el.style.opacity = opacity;

    /** * 3. INCLINAISON (Axe X)
     * On utilise z pour décaler la hauteur (Y). 
     * Plus z est petit (derrière), plus translateY diminue (monte).
     */
    const tiltY = z * -0.2; // Ajuste 0.2 pour incliner plus ou moins

    el.dataset.angle = angle;
    if (x < 0) el.setAttribute("data-spine", "right");
    else el.removeAttribute("data-spine");

    const faceRotation = -x * 0.15;
    const rotationY = angle + faceRotation;

    // Application du transform avec le nouveau tiltY
    el.style.transform = `translateX(${x}px) translateZ(${z}px) translateY(calc(-50% - ${tiltY}px)) rotateY(${rotationY}deg)`;
    el.style.zIndex = Math.round(z);

    if (el.classList.contains("divider") && z > 0) {
      if (Math.abs(x) < SEUIL_CENTRE) activeDivider = el;
    }
    if (z > 0) {
      const dist = Math.abs(x);
      if (dist < minDistance) {
        minDistance = dist;
        closestEl = el;
      }
    }
  });
  

  if (activeDivider?.dataset.category) titleDisplay.textContent = activeDivider.dataset.category;

  if (closestEl && sideTitle) {
    const newTitle = closestEl.dataset.title || "—";
    const newYear = closestEl.dataset.year || "2026";
    const newCat = closestEl.classList.contains("divider") ? "Section" : "Projet";

    if (sideTitle.textContent !== newTitle) {
      sideTitle.style.opacity = "0";
      sideTitle.style.transform = "translateX(10px)";
      setTimeout(() => {
        sideTitle.textContent = newTitle;
        sideCategory.textContent = newCat;
        if (sideYear) sideYear.textContent = newYear;
        sideTitle.style.opacity = "1";
        sideTitle.style.transform = "translateX(0)";
      }, 250);
    }
    if (progressBar) {
      let progressPercent = ((rotation % 360) + 360) % 360;
      let invertedProgress = 100 - (progressPercent / 360) * 100;
      progressBar.style.width = `${invertedProgress}%`;
    }
  }
}



/**
 * NAVIGATION
 */
window.addEventListener("keydown", (e) => {
  if (selectedCard) return; 
  if (e.key === "ArrowDown") { hideScrollHint(); goToNextFloor(); }
  if (e.key === "ArrowUp") { hideScrollHint(); goToBeforeFloor(); }
  if (e.key === "Escape") closePopup();
});

window.addEventListener("wheel", (e) => {
  if (selectedCard) return;
  hideScrollHint();
  
  rotation += e.deltaY * 0.15;
  positionCards(rotation);

  // --- LOGIQUE DE CRANTAGE ---
  clearTimeout(snapTimeout); // On annule le snap précédent
  snapTimeout = setTimeout(() => {
    snapToClosest(); // On recale après 200ms d'inactivité
  }, 200);
}, { passive: true });

/**
 * NAVIGATION VERS LA BIO (FLÈCHE BAS)
 */
window.addEventListener("keydown", (e) => {
  if (selectedCard) return; 
  if (e.key === "ArrowDown") {
    goToBeforeFloor();
  }
  if (e.key === "ArrowUp") {
    goToNextFloor();
   }
});


/**
 * TOUCH SUPPORT (Mobile)
 */
let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let isTouching = false;
let touchVelocity = 0;
let lastTouchTime = 0;

window.addEventListener("touchstart", (e) => {
  if (selectedCard) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  lastTouchX = touch.clientX;
  touchVelocity = 0;
  lastTouchTime = performance.now();
  isTouching = true;
  clearTimeout(snapTimeout);
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (selectedCard || !isTouching) return;
  const touch = e.touches[0];
  const now = performance.now();
  const dt = now - lastTouchTime;

  // Détermine si le geste est plutôt horizontal (rotation) ou vertical (navigation)
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  // On laisse défiler verticalement seulement si l'angle est clairement vers le bas
  if (Math.abs(dy) > Math.abs(dx) * 2 && Math.abs(dy) > 30) return;

  const delta = touch.clientX - lastTouchX;
  touchVelocity = dt > 0 ? delta / dt : 0;

  rotation -= delta * 0.5; // Sensibilité du swipe
  positionCards(rotation);
  hideScrollHint();

  lastTouchX = touch.clientX;
  lastTouchTime = now;
}, { passive: true });

window.addEventListener("touchend", (e) => {
  if (!isTouching) return;
  isTouching = false;

  // Inertie après le lâcher
  let velocity = touchVelocity * 15;
  const decelerate = () => {
    if (Math.abs(velocity) < 0.3) {
      snapToClosest();
      return;
    }
    rotation -= velocity;
    velocity *= 0.88; // Friction
    positionCards(rotation);
    requestAnimationFrame(decelerate);
  };
  requestAnimationFrame(decelerate);
}, { passive: true });


/**
 * UTILS UX
 */
function hideScrollHint() {
  const hint = document.getElementById("scroll-hint");
  if (hint) {
    hint.style.opacity = "0";
    hint.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => hint.remove(), 800); // Supprime du code après l'animation
  }
}




function goToNextFloor() {
  if (document.body.classList.contains("transition-up")) return;
  
  document.body.style.pointerEvents = "none";
  document.body.classList.add("transition-up");

  // On accentue la rotation pour l'effet de vitesse (sens inverse pour la descente)
  const spinRotation = rotation + 1080; 

  const tl = gsap.timeline({
    onComplete: () => {
      // AJOUT : On passe le paramètre 'from=etage1' pour que l'étage 2 
      // sache qu'il doit aussi faire une animation spécifique
      window.location.href = "../Etage2/etage2.html?from=etage1";
    }
  });

  tl.to(ring, {
    y: -50, // Petit sursaut vers le haut avant de tomber
    duration: 0.3,
    ease: "power2.out"
  })
  .to({ val: rotation }, {
    val: spinRotation,
    duration: 1.6,
    ease: "expo.inOut",
    onUpdate: function() {
      rotation = this.targets()[0].val;
      positionCards(rotation);
    }
  }, "<")
  .to(ring, {
    y: 2500,        // DESCENTE : Valeur positive pour aller vers le bas
    rotationX: -90, // INCLINAISON : On bascule vers l'arrière
    opacity: 0,
    scale: 0.5,     // On réduit un peu moins pour garder l'effet de proximité au sol
    duration: 1.6,
    ease: "expo.in",
    force3D: true
  }, "<");
}

/**
 * POP-UP & ÉVÉNEMENTS
 */
function animateRotation(delta, duration, callback) {
  const start = rotation;
  const startTime = performance.now();
  function animate(t) {
    const progress = Math.min((t - startTime) / duration, 1);
    rotation = start + delta * (progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2);
    positionCards(rotation);
    if (progress < 1) requestAnimationFrame(animate);
    else callback?.();
  }
  requestAnimationFrame(animate);
}

function selectCard(card) {
  if (selectedCard) return;
  selectedCard = card;
  const currentAngle = parseFloat(card.dataset.angle);
  const delta = -currentAngle;
  animateRotation(delta, 500, () => { openPopup(card); });
}

function openPopup(card) {
  document.getElementById("project-img").src = card.dataset.img || "";
  document.getElementById("project-desc").textContent = card.dataset.desc || "";
  document.getElementById("project-title").textContent = card.dataset.title || "";
  overlay.style.opacity = "1";
  overlay.style.pointerEvents = "auto";
  popup.style.display = "block";
  setTimeout(() => { popup.classList.add("active"); }, 10);
}

function closePopup() {
  if (!selectedCard) return;
  popup.classList.remove("active");
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  setTimeout(() => { popup.style.display = "none"; selectedCard = null; }, 500);
}

elements.forEach((el) => {
  if (el.classList.contains("card")) el.addEventListener("click", () => selectCard(el));
});

window.addEventListener("wheel", (e) => {
  if (selectedCard) return;
  rotation += e.deltaY * 0.15;
  positionCards(rotation);
}, { passive: true });

overlay.addEventListener("click", closePopup);
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePopup(); });

const menuStack = document.querySelector(".menu-stack");
const menuToggle = document.getElementById("menu-toggle");
if (menuToggle && menuStack) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menuStack.classList.toggle("open");
  });
}
document.addEventListener("click", () => { if (menuStack) menuStack.classList.remove("open"); });

const homeLink = document.querySelector('a[data-label="Accueil"]');
if (homeLink) {
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.remove("loaded");
    setTimeout(() => { window.location.href = homeLink.href; }, 1200);
  });
}



function goToBeforeFloor() {
  if (document.body.classList.contains("transition-down")) return;
  
  document.body.style.pointerEvents = "none";
  document.body.classList.add("transition-down");

  // 1. On définit la rotation cible : 
  // On prend la rotation actuelle et on ajoute par exemple 3 tours complets (3 * 360)
  // pour créer cet effet de lancer au pavé tactile.
  const spinRotation = rotation - (-1080); 

  const tl = gsap.timeline({
    onComplete: () => {
      window.location.href = "../bio/bio.html";
    }
  });

  // On utilise un proxy (un objet vide) pour animer la variable 'rotation'
  // Cela permet de garder la logique de positionCards() active pendant l'envolée
  tl.to(ring, {
    y: -100,
    duration: 0.4,
    ease: "power2.out"
  })
  .to({ val: rotation }, {
    val: spinRotation,
    duration: 1.6,
    ease: "expo.inOut",
    onUpdate: function() {
      // À chaque frame de l'animation, on met à jour la rotation globale
      rotation = this.targets()[0].val;
      positionCards(rotation);
    }
  }, "<") // "<" signifie que cette animation démarre en même temps que l'envolée
  .to(ring, {
    y: -2500,
    rotationX: -110,
    opacity: 0,
    scale: 0.2,
    duration: 1.6,
    ease: "expo.in",
    force3D: true
  }, "<");
}

function snapToClosest() {
  const angleStep = 360 / total;
  
  // On calcule l'index de la carte qui est actuellement la plus proche du centre
  // (On utilise Math.round pour trouver le "cran" le plus proche)
  const closestIndex = Math.round(-rotation / angleStep);
  const targetRotation = -closestIndex * angleStep;

  // Animation fluide vers le cran avec GSAP
  gsap.to({ val: rotation }, {
    val: targetRotation,
    duration: 0.6,
    ease: "back.out(1.7)", // Un petit effet de rebond pour le côté mécanique
    onUpdate: function() {
      rotation = this.targets()[0].val;
      positionCards(rotation);
    }
  });
}
