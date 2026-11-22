// src/workbench.js — Banc de Scie & Façonnage (dalles de sol, briques taillées, poutres)
// CORRECTIF CAMÉRA CRITIQUE : caméra strictement droite et verrouillée sur le plan de travail,
// zéro inversion d'axe, zéro retournement (camera.up = (0,1,0) + lookAt horizontalement décalé).

import * as THREE from 'three';
import { VILLAGE_LAYOUT } from './world.js';

export const WORKBENCH_RECIPES = {
  slab: {
    id: 'slab',
    inputKey: 'stone',
    inputCost: 1,
    outputKey: 'slabs',
    outputCount: 4,
    color: '#d4d8de',
  },
  stoneBrick: {
    id: 'stoneBrick',
    inputKey: 'stone',
    inputCost: 1,
    outputKey: 'bricks',
    outputCount: 6,
    color: '#c87e5a',
  },
  beam: {
    id: 'beam',
    inputKey: 'wood',
    inputCost: 1,
    outputKey: 'beams',
    outputCount: 4,
    color: '#8f5b2e',
  },
};

export class WorkbenchStation {
  constructor(scene, textures, audio) {
    this.scene = scene;
    this.textures = textures;
    this.audio = audio;

    this.active = false;
    this.selectedRecipe = 'slab';
    this.cutAnim = 0; // 0..1 animation de découpe 3D
    this.sawdust = [];

    this.group = new THREE.Group();
    this.group.position.set(VILLAGE_LAYOUT.workbench.x, 0, VILLAGE_LAYOUT.workbench.z);
    this.group.rotation.y = VILLAGE_LAYOUT.workbench.rotY;

    this.sawBlade = null;
    this.workpieceLeft = null;
    this.workpieceRight = null;

    // Sauvegarde de la pose caméra avant entrée dans le banc
    this._savedCamPos = new THREE.Vector3();
    this._savedYaw = 0;
    this._savedPitch = 0;

    // Repères de caméra strictement droits dans le repère monde
    this._camTargetPos = new THREE.Vector3();
    this._camLookTarget = new THREE.Vector3();
    this._upVec = new THREE.Vector3(0, 1, 0);

    this._buildMesh();
    this._computeLockedCameraPose();
  }

  _buildToothedSawBladeGeometry(radius = 0.34, teeth = 28) {
    const shape = new THREE.Shape();
    const innerR = radius * 0.84;
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const aTip = ((i + 0.32) / teeth) * Math.PI * 2;
      const aRoot = ((i + 0.56) / teeth) * Math.PI * 2;
      const x0 = Math.cos(a0) * innerR, y0 = Math.sin(a0) * innerR;
      const x1 = Math.cos(aTip) * radius, y1 = Math.sin(aTip) * radius;
      const x2 = Math.cos(aRoot) * innerR, y2 = Math.sin(aRoot) * innerR;
      if (i === 0) shape.moveTo(x0, y0);
      else shape.lineTo(x0, y0);
      shape.lineTo(x1, y1);
      shape.lineTo(x2, y2);
    }
    shape.closePath();

    // Trou central d'arbre
    const hole = new THREE.Path();
    hole.absarc(0, 0, radius * 0.16, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
    });
    geo.translate(0, 0, -0.011);
    geo.rotateY(Math.PI / 2); // Lame dans le plan YZ, rotation autour de X
    return geo;
  }

  _buildMesh() {
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.2 });
    const darkWoodMat = this.textures.createPBRMaterial('wood', { color: '#633c1c', normalStrength: 1.1 });
    const paleWoodMat = this.textures.createPBRMaterial('wood', { color: '#d4ab74', normalStrength: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#d8dfe8', metalness: 0.88, roughness: 0.2 });
    const ironMat = new THREE.MeshStandardMaterial({ color: '#31363d', metalness: 0.8, roughness: 0.38 });
    const brassMat = new THREE.MeshStandardMaterial({ color: '#d9aa48', metalness: 0.72, roughness: 0.28 });

    // 1. Plateau massif assemblé en 4 madriers de chêne
    for (let p = 0; p < 4; p++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.14, 0.32), woodMat);
      plank.position.set(0, 0.97, -0.51 + p * 0.34);
      plank.castShadow = true;
      plank.receiveShadow = true;
      this.group.add(plank);
    }

    // 2. Tréteaux mortaisés en A (2 cadres latéraux + traverse basse à tenon et clavette)
    [-0.98, 0.98].forEach((tx) => {
      // Pieds inclinés en A
      [-0.44, 0.44].forEach((tz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.98, 0.14), darkWoodMat);
        leg.position.set(tx, 0.46, tz);
        leg.rotation.x = tz > 0 ? -0.14 : 0.14;
        leg.castShadow = true;
        this.group.add(leg);
      });
      // Semelle basse & traverse haute mortaisée
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 1.24), darkWoodMat);
      foot.position.set(tx, 0.05, 0);
      foot.castShadow = true;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 1.12), darkWoodMat);
      topBar.position.set(tx, 0.86, 0);
      const midBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.05), darkWoodMat);
      midBar.position.set(tx, 0.34, 0);
      this.group.add(foot, topBar, midBar);

      // Clavettes bois sortant des mortaises
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.06), paleWoodMat);
      wedge.position.set(tx > 0 ? tx + 0.18 : tx - 0.18, 0.34, 0);
      wedge.rotation.z = tx > 0 ? -0.18 : 0.18;
      this.group.add(wedge);
    });

    // Longeron central traversant les deux tréteaux mortaisés
    const stretcher = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.12, 0.14), darkWoodMat);
    stretcher.position.set(0, 0.34, 0);
    stretcher.castShadow = true;
    this.group.add(stretcher);

    // Presse / étau de menuisier sur l'avant gauche
    const viseJaw = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.08), darkWoodMat);
    viseJaw.position.set(-0.78, 0.9, 0.74);
    const viseScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.24, 8), ironMat);
    viseScrew.rotation.x = Math.PI / 2;
    viseScrew.position.set(-0.78, 0.9, 0.76);
    const viseHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), paleWoodMat);
    viseHandle.rotation.z = Math.PI / 2;
    viseHandle.position.set(-0.78, 0.9, 0.87);
    this.group.add(viseJaw, viseScrew, viseHandle);

    // Guide de coupe parallèle + serre-joints en fer
    const fence = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.12, 0.09), darkWoodMat);
    fence.position.set(0, 1.1, -0.44);
    this.group.add(fence);

    // 3. Vraie lame de scie circulaire dentée métallique (28 dents en ExtrudeGeometry !)
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.78), new THREE.MeshBasicMaterial({ color: '#1b120b' }));
    slot.position.set(0, 1.045, 0);
    this.group.add(slot);

    const bladeGeo = this._buildToothedSawBladeGeometry(0.35, 28);
    this.sawBlade = new THREE.Mesh(bladeGeo, metalMat);
    this.sawBlade.position.set(0, 1.05, 0);
    this.sawBlade.castShadow = true;
    this.group.add(this.sawBlade);

    // Moyeu en laiton + écrou d'arbre
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.05, 12), brassMat);
    hub.rotation.z = Math.PI / 2;
    this.sawBlade.add(hub);
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.075, 6), ironMat);
    nut.rotation.z = Math.PI / 2;
    this.sawBlade.add(nut);

    // Pièces de démonstration sur la table (se séparent en deux lors de la découpe!)
    const pieceGeo = new THREE.BoxGeometry(0.42, 0.24, 0.56);
    const slabPbr = this.textures.createPBRMaterial('slab', { normalStrength: 1.1 });
    this.workpieceLeft = new THREE.Mesh(pieceGeo, slabPbr);
    this.workpieceRight = new THREE.Mesh(pieceGeo, slabPbr);
    this.workpieceLeft.position.set(-0.22, 1.16, 0.04);
    this.workpieceRight.position.set(0.22, 1.16, 0.04);
    this.workpieceLeft.castShadow = true;
    this.workpieceRight.castShadow = true;
    this.group.add(this.workpieceLeft, this.workpieceRight);

    // 4. Copeaux de bois & sciure répandus au sol sous le banc
    const curlGeo = new THREE.TorusGeometry(0.055, 0.016, 4, 7, Math.PI * 1.4);
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + i * 0.7;
      const rad = 0.22 + ((i * 37) % 100) / 100 * 1.15;
      const chip = new THREE.Mesh(curlGeo, i % 2 === 0 ? paleWoodMat : woodMat);
      chip.position.set(Math.cos(ang) * rad * 1.15, 0.022, Math.sin(ang) * rad * 0.75);
      chip.rotation.set(Math.PI / 2 + (i % 3) * 0.18, i * 1.3, 0);
      this.group.add(chip);
    }

    // 5. Pile de planches fraîchement sciées (avec baguettes d'espacement) à droite du banc
    const stackGroup = new THREE.Group();
    stackGroup.position.set(2.05, 0, -0.15);
    stackGroup.rotation.y = 0.16;
    for (let tier = 0; tier < 4; tier++) {
      const ty = 0.06 + tier * 0.115;
      for (let k = 0; k < 3; k++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.065, 0.24), tier % 2 === 0 ? woodMat : paleWoodMat);
        board.position.set(0, ty, -0.27 + k * 0.27);
        board.castShadow = true;
        board.receiveShadow = true;
        stackGroup.add(board);
      }
      // Baguettes transversales de séchage entre les lits de planches
      if (tier < 3) {
        [-0.52, 0.52].forEach((sx) => {
          const sticker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.82), darkWoodMat);
          sticker.position.set(sx, ty + 0.055, 0);
          stackGroup.add(sticker);
        });
      }
    }
    this.group.add(stackGroup);

    // 6. Auvent d'atelier à chevrons apparents sur poteaux arrière (zéro obstruction de la caméra avant)
    const postGeo = new THREE.BoxGeometry(0.15, 2.55, 0.15);
    [-1.24, 1.24].forEach((px) => {
      const p = new THREE.Mesh(postGeo, darkWoodMat);
      p.position.set(px, 1.27, -0.64);
      p.castShadow = true;
      this.group.add(p);
    });
    for (let r = 0; r < 5; r++) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 1.48), darkWoodMat);
      rafter.position.set(-1.2 + r * 0.6, 2.48, -0.22);
      rafter.rotation.x = 0.24;
      this.group.add(rafter);
    }
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(2.96, 0.1, 1.44),
      this.textures.createPBRMaterial('roofRed', { normalStrength: 1.15 })
    );
    canopy.position.set(0, 2.58, -0.2);
    canopy.rotation.x = 0.24;
    canopy.castShadow = true;
    this.group.add(canopy);

    this.scene.add(this.group);
  }

  _computeLockedCameraPose() {
    // Vecteur avant local (+Z) du banc -> la caméra se place STRICTEMENT devant le banc,
    // décalée horizontalement de 2.05m et élevée de 2.05m, regardant le centre du plateau (y=1.05).
    // Aucun gimbal lock, aucun roll, aucune inversion d'axe possible !
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(this._upVec, this.group.rotation.y).normalize();
    this._camTargetPos.copy(this.group.position)
      .addScaledVector(forward, 2.05)
      .add(new THREE.Vector3(0, 2.05, 0));
    this._camLookTarget.copy(this.group.position)
      .add(new THREE.Vector3(0, 1.02, 0));
  }

  isPlayerNear(playerPos, maxDist = 4.2) {
    return Math.hypot(
      playerPos.x - this.group.position.x,
      playerPos.z - this.group.position.z
    ) <= maxDist;
  }

  enter(camera, controls) {
    if (this.active) return;
    this.active = true;
    this._savedCamPos.copy(camera.position);
    this._savedYaw = controls.yaw;
    this._savedPitch = controls.pitch;
    controls.setLookLocked(true);
    this._computeLockedCameraPose();
    this.setRecipe(this.selectedRecipe);
  }

  exit(camera, controls) {
    if (!this.active) return;
    this.active = false;
    camera.up.set(0, 1, 0);
    camera.position.copy(this._savedCamPos);
    controls.yaw = this._savedYaw;
    controls.pitch = this._savedPitch;
    controls.setLookLocked(false);
  }

  setRecipe(recipeId) {
    if (!WORKBENCH_RECIPES[recipeId]) return;
    this.selectedRecipe = recipeId;
    const r = WORKBENCH_RECIPES[recipeId];
    const kind = recipeId === 'slab' ? 'slab' : recipeId === 'stoneBrick' ? 'brick' : 'wood';
    const mat = this.textures.createPBRMaterial(kind, { color: r.color, normalStrength: 1.15 });
    this.workpieceLeft.material = mat;
    this.workpieceRight.material = mat;

    if (recipeId === 'slab') {
      this.workpieceLeft.scale.set(1.05, 0.42, 1.1);
      this.workpieceRight.scale.set(1.05, 0.42, 1.1);
    } else if (recipeId === 'stoneBrick') {
      this.workpieceLeft.scale.set(0.85, 0.72, 0.9);
      this.workpieceRight.scale.set(0.85, 0.72, 0.9);
    } else {
      this.workpieceLeft.scale.set(1.2, 0.65, 0.65);
      this.workpieceRight.scale.set(1.2, 0.65, 0.65);
    }
    this.workpieceLeft.position.set(-0.21, 1.13, 0.05);
    this.workpieceRight.position.set(0.21, 1.13, 0.05);
  }

  triggerCut(inventory, handcart) {
    const recipe = WORKBENCH_RECIPES[this.selectedRecipe];
    if (!recipe) return { ok: false };

    // Vérifie si le joueur OU la charrette garée à proximité (< 6m) possède le matériau brut
    const cartNear = handcart && Math.hypot(
      handcart.group.position.x - this.group.position.x,
      handcart.group.position.z - this.group.position.z
    ) < 6.5;

    let consumed = false;
    if ((inventory[recipe.inputKey] || 0) >= recipe.inputCost) {
      inventory[recipe.inputKey] -= recipe.inputCost;
      consumed = true;
    } else if (cartNear && handcart.removeItem(recipe.inputKey, recipe.inputCost)) {
      consumed = true;
    }

    if (!consumed) return { ok: false, missing: recipe.inputKey };

    inventory[recipe.outputKey] = (inventory[recipe.outputKey] || 0) + recipe.outputCount;
    this.cutAnim = 1.0;
    this.audio.playSawCut();
    if (navigator.vibrate) {
      try { navigator.vibrate([15, 30, 20]); } catch (_) {}
    }
    this._spawnSawdust(recipe.inputKey === 'wood' ? '#e3bd7d' : '#dfe3e8');
    return { ok: true, recipe };
  }

  _spawnSawdust(hexColor) {
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color: hexColor });
    const worldCenter = this.group.localToWorld(new THREE.Vector3(0, 1.18, 0));
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(worldCenter);
      this.scene.add(p);
      this.sawdust.push({
        mesh: p,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.4,
          1.4 + Math.random() * 1.9,
          (Math.random() - 0.5) * 2.4
        ),
        life: 0.55,
      });
    }
  }

  update(dt, camera) {
    // Rotation continue de la lame (plus rapide pendant la coupe)
    if (this.sawBlade) {
      const spinSpeed = this.cutAnim > 0 ? 22 : (this.active ? 8 : 2.5);
      this.sawBlade.rotation.x += dt * spinSpeed;
    }

    // Animation de séparation nette des deux moitiés coupées sur le plateau
    if (this.cutAnim > 0) {
      this.cutAnim = Math.max(0, this.cutAnim - dt * 2.2);
      const split = Math.sin((1 - this.cutAnim) * Math.PI) * 0.34;
      this.workpieceLeft.position.x = -0.21 - split;
      this.workpieceRight.position.x = 0.21 + split;
    } else {
      this.workpieceLeft.position.x = -0.21;
      this.workpieceRight.position.x = 0.21;
    }

    // Particules de sciure / poussière de pierre
    for (let i = this.sawdust.length - 1; i >= 0; i--) {
      const p = this.sawdust[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.sawdust.splice(i, 1);
        continue;
      }
      p.vel.y -= 8.5 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(p.life * 1.8);
    }

    // VERROUILLAGE CAMÉRA STRICTEMENT DROIT EN MODE BANC DE SCIE
    if (this.active && camera) {
      camera.up.set(0, 1, 0);
      camera.position.lerp(this._camTargetPos, Math.min(1, dt * 10));
      camera.lookAt(this._camLookTarget);
    }
  }
}
