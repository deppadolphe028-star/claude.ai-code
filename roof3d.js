// A R Rénovation — toiture en 3D (Three.js r128)
// Deux scènes : la maison du hero, dont les ardoises se posent rang par rang,
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

  // Définition du rendu : baissée automatiquement si l'appareil peine (voir adapt)
  const quality = { ratio: Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2), frames: 0, time: 0, skip: 40 };

  // Couleurs réelles des matériaux
  const M = {
    wall: '#e4dccc',        // enduit gratté, ton pierre claire
    plinth: '#8c8b86',      // soubassement en pierre
    frame: '#f3f2ee',       // menuiseries blanches
    glass: '#2b3a48',       // vitre : sombre, le ciel s'y reflète
    sill: '#d6d1c5',        // appuis de fenêtre
    shutter: '#5f7c93',     // volets
    door: '#56728a',
    handle: '#d9d9d6',
    wood: '#c08a50',        // sapin traité : sablières, pannes, chevrons
    batten: '#d2a56b',      // liteaux et contre-liteaux
    wool: '#e2b93b',        // laine de verre
    screen: '#c3ccd4',      // écran sous-toiture
    slate: '#3d444c',       // ardoise naturelle
    hook: '#a9b0b6',        // crochets inox
    flatTile: '#86402a',    // tuile plate en terre cuite, brun rouge
    romanTile: '#a94f2a',   // tuile romane en terre cuite
    steel: '#272b30',       // bac acier prélaqué gris anthracite (RAL 7016)
    screw: '#c3c8cc',       // vis à rondelle d'étanchéité
    terracotta: '#b4603f',  // tuiles faîtières, mitrons
    mortar: '#b9b1a3',      // mortier de l'embarrure
    zinc: '#a2abb0',
    concrete: '#9d9c97',
    grass: '#6aa84f',
    soil: '#7a5536',
    stone: '#bdb9ae',
    bush: '#4f8a3c',
    bushDark: '#3f7631',
    treatment: '#90b8f0',
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
  const CX = 2.1;                           // souche de cheminée, à cheval sur le faîtage
  const CW = 0.9;
  const nearChimney = (x, margin) => Math.abs(x - CX) < CW / 2 + margin;
  const RAFTERS = Array.from({ length: 17 }, (_, i) => -W / 2 + 0.12 + (i * (W - 0.24)) / 16);
  const rafterStart = (x) => (nearChimney(x, 0.12) ? 0.66 : 0);   // chevrons coupés par la cheminée

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // Aléatoire reproductible : les deux maisons sont identiques
  let seed = 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _e = new THREE.Euler();
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const _f = new THREE.Vector3();
  const _col = new THREE.Color();
  const _tint = new THREE.Color();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  // Repère de chaque versant : x le long du faîtage, y perpendiculaire au versant, z dans le sens de la pente
  const SLOPES = [1, -1].map((side) => new THREE.Matrix4().compose(
    APEX,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(ALPHA, side > 0 ? 0 : Math.PI, 0, 'YXZ')),
    new THREE.Vector3(1, 1, 1)
  ));

  function onSlope(slope, x, h, s, sx = 1, sy = 1, sz = 1, tilt = 0) {
    _q.setFromEuler(_e.set(tilt, 0, 0));
    return new THREE.Matrix4().compose(_p.set(x, h, s), _q, _s.set(sx, sy, sz)).premultiply(slope);
  }

  function inWorld(x, y, z, sx = 1, sy = 1, sz = 1) {
    return new THREE.Matrix4().compose(_p.set(x, y, z), _q.identity(), _s.set(sx, sy, sz));
  }

  // Oriente un cylindre de hauteur 1 entre deux points
  function between(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize());
    return new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), quat, new THREE.Vector3(1, length, 1));
  }

  // Découpe [a, b] le long du faîtage pour laisser passer la cheminée
  function aroundChimney(a, b, margin) {
    const c0 = CX - CW / 2 - margin;
    const c1 = CX + CW / 2 + margin;
    return [[a, Math.min(b, c0)], [Math.max(a, c1), b]].filter(([p, q]) => q - p > 0.05);
  }

  // Chaque pièce lit sa propre zone de texture : deux ardoises ou deux tuiles ne se ressemblent jamais
  function withUvOffset(mat) {
    mat.userData.uvOffset = true;
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 uvOffset;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_UV\n\tvUv += uvOffset;\n#endif');
    };
    return mat;
  }

  // Textures de secours, dessinées : servent quand la page est ouverte en local (file://),
  // où le navigateur refuse au WebGL les images du dossier textures/
  function drawnTextures() {
    seed = 3;
    const make = (size, repeatX, repeatY, draw) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      draw(canvas.getContext('2d'), size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      return texture;
    };
    const fibres = (ctx, size, base, tones, count, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.2 + rand() * 0.5;
        ctx.fillStyle = tones[i % tones.length];
        ctx.fillRect(rand() * size, rand() * size, w * (0.4 + rand()), h * (0.5 + rand()));
      }
      ctx.globalAlpha = 1;
    };
    const blotches = (ctx, size, tones, count, rMin, rMax) => {
      for (let i = 0; i < count; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = rMin + rand() * (rMax - rMin);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, tones[i % tones.length]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
    };
    const speckles = (ctx, size, color, count, dot) => {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) ctx.fillRect(rand() * size, rand() * size, 0.5 + dot * rand(), 0.5 + dot * rand());
    };
    const variant = (texture, repeatX, repeatY) => {
      const copy = texture.clone();
      copy.repeat.set(repeatX, repeatY);
      copy.needsUpdate = true;
      return copy;
    };
    const slate = make(512, 0.35, 0.35, (ctx, s) => {
      ctx.fillStyle = '#4a525b';
      ctx.fillRect(0, 0, s, s);
      blotches(ctx, s, ['rgba(20,26,34,0.12)', 'rgba(120,132,146,0.09)'], 60, 40, 140);
      for (let y = 0; y < s; y += 2 + rand() * 5) {            // lits de clivage
        ctx.strokeStyle = rand() < 0.5 ? 'rgba(22,28,36,0.3)' : 'rgba(150,160,172,0.18)';
        ctx.lineWidth = 0.5 + rand() * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 32; x <= s; x += 32) ctx.lineTo(x, y + (rand() - 0.5) * 2.2);
        ctx.stroke();
      }
      speckles(ctx, s, 'rgba(205,214,224,0.4)', 900, 1.2);     // paillettes de mica
    });
    const clay = make(512, 0.3, 0.3, (ctx, s) => {
      ctx.fillStyle = '#f0e6df';
      ctx.fillRect(0, 0, s, s);
      blotches(ctx, s, ['rgba(120,60,30,0.13)', 'rgba(255,240,225,0.2)', 'rgba(70,35,20,0.08)'], 90, 20, 110);
      speckles(ctx, s, 'rgba(90,45,25,0.35)', 2600, 1.6);       // grain de sable
      speckles(ctx, s, 'rgba(255,245,235,0.35)', 1400, 1.4);
    });
    return {
      slate,
      clay,
      clayRoman: variant(clay, 1, 1),        // UV en mètres sur les pièces extrudées
      clayRidge: variant(clay, 0.5, 0.5),
      steel: make(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = '#e9ebee';
        ctx.fillRect(0, 0, s, s);
        blotches(ctx, s, ['rgba(255,255,255,0.25)', 'rgba(0,0,0,0.06)'], 40, 10, 60);
        speckles(ctx, s, 'rgba(0,0,0,0.08)', 1500, 1);
      }),
      wool: make(128, 1, 5, (ctx, s) => fibres(ctx, s, M.wool, ['#f3d36a', '#c4951f', '#f8e39a', '#b5871a'], 900, 3, 10)),
      screen: make(256, 4, 1, (ctx, s) => {
        ctx.fillStyle = M.screen;
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = 'rgba(70,110,160,0.55)';                // bande de recouvrement
        ctx.fillRect(0, s * 0.08, s, s * 0.025);
        ctx.fillStyle = 'rgba(80,92,104,0.35)';                 // marquage imprimé
        for (let y = s * 0.3; y < s; y += s * 0.22) {
          for (let x = 8; x < s; x += 64) ctx.fillRect(x, y, 34, 5);
        }
      }),
      brick: make(128, 2, 6, (ctx, s) => {
        ctx.fillStyle = '#d3ccbf';
        ctx.fillRect(0, 0, s, s);
        const rows = 8;
        const bh = s / rows;
        for (let r = 0; r < rows; r++) {
          const offset = (r % 2) * (s / 4);
          for (let x = -s / 2; x < s; x += s / 2) {
            const v = 0.85 + rand() * 0.3;
            ctx.fillStyle = `rgb(${Math.round(155 * v)},${Math.round(74 * v)},${Math.round(53 * v)})`;
            ctx.fillRect(x + offset + 2, r * bh + 2, s / 2 - 4, bh - 4);
          }
        }
      }),
      grass: make(256, 5, 5, (ctx, s) => fibres(ctx, s, M.grass, ['#7cbc5c', '#5a9442', '#8fc76a', '#4e8639'], 2600, 2, 6)),
    };
  }

  // Matières réalistes : fichiers de textures/ (calculés par textures/generer.py), couleur et relief.
  // La maison n'apparaît qu'une fois tout chargé, pour ne jamais montrer de surface vide.
  const FILES = location.protocol !== 'file:';
  let pending = 0;
  let arrived = 0;
  let ready = !FILES;
  function settled() {
    pending -= 1;
    arrived += 1;
    if (pending === 0) ready = true;
  }
  if (!ready) setTimeout(() => { ready = true; }, 6000);   // réseau très lent : les matières arrivent ensuite
  // Fichier absent : une image neutre d'un pixel, la matière garde sa couleur et reste lisse
  function neutral(texture, fill) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 1, 1);
    texture.image = canvas;
    texture.needsUpdate = true;
  }
  let mapCache = null;
  function maps() {
    if (mapCache) return mapCache;
    const loader = new THREE.TextureLoader();
    const file = (name, repeat, color = true) => {
      pending += 1;
      const texture = loader.load(`textures/${name}.webp`, settled, undefined, () => {
        neutral(texture, color ? '#ffffff' : '#8080ff');
        settled();
      });
      texture.encoding = color ? THREE.sRGBEncoding : THREE.LinearEncoding;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(...[].concat(repeat, repeat).slice(0, 2));
      texture.anisotropy = 4;
      return texture;
    };
    const drawn = FILES ? null : drawnTextures();
    const redraw = (texture, repeat) => {
      if (!texture) return null;
      const copy = texture.clone();
      copy.repeat.set(...[].concat(repeat, repeat).slice(0, 2));
      copy.needsUpdate = true;
      return copy;
    };
    // colored : la texture porte déjà la couleur (sinon elle nuance la couleur de la matière)
    const pair = (name, repeat, { fallback, colored = false, relief = true } = {}) => (FILES
      ? { map: file(name, repeat), normalMap: relief ? file(`${name}_n`, repeat, false) : null, colored }
      : { map: redraw(drawn[fallback], repeat), normalMap: null, colored });
    mapCache = {
      slate: pair('ardoise', 0.35, { fallback: 'slate', colored: true }),
      clay: pair('terre_cuite', 0.3, { fallback: 'clay' }),
      clayRoman: pair('terre_cuite', 1, { fallback: 'clay' }),        // UV en mètres sur les pièces extrudées
      clayRidge: pair('terre_cuite', 0.5, { fallback: 'clay' }),
      wood: pair('bois', 1),
      wool: pair('laine', [1, 8], { fallback: 'wool', colored: true }),
      screen: pair('ecran', [4, 1], { fallback: 'screen', colored: true }),
      brick: pair('brique', [1 / 0.46, 1 / 0.52], { fallback: 'brick', colored: true }),   // UV en mètres
      render: pair('crepi', 1 / 1.2),                                                         // UV en mètres
      grass: pair('gazon', 6, { fallback: 'grass', colored: true, relief: false }),
      soil: pair('terre', [26, 1], { colored: true }),
      paving: pair('dalle', 0.5, { colored: true }),
      planks: pair('planches', 1),
      steel: FILES ? { map: null, normalMap: file('acier_n', 4, false) } : { map: drawn.steel, normalMap: null },
      leaves: FILES ? file('feuilles', 1) : null,
    };
    return mapCache;
  }

  // Matière texturée : couleur blanche si la texture porte la couleur, sinon la couleur réelle nuancée
  function surface(pair, hex, roughness, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color: pair.map && pair.colored ? new THREE.Color(1, 1, 1) : col(hex),
      map: pair.map,
      normalMap: pair.normalMap,
      roughness,
      ...extra,
    });
  }

  // Boîte dont les UV sont en mètres : la texture garde la même échelle sur toutes les faces
  function metricBox(w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // faces +x, -x, +y, -y, +z, -z
    for (let i = 0; i < uv.count; i++) {
      const [su, sv] = sizes[Math.floor(i / 4)];
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    }
    return geo;
  }

  // Pièce de bois de 1 m de côté, mise à l'échelle par instance : le fil du bois suit sa longueur (x ou z)
  function grainBox(axis) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    if (axis === 'z') {
      const uv = geo.attributes.uv;
      for (let i = 8; i < 16; i++) uv.setXY(i, uv.getY(i), uv.getX(i));   // dessus et dessous
    }
    return geo;
  }

  // Ombre de contact douce sous la maison
  function contactShadow() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 3, D + 3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01;
    return mesh;
  }

  // Extrude un profil (points du dessus, épaisseur) dans le sens de la pente
  function extrudeProfile(top, thickness, length) {
    const shape = new THREE.Shape();
    shape.moveTo(top[0][0], top[0][1]);
    top.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
    top.slice().reverse().forEach(([x, y]) => shape.lineTo(x, y - thickness));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    geo.translate(0, 0, -length / 2);
    return geo;
  }

  // Tuile romane : un plat puis un bourrelet arrondi
  function romanTileGeometry(width, length) {
    const r = width * 0.22;
    const cx = width / 2 - r - 0.01;
    const top = [[-width / 2, 0], [cx - r, 0]];
    for (let i = 1; i < 12; i++) {
      const a = Math.PI - (i / 12) * Math.PI;
      top.push([cx + r * Math.cos(a), r * Math.sin(a) * 0.9]);
    }
    top.push([cx + r, 0], [width / 2, 0]);
    return extrudeProfile(top, 0.014, length);
  }

  // Plaque de bac acier : trois nervures trapézoïdales
  function steelPanelGeometry(width, length) {
    const rib = 0.045;
    const top = [[-width / 2, 0]];
    for (let i = -1; i <= 1; i++) {
      const c = (i * width) / 3;
      top.push([c - 0.07, 0], [c - 0.03, rib], [c + 0.03, rib], [c + 0.07, 0]);
    }
    top.push([width / 2, 0]);
    return extrudeProfile(top, 0.006, length);
  }

  function buildHouse() {
    const T = maps();
    seed = 11;
    const group = new THREE.Group();
    const std = (hex, roughness = 0.85, metalness = 0, extra = {}) =>
      new THREE.MeshStandardMaterial({ color: col(hex), roughness, metalness, ...extra });
    const add = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const varied = (n, amount) => Array.from({ length: n }, () => new THREE.Color().setScalar(1 - amount + rand() * amount * 1.4));

    // Terrain : îlot vu en coupe (terre végétale, cailloux), gazon, allée et terrasse en dalles, massifs
    const island = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 6.0, 0.5, 96), [
      surface(T.soil, M.soil, 1),
      surface(T.grass, M.grass, 1),
      std(M.soil, 1),
    ]);
    island.position.y = -0.25;
    island.receiveShadow = true;
    group.add(island);
    group.add(contactShadow());

    const stoneMat = withUvOffset(surface(T.paving, M.stone, 0.85));
    const slabs = [];
    const slab = (x, z, w, d) => slabs.push({ m: inWorld(x, 0.025, z, w, 0.05, d), k: 0 });
    for (let i = 0; i < 4; i++) [-1, 1].forEach((side) => slab(-2.3 + side * 0.3, 3.86 + i * 0.47, 0.57, 0.44));
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) slab(-3.1 + i * 0.62, -HALF - 0.37 - j * 0.62, 0.6, 0.6);
    const slabGeo = new THREE.BoxGeometry(1, 1, 1);
    slabGeo.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(Float32Array.from({ length: slabs.length * 2 }, rand), 2));
    const slabMesh = new THREE.InstancedMesh(slabGeo, stoneMat, slabs.length);
    slabs.forEach((item, i) => {
      slabMesh.setMatrixAt(i, item.m);
      slabMesh.setColorAt(i, new THREE.Color().setScalar(0.86 + rand() * 0.22));
    });
    slabMesh.receiveShadow = true;
    slabMesh.castShadow = true;
    group.add(slabMesh);

    // Massifs : des centaines de bouquets de feuilles détourés, plus sombres vers le cœur
    const BUSHES = [[-4.75, 2.6, 0.66], [4.85, 2.7, 0.74], [-4.55, -3.2, 0.6], [4.5, -3.4, 0.66], [-1.2, HALF + 0.55, 0.42], [1.45, HALF + 0.5, 0.38], [3.6, -HALF - 0.6, 0.45]];
    if (T.leaves) {
      const cards = [];
      const shades = [];
      BUSHES.forEach(([x, z, r]) => {
        const n = Math.round(150 * r * r / 0.36);
        for (let i = 0; i < n; i++) {
          const th = rand() * Math.PI * 2;
          const up = Math.acos(1 - rand() * 1.15);              // surtout le dessus et les flancs
          const depth = 0.55 + 0.45 * Math.cbrt(rand());
          _p.set(Math.sin(up) * Math.cos(th), Math.cos(up) * 0.9 + 0.2, Math.sin(up) * Math.sin(th)).multiplyScalar(r * depth);
          _q.setFromEuler(_e.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI));
          const size = r * (0.75 + 0.5 * rand());
          cards.push(new THREE.Matrix4().compose(_v.set(x + _p.x, Math.max(0.05, _p.y + r * 0.55), z + _p.z), _q, _s.set(size, size, size)));
          const light = 0.55 + 0.45 * depth * (0.6 + 0.4 * Math.cos(up));
          shades.push(new THREE.Color(light * (0.98 + rand() * 0.14), light, light * (0.66 + rand() * 0.16)));
        }
      });
      const leafMat = new THREE.MeshStandardMaterial({ map: T.leaves, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, envMapIntensity: 0.3 });
      const leafMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), leafMat, cards.length);
      cards.forEach((m, i) => {
        leafMesh.setMatrixAt(i, m);
        leafMesh.setColorAt(i, shades[i]);
      });
      leafMesh.castShadow = true;
      leafMesh.receiveShadow = true;
      leafMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: T.leaves, alphaTest: 0.45 });
      group.add(leafMesh);
    } else {
      const bushGeo = new THREE.IcosahedronGeometry(0.6, 1);
      const bushMats = [std(M.bush, 0.95, 0, { flatShading: true }), std(M.bushDark, 0.95, 0, { flatShading: true })];
      BUSHES.forEach(([x, z, r], i) => {
        const bush = add(new THREE.Mesh(bushGeo, bushMats[i % 2]));
        bush.position.set(x, r * 0.75, z);
        bush.scale.setScalar(r / 0.6);
        bush.rotation.set(rand(), rand() * 3, rand());
      });
    }

    // Maçonnerie : murs enduits, pignons, soubassement
    const wallMat = surface(T.render, M.wall, 0.95);
    add(new THREE.Mesh(metricBox(W, H, D), wallMat)).position.y = H / 2;
    const gable = new THREE.Shape();
    gable.moveTo(-HALF, 0);
    gable.lineTo(HALF, 0);
    gable.lineTo(0, R);
    gable.lineTo(-HALF, 0);
    const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.24, bevelEnabled: false });
    gableGeo.translate(0, 0, -0.12);
    gableGeo.rotateY(Math.PI / 2);
    [-1, 1].forEach((sx) => {
      add(new THREE.Mesh(gableGeo, wallMat)).position.set(sx * (W / 2 - 0.12), H, 0);
    });
    add(new THREE.Mesh(metricBox(W + 0.12, 0.45, D + 0.12), surface(T.render, M.plinth, 0.9))).position.y = 0.225;

    // Menuiseries : fenêtres à deux vantaux, appuis, volets, porte d'entrée
    const frameMat = std(M.frame, 0.4);
    const glassMat = std(M.glass, 0.04, 0.3, { envMapIntensity: 1.7 });
    const surroundMat = surface(T.render, '#efe8da', 0.9);
    const sillMat = surface(T.paving, M.sill, 0.75);
    const shutterMat = surface(T.planks, M.shutter, 0.6);
    const onWall = (axis, side, u, y, w, h, depth, out, mat) => {
      const mesh = add(new THREE.Mesh(unit, mat));
      const d = (axis === 'z' ? HALF : W / 2) + out;
      if (axis === 'z') {
        mesh.scale.set(w, h, depth);
        mesh.position.set(u, y, side * d);
      } else {
        mesh.scale.set(depth, h, w);
        mesh.position.set(side * d, y, u);
      }
    };
    const windowAt = (axis, side, u, y, w, h, shutters) => {
      onWall(axis, side, u, y + 0.02, w + 0.36, h + 0.36, 0.03, 0, surroundMat);    // encadrement en relief
      onWall(axis, side, u, y, w + 0.12, h + 0.12, 0.05, 0.005, frameMat);
      onWall(axis, side, u, y, w, h, 0.05, 0.02, glassMat);
      onWall(axis, side, u, y, 0.05, h, 0.05, 0.03, frameMat);
      onWall(axis, side, u, y - h / 2 - 0.1, w + 0.3, 0.07, 0.2, 0.08, sillMat);
      if (shutters) {
        [-1, 1].forEach((k) => onWall(axis, side, u + k * (w / 2 + 0.3), y + 0.02, 0.5, h + 0.16, 0.04, 0.03, shutterMat));
      }
    };
    windowAt('z', 1, 0, 1.95, 1.0, 1.2, true);
    windowAt('z', 1, 2.6, 1.95, 1.0, 1.2, true);
    [-2.4, 0, 2.4].forEach((x) => windowAt('z', -1, x, 1.95, 0.9, 1.2, true));
    [-1, 1].forEach((sx) => {
      windowAt('x', sx, 0, 1.95, 0.9, 1.2, true);
      windowAt('x', sx, 0, H + 0.95, 0.6, 0.7, false);
    });
    onWall('z', 1, -2.3, 1.5, 1.12, 2.16, 0.05, 0.005, frameMat);
    onWall('z', 1, -2.3, 1.48, 1.0, 2.06, 0.05, 0.02, surface(T.planks, M.door, 0.5));
    onWall('z', 1, -2.3, 2.15, 0.5, 0.5, 0.05, 0.03, glassMat);
    onWall('z', 1, -1.95, 1.45, 0.05, 0.18, 0.05, 0.05, std(M.handle, 0.4, 0.6));
    onWall('z', 1, -2.3, 1.5, 1.4, 2.34, 0.03, 0, surroundMat);
    // Auvent en béton au-dessus de la porte, applique murale allumée à côté
    const canopy = add(new THREE.Mesh(metricBox(1.7, 0.1, 0.8), surface(T.render, M.concrete, 0.85)));
    canopy.position.set(-2.3, 2.86, HALF + 0.4);
    onWall('z', 1, -1.32, 2.2, 0.12, 0.2, 0.1, 0.05, std('#2b2d2f', 0.5, 0.4));
    onWall('z', 1, -1.32, 2.2, 0.08, 0.12, 0.1, 0.07, std('#fff3d6', 0.4, 0, { emissive: col('#ffcf87'), emissiveIntensity: 0.6 }));
    const step = (w, h, d, y, z) => {
      const mesh = add(new THREE.Mesh(unit, stoneMat));
      mesh.scale.set(w, h, d);
      mesh.position.set(-2.3, y, z);
    };
    step(1.6, 0.22, 0.7, 0.11, HALF + 0.41);
    step(1.3, 0.22, 0.38, 0.33, HALF + 0.25);

    // Souche de cheminée en brique, couronnement et mitrons
    const chimneyTop = H + R + 1.25;
    const chimney = add(new THREE.Mesh(metricBox(CW, chimneyTop - H, CW), surface(T.brick, M.terracotta, 0.9)));
    chimney.position.set(CX, (chimneyTop + H) / 2, 0);
    const capping = add(new THREE.Mesh(unit, surface(T.render, M.concrete, 0.9)));
    capping.scale.set(CW + 0.14, 0.12, CW + 0.14);
    capping.position.set(CX, chimneyTop + 0.06, 0);
    const potGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.34, 14);
    const potMat = std(M.terracotta, 0.8);
    [-0.2, 0.2].forEach((dx) => add(new THREE.Mesh(potGeo, potMat)).position.set(CX + dx, chimneyTop + 0.29, 0));

    // Les couches de la toiture, dans l'ordre du chantier
    const layers = [];
    function layer(glow, listed = true) {
      const l = { glow: col(glow), group: new THREE.Group(), parts: [], state: '', u: 0, presence: 1 };
      group.add(l.group);
      if (listed) layers.push(l);
      return l;
    }
    function part(l, geo, mat, items, colors) {
      if (mat.userData.uvOffset) {
        geo = geo.clone();
        geo.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(Float32Array.from({ length: items.length * 2 }, rand), 2));
      }
      const mesh = new THREE.InstancedMesh(geo, mat, items.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      items.forEach((item, i) => {
        mesh.setMatrixAt(i, item.m);
        if (colors) mesh.setColorAt(i, colors[i]);
      });
      const p = {
        mesh, mat, colors,
        bases: items.map((it) => it.m),
        keys: items.map((it) => it.k),
        ys: items.map((it) => it.m.elements[13]),        // hauteur de chaque pièce, pour le démoussage
      };
      l.parts.push(p);
      l.group.add(mesh);
      return p;
    }

    // 1. Charpente en bois : chevrons, panne faîtière, pannes, sablières, chevêtre
    const charpente = layer(M.wood);
    const rafters = [];
    SLOPES.forEach((slope) => RAFTERS.forEach((x, i) => {
      const s0 = rafterStart(x);
      rafters.push({ m: onSlope(slope, x, 0.09, (s0 + LEN) / 2, 0.08, 0.18, LEN - s0), k: i / 16 });
    }));
    const woodMat = (hex) => withUvOffset(surface(T.wood, hex, 0.85));
    part(charpente, grainBox('z'), woodMat(M.wood), rafters, varied(rafters.length, 0.12));
    const cut = RAFTERS.filter((x) => rafterStart(x) > 0);
    const trimLeft = Math.max(...RAFTERS.filter((x) => x < cut[0]));
    const trimRight = Math.min(...RAFTERS.filter((x) => x > cut[cut.length - 1]));
    const beams = [];
    aroundChimney(-W / 2 - 0.05, W / 2 + 0.05, 0.02).forEach(([a, b]) => {
      beams.push({ m: inWorld((a + b) / 2, H + R - 0.02, 0, b - a, 0.24, 0.14), k: 0.5 });
    });
    [1, -1].forEach((side) => beams.push({ m: inWorld(0, H + 0.07, side * (HALF - 0.12), W - 0.1, 0.14, 0.16), k: 0 }));
    SLOPES.forEach((slope) => {
      beams.push({ m: onSlope(slope, 0, -0.08, RAMPANT * 0.5, W - 0.5, 0.16, 0.12), k: 0.3 });
      beams.push({ m: onSlope(slope, (trimLeft + trimRight) / 2, 0.09, 0.62, trimRight - trimLeft, 0.18, 0.08), k: 0.8 });
    });
    part(charpente, grainBox('x'), woodMat(M.wood), beams, varied(beams.length, 0.1));

    // 2. Isolation : laine de verre entre les chevrons
    const isolation = layer(M.wool);
    const wool = [];
    const bay = RAFTERS[1] - RAFTERS[0];
    SLOPES.forEach((slope) => {
      for (let i = 0; i < RAFTERS.length - 1; i++) {
        const x = (RAFTERS[i] + RAFTERS[i + 1]) / 2;
        const s0 = nearChimney(x, 0.3) ? 0.7 : 0.06;
        const s1 = RAMPANT - 0.05;
        wool.push({ m: onSlope(slope, x, 0.09, (s0 + s1) / 2, bay - 0.09, 0.17, s1 - s0), k: i / 15 });
      }
    });
    part(isolation, unit, withUvOffset(surface(T.wool, M.wool, 1)), wool);

    // 3. Écran sous-toiture, posé en lés depuis l'égout, tenu par les contre-liteaux
    const ecran = layer(M.screen);
    const strips = [];
    SLOPES.forEach((slope) => {
      for (let r = 0; r < 3; r++) {
        strips.push({ m: onSlope(slope, 0, 0.183 + r * 0.002, LEN - (r + 0.5) * (LEN / 3), 2 * RX - 0.1, 0.006, LEN / 3 + 0.12), k: r / 2 });
      }
    });
    part(ecran, unit, surface(T.screen, M.screen, 0.6), strips);
    const counter = [];
    SLOPES.forEach((slope) => RAFTERS.forEach((x, i) => {
      const s0 = rafterStart(x);
      counter.push({ m: onSlope(slope, x, 0.2, (s0 + LEN) / 2, 0.045, 0.03, LEN - s0), k: 0.4 + 0.6 * (i / 16) });
    }));
    part(ecran, grainBox('z'), woodMat(M.batten), counter, varied(counter.length, 0.12));

    // 4. Couverture : liteaux communs, puis l'une des quatre couvertures, chacune avec son faîtage
    const couverture = layer(M.slate);
    const ROW = 0.17;                       // pureau des ardoises
    const TW = 0.3;
    const TL = 0.4;
    const span = (Math.ceil((2 * RX) / TW) * TW) / 2;
    const battens = [];
    SLOPES.forEach((slope) => {
      const rows = Math.ceil((LEN + 0.03) / ROW);
      for (let r = 0; r < rows; r++) {
        const s = LEN + 0.03 - r * ROW - TL + 0.06;
        if (s < -0.2) continue;                         // pas de liteau au-delà du faîtage
        battens.push({ m: onSlope(slope, 0, 0.229, s, 2 * RX - 0.04, 0.027, 0.05), k: r / (rows - 1) });
      }
    });
    part(couverture, grainBox('x'), woodMat(M.batten), battens, varied(battens.length, 0.12));

    // Pose rang par rang depuis l'égout ; offset = joints croisés, clip = demi-pièces en rive
    function lay({ row, tw, offset, clip }, put) {
      const rows = Math.ceil((LEN + 0.03) / row);
      const half = (Math.ceil((2 * RX) / tw) * tw) / 2;
      SLOPES.forEach((slope) => {
        for (let r = 0; r < rows; r++) {
          const lower = LEN + 0.03 - r * row;                  // bord bas du rang
          const shift = offset ? (r % 2) * (tw / 2) : 0;
          for (let j = 0; j <= Math.ceil((2 * half) / tw); j++) {
            const left = -half - shift + j * tw;
            const a = Math.max(left, -half);
            const b = Math.min(left + tw, half);
            if (b - a < (clip ? 0.06 : tw - 0.001)) continue;
            const x = (a + b) / 2;
            if (nearChimney(x, -0.05) && lower < 0.38) continue;     // pièce entièrement dans la souche
            put(slope, x, b - a, lower, (r / (rows - 1)) * 0.92 + rand() * 0.08);
          }
        }
      });
    }
    const terracotta = (n) => Array.from({ length: n }, () => {
      const shade = 0.78 + rand() * 0.36;
      return new THREE.Color(shade, shade * (0.92 + rand() * 0.12), shade * (0.88 + rand() * 0.12));
    });

    // Faîtage de l'ardoise et des tuiles : tuiles faîtières en terre cuite scellées au mortier,
    // d'une rive à l'autre, jusqu'à la cheminée, avec les bouts fermés au mortier
    const RIDGE_HALF = 4.42;                                   // couvre la plus large des couvertures
    const ridgeGeo = new THREE.CylinderGeometry(0.17, 0.2, 0.44, 16, 1, true, 0, Math.PI);
    ridgeGeo.rotateZ(Math.PI / 2);
    const ridgeEnd = new THREE.CircleGeometry(0.19, 16, 0, Math.PI);
    ridgeEnd.rotateY(Math.PI / 2);
    const ridgeCount = Math.round((2 * RIDGE_HALF) / 0.4);
    const clayMat = (hex, pair, extra = {}) => withUvOffset(surface(pair, hex, 0.8, extra));
    function ridge(l) {
      const tiles = [];
      for (let i = 0; i < ridgeCount; i++) {
        const x = -RIDGE_HALF + 0.22 + (i * (2 * RIDGE_HALF - 0.44)) / (ridgeCount - 1);
        if (Math.abs(x - CX) < CW / 2) continue;               // seule la tuile prise dans la souche disparaît
        tiles.push({ m: inWorld(x, H + R + 0.31, 0), k: 0.9 + 0.1 * (i / (ridgeCount - 1)) });
      }
      part(l, ridgeGeo, clayMat(M.terracotta, T.clayRidge, { side: THREE.DoubleSide }), tiles, varied(tiles.length, 0.1));
      const mortar = [];
      aroundChimney(-RIDGE_HALF, RIDGE_HALF, -0.05).forEach(([a, b]) => [1, -1].forEach((side) => {
        mortar.push({ m: inWorld((a + b) / 2, H + R + 0.25, side * 0.15, b - a, 0.1, 0.1), k: 0.88 });
      }));
      [-1, 1].forEach((side) => mortar.push({ m: inWorld(side * (RIDGE_HALF - 0.01), H + R + 0.24, 0, 0.02, 0.12, 0.38), k: 1 }));
      part(l, unit, surface(T.render, M.mortar, 0.95), mortar);
      part(l, ridgeEnd, std(M.mortar, 0.95, 0, { side: THREE.DoubleSide }),
        [-1, 1].map((side) => ({ m: inWorld(side * (RIDGE_HALF - 0.01), H + R + 0.31, 0), k: 1 })));
    }

    const coverings = {};

    // Ardoises au crochet inox
    coverings.ardoise = layer(M.slate, false);
    const slates = [];
    const hooks = [];
    const tints = [];
    lay({ row: ROW, tw: TW, offset: true, clip: true }, (slope, x, w, lower, k) => {
      slates.push({ m: onSlope(slope, x, 0.258, lower - TL / 2, w - 0.012, 0.012, TL, -0.03), k });
      hooks.push({ m: onSlope(slope, x, 0.266, lower + 0.012, 0.016, 0.008, 0.05), k });
      const shade = 0.66 + rand() * 0.26;                    // ardoises naturelles : gris anthracite nuancé
      tints.push(new THREE.Color(shade * (0.97 + rand() * 0.05), shade * (0.97 + rand() * 0.04), shade * (0.97 + rand() * 0.06)));
    });
    const slateMat = withUvOffset(surface(T.slate, M.slate, 0.62));
    coverings.ardoise.surface = part(coverings.ardoise, unit, slateMat, slates, tints);
    part(coverings.ardoise, unit, std(M.hook, 0.3, 0.8), hooks);
    ridge(coverings.ardoise);

    // Petites tuiles plates à joints croisés
    coverings.plate = layer(M.flatTile, false);
    const flat = [];
    lay({ row: 0.13, tw: 0.22, offset: true, clip: true }, (slope, x, w, lower, k) => {
      flat.push({ m: onSlope(slope, x, 0.258, lower - 0.16, w - 0.012, 0.014, 0.32, -0.04), k });
    });
    coverings.plate.surface = part(coverings.plate, unit, clayMat(M.flatTile, T.clay, { roughness: 0.85 }), flat, terracotta(flat.length));
    ridge(coverings.plate);

    // Tuiles romanes à emboîtement
    coverings.romane = layer(M.romanTile, false);
    const roman = [];
    lay({ row: 0.33, tw: 0.3, offset: false, clip: false }, (slope, x, w, lower, k) => {
      roman.push({ m: onSlope(slope, x, 0.256, lower - 0.21, 1, 1, 1, -0.035), k });
    });
    coverings.romane.surface = part(coverings.romane, romanTileGeometry(0.3, 0.42), clayMat(M.romanTile, T.clayRoman, { roughness: 0.75 }), roman, terracotta(roman.length));
    ridge(coverings.romane);

    // Bac acier : plaques nervurées du faîtage à l'égout, posées d'un pignon à l'autre,
    // vissées sur les nervures ; faîtage en acier de la même teinte
    coverings.acier = layer(M.steel, false);
    const PANELS = 9;
    const PW = (2 * RX) / PANELS;
    const panelLen = LEN + 0.05;
    const panels = [];
    const screws = [];
    SLOPES.forEach((slope) => {
      for (let i = 0; i < PANELS; i++) {
        const x = -RX + (i + 0.5) * PW;
        const k = i / (PANELS - 1);
        panels.push({ m: onSlope(slope, x, 0.2485, -0.02 + panelLen / 2), k });
        for (let rib = -1; rib <= 1; rib++) {
          const rx = x + (rib * PW) / 3;
          [0.4, 1.5, 2.6, 3.7].forEach((s) => {              // une ligne de vis par liteau porteur
            if (!(nearChimney(rx, 0.02) && s < 0.6)) screws.push({ m: onSlope(slope, rx, 0.2985, s), k: Math.min(1, k + 0.04) });
          });
        }
      }
    });
    const screwGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8);
    const steelMat = () => new THREE.MeshStandardMaterial({
      color: col(M.steel), map: T.steel.map, normalMap: T.steel.normalMap, roughness: 0.45, metalness: 0.15, envMapIntensity: 1,
    });
    coverings.acier.surface = part(coverings.acier, steelPanelGeometry(PW, panelLen), steelMat(), panels,
      panels.map(() => new THREE.Color(1, 1, 1)));
    part(coverings.acier, screwGeo, std(M.screw, 0.35, 0.6), screws);
    // Faîtage en acier sur closoirs en mousse, qui ferment les nervures jusqu'à la cheminée
    const steelRidge = [];
    const closures = [];
    const ridgeScrews = [];
    SLOPES.forEach((slope) => {
      aroundChimney(-RX, RX, -0.05).forEach(([a, b]) => {
        steelRidge.push({ m: onSlope(slope, (a + b) / 2, 0.305, 0.01, b - a, 0.008, 0.54), k: 0.95 });
        closures.push({ m: onSlope(slope, (a + b) / 2, 0.275, 0.01, b - a, 0.052, 0.5), k: 0.93 });
        for (let x = a + 0.2; x < b - 0.1; x += 0.6) ridgeScrews.push({ m: onSlope(slope, x, 0.312, 0.2), k: 1 });
      });
    });
    part(coverings.acier, unit, steelMat(), steelRidge);
    part(coverings.acier, unit, std('#24272a', 0.95), closures);
    part(coverings.acier, screwGeo, std(M.screw, 0.35, 0.6), ridgeScrews);

    // 5. Zinguerie : gouttières demi-rondes et leurs crochets, descentes, bandes de rive, abergement
    const zinguerie = layer(M.zinc);
    const zinc = (double) => std(M.zinc, 0.45, 0.3, double ? { side: THREE.DoubleSide } : {});
    const GR = 0.12;
    const gutterGeo = new THREE.CylinderGeometry(GR, GR, 2 * RX + 0.1, 20, 1, true, Math.PI, Math.PI);
    gutterGeo.rotateZ(Math.PI / 2);
    const lipGeo = new THREE.CylinderGeometry(0.014, 0.014, 2 * RX + 0.1, 8);
    lipGeo.rotateZ(Math.PI / 2);
    const hangerGeo = new THREE.TorusGeometry(GR + 0.008, 0.007, 4, 12, Math.PI);
    hangerGeo.rotateY(Math.PI / 2);
    hangerGeo.rotateX(Math.PI);
    const gutters = [];
    const lips = [];
    const hangers = [];
    const pipes = [];
    const fittings = [];
    [1, -1].forEach((side, i) => {
      const g = new THREE.Vector3(0, 0.12, LEN + 0.08).applyMatrix4(SLOPES[i]);
      gutters.push({ m: inWorld(0, g.y, g.z), k: 0 });
      lips.push({ m: inWorld(0, g.y, g.z + side * GR), k: 0 });
      for (let x = -RX + 0.3; x <= RX - 0.25; x += 0.7) hangers.push({ m: inWorld(x, g.y, g.z), k: 0.1 });
      [-1, 1].forEach((sx) => {
        const x = sx * 3.8;
        const top = new THREE.Vector3(x, g.y - GR + 0.02, g.z);
        const bend = new THREE.Vector3(x, g.y - 0.55, side * (HALF + 0.1));
        const foot = new THREE.Vector3(x, 0.32, side * (HALF + 0.1));
        pipes.push({ m: between(top, bend), k: 0.25 }, { m: between(bend, foot), k: 0.25 });
        [0.9, 1.8, 2.6].forEach((y) => fittings.push({ m: inWorld(x, y, side * (HALF + 0.06), 0.15, 0.045, 0.1), k: 0.3 }));
      });
    });
    SLOPES.forEach((slope) => [-1, 1].forEach((sx) => {
      fittings.push({ m: onSlope(slope, sx * (span + 0.02), 0.272, LEN / 2, 0.07, 0.06, LEN + 0.04), k: 0.6 });
    }));
    fittings.push({ m: inWorld(CX, H + R + 0.02, 0, CW + 0.08, 0.38, CW + 0.08), k: 0.75 });   // abergement
    part(zinguerie, gutterGeo, zinc(true), gutters);
    part(zinguerie, lipGeo, zinc(), lips);
    part(zinguerie, hangerGeo, zinc(), hangers);
    part(zinguerie, new THREE.CylinderGeometry(0.05, 0.05, 1, 12), zinc(), pipes);
    part(zinguerie, unit, zinc(), fittings);

    // 6. Démoussage : mousses et lichens sur chaque couverture, nettoyage du faîtage vers l'égout,
    //    puis traitement anti-mousse et hydrofuge
    const lichenGeo = new THREE.CircleGeometry(1, 14);
    lichenGeo.rotateX(-Math.PI / 2);                            // à plat sur le versant
    const clumpGeo = new THREE.IcosahedronGeometry(1, 1);
    const LICHEN = ['#c9c4a0', '#b9bb92', '#a7ad80', '#d3b65a', '#c4a24a', '#bfc0a2'];
    const MOSS = ['#5f7a2c', '#6e8a35', '#4f6a26', '#86983f', '#6b6a30', '#435a22'];
    const pick = (list) => col(list[Math.floor(rand() * list.length)]);
    // Les mousses poussent en plaques, plus nombreuses vers l'égout où l'eau s'attarde
    const bell = () => (rand() + rand() + rand() - 1.5) / 1.5;          // -1 → 1, resserré au centre
    const patches = SLOPES.map(() => Array.from({ length: 16 }, () => ({
      x: (rand() * 2 - 1) * (RX - 0.3),
      s: 0.5 + Math.sqrt(rand()) * (LEN - 0.8),
      r: 0.3 + rand() * 0.5,
    })));
    // Une pousse : le plus souvent dans une plaque, parfois isolée
    function sprout(j) {
      if (rand() < 0.15) return { x: (rand() * 2 - 1) * RX, s: 0.3 + rand() * (LEN - 0.4) };
      const p = patches[j][Math.floor(rand() * patches[j].length)];
      return { x: p.x + bell() * p.r * 1.6, s: Math.min(LEN - 0.1, Math.max(0.3, p.s + bell() * p.r)) };
    }
    // Où se fixent les lichens (à plat, rayon maximal rMax) et les coussinets de mousse sur chaque couverture :
    // sur les tuiles romanes et le bac acier, dans le plat entre les bourrelets ou les nervures
    const alongRidge = (x) => Math.max(0.15 - RX, Math.min(RX - 0.15, x));
    const spots = {
      ardoise: (x) => ({ x: alongRidge(x), h: 0.273, rMax: 0.135 }),
      plate: (x) => ({ x: alongRidge(x), h: 0.274, rMax: 0.135 }),
      romane: (x, flat) => {
        const center = -4.35 + (Math.min(28, Math.max(0, Math.floor((x + 4.35) / 0.3))) + 0.5) * 0.3;
        return flat ? { x: center - 0.071, h: 0.266, rMax: 0.06 } : { x: center - 0.06 + (rand() - 0.5) * 0.05, h: 0.258 };
      },
      acier: (x) => {
        const panel = Math.min(PANELS - 1, Math.max(0, Math.floor((x + RX) / PW)));
        return { x: -RX + (panel + 0.5) * PW + (rand() < 0.5 ? -1 : 1) * (PW / 6), h: 0.2505, rMax: 0.08 };
      },
    };
    // Encrassement de chaque pièce : plus fort autour des plaques de mousse, jamais uniforme
    const patchCenters = patches.flatMap((list, j) => list.map((p) => {
      const e = onSlope(SLOPES[j], p.x, 0.26, p.s).elements;
      return { x: e[12], y: e[13], z: e[14], r2: 2 * (1.4 * p.r) ** 2 };
    }));
    function grimeOf(surface) {
      return surface.bases.map((m) => {
        const e = m.elements;
        let near = 0;
        for (const c of patchCenters) {
          const d2 = (e[12] - c.x) ** 2 + (e[13] - c.y) ** 2 + (e[14] - c.z) ** 2;
          near = Math.max(near, Math.exp(-d2 / c.r2));
        }
        return clamp01(0.3 + 0.75 * near + 0.3 * (rand() - 0.5));
      });
    }
    const mosses = {};
    const grime = {};
    Object.keys(coverings).forEach((name) => {
      const moss = layer(M.grass, false);
      const lichens = [];
      const lichenColors = [];
      const clumps = [];
      const clumpColors = [];
      SLOPES.forEach((slope, j) => {
        for (let i = 0; i < 150; i++) {
          const at = sprout(j);
          const { x, h, rMax } = spots[name](at.x, true);
          if (nearChimney(x, 0.15) && at.s < 0.7) continue;
          const r = Math.min(rMax, 0.025 + rand() * rand() * 0.11);
          lichens.push({ m: onSlope(slope, x, h, at.s, r, 1, r), k: rand() });
          lichenColors.push(pick(LICHEN));
        }
        for (let i = 0; i < 320; i++) {
          const at = sprout(j);
          const { x, h } = spots[name](at.x, false);
          if (nearChimney(x, 0.15) && at.s < 0.7) continue;
          const r = 0.03 + rand() * 0.05;
          clumps.push({ m: onSlope(slope, x, h + r * 0.25, at.s, r * 1.3, r * 0.55, r), k: rand() });
          clumpColors.push(pick(MOSS));
        }
      });
      part(moss, lichenGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), lichens, lichenColors);
      part(moss, clumpGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), clumps, clumpColors);
      moss.group.visible = false;
      mosses[name] = moss;
      grime[name] = grimeOf(coverings[name].surface);
    });

    // Bandes du jet de nettoyage et du traitement, qui descendent le long des versants
    const bandMat = (hex) => new THREE.MeshBasicMaterial({
      color: col(hex), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const washMat = bandMat('#e3f2ff');
    const treatMat = bandMat(M.treatment);
    const bandGeo = new THREE.BoxGeometry(2 * RX + 0.3, 0.02, 0.34);
    const bands = SLOPES.map((slope) => {
      const holder = new THREE.Group();
      slope.decompose(holder.position, holder.quaternion, holder.scale);
      const wash = new THREE.Mesh(bandGeo, washMat);
      const treat = new THREE.Mesh(bandGeo, treatMat);
      holder.add(wash, treat);
      group.add(holder);
      return { wash, treat };
    });
    const BAND_H = 0.36;
    const sAt = (y) => (APEX.y + BAND_H * Math.cos(ALPHA) - y) / Math.sin(ALPHA);
    const WASH_TOP = H + R + 0.5;
    const WASH_BOTTOM = H - 0.4;
    const DIRT = {
      ardoise: new THREE.Color(0.72, 0.9, 0.52),
      plate: new THREE.Color(0.4, 0.44, 0.28),
      romane: new THREE.Color(0.4, 0.44, 0.28),
      acier: new THREE.Color(0.72, 0.8, 0.6),
    };
    let demoState = '';

    return {
      group,
      layers,
      coverings,
      // Pose une couche : queue = hauteur d'attente, u = avancement de la pose (0 → 1).
      // Avec appear, chaque pièce n'apparaît qu'au moment où elle commence à descendre.
      // presence fait apparaître la couche depuis l'égout (0 → 1) ou la retire depuis le faîtage (1 → 0).
      place(l, { queue = 0, u = 1, gap = 1, stagger = 0.5, appear = false, presence = 1 } = {}) {
        const state = `${queue.toFixed(4)}|${u.toFixed(4)}|${gap}|${presence.toFixed(4)}|${appear}`;
        if (state === l.state) return;
        l.state = state;
        l.u = u;
        l.presence = presence;
        let visible = false;
        for (const p of l.parts) {
          for (let i = 0; i < p.bases.length; i++) {
            const k = p.keys[i];
            const t = clamp01((u - k * stagger) / (1 - stagger));
            let scale = appear ? (t > 0 ? 0.55 + 0.45 * easeOut(clamp01(t / 0.35)) : 0) : 1;
            let lift = queue + gap * (1 - easeOut(t));
            if (presence < 1) {
              const shown = clamp01((presence - k * 0.6) / 0.4);
              scale *= shown > 0 ? 0.55 + 0.45 * easeOut(shown) : 0;
              lift += 1.6 * (1 - easeOut(shown));
            }
            _m.copy(p.bases[i]);
            if (scale !== 1) _m.scale(_s.setScalar(scale));
            _m.elements[13] += lift;
            p.mesh.setMatrixAt(i, _m);
            if (scale > 0) visible = true;
          }
          p.mesh.instanceMatrix.needsUpdate = true;
        }
        l.group.visible = visible;
      },
      // Fait légèrement briller la couche en cours de pose, dans sa vraie couleur
      highlight(l, h) {
        for (const p of l.parts) p.mat.emissive.copy(l.glow).multiplyScalar(0.32 * h);
      },
      // Démoussage d'une couverture : grow = mousses (0 → 1), wash = jet de nettoyage du faîtage vers
      // l'égout (0 → 1, puis jusqu'à 1,3 le temps que la couverture sèche), treat = traitement (0 → 1)
      demo(name, grow, wash, treat) {
        const state = `${name}|${grow.toFixed(3)}|${wash.toFixed(3)}|${treat.toFixed(3)}`;
        if (state === demoState) return;
        demoState = state;
        const line = WASH_TOP + (WASH_BOTTOM - WASH_TOP) * wash;
        const cleaned = (y) => (wash <= 0 ? 0 : clamp01((y - line) / 0.12));
        const moss = mosses[name];
        let visible = false;
        for (const p of moss.parts) {
          for (let i = 0; i < p.bases.length; i++) {
            const v = clamp01((grow - p.keys[i] * 0.6) / 0.4) * (1 - cleaned(p.ys[i]));
            _m.copy(p.bases[i]);
            if (v < 1) _m.scale(_s.setScalar(v));
            p.mesh.setMatrixAt(i, _m);
            if (v > 0) visible = true;
          }
          p.mesh.instanceMatrix.needsUpdate = true;
        }
        moss.group.visible = visible;
        const surface = coverings[name].surface;
        for (let i = 0; i < surface.bases.length; i++) {
          const c = cleaned(surface.ys[i]);
          const wet = c * (1 - clamp01((surface.ys[i] - line) / 0.9));   // juste rincée : encore mouillée
          _col.copy(surface.colors[i])
            .multiply(_tint.setRGB(1, 1, 1).lerp(DIRT[name], grow * (1 - c) * grime[name][i]))
            .multiplyScalar(1 - 0.25 * wet);
          surface.mesh.setColorAt(i, _col);
        }
        surface.mesh.instanceColor.needsUpdate = true;
        const treatLine = WASH_TOP + (WASH_BOTTOM - WASH_TOP) * treat;
        bands.forEach((b) => {
          b.wash.position.set(0, BAND_H, sAt(line));
          b.treat.position.set(0, BAND_H + 0.01, sAt(treatLine));
        });
        washMat.opacity = wash > 0 && wash < 1 ? 0.55 * Math.sin(Math.PI * wash) : 0;
        treatMat.opacity = treat > 0 && treat < 1 ? 0.5 * Math.sin(Math.PI * treat) : 0;
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

  // Direction du soleil : de face, sur la gauche, assez bas pour des ombres longues sous les débords
  const SUN = new THREE.Vector3(-8, 9.5, 8).normalize();

  // Ciel d'éclairage : dégradé du zénith à l'horizon, sol herbeux, soleil très lumineux
  function skyLight(renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    [[0, '#2c68b4'], [0.3, '#5d97d8'], [0.47, '#bcd8f0'], [0.5, '#e6eef2'], [0.53, '#8f9c78'], [1, '#4a5a34']]
      .forEach(([at, c]) => gradient.addColorStop(at, c));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 256);
    const sky = new THREE.CanvasTexture(canvas);
    sky.encoding = THREE.sRGBEncoding;
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide })));
    const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 12.5, 10.5) }));
    sunDisk.position.copy(SUN).multiplyScalar(9);
    envScene.add(sunDisk);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(envScene, 0.015).texture;
    pmrem.dispose();
    sky.dispose();
    return env;
  }

  function createStage(canvas) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
      return null;
    }
    renderer.setPixelRatio(quality.ratio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;          // tons filmiques, comme une photo
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);

    // Lumière de plein jour : le ciel éclaire et se reflète sur toutes les matières, le soleil porte les ombres
    scene.environment = skyLight(renderer);
    const sun = new THREE.DirectionalLight(col('#fff0d8'), 3.1);
    sun.position.copy(SUN).multiplyScalar(18);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(window.innerWidth < 700 ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -8.5, right: 8.5, top: 8.5, bottom: -8.5, near: 4, far: 40 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.025;
    scene.add(sun);

    const house = buildHouse();
    scene.add(house.group);
    // Le ciel éclaire moins que le soleil : ombres franches, comme en plein jour
    house.group.traverse((obj) => {
      [].concat(obj.material || []).forEach((mat) => {
        if (mat.isMeshStandardMaterial && mat.metalness < 0.2) mat.envMapIntensity = 0.5;
      });
    });

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

  const hero = createStage(heroCanvas);
  if (!hero) {
    docEl.classList.add('no-3d');
    return;
  }

  // La scène de l'anatomie n'est construite qu'à l'approche de sa section
  let anatomy = null;
  const startAnatomy = () => {
    if (anatomy) return;
    anatomy = createStage(anatomyCanvas);
    if (!anatomy) docEl.classList.add('no-3d-anatomy');
  };
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      watcher.disconnect();
      startAnatomy();
    }, { rootMargin: '800px 0px' });
    watcher.observe(anatomyCanvas);
  } else {
    startAnatomy();
  }

  // Maison du hero : couverture posée à l'arrivée, rotation lente, glisser pour la faire tourner
  const heroBase = hero.house.layers[3];
  const heroZinc = hero.house.layers[4];
  const coverings = hero.house.coverings;
  let heroStart = null;
  let yaw = 0.5;
  let spin = 0;
  let drag = null;

  // Un sélecteur de couverture : met à jour les boutons et signale le choix
  function coveringSelector(selector, onPick) {
    const buttons = Array.from(document.querySelectorAll(selector));
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        onPick(button);
      });
    });
  }

  // Choix de la couverture : l'ancienne se dépose depuis le faîtage, la nouvelle se pose depuis l'égout
  let shown = 'ardoise';
  let wanted = 'ardoise';
  let swap = null;
  const LAY = { gap: 2.4, stagger: 0.72, appear: true };
  Object.keys(coverings).forEach((name) => {
    if (name !== shown) hero.house.place(coverings[name], { ...LAY, u: 0 });
  });
  coveringSelector('.hero .covering__btn', (button) => { wanted = button.dataset.covering; });

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
    const intro = clamp01((t - 0.4) / 3.2);
    hero.house.place(heroBase, { ...LAY, u: intro });
    hero.house.place(heroZinc, { u: clamp01((t - 3.4) / 0.9), gap: 1.4, stagger: 0.5, appear: true });
    if (!swap && wanted !== shown && intro >= 1) swap = { from: shown, to: wanted, start: now };
    if (swap) {
      const s = reduceMotion ? Infinity : (now - swap.start) / 1000;
      hero.house.place(coverings[swap.from], { ...LAY, u: 1 - clamp01(s / 1.1) });
      hero.house.place(coverings[swap.to], { ...LAY, u: clamp01((s - 1.1) / 2.2) });
      if (s >= 3.3) {
        shown = swap.to;
        swap = null;
      }
    } else {
      hero.house.place(coverings[shown], { ...LAY, u: intro });
    }
    if (!drag) {
      yaw += spin * dt * 60 + (reduceMotion ? 0 : 0.12 * dt);
      spin *= Math.pow(0.0005, dt);
    }
    hero.house.group.rotation.y = yaw;
    frame(hero, _c.set(0, 2.5, 0), 6.9, 0.62, 0.4, 1);
    const laid = Object.values(coverings).map((l) => l.u).join('|');
    return `${yaw.toFixed(4)}|${heroBase.u}|${heroZinc.u}|${laid}`;
  }

  // Anatomie : la toiture se monte couche par couche au défilement
  const steps = Array.from(document.querySelectorAll('.astep'));
  const stepLabel = document.getElementById('anatomy-label');
  const stepFill = document.getElementById('anatomy-fill');
  const GAP = 0.95;
  let activeStep = -1;

  // Type de toiture de l'anatomie : le texte de l'étape Couverture suit le choix
  const coverStep = document.querySelector('[data-covering-step]');
  let aShown = 'ardoise';
  let aWanted = 'ardoise';
  let aSwap = null;
  coveringSelector('.anatomy .covering__btn', (button) => {
    aWanted = button.dataset.covering;
    coverStep.querySelector('h3').textContent = button.dataset.title;
    coverStep.querySelector('p').textContent = button.dataset.text;
    coverStep.style.setProperty('--dot', button.dataset.dot);
  });

  // Démonstration du démoussage (étape 6) : se lance en arrivant sur l'étape, se revoit avec le bouton
  const demoStatus = document.getElementById('demo-status');
  const demoReplay = document.getElementById('demo-replay');
  // [début (s), texte de l'étape, libellé court sous la maison]
  const DEMO_PHASES = [
    [0, 'Les années passent : mousses et lichens s’installent…', 'Mousses et lichens'],
    [1.9, 'Nettoyage du faîtage vers l’égout…', 'Nettoyage'],
    [5.9, 'Traitement anti-mousse et hydrofuge…', 'Traitement'],
    [7.8, 'Toiture propre et protégée.', 'Toiture protégée'],
  ];
  const DEMO_END = 9.5;           // la caméra est revenue : la démonstration s'arrête là
  let demoTime = null;            // secondes écoulées dans la démonstration (null : pas lancée)
  let demoCovering = null;
  let demoPhase = null;
  // Avec les animations réduites, elle ne part que sur demande
  const DEMO_IDLE = reduceMotion ? 'La démonstration se lance avec le bouton ci-dessous.' : demoStatus.textContent;
  if (reduceMotion) {
    demoReplay.textContent = 'Voir la démonstration';
    demoStatus.textContent = DEMO_IDLE;
  }
  demoReplay.addEventListener('click', () => { demoTime = 0; });

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

  function updateAnatomy(now, dt) {
    const t = scrollProgress();
    const house = anatomy.house;
    // Pendant le gros plan sur la couverture, la zinguerie en attente sort du cadre
    const focus = smooth(3.5, 3.9, t) * (1 - smooth(4.35, 4.75, t));
    const glowAt = (j) => smooth(j - 0.2, j + 0.4, t) * (1 - smooth(j + 1.15, j + 1.45, t));
    house.layers.forEach((l, j) => {
      const lift = j > 3 ? 1 + 30 * focus : 1;
      house.place(l, { queue: GAP * Math.max(0, j - t) * lift, u: clamp01(t - j), gap: GAP * lift, stagger: 0.45 });
      house.highlight(l, glowAt(j));
    });

    // La couverture choisie suit l'étape 4 ; un changement de type dépose l'ancienne et pose la nouvelle
    if (!aSwap && aWanted !== aShown) aSwap = { from: aShown, to: aWanted, start: now };
    const s = aSwap ? (reduceMotion ? Infinity : (now - aSwap.start) / 1000) : 0;
    Object.entries(house.coverings).forEach(([name, covering]) => {
      let presence = !aSwap && name === aShown ? 1 : 0;
      if (aSwap && name === aSwap.from) presence = 1 - clamp01(s / 0.9);
      if (aSwap && name === aSwap.to) presence = clamp01((s - 0.9) / 1.6);
      if (presence === 0 && covering.presence === 0) return;   // déjà retirée : rien à recalculer
      house.place(covering, { queue: GAP * Math.max(0, 3 - t), u: clamp01(t - 3), gap: GAP, stagger: 0.45, presence });
      house.highlight(covering, glowAt(3));
    });
    if (aSwap && s >= 2.5) {
      aShown = aSwap.to;
      aSwap = null;
    }

    // Démoussage : la démonstration démarre en arrivant sur l'étape 6 et se rejoue si l'on y revient.
    // Elle avance image par image (pas plafonné) : un chargement lent ne lui fait pas sauter d'étape.
    // Pendant un changement de couverture, elle attend la nouvelle pour repartir de zéro.
    const k = Math.min(steps.length - 1, Math.max(0, Math.round(t) - 1));
    if (demoTime !== null) demoTime = aSwap ? 0 : Math.min(DEMO_END, demoTime + dt);
    else if (k === 5 && !reduceMotion) demoTime = 0;
    if (t < 4.9) demoTime = null;
    if (demoCovering !== aShown) {
      if (demoCovering) house.demo(demoCovering, 0, 0, 0);
      demoCovering = aShown;
    }
    const d = demoTime === null ? -1 : demoTime;
    if (d < 0) house.demo(aShown, 0, 0, 0);
    else house.demo(aShown, clamp01(d / 1.4), Math.min(1.3, Math.max(0, (d - 2) / 3.6)), clamp01((d - 6) / 1.6));
    const phase = d < 0 ? null : DEMO_PHASES.filter(([at]) => d >= at).pop();
    if (phase !== demoPhase) {
      demoPhase = phase;
      demoStatus.textContent = phase ? phase[1] : DEMO_IDLE;
    }
    const demoFocus = d < 0 ? 0 : smooth(0, 1, d) * (1 - smooth(8.2, 9.4, d));

    const sway = reduceMotion ? 0 : Math.sin(now / 2600) * 0.05;
    house.group.rotation.y = -0.55 + (t / steps.length) * 0.75 + sway;

    // Les couches en attente se resserrent : la caméra se rapproche
    const top = Math.max(H + R + 1.7, H + R + 0.8 + GAP * Math.max(0, 5 - t));
    let radius = Math.max(7.6, top / 2 + 1.2);
    _c.set(0, top / 2 - 0.5, 0);
    // Gros plan sur la couverture (crochets, vis, faîtage) pendant sa pose
    if (focus > 0) {
      _f.set(0.6, H + R - 1.1, 1.5).applyAxisAngle(Y_AXIS, house.group.rotation.y);
      _c.lerp(_f, focus);
      radius += (2.6 - radius) * focus;
    }
    // Pendant le démoussage, la caméra se rapproche du versant
    if (demoFocus > 0) {
      _f.set(0.2, H + R - 1.3, 1.6).applyAxisAngle(Y_AXIS, house.group.rotation.y);
      _c.lerp(_f, demoFocus);
      radius += (4.2 - radius) * demoFocus;
    }
    frame(anatomy, _c, radius, 0.7, 0.34 + 0.12 * focus + 0.1 * demoFocus, 0.12);

    if (k !== activeStep) {
      activeStep = k;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === k));
    }
    // Pendant la démonstration, la phase en cours s'affiche sous la maison (visible aussi sur mobile)
    const label = k === 5 && demoPhase ? `06 — ${demoPhase[2]}` : steps[k].dataset.label;
    if (stepLabel.textContent !== label) stepLabel.textContent = label;
    stepFill.style.transform = `scaleX(${(t / steps.length).toFixed(4)})`;
    return `${t.toFixed(4)}|${sway.toFixed(4)}|${anatomy.eye.x.toFixed(3)}|${anatomy.eye.y.toFixed(3)}|${aShown}|${s.toFixed(3)}|${d.toFixed(2)}`;
  }

  // Fluidité : si la 3D tourne à moins de 26 images par seconde, sa définition baisse d'un cran
  // (le seuil laisse passer les écrans bridés à 30 images par seconde, en mode économie d'énergie)
  function adapt(frameTime) {
    if (quality.skip > 0) {           // premières images : envoi des matières à la carte graphique
      quality.skip -= 1;
      return;
    }
    quality.frames += 1;
    quality.time += frameTime;
    if (quality.frames < 45) return;
    const slow = quality.time / quality.frames > 1 / 26;
    quality.frames = 0;
    quality.time = 0;
    if (!slow || quality.ratio <= 0.8) return;
    quality.ratio = Math.max(0.8, quality.ratio * 0.75);
    quality.skip = 20;
    [hero, anatomy].forEach((stage) => {
      if (!stage) return;
      stage.renderer.setPixelRatio(quality.ratio);
      stage.width = 0;                // force le redimensionnement
      resize(stage);
    });
  }

  // Une seule boucle ; chaque scène n'est redessinée que si elle est visible et a changé
  let last = performance.now();
  function tick(now) {
    const frameTime = (now - last) / 1000;
    const dt = Math.min(0.05, frameTime);
    last = now;
    if (!ready) {                     // la maison attend ses matières
      requestAnimationFrame(tick);
      return;
    }
    let drawn = false;
    for (const [stage, update] of [[hero, updateHero], [anatomy, updateAnatomy]]) {
      if (!stage || !stage.visible) continue;
      const signature = `${update(now, dt)}|${stage.width}x${stage.height}|${arrived}`;
      if (signature !== stage.signature) {
        stage.signature = signature;
        stage.renderer.render(stage.scene, stage.camera);
        drawn = true;
      }
    }
    if (drawn) adapt(frameTime);
    requestAnimationFrame(tick);
  }
  docEl.classList.add('has-3d');
  requestAnimationFrame(tick);
})();
