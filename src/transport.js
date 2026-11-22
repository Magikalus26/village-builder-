// src/transport.js — Charrette à bras (Handcart) physique avec empilement visuel des matériaux
// Saisie par le joueur, cinématique remorque réaliste, rotation des roues, chargement/déchargement

import * as THREE from 'three';
import { VILLAGE_LAYOUT, isInsideRiver } from './world.js';

const MAX_VISUAL_SLOTS = 48; // 4 colonnes × 4 rangées × 3 couches visibles dans la caisse

export class Handcart {
  constructor(scene, textures, audio) {
    this.scene = scene;
    this.textures = textures;
    this.audio = audio;

    this.attached = false;
    this.group = new THREE.Group();
    this.group.position.set(VILLAGE_LAYOUT.handcartStart.x, 0, VILLAGE_LAYOUT.handcartStart.z);
    this.group.rotation.y = VILLAGE_LAYOUT.handcartStart.rotY;

    this.wheelLeft = null;
    this.wheelRight = null;
    this.cargoGroup = new THREE.Group();

    // Inventaire physique embarqué dans la charrette
    this.cargo = {
      bricks: 24,
      slabs: 12,
      beams: 8,
      stone: 4,
      wood: 0,
    };

    this._buildCartMesh();
    this.rebuildCargoVisuals();
  }

  _buildCartMesh() {
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.2 });
    const darkWood = this.textures.createPBRMaterial('wood', { color: '#643c1b', normalStrength: 1.1 });
    const ironMat = new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.84, roughness: 0.34 });

    // 1. Châssis inférieur (2 longerons + 3 traverses)
    [-0.48, 0.48].forEach((lx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 1.72), darkWood);
      rail.position.set(lx, 0.5, 0);
      rail.castShadow = true;
      this.group.add(rail);
    });
    [-0.68, 0, 0.68].forEach((cz) => {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 0.09), darkWood);
      cross.position.set(0, 0.5, cz);
      this.group.add(cross);
    });

    // 2. Plancher à lattes de bois assemblées (6 planches disjointes avec jeu réaliste)
    for (let i = 0; i < 6; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.045, 1.62), woodMat);
      plank.position.set(-0.48 + i * 0.192, 0.57, 0);
      plank.castShadow = true;
      plank.receiveShadow = true;
      this.group.add(plank);
    }

    // 3. Ridelles latérales à lattes espacées + montants d'angle + écharpes obliques
    [-0.57, 0.57].forEach((sx) => {
      // 3 lattes horizontales par côté
      [0.69, 0.84, 0.99].forEach((sy) => {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 1.64), woodMat);
        slat.position.set(sx, sy, 0);
        slat.castShadow = true;
        this.group.add(slat);
      });
      // 3 montants verticaux par côté
      [-0.76, 0, 0.76].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.08), darkWood);
        post.position.set(sx, 0.8, pz);
        post.castShadow = true;
        this.group.add(post);
      });
    });

    // Parois avant et arrière à lattes + renforts d'angle en fer forgé
    [-0.79, 0.79].forEach((ez) => {
      [0.69, 0.84, 0.99].forEach((sy) => {
        const endSlat = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.11, 0.055), darkWood);
        endSlat.position.set(0, sy, ez);
        endSlat.castShadow = true;
        this.group.add(endSlat);
      });
      // Équerres métalliques sombres aux 4 angles (haut et bas)
      [-0.58, 0.58].forEach((cx) => {
        [0.64, 1.0].forEach((cy) => {
          const brkX = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.075), ironMat);
          brkX.position.set(cx > 0 ? cx - 0.05 : cx + 0.05, cy, ez);
          const brkZ = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.055, 0.14), ironMat);
          brkZ.position.set(cx, cy, ez > 0 ? ez - 0.05 : ez + 0.05);
          this.group.add(brkX, brkZ);
        });
      });
    });

    // Béquilles de soutien avant en bois
    [-0.45, 0.45].forEach((kx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.44, 0.065), darkWood);
      leg.position.set(kx, 0.26, 0.65);
      leg.rotation.x = 0.12;
      leg.castShadow = true;
      this.group.add(leg);
    });

    // 4. Brancards courbés organiques en TubeGeometry + viroles en fer
    [-0.45, 0.45].forEach((hx) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(hx, 0.52, 0.65),
        new THREE.Vector3(hx * 0.96, 0.58, 1.15),
        new THREE.Vector3(hx * 0.9, 0.72, 1.62),
        new THREE.Vector3(hx * 0.88, 0.77, 1.98),
      ]);
      const shaft = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.042, 7, false), darkWood);
      shaft.castShadow = true;
      this.group.add(shaft);

      // Virole métallique au bout de la poignée
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.09, 8), ironMat);
      ferrule.rotation.x = Math.PI / 2;
      ferrule.position.set(hx * 0.88, 0.77, 1.94);
      this.group.add(ferrule);
    });
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.86, 8), darkWood);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 0.73, 1.72);
    this.group.add(crossbar);

    // Essieu métallique renforcé + paliers sous longerons
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.64, 10), ironMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.44, -0.06);
    this.group.add(axle);

    // 5. Vraies roues artisanales à 8 rayons + moyeu tourné + cerclage en fer sombre + rivets
    const buildWheel = () => {
      const w = new THREE.Group();
      // Jante en bois épais
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.046, 8, 20), darkWood);
      rim.rotation.y = Math.PI / 2;
      rim.castShadow = true;
      w.add(rim);

      // Cerclage extérieur en fer sombre forgé
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.452, 0.018, 6, 20), ironMat);
      tire.rotation.y = Math.PI / 2;
      w.add(tire);

      // Moyeu central en chêne + chapeau de moyeu en fer
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.16, 10), woodMat);
      hub.rotation.z = Math.PI / 2;
      w.add(hub);
      const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.19, 8), ironMat);
      hubCap.rotation.z = Math.PI / 2;
      w.add(hubCap);

      // 8 rayons radiaux distincts + clous/rivets sur la jante
      const spokeGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.36, 6);
      spokeGeo.translate(0, 0.21, 0);
      const rivetGeo = new THREE.BoxGeometry(0.03, 0.025, 0.025);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const sp = new THREE.Mesh(spokeGeo, woodMat);
        sp.rotation.x = ang;
        sp.castShadow = true;
        w.add(sp);

        const riv = new THREE.Mesh(rivetGeo, ironMat);
        riv.position.set(0, Math.cos(ang) * 0.46, Math.sin(ang) * 0.46);
        w.add(riv);
      }
      return w;
    };

    this.wheelLeft = buildWheel();
    this.wheelLeft.position.set(-0.74, 0.44, -0.06);
    this.wheelRight = buildWheel();
    this.wheelRight.position.set(0.74, 0.44, -0.06);
    this.group.add(this.wheelLeft, this.wheelRight);

    // Groupe contenant les matériaux réellement empilés dans la caisse
    this.cargoGroup.position.set(0, 0.62, 0);
    this.group.add(this.cargoGroup);

    this.scene.add(this.group);
  }

  getTotalCount() {
    return (
      (this.cargo.bricks || 0) +
      (this.cargo.slabs || 0) +
      (this.cargo.beams || 0) +
      (this.cargo.stone || 0) +
      (this.cargo.wood || 0)
    );
  }

  getMaxCapacity() {
    return 240 + (this.bonusCapacity || 0);
  }

  canAcceptOne() {
    return this.getTotalCount() < this.getMaxCapacity();
  }

  addItem(type, amount = 1) {
    if (!Object.prototype.hasOwnProperty.call(this.cargo, type)) return false;
    const room = this.getMaxCapacity() - this.getTotalCount();
    if (room <= 0) return false;
    const added = Math.min(room, amount);
    this.cargo[type] += added;
    this.rebuildCargoVisuals();
    return added > 0;
  }

  removeItem(type, amount = 1) {
    if ((this.cargo[type] || 0) < amount) return false;
    this.cargo[type] -= amount;
    this.rebuildCargoVisuals();
    return true;
  }

  // Empilement visuel réel dans la caisse de la charrette (chaque type a sa forme & couleur)
  rebuildCargoVisuals() {
    while (this.cargoGroup.children.length > 0) {
      const ch = this.cargoGroup.children.pop();
      if (ch.geometry) ch.geometry.dispose();
    }

    const visualList = [];
    const pushUnits = (type, count, ratio) => {
      const visCount = Math.min(MAX_VISUAL_SLOTS - visualList.length, Math.ceil(count / ratio));
      for (let i = 0; i < visCount; i++) visualList.push(type);
    };

    // Ratio adaptatif : 1 bloc visuel pour 1..5 unités selon le remplissage, toujours visible dès 1 unité
    const total = this.getTotalCount();
    const ratio = total > MAX_VISUAL_SLOTS ? Math.ceil(total / MAX_VISUAL_SLOTS) : 1;
    pushUnits('slabs', this.cargo.slabs, ratio);
    pushUnits('bricks', this.cargo.bricks, ratio);
    pushUnits('beams', this.cargo.beams, ratio);
    pushUnits('stone', this.cargo.stone, ratio);
    pushUnits('wood', this.cargo.wood, ratio);

    const mats = {
      bricks: this.textures.createPBRMaterial('brick', { color: '#cf734e', normalStrength: 1.1 }),
      slabs: this.textures.createPBRMaterial('slab', { color: '#dfe3e8', normalStrength: 1.0 }),
      beams: this.textures.createPBRMaterial('wood', { color: '#9c6434', normalStrength: 1.1 }),
      stone: this.textures.createPBRMaterial('stone', { color: '#a8aeb6', normalStrength: 1.2 }),
      wood: this.textures.createPBRMaterial('wood', { color: '#754823', normalStrength: 1.1 }),
    };

    const cols = 4;
    const rows = 4;
    visualList.forEach((type, idx) => {
      const layer = Math.floor(idx / (cols * rows));
      const rem = idx % (cols * rows);
      const col = rem % cols;
      const row = Math.floor(rem / cols);

      let geo;
      if (type === 'slabs') {
        geo = new THREE.BoxGeometry(0.24, 0.08, 0.32);
      } else if (type === 'beams' || type === 'wood') {
        geo = new THREE.CylinderGeometry(0.08, 0.08, 0.34, 6);
        geo.rotateX(Math.PI / 2);
      } else if (type === 'stone') {
        geo = new THREE.DodecahedronGeometry(0.11, 0);
      } else {
        geo = new THREE.BoxGeometry(0.22, 0.13, 0.32);
      }

      const mesh = new THREE.Mesh(geo, mats[type]);
      mesh.position.set(
        -0.36 + col * 0.24,
        0.07 + layer * 0.15,
        -0.54 + row * 0.35
      );
      mesh.castShadow = true;
      this.cargoGroup.add(mesh);
    });
  }

  isPlayerNear(playerPos, maxDist = 3.8) {
    return Math.hypot(
      playerPos.x - this.group.position.x,
      playerPos.z - this.group.position.z
    ) <= maxDist;
  }

  toggleAttach(playerPos) {
    if (!this.attached && !this.isPlayerNear(playerPos, 4.2)) return false;
    this.attached = !this.attached;
    this.audio.playPickup();
    return true;
  }

  // Charge depuis le stock du village ou transfère l'inventaire joueur <-> charrette
  loadFromZoneOrInventory(playerPos, inventory) {
    const nearBrickStock = Math.hypot(
      playerPos.x - VILLAGE_LAYOUT.brickStock.x,
      playerPos.z - VILLAGE_LAYOUT.brickStock.z
    ) < VILLAGE_LAYOUT.brickStock.radius + 3.5;

    const nearResStock = Math.hypot(
      playerPos.x - VILLAGE_LAYOUT.resourceStock.x,
      playerPos.z - VILLAGE_LAYOUT.resourceStock.z
    ) < VILLAGE_LAYOUT.resourceStock.radius + 3.5;

    let loaded = 0;

    if (nearBrickStock) {
      // Le stock de briques près de la carrière fournit des briques & dalles fraîches à transporter
      if (this.addItem('bricks', 24)) loaded += 24;
      if (this.addItem('slabs', 8)) loaded += 8;
    } else if (nearResStock) {
      // Le stockage de ressources fournit des rondins & poutres
      if (this.addItem('wood', 6)) loaded += 6;
      if (this.addItem('beams', 12)) loaded += 12;
    } else {
      // Sinon transfère les matériaux portés par le joueur dans la charrette
      for (const k of ['bricks', 'slabs', 'beams', 'stone', 'wood']) {
        const amt = inventory[k] || 0;
        if (amt > 0 && this.canAcceptOne()) {
          const room = this.getMaxCapacity() - this.getTotalCount();
          const take = Math.min(amt, room);
          inventory[k] -= take;
          this.cargo[k] += take;
          loaded += take;
        }
      }
      if (loaded > 0) this.rebuildCargoVisuals();
    }

    if (loaded > 0) {
      this.audio.playPickup();
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (_) {}
      }
    }
    return loaded;
  }

  update(dt, playerPos, playerYaw) {
    if (!this.attached) {
      // Légère inclinaison au repos sur béquille
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0.08, dt * 6);
      return;
    }

    // Poignées relevées à hauteur de main
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, dt * 8);

    // Cinématique de remorque douce : la charrette suit le joueur à 2.25m derrière/devant sans à-coup
    const prevX = this.group.position.x;
    const prevZ = this.group.position.z;

    const dx = playerPos.x - prevX;
    const dz = playerPos.z - prevZ;
    const dist = Math.hypot(dx, dz);
    const followDist = 2.2;

    if (dist > 0.05) {
      const targetAngle = Math.atan2(dx, dz);
      // Interpolation angulaire douce (plus court chemin)
      let diff = targetAngle - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 8.5);
    }

    if (dist > followDist) {
      const nx = playerPos.x - (dx / dist) * followDist;
      const nz = playerPos.z - (dz / dist) * followDist;
      if (!isInsideRiver(nx, nz, 0.4)) {
        this.group.position.x = nx;
        this.group.position.z = nz;
      }
    }

    const moved = Math.hypot(this.group.position.x - prevX, this.group.position.z - prevZ);
    if (moved > 0.004) {
      const wheelRot = moved / 0.44;
      this.wheelLeft.rotation.x += wheelRot;
      this.wheelRight.rotation.x += wheelRot;
      this.audio.playCartRoll();
    }
  }

  serialize() {
    return {
      x: this.group.position.x,
      z: this.group.position.z,
      rotY: this.group.rotation.y,
      cargo: { ...this.cargo },
    };
  }

  deserialize(data) {
    if (!data) return;
    if (typeof data.x === 'number' && typeof data.z === 'number') {
      this.group.position.set(data.x, 0, data.z);
    }
    if (typeof data.rotY === 'number') {
      this.group.rotation.y = data.rotY;
    }
    if (data.cargo) {
      for (const k of Object.keys(this.cargo)) {
        if (typeof data.cargo[k] === 'number') {
          this.cargo[k] = Math.max(0, Math.floor(data.cargo[k]));
        }
      }
      this.rebuildCargoVisuals();
    }
  }
}
