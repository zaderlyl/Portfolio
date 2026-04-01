/**
config
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
const radius = 260;
const SEUIL_CENTRE = 10;

let rotation = 0;
let selectedCard = null;

/**
arrivé etage 1
*/
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const frometage1 = urlParams.get("from") === "etage1";

  if (frometage1) {
    rotation = 1080;

    gsap.set(ring, {
      y: -1500,        
      rotationX: 80,   
      opacity: 0,
      scale: 0.8,
    });

    const tl = gsap.timeline();

    tl.to(ring, {
      y: 0,
      rotationX: 0,
      opacity: 1,
      scale: 1,
      duration: 2.2,
      ease: "power4.out", 
      clearProps: "all",
    });

    tl.to(
      { val: rotation },
      {
        val: 0,
        duration: 2.2,
        ease: "power4.out",
        onUpdate: function () {
          rotation = this.targets()[0].val;
          positionCards(rotation);
        },
      },
      "<" 
    );
  } else {
    positionCards(rotation);
  }

  setTimeout(() => {
    document.body.classList.add("loaded");
  }, 100);
});

/**
ring et logique
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

    const factor = (z + radius) / (2 * radius);

    const gray = (1 - factor) * 100; 
    const bright = 0.8 + factor * 0.7; 
    const opacity = 0.5 + factor * 0.5; 

    el.style.filter = `grayscale(${gray}%) brightness(${bright})`;
    el.style.opacity = opacity;

    const tiltY = z * -0.2; // Ajuste 0.2 pour incliner plus ou moins

    el.dataset.angle = angle;
    if (x < 0) el.setAttribute("data-spine", "right");
    else el.removeAttribute("data-spine");

    const faceRotation = -x * 0.15;
    const rotationY = angle + faceRotation;

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

  if (activeDivider?.dataset.category)
    titleDisplay.textContent = activeDivider.dataset.category;

  if (closestEl && sideTitle) {
    const newTitle = closestEl.dataset.title || "—";
    const newYear = closestEl.dataset.year || "2026";
    const newCat = closestEl.classList.contains("divider")
      ? "Section"
      : "Projet";

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
nav
*/

window.addEventListener("keydown", (e) => {
  if (selectedCard) return;
  if (e.key === "ArrowDown") {
    hideScrollHint();
    goToNextFloor();
  }
  if (e.key === "ArrowUp") {
    hideScrollHint();
    goToBeforeFloor();
  }
  if (e.key === "Escape") closePopup();
});
window.addEventListener(
  "wheel",
  (e) => {
    if (selectedCard) return;
    hideScrollHint(); 
    rotation += e.deltaY * 0.15;
    positionCards(rotation);
  },
  { passive: true },
);
window.addEventListener("keydown", (e) => {
  if (selectedCard) return;
  if (e.key === "ArrowDown") {
    goToBeforeFloor();
    }
});


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

  const spinRotation = rotation - 1080;

  const tl = gsap.timeline({
    onComplete: () => {
      window.location.href = "../Etage3/etage3.html";
    },
  });

  tl.to(ring, {
    y: 100,
    duration: 0.4,
    ease: "power2.out",
  })
    .to(
      { val: rotation },
      {
        val: spinRotation,
        duration: 1.6,
        ease: "expo.inOut",
        onUpdate: function () {
          rotation = this.targets()[0].val;
          positionCards(rotation);
        },
      },
      "<",
    ) 
    .to(
      ring,
      {
        y: -2500,
        rotationX: 110,
        opacity: 0,
        scale: 0.2,
        duration: 1.6,
        ease: "expo.in",
        force3D: true,
      },
      "<",
    );
}

/**
affichage projet
*/
function animateRotation(delta, duration, callback) {
  const start = rotation;
  const startTime = performance.now();
  function animate(t) {
    const progress = Math.min((t - startTime) / duration, 1);
    rotation =
      start +
      delta *
        (progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2);
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
  animateRotation(delta, 500, () => {
    openPopup(card);
  });
}

function openPopup(card) {
  document.getElementById("project-img").src = card.dataset.img || "";
  document.getElementById("project-desc").textContent = card.dataset.desc || "";
  document.getElementById("project-title").textContent =
    card.dataset.title || "";
  overlay.style.opacity = "1";
  overlay.style.pointerEvents = "auto";
  popup.style.display = "block";
  setTimeout(() => {
    popup.classList.add("active");
  }, 10);
}

function closePopup() {
  if (!selectedCard) return;
  popup.classList.remove("active");
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  setTimeout(() => {
    popup.style.display = "none";
    selectedCard = null;
  }, 500);
}

elements.forEach((el) => {
  if (el.classList.contains("card"))
    el.addEventListener("click", () => selectCard(el));
});

window.addEventListener(
  "wheel",
  (e) => {
    if (selectedCard) return;
    rotation += e.deltaY * 0.15;
    positionCards(rotation);
  },
  { passive: true },
);

overlay.addEventListener("click", closePopup);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePopup();
});

const menuStack = document.querySelector(".menu-stack");
const menuToggle = document.getElementById("menu-toggle");
if (menuToggle && menuStack) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menuStack.classList.toggle("open");
  });
}
document.addEventListener("click", () => {
  if (menuStack) menuStack.classList.remove("open");
});

const homeLink = document.querySelector('a[data-label="Accueil"]');
if (homeLink) {
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.remove("loaded");
    setTimeout(() => {
      window.location.href = homeLink.href;
    }, 1200);
  });
}

function goToBeforeFloor() {
  if (document.body.classList.contains("transition-down")) return;

  document.body.style.pointerEvents = "none";
  document.body.classList.add("transition-down");

  const spinRotation = rotation - -1080;

  const tl = gsap.timeline({
    onComplete: () => {
      window.location.href = "../Etage1/etage1.html?from=etage2";
    },
  });

  tl.to(ring, {
    y: -100,
    duration: 0.4,
    ease: "power2.out",
  })
    .to(
      { val: rotation },
      {
        val: spinRotation,
        duration: 1.6,
        ease: "expo.inOut",
        onUpdate: function () {
          rotation = this.targets()[0].val;
          positionCards(rotation);
        },
      },
      "<",
    ) 
    .to(
      ring,
      {
        y: -2500,
        rotationX: -110,
        opacity: 0,
        scale: 0.2,
        duration: 1.6,
        ease: "expo.in",
        force3D: true,
      },
      "<",
    );
}
