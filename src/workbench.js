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

  _buildMesh() {
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.15 });
    const darkWoodMat = this.textures.createPBRMaterial('wood', { color: '#6b4222', normalStrength: 1.0 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#cfd6df', metalness: 0.78, roughness: 0.24 });
    const brassMat = new THREE.MeshStandardMaterial({ color: '#d4a448', metalness: 0.6, roughness: 0.32 });

    // Plateau de l'établi
    const tabletop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 1.35), woodMat);
    tabletop.position.y = 0.96;
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    this.group.add(tabletop);

    // 4 pieds massifs + traverses
    const legGeo = new THREE.BoxGeometry(0.16, 0.96, 0.16);
    [[-1.08, -0.52], [1.08, -0.52], [-1.08, 0.52], [1.08, 0.52]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, darkWoodMat);
      leg.position.set(lx, 0.48, lz);
      leg.castShadow = true;
      this.group.add(leg);
    });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.05), darkWoodMat);
    shelf.position.y = 0.3;
    shelf.receiveShadow = true;
    this.group.add(shelf);

    // Guide de coupe latéral en bois
    const fence = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.09), darkWoodMat);
    fence.position.set(0, 1.1, -0.44);
    this.group.add(fence);

    // Lame de scie circulaire centrale en acier (fente du plateau)
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.72), new THREE.MeshBasicMaterial({ color: '#1b120b' }));
    slot.position.set(0, 1.045, 0);
    this.group.add(slot);

    const bladeGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.025, 20);
    bladeGeo.rotateZ(Math.PI / 2);
    this.sawBlade = new THREE.Mesh(bladeGeo, metalMat);
    this.sawBlade.position.set(0, 1.04, 0);
    this.group.add(this.sawBlade);

    // Moyeu en laiton
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10), brassMat);
    hub.rotation.z = Math.PI / 2;
    this.sawBlade.add(hub);

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

    // Auvent léger d'atelier sur 2 poteaux arrière (ne masque jamais la vue caméra avant!)
    const postGeo = new THREE.BoxGeometry(0.14, 2.5, 0.14);
    [-1.22, 1.22].forEach((px) => {
      const p = new THREE.Mesh(postGeo, darkWoodMat);
      p.position.set(px, 1.25, -0.62);
      p.castShadow = true;
      this.group.add(p);
    });
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.12, 1.4),
      this.textures.createPBRMaterial('roofRed', { normalStrength: 1.1 })
    );
    canopy.position.set(0, 2.55, -0.2);
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
