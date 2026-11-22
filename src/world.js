// src/world.js — Monde 3D fidèle au Plan du Village (IMG_0581.JPG)
// Direction artistique Fortnite Mobile + textures procédurales détaillées + InstancedMesh herbe/arbres

import * as THREE from 'three';

// Implantation spatiale exacte basée sur le "PLAN DU VILLAGE" d'IMG_0581.JPG
export const VILLAGE_LAYOUT = {
  plaza: { x: 2, z: 4 },
  spawn: { x: 8, z: 14, yaw: 0.36 },
  bridge: { x: -24, z: 27.5, rotY: 0.22 },
  workbench: { x: 22, z: 4, rotY: -Math.PI * 0.65 },
  handcartStart: { x: 10.5, z: 8.5, rotY: -0.55 },
  quarry: { x: 50, z: -14, radius: 13 },
  extraction: { x: -45, z: -2, radius: 13 },
  brickStock: { x: 38, z: -22, radius: 5.5 },
  resourceStock: { x: -34, z: 10, radius: 5.5 },
  buildings: [
    {
      id: 'church',
      name: 'Petite Église',
      icon: '⛪',
      targetBricks: 12000,
      x: -8,
      z: -10,
      rotY: 0, // Tour à l'Ouest (-X), Abside à l'Est (+X), fidèle au plan IMG_0581
      width: 13.6,
      depth: 7.4,
      wallHeight: 4.5,
      style: 'church',
      doorSide: 'west',
      order: 7,
    },
    {
      id: 'mairie',
      name: 'Mairie',
      icon: '🏛',
      targetBricks: 8500,
      x: 26,
      z: -13,
      rotY: -0.45, // Orientée vers la place centrale
      width: 11.4,
      depth: 8.4,
      wallHeight: 5.2,
      style: 'mairie',
      doorSide: 'south',
      order: 6,
    },
    {
      id: 'house_chaumiere',
      name: 'Maison 1 : Chaumière',
      icon: '🏡',
      targetBricks: 2500,
      x: 8,
      z: -24,
      rotY: 0.12,
      width: 7.0,
      depth: 5.4,
      wallHeight: 2.9,
      style: 'chaumiere',
      doorSide: 'south',
      order: 1,
    },
    {
      id: 'house_colombages',
      name: 'Maison 2 : Colombages',
      icon: '🏠',
      targetBricks: 3500,
      x: -22,
      z: 7,
      rotY: 0.62,
      width: 7.8,
      depth: 6.0,
      wallHeight: 3.3,
      style: 'colombages',
      doorSide: 'east',
      order: 4,
    },
    {
      id: 'house_forge',
      name: 'Maison 3 : Forge',
      icon: '⚒',
      targetBricks: 4500,
      x: 15,
      z: 19,
      rotY: -0.35,
      width: 8.4,
      depth: 6.4,
      wallHeight: 3.4,
      style: 'forge',
      doorSide: 'north',
      order: 5,
    },
    {
      id: 'house_pierre',
      name: 'Maison 4 : Pierre',
      icon: '🪨',
      targetBricks: 3000,
      x: -2,
      z: 22,
      rotY: 0.1,
      width: 7.4,
      depth: 5.6,
      wallHeight: 3.1,
      style: 'pierre',
      doorSide: 'north',
      order: 3,
    },
    {
      id: 'house_marchand',
      name: 'Maison 5 : Marchand',
      icon: '🏘',
      targetBricks: 2800,
      x: 32,
      z: 16,
      rotY: -0.7,
      width: 7.2,
      depth: 5.5,
      wallHeight: 3.0,
      style: 'marchand',
      doorSide: 'north',
      order: 2,
    },
  ],
};

// Courbe de la rivière (Ouest -> Sud-Ouest -> Sud -> Sud-Est), fidèle au plan
export function getRiverCenterZ(x) {
  return 31 + Math.sin((x + 28) * 0.042) * 7.5 - Math.cos(x * 0.025) * 3.0;
}

export function isInsideRiver(x, z, margin = 0) {
  // Pont praticable autour de x = -24
  if (Math.abs(x - VILLAGE_LAYOUT.bridge.x) < 3.6 && Math.abs(z - VILLAGE_LAYOUT.bridge.z) < 7.5) {
    return false;
  }
  const rz = getRiverCenterZ(x);
  return Math.abs(z - rz) < (4.4 + margin);
}

// Générateur de textures procédurales haute lisibilité (Canvas 2D -> THREE.CanvasTexture)
export function createProceduralTextures() {
  const makeCanvas = (w, h, drawFn, repeatX = 1, repeatY = 1) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 4;
    return tex;
  };

  // 1. Pierre taillée (Petite Église, Mairie, Maison de Pierre)
  const stone = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8b8a82';
    ctx.fillRect(0, 0, w, h);
    const rows = 6;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * 32;
      const cols = 4;
      const colW = w / cols;
      for (let c = -1; c <= cols; c++) {
        const shade = 152 + Math.floor(Math.random() * 34);
        const warm = Math.floor(Math.random() * 14);
        ctx.fillStyle = `rgb(${shade + warm}, ${shade + warm - 3}, ${shade - 8})`;
        ctx.fillRect(c * colW + offset + 3, r * rowH + 3, colW - 6, rowH - 6);
        // Reflet supérieur doux
        ctx.fillStyle = 'rgba(255,250,235,0.16)';
        ctx.fillRect(c * colW + offset + 3, r * rowH + 3, colW - 6, 4);
      }
    }
    // Grain minéral fin
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(30,25,20,0.09)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 1, 1);

  // 2. Briques de construction (textures riches & lisible par bloc)
  const brick = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c8c1b4'; // Mortier clair
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 32;
      for (let c = -1; c <= 4; c++) {
        const v = 175 + Math.floor(Math.random() * 35);
        ctx.fillStyle = `rgb(${v}, ${v - 8}, ${v - 18})`;
        ctx.fillRect(c * 64 + off + 2, r * rowH + 2, 60, rowH - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(c * 64 + off + 2, r * rowH + 2, 60, 3);
      }
    }
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = 'rgba(50,35,20,0.08)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 1, 1);

  // 3. Colombages en bois & torchis crème
  const timber = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f1e4ca';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = 'rgba(130,100,65,0.07)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    ctx.fillStyle = '#5c381c';
    ctx.fillRect(0, 0, w, 24);
    ctx.fillRect(0, h - 24, w, 24);
    ctx.fillRect(0, 0, 24, h);
    ctx.fillRect(w - 24, 0, 24, h);
    ctx.fillRect(w * 0.5 - 10, 0, 20, h);
    ctx.strokeStyle = '#5c381c';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(14, h - 14);
    ctx.lineTo(w * 0.5, 20);
    ctx.lineTo(w - 14, h - 14);
    ctx.stroke();
  }, 1, 1);

  // 4. Chaume doré réaliste
  const thatch = makeCanvas(256, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#dfc066');
    grad.addColorStop(1, '#b68a32');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.strokeStyle = Math.random() > 0.45 ? 'rgba(255,236,160,0.42)' : 'rgba(110,75,20,0.38)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y + 14 + Math.random() * 14);
      ctx.stroke();
    }
    // Bandes de rangs superposés
    for (let y = 32; y < h; y += 42) {
      ctx.fillStyle = 'rgba(92,62,18,0.22)';
      ctx.fillRect(0, y, w, 5);
    }
  }, 2, 2);

  // 5. Tuiles terre cuite & ardoises
  const roofRed = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9c3f26';
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      const y = r * 32;
      const off = (r % 2) * 16;
      for (let c = -1; c < 9; c++) {
        const x = c * 32 + off;
        const delta = Math.floor(Math.random() * 24) - 12;
        ctx.fillStyle = `rgb(${182 + delta}, ${78 + Math.floor(delta * 0.5)}, ${48 + Math.floor(delta * 0.3)})`;
        ctx.fillRect(x + 2, y + 2, 28, 28);
        ctx.fillStyle = 'rgba(255,215,175,0.18)';
        ctx.fillRect(x + 2, y + 2, 28, 5);
        ctx.fillStyle = 'rgba(45,15,8,0.25)';
        ctx.fillRect(x + 2, y + 26, 28, 4);
      }
    }
  }, 2, 2);

  const roofSlate = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#47505c';
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      const y = r * 32;
      const off = (r % 2) * 16;
      for (let c = -1; c < 9; c++) {
        const x = c * 32 + off;
        const d = Math.floor(Math.random() * 22) - 11;
        ctx.fillStyle = `rgb(${84 + d}, ${92 + d}, ${106 + d})`;
        ctx.fillRect(x + 2, y + 2, 28, 28);
        ctx.fillStyle = 'rgba(220,235,255,0.12)';
        ctx.fillRect(x + 2, y + 2, 28, 4);
      }
    }
  }, 2, 2);

  // 6. Bois / Planches de chêne
  const wood = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, w, h);
    for (let p = 0; p < 6; p++) {
      const y = p * (h / 6);
      const v = Math.floor(Math.random() * 20) - 10;
      ctx.fillStyle = `rgb(${139 + v}, ${90 + Math.floor(v * 0.7)}, ${43 + Math.floor(v * 0.5)})`;
      ctx.fillRect(0, y + 1, w, h / 6 - 2);
      ctx.fillStyle = 'rgba(45,24,10,0.35)';
      ctx.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,220,175,0.08)' : 'rgba(45,22,8,0.12)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 26 + Math.random() * 35, 2);
    }
  }, 1, 1);

  // 7. Dalles de sol taillées
  const slab = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9aa0a6';
    ctx.fillRect(0, 0, w, h);
    const step = 64;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const shade = 192 + Math.floor(Math.random() * 24);
        ctx.fillStyle = `rgb(${shade}, ${shade - 3}, ${shade - 9})`;
        ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.strokeRect(x + 4, y + 4, step - 8, step - 8);
      }
    }
  }, 2, 2);

  // 8. Carte de terrain complète (Gazon naturel + Chemins de terre battue fidèles au plan + Champs)
  const terrainMap = createVillageTerrainTexture();

  return { stone, brick, timber, thatch, roofRed, roofSlate, wood, slab, terrainMap };
}

function createVillageTerrainTexture() {
  const size = 1024;
  const worldSpan = 160; // -80..+80
  const toPx = (wx, wz) => [
    ((wx + worldSpan * 0.5) / worldSpan) * size,
    ((wz + worldSpan * 0.5) / worldSpan) * size,
  ];

  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Fond gazon naturel vibrant (palette Fortnite Mobile ensoleillée)
  ctx.fillStyle = '#62a83c';
  ctx.fillRect(0, 0, size, size);

  // Nuances organiques d'herbe (taches ensoleillées & prairies)
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 18 + Math.random() * 58;
    ctx.fillStyle = Math.random() > 0.48
      ? 'rgba(128, 194, 68, 0.22)'
      : 'rgba(62, 128, 42, 0.2)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brins d'herbe fins & fleurs sauvages
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(155, 212, 82, 0.35)' : 'rgba(54, 112, 34, 0.3)';
    ctx.fillRect(x, y, 2, 4);
  }

  // Champs labourés (selon IMG_0581 : NO de l'église, Ouest du pont, Est de la mairie)
  const drawField = (wx, wz, w, h, rot) => {
    const [px, py] = toPx(wx, wz);
    const pw = (w / worldSpan) * size;
    const ph = (h / worldSpan) * size;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = '#b9934c';
    ctx.fillRect(-pw * 0.5, -ph * 0.5, pw, ph);
    ctx.fillStyle = '#8b6630';
    for (let y = -ph * 0.45; y < ph * 0.45; y += 5) {
      ctx.fillRect(-pw * 0.47, y, pw * 0.94, 2);
    }
    ctx.restore();
  };
  drawField(-29, -18, 13, 8, -0.35);
  drawField(-36, 17, 12, 7, 0.28);
  drawField(44, 5, 13, 8, -0.2);

  // Chemins de terre battue reliant chaque parcelle et zone logistique selon IMG_0581.JPG
  const drawRoad = (pts, widthMeters = 4.2) => {
    const pxWidth = (widthMeters / worldSpan) * size;
    const trace = () => {
      ctx.beginPath();
      pts.forEach(([x, z], idx) => {
        const [px, py] = toPx(x, z);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Bordure herbe-terre douce
    trace();
    ctx.strokeStyle = 'rgba(148, 124, 72, 0.6)';
    ctx.lineWidth = pxWidth + 10;
    ctx.stroke();
    // Terre battue chaude
    trace();
    ctx.strokeStyle = '#c89e64';
    ctx.lineWidth = pxWidth;
    ctx.stroke();
    // Centre légèrement plus clair (passage de la charrette)
    trace();
    ctx.strokeStyle = '#d9b57c';
    ctx.lineWidth = pxWidth * 0.55;
    ctx.stroke();
  };

  // Place centrale & axes principaux
  drawRoad([[-24, 42], [-24, 27.5], [-18, 14], [-8, 6], [2, 4], [14, 5], [22, 4], [32, -6], [38, -22], [50, -14]], 4.4);
  // Axe Extraction Ouest -> Stock Ressources -> Place
  drawRoad([[-45, -2], [-34, 10], [-22, 8], [-8, 6]], 3.8);
  // Axe Place -> Petite Église -> Chaumière -> Mairie
  drawRoad([[2, 4], [-10, -2], [-15, -10]], 3.8);
  drawRoad([[2, 4], [8, -14], [8, -21]], 3.5);
  drawRoad([[2, 4], [16, -4], [24, -10]], 4.0);
  // Boucle Sud des maisons (Pierre, Forge, Marchand)
  drawRoad([[-18, 14], [-2, 18], [14, 15], [28, 13], [22, 4]], 3.6);

  // Place centrale ronde en terre battue
  const [plx, ply] = toPx(2, 4);
  ctx.fillStyle = '#cfa76d';
  ctx.beginPath();
  ctx.arc(plx, ply, 42, 0, Math.PI * 2);
  ctx.fill();

  // Sol rocheux de la Carrière de Pierre (Est)
  const [qx, qy] = toPx(VILLAGE_LAYOUT.quarry.x, VILLAGE_LAYOUT.quarry.z);
  const qGrad = ctx.createRadialGradient(qx, qy, 12, qx, qy, 82);
  qGrad.addColorStop(0, '#9e9b90');
  qGrad.addColorStop(0.7, '#b5a887');
  qGrad.addColorStop(1, 'rgba(181,168,135,0)');
  ctx.fillStyle = qGrad;
  ctx.beginPath();
  ctx.arc(qx, qy, 82, 0, Math.PI * 2);
  ctx.fill();

  // Lit sableux sous la rivière
  ctx.beginPath();
  for (let x = -80; x <= 80; x += 2) {
    const z = getRiverCenterZ(x);
    const [px, py] = toPx(x, z);
    if (x === -80) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#9e8d66';
  ctx.lineWidth = (11.5 / worldSpan) * size;
  ctx.stroke();

  // Petits graviers sur les chemins
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,240,210,0.16)' : 'rgba(90,62,32,0.14)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class VillageWorld {
  constructor(scene, textures) {
    this.scene = scene;
    this.textures = textures;
    this.waterMesh = null;
    this.clouds = [];
    this.sunLight = null;
    this.stockVisuals = { bricks: null, resources: null };
    this.beaconGroup = null;
    this.trackedTarget = null;

    this._setupLightingAndSky();
    this._buildTerrainAndHills();
    this._buildRiverAndBridge();
    this._buildInstancedFoliage();
    this._buildStockYards();
    this._buildGuideBeacon();
  }

  _setupLightingAndSky() {
    // Ciel lumineux ensoleillé style Fortnite Mobile
    this.scene.background = new THREE.Color('#83c9ff');
    this.scene.fog = new THREE.FogExp2('#a8dcff', 0.0046);

    // Dôme céleste dégradé chaud
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const sctx = skyCanvas.getContext('2d');
    const grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#2e88e6');
    grad.addColorStop(0.42, '#73befa');
    grad.addColorStop(0.72, '#d5efff');
    grad.addColorStop(1.0, '#ffe9be');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 16, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(220, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(skyDome);

    // Éclairage solaire doré (HemisphereLight + DirectionalLight avec ombres douces optimisées)
    const hemi = new THREE.HemisphereLight('#d4eeff', '#8aad58', 1.22);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff2cc', 1.65);
    sun.position.set(48, 68, 36);
    sun.castShadow = true;
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const shadowRes = isMobile ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowRes, shadowRes);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 190;
    const d = 68;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    this.sunLight = sun;

    // Nuages stylisés flottants
    const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const puffGeo = new THREE.SphereGeometry(4.5, 10, 8);
    for (let i = 0; i < 14; i++) {
      const grp = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set((p - 1) * 4.4, Math.sin(p) * 1.1, (p % 2) * 1.8);
        m.scale.set(1.2, 0.65, 0.95);
        grp.add(m);
      }
      grp.position.set(-120 + i * 20, 44 + (i % 4) * 5, -90 + ((i * 37) % 160));
      this.scene.add(grp);
      this.clouds.push(grp);
    }
  }

  _buildTerrainAndHills() {
    // Plateau principal parfaitement plat dans le village pour la précision des briques
    const groundGeo = new THREE.PlaneGeometry(160, 160, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshLambertMaterial({ map: this.textures.terrainMap });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Collines verdoyantes encadrant la vallée médiévale
    const hillGeo = new THREE.ConeGeometry(34, 18, 9);
    const hillMat = new THREE.MeshLambertMaterial({ color: '#589c3b' });
    const hillPositions = [
      [-86, -68, 1.4], [-35, -88, 1.2], [25, -86, 1.5], [82, -74, 1.3],
      [92, -14, 1.25], [88, 52, 1.3], [32, 86, 1.1], [-45, 84, 1.2], [-90, 32, 1.35], [-92, -20, 1.15],
    ];
    for (const [hx, hz, sc] of hillPositions) {
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.position.set(hx, 6.5 * sc, hz);
      hill.scale.set(sc * 1.3, sc, sc * 1.1);
      hill.rotation.y = hx * 0.1;
      this.scene.add(hill);
    }

    // Puits central en pierre sur la place du village (point de repère chaleureux)
    const well = new THREE.Group();
    well.position.set(2, 0, 1.5);
    const stoneMat = new THREE.MeshLambertMaterial({ map: this.textures.stone });
    const woodMat = new THREE.MeshLambertMaterial({ map: this.textures.wood });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.95, 12), stoneMat);
    base.position.y = 0.48;
    base.castShadow = true;
    base.receiveShadow = true;
    well.add(base);
    const waterDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.82, 12),
      new THREE.MeshBasicMaterial({ color: '#39a7d9' })
    );
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.72;
    well.add(waterDisc);
    [-0.85, 0.85].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.65, 0.14), woodMat);
      post.position.set(px, 1.65, 0);
      post.castShadow = true;
      well.add(post);
    });
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 0.95, 4),
      new THREE.MeshLambertMaterial({ map: this.textures.roofRed })
    );
    roof.position.y = 2.8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    well.add(roof);
    this.scene.add(well);
  }

  _buildRiverAndBridge() {
    // Ruban d'eau courbé suivant getRiverCenterZ(x)
    const segs = 64;
    const width = 8.4;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = -80 + t * 160;
      const cz = getRiverCenterZ(x);
      positions.push(x, 0.04, cz - width * 0.5);
      positions.push(x, 0.04, cz + width * 0.5);
      uvs.push(t * 14, 0);
      uvs.push(t * 14, 1);
      if (i < segs) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    waterGeo.setIndex(indices);
    waterGeo.computeVertexNormals();

    // Texture eau chatoyante
    const wc = document.createElement('canvas');
    wc.width = 128;
    wc.height = 128;
    const wctx = wc.getContext('2d');
    wctx.fillStyle = '#38a8db';
    wctx.fillRect(0, 0, 128, 128);
    wctx.fillStyle = 'rgba(200, 245, 255, 0.32)';
    for (let i = 0; i < 40; i++) {
      wctx.fillRect(Math.random() * 128, Math.random() * 128, 18 + Math.random() * 20, 3);
    }
    const wTex = new THREE.CanvasTexture(wc);
    wTex.colorSpace = THREE.SRGBColorSpace;
    wTex.wrapS = THREE.RepeatWrapping;
    wTex.wrapT = THREE.RepeatWrapping;

    this.waterMesh = new THREE.Mesh(
      waterGeo,
      new THREE.MeshLambertMaterial({ map: wTex, transparent: true, opacity: 0.9 })
    );
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // Pont villageois en pierre & bois (traversable à pied et en charrette)
    const bridge = new THREE.Group();
    bridge.position.set(VILLAGE_LAYOUT.bridge.x, 0, VILLAGE_LAYOUT.bridge.z);
    bridge.rotation.y = VILLAGE_LAYOUT.bridge.rotY;

    const stoneMat = new THREE.MeshLambertMaterial({ map: this.textures.stone });
    const woodMat = new THREE.MeshLambertMaterial({ map: this.textures.wood });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 11.4), woodMat);
    deck.position.y = 0.22;
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridge.add(deck);

    // Parapets latéraux en pierre
    [-2.45, 2.45].forEach((px) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 11.2), stoneMat);
      wall.position.set(px, 0.68, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      bridge.add(wall);
    });
    this.scene.add(bridge);
  }

  _buildInstancedFoliage() {
    // 1. Touffes d'herbe optimisées (1 seul draw call via InstancedMesh!)
    const bladeCount = 1800;
    const bladeGeo = new THREE.ConeGeometry(0.11, 0.42, 3);
    bladeGeo.translate(0, 0.21, 0);
    const bladeMat = new THREE.MeshLambertMaterial({ color: '#78c242' });
    const grassMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;

    for (let attempt = 0; attempt < 4200 && placed < bladeCount; attempt++) {
      const x = (Math.random() - 0.5) * 134;
      const z = (Math.random() - 0.5) * 134;
      if (isInsideRiver(x, z, 1.5)) continue;
      // Éviter les empreintes de bâtiments et la place centrale
      if (Math.hypot(x - 2, z - 4) < 7.5) continue;
      let blocked = false;
      for (const b of VILLAGE_LAYOUT.buildings) {
        if (Math.abs(x - b.x) < b.width * 0.65 && Math.abs(z - b.z) < b.depth * 0.65) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.22);
      const s = 0.7 + Math.random() * 0.85;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      grassMesh.setMatrixAt(placed, dummy.matrix);

      color.setHSL(0.25 + (Math.random() - 0.5) * 0.05, 0.55, 0.46 + Math.random() * 0.14);
      grassMesh.setColorAt(placed, color);
      placed++;
    }
    grassMesh.count = placed;
    grassMesh.instanceMatrix.needsUpdate = true;
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
    this.scene.add(grassMesh);

    // 2. Arbres décoratifs en périphérie (InstancedMesh troncs + feuillages arrondis Fortnite)
    const treePositions = [];
    for (let i = 0; i < 68; i++) {
      const angle = (i / 68) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      const radius = 52 + Math.random() * 20;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (isInsideRiver(x, z, 2.5)) continue;
      treePositions.push({ x, z, scale: 0.85 + Math.random() * 0.65 });
    }

    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 3.2, 6);
    trunkGeo.translate(0, 1.6, 0);
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#6e4526' });
    const canopyGeo = new THREE.DodecahedronGeometry(2.15, 1);
    canopyGeo.translate(0, 4.3, 0);
    const canopyMat = new THREE.MeshLambertMaterial({ color: '#4da336' });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);
    trunks.castShadow = true;
    canopies.castShadow = true;

    treePositions.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      canopies.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.27 + (Math.random() - 0.5) * 0.06, 0.55, 0.39 + Math.random() * 0.12);
      canopies.setColorAt(i, color);
    });
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
    this.scene.add(trunks);
    this.scene.add(canopies);
  }

  _buildStockYards() {
    const woodMat = new THREE.MeshLambertMaterial({ map: this.textures.wood });
    const brickMat = new THREE.MeshLambertMaterial({ map: this.textures.brick, color: '#cf7452' });
    const stoneMat = new THREE.MeshLambertMaterial({ map: this.textures.stone });

    // Zone 1 : Stock de briques (près de la carrière NE, fidèle au plan)
    const bs = new THREE.Group();
    bs.position.set(VILLAGE_LAYOUT.brickStock.x, 0, VILLAGE_LAYOUT.brickStock.z);
    const plat1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.18, 4.6), woodMat);
    plat1.position.y = 0.09;
    plat1.receiveShadow = true;
    bs.add(plat1);
    // Piles visuelles de briques & pierres prêtes à charger dans la charrette
    for (let p = 0; p < 3; p++) {
      const stack = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.05 + (p % 2) * 0.3, 1.3),
        p === 1 ? stoneMat : brickMat
      );
      stack.position.set(-1.9 + p * 1.9, 0.72, -0.5 + (p % 2) * 0.8);
      stack.castShadow = true;
      stack.receiveShadow = true;
      bs.add(stack);
    }
    this.scene.add(bs);
    this.stockVisuals.bricks = bs;

    // Zone 2 : Stockage de ressources / rondins (Ouest près de l'extraction)
    const rs = new THREE.Group();
    rs.position.set(VILLAGE_LAYOUT.resourceStock.x, 0, VILLAGE_LAYOUT.resourceStock.z);
    const plat2 = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 4.4), woodMat);
    plat2.position.y = 0.09;
    plat2.receiveShadow = true;
    rs.add(plat2);
    const logGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.2, 8);
    logGeo.rotateZ(Math.PI / 2);
    const logMat = new THREE.MeshLambertMaterial({ color: '#7a4b25' });
    for (let row = 0; row < 3; row++) {
      const count = 4 - row;
      for (let i = 0; i < count; i++) {
        const log = new THREE.Mesh(logGeo, logMat);
        log.position.set(-0.6, 0.42 + row * 0.4, -1.0 + i * 0.52 + row * 0.26);
        log.castShadow = true;
        rs.add(log);
      }
    }
    this.scene.add(rs);
    this.stockVisuals.resources = rs;
  }

  _buildGuideBeacon() {
    // Faisceau doré diégétique pour guider le joueur vers le chantier suivi dans le Codex
    const grp = new THREE.Group();
    const beamGeo = new THREE.CylinderGeometry(0.35, 1.4, 24, 12, 1, true);
    beamGeo.translate(0, 12, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#ffd84a',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    grp.add(beam);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.2, 24),
      new THREE.MeshBasicMaterial({ color: '#ffe570', side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    grp.add(ring);

    grp.visible = false;
    this.scene.add(grp);
    this.beaconGroup = grp;
  }

  setTrackedTarget(pos) {
    this.trackedTarget = pos;
    if (!this.beaconGroup) return;
    if (!pos) {
      this.beaconGroup.visible = false;
    } else {
      this.beaconGroup.visible = true;
      this.beaconGroup.position.set(pos.x, 0, pos.z);
    }
  }

  setShadowsEnabled(enabled) {
    if (this.sunLight) {
      this.sunLight.castShadow = Boolean(enabled);
    }
  }

  update(dt, elapsed) {
    // Animation douce de la rivière
    if (this.waterMesh && this.waterMesh.material.map) {
      this.waterMesh.material.map.offset.x = (elapsed * 0.12) % 1;
    }
    // Dérive paisible des nuages
    for (const c of this.clouds) {
      c.position.x += dt * 0.7;
      if (c.position.x > 130) c.position.x = -130;
    }
    // Pulsation discrète du faisceau diégétique
    if (this.beaconGroup && this.beaconGroup.visible) {
      this.beaconGroup.rotation.y += dt * 0.8;
      const s = 1 + Math.sin(elapsed * 3.2) * 0.12;
      this.beaconGroup.children[1].scale.set(s, s, 1);
    }
  }
}
