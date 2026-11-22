// src/world.js — Modèles 3D sculptés riches (style Fortnite / Valheim stylisé) pour iPhone 16e 60 FPS
// INTERDICTION RESPECTÉE : zéro SphereGeometry ni ConeGeometry bruts pour arbres, buissons, nuages, herbe ou puits.
// Tronc/branches en TubeGeometry + écorce fissurée PBR, feuillage IcosahedronGeometry(1,2) déformé par bruit 3D,
// herbe en 6 lames paraboliques courbées, fougères, buissons à baies, fleurs, rochers fracturés stratifiés,
// puits médiéval à charpente/chevrons/tuiles en relief/manivelle/corde/seau, nuages sculptés à base plate.

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
      rotY: 0,
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
// HYDROLOGIE, BRUIT 3D & RELIEF NATUREL
// ============================================================================

export function getRiverCenterZ(x) {
  return 31 + Math.sin((x + 28) * 0.042) * 7.5 - Math.cos(x * 0.025) * 3.0;
}

export function getBrookCenterX(z) {
  return 58.5 + Math.sin(z * 0.09) * 3.2 - (z + 24) * 0.08;
}

export function isInsideRiver(x, z, margin = 0) {
  if (Math.abs(x - VILLAGE_LAYOUT.bridge.x) < 3.6 && Math.abs(z - VILLAGE_LAYOUT.bridge.z) < 7.5) {
    return false;
  }
  const rz = getRiverCenterZ(x);
  return Math.abs(z - rz) < (4.4 + margin);
}

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 269.5 + z * 419.2) * 43758.5453123;
  return s - Math.floor(s);
}

// Bruit 3D trilinéaire lisse pour sculpter feuillages, nuages et roches
export function noise3D(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;
  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
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

export function getTerrainHeight(x, z) {
  const rx = (x - 4) / 60;
  const rz = (z - 2) / 48;
  const r = Math.hypot(rx, rz);

  const riverDist = Math.abs(z - getRiverCenterZ(x));
  let riverCarve = 0;
  if (riverDist < 6.2) {
    const t = Math.max(0, 1 - riverDist / 6.2);
    riverCarve = -t * t * 1.15;
  }

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

  const edge = Math.min(1, (r - 1.0) / 0.85);
  const smoothEdge = edge * edge * (3 - 2 * edge);
  const n = fbm(x * 0.032, z * 0.032);
  const ridge = 1 - Math.abs(valueNoise(x * 0.055 + 5, z * 0.055 - 3) * 2 - 1);
  const quarryBoost = x > 35 && z < 5 ? 1.45 : 1.0;
  const hillH = smoothEdge * (4.5 + n * 15.0 + ridge * ridge * 9.5) * quarryBoost;

  const riverMask = riverDist < 11 ? Math.max(0, (riverDist - 4.5) / 6.5) : 1;
  return hillH * riverMask + Math.min(riverCarve, brookCarve);
}

// ============================================================================
// GÉNÉRATEUR PBR 512x512 (ALBEDO + NORMAL MAP + ROUGHNESS MAP)
// ============================================================================

function heightFieldToNormalAndRoughness(heightBuf, size, strength, baseRough, roughRange) {
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const nImg = nCtx.createImageData(size, size);
  const nd = nImg.data;

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

  // 1. Pierre taillée (512x512)
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
        ctx.fillStyle = 'rgba(255, 250, 238, 0.22)';
        ctx.fillRect(x, y, bw, 5);
        ctx.fillStyle = 'rgba(42, 36, 28, 0.24)';
        ctx.fillRect(x, y + bh - 5, bw, 5);

        hctx.fillStyle = '#989898';
        hctx.fillRect(x, y, bw, bh);
        hctx.fillStyle = '#d6d6d6';
        hctx.fillRect(x + 4, y + 4, bw - 8, bh - 8);
      }
    }
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

  // 2. Roche stratifiée naturelle pour falaises & blocs de carrière (512x512)
  const rockSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#8b877d';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, w, w);

    // Strates sédimentaires ondulées
    for (let s = 0; s < 26; s++) {
      const sy = (s / 26) * w;
      const sh = (w / 26) + 4;
      const v = 122 + Math.floor(hash2(s, 4) * 44);
      const warm = Math.floor(hash2(s, 11) * 18);
      ctx.fillStyle = `rgb(${v + warm}, ${v + warm - 3}, ${v - 7})`;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      for (let x = 0; x <= w; x += 32) {
        ctx.lineTo(x, sy + Math.sin(x * 0.018 + s * 1.4) * 8);
      }
      ctx.lineTo(w, sy + sh + 10);
      ctx.lineTo(0, sy + sh + 10);
      ctx.closePath();
      ctx.fill();

      // Fissures entre strates en relief négatif
      ctx.strokeStyle = 'rgba(36, 32, 26, 0.42)';
      ctx.lineWidth = 3;
      ctx.stroke();

      const hv = 95 + Math.floor(hash2(s, 19) * 110);
      hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
      hctx.fillRect(0, sy, w, sh);
      hctx.fillStyle = '#1f1f1f';
      hctx.fillRect(0, sy, w, 4);
    }
    // Failles obliques & grain granitique
    for (let f = 0; f < 18; f++) {
      const x0 = Math.random() * w;
      const y0 = Math.random() * w;
      const dx = (Math.random() - 0.5) * 140;
      const dy = 40 + Math.random() * 110;
      ctx.strokeStyle = 'rgba(34, 30, 24, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + dx, y0 + dy);
      ctx.stroke();
      hctx.strokeStyle = '#141414';
      hctx.lineWidth = 4;
      hctx.beginPath();
      hctx.moveTo(x0, y0);
      hctx.lineTo(x0 + dx, y0 + dy);
      hctx.stroke();
    }
    for (let i = 0; i < 4200; i++) {
      const px = Math.random() * w;
      const py = Math.random() * w;
      const light = Math.random() > 0.5;
      ctx.fillStyle = light ? 'rgba(255,250,235,0.11)' : 'rgba(28,25,20,0.14)';
      ctx.fillRect(px, py, 2 + Math.random() * 2, 2);
      hctx.fillStyle = light ? 'rgba(245,245,245,0.2)' : 'rgba(15,15,15,0.22)';
      hctx.fillRect(px, py, 2, 2);
    }
  }, { normalStrength: 5.5, baseRough: 0.74, roughRange: 0.24 });

  // 3. Écorce fissurée profonde pour chênes & pins (512x512)
  const barkSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#5c3a1f';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#404040';
    hctx.fillRect(0, 0, w, w);

    // Crêtes verticales d'écorce et profondes crevasses
    for (let i = 0; i < 54; i++) {
      const x = (i / 54) * w;
      const ridgeW = 6 + hash2(i, 7) * 9;
      const v = 74 + Math.floor(hash2(i, 3) * 38);
      ctx.fillStyle = `rgb(${v + 28}, ${v - 2}, ${v - 28})`;
      hctx.fillStyle = '#d4d4d4';
      ctx.beginPath();
      hctx.beginPath();
      for (let y = 0; y <= w; y += 24) {
        const wob = Math.sin(y * 0.025 + i * 1.7) * 5;
        if (y === 0) {
          ctx.moveTo(x + wob, y);
          hctx.moveTo(x + wob, y);
        } else {
          ctx.lineTo(x + wob, y);
          hctx.lineTo(x + wob, y);
        }
      }
      ctx.lineWidth = ridgeW;
      ctx.strokeStyle = `rgb(${v + 28}, ${v - 2}, ${v - 28})`;
      ctx.stroke();

      hctx.lineWidth = ridgeW;
      hctx.strokeStyle = '#cfcfcf';
      hctx.stroke();

      // Crevasse sombre bordant la crête
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(26, 14, 6, 0.65)';
      ctx.stroke();
      hctx.lineWidth = 3;
      hctx.strokeStyle = '#121212';
      hctx.stroke();
    }
    // Touches de lichen & mousses sur l'écorce
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = 'rgba(104, 132, 66, 0.16)';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * w, 4 + Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { normalStrength: 5.8, baseRough: 0.82, roughRange: 0.16, repeatX: 2, repeatY: 2 });

  // 4. Briques de construction (512x512)
  const brickSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#cfc7b8';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#181818';
    hctx.fillRect(0, 0, w, w);

    const rows = 8, cols = 4;
    const rowH = w / rows, colW = w / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + off + 4;
        const y = r * rowH + 4;
        const bw = colW - 8, bh = rowH - 8;
        const v = 196 + Math.floor(hash2(c * 11 + r, r * 5) * 32);
        ctx.fillStyle = `rgb(${v}, ${v - 6}, ${v - 14})`;
        ctx.fillRect(x, y, bw, bh);
        ctx.fillStyle = 'rgba(255, 250, 240, 0.2)';
        ctx.fillRect(x, y, bw, 4);
        ctx.fillStyle = 'rgba(40, 28, 18, 0.24)';
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

  // 5. Dalles de sol taillées (512x512)
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

  // 6. Bois de chêne veiné en relief (512x512)
  const woodSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#7e5028';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#888888';
    hctx.fillRect(0, 0, w, w);

    const planks = 6, ph = w / planks;
    for (let p = 0; p < planks; p++) {
      const y = p * ph;
      const d = Math.floor(hash2(p, 7) * 26) - 13;
      ctx.fillStyle = `rgb(${136 + d}, ${86 + Math.floor(d * 0.65)}, ${44 + Math.floor(d * 0.45)})`;
      ctx.fillRect(0, y + 3, w, ph - 6);
      ctx.fillStyle = '#3b210d';
      ctx.fillRect(0, y, w, 4);
      hctx.fillStyle = '#181818';
      hctx.fillRect(0, y, w, 5);
      hctx.fillStyle = '#c8c8c8';
      hctx.fillRect(0, y + 6, w, ph - 10);

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
          if (x === 0) { ctx.moveTo(x, gy + wave); hctx.moveTo(x, gy + wave); }
          else { ctx.lineTo(x, gy + wave); hctx.lineTo(x, gy + wave); }
        }
        ctx.stroke();
        hctx.stroke();
      }
    }
  }, { normalStrength: 4.2, baseRough: 0.66, roughRange: 0.26 });

  // 7. Chaume doré à brins superposés (512x512)
  const thatchSet = makePBRSet(S, (ctx, hctx, w) => {
    const grad = ctx.createLinearGradient(0, 0, 0, w);
    grad.addColorStop(0, '#e6c66b');
    grad.addColorStop(0.5, '#d2a84a');
    grad.addColorStop(1, '#b68930');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#707070';
    hctx.fillRect(0, 0, w, w);

    for (let layer = 0; layer < 8; layer++) {
      const ly = layer * (w / 8);
      ctx.fillStyle = 'rgba(92, 58, 16, 0.30)';
      ctx.fillRect(0, ly, w, 7);
      hctx.fillStyle = '#262626';
      hctx.fillRect(0, ly, w, 9);
    }
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * w;
      const len = 18 + Math.random() * 28;
      const lean = (Math.random() - 0.5) * 6;
      const bright = Math.random() > 0.45;
      ctx.strokeStyle = bright ? 'rgba(255, 238, 164, 0.48)' : 'rgba(116, 76, 20, 0.42)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + lean, y + len); ctx.stroke();
      hctx.strokeStyle = bright ? 'rgba(235,235,235,0.45)' : 'rgba(50,50,50,0.4)';
      hctx.lineWidth = 2;
      hctx.beginPath(); hctx.moveTo(x, y); hctx.lineTo(x + lean, y + len); hctx.stroke();
    }
  }, { normalStrength: 4.8, baseRough: 0.84, roughRange: 0.14, repeatX: 2, repeatY: 2 });

  // 8. Tuiles terre cuite & Ardoises (512x512)
  const roofRedSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#8b341d';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#202020';
    hctx.fillRect(0, 0, w, w);
    const rows = 10, cols = 10, rw = w / cols, rh = w / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (rw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * rw + off + 2, y = r * rh + 2;
        const d = Math.floor(hash2(c * 7, r * 13) * 32) - 16;
        ctx.fillStyle = `rgb(${186 + d}, ${78 + Math.floor(d * 0.5)}, ${46 + Math.floor(d * 0.3)})`;
        ctx.fillRect(x, y, rw - 4, rh - 4);
        ctx.fillStyle = 'rgba(255,220,180,0.22)';
        ctx.fillRect(x, y, rw - 4, 6);
        ctx.fillStyle = 'rgba(42,14,8,0.34)';
        ctx.fillRect(x, y + rh - 9, rw - 4, 6);
        const hg = hctx.createLinearGradient(x, y, x, y + rh);
        hg.addColorStop(0, '#555555'); hg.addColorStop(0.85, '#eaeaea'); hg.addColorStop(1, '#1a1a1a');
        hctx.fillStyle = hg;
        hctx.fillRect(x, y, rw - 4, rh - 4);
      }
    }
  }, { normalStrength: 5.0, baseRough: 0.62, roughRange: 0.30, repeatX: 2, repeatY: 2 });

  const roofSlateSet = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#3c4552';
    ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#202020';
    hctx.fillRect(0, 0, w, w);
    const rows = 10, cols = 10, rw = w / cols, rh = w / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (rw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * rw + off + 2, y = r * rh + 2;
        const d = Math.floor(hash2(c * 9, r * 11) * 28) - 14;
        ctx.fillStyle = `rgb(${84 + d}, ${95 + d}, ${112 + d})`;
        ctx.fillRect(x, y, rw - 4, rh - 4);
        ctx.fillStyle = 'rgba(220,238,255,0.16)';
        ctx.fillRect(x, y, rw - 4, 5);
        const hg = hctx.createLinearGradient(x, y, x, y + rh);
        hg.addColorStop(0, '#5a5a5a'); hg.addColorStop(0.85, '#e2e2e2'); hg.addColorStop(1, '#1e1e1e');
        hctx.fillStyle = hg;
        hctx.fillRect(x, y, rw - 4, rh - 4);
      }
    }
  }, { normalStrength: 4.5, baseRough: 0.52, roughRange: 0.32, repeatX: 2, repeatY: 2 });

  // 9. Détail normal terrain & ondes eau
  const terrainDetail = makePBRSet(S, (ctx, hctx, w) => {
    ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, w, w);
    hctx.fillStyle = '#787878'; hctx.fillRect(0, 0, w, w);
    for (let i = 0; i < 6500; i++) {
      const x = Math.random() * w, y = Math.random() * w, rad = 1 + Math.random() * 4.5;
      hctx.fillStyle = Math.random() > 0.48 ? 'rgba(240,240,240,0.22)' : 'rgba(20,20,20,0.22)';
      hctx.beginPath(); hctx.arc(x, y, rad, 0, Math.PI * 2); hctx.fill();
    }
  }, { normalStrength: 2.8, baseRough: 0.78, roughRange: 0.18, repeatX: 22, repeatY: 22 });

  const waterWave = makePBRSet(256, (ctx, hctx, w) => {
    ctx.fillStyle = '#38a8db'; ctx.fillRect(0, 0, w, w);
    const img = hctx.createImageData(w, w);
    const d = img.data;
    for (let y = 0; y < w; y++) {
      for (let x = 0; x < w; x++) {
        const u = (x / w) * Math.PI * 2, v = (y / w) * Math.PI * 2;
        const h = Math.sin(u * 3 + v * 2) * 0.25 + Math.cos(u * 5 - v * 4) * 0.18 + Math.sin(u * 2 + v * 7) * 0.14 + 0.5;
        const b = Math.max(0, Math.min(255, Math.round(h * 255)));
        const i = (y * w + x) * 4;
        d[i] = b; d[i + 1] = b; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    hctx.putImageData(img, 0, 0);
  }, { normalStrength: 2.6, baseRough: 0.08, roughRange: 0.08, repeatX: 14, repeatY: 3 });

  const terrainMap = createVillageTerrainTexture();

  const sets = {
    stone: stoneSet,
    rock: rockSet,
    bark: barkSet,
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
      normalScale: new THREE.Vector2(extra.normalStrength ?? 0.95, extra.normalStrength ?? 0.95),
      roughnessMap: s.roughnessMap,
      roughness: extra.roughness ?? 0.9,
      metalness: extra.metalness ?? 0.04,
      ...(extra.color !== undefined ? { color: extra.color } : {}),
      ...(extra.side !== undefined ? { side: extra.side } : {}),
      ...(extra.vertexColors ? { vertexColors: true } : {}),
      ...(extra.flatShading ? { flatShading: true } : {}),
    });
  }

  return {
    stone: stoneSet.map,
    rock: rockSet.map,
    bark: barkSet.map,
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
  const worldSpan = 220;
  const toPx = (wx, wz) => [
    ((wx + worldSpan * 0.5) / worldSpan) * size,
    ((wz + worldSpan * 0.5) / worldSpan) * size,
  ];

  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#5da438';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 650; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 16 + Math.random() * 54;
    const pick = Math.random();
    if (pick < 0.42) ctx.fillStyle = 'rgba(136, 200, 68, 0.24)';
    else if (pick < 0.78) ctx.fillStyle = 'rgba(56, 122, 38, 0.22)';
    else ctx.fillStyle = 'rgba(116, 146, 52, 0.18)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  for (let i = 0; i < 12000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(164, 218, 86, 0.34)' : 'rgba(48, 102, 30, 0.28)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 4);
  }

  const drawField = (wx, wz, w, h, rot) => {
    const [px, py] = toPx(wx, wz);
    const pw = (w / worldSpan) * size, ph = (h / worldSpan) * size;
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
    ctx.fillStyle = '#b48a44'; ctx.fillRect(-pw * 0.5, -ph * 0.5, pw, ph);
    ctx.fillStyle = '#7c5826';
    for (let y = -ph * 0.46; y < ph * 0.46; y += 4.5) ctx.fillRect(-pw * 0.48, y, pw * 0.96, 2);
    ctx.restore();
  };
  drawField(-29, -18, 13, 8, -0.35);
  drawField(-36, 17, 12, 7, 0.28);
  drawField(44, 5, 13, 8, -0.2);

  const drawRoad = (pts, widthMeters = 4.2) => {
    const pxWidth = (widthMeters / worldSpan) * size;
    const trace = () => {
      ctx.beginPath();
      pts.forEach(([x, z], idx) => {
        const [px, py] = toPx(x, z);
        if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    trace(); ctx.strokeStyle = 'rgba(128, 104, 58, 0.62)'; ctx.lineWidth = pxWidth + 9; ctx.stroke();
    trace(); ctx.strokeStyle = '#c5995d'; ctx.lineWidth = pxWidth; ctx.stroke();
    trace(); ctx.strokeStyle = 'rgba(148, 102, 54, 0.48)'; ctx.lineWidth = pxWidth * 0.62; ctx.stroke();
    trace(); ctx.strokeStyle = '#d9b57c'; ctx.lineWidth = pxWidth * 0.34; ctx.stroke();
  };

  drawRoad([[-24, 42], [-24, 27.5], [-18, 14], [-8, 6], [2, 4], [14, 5], [22, 4], [32, -6], [38, -22], [50, -14]], 4.4);
  drawRoad([[-45, -2], [-34, 10], [-22, 8], [-8, 6]], 3.8);
  drawRoad([[2, 4], [-10, -2], [-15, -10]], 3.8);
  drawRoad([[2, 4], [8, -14], [8, -21]], 3.5);
  drawRoad([[2, 4], [16, -4], [24, -10]], 4.0);
  drawRoad([[-18, 14], [-2, 18], [14, 15], [28, 13], [22, 4]], 3.6);

  const [plx, ply] = toPx(2, 4);
  const plazaGrad = ctx.createRadialGradient(plx, ply, 4, plx, ply, 34);
  plazaGrad.addColorStop(0, '#dcb982');
  plazaGrad.addColorStop(0.75, '#c79e64');
  plazaGrad.addColorStop(1, 'rgba(199,158,100,0)');
  ctx.fillStyle = plazaGrad;
  ctx.beginPath(); ctx.arc(plx, ply, 34, 0, Math.PI * 2); ctx.fill();

  const [qx, qy] = toPx(VILLAGE_LAYOUT.quarry.x, VILLAGE_LAYOUT.quarry.z);
  const qGrad = ctx.createRadialGradient(qx, qy, 8, qx, qy, 68);
  qGrad.addColorStop(0, '#96938a');
  qGrad.addColorStop(0.65, '#b2a68a');
  qGrad.addColorStop(1, 'rgba(178,166,138,0)');
  ctx.fillStyle = qGrad;
  ctx.beginPath(); ctx.arc(qx, qy, 68, 0, Math.PI * 2); ctx.fill();

  ctx.beginPath();
  for (let x = -110; x <= 110; x += 2) {
    const [px, py] = toPx(x, getRiverCenterZ(x));
    if (x === -110) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#756649'; ctx.lineWidth = (12.8 / worldSpan) * size; ctx.stroke();

  ctx.beginPath();
  for (let z = -34; z <= 36; z += 2) {
    const [px, py] = toPx(getBrookCenterX(z), z);
    if (z === -34) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#6f6448'; ctx.lineWidth = (5.8 / worldSpan) * size; ctx.stroke();

  for (let i = 0; i < 4200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,244,218,0.20)' : 'rgba(84,56,28,0.18)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ============================================================================
// OUTILS DE SCULPTURE 3D (TUBEGEOMETRY, ICOSAHEDRON BRUIT 3D, ROCHES FRACTURÉES)
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
    if (col) colors.set(col.array, vOff * 3);
    else for (let k = 0; k < pos.count * 3; k++) colors[vOff * 3 + k] = 1.0;

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

// Crée un tube organique conique le long d'une courbe 3D (troncs, branches maîtresses, racines évasées)
function buildTaperedOrganicTube(points, rStart, rEnd, tubularSegs = 10, radialSegs = 7, bumpAmp = 0.08) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, radialSegs, false);
  const pos = geo.attributes.position;
  const ringVerts = radialSegs + 1;

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const center = curve.getPointAt(t);
    // Évasement prononcé à la base (racines) + amincissement naturel vers le sommet
    const flare = t < 0.22 ? 1.0 + Math.pow(1 - t / 0.22, 2) * 0.42 : 1.0;
    const baseRad = THREE.MathUtils.lerp(rStart, rEnd, t) * flare;

    for (let j = 0; j < ringVerts; j++) {
      const idx = i * ringVerts + j;
      const vx = pos.getX(idx) - center.x;
      const vy = pos.getY(idx) - center.y;
      const vz = pos.getZ(idx) - center.z;
      const n = 1.0 + (noise3D(vx * 3.1 + t * 5.0, vy * 3.1, vz * 3.1) - 0.5) * 2.0 * bumpAmp;
      pos.setXYZ(idx, center.x + vx * baseRad * n, center.y + vy * baseRad * n, center.z + vz * baseRad * n);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// Grappe organique déformée par bruit 3D à partir d'IcosahedronGeometry(1, 2) (JAMAIS de SphereGeometry/ConeGeometry!)
function buildNoisyIcoCluster(cx, cy, cz, sx, sy, sz, seed = 0, noiseFreq = 1.65, noiseAmp = 0.34, flattenBottom = 0) {
  const g = new THREE.IcosahedronGeometry(1.0, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i);
    const uy = p.getY(i);
    const uz = p.getZ(i);
    const n1 = noise3D(ux * noiseFreq + seed, uy * noiseFreq + seed * 0.7, uz * noiseFreq - seed * 0.4);
    const n2 = noise3D(ux * noiseFreq * 2.2 - seed, uy * noiseFreq * 2.2, uz * noiseFreq * 2.2 + seed);
    const disp = 1.0 + (n1 - 0.5) * 2.0 * noiseAmp + (n2 - 0.5) * noiseAmp * 0.45;
    let vx = ux * sx * disp;
    let vy = uy * sy * disp;
    let vz = uz * sz * disp;
    if (flattenBottom > 0 && vy < -flattenBottom) {
      vy = -flattenBottom + (vy + flattenBottom) * 0.28;
    }
    p.setXYZ(i, vx + cx, vy + cy, vz + cz);
  }
  g.computeVertexNormals();
  return g;
}

// Rocher polyédrique fracturé à faces planes + mousse verte sur le dessus (zéro sphère lisse !)
export function buildFracturedRockGeometry(seed = 1, radius = 1.0, mossyTop = true) {
  const base = new THREE.IcosahedronGeometry(radius, 1);
  const pos = base.attributes.position;

  // Plans de clivage minéraux pour casser la symétrie et créer des arêtes rocheuses nettes
  const planes = [
    new THREE.Vector3(0.7, 0.5, 0.3).normalize(),
    new THREE.Vector3(-0.6, 0.65, -0.35).normalize(),
    new THREE.Vector3(0.2, 0.85, -0.45).normalize(),
  ];

  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const n = noise3D(v.x * 1.4 + seed * 3.1, v.y * 1.4 + seed, v.z * 1.4 - seed * 2.3);
    v.multiplyScalar(0.76 + n * 0.52);

    // Clivages plats naturels
    for (let k = 0; k < planes.length; k++) {
      const d = v.dot(planes[k]);
      const limit = radius * (0.68 + hash2(seed + k, k * 5) * 0.24);
      if (d > limit) {
        v.addScaledVector(planes[k], -(d - limit) * 0.72);
      }
    }
    // Base légèrement aplatie pour ancrage solide au sol
    if (v.y < -radius * 0.45) v.y = -radius * 0.45;
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  // Passage en non-indexé pour vraies faces planes fracturées captant nettement la lumière
  const faceted = base.toNonIndexed();
  faceted.computeVertexNormals();

  // Coloration par sommet : roche stratifiée grise/ocre + mousse verte sur les faces supérieures !
  const fPos = faceted.attributes.position;
  const fNorm = faceted.attributes.normal;
  const cols = new Float32Array(fPos.count * 3);
  const cStone = new THREE.Color('#c8c4b8');
  const cShade = new THREE.Color('#8e8b84');
  const cMoss = new THREE.Color('#6f9c42');
  const tmp = new THREE.Color();

  for (let i = 0; i < fPos.count; i++) {
    const ny = fNorm.getY(i);
    const yNorm = THREE.MathUtils.clamp((fPos.getY(i) + radius * 0.5) / (radius * 1.3), 0, 1);
    tmp.lerpColors(cShade, cStone, yNorm);
    if (mossyTop && ny > 0.56) {
      const mossAmt = THREE.MathUtils.clamp((ny - 0.56) * 2.2, 0, 0.85);
      tmp.lerp(cMoss, mossAmt);
    }
    cols[i * 3] = tmp.r;
    cols[i * 3 + 1] = tmp.g;
    cols[i * 3 + 2] = tmp.b;
  }
  faceted.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return faceted;
}

// CHÊNE MÉDIÉVAL SCULPTÉ : Tronc & branches maîtresses TubeGeometry + racines évasées + grappes Icosahedron bruit 3D
export function buildSculptedOakGeometries() {
  const trunkParts = [];

  // Tronc organique sinueux avec évasement de collet
  trunkParts.push(buildTaperedOrganicTube([
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(0.08, 1.0, 0.05),
    new THREE.Vector3(-0.06, 2.2, -0.04),
    new THREE.Vector3(0.04, 3.35, 0.06),
  ], 0.44, 0.21, 10, 7, 0.14));

  // 4 racines puissantes ancrées dans la terre
  for (let r = 0; r < 4; r++) {
    const ang = (r / 4) * Math.PI * 2 + 0.35;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    trunkParts.push(buildTaperedOrganicTube([
      new THREE.Vector3(ca * 0.18, 0.72, sa * 0.18),
      new THREE.Vector3(ca * 0.55, 0.26, sa * 0.55),
      new THREE.Vector3(ca * 1.02, -0.08, sa * 1.02),
    ], 0.22, 0.07, 6, 5, 0.12));
  }

  // 4 branches maîtresses courbées soutenant les grappes asymétriques
  const boughs = [
    [[0.02, 2.45, 0.02], [0.68, 3.15, 0.22], [1.38, 3.88, 0.45]],
    [[-0.04, 2.6, 0.0], [-0.72, 3.22, 0.32], [-1.32, 3.85, 0.62]],
    [[0.0, 2.75, -0.03], [-0.15, 3.45, -0.78], [-0.35, 4.05, -1.38]],
    [[0.04, 3.1, 0.04], [0.28, 3.95, -0.18], [0.55, 4.75, -0.35]],
  ];
  for (const pts of boughs) {
    trunkParts.push(buildTaperedOrganicTube(
      pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      0.19, 0.07, 7, 5, 0.1
    ));
  }

  const trunkGeo = mergeIndexedGeometries(trunkParts);
  paintVerticalGradient(trunkGeo, '#422612', '#82552f', 0, 4.7);

  // Grappes asymétriques IcosahedronGeometry(1, 2) déformées par bruit 3D
  const leafParts = [
    buildNoisyIcoCluster(0.05, 4.85, 0.02, 1.72, 1.32, 1.62, 1.1, 1.6, 0.34),
    buildNoisyIcoCluster(1.42, 4.15, 0.48, 1.38, 1.06, 1.30, 3.4, 1.7, 0.36),
    buildNoisyIcoCluster(-1.35, 4.08, 0.62, 1.35, 1.04, 1.32, 5.7, 1.7, 0.35),
    buildNoisyIcoCluster(-0.32, 4.25, -1.35, 1.42, 1.08, 1.28, 7.9, 1.65, 0.34),
    buildNoisyIcoCluster(0.55, 5.45, -0.32, 1.24, 0.96, 1.18, 10.2, 1.8, 0.32),
    buildNoisyIcoCluster(-0.62, 5.15, 0.44, 1.12, 0.90, 1.12, 12.6, 1.75, 0.32),
  ];
  const canopyGeo = mergeIndexedGeometries(leafParts);
  paintVerticalGradient(canopyGeo, '#1d4f22', '#b2e84a', 3.1, 6.4);

  return { trunkGeo, canopyGeo };
}

// PIN MÉDIÉVAL SCULPTÉ (ZÉRO ConeGeometry !) : Tronc TubeGeometry + étages de grappes Icosahedron(1,2) bruitées
export function buildSculptedPineGeometries() {
  const trunkParts = [];
  trunkParts.push(buildTaperedOrganicTube([
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(-0.05, 1.6, 0.04),
    new THREE.Vector3(0.04, 3.5, -0.03),
    new THREE.Vector3(0.0, 5.4, 0.0),
  ], 0.34, 0.09, 10, 7, 0.12));

  for (let r = 0; r < 3; r++) {
    const ang = (r / 3) * Math.PI * 2 + 0.2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    trunkParts.push(buildTaperedOrganicTube([
      new THREE.Vector3(ca * 0.14, 0.58, sa * 0.14),
      new THREE.Vector3(ca * 0.48, 0.2, sa * 0.48),
      new THREE.Vector3(ca * 0.84, -0.06, sa * 0.84),
    ], 0.17, 0.06, 5, 5, 0.1));
  }
  const trunkGeo = mergeIndexedGeometries(trunkParts);
  paintVerticalGradient(trunkGeo, '#3b2210', '#704726', 0, 5.4);

  // Étages de frondaisons de pin sculptés par grappes asymétriques d'IcosahedronGeometry(1, 2) bruitées
  const foliageParts = [];
  const tierDefs = [
    { y: 2.35, ringR: 1.15, lobes: 5, sx: 1.05, sy: 0.56, sz: 0.95 },
    { y: 3.45, ringR: 0.88, lobes: 5, sx: 0.88, sy: 0.52, sz: 0.82 },
    { y: 4.48, ringR: 0.62, lobes: 4, sx: 0.72, sy: 0.48, sz: 0.68 },
    { y: 5.38, ringR: 0.34, lobes: 3, sx: 0.56, sy: 0.48, sz: 0.54 },
  ];
  tierDefs.forEach((td, tIdx) => {
    for (let l = 0; l < td.lobes; l++) {
      const ang = (l / td.lobes) * Math.PI * 2 + tIdx * 0.65;
      const cx = Math.cos(ang) * td.ringR;
      const cz = Math.sin(ang) * td.ringR;
      foliageParts.push(
        buildNoisyIcoCluster(cx, td.y, cz, td.sx, td.sy, td.sz, tIdx * 7 + l * 2.3, 1.9, 0.35, 0.25)
      );
    }
  });
  // Flèche terminale organique (Icosahedron bruité allongé, zéro ConeGeometry)
  foliageParts.push(buildNoisyIcoCluster(0, 6.25, 0, 0.52, 0.95, 0.52, 31.4, 2.0, 0.3));

  const canopyGeo = mergeIndexedGeometries(foliageParts);
  paintVerticalGradient(canopyGeo, '#184422', '#6fc246', 1.7, 7.1);
  return { trunkGeo, canopyGeo };
}

// Shader vent GPU (zéro coût CPU)
export function applyWindShader(material, windUniforms, amplitude = 0.14, freq = 1.6, heightPivot = 0.0) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniforms.uWindTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uWindTime;`)
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
    this.stockVisuals = { bricks: null, resources: null };
    this.beaconGroup = null;
    this.trackedTarget = null;

    this._setupCinematicSkyAndLighting();
    this._buildSculptedTerrain();
    this._buildArtisanalVillageWell();
    this._buildRiverBrookAndBridge();
    this._buildRichInstancedNature();
    this._buildWoodenFencesAndDetails();
    this._buildStockYards();
    this._buildGuideBeacon();
  }

  _setupCinematicSkyAndLighting() {
    this.scene.fog = new THREE.FogExp2('#e4d5b5', 0.0038);

    // Dôme céleste procédural (IcosahedronGeometry subdivision 3 — zéro SphereGeometry !)
    const skyGeo = new THREE.IcosahedronGeometry(260, 3);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSunDir: { value: this.sunDir.clone() },
        uZenithColor: { value: new THREE.Color('#1960cc') },
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
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
          col = mix(col, uZenithColor, smoothstep(0.22, 0.85, h));

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
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Éclairage solaire chaud + ombres portées nettes 2048x2048 centrées joueur
    const hemi = new THREE.HemisphereLight('#a8d8ff', '#80693e', 1.02);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#ffefc6', 2.15);
    sun.position.copy(this.sunDir).multiplyScalar(85);
    sun.castShadow = true;
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

    // Contre-lumière froide pour sculpter le contraste des ombres
    const rimLight = new THREE.DirectionalLight('#8bc4ff', 0.42);
    rimLight.position.set(-55, 34, -48);
    this.scene.add(rimLight);

    this._buildVolumetricClouds();
  }

  _buildVolumetricClouds() {
    // Nuages sculptés à base plate et sommet bourgeonnant (IcosahedronGeometry(1,2) déformé par bruit 3D)
    const cloudMat = new THREE.ShaderMaterial({
      transparent: true,
      fog: false,
      uniforms: {
        uSunDir: { value: this.sunDir.clone() },
        uTopColor: { value: new THREE.Color('#fffdf5') },
        uSunRim: { value: new THREE.Color('#ffe5ad') },
        uShadowColor: { value: new THREE.Color('#bed3ec') },
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
          float lift = clamp(vHeight * 0.68 + ndl * 0.42, 0.0, 1.0);
          vec3 col = mix(uShadowColor, uTopColor, smoothstep(0.18, 0.88, lift));
          col += uSunRim * pow(max(dot(n, normalize(uSunDir)), 0.0), 3.0) * 0.16;
          gl_FragColor = vec4(col, 0.94);
        }
      `,
    });

    const buildCloudTemplate = (seed) => {
      const parts = [];
      const puffCount = 11 + (seed % 3);
      for (let i = 0; i < puffCount; i++) {
        const layer = i < 5 ? 0 : i < 9 ? 1 : 2;
        const ang = (i / puffCount) * Math.PI * 2 + seed;
        const spread = layer === 0 ? 6.6 : layer === 1 ? 4.0 : 1.5;
        const px = Math.cos(ang) * spread * (0.65 + hash2(i, seed) * 0.5);
        const pz = Math.sin(ang) * spread * 0.66;
        const py = layer * 2.4 + hash2(seed, i) * 0.85;
        const rx = (layer === 0 ? 5.1 : layer === 1 ? 3.9 : 3.1) * (0.85 + hash2(i + 2, seed) * 0.35);
        const ry = (layer === 0 ? 2.4 : layer === 1 ? 3.3 : 3.6);
        parts.push(buildNoisyIcoCluster(px, py, pz, rx, ry, rx * 0.82, seed * 3 + i, 1.4, 0.24, 0.45));
      }
      const merged = mergeIndexedGeometries(parts);
      paintVerticalGradient(merged, '#181818', '#ffffff', -1.4, 7.6);
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
    const span = 220, segs = 112;
    const geo = new THREE.PlaneGeometry(span, span, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const norm = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const cNeutral = new THREE.Color('#ffffff');
    const cCliff = new THREE.Color('#8e8980');
    const cMoss = new THREE.Color('#7ca352');
    const cHigh = new THREE.Color('#c2c8a8');
    const cWet = new THREE.Color('#7f7357');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), ny = norm.getY(i);
      tmp.copy(cNeutral);
      if (y < -0.18) {
        tmp.lerp(cWet, Math.min(1, (-y - 0.18) * 1.1));
      } else if (y > 0.4) {
        tmp.lerp(cMoss, Math.min(0.45, y / 18));
        tmp.lerp(cCliff, THREE.MathUtils.clamp((0.89 - ny) * 4.2, 0, 0.92));
        if (y > 14) tmp.lerp(cHigh, Math.min(0.35, (y - 14) / 14));
      }
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
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
  }

  // PUITS MÉDIÉVAL DÉTAILLÉ (ZÉRO ConeGeometry !) :
  // Margelle en pierres taillées, charpente apparente avec chevrons en bois, tuiles terre cuite en relief,
  // manivelle en fer forgé, corde enroulée et seau cerclé suspendu.
  _buildArtisanalVillageWell() {
    const well = new THREE.Group();
    well.position.set(2, 0, 1.5);

    const stoneMat = this.textures.createPBRMaterial('stone', { normalStrength: 1.2 });
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.1 });
    const darkWoodMat = this.textures.createPBRMaterial('wood', { color: '#613a1b', normalStrength: 1.05 });
    const tileMat = this.textures.createPBRMaterial('roofRed', { normalStrength: 1.25 });
    const ironMat = new THREE.MeshStandardMaterial({ color: '#30353c', metalness: 0.82, roughness: 0.32 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#c8a76e', roughness: 0.92 });

    // Margelle circulaire en assises de pierre + couronnement de dalles biseautées
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.2, 0.96, 14), stoneMat);
    base.position.y = 0.48;
    base.castShadow = true;
    base.receiveShadow = true;
    well.add(base);

    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const coping = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.28), stoneMat);
      coping.position.set(Math.cos(ang) * 1.02, 1.0, Math.sin(ang) * 1.02);
      coping.rotation.y = -ang + Math.PI / 2;
      coping.castShadow = true;
      well.add(coping);
    }

    // Eau miroitante dans le puits
    const waterDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 14),
      new THREE.MeshStandardMaterial({
        color: '#2898cc',
        roughness: 0.1,
        metalness: 0.3,
        normalMap: this.textures.waterWave.normalMap,
      })
    );
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.72;
    well.add(waterDisc);

    // Deux poteaux en chêne + contrefiches obliques + sablière
    [-0.95, 0.95].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.05, 0.16), woodMat);
      post.position.set(px, 1.85, 0);
      post.castShadow = true;
      well.add(post);

      // Contrefiches d'angle en bois
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), darkWoodMat);
      brace.position.set(px > 0 ? px - 0.22 : px + 0.22, 2.52, 0);
      brace.rotation.z = px > 0 ? -0.78 : 0.78;
      well.add(brace);
    });

    // Poutre faîtière & entrait
    const tieBeam = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.14, 0.16), darkWoodMat);
    tieBeam.position.set(0, 2.78, 0);
    tieBeam.castShadow = true;
    well.add(tieBeam);

    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.12, 0.12), darkWoodMat);
    ridgeBeam.position.set(0, 3.62, 0);
    well.add(ridgeBeam);

    // Vraie charpente à 4 paires de chevrons en bois apparents + 2 pans de toit avec rangs de tuiles en relief !
    const slopeLen = 1.38;
    const slopeAng = 0.72;
    for (let i = 0; i < 4; i++) {
      const rx = -0.98 + (i / 3) * 1.96;
      [-1, 1].forEach((side) => {
        const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, slopeLen), darkWoodMat);
        rafter.position.set(rx, 3.16, side * 0.52);
        rafter.rotation.x = side * slopeAng;
        rafter.castShadow = true;
        well.add(rafter);
      });
    }

    // Voliges + rangées superposées de tuiles terre cuite en relief 3D
    [-1, 1].forEach((side) => {
      const roofGroup = new THREE.Group();
      roofGroup.position.set(0, 3.22, side * 0.54);
      roofGroup.rotation.x = side * slopeAng;

      const board = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.06, slopeLen), woodMat);
      roofGroup.add(board);

      // 4 rangs superposés de tuiles bombées terre cuite
      for (let row = 0; row < 4; row++) {
        const tz = -slopeLen * 0.38 + row * (slopeLen * 0.25);
        for (let col = 0; col < 7; col++) {
          const tx = -1.04 + col * 0.345;
          const tile = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.065, 0.34), tileMat);
          tile.position.set(tx, 0.055 + row * 0.008, tz);
          tile.rotation.x = -0.09;
          tile.castShadow = true;
          roofGroup.add(tile);
        }
      }
      well.add(roofGroup);
    });
    // Faîtière terre cuite en demi-cylindre
    const ridgeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.44, 8), tileMat);
    ridgeCap.rotation.z = Math.PI / 2;
    ridgeCap.position.set(0, 3.74, 0);
    well.add(ridgeCap);

    // Treuil en bois + corde enroulée + manivelle en fer forgé
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.84, 10), woodMat);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0, 1.72, 0);
    roller.castShadow = true;
    well.add(roller);

    // Spires de corde enroulées autour du treuil
    for (let c = 0; c < 6; c++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 6, 12), ropeMat);
      coil.rotation.y = Math.PI / 2;
      coil.position.set(-0.18 + c * 0.052, 1.72, 0);
      well.add(coil);
    }
    // Corde tendue descendant vers le seau
    const dropRope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6), ropeMat);
    dropRope.position.set(0, 1.36, 0.06);
    well.add(dropRope);

    // Manivelle en fer forgé sur le côté droit
    const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.05), ironMat);
    crankArm.position.set(1.08, 1.58, 0);
    const crankGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.24, 8), ironMat);
    crankGrip.rotation.z = Math.PI / 2;
    crankGrip.position.set(1.2, 1.43, 0);
    well.add(crankArm, crankGrip);

    // Seau en bois cerclé de fer suspendu au-dessus de l'eau
    const bucket = new THREE.Group();
    bucket.position.set(0, 0.98, 0.06);
    const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.32, 10), darkWoodMat);
    bBody.castShadow = true;
    bucket.add(bBody);
    [-0.08, 0.08].forEach((hy) => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.168 + hy * 0.15, 0.014, 6, 12), ironMat);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = hy;
      bucket.add(hoop);
    });
    const bail = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 12, Math.PI), ironMat);
    bail.position.y = 0.15;
    bucket.add(bail);
    well.add(bucket);

    this.scene.add(well);
  }

  _buildRiverBrookAndBridge() {
    const makeWaterMat = (colorHex, opacity = 0.86) => {
      const nMap = this.textures.waterWave.normalMap.clone();
      nMap.needsUpdate = true;
      nMap.wrapS = THREE.RepeatWrapping;
      nMap.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({
        color: colorHex,
        normalMap: nMap,
        normalScale: new THREE.Vector2(0.78, 0.78),
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity,
      });
    };

    // Rivière principale
    const segs = 80, width = 9.0;
    const positions = [], uvs = [], indices = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, x = -110 + t * 220, cz = getRiverCenterZ(x);
      positions.push(x, -0.14, cz - width * 0.5, x, -0.14, cz + width * 0.5);
      uvs.push(t * 22, 0, t * 22, 1.5);
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
    const riverMesh = new THREE.Mesh(riverGeo, makeWaterMat('#2c9fd4', 0.87));
    riverMesh.receiveShadow = true;
    this.scene.add(riverMesh);
    this.waterMeshes.push({ mesh: riverMesh, speedX: 0.18, speedY: 0.05 });

    // Ruisseau & bassin près de la carrière
    const bSegs = 36, bPos = [], bUvs = [], bIdx = [];
    for (let i = 0; i <= bSegs; i++) {
      const t = i / bSegs, z = -30 + t * 63, cx = getBrookCenterX(z);
      const bw = 2.6 + Math.sin(t * Math.PI) * 1.3;
      bPos.push(cx - bw * 0.5, -0.12, z, cx + bw * 0.5, -0.12, z);
      bUvs.push(0, t * 12, 1.2, t * 12);
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
    const brookMesh = new THREE.Mesh(brookGeo, makeWaterMat('#38b5de', 0.84));
    brookMesh.receiveShadow = true;
    this.scene.add(brookMesh);
    this.waterMeshes.push({ mesh: brookMesh, speedX: 0.04, speedY: -0.26 });

    // Pont villageois en pierre & bois
    const bridge = new THREE.Group();
    bridge.position.set(VILLAGE_LAYOUT.bridge.x, 0, VILLAGE_LAYOUT.bridge.z);
    bridge.rotation.y = VILLAGE_LAYOUT.bridge.rotY;
    const stoneMat = this.textures.createPBRMaterial('stone', { normalStrength: 1.15 });
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.05 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.36, 11.8), woodMat);
    deck.position.y = 0.22; deck.castShadow = true; deck.receiveShadow = true;
    bridge.add(deck);
    [-2.45, 2.45].forEach((px) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.98, 11.6), stoneMat);
      wall.position.set(px, 0.68, 0); wall.castShadow = true; wall.receiveShadow = true;
      bridge.add(wall);
      [-5.6, 0, 5.6].forEach((bz) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.24, 0.62), stoneMat);
        pillar.position.set(px, 0.82, bz); pillar.castShadow = true;
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
      if (Math.hypot(x - VILLAGE_LAYOUT.workbench.x, z - VILLAGE_LAYOUT.workbench.z) < 4.8) return true;
      for (const b of VILLAGE_LAYOUT.buildings) {
        if (Math.abs(x - b.x) < b.width * 0.62 + pad && Math.abs(z - b.z) < b.depth * 0.62 + pad) {
          return true;
        }
      }
      return false;
    };

    // ------------------------------------------------------------------
    // 1. TOUFFES DE 6 LAMES D'HERBE COURBÉES PARABOLIQUES & EFFILÉES (InstancedMesh)
    // ------------------------------------------------------------------
    const bladeParts = [];
    const bladeCountPerTuft = 6;
    for (let b = 0; b < bladeCountPerTuft; b++) {
      const ang = (b / bladeCountPerTuft) * Math.PI * 2 + hash2(b, 3) * 0.5;
      const bladeH = 0.42 + hash2(b, 9) * 0.24;
      const bladeW = 0.085;
      const bend = 0.18 + hash2(b, 13) * 0.14;

      // Lame parabolique personnalisée (3 segments verticaux -> pointe effilée fine)
      const segY = 3;
      const bPos = [];
      const bIdx = [];
      for (let s = 0; s <= segY; s++) {
        const t = s / segY;
        const y = t * bladeH;
        const zCurve = bend * t * t; // Courbure parabolique naturelle
        const halfW = bladeW * 0.5 * (1 - t * t); // Effilement net vers la pointe
        bPos.push(-halfW, y, zCurve, halfW, y, zCurve);
        if (s < segY) {
          const r = s * 2;
          bIdx.push(r, r + 1, r + 2, r + 1, r + 3, r + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((segY + 1) * 4), 2));
      g.setIndex(bIdx);
      g.rotateY(ang);
      g.translate(Math.cos(ang) * 0.07, 0, Math.sin(ang) * 0.07);
      g.computeVertexNormals();
      bladeParts.push(g);
    }
    const tuftGeo = mergeIndexedGeometries(bladeParts);
    paintVerticalGradient(tuftGeo, '#3f7c26', '#b8eb58', 0, 0.62);
    const tNorm = tuftGeo.attributes.normal;
    for (let i = 0; i < tNorm.count; i++) tNorm.setXYZ(i, 0, 1, 0);

    const tuftMat = applyWindShader(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: THREE.DoubleSide }),
      this.windUniforms, 0.28, 2.3, 0.04
    );

    const grassMax = 3400;
    const grassMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, grassMax);
    grassMesh.receiveShadow = true;
    let gPlaced = 0;
    for (let attempt = 0; attempt < 7200 && gPlaced < grassMax; attempt++) {
      const x = (Math.random() - 0.5) * 145;
      const z = (Math.random() - 0.5) * 145;
      if (isPlotBlocked(x, z, 0.9)) continue;
      const y = getTerrainHeight(x, z);
      if (y < 0 || y > 11) continue;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const sc = 0.72 + Math.random() * 0.82;
      dummy.scale.set(sc, sc * (0.85 + Math.random() * 0.42), sc);
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
    // 2. FOUGÈRES COURBÉES, BUISSONS À BAIES & FLEURS SAUVAGES (InstancedMesh)
    // ------------------------------------------------------------------
    const fernParts = [];
    for (let f = 0; f < 6; f++) {
      const ang = (f / 6) * Math.PI * 2;
      const frond = new THREE.PlaneGeometry(0.24, 0.65, 1, 3);
      frond.translate(0, 0.325, 0);
      const fp = frond.attributes.position;
      for (let k = 0; k < fp.count; k++) {
        const t = fp.getY(k) / 0.65;
        fp.setX(k, fp.getX(k) * Math.sin(t * Math.PI * 0.85 + 0.15));
        fp.setZ(k, t * t * 0.24);
      }
      frond.rotateX(1.12);
      frond.rotateY(ang);
      fernParts.push(frond);
    }
    const fernGeo = mergeIndexedGeometries(fernParts);
    paintVerticalGradient(fernGeo, '#2e6e24', '#86cc44', 0, 0.42);
    for (let i = 0; i < fernGeo.attributes.normal.count; i++) fernGeo.attributes.normal.setXYZ(i, 0, 1, 0);
    const fernMat = applyWindShader(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: THREE.DoubleSide }),
      this.windUniforms, 0.16, 1.9, 0.02
    );
    const fernMesh = new THREE.InstancedMesh(fernGeo, fernMat, 300);
    let fPlaced = 0;
    for (let i = 0; i < 800 && fPlaced < 300; i++) {
      const x = (Math.random() - 0.5) * 135, z = (Math.random() - 0.5) * 135;
      if (isPlotBlocked(x, z, 1.1)) continue;
      const y = getTerrainHeight(x, z);
      if (y < 0 || y > 9) continue;
      dummy.position.set(x, y + 0.02, z);
      dummy.rotation.set(0, Math.random() * 6.28, 0);
      dummy.scale.setScalar(0.75 + Math.random() * 0.72);
      dummy.updateMatrix();
      fernMesh.setMatrixAt(fPlaced++, dummy.matrix);
    }
    fernMesh.count = fPlaced;
    fernMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(fernMesh);

    // BUISSONS À BAIES SCULPTÉS (IcosahedronGeometry(1,2) bruité + baies rubis, zéro sphère!)
    const bushParts = [
      buildNoisyIcoCluster(0, 0.48, 0, 0.72, 0.54, 0.68, 2.1, 1.9, 0.32, 0.25),
      buildNoisyIcoCluster(0.45, 0.36, 0.22, 0.48, 0.40, 0.46, 5.3, 2.0, 0.34, 0.2),
      buildNoisyIcoCluster(-0.42, 0.38, -0.18, 0.50, 0.42, 0.48, 8.7, 2.0, 0.34, 0.2),
    ];
    const bushGeo = mergeIndexedGeometries(bushParts);
    paintVerticalGradient(bushGeo, '#21541f', '#89cc41', 0.05, 0.95);
    const bushMat = applyWindShader(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }),
      this.windUniforms, 0.08, 1.8, 0.08
    );

    const berryParts = [];
    const berryOffsets = [
      [0.32, 0.68, 0.48], [-0.28, 0.72, 0.44], [0.56, 0.52, -0.12],
      [-0.52, 0.56, 0.24], [0.12, 0.84, -0.34], [-0.14, 0.62, -0.56],
    ];
    for (const [bx, by, bz] of berryOffsets) {
      const bg = new THREE.IcosahedronGeometry(0.065, 0);
      bg.translate(bx, by, bz);
      berryParts.push(bg);
    }
    const berryGeo = mergeIndexedGeometries(berryParts);
    const berryMat = applyWindShader(
      new THREE.MeshStandardMaterial({ color: '#d92638', roughness: 0.42 }),
      this.windUniforms, 0.08, 1.8, 0.08
    );

    const bushMax = 68;
    const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, bushMax);
    const berryMesh = new THREE.InstancedMesh(berryGeo, berryMat, bushMax);
    bushMesh.castShadow = true; bushMesh.receiveShadow = true;
    let bPlaced = 0;
    for (let i = 0; i < 240 && bPlaced < bushMax; i++) {
      const x = (Math.random() - 0.5) * 126, z = (Math.random() - 0.5) * 126;
      if (isPlotBlocked(x, z, 1.5)) continue;
      const y = getTerrainHeight(x, z);
      if (y < 0 || y > 8) continue;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.random() * 6.28, 0);
      dummy.scale.setScalar(0.8 + Math.random() * 0.6);
      dummy.updateMatrix();
      bushMesh.setMatrixAt(bPlaced, dummy.matrix);
      berryMesh.setMatrixAt(bPlaced, dummy.matrix);
      bPlaced++;
    }
    bushMesh.count = bPlaced; berryMesh.count = bPlaced;
    bushMesh.instanceMatrix.needsUpdate = true; berryMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(bushMesh, berryMesh);

    // Fleurs sauvages (coquelicots, pissenlits, pâquerettes)
    const stemGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.34, 4);
    stemGeo.translate(0, 0.17, 0);
    const petalGeo = new THREE.IcosahedronGeometry(0.082, 0);
    petalGeo.scale(1.3, 0.52, 1.3);
    petalGeo.translate(0, 0.35, 0);
    const stemMat = applyWindShader(new THREE.MeshLambertMaterial({ color: '#4c8f2b' }), this.windUniforms, 0.22, 2.5, 0.02);
    const petalMat = applyWindShader(new THREE.MeshStandardMaterial({ roughness: 0.65 }), this.windUniforms, 0.22, 2.5, 0.02);
    const flowerMax = 420;
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerMax);
    const petals = new THREE.InstancedMesh(petalGeo, petalMat, flowerMax);
    const flowerPalette = [0xe8382c, 0xffd22b, 0xffd22b, 0xfff8eb, 0xe8382c];
    let flPlaced = 0;
    for (let i = 0; i < 1100 && flPlaced < flowerMax; i++) {
      const x = (Math.random() - 0.5) * 124, z = (Math.random() - 0.5) * 124;
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
    stems.count = flPlaced; petals.count = flPlaced;
    stems.instanceMatrix.needsUpdate = true; petals.instanceMatrix.needsUpdate = true;
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
    this.scene.add(stems, petals);

    // ------------------------------------------------------------------
    // 3. CHÊNES & PINS SCULPTÉS (TUBEGEOMETRY + ÉCORCE FISSURÉE PBR + FEUILLAGE BRUIT 3D)
    // ------------------------------------------------------------------
    const oak = buildSculptedOakGeometries();
    const pine = buildSculptedPineGeometries();

    const barkMat = this.textures.createPBRMaterial('bark', {
      normalStrength: 1.35,
      roughness: 0.92,
      vertexColors: true,
    });
    const oakLeafMat = applyWindShader(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }),
      this.windUniforms, 0.068, 1.35, 2.7
    );
    const pineLeafMat = applyWindShader(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
      this.windUniforms, 0.055, 1.15, 1.9
    );

    const oakSpots = [];
    const pineSpots = [];
    for (let i = 0; i < 115; i++) {
      const ang = (i / 115) * Math.PI * 2 + (hash2(i, 3) - 0.5) * 0.16;
      const rad = 52 + hash2(i, 11) * 44;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      if (isInsideRiver(x, z, 3.2)) continue;
      const y = getTerrainHeight(x, z);
      if (y > 16) continue;
      const spot = { x, y, z, scale: 0.88 + hash2(i, 17) * 0.72, rot: hash2(i, 23) * 6.28 };
      if (i % 2 === 0 && y < 7.5) oakSpots.push(spot);
      else pineSpots.push(spot);
    }
    [[-26, -6, 1.15], [16, -28, 1.05], [-14, 24, 1.1], [40, 22, 1.0]].forEach(([x, z, sc]) => {
      oakSpots.push({ x, y: getTerrainHeight(x, z), z, scale: sc, rot: x * 0.4 });
    });

    const spawnTreeInst = (geoPair, leafMat, spots) => {
      const tr = new THREE.InstancedMesh(geoPair.trunkGeo, barkMat, spots.length);
      const ca = new THREE.InstancedMesh(geoPair.canopyGeo, leafMat, spots.length);
      tr.castShadow = true; tr.receiveShadow = true;
      ca.castShadow = true; ca.receiveShadow = true;
      spots.forEach((s, idx) => {
        dummy.position.set(s.x, s.y - 0.08, s.z);
        dummy.rotation.set(0, s.rot, 0);
        dummy.scale.setScalar(s.scale);
        dummy.updateMatrix();
        tr.setMatrixAt(idx, dummy.matrix);
        ca.setMatrixAt(idx, dummy.matrix);
        color.setHSL(0.25 + (hash2(idx, 5) - 0.5) * 0.05, 0.18, 0.94 + hash2(idx, 8) * 0.14);
        ca.setColorAt(idx, color);
      });
      tr.instanceMatrix.needsUpdate = true; ca.instanceMatrix.needsUpdate = true;
      if (ca.instanceColor) ca.instanceColor.needsUpdate = true;
      this.scene.add(tr, ca);
    };
    spawnTreeInst(oak, oakLeafMat, oakSpots);
    spawnTreeInst(pine, pineLeafMat, pineSpots);

    // ------------------------------------------------------------------
    // 4. ROCHERS FRACTURÉS STRATIFIÉS MOUSSUS, FALAISES DE CARRIÈRE & SOUCHES
    // ------------------------------------------------------------------
    const rockGeoA = buildFracturedRockGeometry(2, 0.82, true);
    const rockMat = this.textures.createPBRMaterial('rock', {
      normalStrength: 1.3,
      roughness: 0.88,
      vertexColors: true,
      flatShading: true,
    });
    const rockMesh = new THREE.InstancedMesh(rockGeoA, rockMat, 82);
    rockMesh.castShadow = true; rockMesh.receiveShadow = true;

    let rCount = 0;
    for (let i = 0; i < 82; i++) {
      let x, z, sx;
      if (i < 12) {
        // Grands éperons rocheux fracturés formant les falaises derrière la Carrière de Pierre
        const ang = -1.1 + (i / 11) * 2.2;
        x = VILLAGE_LAYOUT.quarry.x + 12 + Math.cos(ang) * 9;
        z = VILLAGE_LAYOUT.quarry.z + Math.sin(ang) * 16;
        sx = 2.6 + hash2(i, 4) * 2.2;
      } else if (i < 34) {
        z = -28 + ((i - 12) / 22) * 56;
        x = getBrookCenterX(z) + (i % 2 === 0 ? -2.2 : 2.2) + (Math.random() - 0.5) * 0.9;
        sx = 0.65 + Math.random() * 1.15;
      } else if (i < 58) {
        x = -68 + ((i - 34) / 24) * 136;
        z = getRiverCenterZ(x) + (i % 2 === 0 ? -5.1 : 5.1);
        sx = 0.7 + Math.random() * 1.2;
      } else {
        const ang = ((i - 58) / 24) * Math.PI * 2;
        const dist = 42 + Math.random() * 24;
        x = Math.cos(ang) * dist; z = Math.sin(ang) * dist;
        if (isPlotBlocked(x, z, 0.4)) continue;
        sx = 0.7 + Math.random() * 1.3;
      }
      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y + sx * 0.2, z);
      dummy.rotation.set(hash2(i, 1) * 0.35, hash2(i, 2) * 6.28, hash2(i, 3) * 0.35);
      dummy.scale.set(sx, sx * (i < 12 ? 1.15 : 0.68), sx * 0.92);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(rCount++, dummy.matrix);
    }
    rockMesh.count = rCount;
    rockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(rockMesh);

    // Souches d'arbres à écorce fissurée
    const stumpGeo = new THREE.CylinderGeometry(0.32, 0.46, 0.55, 8);
    stumpGeo.translate(0, 0.27, 0);
    const stumpMat = this.textures.createPBRMaterial('bark', { color: '#9c7148' });
    const stumpCoords = [
      [-37, 3], [-39, -5], [-31, 6], [-28, 12], [-42, 7], [-33, -10], [34, -8], [43, -4],
    ];
    const stumps = new THREE.InstancedMesh(stumpGeo, stumpMat, stumpCoords.length);
    stumps.castShadow = true; stumps.receiveShadow = true;
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
    const woodMat = this.textures.createPBRMaterial('wood', { color: '#9c6e44', normalStrength: 1.05 });
    const postGeo = new THREE.BoxGeometry(0.14, 1.08, 0.14);
    postGeo.translate(0, 0.54, 0);
    const railGeo = new THREE.BoxGeometry(2.4, 0.09, 0.07);

    const fenceRuns = [
      [[-20, 20], [-22, 14], [-18, 10]],
      [[-22, -14], [-28, -12], [-34, -10]],
      [[16, -2], [20, -4], [24, -6]],
      [[38, 1], [44, 0], [49, -1]],
      [[-10, 26], [-4, 27.5], [2, 27.5], [8, 26.5]],
    ];

    const posts = [], rails = [];
    for (const run of fenceRuns) {
      for (let i = 0; i < run.length; i++) {
        const [x0, z0] = run[i];
        posts.push({ x: x0, z: z0 });
        if (i < run.length - 1) {
          const [x1, z1] = run[i + 1];
          const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
          const len = Math.hypot(x1 - x0, z1 - z0);
          const yaw = -Math.atan2(z1 - z0, x1 - x0);
          rails.push({ x: mx, y: 0.42, z: mz, len, yaw });
          rails.push({ x: mx, y: 0.82, z: mz, len, yaw });
        }
      }
    }

    const dummy = new THREE.Object3D();
    const postMesh = new THREE.InstancedMesh(postGeo, woodMat, posts.length);
    postMesh.castShadow = true; postMesh.receiveShadow = true;
    posts.forEach((p, idx) => {
      dummy.position.set(p.x, getTerrainHeight(p.x, p.z), p.z);
      dummy.rotation.set(0, idx * 0.2, 0); dummy.scale.setScalar(1);
      dummy.updateMatrix(); postMesh.setMatrixAt(idx, dummy.matrix);
    });
    postMesh.instanceMatrix.needsUpdate = true;

    const railMesh = new THREE.InstancedMesh(railGeo, woodMat, rails.length);
    railMesh.castShadow = true;
    rails.forEach((r, idx) => {
      dummy.position.set(r.x, getTerrainHeight(r.x, r.z) + r.y, r.z);
      dummy.rotation.set(0, r.yaw, 0); dummy.scale.set(r.len / 2.4, 1, 1);
      dummy.updateMatrix(); railMesh.setMatrixAt(idx, dummy.matrix);
    });
    railMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(postMesh, railMesh);
  }

  _buildStockYards() {
    const woodMat = this.textures.createPBRMaterial('wood');
    const brickMat = this.textures.createPBRMaterial('brick', { color: '#cf7452' });
    const stoneMat = this.textures.createPBRMaterial('stone');

    const bs = new THREE.Group();
    bs.position.set(VILLAGE_LAYOUT.brickStock.x, 0, VILLAGE_LAYOUT.brickStock.z);
    const plat1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 4.6), woodMat);
    plat1.position.y = 0.1; plat1.receiveShadow = true;
    bs.add(plat1);
    for (let p = 0; p < 3; p++) {
      const stack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05 + (p % 2) * 0.3, 1.3), p === 1 ? stoneMat : brickMat);
      stack.position.set(-1.9 + p * 1.9, 0.72, -0.5 + (p % 2) * 0.8);
      stack.castShadow = true; stack.receiveShadow = true;
      bs.add(stack);
    }
    this.scene.add(bs);
    this.stockVisuals.bricks = bs;

    const rs = new THREE.Group();
    rs.position.set(VILLAGE_LAYOUT.resourceStock.x, 0, VILLAGE_LAYOUT.resourceStock.z);
    const plat2 = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.2, 4.4), woodMat);
    plat2.position.y = 0.1; plat2.receiveShadow = true;
    rs.add(plat2);
    const logGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.2, 8);
    logGeo.rotateZ(Math.PI / 2);
    const logMat = this.textures.createPBRMaterial('bark', { color: '#8a572c' });
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
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
      color: '#ffd84a', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    }));
    grp.add(beam);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.2, 24),
      new THREE.MeshBasicMaterial({ color: '#ffe570', side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12;
    grp.add(ring);
    grp.visible = false;
    this.scene.add(grp);
    this.beaconGroup = grp;
  }

  setTrackedTarget(pos) {
    this.trackedTarget = pos;
    if (!this.beaconGroup) return;
    if (!pos) this.beaconGroup.visible = false;
    else { this.beaconGroup.visible = true; this.beaconGroup.position.set(pos.x, 0, pos.z); }
  }

  setShadowsEnabled(enabled) {
    if (this.sunLight) this.sunLight.castShadow = Boolean(enabled);
  }

  updateShadowFocus(focusPos) {
    if (!this.sunLight || !focusPos) return;
    const snap = 0.25;
    const fx = Math.round(focusPos.x / snap) * snap;
    const fz = Math.round(focusPos.z / snap) * snap;
    this.sunLight.target.position.set(fx, 0, fz);
    this.sunLight.position.set(fx + this.sunDir.x * 85, this.sunDir.y * 85, fz + this.sunDir.z * 85);
    this.sunLight.target.updateMatrixWorld();
  }

  update(dt, elapsed, focusPos) {
    this.windUniforms.uWindTime.value = elapsed;
    if (focusPos) this.updateShadowFocus(focusPos);

    for (const w of this.waterMeshes) {
      const nm = w.mesh.material.normalMap;
      if (nm) {
        nm.offset.x = (nm.offset.x + dt * w.speedX) % 1;
        nm.offset.y = (nm.offset.y + dt * w.speedY) % 1;
      }
    }
    for (const c of this.clouds) {
      c.mesh.position.x += dt * c.speed;
      if (c.mesh.position.x > 165) c.mesh.position.x = -165;
    }
    if (this.beaconGroup && this.beaconGroup.visible) {
      this.beaconGroup.rotation.y += dt * 0.8;
      const s = 1 + Math.sin(elapsed * 3.2) * 0.12;
      this.beaconGroup.children[1].scale.set(s, s, 1);
    }
  }
}
