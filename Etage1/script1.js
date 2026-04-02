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
const radius = 260;
const SEUIL_CENTRE = 10;

let rotation = 0;
let selectedCard = null;
let snapTimeout = null;

// --- ÉTAT DU CAROUSEL ---
let carouselImages = [];
let carouselIndex = 0;

/**
 * INITIALISATION & ARRIVÉE DEPUIS LA BIO
 */
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const fromBio = urlParams.get('from') === 'bio';
  const fromEtage2 = urlParams.get('from') === 'etage2';

  if (fromBio || fromEtage2) {
    const tl = gsap.timeline();

    if (fromBio) {
      rotation = 1080;
      gsap.set(ring, { y: -1200, rotationX: -80, opacity: 0, scale: 0.5 });
    } else if (fromEtage2) {
      rotation = -1080;
      gsap.set(ring, { y: 1200, rotationX: 80, opacity: 0, scale: 0.5 });
    }

    tl.to(ring, {
      y: 0, rotationX: 0, opacity: 1, scale: 1,
      duration: 2.5, ease: "expo.out", clearProps: "all"
    });

    tl.to({ val: rotation }, {
      val: 0, duration: 2.5, ease: "expo.out",
      onUpdate: function () {
        rotation = this.targets()[0].val;
        positionCards(rotation);
      }
    }, "<");

  } else {
    positionCards(rotation);
  }

  setTimeout(() => { document.body.classList.add("loaded"); }, 100);
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

    const factor = (z + radius) / (2 * radius);
    const gray = (1 - factor) * 100;
    const bright = 0.8 + (factor * 0.7);
    const opacity = 0.5 + (factor * 0.5);

    el.style.filter = `grayscale(${gray}%) brightness(${bright})`;
    el.style.opacity = opacity;

    const tiltY = z * -0.2;
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
      if (dist < minDistance) { minDistance = dist; closestEl = el; }
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
 * CAROUSEL
 */
function buildCarousel(images) {
  const track = document.getElementById("carousel-track");
  const dotsContainer = document.getElementById("carousel-dots");
  const counter = document.getElementById("carousel-counter");
  const btnPrev = document.getElementById("carousel-prev");
  const btnNext = document.getElementById("carousel-next");

  carouselImages = images;
  carouselIndex = 0;

  track.innerHTML = "";
  dotsContainer.innerHTML = "";

  images.forEach((src, i) => {
    const slide = document.createElement("div");
    slide.className = "carousel-slide";
    const img = document.createElement("img");
    img.src = src.trim();
    img.alt = `Image ${i + 1}`;
    slide.appendChild(img);
    track.appendChild(slide);
  });

  if (images.length > 1) {
    images.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "carousel-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", `Image ${i + 1}`);
      dot.addEventListener("click", () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
  }

  const showArrows = images.length > 1;
  btnPrev.style.display = showArrows ? "flex" : "none";
  btnNext.style.display = showArrows ? "flex" : "none";
  dotsContainer.style.display = showArrows ? "flex" : "none";
  counter.style.display = showArrows ? "block" : "none";

  updateCarousel();
}

function goToSlide(index) {
  carouselIndex = (index + carouselImages.length) % carouselImages.length;
  updateCarousel();
}

function updateCarousel() {
  const track = document.getElementById("carousel-track");
  const dotsContainer = document.getElementById("carousel-dots");
  const counter = document.getElementById("carousel-counter");

  track.style.transform = `translateX(-${carouselIndex * 100}%)`;

  const dots = dotsContainer.querySelectorAll(".carousel-dot");
  dots.forEach((dot, i) => dot.classList.toggle("active", i === carouselIndex));
  counter.textContent = `${carouselIndex + 1} / ${carouselImages.length}`;
}

document.getElementById("carousel-prev").addEventListener("click", () => goToSlide(carouselIndex - 1));
document.getElementById("carousel-next").addEventListener("click", () => goToSlide(carouselIndex + 1));

window.addEventListener("keydown", (e) => {
  if (!selectedCard) return;
  if (e.key === "ArrowLeft") goToSlide(carouselIndex - 1);
  if (e.key === "ArrowRight") goToSlide(carouselIndex + 1);
});

(function () {
  let touchStartX = 0;
  const carousel = document.getElementById("carousel");
  carousel.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener("touchend", (e) => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) goToSlide(carouselIndex + (delta > 0 ? 1 : -1));
  }, { passive: true });
})();

/**
 * ADAPTATION TYPOGRAPHIQUE
 * Titre  : réduction fluide par paliers selon le nombre de caractères
 * Desc   : scroll discret + fondu bas si le texte dépasse la zone
 */
function adaptTextSize(titleEl, descEl) {
  // --- TITRE ---
  const len = titleEl.textContent.length;
  let size;
  if      (len <= 20) size = "1.8rem";
  else if (len <= 35) size = "1.45rem";
  else if (len <= 50) size = "1.15rem";
  else                size = "0.95rem";
  titleEl.style.fontSize = size;
  // Transition fluide côté CSS
  titleEl.style.transition = "font-size 0.3s ease";

  // --- DESCRIPTION ---
  const descLen = descEl.textContent.length;
  descEl.style.fontSize = descLen > 280 ? "0.85rem" : "0.95rem";
  descEl.scrollTop = 0;

  // Affiche/masque le fondu bas selon l'overflow réel
  const wrapper = descEl.closest(".desc-wrapper");
  if (wrapper) {
    const refresh = () => {
      const overflow = descEl.scrollHeight > descEl.clientHeight + 2;
      const atBottom = descEl.scrollTop + descEl.clientHeight >= descEl.scrollHeight - 4;
      wrapper.classList.toggle("has-overflow", overflow && !atBottom);
    };
    descEl.removeEventListener("scroll", refresh);
    descEl.addEventListener("scroll", refresh);
    setTimeout(refresh, 60); // laisse le DOM se stabiliser
  }
}

/**
 * NAVIGATION
 */
window.addEventListener("keydown", (e) => {
  if (selectedCard) return;
  if (e.key === "ArrowDown") { hideScrollHint(); goToNextFloor(); }
  if (e.key === "ArrowUp")   { hideScrollHint(); goToBeforeFloor(); }
  if (e.key === "Escape")    closePopup();
});

window.addEventListener("wheel", (e) => {
  if (selectedCard) return;
  hideScrollHint();
  rotation += e.deltaY * 0.15;
  positionCards(rotation);
  clearTimeout(snapTimeout);
  snapTimeout = setTimeout(() => { snapToClosest(); }, 200);
}, { passive: true });

/**
 * UTILS UX
 */
function hideScrollHint() {
  const hint = document.getElementById("scroll-hint");
  if (hint) {
    hint.style.opacity = "0";
    hint.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => hint.remove(), 800);
  }
}

function goToNextFloor() {
  if (document.body.classList.contains("transition-up")) return;
  document.body.style.pointerEvents = "none";
  document.body.classList.add("transition-up");
  const spinRotation = rotation + 1080;
  const tl = gsap.timeline({ onComplete: () => { window.location.href = "../Etage2/etage2.html?from=etage1"; } });
  tl.to(ring, { y: -50, duration: 0.3, ease: "power2.out" })
    .to({ val: rotation }, { val: spinRotation, duration: 1.6, ease: "expo.inOut",
      onUpdate: function () { rotation = this.targets()[0].val; positionCards(rotation); } }, "<")
    .to(ring, { y: 2500, rotationX: -90, opacity: 0, scale: 0.5, duration: 1.6, ease: "expo.in", force3D: true }, "<");
}

/**
 * POP-UP & ÉVÉNEMENTS
 */
function animateRotation(delta, duration, callback) {
  const start = rotation;
  const startTime = performance.now();
  function animate(t) {
    const progress = Math.min((t - startTime) / duration, 1);
    rotation = start + delta * (progress < 0.5
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
  animateRotation(-currentAngle, 500, () => { openPopup(card); });
}

function openPopup(card) {
  const rawImgs = card.dataset.img || "";
  const images = rawImgs.split(",").map(s => s.trim()).filter(Boolean);
  buildCarousel(images.length > 0 ? images : [""]);

  const titleEl = document.getElementById("project-title");
  const descEl  = document.getElementById("project-desc");

  titleEl.textContent = card.dataset.title || "";
  descEl.textContent  = card.dataset.desc  || "";

  // Adapter les tailles après injection du contenu
  adaptTextSize(titleEl, descEl);

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

overlay.addEventListener("click", closePopup);

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
  const spinRotation = rotation - (-1080);
  const tl = gsap.timeline({ onComplete: () => { window.location.href = "../bio/bio.html"; } });
  tl.to(ring, { y: -100, duration: 0.4, ease: "power2.out" })
    .to({ val: rotation }, { val: spinRotation, duration: 1.6, ease: "expo.inOut",
      onUpdate: function () { rotation = this.targets()[0].val; positionCards(rotation); } }, "<")
    .to(ring, { y: -2500, rotationX: -110, opacity: 0, scale: 0.2, duration: 1.6, ease: "expo.in", force3D: true }, "<");
}

function snapToClosest() {
  const angleStep = 360 / total;
  const closestIndex = Math.round(-rotation / angleStep);
  const targetRotation = -closestIndex * angleStep;
  gsap.to({ val: rotation }, {
    val: targetRotation, duration: 0.6, ease: "back.out(1.7)",
    onUpdate: function () { rotation = this.targets()[0].val; positionCards(rotation); }
  });
}
