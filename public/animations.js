// ============================================================
// Carat Cloud — 3D Immersive Animation Layer
// CDN-only ES module: Lenis + GSAP + Three.js + SplitType + Motion
// ============================================================

import Lenis from 'https://esm.sh/lenis@1.1.14';
import gsap from 'https://esm.sh/gsap@3.12.5';
import { ScrollTrigger } from 'https://esm.sh/gsap@3.12.5/ScrollTrigger';
import { animate, scroll } from 'https://esm.sh/motion@11.11.13';
import * as THREE from 'https://esm.sh/three@0.168.0';
import SplitType from 'https://esm.sh/split-type@0.3.4';

gsap.registerPlugin(ScrollTrigger);

// ---- Globals ----
const isTouch = matchMedia('(hover: none)').matches;
const isLowPower = navigator.hardwareConcurrency <= 4 || isTouch;
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
// PHASE 0 — Foundation
// ============================================================
function initLenis() {
  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
    touchMultiplier: 1.5,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

// ============================================================
// PHASE 1 — Loader Enhancement
// ============================================================
function initLoader() {
  return new Promise((resolve) => {
    const loader = document.getElementById('loader');
    const gem = document.querySelector('[data-loader-gem]');
    if (!loader || !gem) { resolve(); return; }

    // Undo the fallback inline script's "gone" class so we can animate ourselves
    loader.classList.remove('gone');
    loader.style.opacity = '1';
    loader.style.visibility = 'visible';

    // 3D spin on the gem
    animate(gem, {
      rotateY: [0, 360],
      scale: [0.5, 1],
    }, {
      duration: 1.0,
      easing: [0.34, 1.56, 0.64, 1],
    });

    // Wait for page load, then fade out
    const hide = () => {
      const anim = animate(loader, { opacity: [1, 0], scale: [1, 1.05] }, { duration: 0.5, easing: 'ease-out' });
      anim.then(() => {
        loader.style.display = 'none';
        resolve();
      }).catch(() => {
        // Fallback if animation fails
        loader.style.display = 'none';
        resolve();
      });
    };

    if (document.readyState === 'complete') {
      setTimeout(hide, 200);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 200));
    }
  });
}

// ============================================================
// PHASE 2 — Magnetic Cursor
// ============================================================
function initCursor() {
  if (isTouch) return;

  // Inject cursor elements
  const dot = document.createElement('div');
  dot.id = 'cursor-dot';
  const ring = document.createElement('div');
  ring.id = 'cursor-ring';

  Object.assign(dot.style, {
    position: 'fixed', top: 0, left: 0, width: '6px', height: '6px',
    background: '#385d8e', borderRadius: '50%', pointerEvents: 'none',
    zIndex: '9998', transform: 'translate(-50%, -50%)',
    willChange: 'transform', transition: 'width 0.3s, height 0.3s, background 0.3s',
  });
  Object.assign(ring.style, {
    position: 'fixed', top: 0, left: 0, width: '36px', height: '36px',
    border: '1.5px solid rgba(56,93,142,0.4)', borderRadius: '50%',
    pointerEvents: 'none', zIndex: '9997',
    transform: 'translate(-50%, -50%)', willChange: 'transform',
    transition: 'width 0.3s, height 0.3s, border-color 0.3s',
  });

  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = -100, my = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  }, { passive: true });

  // Laggy ring follow
  (function lerpRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(lerpRing);
  })();

  // Expand on interactive elements
  const interactives = 'a, button, [data-modal], input, textarea, select';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactives)) {
      ring.style.width = '56px';
      ring.style.height = '56px';
      ring.style.borderColor = 'rgba(56,93,142,0.6)';
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(2.5)`;
    }
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactives)) {
      ring.style.width = '36px';
      ring.style.height = '36px';
      ring.style.borderColor = 'rgba(56,93,142,0.4)';
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(1)`;
    }
  }, { passive: true });
}

// ============================================================
// PHASE 3 — Three.js Hero Diamond Scene
// ============================================================
function initHeroScene() {
  const canvas = document.getElementById('hero-canvas');
  const header = document.getElementById('suite');
  if (!canvas || !header) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isLowPower });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Diamond geometry
  const geo = new THREE.OctahedronGeometry(1.4, 2);
  const mat = isLowPower
    ? new THREE.MeshStandardMaterial({ color: 0xd4e3ff, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.3 })
    : new THREE.MeshPhysicalMaterial({
        color: 0xd4e3ff,
        transmission: 0.92,
        ior: 2.42,
        roughness: 0.05,
        thickness: 1.5,
        envMapIntensity: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
  const diamond = new THREE.Mesh(geo, mat);
  diamond.position.set(2.5, 0, -1);
  scene.add(diamond);

  // Particle constellation
  const particleCount = 180;
  const pGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 2.0 + Math.random() * 1.5;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xa5c8ff, size: 0.03, transparent: true, opacity: 0.7 });
  const particles = new THREE.Points(pGeo, pMat);
  diamond.add(particles);

  // Lighting rig
  const keyLight = new THREE.DirectionalLight(0xd4e3ff, 3.0);
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x5276a8, 1.5);
  fillLight.position.set(-5, 0, 3);
  scene.add(fillLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const rimLight = new THREE.PointLight(0xd4e3ff, 2.0);
  rimLight.position.set(0, -3, -5);
  scene.add(rimLight);

  // Scroll-driven camera drift
  gsap.to(camera.position, {
    y: 2, z: 7,
    ease: 'none',
    scrollTrigger: {
      trigger: header,
      start: 'top top',
      end: 'bottom top',
      scrub: 1.5,
    }
  });
  gsap.to(diamond.rotation, {
    y: Math.PI,
    x: 0.5,
    ease: 'none',
    scrollTrigger: {
      trigger: header,
      start: 'top top',
      end: 'bottom top',
      scrub: 1.5,
    }
  });
  gsap.to(diamond.position, {
    y: 2,
    ease: 'none',
    scrollTrigger: {
      trigger: header,
      start: 'top top',
      end: 'bottom top',
      scrub: 1.5,
    }
  });

  // Render loop with IntersectionObserver pause
  let isVisible = true;
  const heroObs = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; }, { threshold: 0 });
  heroObs.observe(header);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!isVisible) return;

    const t = clock.getElapsedTime();
    diamond.rotation.y += 0.003;
    diamond.position.x = 2.5 + Math.sin(t * 0.5) * 0.15;
    diamond.position.z = -1 + Math.sin(t * 0.3) * 0.1;

    renderer.render(scene, camera);
  }
  tick();

  // Resize handler
  const onResize = () => {
    const w = header.clientWidth;
    const h = header.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize, { passive: true });
}

// ============================================================
// PHASE 4 — Hero Text Entrance (SplitType)
// ============================================================
function initHeroEntrance() {
  // Force hero reveal elements visible — GSAP handles animation, not CSS classes
  const hero = document.getElementById('suite');
  if (hero) {
    hero.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  const lines = document.querySelectorAll('[data-split-line]');
  if (!lines.length) return;

  lines.forEach((line, i) => {
    const split = new SplitType(line, { types: 'chars' });
    gsap.from(split.chars, {
      opacity: 0,
      y: 60,
      rotateX: -40,
      duration: 0.8,
      stagger: 0.028,
      ease: 'power3.out',
      delay: i * 0.12,
    });
  });

  // Animate badge, subtext, CTAs in sequence
  const heroContent = document.querySelector('#suite .reveal');
  if (!heroContent) return;

  const badge = heroContent.querySelector('.inline-flex');
  const subtext = heroContent.querySelector('p');
  const ctaRow = heroContent.querySelector('.flex.flex-col');

  const stagger = [badge, subtext, ctaRow].filter(Boolean);
  stagger.forEach((el, i) => {
    gsap.from(el, {
      opacity: 0,
      y: 30,
      duration: 0.7,
      delay: 0.5 + i * 0.15,
      ease: 'power2.out',
    });
  });

  // Hero image
  const heroImage = document.querySelector('#suite .reveal-right');
  if (heroImage) {
    gsap.from(heroImage, {
      opacity: 0,
      x: 80,
      rotateY: -8,
      duration: 1.0,
      delay: 0.3,
      ease: 'power3.out',
    });
  }
}

// ============================================================
// PHASE 5 — GSAP ScrollTrigger Section Reveals
// ============================================================
function initScrollReveals() {
  // Inject style to disable CSS transitions on reveal elements (GSAP takes control)
  const style = document.createElement('style');
  style.textContent = `
    .reveal, .reveal-left, .reveal-right, .reveal-scale { transition: none !important; }
    .stagger > * { transition: none !important; }
  `;
  document.head.appendChild(style);

  // Reset any .visible that the fallback IntersectionObserver already added
  // Skip hero section (#suite) — handled by initHeroEntrance
  const hero = document.getElementById('suite');
  const notInHero = (el) => !hero || !hero.contains(el);

  document.querySelectorAll('.reveal.visible, .reveal-left.visible, .reveal-right.visible, .reveal-scale.visible, .stagger.visible')
    .forEach(el => { if (notInHero(el)) el.classList.remove('visible'); });

  // Standard reveals (excluding hero section)
  // Use gsap.fromTo — CSS default is opacity:0, so gsap.from({opacity:0}) would be a no-op
  document.querySelectorAll('.reveal').forEach(el => {
    if (!notInHero(el)) return;
    gsap.fromTo(el,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  document.querySelectorAll('.reveal-left').forEach(el => {
    if (!notInHero(el)) return;
    gsap.fromTo(el,
      { opacity: 0, x: -60 },
      { opacity: 1, x: 0, duration: 1.0, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  document.querySelectorAll('.reveal-right').forEach(el => {
    if (!notInHero(el)) return;
    gsap.fromTo(el,
      { opacity: 0, x: 60 },
      { opacity: 1, x: 0, duration: 1.0, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  document.querySelectorAll('.reveal-scale').forEach(el => {
    if (!notInHero(el)) return;
    gsap.fromTo(el,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  // Stagger grid children
  document.querySelectorAll('.stagger').forEach(container => {
    if (!notInHero(container)) return;
    const children = container.children;
    gsap.fromTo(children,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: container, start: 'top 85%', once: true } });
  });
}

// ============================================================
// PHASE 6 — Section-Specific 3D Effects
// ============================================================
function initSectionHeadings() {
  document.querySelectorAll('[data-split]').forEach(h2 => {
    const split = new SplitType(h2, { types: 'words' });
    gsap.from(split.words, {
      opacity: 0,
      y: 40,
      rotateX: -20,
      duration: 0.7,
      stagger: 0.05,
      ease: 'power3.out',
      scrollTrigger: { trigger: h2, start: 'top 85%', once: true },
    });
  });
}

function initIntelligenceSection() {
  const section = document.querySelector('[data-intelligence]');
  if (!section) return;

  // Arbitrage card 3D entrance
  const card = section.querySelector('.bg-white');
  if (card) {
    gsap.from(card, {
      rotateY: 12,
      rotateX: 6,
      x: -80,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 85%', once: true },
    });
  }

  // Live number counters
  section.querySelectorAll('.text-primary.font-bold').forEach(el => {
    const text = el.textContent.trim();
    const match = text.match(/[\+\-]?\$?([\d,.]+)/);
    if (!match) return;
    const target = parseFloat(match[1].replace(',', ''));
    const prefix = text.replace(match[1], '').replace(/[\d]/g, '');
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => {
        el.textContent = prefix + obj.val.toFixed(2);
      },
    });
  });
}

function initRFIDSection() {
  const bg = document.querySelector('[data-rfid-bg]');
  if (!bg) return;

  gsap.to(bg, {
    xPercent: -8,
    ease: 'none',
    scrollTrigger: {
      trigger: bg.closest('[data-rfid]'),
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
    }
  });
}

function initFoundationSection() {
  const grid = document.querySelector('[data-foundation-grid]');
  if (!grid) return;

  gsap.from(grid, {
    rotateX: 2,
    transformPerspective: 1000,
    ease: 'none',
    scrollTrigger: {
      trigger: grid,
      start: 'top bottom',
      end: 'top 50%',
      scrub: 1,
    }
  });
}

function initSEOSection() {
  const imgWrap = document.querySelector('[data-seo-image]');
  if (!imgWrap) return;

  gsap.to(imgWrap, {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: {
      trigger: imgWrap.closest('[data-seo-section]'),
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
    }
  });
}

// ============================================================
// PHASE 7 — CTA Grand Entrance
// ============================================================
function initCTASection() {
  const h2 = document.querySelector('[data-split-cta]');
  if (!h2) return;

  const split = new SplitType(h2, { types: 'chars' });
  gsap.from(split.chars, {
    opacity: 0,
    scale: 0.4,
    y: 80,
    duration: 0.8,
    stagger: 0.02,
    ease: 'back.out(1.4)',
    scrollTrigger: { trigger: h2, start: 'top 85%', once: true },
  });
}

// ============================================================
// PHASE 8 — Motion DOM Hover Interactions
// ============================================================
function initCardTilt() {
  if (isTouch) return;

  document.querySelectorAll('.perspective-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      animate(card, {
        rotateY: x * 14,   // max ±7°
        rotateX: y * -10,  // max ±5°
        transform: `perspective(1000px) rotateY(${x * 14}deg) rotateX(${y * -10}deg)`,
      }, { duration: 0.3, easing: 'ease-out' });
    });

    card.addEventListener('mouseleave', () => {
      animate(card, {
        transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg)',
      }, { duration: 0.6, easing: [0.34, 1.56, 0.64, 1] });
    });
  });
}

function initFeatureCardHover() {
  if (isTouch) return;

  document.querySelectorAll('[data-foundation-grid] .material-symbols-outlined').forEach(icon => {
    const card = icon.closest('div[class*="bg-surface"]');
    if (!card) return;

    card.addEventListener('mouseenter', () => {
      animate(icon, { y: -6, scale: 1.15 }, { duration: 0.4, easing: [0.34, 1.56, 0.64, 1] });
    });
    card.addEventListener('mouseleave', () => {
      animate(icon, { y: 0, scale: 1 }, { duration: 0.3, easing: 'ease-out' });
    });
  });
}

// ============================================================
// PHASE 9 — Navbar + Scroll Progress Bar
// ============================================================
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  scroll(
    (progress) => {
      const shadow = progress > 0.005
        ? `0 4px 30px rgba(56,93,142,${Math.min(progress * 2, 0.12)})`
        : 'none';
      navbar.style.boxShadow = shadow;
    }
  );
}

function initProgressBar() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  Object.assign(bar.style, {
    position: 'fixed', top: '0', left: '0', height: '2px', width: '100%',
    background: 'linear-gradient(90deg, #385d8e, #5276a8, #a5c8ff)',
    transformOrigin: 'left', transform: 'scaleX(0)',
    zIndex: '9999', pointerEvents: 'none',
  });
  document.body.prepend(bar);

  scroll((progress) => {
    bar.style.transform = `scaleX(${progress})`;
  });
}

// ============================================================
// INIT ALL
// ============================================================
async function initAll() {
  // Reduced motion: show everything immediately, skip all animations
  if (prefersReduced) {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger').forEach(el => {
      el.classList.add('visible');
    });
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    return;
  }

  const lenis = initLenis();

  // Start cursor and hero scene immediately (don't wait for loader)
  initCursor();
  initHeroScene();

  // Loader → then hero text entrance
  await initLoader();
  initHeroEntrance();

  // Scroll-driven animations
  initScrollReveals();
  initSectionHeadings();
  initIntelligenceSection();
  initRFIDSection();
  initFoundationSection();
  initSEOSection();
  initCTASection();

  // Hover interactions
  initCardTilt();
  initFeatureCardHover();

  // Navbar + progress
  initNavbarScroll();
  initProgressBar();
}

initAll();
