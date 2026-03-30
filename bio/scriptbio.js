import * as THREE from "three";

// --- 1. CONFIGURATION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedPedestal = null;
let hoveredObject = null;
const tooltip = document.querySelector("#tooltip");
const bioInfoDiv = document.querySelector("#bio-info");
const filterMenu = document.querySelector("#skills-filter");
const contactPanel = document.querySelector("#contact-panel");
const sideTabs = document.querySelectorAll(".side-tab");
const formSide = document.querySelector("#contact-form-side");
const socialSide = document.querySelector("#contact-social-side");

// --- SHADER HOLOGRAPHIQUE ---
const holoShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uColorAccent: { value: new THREE.Color(0x8d775f) },
  },
  vertexShader: `
    varying vec2 vUv;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.z += sin(pos.y * 2.0 + uTime) * 0.03; 
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3 uColorAccent;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      float scanline = sin(vUv.y * 800.0) * 0.03 + 0.97;
      float beam = smoothstep(0.1, 0.0, abs(fract(vUv.y * 0.5 - uTime * 0.1) - 0.5)) * 0.05;
      float dist = distance(vUv, vec2(0.5));
      float vignette = smoothstep(0.7, 0.3, dist);
      float flicker = sin(uTime * 100.0) * 0.02 + 0.98;
      vec3 finalColor = mix(tex.rgb, uColorAccent, 0.15) + beam;
      float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
      float alpha = tex.a * (0.8 + luma * 0.2) * vignette * flicker;
      gl_FragColor = vec4(finalColor * scanline, alpha);
    }
  `,
};

// --- 2. SCÈNE & RENDU ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeae4);
scene.fog = new THREE.Fog(0xeeeae4, 10, 30);
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 3, 15);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#bg"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- 3. AUDIO ---
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();
const soundAmbiance = new THREE.Audio(listener);
const clickSound = new THREE.Audio(listener);
const backSound = new THREE.Audio(listener);

audioLoader.load("ambiance.mp3", (b) => {
  soundAmbiance.setBuffer(b);
  soundAmbiance.setLoop(true);
  soundAmbiance.setVolume(0.2);
});
audioLoader.load("./avancer.mp3", (b) => {
  clickSound.setBuffer(b);
  clickSound.setVolume(0.3);
});
audioLoader.load("./reculer.mp3", (b) => {
  backSound.setBuffer(b);
  backSound.setVolume(0.3);
});

window.addEventListener(
  "click",
  () => {
    if (!soundAmbiance.isPlaying) soundAmbiance.play();
  },
  { once: true },
);

// --- 4. LUMIÈRES & SOL ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xeeeae4, 0.8);
scene.add(hemiLight);
function createSoftLight(x, z) {
  const light = new THREE.PointLight(0xffffff, 15, 20);
  light.position.set(x, 5, z);
  scene.add(light);
  return light;
}
const lights = [
  createSoftLight(0, -4),
  createSoftLight(-7, -1),
  createSoftLight(7, -1),
];

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0xeeeae4, roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.5;
scene.add(floor);

// --- 5. FONCTIONS DE CRÉATION ---

function glitchHologram() {
  if (
    !centralHologram ||
    !centralHologram.visible ||
    selectedPedestal !== pCenter
  )
    return;
  const tl = gsap.timeline({
    onComplete: () => {
      if (selectedPedestal === pCenter)
        setTimeout(glitchHologram, Math.random() * 5000 + 3000);
    },
  });
  for (let i = 0; i < 4; i++) {
    tl.to(centralHologram.material, { opacity: 0.1, duration: 0.03 });
    tl.to(centralHologram.material, { opacity: 0.8, duration: 0.03 });
    tl.to(centralHologram.material, {
      opacity: 0,
      duration: 0.05 + Math.random() * 0.1,
    });
  }
  tl.to(centralHologram.material.uniforms.uColorAccent.value, {
    r: 1,
    g: 1,
    b: 1,
    duration: 0.02,
  });
  tl.to(centralHologram.material, { opacity: 1, duration: 0.03 });
  tl.to(centralHologram.scale, {
    x: 1.05,
    y: 1.05,
    z: 1.05,
    duration: 0.05,
    ease: "power2.out",
  });
  tl.to(centralHologram.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: 0.2,
    ease: "back.out(2)",
  });
  tl.to(centralHologram.material.uniforms.uColorAccent.value, {
    r: 0.55,
    g: 0.46,
    b: 0.37,
    duration: 0.4,
  });
}

function createHologram(texture) {
  const geometry = new THREE.PlaneGeometry(2.5, 3);
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(holoShader.uniforms),
    vertexShader: holoShader.vertexShader,
    fragmentShader: holoShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
  material.uniforms.tDiffuse.value = texture;
  const hologram = new THREE.Mesh(geometry, material);
  hologram.position.set(1.5, 3.2, 0);
  return hologram;
}

function createWordSprite(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 128;
  context.font = "Bold 60px Georgia";
  context.fillStyle = "#8d775f";
  context.textAlign = "center";
  context.fillText(text, 256, 80);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  return sprite;
}

function createWordCloud(words, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 3, z);
  group.visible = false;
  group.scale.set(0.1, 0.1, 0.1);
  words.forEach((skill) => {
    const sprite = createWordSprite(skill.name);
    sprite.position.set(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 3,
    );
    sprite.userData = {
      orbitSpeed: 0.005 + Math.random() * 0.01,
      radius: 1.5 + Math.random(),
      phi: Math.random() * Math.PI * 2,
      category: skill.cat,
    };
    group.add(sprite);
  });
  scene.add(group);
  return group;
}

function createMinimalPedestal(title, words, x, z) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 4, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }),
  );
  mesh.position.y = -0.5;
  group.add(mesh);
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.05, 1.52),
    new THREE.MeshStandardMaterial({ color: 0x8d775f }),
  );
  line.position.y = -2.48;
  group.add(line);
  
  group.position.set(x, -5, z); // Position initiale pour l'animation
  group.userData = {
    title: title,
    cloud: words ? createWordCloud(words, x, z) : null,
  };
  
  return group;
}

// --- 6. INITIALISATION ---
const textureLoader = new THREE.TextureLoader();
let centralHologram = null;

// Liste des skills avec catégories
const skillsData = [
  { name: "Wordpress", cat: "log" },
  { name: "SolidWorks", cat: "log" },
  { name: "Excel", cat: "log" },
  { name: "Photoshop", cat: "log" },
  { name: "Illustrator", cat: "log" },
  { name: "VSCode", cat: "log" },
  { name: "Notpad++", cat: "log" },
  { name: "Canva", cat: "log" },
  { name: "DaVinci", cat: "log" },
  { name: "Python", cat: "lang" },
  { name: "JavaScript", cat: "lang" },
  { name: "HTML", cat: "lang" },
  { name: "CSS", cat: "lang" },
  { name: "PHP", cat: "lang" },
  { name: "Ruby", cat: "lang" },
  { name: "Arduino", cat: "lang" },
  { name: "JSON", cat: "lang" },
  { name: "BASH", cat: "lang" },
  { name: "Three.js", cat: "lang" },
  { name: "...", cat: "oth" },
];

const pCenter = createMinimalPedestal("Biographie", null, 0, -4);
const pLeft = createMinimalPedestal("Skills", skillsData, -7, -1);
const pRight = createMinimalPedestal("Contact", null, 7, -1);
const pedestals = [pCenter, pLeft, pRight];
scene.add(...pedestals);

textureLoader.load("../image/moi.jpg", (texture) => {
  centralHologram = createHologram(texture);
  centralHologram.visible = false;
  pCenter.add(centralHologram);
});

// Animation d'entrée : flou + levée des piliers
window.addEventListener("DOMContentLoaded", () => {
  const blurOverlay = document.querySelector("#entrance-blur");

  if (blurOverlay) {
    gsap.to(blurOverlay, {
      opacity: 0,
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: function () {
        const progress = 1 - this.progress();
        blurOverlay.style.backdropFilter = `blur(${progress * 50}px)`;
      },
      onComplete: () => {
        blurOverlay.style.display = "none";
      },
    });
  }

  gsap.to(
    pedestals.map((p) => p.position),
    {
      y: 0,
      duration: 1.8,
      stagger: 0.2,
      ease: "power3.out",
      delay: 0.5,
    },
  );
});

// --- 7. LOGIQUE DE FILTRAGE ---
window.filterSkills = function (category) {
  if (!selectedPedestal || !selectedPedestal.userData.cloud) return;
  const cloud = selectedPedestal.userData.cloud;
  cloud.children.forEach((sprite) => {
    const isMatch = category === "all" || sprite.userData.category === category;
    if (isMatch) {
      sprite.visible = true;
      gsap.to(sprite.material, { opacity: 1, duration: 0.5 });
      gsap.to(sprite.scale, { x: 2, y: 0.5, z: 1, duration: 0.5 });
    } else {
      gsap.to(sprite.material, { opacity: 0, duration: 0.5 });
      gsap.to(sprite.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.5,
        onComplete: () => {
          if (!isMatch) sprite.visible = false;
        },
      });
    }
  });
};

// --- 8. INTERACTIONS ---
window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  if (selectedPedestal) return;
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(pedestals, true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj.parent && !pedestals.includes(obj)) obj = obj.parent;
    if (hoveredObject !== obj) {
      if (hoveredObject)
        gsap.to(hoveredObject.position, { y: 0, duration: 0.3 });
      hoveredObject = obj;
      gsap.to(obj.position, { y: -0.2, duration: 0.3 });
    }
    tooltip.style.opacity = "1";
    tooltip.innerHTML = obj.userData.title;
    document.body.style.cursor = "pointer";
  } else {
    if (hoveredObject) gsap.to(hoveredObject.position, { y: 0, duration: 0.3 });
    hoveredObject = null;
    tooltip.style.opacity = "0";
    document.body.style.cursor = "default";
  }
});

window.addEventListener("click", () => {
  if (selectedPedestal || !hoveredObject) return;
  focusOn(hoveredObject);
});

function focusOn(target) {
  selectedPedestal = target;
  if (clickSound && clickSound.buffer) clickSound.play();
  tooltip.style.opacity = "0";

  const xCameraOffset = target === pCenter ? -1.8 : 0;

  pedestals.forEach((p, i) => {
    if (p !== target) {
      gsap.to(p.position, { y: -8, duration: 1.2, ease: "power2.inOut" });
      gsap.to(lights[i], { intensity: 0, duration: 0.5 });
    } else {
      gsap.to(p.position, { y: -0.2, duration: 1.8, ease: "power3.inOut" });

      // CAS 1 : BIOGRAPHIE
      if (p === pCenter && centralHologram) {
        gsap.killTweensOf(centralHologram.scale);
        centralHologram.visible = true;
        centralHologram.position.x = 0;
        centralHologram.scale.set(0, 0, 0);

        gsap.to(centralHologram.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.2,
          ease: "back.out(1.7)",
          delay: 0.5,
          onComplete: glitchHologram,
        });

        if (bioInfoDiv) {
          setTimeout(() => {
            bioInfoDiv.classList.add("visible");
          }, 800);
        }
      }
      // CAS 2 : CONTACT
      else if (p === pRight) {
        if (contactPanel) {
          setTimeout(() => {
            contactPanel.classList.add("visible");
          }, 800);
        }
      }
      // CAS 3 : SKILLS
      else if (p.userData.cloud) {
        const cloud = p.userData.cloud;
        cloud.visible = true;

        cloud.children.forEach((s) => {
          s.visible = true;
          s.material.opacity = 0;
          s.scale.set(2, 0.5, 1);
        });

        gsap.to(cloud.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.5,
          ease: "elastic.out(1, 0.5)",
          delay: 0.5,
        });

        cloud.children.forEach((s) =>
          gsap.to(s.material, { opacity: 1, duration: 1, delay: 0.6 }),
        );

        if (filterMenu) {
          filterMenu.style.display = "flex";
          gsap.fromTo(
            filterMenu,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, delay: 1 },
          );
        }
      }
    }
  });

  gsap.to(camera.position, {
    x: target.position.x + xCameraOffset,
    y: 3,
    z: target.position.z + 5,
    duration: 1.8,
    ease: "power3.inOut",
  });
}

function resetView() {
  if (!selectedPedestal) return;
  if (backSound && backSound.buffer) backSound.play();

  if (bioInfoDiv) {
    bioInfoDiv.classList.remove("visible");
  }

  if (filterMenu) {
    gsap.to(filterMenu, {
      opacity: 0,
      y: 20,
      duration: 0.3,
      onComplete: () => {
        filterMenu.style.display = "none";
      },
    });
  }

  if (contactPanel) {
    contactPanel.classList.remove("visible");

    setTimeout(() => {
      formSide.classList.add("active");
      socialSide.classList.remove("active");
    }, 500);
  }

  if (selectedPedestal === pCenter && centralHologram) {
    gsap.killTweensOf(centralHologram.scale);
    gsap.to(centralHologram.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.5,
      onComplete: () => {
        centralHologram.visible = false;
        centralHologram.position.x = 0;
      },
    });
  }

  if (selectedPedestal.userData.cloud) {
    const cloud = selectedPedestal.userData.cloud;
    gsap.to(cloud.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5 });
    cloud.children.forEach((sprite) =>
      gsap.to(sprite.material, { opacity: 0, duration: 0.4 }),
    );
    setTimeout(() => {
      cloud.visible = false;
    }, 500);
  }

  pedestals.forEach((p, i) => {
    const oX = p === pCenter ? 0 : p === pLeft ? -7 : 7;
    const oZ = p === pCenter ? -4 : -1;
    gsap.to(p.position, {
      x: oX,
      y: 0,
      z: oZ,
      duration: 1.2,
      ease: "power2.out",
    });
    gsap.to(lights[i], { intensity: 15, duration: 1 });
  });

  gsap.to(camera.position, {
    x: 0,
    y: 3,
    z: 15,
    duration: 1.5,
    ease: "power3.inOut",
  });

  selectedPedestal = null;
}

// --- 9. NAVIGATION CLAVIER ---
function navigateTo(direction) {
  if (!selectedPedestal) {
    focusOn(pCenter);
    return;
  }
  const currentIndex = pedestals.indexOf(selectedPedestal);
  let nextIndex =
    direction === "next"
      ? (currentIndex + 1) % pedestals.length
      : (currentIndex - 1 + pedestals.length) % pedestals.length;

  if (selectedPedestal === pCenter && centralHologram) {
    gsap.to(centralHologram.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.5,
      onComplete: () => {
        centralHologram.visible = false;
      },
    });
  }
  if (selectedPedestal.userData.cloud) {
    const cloud = selectedPedestal.userData.cloud;
    gsap.to(cloud.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5 });
    cloud.children.forEach((s) =>
      gsap.to(s.material, { opacity: 0, duration: 0.4 }),
    );
    setTimeout(() => {
      cloud.visible = false;
    }, 500);
  }
  if (bioInfoDiv) bioInfoDiv.classList.remove("visible");
  if (contactPanel) contactPanel.classList.remove("visible");
  if (filterMenu) {
    gsap.to(filterMenu, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => (filterMenu.style.display = "none"),
    });
  }

  focusOn(pedestals[nextIndex]);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") resetView();
  if (e.key === "ArrowLeft") navigateTo("prev");
  if (e.key === "ArrowRight") navigateTo("next");
  
  if (e.key === "ArrowUp" && !selectedPedestal) {
    leaveBioToEtage1();
  }
});

function leaveBioToEtage1() {
  document.body.style.pointerEvents = "none";

  gsap.to(
    pedestals.map((p) => p.position),
    {
      y: -5,
      duration: 1.2,
      stagger: 0.1,
      ease: "power3.in",
      onComplete: () => {
        const blurOverlay = document.querySelector("#entrance-blur");
        if (blurOverlay) {
          blurOverlay.style.display = "block";
          gsap.to(blurOverlay, {
            opacity: 1,
            duration: 0.6,
            onComplete: () => {
              window.location.href = "../Etage1/etage1.html?from=bio";
            },
          });
        } else {
          window.location.href = "../Etage1/etage1.html?from=bio";
        }
      },
    },
  );

  if (backSound && backSound.buffer) backSound.play();
}

// --- 10. ANIMATION LOOP ---
function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() * 0.001;
  if (centralHologram && centralHologram.visible) {
    centralHologram.material.uniforms.uTime.value = time;
    centralHologram.position.y = 3.2 + Math.sin(time * 1.2) * 0.05;
  }
  pedestals.forEach((p) => {
    const cloud = p.userData.cloud;
    if (cloud && cloud.visible) {
      cloud.children.forEach((sprite, i) => {
        const data = sprite.userData;
        sprite.position.x =
          Math.cos(time * data.orbitSpeed + data.phi) * data.radius;
        sprite.position.z =
          Math.sin(time * data.orbitSpeed + data.phi) * data.radius;
        sprite.position.y += Math.sin(time + i) * 0.002;
      });
      cloud.rotation.y += 0.001;
    }
  });
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- LOGIQUE DU MENU STACK ---
const menuStack = document.querySelector(".menu-stack");
const menuToggle = document.getElementById("menu-toggle");

if (menuToggle && menuStack) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menuStack.classList.toggle("open");
  });
}

document.addEventListener("click", () => {
  if (menuStack && menuStack.classList.contains("open")) {
    menuStack.classList.remove("open");
  }
});

if (menuStack) {
  menuStack.addEventListener("click", (e) => e.stopPropagation());
}

// --- NAVIGATION ONGLETS CONTACT ---
sideTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    sideTabs.forEach((t) => t.classList.remove("active"));
    formSide.classList.remove("active");
    socialSide.classList.remove("active");

    tab.classList.add("active");

    const target = tab.getAttribute("data-target");
    if (target === "form") {
      formSide.classList.add("active");
    } else {
      socialSide.classList.add("active");
    }
  });
});


// --- GESTION DU FORMULAIRE DE CONTACT ---
const contactForm = document.querySelector('.glass-form');

if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    // Animation chargement
    submitBtn.textContent = 'ENVOI...';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    
    // Récupération des données
    const formData = {
      name: this.querySelector('input[type="text"]').value,
      email: this.querySelector('input[type="email"]').value,
      message: this.querySelector('textarea').value,
    };
    
    try {
      // Envoi au script PHP
      const response = await fetch('send-email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // ✅ SUCCÈS
        submitBtn.textContent = '✓ ENVOYÉ';
        submitBtn.style.background = '#8d775f';
        submitBtn.style.color = 'white';
        submitBtn.style.opacity = '1';
        
        // Reset après 2 secondes
        setTimeout(() => {
          contactForm.reset();
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          submitBtn.style.background = 'transparent';
          submitBtn.style.color = '#8d775f';
        }, 2000);
        
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      // ❌ ERREUR
      console.error('Erreur:', error);
      submitBtn.textContent = '✗ ERREUR';
      submitBtn.style.background = '#d9534f';
      submitBtn.style.color = 'white';
      submitBtn.style.opacity = '1';
      
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.style.background = 'transparent';
        submitBtn.style.color = '#8d775f';
      }, 2000);
    }
  });
}