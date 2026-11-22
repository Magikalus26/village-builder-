// src/world.js — Direction artistique Fortnite Mobile / Jeu Console Stylisé
// Ciel atmosphérique procédural + soleil & rayons + nuages volumétriques multi-strates
// PBR 512x512 (Albedo + Normal Maps + Roughness Maps), relief naturel & falaises rocheuses,
// chênes & pins sculptés animés au vent, herbe multi-brins, fougères, coquelicots, pissenlits,
// clôtures en bois, rivière + ruisseau de la carrière à reflets spéculaires.

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
      rotY: -0.45,
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

// ============================================================================
// HYDROLOGIE & RELIEF NATUREL DU TERRAIN
// ============================================================================

// Courbe de la rivière principale (Ouest -> Sud -> Sud-Est)
export function getRiverCenterZ(x) {
  return 31 + Math.sin((x + 28) * 0.042) * 7.5 - Math.cos(x * 0.025) * 3.0;
}

// Petit ruisseau clair descendant près de la Carrière de Pierre vers la rivière
export function getBrookCenterX(z) {
  return 58.5 + Math.sin(z * 0.09) * 3.2 - (z + 24) * 0.08;
}

export function isInsideRiver(x, z, margin = 0) {
  // Pont praticable autour de x = -24
  if (Math.abs(x - VILLAGE_LAYOUT.bridge.x) < 3.6 && Math.abs(z - VILLAGE_LAYOUT.bridge.z) < 7.5) {
    return false;
  }
  const rz = getRiverCenterZ(x);
  return Math.abs(z - rz) < (4.4 + margin);
}

// Bruit déterministe doux pour le relief naturel autour du village
function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x, z) {
  return (
    valueNoise(x, z) * 0.55 +
    valueNoise(x * 2.07 + 11.3, z * 2.07 + 7.1) * 0.30 +
    valueNoise(x * 4.13 + 3.7, z * 4.13 + 19.4) * 0.15
  );
}

// Hauteur du terrain : parfaitement plat (y = 0) dans le plateau villageois jouable
// pour garantir la précision au millimètre des 36 800 briques, blueprints et charrette,
// puis relief vallonné & parois rocheuses escarpées autour de la vallée !
export function getTerrainHeight(x, z) {
  // Distance elliptique au cœur plat du village (inclut bâtiments, carrière, forêt, pont)
  const rx = (x - 4) / 60;
  const rz = (z - 2) / 48;
  const r = Math.hypot(rx, rz);

  // Creusement naturel doux du lit de la rivière (hors pont)
  const riverDist = Math.abs(z - getRiverCenterZ(x));
  let riverCarve = 0;
  if (riverDist < 6.2) {
    const t = Math.max(0, 1 - riverDist / 6.2);
    riverCarve = -t * t * 1.15;
  }

  // Creusement léger du ruisseau de la carrière (Est)
  let brookCarve = 0;
  if (z > -32 && z < getRiverCenterZ(x) + 2) {
    const bd = Math.abs(x - getBrookCenterX(z));
    if (bd < 3.4) {
      const tb = Math.max(0, 1 - bd / 3.4);
      brookCarve = -tb * tb * 0.52;
    }
  }

  if (r <= 1.0) {
    return Math.min(riverCarve, brookCarve);
  }

  // Transition douce puis collines escarpées et falaises rocheuses
  const edge = Math.min(1, (r - 1.0) / 0.85);
  const smoothEdge = edge * edge * (3 - 2 * edge);
  const n = fbm(x * 0.032, z * 0.032);
  const ridge = 1 - Math.abs(valueNoise(x * 0.055 + 5, z * 0.055 - 3) * 2 - 1);
  // Crêtes escarpées plus prononcées derrière la carrière (Est/Nord-Est)
  const quarryBoost = x > 35 && z < 5 ? 1.45 : 1.0;
  const hillH = smoothEdge * (4.5 + n * 15.0 + ridge * ridge * 9.5) * quarryBoost;

  // Garde la vallée de la rivière ouverte pour l'écoulement
  const riverMask = riverDist < 11 ? Math.max(0, (riverDist - 4.5) / 6.5) : 1;
  return hillH * riverMask + Math.min(riverCarve, brookCarve);
}

// ============================================================================
// GÉNÉRATEUR PBR 512x512 (ALBEDO + NORMAL MAP + ROUGHNESS MAP PROCÉDURALES)
// ============================================================================

function heightFieldToNormalAndRoughness(heightBuf, size, strength, baseRough, roughRange) {
  // Normal Map RGB (tangent-space) par filtre de Sobel/différences centrées
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const nImg = nCtx.createImageData(size, size);
  const nd = nImg.data;

  // Roughness Map niveaux de gris (les creux/joints sont plus rugueux que les surfaces polies)
  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');
  const rImg = rCtx.createImageData(size, size);
  const rd = rImg.data;

  const mask = size - 1;
  for (let y = 0; y < size; y++) {
    const ym = (y - 1) & mask;
    const yp = (y + 1) & mask;
    const row = y * size;
    const rowM = ym * size;
    const rowP = yp * size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1) & mask;
      const xp = (x + 1) & mask;

      const hL = heightBuf[row + xm];
      const hR = heightBuf[row + xp];
      const hU = heightBuf[rowM + x];
      const hD = heightBuf[rowP + x];
      const hC = heightBuf[row + x];

      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;
      const invLen = 1.0 / Math.hypot(dx, dy, dz);

      const idx = (row + x) * 4;
      nd[idx] = Math.max(0, Math.min(255, Math.round((dx * invLen * 0.5 + 0.5) * 255)));
      nd[idx + 1] = Math.max(0, Math.min(255, Math.round((dy * invLen * 0.5 + 0.5) * 255)));
      nd[idx + 2] = Math.max(0, Math.min(255, Math.round((dz * invLen * 0.5 + 0.5) * 255)));
      nd[idx + 3] = 255;

      // Creux (hC faible) -> plus rugueux ; sommets polis (hC haut) -> plus lisses
      const roughVal = Math.max(0.08, Math.min(1.0, baseRough + (1.0 - hC) * roughRange));
      const rByte = Math.round(roughVal * 255);
      rd[idx] = rByte;
      rd[idx + 1] = rByte;
      rd[idx + 2] = rByte;
      rd[idx + 3] = 255;
    }
  }

  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const normalTex = new THREE.CanvasTexture(nCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.anisotropy = 4;

  const roughTex = new THREE.CanvasTexture(rCanvas);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.anisotropy = 4;

  return { normalTex, roughTex };
}

function makePBRSet(size, drawFn, opts = {}) {
  const {
    normalStrength = 3.2,
    baseRough = 0.62,
    roughRange = 0.34,
    repeatX = 1,
    repeatY = 1,
  } = opts;

  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d');

  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d');
  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, size, size);

  drawFn(cCtx, hCtx, size);

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = 4;

  // Extraction rapide du heightmap monocanal
  const hPixels = hCtx.getImageData(0, 0, size, size).data;
  const heightBuf = new Float32Array(size * size);
  for (let i = 0; i < heightBuf.length; i++) {
    heightBuf[i] = hPixels[i * 4] / 255;
  }
  const { normalTex, roughTex } = heightFieldToNormalAndRoughness(
    heightBuf,
    size,
    normalStrength,
    baseRough,
    roughRange
  );
  normalTex.repeat.set(repeatX, repeatY);
  roughTex.repeat.set(repeatX, repeatY);

  return { map, normalMap: normalTex, roughnessMap: roughTex };
}

export function createProceduralTextures() {
  const S = 512;

  // 1. Pierre taillée (512x512 Albedo + Normal + Roughness) — joints creusés & grain minéral
  const stoneSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#7e7a70';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#222222';
    hctx.fillRect(0, 0, w, w);

    const rows = 8;
    const rowH = w / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (w / 8);
      const cols = 4;
      const colW = w / cols;
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + off + 4;
        const y = r * rowH + 4;
        const bw = colW - 8;
        const bh = rowH - 8;
        const v = 166 + Math.floor(hash2(r * 13 + c, r + 3) * 34);
        const warm = Math.floor(hash2(c * 7, r * 19) * 16);
        ctx.fillStyle = `rgb(${v + warm}, ${v + warm - 4}, ${v - 9})`;
        ctx.fillRect(x, y, bw, bh);

        // Chanfrein lumineux & ombre basse
        ctx.fillStyle = 'rgba(255, 250, 238, 0.22)';
        ctx.fillRect(x, y, bw, 5);
        ctx.fillStyle = 'rgba(42, 36, 28, 0.24)';
        ctx.fillRect(x, y + bh - 5, bw, 5);

        // Hauteur chanfreinée pour Normal Map réaliste
        hctx.fillStyle = '#989898';
        hctx.fillRect(x, y, bw, bh);
        hctx.fillStyle = '#d6d6d6';
        hctx.fillRect(x + 4, y + 4, bw - 8, bh - 8);
      }
    }
    // Grain minéral fin & pores de calcaire
    for (let i = 0; i < 4800; i++) {
      const px = Math.random() * w;
      const py = Math.random() * w;
      const bright = Math.random() > 0.5;
      ctx.fillStyle = bright ? 'rgba(255,252,240,0.09)' : 'rgba(38,32,24,0.11)';
      ctx.fillRect(px, py, 2 + Math.random() * 2, 2 + Math.random() * 2);
      hctx.fillStyle = bright ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)';
      hctx.fillRect(px, py, 2, 2);
    }
  }, { normalStrength: 4.5, baseRough: 0.62, roughRange: 0.34 });

  // 2. Briques de construction (512x512 Albedo + Normal + Roughness) — relief prononcé + mortier
  const brickSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#cfc7b8';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#181818';
    hctx.fillRect(0, 0, w, w);

    const rows = 8;
    const rowH = w / rows;
    const cols = 4;
    const colW = w / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + off + 4;
        const y = r * rowH + 4;
        const bw = colW - 8;
        const bh = rowH - 8;
        const v = 196 + Math.floor(hash2(c * 11 + r, r * 5) * 32);
        ctx.fillStyle = `rgb(${v}, ${v - 6}, ${v - 14})`;
        ctx.fillRect(x, y, bw, bh);

        // Subtile texture de cuisson & bords biseautés
        ctx.fillStyle = 'rgba(255, 250, 240, 0.18)';
        ctx.fillRect(x, y, bw, 4);
        ctx.fillStyle = 'rgba(40, 28, 18, 0.22)';
        ctx.fillRect(x, y + bh - 4, bw, 4);

        hctx.fillStyle = '#a0a0a0';
        hctx.fillRect(x, y, bw, bh);
        hctx.fillStyle = '#dcdcdc';
        hctx.fillRect(x + 4, y + 4, bw - 8, bh - 8);
      }
    }
    for (let i = 0; i < 4500; i++) {
      const px = Math.random() * w;
      const py = Math.random() * w;
      const light = Math.random() > 0.52;
      ctx.fillStyle = light ? 'rgba(255,250,242,0.08)' : 'rgba(55,38,24,0.1)';
      ctx.fillRect(px, py, 2 + Math.random() * 2, 2);
      hctx.fillStyle = light ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.22)';
      hctx.fillRect(px, py, 2, 2);
    }
  }, { normalStrength: 5.0, baseRough: 0.68, roughRange: 0.28 });

  // 3. Dalles de sol taillées (512x512)
  const slabSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#8b9096';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#1e1e1e';
    hctx.fillRect(0, 0, w, w);

    const step = w / 4;
    for (let y = 0; y < w; y += step) {
      for (let x = 0; x < w; x += step) {
        const s = 196 + Math.floor(Math.random() * 26);
        ctx.fillStyle = `rgb(${s}, ${s - 2}, ${s - 8})`;
        ctx.fillRect(x + 5, y + 5, step - 10, step - 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 7, y + 7, step - 14, step - 14);

        hctx.fillStyle = '#a8a8a8';
        hctx.fillRect(x + 5, y + 5, step - 10, step - 10);
        hctx.fillStyle = '#e0e0e0';
        hctx.fillRect(x + 10, y + 10, step - 20, step - 20);
      }
    }
    for (let i = 0; i < 3600; i++) {
      const px = Math.random() * w;
      const py = Math.random() * w;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(35,38,44,0.08)';
      ctx.fillRect(px, py, 3, 2);
      hctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)';
      hctx.fillRect(px, py, 2, 2);
    }
  }, { normalStrength: 3.8, baseRough: 0.55, roughRange: 0.35, repeatX: 2, repeatY: 2 });

  // 4. Bois de chêne veiné en relief (512x512 — poutres, charrette, banc de scie, portes)
  const woodSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#7e5028';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#888888';
    hctx.fillRect(0, 0, w, w);

    const planks = 6;
    const ph = w / planks;
    for (let p = 0; p < planks; p++) {
      const y = p * ph;
      const d = Math.floor(hash2(p, 7) * 26) - 13;
      ctx.fillStyle = `rgb(${136 + d}, ${86 + Math.floor(d * 0.65)}, ${44 + Math.floor(d * 0.45)})`;
      ctx.fillRect(0, y + 3, w, ph - 6);
      // Rainure entre planches
      ctx.fillStyle = '#3b210d';
      ctx.fillRect(0, y, w, 4);
      hctx.fillStyle = '#181818';
      hctx.fillRect(0, y, w, 5);
      hctx.fillStyle = '#c8c8c8';
      hctx.fillRect(0, y + 6, w, ph - 10);

      // Veines organiques ondulées en relief
      for (let g = 0; g < 18; g++) {
        const gy = y + 8 + (g / 18) * (ph - 14);
        const dark = g % 2 === 0;
        ctx.strokeStyle = dark ? 'rgba(54, 29, 12, 0.24)' : 'rgba(220, 172, 114, 0.16)';
        ctx.lineWidth = 2;
        hctx.strokeStyle = dark ? 'rgba(65,65,65,0.45)' : 'rgba(235,235,235,0.35)';
        hctx.lineWidth = 2;
        ctx.beginPath();
        hctx.beginPath();
        for (let x = 0; x <= w; x += 32) {
          const wave = Math.sin(x * 0.025 + p * 2.1 + g) * 3.5;
          if (x === 0) {
            ctx.moveTo(x, gy + wave);
            hctx.moveTo(x, gy + wave);
          } else {
            ctx.lineTo(x, gy + wave);
            hctx.lineTo(x, gy + wave);
          }
        }
        ctx.stroke();
        hctx.stroke();
      }
    }
  }, { normalStrength: 4.2, baseRough: 0.66, roughRange: 0.26 });

  // 5. Chaume doré à brins superposés (512x512)
  const thatchSet = makePBRSet(S, (ctx, hctx, w) => {
    const grad = ctx.createLinearGradient(0, 0, 0, w);
    grad.addColorStop(0, '#e6c66b');
    grad.addColorStop(0.5, '#d2a84a');
    grad.addColorStop(1, '#b68930');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#707070';
    hctx.fillRect(0, 0, w, w);

    // Couches superposées de bottes de paille
    for (let layer = 0; layer < 8; layer++) {
      const ly = layer * (w / 8);
      ctx.fillStyle = 'rgba(92, 58, 16, 0.30)';
      ctx.fillRect(0, ly, w, 7);
      hctx.fillStyle = '#262626';
      hctx.fillRect(0, ly, w, 9);
    }
    // Milliers de brins de paille verticaux en relief
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * w;
      const len = 18 + Math.random() * 28;
      const lean = (Math.random() - 0.5) * 6;
      const bright = Math.random() > 0.45;
      ctx.strokeStyle = bright ? 'rgba(255, 238, 164, 0.48)' : 'rgba(116, 76, 20, 0.42)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + lean, y + len);
      ctx.stroke();

      hctx.strokeStyle = bright ? 'rgba(235,235,235,0.45)' : 'rgba(50,50,50,0.4)';
      hctx.lineWidth = 2;
      hctx.beginPath();
      hctx.moveTo(x, y);
      hctx.lineTo(x + lean, y + len);
      hctx.stroke();
    }
  }, { normalStrength: 4.8, baseRough: 0.84, roughRange: 0.14, repeatX: 2, repeatY: 2 });

  // 6. Tuiles terre cuite (512x512)
  const roofRedSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#8b341d';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#202020';
    hctx.fillRect(0, 0, w, w);

    const rows = 10;
    const cols = 10;
    const rw = w / cols;
    const rh = w / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (rw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * rw + off + 2;
        const y = r * rh + 2;
        const d = Math.floor(hash2(c * 7, r * 13) * 32) - 16;
        ctx.fillStyle = `rgb(${186 + d}, ${78 + Math.floor(d * 0.5)}, ${46 + Math.floor(d * 0.3)})`;
        ctx.fillRect(x, y, rw - 4, rh - 4);
        ctx.fillStyle = 'rgba(255,220,180,0.22)';
        ctx.fillRect(x, y, rw - 4, 6);
        ctx.fillStyle = 'rgba(42,14,8,0.34)';
        ctx.fillRect(x, y + rh - 9, rw - 4, 6);

        const hg = hctx.createLinearGradient(x, y, x, y + rh);
        hg.addColorStop(0, '#555555');
        hg.addColorStop(0.85, '#eaeaea');
        hg.addColorStop(1, '#1a1a1a');
        hctx.fillStyle = hg;
        hctx.fillRect(x, y, rw - 4, rh - 4);
      }
    }
  }, { normalStrength: 5.0, baseRough: 0.62, roughRange: 0.30, repeatX: 2, repeatY: 2 });

  // 7. Ardoises médiévales (512x512)
  const roofSlateSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#3c4552';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#202020';
    hctx.fillRect(0, 0, w, w);

    const rows = 10;
    const cols = 10;
    const rw = w / cols;
    const rh = w / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (rw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * rw + off + 2;
        const y = r * rh + 2;
        const d = Math.floor(hash2(c * 9, r * 11) * 28) - 14;
        ctx.fillStyle = `rgb(${84 + d}, ${95 + d}, ${112 + d})`;
        ctx.fillRect(x, y, rw - 4, rh - 4);
        ctx.fillStyle = 'rgba(220,238,255,0.16)';
        ctx.fillRect(x, y, rw - 4, 5);

        const hg = hctx.createLinearGradient(x, y, x, y + rh);
        hg.addColorStop(0, '#5a5a5a');
        hg.addColorStop(0.85, '#e2e2e2');
        hg.addColorStop(1, '#1e1e1e');
        hctx.fillStyle = hg;
        hctx.fillRect(x, y, rw - 4, rh - 4);
      }
    }
  }, { normalStrength: 4.5, baseRough: 0.52, roughRange: 0.32, repeatX: 2, repeatY: 2 });

  // 8. Normal Map + Roughness de détail pour le Terrain (herbe, mousse, cailloux & ornières)
  const terrainDetail = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#787878';
    hctx.fillRect(0, 0, w, w);
    for (let i = 0; i < 6500; i++) {
      const x = Math.random() * w;
      const y = Math.random() * w;
      const rad = 1 + Math.random() * 4.5;
      const bright = Math.random() > 0.48;
      hctx.fillStyle = bright ? 'rgba(240,240,240,0.22)' : 'rgba(20,20,20,0.22)';
      hctx.beginPath();
      hctx.arc(x, y, rad, 0, Math.PI * 2);
      hctx.fill();
    }
  }, { normalStrength: 2.8, baseRough: 0.78, roughRange: 0.18, repeatX: 22, repeatY: 22 });

  // 9. Normal Map d'ondes pour l'eau (rivière + ruisseau de carrière à reflets spéculaires)
  const waterWave = makePBRSet(256, (ctx, hctx, w) => {
    ctx.fillStyle = '#38a8db';
    ctx.fillRect(0, 0, w, w);
    const img = hctx.createImageData(w, w);
    const d = img.data;
    for (let y = 0; y < w; y++) {
      for (let x = 0; x < w; x++) {
        const u = (x / w) * Math.PI * 2;
        const v = (y / w) * Math.PI * 2;
        const h =
          Math.sin(u * 3 + v * 2) * 0.25 +
          Math.cos(u * 5 - v * 4) * 0.18 +
          Math.sin(u * 2 + v * 7) * 0.14 +
          0.5;
        const b = Math.max(0, Math.min(255, Math.round(h * 255)));
        const i = (y * w + x) * 4;
        d[i] = b;
        d[i + 1] = b;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    hctx.putImageData(img, 0, 0);
  }, { normalStrength: 2.6, baseRough: 0.08, roughRange: 0.08, repeatX: 14, repeatY: 3 });

  // 10. Carte de terrain complète haute lisibilité (1024x1024 : prairies, mousse, chemins à ornières, champs)
  const terrainMap = createVillageTerrainTexture();

  // Helper PBR centralisé pour les autres modules (building, resources, workbench, transport, interiors)
  const sets = {
    stone: stoneSet,
    brick: brickSet,
    slab: slabSet,
    wood: woodSet,
    thatch: thatchSet,
    roofRed: roofRedSet,
    roofSlate: roofSlateSet,
  };

  function createPBRMaterial(kind, extra = {}) {
    const s = sets[kind] || stoneSet;
    return new THREE.MeshStandardMaterial({
      map: s.map,
      normalMap: s.normalMap,
      normalScale: new THREE.Vector2(extra.normalStrength ?? 0.9, extra.normalStrength ?? 0.9),
      roughnessMap: s.roughnessMap,
      roughness: extra.roughness ?? 0.92,
      metalness: extra.metalness ?? 0.04,
      ...(extra.color !== undefined ? { color: extra.color } : {}),
      ...(extra.side !== undefined ? { side: extra.side } : {}),
    });
  }

  return {
    stone: stoneSet.map,
    brick: brickSet.map,
    slab: slabSet.map,
    wood: woodSet.map,
    thatch: thatchSet.map,
    roofRed: roofRedSet.map,
    roofSlate: roofSlateSet.map,
    terrainMap,
    terrainDetail,
    waterWave,
    sets,
    createPBRMaterial,
  };
}

function createVillageTerrainTexture() {
  const size = 1024;
  const worldSpan = 220; // -110..+110 (inclut les collines & falaises autour du village)
  const toPx = (wx, wz) => [
    ((wx + worldSpan * 0.5) / worldSpan) * size,
    ((wz + worldSpan * 0.5) / worldSpan) * size,
  ];

  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Prairie verdoyante naturelle (base chaude Fortnite Mobile)
  ctx.fillStyle = '#5da438';
  ctx.fillRect(0, 0, size, size);

  // Grandes nuances d'herbe ensoleillée, mousse profonde & trèfle
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 16 + Math.random() * 54;
    const pick = Math.random();
    if (pick < 0.42) ctx.fillStyle = 'rgba(136, 200, 68, 0.24)';
    else if (pick < 0.78) ctx.fillStyle = 'rgba(56, 122, 38, 0.22)';
    else ctx.fillStyle = 'rgba(116, 146, 52, 0.18)'; // Touches de mousse chaude
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Micro-texture de brins d'herbe
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(164, 218, 86, 0.34)' : 'rgba(48, 102, 30, 0.28)';
    ctx.fillRect(x, y, 2, 4);
  }

  // Champs labourés (fidèles au plan IMG_0581)
  const drawField = (wx, wz, w, h, rot) => {
    const [px, py] = toPx(wx, wz);
    const pw = (w / worldSpan) * size;
    const ph = (h / worldSpan) * size;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = '#b48a44';
    ctx.fillRect(-pw * 0.5, -ph * 0.5, pw, ph);
    ctx.fillStyle = '#7c5826';
    for (let y = -ph * 0.46; y < ph * 0.46; y += 4.5) {
      ctx.fillRect(-pw * 0.48, y, pw * 0.96, 2);
    }
    ctx.restore();
  };
  drawField(-29, -18, 13, 8, -0.35);
  drawField(-36, 17, 12, 7, 0.28);
  drawField(44, 5, 13, 8, -0.2);

  // Chemins de terre battue avec bords herbeux, ornières de charrette et graviers
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

    // Transition terre humide/herbe
    trace();
    ctx.strokeStyle = 'rgba(128, 104, 58, 0.62)';
    ctx.lineWidth = pxWidth + 9;
    ctx.stroke();

    // Terre battue chaude
    trace();
    ctx.strokeStyle = '#c5995d';
    ctx.lineWidth = pxWidth;
    ctx.stroke();

    // Ornières parallèles laissées par la charrette
    trace();
    ctx.strokeStyle = 'rgba(148, 102, 54, 0.48)';
    ctx.lineWidth = pxWidth * 0.62;
    ctx.stroke();

    // Bande centrale éclaircie par le soleil
    trace();
    ctx.strokeStyle = '#d9b57c';
    ctx.lineWidth = pxWidth * 0.34;
    ctx.stroke();
  };

  drawRoad([[-24, 42], [-24, 27.5], [-18, 14], [-8, 6], [2, 4], [14, 5], [22, 4], [32, -6], [38, -22], [50, -14]], 4.4);
  drawRoad([[-45, -2], [-34, 10], [-22, 8], [-8, 6]], 3.8);
  drawRoad([[2, 4], [-10, -2], [-15, -10]], 3.8);
  drawRoad([[2, 4], [8, -14], [8, -21]], 3.5);
  drawRoad([[2, 4], [16, -4], [24, -10]], 4.0);
  drawRoad([[-18, 14], [-2, 18], [14, 15], [28, 13], [22, 4]], 3.6);

  // Place centrale pavée / terre battue chaude
  const [plx, ply] = toPx(2, 4);
  const plazaGrad = ctx.createRadialGradient(plx, ply, 4, plx, ply, 34);
  plazaGrad.addColorStop(0, '#dcb982');
  plazaGrad.addColorStop(0.75, '#c79e64');
  plazaGrad.addColorStop(1, 'rgba(199,158,100,0)');
  ctx.fillStyle = plazaGrad;
  ctx.beginPath();
  ctx.arc(plx, ply, 34, 0, Math.PI * 2);
  ctx.fill();

  // Sol pierreux & gravier de la Carrière de Pierre (Est)
  const [qx, qy] = toPx(VILLAGE_LAYOUT.quarry.x, VILLAGE_LAYOUT.quarry.z);
  const qGrad = ctx.createRadialGradient(qx, qy, 8, qx, qy, 64);
  qGrad.addColorStop(0, '#96938a');
  qGrad.addColorStop(0.65, '#b2a68a');
  qGrad.addColorStop(1, 'rgba(178,166,138,0)');
  ctx.fillStyle = qGrad;
  ctx.beginPath();
  ctx.arc(qx, qy, 64, 0, Math.PI * 2);
  ctx.fill();

  // Berges de terre humide sous la rivière & le ruisseau de la carrière
  ctx.beginPath();
  for (let x = -110; x <= 110; x += 2) {
    const z = getRiverCenterZ(x);
    const [px, py] = toPx(x, z);
    if (x === -110) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#756649';
  ctx.lineWidth = (12.8 / worldSpan) * size;
  ctx.stroke();

  ctx.beginPath();
  for (let z = -34; z <= 36; z += 2) {
    const x = getBrookCenterX(z);
    const [px, py] = toPx(x, z);
    if (z === -34) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#6f6448';
  ctx.lineWidth = (5.8 / worldSpan) * size;
  ctx.stroke();

  // Cailloux et graviers fins le long des sentiers
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,244,218,0.20)' : 'rgba(84,56,28,0.18)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ============================================================================
// GÉOMÉTRIES SCULPTÉES POUR ARBRES MÉDIÉVAUX (CHÊNES & PINS) + SHADER VENT
// ============================================================================

function mergeIndexedGeometries(geos) {
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const colors = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);

  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const uv = g.attributes.uv;
    const col = g.attributes.color;

    positions.set(pos.array, vOff * 3);
    if (norm) normals.set(norm.array, vOff * 3);
    if (uv) uvs.set(uv.array, vOff * 2);
    if (col) {
      colors.set(col.array, vOff * 3);
    } else {
      for (let k = 0; k < pos.count * 3; k++) colors[vOff * 3 + k] = 1.0;
    }

    if (g.index) {
      const arr = g.index.array;
      for (let k = 0; k < arr.length; k++) indices[iOff + k] = arr[k] + vOff;
      iOff += arr.length;
    } else {
      for (let k = 0; k < pos.count; k++) indices[iOff + k] = vOff + k;
      iOff += pos.count;
    }
    vOff += pos.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  return out;
}

function paintVerticalGradient(geo, botHex, topHex, yMin, yMax) {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const cBot = new THREE.Color(botHex);
  const cTop = new THREE.Color(topHex);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp((y - yMin) / Math.max(0.01, yMax - yMin), 0, 1);
    tmp.lerpColors(cBot, cTop, t);
    cols[i * 3] = tmp.r;
    cols[i * 3 + 1] = tmp.g;
    cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

// Construit un vrai chêne médiéval sculpté (tronc + racines + branches / grappes de feuillage)
export function buildSculptedOakGeometries() {
  const trunkParts = [];

  // Tronc principal légèrement courbe avec évasement de base
  const mainTrunk = new THREE.CylinderGeometry(0.24, 0.44, 3.3, 8);
  mainTrunk.translate(0, 1.65, 0);
  trunkParts.push(mainTrunk);

  // 4 racines apparentes ancrées dans le sol
  for (let r = 0; r < 4; r++) {
    const ang = (r / 4) * Math.PI * 2 + 0.3;
    const root = new THREE.CylinderGeometry(0.09, 0.22, 1.05, 5);
    root.rotateZ(0.88);
    root.rotateY(ang);
    root.translate(Math.cos(ang) * 0.42, 0.26, Math.sin(ang) * 0.42);
    trunkParts.push(root);
  }

  // 3 branches maîtresses inclinées vers les grappes de feuillage
  const branchSpecs = [
    [0.52, 0.35, 0.0, 1.55, 2.9],
    [-0.58, 2.35, 0.0, 1.45, 2.75],
    [0.48, 4.35, 0.0, 1.35, 3.05],
  ];
  for (const [tilt, yaw, _, len, yBase] of branchSpecs) {
    const b = new THREE.CylinderGeometry(0.11, 0.19, len, 6);
    b.translate(0, len * 0.5, 0);
    b.rotateZ(tilt);
    b.rotateY(yaw);
    b.translate(0, yBase, 0);
    trunkParts.push(b);
  }

  const trunkGeo = mergeIndexedGeometries(trunkParts);
  paintVerticalGradient(trunkGeo, '#492c15', '#7c502c', 0, 4.2);

  // Feuillage multi-grappes irrégulières avec dégradé lumière solaire -> ombre profonde
  const leafParts = [];
  const clusters = [
    [0.0, 4.65, 0.0, 1.55, 1.18, 1.48],
    [1.15, 4.05, 0.35, 1.25, 0.96, 1.18],
    [-1.08, 3.95, 0.48, 1.22, 0.95, 1.20],
    [-0.25, 4.12, -1.12, 1.28, 0.98, 1.18],
    [0.42, 5.25, -0.22, 1.12, 0.88, 1.08],
    [-0.52, 4.95, 0.35, 0.98, 0.82, 0.98],
  ];
  for (const [cx, cy, cz, sx, sy, sz] of clusters) {
    const g = new THREE.IcosahedronGeometry(1.0, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const n = 0.86 + hash2(vx * 7.3 + cx, vz * 9.1 + cy) * 0.28;
      p.setXYZ(i, vx * sx * n + cx, vy * sy * n + cy, vz * sz * n + cz);
    }
    g.computeVertexNormals();
    leafParts.push(g);
  }
  const canopyGeo = mergeIndexedGeometries(leafParts);
  paintVerticalGradient(canopyGeo, '#2a6b24', '#9ed945', 3.0, 6.0);

  return { trunkGeo, canopyGeo };
}

// Construit un vrai pin médiéval à étages coniques dentelés
export function buildSculptedPineGeometries() {
  const trunkParts = [];
  const trunk = new THREE.CylinderGeometry(0.14, 0.34, 3.8, 7);
  trunk.translate(0, 1.9, 0);
  trunkParts.push(trunk);

  for (let r = 0; r < 3; r++) {
    const ang = (r / 3) * Math.PI * 2;
    const root = new THREE.CylinderGeometry(0.08, 0.17, 0.85, 5);
    root.rotateZ(0.95);
    root.rotateY(ang);
    root.translate(Math.cos(ang) * 0.34, 0.22, Math.sin(ang) * 0.34);
    trunkParts.push(root);
  }
  const trunkGeo = mergeIndexedGeometries(trunkParts);
  paintVerticalGradient(trunkGeo, '#3f2614', '#6d4424', 0, 3.8);

  const tierParts = [];
  const tiers = [
    [2.1, 2.25, 2.35],
    [1.68, 2.15, 3.55],
    [1.25, 1.95, 4.65],
    [0.82, 1.65, 5.65],
  ];
  tiers.forEach(([rad, h, yCenter], tIdx) => {
    const g = new THREE.ConeGeometry(rad, h, 8, 2);
    g.rotateY(tIdx * 0.42);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      if (vy < 0) {
        const droop = 0.88 + hash2(vx * 5 + tIdx, vz * 5) * 0.26;
        p.setXYZ(i, vx * droop, vy - (droop - 1) * 0.4, vz * droop);
      }
    }
    g.translate(0, yCenter, 0);
    g.computeVertexNormals();
    tierParts.push(g);
  });

  const canopyGeo = mergeIndexedGeometries(tierParts);
  paintVerticalGradient(canopyGeo, '#1d5224', '#66b543', 1.4, 6.4);
  return { trunkGeo, canopyGeo };
}

// Injecte un balancement fluide au vent dans le vertex shader (coût GPU quasi nul sur iPhone A18)
export function applyWindShader(material, windUniforms, amplitude = 0.14, freq = 1.6, heightPivot = 0.0) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniforms.uWindTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uWindTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 wInst = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wInst = instanceMatrix * wInst;
        #endif
        float hFactor = max(0.0, transformed.y - ${heightPivot.toFixed(2)});
        float phase = uWindTime * ${freq.toFixed(2)} + wInst.x * 0.24 + wInst.z * 0.19;
        float sway = sin(phase) * ${amplitude.toFixed(3)} * hFactor;
        transformed.x += sway;
        transformed.z += cos(phase * 0.85) * ${(amplitude * 0.55).toFixed(3)} * hFactor;`
      );
  };
  return material;
}

// ============================================================================
// MONDE 3D PRINCIPAL
// ============================================================================

export class VillageWorld {
  constructor(scene, textures) {
    this.scene = scene;
    this.textures = textures;

    this.windUniforms = { uWindTime: { value: 0 } };
    this.sunDir = new THREE.Vector3(0.56, 0.62, 0.55).normalize();
    this.sunLight = null;
    this.waterMeshes = [];
    this.clouds = [];
    this.godRays = null;
    this.stockVisuals = { bricks: null, resources: null };
    this.beaconGroup = null;
    this.trackedTarget = null;

    this._setupCinematicSkyAndLighting();
    this._buildSculptedTerrain();
    this._buildRiverBrookAndBridge();
    this._buildRichInstancedNature();
    this._buildWoodenFencesAndDetails();
    this._buildStockYards();
    this._buildGuideBeacon();
  }

  _setupCinematicSkyAndLighting() {
    // Brume dorée de distance donnant une vraie profondeur atmosphérique au paysage
    this.scene.fog = new THREE.FogExp2('#e4d5b5', 0.0041);

    // 1. Dôme céleste procédural GLSL (zénith bleu profond -> horizon doré chaud + disque solaire + halo)
    const skyGeo = new THREE.SphereGeometry(260, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSunDir: { value: this.sunDir.clone() },
        uZenithColor: { value: new THREE.Color('#1c64cf') },
        uMidColor: { value: new THREE.Color('#6db6f7') },
        uHorizonColor: { value: new THREE.Color('#ffe0a8') },
        uSunColor: { value: new THREE.Color('#fff7d6') },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uZenithColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        varying vec3 vWorldDir;
        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);

          // Dégradé atmosphérique 3 tons
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
          col = mix(col, uZenithColor, smoothstep(0.22, 0.85, h));

          // Diffusion solaire chaude (Mie scattering + disque lumineux)
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float warmGlow = pow(sunDot, 5.0) * 0.42;
          float corona = pow(sunDot, 42.0) * 0.55;
          float sunDisc = smoothstep(0.9965, 0.9988, sunDot) * 1.45;

          col += vec3(1.0, 0.82, 0.52) * warmGlow;
          col += uSunColor * (corona + sunDisc);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);

    // 2. Rayons solaires doux (god-rays à fondu progressif GLSL — zéro arête géométrique visible)
    const rayGroup = new THREE.Group();
    const rayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uColor: { value: new THREE.Color('#ffebb8') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewPos;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mv.xyz;
          vNormalV = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewPos;
        void main() {
          float edge = pow(abs(dot(normalize(vNormalV), normalize(vViewPos))), 2.6);
          float vert = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
          float alpha = edge * vert * 0.14;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    for (let i = 0; i < 4; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(18 + i * 5, 95, 16, 1, true), rayMat);
      cone.position.set(58 - i * 14, 42, 48 - i * 12);
      cone.rotation.set(0.55, 0.35, -0.52);
      rayGroup.add(cone);
    }
    this.scene.add(rayGroup);
    this.godRays = rayGroup;

    // 3. Éclairage cinématographique : HemisphereLight chaude/froide + Soleil 2048x2048 centré joueur + Rim light
    const hemi = new THREE.HemisphereLight('#a8d8ff', '#80693e', 1.05);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#ffefc9', 2.05);
    sun.position.copy(this.sunDir).multiplyScalar(85);
    sun.castShadow = true;
    // Shadow map 2048x2048 haute précision (suivra dynamiquement le joueur!)
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 12;
    sun.shadow.camera.far = 210;
    const frustum = 40;
    sun.shadow.camera.left = -frustum;
    sun.shadow.camera.right = frustum;
    sun.shadow.camera.top = frustum;
    sun.shadow.camera.bottom = -frustum;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.032;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sunLight = sun;

    // Légère contre-lumière froide du ciel pour sculpter les volumes à l'ombre
    const rimLight = new THREE.DirectionalLight('#8ec5ff', 0.38);
    rimLight.position.set(-55, 34, -48);
    this.scene.add(rimLight);

    // 4. Vrais amas nuageux volumétriques multi-strates éclairés par le soleil
    this._buildVolumetricClouds();
  }

  _buildVolumetricClouds() {
    // Shader nuageux volumétrique stylisé : sommets crème doré éclatants, dessous bleu-lavande aérien lumineux
    const cloudMat = new THREE.ShaderMaterial({
      transparent: true,
      fog: false,
      uniforms: {
        uSunDir: { value: this.sunDir.clone() },
        uTopColor: { value: new THREE.Color('#fffdf5') },
        uSunRim: { value: new THREE.Color('#ffe7b3') },
        uShadowColor: { value: new THREE.Color('#bfd4ed') },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vNormalW;
        varying float vHeight;
        void main() {
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vHeight = color.r;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uTopColor;
        uniform vec3 uSunRim;
        uniform vec3 uShadowColor;
        varying vec3 vNormalW;
        varying float vHeight;
        void main() {
          vec3 n = normalize(vNormalW);
          float ndl = dot(n, normalize(uSunDir)) * 0.5 + 0.5;
          float lift = clamp(vHeight * 0.65 + ndl * 0.45, 0.0, 1.0);
          vec3 col = mix(uShadowColor, uTopColor, smoothstep(0.18, 0.88, lift));
          // Frange dorée côté soleil (silver lining)
          col += uSunRim * pow(max(dot(n, normalize(uSunDir)), 0.0), 3.0) * 0.16;
          gl_FragColor = vec4(col, 0.94);
        }
      `,
    });

    // Crée 3 gabarits de cumulus volumétriques multi-strates (base cotonneuse + tourelles boursouflées)
    const buildCloudTemplate = (seed) => {
      const parts = [];
      const puffCount = 11 + (seed % 4);
      for (let i = 0; i < puffCount; i++) {
        const layer = i < 5 ? 0 : i < 9 ? 1 : 2;
        const ang = (i / puffCount) * Math.PI * 2 + seed;
        const spread = layer === 0 ? 6.8 : layer === 1 ? 4.2 : 1.7;
        const px = Math.cos(ang) * spread * (0.65 + hash2(i, seed) * 0.55);
        const pz = Math.sin(ang) * spread * 0.68;
        const py = layer * 2.35 + hash2(seed, i) * 0.9;
        const rx = (layer === 0 ? 5.2 : layer === 1 ? 4.1 : 3.3) * (0.85 + hash2(i + 2, seed) * 0.35);
        const ry = (layer === 0 ? 2.6 : layer === 1 ? 3.2 : 3.4);
        const rz = rx * 0.82;

        const g = new THREE.IcosahedronGeometry(1.0, 2);
        const pos = g.attributes.position;
        for (let k = 0; k < pos.count; k++) {
          let vx = pos.getX(k) * rx;
          let vy = pos.getY(k) * ry;
          let vz = pos.getZ(k) * rz;
          if (vy < -0.6) vy = -0.6 + (vy + 0.6) * 0.35;
          pos.setXYZ(k, vx + px, vy + py, vz + pz);
        }
        g.computeVertexNormals();
        parts.push(g);
      }
      const merged = mergeIndexedGeometries(parts);
      // Stocke le facteur vertical (0..1) dans le vertex color pour le shader nuageux
      paintVerticalGradient(merged, '#181818', '#ffffff', -1.8, 7.2);
      return merged;
    };

    const templates = [buildCloudTemplate(1), buildCloudTemplate(5), buildCloudTemplate(9)];
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(templates[i % templates.length], cloudMat);
      const scale = 0.88 + (i % 4) * 0.32;
      mesh.scale.set(scale * 1.12, scale * 0.96, scale);
      mesh.position.set(
        -155 + i * 22 + (hash2(i, 2) - 0.5) * 14,
        48 + (i % 3) * 9,
        -120 + ((i * 41) % 230)
      );
      mesh.rotation.y = hash2(i, 9) * Math.PI * 2;
      this.scene.add(mesh);
      this.clouds.push({ mesh, speed: 0.45 + (i % 3) * 0.24 });
    }
  }

  _buildSculptedTerrain() {
    // Maillage de terrain sculpté 112x112 avec vraies collines & parois rocheuses escarpées
    const span = 220;
    const segs = 112;
    const geo = new THREE.PlaneGeometry(span, span, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    // Coloration par sommet selon altitude & pente : prairie -> mousse -> falaises rocheuses -> terre humide
    const norm = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const cNeutral = new THREE.Color('#ffffff');   // Laisse parler la texture terrainMap dans le village
    const cCliff = new THREE.Color('#8e8980');     // Paroi rocheuse escarpée
    const cMoss = new THREE.Color('#7ca352');      // Mousse sur versants
    const cHigh = new THREE.Color('#c2c8a8');      // Crête ensoleillée
    const cWet = new THREE.Color('#7f7357');       // Terre humide en bord d'eau
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const ny = norm.getY(i); // 1 = plat, < 0.85 = pente raide / falaise
      tmp.copy(cNeutral);

      if (y < -0.18) {
        tmp.lerp(cWet, Math.min(1, (-y - 0.18) * 1.1));
      } else if (y > 0.4) {
        // Versants herbeux & mousseux
        tmp.lerp(cMoss, Math.min(0.45, y / 18));
        // Parois rocheuses escarpées sur les pentes fortes
        const cliffFactor = THREE.MathUtils.clamp((0.89 - ny) * 4.2, 0, 0.92);
        tmp.lerp(cCliff, cliffFactor);
        if (y > 14) {
          tmp.lerp(cHigh, Math.min(0.35, (y - 14) / 14));
        }
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      map: this.textures.terrainMap,
      normalMap: this.textures.terrainDetail.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: this.textures.terrainDetail.roughnessMap,
      roughness: 0.94,
      metalness: 0.02,
      vertexColors: true,
    });

    const ground = new THREE.Mesh(geo, terrainMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Puits central en pierre taillée PBR sur la place du village
    const well = new THREE.Group();
    well.position.set(2, 0, 1.5);
    const stoneMat = this.textures.createPBRMaterial('stone', { normalStrength: 1.1 });
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.0 });
    const roofMat = this.textures.createPBRMaterial('roofRed', { normalStrength: 1.0 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.2, 0.98, 14), stoneMat);
    base.position.y = 0.49;
    base.castShadow = true;
    base.receiveShadow = true;
    well.add(base);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.11, 8, 18), stoneMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.98;
    rim.castShadow = true;
    well.add(rim);

    const waterDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.92, 14),
      new THREE.MeshStandardMaterial({
        color: '#2e9fd4',
        roughness: 0.12,
        metalness: 0.25,
        normalMap: this.textures.waterWave.normalMap,
      })
    );
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.72;
    well.add(waterDisc);

    [-0.88, 0.88].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.72, 0.15), woodMat);
      post.position.set(px, 1.66, 0);
      post.castShadow = true;
      well.add(post);
    });
    const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.72, 8), woodMat);
    winch.rotation.z = Math.PI / 2;
    winch.position.set(0, 1.52, 0);
    well.add(winch);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.52, 1.02, 4), roofMat);
    roof.position.y = 2.86;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    well.add(roof);
    this.scene.add(well);
  }

  _buildRiverBrookAndBridge() {
    // Matériau eau PBR spéculaire avec ondulation normale dynamique (soleil reflété !)
    const makeWaterMat = (colorHex, opacity = 0.86) => {
      const nMap = this.textures.waterWave.normalMap.clone();
      nMap.needsUpdate = true;
      nMap.wrapS = THREE.RepeatWrapping;
      nMap.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({
        color: colorHex,
        normalMap: nMap,
        normalScale: new THREE.Vector2(0.75, 0.75),
        roughness: 0.11,
        metalness: 0.28,
        transparent: true,
        opacity,
      });
    };

    // 1. Rivière principale courbée
    const segs = 80;
    const width = 9.0;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = -110 + t * 220;
      const cz = getRiverCenterZ(x);
      positions.push(x, -0.14, cz - width * 0.5);
      positions.push(x, -0.14, cz + width * 0.5);
      uvs.push(t * 22, 0);
      uvs.push(t * 22, 1.5);
      if (i < segs) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const riverGeo = new THREE.BufferGeometry();
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    riverGeo.setIndex(indices);
    riverGeo.computeVertexNormals();

    const riverMat = makeWaterMat('#2c9fd4', 0.87);
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.receiveShadow = true;
    this.scene.add(riverMesh);
    this.waterMeshes.push({ mesh: riverMesh, speedX: 0.18, speedY: 0.05 });

    // 2. Ruisseau & bassin clair près de la Carrière de Pierre (Est)
    const bSegs = 36;
    const bPos = [];
    const bUvs = [];
    const bIdx = [];
    for (let i = 0; i <= bSegs; i++) {
      const t = i / bSegs;
      const z = -30 + t * 63;
      const cx = getBrookCenterX(z);
      const bw = 2.6 + Math.sin(t * Math.PI) * 1.3; // S'élargit en bassin clair près de la carrière
      bPos.push(cx - bw * 0.5, -0.12, z);
      bPos.push(cx + bw * 0.5, -0.12, z);
      bUvs.push(0, t * 12);
      bUvs.push(1.2, t * 12);
      if (i < bSegs) {
        const a = i * 2;
        bIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const brookGeo = new THREE.BufferGeometry();
    brookGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
    brookGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bUvs, 2));
    brookGeo.setIndex(bIdx);
    brookGeo.computeVertexNormals();

    const brookMat = makeWaterMat('#38b5de', 0.84);
    const brookMesh = new THREE.Mesh(brookGeo, brookMat);
    brookMesh.receiveShadow = true;
    this.scene.add(brookMesh);
    this.waterMeshes.push({ mesh: brookMesh, speedX: 0.04, speedY: -0.26 });

    // 3. Pont villageois en pierre taillée & chêne PBR (traversable à pied et en charrette)
    const bridge = new THREE.Group();
    bridge.position.set(VILLAGE_LAYOUT.bridge.x, 0, VILLAGE_LAYOUT.bridge.z);
    bridge.rotation.y = VILLAGE_LAYOUT.bridge.rotY;

    const stoneMat = this.textures.createPBRMaterial('stone', { normalStrength: 1.15 });
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.0 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.36, 11.8), woodMat);
    deck.position.y = 0.22;
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridge.add(deck);

    [-2.45, 2.45].forEach((px) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.98, 11.6), stoneMat);
      wall.position.set(px, 0.68, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      bridge.add(wall);

      // Bornes de pierre aux extrémités du pont
      [-5.6, 0, 5.6].forEach((bz) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.24, 0.62), stoneMat);
        pillar.position.set(px, 0.82, bz);
        pillar.castShadow = true;
        bridge.add(pillar);
      });
    });
    this.scene.add(bridge);
  }

  _buildRichInstancedNature() {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const isPlotBlocked = (x, z, pad = 0.8) => {
      if (isInsideRiver(x, z, 1.6)) return true;
      if (z > -32 && z < 34 && Math.abs(x - getBrookCenterX(z)) < 3.4) return true;
      if (Math.hypot(x - 2, z - 4) < 7.2) return true;
      if (Math.hypot(x - VILLAGE_LAYOUT.workbench.x, z - VILLAGE_LAYOUT.workbench.z) < 4.5) return true;
      for (const b of VILLAGE_LAYOUT.buildings) {
        if (Math.abs(x - b.x) < b.width * 0.62 + pad && Math.abs(z - b.z) < b.depth * 0.62 + pad) {
          return true;
        }
      }
      return false;
    };

    // ------------------------------------------------------------------
    // 1. TOUFFES D'HERBE MULTI-BRINS INCLINÉES + ONDULATION AU VENT (InstancedMesh)
    // ------------------------------------------------------------------
    const bladeParts = [];
    for (let b = 0; b < 5; b++) {
      const ang = (b / 5) * Math.PI * 2 + b * 0.3;
      const g = new THREE.PlaneGeometry(0.11, 0.48, 1, 2);
      g.translate(0, 0.24, 0);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const vy = p.getY(k);
        // Pointe effilée et légère courbure naturelle
        if (vy > 0.42) p.setX(k, p.getX(k) * 0.12);
        p.setZ(k, vy * vy * 0.45);
      }
      g.rotateY(ang);
      g.translate(Math.cos(ang) * 0.06, 0, Math.sin(ang) * 0.06);
      g.computeVertexNormals();
      bladeParts.push(g);
    }
    const tuftGeo = mergeIndexedGeometries(bladeParts);
    paintVerticalGradient(tuftGeo, '#417d28', '#b4e655', 0, 0.48);
    // Normales orientées vers le ciel (technique Fortnite/BOTW) pour un gazon lumineux sans faces noires
    const tNorm = tuftGeo.attributes.normal;
    for (let i = 0; i < tNorm.count; i++) tNorm.setXYZ(i, 0, 1, 0);

    const tuftMat = applyWindShader(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
      this.windUniforms,
      0.26,
      2.3,
      0.04
    );

    const grassCount = 3400;
    const grassMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, grassCount);
    grassMesh.receiveShadow = true;

    let gPlaced = 0;
    for (let attempt = 0; attempt < 7200 && gPlaced < grassCount; attempt++) {
      const x = (Math.random() - 0.5) * 145;
      const z = (Math.random() - 0.5) * 145;
      if (isPlotBlocked(x, z, 0.9)) continue;
      const y = getTerrainHeight(x, z);
      if (y < 0 || y > 11) continue;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const sc = 0.72 + Math.random() * 0.85;
      dummy.scale.set(sc, sc * (0.8 + Math.random() * 0.5), sc);
      dummy.updateMatrix();
      grassMesh.setMatrixAt(gPlaced, dummy.matrix);

      color.setHSL(0.24 + (Math.random() - 0.5) * 0.06, 0.35, 0.88 + Math.random() * 0.18);
      grassMesh.setColorAt(gPlaced, color);
      gPlaced++;
    }
    grassMesh.count = gPlaced;
    grassMesh.instanceMatrix.needsUpdate = true;
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
    this.scene.add(grassMesh);

    // ------------------------------------------------------------------
    // 2. FOUGÈRES & FLEURS SAUVAGES (COQUELICOTS ROUGES & PISSENLITS DORÉS)
    // ------------------------------------------------------------------
    const fernParts = [];
    for (let f = 0; f < 6; f++) {
      const ang = (f / 6) * Math.PI * 2;
      const frond = new THREE.PlaneGeometry(0.24, 0.62, 1, 2);
      frond.translate(0, 0.31, 0);
      frond.rotateX(1.18);
      frond.rotateY(ang);
      fernParts.push(frond);
    }
    const fernGeo = mergeIndexedGeometries(fernParts);
    paintVerticalGradient(fernGeo, '#2e6e24', '#86cc44', 0, 0.38);
    const fNorm = fernGeo.attributes.normal;
    for (let i = 0; i < fNorm.count; i++) fNorm.setXYZ(i, 0, 1, 0);
    const fernMat = applyWindShader(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: THREE.DoubleSide }),
      this.windUniforms,
      0.16,
      1.9,
      0.02
    );
    const fernMesh = new THREE.InstancedMesh(fernGeo, fernMat, 320);
    let fPlaced = 0;
    for (let i = 0; i < 800 && fPlaced < 320; i++) {
      const x = (Math.random() - 0.5) * 135;
      const z = (Math.random() - 0.5) * 135;
      if (isPlotBlocked(x, z, 1.1)) continue;
      const y = getTerrainHeight(x, z);
      if (y < 0 || y > 9) continue;
      dummy.position.set(x, y + 0.02, z);
      dummy.rotation.set(0, Math.random() * 6.28, 0);
      dummy.scale.setScalar(0.75 + Math.random() * 0.75);
      dummy.updateMatrix();
      fernMesh.setMatrixAt(fPlaced++, dummy.matrix);
    }
    fernMesh.count = fPlaced;
    fernMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(fernMesh);

    // Fleurs sauvages (tige + corolle colorée : coquelicots #e6392e, pissenlits #ffd22b, pâquerettes #fffaf0)
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.34, 4);
    stemGeo.translate(0, 0.17, 0);
    const petalGeo = new THREE.DodecahedronGeometry(0.085, 0);
    petalGeo.scale(1.25, 0.55, 1.25);
    petalGeo.translate(0, 0.35, 0);

    const stemMat = applyWindShader(
      new THREE.MeshLambertMaterial({ color: '#4c8f2b' }),
      this.windUniforms,
      0.22,
      2.5,
      0.02
    );
    const petalMat = applyWindShader(
      new THREE.MeshStandardMaterial({ roughness: 0.65 }),
      this.windUniforms,
      0.22,
      2.5,
      0.02
    );
    const flowerMax = 420;
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerMax);
    const petals = new THREE.InstancedMesh(petalGeo, petalMat, flowerMax);
    const flowerPalette = [0xe8382c, 0xffd22b, 0xffd22b, 0xfff8eb, 0xe8382c];

    let flPlaced = 0;
    for (let i = 0; i < 1100 && flPlaced < flowerMax; i++) {
      const x = (Math.random() - 0.5) * 124;
      const z = (Math.random() - 0.5) * 124;
      if (isPlotBlocked(x, z, 1.2)) continue;
      const y = getTerrainHeight(x, z);
      if (y < 0 || y > 7) continue;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.random() * 6.28, 0);
      dummy.scale.setScalar(0.85 + Math.random() * 0.55);
      dummy.updateMatrix();
      stems.setMatrixAt(flPlaced, dummy.matrix);
      petals.setMatrixAt(flPlaced, dummy.matrix);
      color.setHex(flowerPalette[flPlaced % flowerPalette.length]);
      petals.setColorAt(flPlaced, color);
      flPlaced++;
    }
    stems.count = flPlaced;
    petals.count = flPlaced;
    stems.instanceMatrix.needsUpdate = true;
    petals.instanceMatrix.needsUpdate = true;
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
    this.scene.add(stems, petals);

    // ------------------------------------------------------------------
    // 3. VRAIS CHÊNES & PINS MÉDIÉVAUX SCULPTÉS + BALANCEMENT AU VENT
    // ------------------------------------------------------------------
    const oak = buildSculptedOakGeometries();
    const pine = buildSculptedPineGeometries();

    const barkMat = new THREE.MeshStandardMaterial({
      map: this.textures.wood,
      normalMap: this.textures.sets.wood.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 0.9,
      vertexColors: true,
    });
    const oakLeafMat = applyWindShader(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0.0,
      }),
      this.windUniforms,
      0.065,
      1.35,
      2.6
    );
    const pineLeafMat = applyWindShader(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.86,
        metalness: 0.0,
      }),
      this.windUniforms,
      0.055,
      1.15,
      1.8
    );

    const oakSpots = [];
    const pineSpots = [];
    for (let i = 0; i < 115; i++) {
      const ang = (i / 115) * Math.PI * 2 + (hash2(i, 3) - 0.5) * 0.16;
      const rad = 52 + hash2(i, 11) * 44;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      if (isInsideRiver(x, z, 3.2)) continue;
      const y = getTerrainHeight(x, z);
      if (y > 16) continue;
      const spot = { x, y, z, scale: 0.88 + hash2(i, 17) * 0.72, rot: hash2(i, 23) * 6.28 };
      if (i % 2 === 0 && y < 7.5) oakSpots.push(spot);
      else pineSpots.push(spot);
    }

    // Quelques beaux chênes d'ornement en lisière des prairies du village (comme sur menu.jpg)
    [[-26, -6, 1.15], [16, -28, 1.05], [-14, 24, 1.1], [40, 22, 1.0]].forEach(([x, z, sc]) => {
      oakSpots.push({ x, y: getTerrainHeight(x, z), z, scale: sc, rot: x * 0.4 });
    });

    const spawnTreeInst = (geoPair, leafMat, spots) => {
      const tr = new THREE.InstancedMesh(geoPair.trunkGeo, barkMat, spots.length);
      const ca = new THREE.InstancedMesh(geoPair.canopyGeo, leafMat, spots.length);
      tr.castShadow = true;
      tr.receiveShadow = true;
      ca.castShadow = true;
      ca.receiveShadow = true;
      spots.forEach((s, idx) => {
        dummy.position.set(s.x, s.y - 0.12, s.z);
        dummy.rotation.set(0, s.rot, 0);
        dummy.scale.setScalar(s.scale);
        dummy.updateMatrix();
        tr.setMatrixAt(idx, dummy.matrix);
        ca.setMatrixAt(idx, dummy.matrix);
        color.setHSL(0.25 + (hash2(idx, 5) - 0.5) * 0.05, 0.18, 0.94 + hash2(idx, 8) * 0.14);
        ca.setColorAt(idx, color);
      });
      tr.instanceMatrix.needsUpdate = true;
      ca.instanceMatrix.needsUpdate = true;
      if (ca.instanceColor) ca.instanceColor.needsUpdate = true;
      this.scene.add(tr, ca);
    };

    spawnTreeInst(oak, oakLeafMat, oakSpots);
    spawnTreeInst(pine, pineLeafMat, pineSpots);

    // ------------------------------------------------------------------
    // 4. ROCHERS MOUSSUS & SOUCHES D'ARBRES (InstancedMesh)
    // ------------------------------------------------------------------
    const rockGeo = new THREE.DodecahedronGeometry(0.72, 1);
    paintVerticalGradient(rockGeo, '#6c7276', '#728d54', -0.4, 0.65); // Bas pierre, dessus moussu !
    const rockMat = new THREE.MeshStandardMaterial({
      map: this.textures.stone,
      normalMap: this.textures.sets.stone.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 0.88,
      vertexColors: true,
    });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, 75);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;

    let rCount = 0;
    // Rochers au bord du ruisseau de la carrière & de la rivière
    for (let i = 0; i < 75; i++) {
      let x, z;
      if (i < 24) {
        z = -28 + (i / 24) * 56;
        x = getBrookCenterX(z) + (i % 2 === 0 ? -2.2 : 2.2) + (Math.random() - 0.5) * 1.0;
      } else if (i < 48) {
        x = -68 + ((i - 24) / 24) * 136;
        z = getRiverCenterZ(x) + (i % 2 === 0 ? -5.1 : 5.1);
      } else {
        const ang = (i / 27) * Math.PI * 2;
        const dist = 42 + Math.random() * 24;
        x = Math.cos(ang) * dist;
        z = Math.sin(ang) * dist;
      }
      if (isPlotBlocked(x, z, 0.4) && i >= 48) continue;
      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y + 0.12, z);
      dummy.rotation.set(Math.random() * 3, Math.random() * 6, Math.random() * 3);
      const sx = 0.6 + Math.random() * 1.25;
      dummy.scale.set(sx, sx * 0.65, sx * 0.92);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(rCount++, dummy.matrix);
    }
    rockMesh.count = rCount;
    rockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(rockMesh);

    // Souches d'arbres près de la zone d'extraction et des chemins
    const stumpGeo = new THREE.CylinderGeometry(0.32, 0.44, 0.55, 8);
    stumpGeo.translate(0, 0.27, 0);
    const stumpMat = this.textures.createPBRMaterial('wood', { color: '#9c7148' });
    const stumpCoords = [
      [-37, 3], [-39, -5], [-31, 6], [-28, 12], [-42, 7], [-33, -10], [34, -8], [43, -4],
    ];
    const stumps = new THREE.InstancedMesh(stumpGeo, stumpMat, stumpCoords.length);
    stumps.castShadow = true;
    stumps.receiveShadow = true;
    stumpCoords.forEach(([sx, sz], i) => {
      dummy.position.set(sx, getTerrainHeight(sx, sz), sz);
      dummy.rotation.set(0, i * 1.1, 0);
      dummy.scale.setScalar(0.85 + (i % 3) * 0.18);
      dummy.updateMatrix();
      stumps.setMatrixAt(i, dummy.matrix);
    });
    stumps.instanceMatrix.needsUpdate = true;
    this.scene.add(stumps);
  }

  _buildWoodenFencesAndDetails() {
    // Clôtures rustiques médiévales en bois le long des chemins & des champs (InstancedMesh)
    const woodMat = this.textures.createPBRMaterial('wood', { color: '#9c6e44', normalStrength: 1.0 });
    const postGeo = new THREE.BoxGeometry(0.14, 1.08, 0.14);
    postGeo.translate(0, 0.54, 0);
    const railGeo = new THREE.BoxGeometry(2.4, 0.09, 0.07);

    const fenceRuns = [
      // Le long du chemin vers le pont & les champs Ouest
      [[-20, 20], [-22, 14], [-18, 10]],
      // Bordure du champ Nord-Ouest de l'église
      [[-22, -14], [-28, -12], [-34, -10]],
      // Bordure du chemin vers la Mairie & le Banc de scie
      [[16, -2], [20, -4], [24, -6]],
      // Bordure du champ Est près de la Carrière
      [[38, 1], [44, 0], [49, -1]],
      // Bordure Sud près de la rivière
      [[-10, 26], [-4, 27.5], [2, 27.5], [8, 26.5]],
    ];

    const posts = [];
    const rails = [];
    for (const run of fenceRuns) {
      for (let i = 0; i < run.length; i++) {
        const [x0, z0] = run[i];
        posts.push({ x: x0, z: z0 });
        if (i < run.length - 1) {
          const [x1, z1] = run[i + 1];
          const mx = (x0 + x1) * 0.5;
          const mz = (z0 + z1) * 0.5;
          const len = Math.hypot(x1 - x0, z1 - z0);
          const yaw = -Math.atan2(z1 - z0, x1 - x0);
          rails.push({ x: mx, y: 0.42, z: mz, len, yaw });
          rails.push({ x: mx, y: 0.82, z: mz, len, yaw });
        }
      }
    }

    const dummy = new THREE.Object3D();
    const postMesh = new THREE.InstancedMesh(postGeo, woodMat, posts.length);
    postMesh.castShadow = true;
    postMesh.receiveShadow = true;
    posts.forEach((p, idx) => {
      dummy.position.set(p.x, getTerrainHeight(p.x, p.z), p.z);
      dummy.rotation.set(0, idx * 0.2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      postMesh.setMatrixAt(idx, dummy.matrix);
    });
    postMesh.instanceMatrix.needsUpdate = true;

    const railMesh = new THREE.InstancedMesh(railGeo, woodMat, rails.length);
    railMesh.castShadow = true;
    rails.forEach((r, idx) => {
      dummy.position.set(r.x, getTerrainHeight(r.x, r.z) + r.y, r.z);
      dummy.rotation.set(0, r.yaw, 0);
      dummy.scale.set(r.len / 2.4, 1, 1);
      dummy.updateMatrix();
      railMesh.setMatrixAt(idx, dummy.matrix);
    });
    railMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(postMesh, railMesh);
  }

  _buildStockYards() {
    const woodMat = this.textures.createPBRMaterial('wood');
    const brickMat = this.textures.createPBRMaterial('brick', { color: '#cf7452' });
    const stoneMat = this.textures.createPBRMaterial('stone');

    // Zone 1 : Stock de briques (NE près de la carrière)
    const bs = new THREE.Group();
    bs.position.set(VILLAGE_LAYOUT.brickStock.x, 0, VILLAGE_LAYOUT.brickStock.z);
    const plat1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 4.6), woodMat);
    plat1.position.y = 0.1;
    plat1.receiveShadow = true;
    bs.add(plat1);
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

    // Zone 2 : Stockage de ressources / rondins (Ouest)
    const rs = new THREE.Group();
    rs.position.set(VILLAGE_LAYOUT.resourceStock.x, 0, VILLAGE_LAYOUT.resourceStock.z);
    const plat2 = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.2, 4.4), woodMat);
    plat2.position.y = 0.1;
    plat2.receiveShadow = true;
    rs.add(plat2);
    const logGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.2, 8);
    logGeo.rotateZ(Math.PI / 2);
    const logMat = this.textures.createPBRMaterial('wood', { color: '#8a572c' });
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

  // Centre dynamiquement la shadow map 2048x2048 sur la position du joueur (snappée aux texels)
  updateShadowFocus(focusPos) {
    if (!this.sunLight || !focusPos) return;
    const snap = 0.25;
    const fx = Math.round(focusPos.x / snap) * snap;
    const fz = Math.round(focusPos.z / snap) * snap;
    this.sunLight.target.position.set(fx, 0, fz);
    this.sunLight.position.set(
      fx + this.sunDir.x * 85,
      this.sunDir.y * 85,
      fz + this.sunDir.z * 85
    );
    this.sunLight.target.updateMatrixWorld();
  }

  update(dt, elapsed, focusPos) {
    this.windUniforms.uWindTime.value = elapsed;

    // Ombres haute précision centrées sur le joueur
    if (focusPos) {
      this.updateShadowFocus(focusPos);
    }

    // Ondulation & reflets spéculaires de la rivière et du ruisseau de la carrière
    for (const w of this.waterMeshes) {
      const nm = w.mesh.material.normalMap;
      if (nm) {
        nm.offset.x = (nm.offset.x + dt * w.speedX) % 1;
        nm.offset.y = (nm.offset.y + dt * w.speedY) % 1;
      }
    }

    // Dérive lente des nuages volumétriques multi-strates
    for (const c of this.clouds) {
      c.mesh.position.x += dt * c.speed;
      if (c.mesh.position.x > 165) c.mesh.position.x = -165;
    }

    // Pulsation discrète du faisceau diégétique
    if (this.beaconGroup && this.beaconGroup.visible) {
      this.beaconGroup.rotation.y += dt * 0.8;
      const s = 1 + Math.sin(elapsed * 3.2) * 0.12;
      this.beaconGroup.children[1].scale.set(s, s, 1);
    }
  }
}
