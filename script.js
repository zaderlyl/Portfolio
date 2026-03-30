/**
 * SÉLECTEURS GÉNÉRAUX
 * On crée des raccourcis pour attraper les éléments HTML.
 */
const heroContent = document.querySelector('.hero-content'); // Ton texte et titre
const heroImage = document.querySelector('.hero-image-container'); // Le cadre de ta photo
const parallaxImg = document.querySelector('.parallax-img'); // L'image à l'intérieur du cadre
const nav = document.querySelector('nav'); // Ta barre de navigation
const exploreBtn = document.getElementById("explore-btn"); // Le bouton d'action

/**
 * 1. ANIMATION D'ENTRÉE
 * Comment les éléments arrivent sur l'écran au tout début.
 */
document.addEventListener('DOMContentLoaded', () => {
    // ÉTAPE A : Préparation invisible
    const elements = [heroImage, heroContent, nav];
    
    // On coupe les transitions pour placer les objets hors-champ instantanément
    elements.forEach(el => {
        if (el) el.style.transition = "none";
    });

    // On les "pousse" en dehors de l'écran (droite, gauche, haut)
    if (heroImage) heroImage.classList.add('exit-right');
    if (heroContent) heroContent.classList.add('exit-left');
    if (nav) nav.classList.add('exit-up');

    // Petite astuce technique : on force le navigateur à valider cette position cachée
    void document.body.offsetWidth; 

    // ÉTAPE B : Lancement de la chorégraphie
    setTimeout(() => {
        // On réactive les transitions pour que le mouvement soit fluide
        elements.forEach(el => {
            if (el) el.style.transition = ""; 
        });

        // On retire le flou d'arrière-plan
        document.body.classList.add('focus-bg'); 
        
        // On fait rentrer les éléments l'un après l'autre (effet cascade)
        if (heroImage) heroImage.classList.remove('exit-right'); // D'abord l'image
        
        setTimeout(() => {
            if (heroContent) heroContent.classList.remove('exit-left'); // Puis le texte
        }, 200);

        setTimeout(() => {
            if (nav) nav.classList.remove('exit-up'); // Enfin le menu
        }, 400);
    }, 100); 
});

/**
 * 2. EFFET PARALLAX
 * L'image bouge légèrement quand tu bouges ta souris.
 */
document.addEventListener("mousemove", (e) => {
    if (!parallaxImg) return;
    
    // On calcule la distance entre la souris et le centre de l'écran
    // On multiplie par 0.01 pour que le mouvement soit très subtil
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;

    // On applique le mouvement à l'image avec un léger zoom (scale 1.1)
    parallaxImg.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
});

/**
 * 3. LOGIQUE DE SORTIE (Clic sur Explorer)
 * Fait sortir les éléments avant de changer de page.
 */
if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
        // On remet les classes de sortie pour vider l'écran
        if (heroImage) heroImage.classList.add('exit-right');

        setTimeout(() => {
            if (heroContent) heroContent.classList.add('exit-left');
        }, 100);

        setTimeout(() => {
            if (nav) nav.classList.add('exit-up');
        }, 200);

        // On attend que les animations se terminent (800ms) avant de changer d'adresse
        setTimeout(() => {
            window.location.href = "/Etage1/etage1.html";
        }, 800);
    });
}

/**
 * 4. LOGIQUE D'IMMERSION (Entrer dans le Musée / Bio)
 * Une animation plus spectaculaire avec zoom et passage au blanc.
 */
function enterMuseum() {
    // 1. On empêche de cliquer partout pendant l'animation
    heroImage.style.pointerEvents = "none";
    if (exploreBtn) exploreBtn.style.pointerEvents = "none";

    // 2. On dégage le texte rapidement pour laisser place à l'image
    if (heroContent) {
        heroContent.style.transition = "transform 0.8s ease-in, opacity 0.6s ease-in";
        heroContent.classList.add('exit-left');
    }
    if (nav) {
        nav.style.transition = "transform 0.8s ease-in, opacity 0.6s ease-in";
        nav.classList.add('exit-up');
    }

    // 3. Effet d'évaporation : le fond devient blanc pur
    document.body.classList.add('evaporate-bg'); 
    document.body.style.backgroundColor = "#ffffff"; 

    // Zoom géant sur l'image pour donner l'impression de "rentrer" dedans
    if (heroImage) {
        heroImage.classList.add('zoom-in');
    }

    // 4. Une fois que l'écran est tout blanc (après 2s), on charge la page Bio
    setTimeout(() => {
        window.location.href = "/bio/bio.html";
    }, 2000); 
}


// --- LOGIQUE DU MENU STACK ---
const menuStack = document.querySelector(".menu-stack");
const menuToggle = document.getElementById("menu-toggle");

if (menuToggle && menuStack) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation(); // Évite que le clic ne soit capté par la scène 3D
    menuStack.classList.toggle("open");
  });
}

// Fermer le menu si on clique sur le fond ou ailleurs
document.addEventListener("click", () => {
  if (menuStack && menuStack.classList.contains("open")) {
    menuStack.classList.remove("open");
  }
});

// Empêcher la fermeture si on clique à l'intérieur du menu
menuStack.addEventListener("click", (e) => e.stopPropagation());
