// src/building.js — Construction par briques InstancedMesh + Raycast Aim-Snapping
// CORRECTIF COMPTAGE CRITIQUE : chaque brique/dalle posée incrémente building.placedCount de EXACTEMENT +1.

import * as THREE from 'three';
import { VILLAGE_LAYOUT } from './world.js';

const MAX_GHOSTS_VISIBLE = 180;

// Couleurs riches par type de brique/matériau (multipliées par la texture de brique)
const PALETTE = {
  slab: [0xdde1e7, 0xd1d6dd, 0xc8ced6],
  stoneBrick: [0xcbc6ba, 0xbdb7aa, 0xd6d1c4, 0xb3aea2],
  clayBrick: [0xd47d58, 0xc66b47, 0xde8b66, 0xb85f3d],
  plaster: [0xf3e7cf, 0xeadbc0, 0xf7eedb],
  beam: [0x6e4321, 0x5c3618, 0x7d4e28],
};

function pickColor(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

// Génère la grille architecturale exacte d'un bâtiment avec son volume exact de briques (targetBricks)
export function generateBuildingSlots(cfg) {
  const slots = [];
  const halfW = cfg.width * 0.5;
  const halfD = cfg.depth * 0.5;
  const wallH = cfg.wallHeight;

  // Dimensions de brique calibrées par taille de bâtiment pour obtenir naturellement
  // des façades denses, lisibles et un total fidèle au plan IMG_0581.JPG
  const brickScale = cfg.targetBricks >= 8000 ? 0.21 : 0.23;
  const bLen = brickScale * 1.48;
  const bH = brickScale * 0.78;
  const bThick = brickScale * 0.92;

  const pushSlot = (lx, ly, lz, sx, sy, sz, rotY, materialType, colorHex) => {
    slots.push({
      lx,
      ly,
      lz,
      sx,
      sy,
      sz,
      rotY,
      materialType, // 'slabs' | 'bricks' | 'beams'
      colorHex,
    });
  };

  // Vérifie si un point sur un mur tombe dans l'ouverture de porte marchable (1.5m × 2.35m)
  const isInDoorway = (side, u, y) => {
    if (side !== cfg.doorSide) return false;
    return Math.abs(u) < 0.78 && y < 2.38;
  };

  // Vérifie si un point tombe dans une fenêtre médiévale
  const isInWindow = (side, u, y, span) => {
    if (side === cfg.doorSide && Math.abs(u) < 1.2) return false;
    if (y < 1.15 || y > 2.05) return false;
    if (cfg.style === 'church') {
      // Rangée de 4 fenêtres en arc sur les côtés de la nef
      if (side === 'north' || side === 'south') {
        const spacing = 2.55;
        const mod = Math.abs(((u + spacing * 3.5) % spacing) - spacing * 0.5);
        return mod < 0.36 && Math.abs(u) < span * 0.38;
      }
      return false;
    }
    if (cfg.style === 'mairie') {
      // Fenêtres à l'étage + arcades au rez-de-chaussée
      if (y > 3.1 && y < 4.1) {
        const spacing = 2.4;
        const mod = Math.abs(((u + spacing * 2.5) % spacing) - spacing * 0.5);
        return mod < 0.42 && Math.abs(u) < span * 0.4;
      }
      return false;
    }
    // Maisons : 1 ou 2 fenêtres par côté
    if (span > 5.0) {
      return Math.abs(Math.abs(u) - span * 0.24) < 0.42;
    }
    return Math.abs(u) < 0.42;
  };

  // ------------------------------------------------------------------
  // COUCHE 0 : DALLES DE SOL MARCHABLES (coupées sur le banc de scie!)
  // ------------------------------------------------------------------
  const slabSize = 0.78;
  const colsX = Math.max(4, Math.floor((cfg.width - 0.5) / slabSize));
  const colsZ = Math.max(4, Math.floor((cfg.depth - 0.5) / slabSize));
  const stepX = (cfg.width - 0.55) / colsX;
  const stepZ = (cfg.depth - 0.55) / colsZ;

  for (let ix = 0; ix < colsX; ix++) {
    for (let iz = 0; iz < colsZ; iz++) {
      const lx = -halfW + 0.28 + (ix + 0.5) * stepX;
      const lz = -halfD + 0.28 + (iz + 0.5) * stepZ;
      pushSlot(
        lx,
        0.045,
        lz,
        stepX * 0.96,
        0.09,
        stepZ * 0.96,
        0,
        'slabs',
        pickColor(PALETTE.slab, ix * 7 + iz * 13)
      );
    }
  }

  // ------------------------------------------------------------------
  // COUCHES 1..N : MURS EXTÉRIEURS EN APPAREILLAGE QUINCONCE (RUNNING BOND)
  // ------------------------------------------------------------------
  const wallPalette =
    cfg.style === 'church' || cfg.style === 'pierre'
      ? PALETTE.stoneBrick
      : cfg.style === 'forge'
        ? PALETTE.clayBrick
        : cfg.style === 'colombages' || cfg.style === 'mairie' || cfg.style === 'marchand'
          ? PALETTE.plaster
          : PALETTE.stoneBrick;

  const isTimberFramed =
    cfg.style === 'colombages' || cfg.style === 'mairie' || cfg.style === 'marchand';

  // Construit un mur rectiligne complet couche par couche
  const buildWallCourses = (
    side,
    x0,
    z0,
    x1,
    z1,
    yStart,
    yEnd,
    brickLenOverride = bLen,
    brickHOverride = bH,
    thickOverride = bThick,
    skipOpenings = true
  ) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const dirX = dx / len;
    const dirZ = dz / len;
    const rotY = Math.atan2(dirX, dirZ) + Math.PI / 2;
    const courses = Math.max(1, Math.round((yEnd - yStart) / brickHOverride));

    for (let c = 0; c < courses; c++) {
      const ly = yStart + (c + 0.5) * brickHOverride;
      const offset = (c % 2) * (brickLenOverride * 0.5);
      const count = Math.max(2, Math.floor(len / brickLenOverride));
      const actualStep = len / count;

      for (let i = 0; i < count; i++) {
        const dist = ((i + 0.5) * actualStep + offset * 0.45) % len;
        const u = dist - len * 0.5;
        if (skipOpenings && (isInDoorway(side, u, ly) || isInWindow(side, u, ly, len))) {
          continue;
        }
        const lx = x0 + dirX * dist;
        const lz = z0 + dirZ * dist;

        // Colombages en bois sur coins, sablières et poteaux verticaux
        let matType = 'bricks';
        let colHex = pickColor(wallPalette, c * 17 + i * 31);
        if (ly < 0.72) {
          // Soubassement pierre solide sur tous les bâtiments médiévaux
          colHex = pickColor(PALETTE.stoneBrick, c * 11 + i * 7);
        } else if (isTimberFramed) {
          const nearCorner = Math.abs(u) > len * 0.43;
          const nearBelt = c === courses - 1 || Math.abs(ly - 2.65) < brickHOverride * 0.7;
          const nearPost = Math.abs(((u + 12) % 2.1) - 1.05) < brickLenOverride * 0.42;
          if (nearCorner || nearBelt || nearPost) {
            matType = 'beams';
            colHex = pickColor(PALETTE.beam, c + i);
          }
        }
        pushSlot(
          lx,
          ly,
          lz,
          actualStep * 0.94,
          brickHOverride * 0.92,
          thickOverride,
          rotY,
          matType,
          colHex
        );
      }
    }
  };

  // On calcule un double rang (parement extérieur + parement intérieur épais) pour les grands monuments
  // ou une densité adaptée afin que le volume physique corresponde naturellement au plan !
  const layersThickness = cfg.targetBricks >= 8000 ? 2 : 1;

  for (let tLayer = 0; tLayer < layersThickness; tLayer++) {
    const inset = tLayer * (bThick * 0.95);
    const w = halfW - inset;
    const d = halfD - inset;
    buildWallCourses('north', -w, -d, w, -d, 0.09, wallH);
    buildWallCourses('south', w, d, -w, d, 0.09, wallH);
    buildWallCourses('west', -w, d, -w, -d, 0.09, wallH);
    buildWallCourses('east', w, -d, w, d, 0.09, wallH);
  }

  // ------------------------------------------------------------------
  // DÉTAILS ARCHITECTURAUX SPÉCIFIQUES AU PLAN IMG_0581.JPG
  // ------------------------------------------------------------------

  if (cfg.style === 'church') {
    // 1. Clocher carré Ouest (s'élève jusqu'à 9.8m)
    const tw = 2.05;
    const tx0 = -halfW - 0.1;
    const tx1 = -halfW + 3.6;
    buildWallCourses('towerN', tx0, -tw, tx1, -tw, wallH, 9.6, bLen * 0.9, bH * 0.9, bThick, false);
    buildWallCourses('towerS', tx1, tw, tx0, tw, wallH, 9.6, bLen * 0.9, bH * 0.9, bThick, false);
    buildWallCourses('towerW', tx0, tw, tx0, -tw, wallH, 9.6, bLen * 0.9, bH * 0.9, bThick, false);
    buildWallCourses('towerE', tx1, -tw, tx1, tw, wallH, 9.6, bLen * 0.9, bH * 0.9, bThick, false);

    // 2. Abside semi-circulaire à l'Est (+X) fidèle au plan au sol d'IMG_0581
    const apseRadius = 2.35;
    const apseCourses = Math.floor((wallH - 0.5) / bH);
    for (let c = 0; c < apseCourses; c++) {
      const ly = 0.09 + (c + 0.5) * bH;
      const segs = 22;
      for (let s = 0; s < segs; s++) {
        const ang = -Math.PI * 0.48 + (s / (segs - 1)) * Math.PI * 0.96;
        const lx = halfW + Math.cos(ang) * apseRadius;
        const lz = Math.sin(ang) * apseRadius;
        pushSlot(
          lx,
          ly,
          lz,
          bLen * 0.88,
          bH * 0.92,
          bThick,
          -ang + Math.PI / 2,
          'bricks',
          pickColor(PALETTE.stoneBrick, c * 13 + s * 5)
        );
      }
    }
  } else if (cfg.style === 'mairie') {
    // Beffroi central + escalier extérieur en pierre sur le flanc Est (selon IMG_0581)
    const bw = 1.65;
    buildWallCourses('belfryN', -bw, -bw, bw, -bw, wallH, wallH + 2.6, bLen * 0.85, bH * 0.85, bThick, false);
    buildWallCourses('belfryS', bw, bw, -bw, bw, wallH, wallH + 2.6, bLen * 0.85, bH * 0.85, bThick, false);
    buildWallCourses('belfryW', -bw, bw, -bw, -bw, wallH, wallH + 2.6, bLen * 0.85, bH * 0.85, bThick, false);
    buildWallCourses('belfryE', bw, -bw, bw, bw, wallH, wallH + 2.6, bLen * 0.85, bH * 0.85, bThick, false);

    // Massif d'escalier extérieur pierre sur le côté droit (+X)
    for (let step = 0; step < 12; step++) {
      const sy = 0.16 + step * 0.21;
      const sz = halfD - 0.6 - step * 0.34;
      for (let k = 0; k < 5; k++) {
        pushSlot(
          halfW + 0.35 + k * 0.24,
          sy,
          sz,
          0.24,
          0.2,
          0.32,
          0,
          'bricks',
          pickColor(PALETTE.stoneBrick, step * 5 + k)
        );
      }
    }
  } else if (cfg.style === 'forge') {
    // Grande cheminée de forge extérieure en briques & pierre (fidèle à IMG_0581)
    const cx0 = halfW - 0.1;
    const cx1 = halfW + 1.35;
    buildWallCourses('chimN', cx0, -1.0, cx1, -1.0, 0.09, wallH + 2.5, bLen * 0.8, bH * 0.85, bThick, false);
    buildWallCourses('chimS', cx1, 1.0, cx0, 1.0, 0.09, wallH + 2.5, bLen * 0.8, bH * 0.85, bThick, false);
    buildWallCourses('chimE', cx1, -1.0, cx1, 1.0, 0.09, wallH + 2.5, bLen * 0.8, bH * 0.85, bThick, false);
  }

  // ------------------------------------------------------------------
  // CALIBRATION AU NOMBRE EXACT DE BRIQUES DU PLAN (targetBricks)
  // On complète proprement les pignons, corniches et rangées de finition maçonnées
  // jusqu'à atteindre EXACTEMENT cfg.targetBricks (12000, 8500, 2500..4500) !
  // ------------------------------------------------------------------
  const target = cfg.targetBricks;

  // Si on a dépassé (rare), on réduit proprement la fin tout en gardant les dalles & murs de base
  if (slots.length > target) {
    slots.length = target;
  }

  // Remplissage architectural structuré (rangs de pignon + renforts intérieurs de maçonnerie)
  // afin que chaque brique supplémentaire contribue réellement à la solidité visuelle du mur !
  let ringIndex = 0;
  while (slots.length < target) {
    const subLayer = ringIndex % 3;
    const tier = Math.floor(ringIndex / 3);
    const y = 0.2 + ((tier * bH * 0.92) % (wallH - 0.35));
    const inset = 0.06 + subLayer * 0.11;
    const w = Math.max(1.2, halfW - inset);
    const d = Math.max(1.2, halfD - inset);
    const perimSteps = [
      ['north', -w, -d, w, -d],
      ['south', w, d, -w, d],
      ['west', -w, d, -w, -d],
      ['east', w, -d, w, d],
    ];

    for (const [side, x0, z0, x1, z1] of perimSteps) {
      if (slots.length >= target) break;
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const dirX = dx / len;
      const dirZ = dz / len;
      const rotY = Math.atan2(dirX, dirZ) + Math.PI / 2;
      const count = Math.max(4, Math.floor(len / (bLen * 0.72)));
      for (let i = 0; i < count && slots.length < target; i++) {
        const dist = ((i + 0.5) / count) * len;
        const u = dist - len * 0.5;
        if (isInDoorway(side, u, y) || isInWindow(side, u, y, len)) continue;
        pushSlot(
          x0 + dirX * dist,
          y,
          z0 + dirZ * dist,
          (len / count) * 0.92,
          bH * 0.88,
          bThick * 0.65,
          rotY,
          'bricks',
          pickColor(wallPalette, ringIndex * 23 + i * 11)
        );
      }
    }
    ringIndex++;
  }

  // Tri vertical strict (dalles de sol en premier, puis cours de briques du bas vers le haut)
  slots.sort((a, b) => {
    if (a.materialType === 'slabs' && b.materialType !== 'slabs') return -1;
    if (b.materialType === 'slabs' && a.materialType !== 'slabs') return 1;
    if (Math.abs(a.ly - b.ly) > 0.05) return a.ly - b.ly;
    return Math.atan2(a.lz, a.lx) - Math.atan2(b.lz, b.lx);
  });

  return slots;
}

// Géométrie de brique/dalle chanfreinée (ExtrudeGeometry biseautée, normalisée 1x1x1)
// pour que chaque arête de brique capte nettement la lumière du soleil
function createBeveledBrickGeometry() {
  const b = 0.045;
  const hw = 0.5 - b;
  const hh = 0.5 - b;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.0 - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1,
    steps: 1,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

export class BuildingSystem {
  constructor(scene, textures, audio, onBuildingProgress, onBuildingComplete) {
    this.scene = scene;
    this.textures = textures;
    this.audio = audio;
    this.onBuildingProgress = onBuildingProgress;
    this.onBuildingComplete = onBuildingComplete;

    this.buildings = [];
    this.activeBuilding = null;
    this.snappedTarget = null;
    this.masonAssistIds = new Set();

    this.dustPuffs = [];
    this._raycaster = new THREE.Raycaster();
    this._centerNDC = new THREE.Vector2(0, 0);
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();

    // Géométrie de brique/dalle à arêtes chanfreinées partagée par tous les InstancedMesh
    this.unitBoxGeo = createBeveledBrickGeometry();
    this.ghostBoxGeo = new THREE.BoxGeometry(1, 1, 1);

    // Brique fantôme aim-snappée (surlignage doré-cyan très lisible)
    this.snapPreviewMesh = new THREE.Mesh(
      this.ghostBoxGeo,
      new THREE.MeshBasicMaterial({
        color: '#46f0ff',
        transparent: true,
        opacity: 0.72,
        wireframe: false,
      })
    );
    const snapEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.ghostBoxGeo),
      new THREE.LineBasicMaterial({ color: '#ffe86b' })
    );
    this.snapPreviewMesh.add(snapEdges);
    this.snapPreviewMesh.visible = false;
    this.scene.add(this.snapPreviewMesh);

    // Pool InstancedMesh des fantômes de la couche active (max 180 emplacements visibles à la fois)
    this.ghostMat = new THREE.MeshBasicMaterial({
      color: '#57e3ff',
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    this.ghostMesh = new THREE.InstancedMesh(this.ghostBoxGeo, this.ghostMat, MAX_GHOSTS_VISIBLE);
    this.ghostMesh.count = 0;
    this.ghostMesh.frustumCulled = false;
    this.ghostSlotMap = new Int32Array(MAX_GHOSTS_VISIBLE);
    this.ghostBuildingId = null;
    this.scene.add(this.ghostMesh);

    this._initBuildings();
  }

  _initBuildings() {
    const brickMat = this.textures.createPBRMaterial('brick', {
      normalStrength: 1.15,
      roughness: 0.92,
      metalness: 0.03,
    });

    for (const cfg of VILLAGE_LAYOUT.buildings) {
      const slots = generateBuildingSlots(cfg);
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, cfg.z);
      group.rotation.y = cfg.rotY;
      this.scene.add(group);

      // InstancedMesh unique par bâtiment pour les dizaines de milliers de briques
      const placedMesh = new THREE.InstancedMesh(this.unitBoxGeo, brickMat, slots.length);
      placedMesh.count = 0;
      placedMesh.castShadow = true;
      placedMesh.receiveShadow = true;
      placedMesh.frustumCulled = false;
      group.add(placedMesh);

      // Plan architectural translucide au sol (blueprint 100 % diégétique)
      const blueprintMesh = this._createGroundBlueprint(cfg);
      group.add(blueprintMesh);

      const building = {
        cfg,
        id: cfg.id,
        name: cfg.name,
        icon: cfg.icon,
        targetBricks: slots.length, // Strictement égal à cfg.targetBricks
        slots,
        placedFlags: new Uint8Array(slots.length), // 0 = vide, 1 = posée (garde anti-doublon stricte)
        placedCount: 0, // SOURCE UNIQUE DE VÉRITÉ — incrémenté STRICTEMENT de +1
        completed: false,
        group,
        placedMesh,
        blueprintMesh,
        nextScanCursor: 0,
      };
      this.buildings.push(building);
    }
  }

  _createGroundBlueprint(cfg) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    ctx.clearRect(0, 0, 512, 512);
    // Fond cyan parchemin translucide
    ctx.fillStyle = 'rgba(42, 168, 224, 0.22)';
    ctx.fillRect(16, 16, 480, 480);

    // Quadrillage d'architecte
    ctx.strokeStyle = 'rgba(180, 240, 255, 0.32)';
    ctx.lineWidth = 2;
    for (let i = 32; i < 496; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 16);
      ctx.lineTo(i, 496);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, i);
      ctx.lineTo(496, i);
      ctx.stroke();
    }

    // Double contour lumineux des murs
    ctx.strokeStyle = 'rgba(255, 236, 140, 0.92)';
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, 464, 464);
    ctx.strokeStyle = 'rgba(92, 238, 255, 0.95)';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 432, 432);

    // Repère d'entrée (flèche dorée vers la porte)
    ctx.fillStyle = 'rgba(255, 226, 89, 0.92)';
    ctx.beginPath();
    if (cfg.doorSide === 'south') {
      ctx.moveTo(256, 440); ctx.lineTo(226, 492); ctx.lineTo(286, 492);
    } else if (cfg.doorSide === 'north') {
      ctx.moveTo(256, 72); ctx.lineTo(226, 20); ctx.lineTo(286, 20);
    } else if (cfg.doorSide === 'west') {
      ctx.moveTo(72, 256); ctx.lineTo(20, 226); ctx.lineTo(20, 286);
    } else {
      ctx.moveTo(440, 256); ctx.lineTo(492, 226); ctx.lineTo(492, 286);
    }
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.width + 0.8, cfg.depth + 0.8),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.03;
    return plane;
  }

  getBuildingById(id) {
    return this.buildings.find((b) => b.id === id) || null;
  }

  getTotalPlacedBricks() {
    let sum = 0;
    for (const b of this.buildings) sum += b.placedCount;
    return sum;
  }

  getTotalTargetBricks() {
    let sum = 0;
    for (const b of this.buildings) sum += b.targetBricks;
    return sum;
  }

  // =========================================================================
  // POSE ATOMIQUE STRICTEMENT +1 (CORRIGE DÉFINITIVEMENT LE BUG 6 -> 12)
  // =========================================================================
  placeSingleBrick(building, slotIdx, inventory, handcart, bypassMaterial = false) {
    if (!building || building.completed) return false;
    if (slotIdx < 0 || slotIdx >= building.slots.length) return false;

    // GARDE CRITIQUE : impossible de poser ou compter deux fois le même emplacement !
    if (building.placedFlags[slotIdx] === 1) return false;

    const slot = building.slots[slotIdx];
    const reqKey = slot.materialType; // 'slabs' | 'bricks' | 'beams'

    if (!bypassMaterial) {
      const cartNear = handcart && Math.hypot(
        handcart.group.position.x - building.cfg.x,
        handcart.group.position.z - building.cfg.z
      ) < Math.max(building.cfg.width, building.cfg.depth) + 10.5;

      // Consomme 1 pièce requise (ou brique en secours si poutre manquante) depuis joueur ou charrette
      let consumed = false;
      if ((inventory[reqKey] || 0) >= 1) {
        inventory[reqKey] -= 1;
        consumed = true;
      } else if (cartNear && handcart.removeItem(reqKey, 1)) {
        consumed = true;
      } else if (reqKey === 'beams' && (inventory.bricks || 0) >= 1) {
        inventory.bricks -= 1;
        consumed = true;
      } else if (reqKey === 'beams' && cartNear && handcart.removeItem('bricks', 1)) {
        consumed = true;
      }

      if (!consumed) return false;
    }

    // Marquage & incrémentation STRICTEMENT DE +1
    building.placedFlags[slotIdx] = 1;
    const instanceIdx = building.placedCount;
    building.placedCount += 1;

    // Écrit la matrice & la couleur de cette unique brique dans l'InstancedMesh du bâtiment
    this._dummy.position.set(slot.lx, slot.ly, slot.lz);
    this._dummy.rotation.set(0, slot.rotY, 0);
    this._dummy.scale.set(slot.sx, slot.sy, slot.sz);
    this._dummy.updateMatrix();

    building.placedMesh.setMatrixAt(instanceIdx, this._dummy.matrix);
    this._color.setHex(slot.colorHex);
    const jitter = (((slotIdx * 2654435761) >>> 0) % 1000) / 1000;
    this._color.offsetHSL((jitter - 0.5) * 0.025, (jitter - 0.5) * 0.06, (jitter - 0.5) * 0.09);
    building.placedMesh.setColorAt(instanceIdx, this._color);
    building.placedMesh.count = building.placedCount;
    building.placedMesh.instanceMatrix.needsUpdate = true;
    if (building.placedMesh.instanceColor) {
      building.placedMesh.instanceColor.needsUpdate = true;
    }

    // Vérification de complétion
    if (building.placedCount >= building.targetBricks && !building.completed) {
      building.completed = true;
      building.blueprintMesh.visible = false;
      this.masonAssistIds.delete(building.id);
      this.audio.playFanfare();
      this.onBuildingComplete?.(building);
    }

    return true;
  }

  // Action manuelle du joueur : pose LA brique aim-snappée (1 appel = 1 brique = +1 exact)
  tryPlaceSnappedBrick(inventory, handcart) {
    if (!this.snappedTarget) return { ok: false, reason: 'no_target' };
    const { building, slotIdx, worldPos } = this.snappedTarget;

    const ok = this.placeSingleBrick(building, slotIdx, inventory, handcart, false);
    if (!ok) {
      return { ok: false, reason: 'no_material', needed: building.slots[slotIdx]?.materialType };
    }

    this.audio.playBrickPlace();
    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch (_) {}
    }
    this._spawnMortarDust(worldPos);
    this._refreshGhostLayer(building);
    this.onBuildingProgress?.(building);
    return { ok: true, building };
  }

  // Permet aux Compagnons Maçons (option Codex) de bâtir progressivement 1 brique à la fois
  // ou d'achever un chantier pour visiter son intérieur 100 % marchable
  toggleMasonAssist(buildingId) {
    const b = this.getBuildingById(buildingId);
    if (!b || b.completed) return false;
    if (this.masonAssistIds.has(buildingId)) {
      this.masonAssistIds.delete(buildingId);
      return false;
    }
    this.masonAssistIds.add(buildingId);
    return true;
  }

  completeBuildingNow(buildingId) {
    const b = this.getBuildingById(buildingId);
    if (!b || b.completed) return false;
    // Remplit chaque emplacement restant exactement +1 par emplacement non posé
    for (let i = 0; i < b.slots.length; i++) {
      if (b.placedFlags[i] === 0) {
        this.placeSingleBrick(b, i, null, null, true);
      }
    }
    if (this.activeBuilding === b) {
      this.ghostMesh.count = 0;
      this.snapPreviewMesh.visible = false;
      this.snappedTarget = null;
    }
    this.onBuildingProgress?.(b);
    return true;
  }

  _refreshGhostLayer(building) {
    if (!building || building.completed) {
      this.ghostMesh.count = 0;
      this.ghostBuildingId = null;
      return;
    }

    building.group.updateMatrixWorld(true);
    let count = 0;
    const n = building.slots.length;
    let firstEmpty = -1;

    for (let i = building.nextScanCursor; i < n && count < MAX_GHOSTS_VISIBLE; i++) {
      if (building.placedFlags[i] === 1) continue;
      if (firstEmpty === -1) firstEmpty = i;
      const slot = building.slots[i];

      this._dummy.position.set(slot.lx, slot.ly, slot.lz);
      this._dummy.rotation.set(0, slot.rotY, 0);
      this._dummy.scale.set(slot.sx, slot.sy, slot.sz);
      this._dummy.updateMatrix();

      // Convertit en repère monde pour le raycast direct
      const worldMat = new THREE.Matrix4().multiplyMatrices(
        building.group.matrixWorld,
        this._dummy.matrix
      );
      this.ghostMesh.setMatrixAt(count, worldMat);
      this.ghostSlotMap[count] = i;
      count++;
    }

    if (firstEmpty !== -1) {
      building.nextScanCursor = firstEmpty;
    }

    this.ghostMesh.count = count;
    this.ghostMesh.instanceMatrix.needsUpdate = true;
    this.ghostMesh.computeBoundingSphere();
    this.ghostBuildingId = building.id;
  }

  _spawnMortarDust(pos) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color: '#f3ebd8' });
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      this.scene.add(m);
      this.dustPuffs.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          0.8 + Math.random() * 1.1,
          (Math.random() - 0.5) * 1.6
        ),
        life: 0.35,
      });
    }
  }

  // Met à jour la détection du chantier proche, le raycast aim-snapping et les compagnons maçons
  update(dt, elapsed, camera, playerPos) {
    // 1. Trouve le chantier le plus proche du joueur
    let nearest = null;
    let nearestDist = Infinity;
    for (const b of this.buildings) {
      const dist = Math.hypot(playerPos.x - b.cfg.x, playerPos.z - b.cfg.z);
      const reach = Math.max(b.cfg.width, b.cfg.depth) * 0.72 + 8.5;
      if (dist < reach && dist < nearestDist) {
        nearestDist = dist;
        nearest = b;
      }
    }

    if (nearest !== this.activeBuilding) {
      this.activeBuilding = nearest;
      this._refreshGhostLayer(nearest && !nearest.completed ? nearest : null);
    }

    // 2. Raycast Aim-Snapping sur la couche fantôme active
    this.snappedTarget = null;
    this.snapPreviewMesh.visible = false;

    if (this.activeBuilding && !this.activeBuilding.completed && this.ghostMesh.count > 0) {
      this._raycaster.setFromCamera(this._centerNDC, camera);
      this._raycaster.far = 9.5;
      const hits = this._raycaster.intersectObject(this.ghostMesh, false);

      let chosenInst = -1;
      if (hits.length > 0 && typeof hits[0].instanceId === 'number') {
        chosenInst = hits[0].instanceId;
      } else {
        // Visée assistée magnétique douce dans un cône de 16° autour du réticule
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
        const camPos = camera.position;
        const m4 = new THREE.Matrix4();
        const p = new THREE.Vector3();
        let bestScore = Infinity;

        for (let i = 0; i < this.ghostMesh.count; i++) {
          this.ghostMesh.getMatrixAt(i, m4);
          p.setFromMatrixPosition(m4);
          const dist = p.distanceTo(camPos);
          if (dist > 8.5) continue;
          const dir = p.clone().sub(camPos).normalize();
          const dot = dir.dot(camForward);
          if (dot < 0.945) continue; // ~19° max
          const score = (1 - dot) * 18 + dist * 0.12;
          if (score < bestScore) {
            bestScore = score;
            chosenInst = i;
          }
        }
      }

      if (chosenInst >= 0 && chosenInst < this.ghostMesh.count) {
        const slotIdx = this.ghostSlotMap[chosenInst];
        if (this.activeBuilding.placedFlags[slotIdx] === 0) {
          const m4 = new THREE.Matrix4();
          this.ghostMesh.getMatrixAt(chosenInst, m4);
          const pos = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          const scl = new THREE.Vector3();
          m4.decompose(pos, quat, scl);

          const pulse = 1.03 + Math.sin(elapsed * 7) * 0.03;
          this.snapPreviewMesh.position.copy(pos);
          this.snapPreviewMesh.quaternion.copy(quat);
          this.snapPreviewMesh.scale.copy(scl).multiplyScalar(pulse);
          this.snapPreviewMesh.visible = true;

          this.snappedTarget = {
            building: this.activeBuilding,
            slotIdx,
            worldPos: pos,
            slot: this.activeBuilding.slots[slotIdx],
          };
        }
      }
    }

    // 3. Compagnons Maçons (si activés par le joueur dans le Codex) : posent 1 brique à la fois
    if (this.masonAssistIds.size > 0) {
      const bricksPerFrame = Math.max(1, Math.round(dt * 42));
      for (const bid of Array.from(this.masonAssistIds)) {
        const b = this.getBuildingById(bid);
        if (!b || b.completed) {
          this.masonAssistIds.delete(bid);
          continue;
        }
        let laid = 0;
        for (let i = b.nextScanCursor; i < b.slots.length && laid < bricksPerFrame; i++) {
          if (b.placedFlags[i] === 0) {
            if (this.placeSingleBrick(b, i, null, null, true)) {
              laid++;
              b.nextScanCursor = i + 1;
            }
          }
        }
        if (laid > 0) {
          if (this.activeBuilding === b) this._refreshGhostLayer(b);
          this.onBuildingProgress?.(b);
        }
      }
    }

    // 4. Particules de mortier
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const d = this.dustPuffs[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        this.dustPuffs.splice(i, 1);
        continue;
      }
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.scale.setScalar(d.life * 2.5);
    }
  }

  // Collisions des murs construits avec passage libre au niveau de chaque porte !
  resolveWallCollision(nextPos, interiorSystem) {
    for (const b of this.buildings) {
      // Tant que moins de 15 % des murs sont montés, le joueur peut franchir librement le blueprint
      if (b.placedCount < Math.min(240, b.targetBricks * 0.12)) continue;

      const dx = nextPos.x - b.cfg.x;
      const dz = nextPos.z - b.cfg.z;
      const maxR = Math.max(b.cfg.width, b.cfg.depth) * 0.72 + 1.2;
      if (dx * dx + dz * dz > maxR * maxR) continue;

      // Transformation dans le repère local du bâtiment
      const cos = Math.cos(-b.cfg.rotY);
      const sin = Math.sin(-b.cfg.rotY);
      let lx = dx * cos - dz * sin;
      let lz = dx * sin + dz * cos;

      const hw = b.cfg.width * 0.5;
      const hd = b.cfg.depth * 0.5;
      const pad = 0.52;
      const doorOpen = interiorSystem ? interiorSystem.isDoorOpen(b.id) : true;
      const doorHalf = 0.72;

      let adjusted = false;

      // Mur Nord (z = -hd)
      if (Math.abs(lz + hd) < pad && Math.abs(lx) < hw + 0.25) {
        if (!(b.cfg.doorSide === 'north' && doorOpen && Math.abs(lx) < doorHalf)) {
          lz = lz < -hd ? -hd - pad : -hd + pad;
          adjusted = true;
        }
      }
      // Mur Sud (z = +hd)
      if (Math.abs(lz - hd) < pad && Math.abs(lx) < hw + 0.25) {
        if (!(b.cfg.doorSide === 'south' && doorOpen && Math.abs(lx) < doorHalf)) {
          lz = lz > hd ? hd + pad : hd - pad;
          adjusted = true;
        }
      }
      // Mur Ouest (x = -hw)
      if (Math.abs(lx + hw) < pad && Math.abs(lz) < hd + 0.25) {
        if (!(b.cfg.doorSide === 'west' && doorOpen && Math.abs(lz) < doorHalf)) {
          lx = lx < -hw ? -hw - pad : -hw + pad;
          adjusted = true;
        }
      }
      // Mur Est (x = +hw)
      if (Math.abs(lx - hw) < pad && Math.abs(lz) < hd + 0.25) {
        if (!(b.cfg.doorSide === 'east' && doorOpen && Math.abs(lz) < doorHalf)) {
          lx = lx > hw ? hw + pad : hw - pad;
          adjusted = true;
        }
      }

      if (adjusted) {
        const wCos = Math.cos(b.cfg.rotY);
        const wSin = Math.sin(b.cfg.rotY);
        nextPos.x = b.cfg.x + (lx * wCos - lz * wSin);
        nextPos.z = b.cfg.z + (lx * wSin + lz * wCos);
      }
    }
  }

  // Sérialisation compacte (stocke le nombre exact de briques posées + indices hors-séquence)
  serialize() {
    const out = {};
    for (const b of this.buildings) {
      // Sauvegarde par intervalles [start, len] ultra-compacte pour localStorage (< 2 KB même à 36 800 briques!)
      const ranges = [];
      let inRun = false;
      let runStart = 0;
      for (let i = 0; i < b.placedFlags.length; i++) {
        if (b.placedFlags[i] === 1 && !inRun) {
          inRun = true;
          runStart = i;
        } else if (b.placedFlags[i] === 0 && inRun) {
          ranges.push([runStart, i - runStart]);
          inRun = false;
        }
      }
      if (inRun) {
        ranges.push([runStart, b.placedFlags.length - runStart]);
      }
      out[b.id] = ranges;
    }
    return out;
  }

  deserialize(data) {
    if (!data) return;
    for (const b of this.buildings) {
      const ranges = data[b.id];
      if (!Array.isArray(ranges)) continue;
      for (const [start, len] of ranges) {
        for (let i = start; i < start + len && i < b.slots.length; i++) {
          this.placeSingleBrick(b, i, null, null, true);
        }
      }
    }
  }
}
