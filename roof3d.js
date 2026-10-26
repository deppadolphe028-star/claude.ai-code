// A R Rénovation — toiture en 3D (Three.js r128)
// Deux scènes : la maison du hero, dont les tuiles se posent rang par rang,
// et l'anatomie de la toiture, qui se monte couche par couche au défilement.
(function () {
  'use strict';

  const docEl = document.documentElement;
  const heroCanvas = document.getElementById('hero-roof');
  const anatomyCanvas = document.getElementById('anatomy-roof');
  if (!window.THREE || !heroCanvas || !anatomyCanvas) {
    docEl.classList.add('no-3d');
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palette du site (voir styles.css)
  const C = {
    iris: '#847dff', cyan: '#00b3dd', paleIris: '#d1c9ff', deepIris: '#4b49aa',
    orchid: '#dd90d8', periwinkle: '#90b8f0', obsidian: '#0f1011', graphite: '#2e2e2e',
    steel: '#3f4041', silver: '#cacaca', fog: '#6a6b6b', ash: '#9f9fa0',
  };
  const col = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // Dimensions de la maison, en mètres
  const W = 8;                              // longueur, le long du faîtage (axe x)
  const D = 6;                              // largeur (axe z)
  const H = 3.4;                            // hauteur des murs
  const R = 2.5;                            // hauteur du pignon
  const HALF = D / 2;
  const ALPHA = Math.atan2(R, HALF);        // pente du toit, environ 40°
  const RAMPANT = Math.hypot(HALF, R);      // longueur du versant jusqu'au mur
  const LEN = RAMPANT + 0.5;                // avec le débord d'égout
  const RX = W / 2 + 0.3;                   // demi-longueur du toit avec le débord de rive
  const APEX = new THREE.Vector3(0, H + R, 0);

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _e = new THREE.Euler();
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();

  // Repère de chaque versant : x le long du faîtage, y perpendiculaire au versant, z dans le sens de la pente
  const SLOPES = [1, -1].map((side) => new THREE.Matrix4().compose(
    APEX,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(ALPHA, side > 0 ? 0 : Math.PI, 0, 'YXZ')),
    new THREE.Vector3(1, 1, 1)
  ));

  function onSlope(slope, x, h, s, tilt = 0, scaleX = 1) {
    _q.setFromEuler(_e.set(tilt, 0, 0));
    return new THREE.Matrix4().compose(_p.set(x, h, s), _q, _s.set(scaleX, 1, 1)).premultiply(slope);
  }

  function inWorld(x, y, z, rz = 0) {
    _q.setFromEuler(_e.set(0, 0, rz));
    return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(1, 1, 1));
  }

  // Oriente un cylindre de hauteur 1 entre deux points
  function between(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), quat, new THREE.Vector3(1, length, 1));
  }

  // Ombre de contact douce sous la maison
  function contactShadow() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.28)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 3.5, D + 3.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01;
    return mesh;
  }

  function buildHouse() {
    const group = new THREE.Group();
    const std = (hex, roughness = 0.85, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color: col(hex), roughness, metalness });
    const add = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    // Maçonnerie : murs, pignons, soubassement
    const wall = std(C.graphite, 0.95);
    add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wall)).position.y = H / 2;

    const gable = new THREE.Shape();
    gable.moveTo(-HALF, 0);
    gable.lineTo(HALF, 0);
    gable.lineTo(0, R);
    gable.lineTo(-HALF, 0);
    const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.24, bevelEnabled: false });
    gableGeo.translate(0, 0, -0.12);
    gableGeo.rotateY(Math.PI / 2);
    [-1, 1].forEach((sx) => {
      add(new THREE.Mesh(gableGeo, wall)).position.set(sx * (W / 2 - 0.12), H, 0);
    });

    add(new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.22, D + 0.3), std('#18191a', 0.9))).position.y = 0.11;
    group.add(contactShadow());

    // Ouvertures : fenêtres éclairées et porte
    const glass = new THREE.MeshStandardMaterial({
      color: col(C.obsidian), emissive: col(C.paleIris), emissiveIntensity: 0.4, roughness: 0.25,
    });
    const frameMat = std(C.fog, 0.6);
    const doorMat = std('#141516', 0.7);
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const opening = (x, y, z, w, h, onGable, mat) => {
      const frame = add(new THREE.Mesh(unit, frameMat));
      const pane = add(new THREE.Mesh(unit, mat));
      if (onGable) {
        frame.scale.set(0.06, h + 0.14, w + 0.14);
        pane.scale.set(0.08, h, w);
      } else {
        frame.scale.set(w + 0.14, h + 0.14, 0.06);
        pane.scale.set(w, h, 0.08);
      }
      frame.position.set(x, y, z);
      pane.position.set(x, y, z);
    };
    const front = HALF + 0.02;
    opening(-2.3, 1.3, front, 1.0, 2.1, false, doorMat);
    opening(0.3, 2.0, front, 1.15, 1.25, false, glass);
    opening(2.5, 2.0, front, 1.15, 1.25, false, glass);
    [-2.4, 0, 2.4].forEach((x) => opening(x, 2.0, -front, 1.0, 1.25, false, glass));
    [-1, 1].forEach((sx) => {
      opening(sx * (W / 2 + 0.02), 2.0, 0, 1.1, 1.25, true, glass);
      opening(sx * (W / 2 + 0.02), H + 0.95, 0, 0.7, 0.8, true, glass);
    });

    // Les couches de la toiture, dans l'ordre du chantier
    const layers = [];
    function layer(chroma) {
      const l = { chroma: col(chroma), group: new THREE.Group(), parts: [], queue: NaN, u: NaN };
      group.add(l.group);
      layers.push(l);
      return l;
    }
    function part(l, geo, mat, items, colors) {
      const mesh = new THREE.InstancedMesh(geo, mat, items.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      items.forEach((item, i) => {
        mesh.setMatrixAt(i, item.m);
        if (colors) mesh.setColorAt(i, colors[i]);
      });
      l.parts.push({ mesh, mat, neutral: mat.color.clone(), bases: items.map((it) => it.m), keys: items.map((it) => it.k) });
      l.group.add(mesh);
    }

    // 1. Charpente : chevrons et faîtière
    const charpente = layer(C.deepIris);
    const rafters = [];
    SLOPES.forEach((slope) => {
      for (let i = 0; i <= 16; i++) {
        const x = -W / 2 + 0.12 + (i * (W - 0.24)) / 16;
        rafters.push({ m: onSlope(slope, x, 0.09, LEN / 2), k: i / 16 });
      }
    });
    part(charpente, new THREE.BoxGeometry(0.08, 0.18, LEN), std(C.fog, 0.8), rafters);
    part(charpente, new THREE.BoxGeometry(W + 0.2, 0.24, 0.14), std(C.fog, 0.8), [{ m: inWorld(0, H + R + 0.04, 0), k: 0.5 }]);

    // 2. Isolation : panneaux posés sur les chevrons
    const isolation = layer(C.orchid);
    const panels = [];
    SLOPES.forEach((slope) => {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
          const x = -W / 2 + (c + 0.5) * (W / 8);
          const s = RAMPANT - (r + 0.5) * (RAMPANT / 4);
          panels.push({ m: onSlope(slope, x, 0.25, s), k: (r / 3) * 0.7 + (c / 7) * 0.3 });
        }
      }
    });
    part(isolation, new THREE.BoxGeometry(W / 8 - 0.03, 0.14, RAMPANT / 4 - 0.03), std(C.ash, 1), panels);

    // 3. Écran sous-toiture : lés posés de l'égout vers le faîtage
    const ecran = layer(C.cyan);
    const strips = [];
    SLOPES.forEach((slope) => {
      for (let r = 0; r < 3; r++) {
        strips.push({ m: onSlope(slope, 0, 0.33 + r * 0.004, LEN - (r + 0.5) * (LEN / 3)), k: r / 2 });
      }
    });
    part(ecran, new THREE.BoxGeometry(2 * RX - 0.1, 0.012, LEN / 3 + 0.12), std(C.steel, 0.55), strips);

    // 4. Couverture : liteaux puis tuiles, rang par rang depuis l'égout
    const couverture = layer(C.iris);
    const ROW = 0.34;
    const TW = 0.42;
    const TL = 0.46;
    const rows = Math.ceil(LEN / ROW);
    const span = (Math.ceil((2 * RX) / TW) * TW) / 2;
    const battens = [];
    const tiles = [];
    const shades = [];
    SLOPES.forEach((slope) => {
      for (let r = 0; r < rows; r++) {
        const lower = LEN + 0.03 - r * ROW;          // bord bas du rang
        const key = r / (rows - 1);
        battens.push({ m: onSlope(slope, 0, 0.355, lower - TL + 0.05), k: key });
        const shift = (r % 2) * (TW / 2);              // pose à joints croisés
        for (let j = 0; j <= Math.ceil((2 * span) / TW); j++) {
          const left = -span - shift + j * TW;
          const a = Math.max(left, -span);
          const b = Math.min(left + TW, span);
          if (b - a < 0.08) continue;
          tiles.push({
            m: onSlope(slope, (a + b) / 2, 0.4, lower - TL / 2, -0.065, (b - a) / TW),
            k: key * 0.92 + Math.random() * 0.08,
          });
          shades.push(new THREE.Color().setScalar(0.84 + Math.random() * 0.26));
        }
      }
    });
    part(couverture, new THREE.BoxGeometry(2 * RX - 0.05, 0.035, 0.05), std(C.fog, 0.85), battens);
    part(couverture, new THREE.BoxGeometry(TW - 0.02, 0.022, TL), std('#46484b', 0.5, 0.15), tiles, shades);

    // 5. Zinguerie : gouttières, descentes, faîtage
    const zinguerie = layer(C.paleIris);
    const zinc = () => std(C.silver, 0.32, 0.35);
    const caps = [];
    for (let i = 0; i < 18; i++) {
      caps.push({ m: inWorld(-RX + (i + 0.5) * ((2 * RX) / 18), H + R + 0.44, 0, Math.PI / 2), k: 0.45 + 0.55 * (i / 17) });
    }
    part(zinguerie, new THREE.CylinderGeometry(0.22, 0.22, (2 * RX) / 18 - 0.02, 18), zinc(), caps);

    const gutterGeo = new THREE.CylinderGeometry(0.12, 0.12, 2 * RX + 0.1, 14);
    gutterGeo.rotateZ(Math.PI / 2);
    part(zinguerie, gutterGeo, zinc(), SLOPES.map((slope) => ({ m: onSlope(slope, 0, 0.22, LEN + 0.12), k: 0 })));

    const pipes = [];
    SLOPES.forEach((slope, i) => {
      const side = i === 0 ? 1 : -1;
      const gutter = new THREE.Vector3(0, 0.22, LEN + 0.12).applyMatrix4(slope);
      [-1, 1].forEach((sx) => {
        const x = sx * (W / 2 - 0.35);
        const a = new THREE.Vector3(x, gutter.y - 0.05, gutter.z);
        const b = new THREE.Vector3(x, gutter.y - 0.42, side * (HALF + 0.09));
        const c = new THREE.Vector3(x, 0.24, side * (HALF + 0.09));
        pipes.push({ m: between(a, b), k: 0.2 }, { m: between(b, c), k: 0.2 });
      });
    });
    part(zinguerie, new THREE.CylinderGeometry(0.06, 0.06, 1, 10), zinc(), pipes);

    // 6. Entretien : le traitement passe sur les tuiles
    const sweepMat = new THREE.MeshBasicMaterial({
      color: col(C.periwinkle), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const bands = SLOPES.map((slope) => {
      const holder = new THREE.Group();
      slope.decompose(holder.position, holder.quaternion, holder.scale);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, LEN + 0.2), sweepMat);
      band.position.set(0, 0.47, LEN / 2);
      holder.add(band);
      group.add(holder);
      return band;
    });

    return {
      group,
      layers,
      // Pose une couche : queue = hauteur d'attente, u = avancement de la pose (0 → 1).
      // Avec appear, chaque pièce n'apparaît qu'au moment où elle commence à descendre.
      place(l, queue, u, gap, stagger, appear = false) {
        if (Math.abs(l.queue - queue) < 1e-4 && Math.abs(l.u - u) < 1e-4) return;
        l.queue = queue;
        l.u = u;
        for (const p of l.parts) {
          for (let i = 0; i < p.bases.length; i++) {
            const t = clamp01((u - p.keys[i] * stagger) / (1 - stagger));
            _m.copy(p.bases[i]);
            if (appear) _m.scale(_s.setScalar(t > 0 ? 0.55 + 0.45 * easeOut(clamp01(t / 0.35)) : 0));
            _m.elements[13] += queue + gap * (1 - easeOut(t));
            p.mesh.setMatrixAt(i, _m);
          }
          p.mesh.instanceMatrix.needsUpdate = true;
        }
      },
      // Colore une couche : 0 = matériau réel, 1 = couleur du service
      highlight(l, h) {
        for (const p of l.parts) {
          p.mat.color.copy(p.neutral).lerp(l.chroma, h);
          p.mat.emissive.copy(l.chroma).multiplyScalar(0.35 * h);
        }
      },
      sweep(progress) {
        const x = -RX - 0.8 + progress * (2 * RX + 1.6);
        bands.forEach((band) => { band.position.x = x; });
        sweepMat.opacity = 0.6 * Math.sin(Math.PI * clamp01(progress));
      },
    };
  }

  function resize(stage) {
    const w = stage.canvas.clientWidth;
    const h = stage.canvas.clientHeight;
    if (!w || !h || (w === stage.width && h === stage.height)) return;
    stage.width = w;
    stage.height = h;
    stage.renderer.setSize(w, h, false);
    stage.camera.aspect = w / h;
    stage.camera.updateProjectionMatrix();
    stage.signature = '';
  }

  function createStage(canvas, ground) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);

    scene.add(new THREE.HemisphereLight(col(C.periwinkle), col(C.obsidian), 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(9, 15, 11);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(window.innerWidth < 700 ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const rim = new THREE.DirectionalLight(col(C.paleIris), 0.7);
    rim.position.set(-12, 7, -9);
    scene.add(rim);

    if (ground === 'shadow') {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.25 }));
      plane.rotation.x = -Math.PI / 2;
      plane.receiveShadow = true;
      scene.add(plane);
    } else {
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(6.2, 6.2, 0.18, 96),
        new THREE.MeshStandardMaterial({ color: col(C.obsidian), roughness: 1 })
      );
      pedestal.position.y = -0.09;
      pedestal.receiveShadow = true;
      scene.add(pedestal);
      const edge = new THREE.Mesh(
        new THREE.CylinderGeometry(6.22, 6.22, 0.03, 96, 1, true),
        new THREE.MeshBasicMaterial({ color: col(C.steel) })
      );
      edge.position.y = -0.015;
      scene.add(edge);
    }

    const house = buildHouse();
    scene.add(house.group);

    const stage = {
      canvas, renderer, scene, camera, house,
      visible: false, width: 0, height: 0, signature: '',
      framed: false, eye: new THREE.Vector3(), look: new THREE.Vector3(),
    };
    resize(stage);
    if ('ResizeObserver' in window) new ResizeObserver(() => resize(stage)).observe(canvas);
    else window.addEventListener('resize', () => resize(stage));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { stage.visible = entry.isIntersecting; }, { rootMargin: '120px' }).observe(canvas);
    } else {
      stage.visible = true;
    }
    return stage;
  }

  // Cadre la caméra sur une sphère (centre, rayon), en vue de trois quarts
  function frame(stage, center, radius, azimuth, elevation, ease) {
    const cam = stage.camera;
    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    const dist = radius / Math.sin(Math.min(vFov, hFov) / 2);
    _v.set(Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.cos(azimuth))
      .multiplyScalar(dist)
      .add(center);
    if (!stage.framed || ease >= 1) {
      stage.eye.copy(_v);
      stage.look.copy(center);
      stage.framed = true;
    } else {
      stage.eye.lerp(_v, ease);
      stage.look.lerp(center, ease);
    }
    cam.position.copy(stage.eye);
    cam.lookAt(stage.look);
  }

  const hero = createStage(heroCanvas, 'shadow');
  const anatomy = hero && createStage(anatomyCanvas, 'pedestal');
  if (!hero || !anatomy) {
    docEl.classList.add('no-3d');
    return;
  }

  // Maison du hero : tuiles posées à l'arrivée, rotation lente, glisser pour la faire tourner
  const heroRoof = hero.house.layers[3];
  const heroZinc = hero.house.layers[4];
  let heroStart = null;
  let yaw = 0.5;
  let spin = 0;
  let drag = null;

  heroCanvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, id: event.pointerId };
    heroCanvas.setPointerCapture(event.pointerId);
  });
  heroCanvas.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    drag.x = event.clientX;
    yaw += dx * 0.01;
    spin = dx * 0.01;
  });
  const release = () => { drag = null; };
  heroCanvas.addEventListener('pointerup', release);
  heroCanvas.addEventListener('pointercancel', release);

  function updateHero(now, dt) {
    if (heroStart === null) heroStart = now;
    const t = reduceMotion ? Infinity : (now - heroStart) / 1000;
    hero.house.place(heroRoof, 0, clamp01((t - 0.4) / 2.8), 2.4, 0.72, true);
    hero.house.place(heroZinc, 0, clamp01((t - 3.0) / 0.9), 1.4, 0.5, true);
    if (!drag) {
      yaw += spin * dt * 60 + (reduceMotion ? 0 : 0.12 * dt);
      spin *= Math.pow(0.0005, dt);
    }
    hero.house.group.rotation.y = yaw;
    frame(hero, _c.set(0, 2.8, 0), 6.1, 0.62, 0.38, 1);
    return `${yaw.toFixed(4)}|${heroRoof.u}|${heroZinc.u}`;
  }

  // Anatomie : la toiture se monte couche par couche au défilement
  const steps = Array.from(document.querySelectorAll('.astep'));
  const stepLabel = document.getElementById('anatomy-label');
  const stepFill = document.getElementById('anatomy-fill');
  const GAP = 0.95;
  let activeStep = -1;

  function scrollProgress() {
    const first = steps[0].getBoundingClientRect();
    const last = steps[steps.length - 1].getBoundingClientRect();
    const stepHeight = (last.bottom - first.top) / steps.length;
    const view = window.innerHeight;
    const stageBox = anatomyCanvas.getBoundingClientRect();
    const sideBySide = stageBox.right <= first.left + 1;
    const line = sideBySide ? view * 0.55 : (Math.max(stageBox.bottom, 0) + view) / 2;
    // Une couche est posée quand le centre de son étape atteint la ligne de lecture
    return Math.min(steps.length, Math.max(0, (line - first.top) / stepHeight + 0.5));
  }

  function updateAnatomy(now) {
    const t = scrollProgress();
    const house = anatomy.house;
    house.layers.forEach((l, j) => {
      house.place(l, GAP * Math.max(0, j - t), clamp01(t - j), GAP, 0.45);
      house.highlight(l, smooth(j - 0.2, j + 0.4, t) * (1 - smooth(j + 1.15, j + 1.45, t)));
    });
    house.sweep(clamp01((t - 5.05) / 0.9));
    const sway = reduceMotion ? 0 : Math.sin(now / 2600) * 0.05;
    house.group.rotation.y = -0.55 + (t / steps.length) * 0.75 + sway;

    // Les couches en attente se resserrent : la caméra se rapproche
    const top = H + R + 0.8 + GAP * Math.max(0, 5 - t);
    frame(anatomy, _c.set(0, top / 2 - 0.4, 0), Math.max(6.6, top / 2 + 1.1), 0.7, 0.34, 0.12);

    const k = Math.min(steps.length - 1, Math.max(0, Math.round(t) - 1));
    if (k !== activeStep) {
      activeStep = k;
      steps.forEach((step, i) => step.classList.toggle('is-active', i === k));
      stepLabel.textContent = steps[k].dataset.label;
    }
    stepFill.style.transform = `scaleX(${(t / steps.length).toFixed(4)})`;
    return `${t.toFixed(4)}|${sway.toFixed(4)}|${anatomy.eye.x.toFixed(3)}|${anatomy.eye.y.toFixed(3)}`;
  }

  // Une seule boucle ; chaque scène n'est redessinée que si elle est visible et a changé
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const [stage, update] of [[hero, updateHero], [anatomy, updateAnatomy]]) {
      if (!stage.visible) continue;
      const signature = `${update(now, dt)}|${stage.width}x${stage.height}`;
      if (signature !== stage.signature) {
        stage.signature = signature;
        stage.renderer.render(stage.scene, stage.camera);
      }
    }
    requestAnimationFrame(tick);
  }
  docEl.classList.add('has-3d');
  requestAnimationFrame(tick);
})();
