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
    const woodMat = new THREE.MeshLambertMaterial({ map: this.textures.wood });
    const darkWood = new THREE.MeshLambertMaterial({ color: '#593619' });
    const ironMat = new THREE.MeshStandardMaterial({ color: '#40454d', metalness: 0.65, roughness: 0.45 });

    // Fond de caisse
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.1, 1.62), woodMat);
    bed.position.y = 0.56;
    bed.castShadow = true;
    bed.receiveShadow = true;
    this.group.add(bed);

    // Parois latérales à claire-voie
    const sideGeo = new THREE.BoxGeometry(0.08, 0.48, 1.62);
    [-0.56, 0.56].forEach((sx) => {
      const side = new THREE.Mesh(sideGeo, woodMat);
      side.position.set(sx, 0.84, 0);
      side.castShadow = true;
      this.group.add(side);
    });

    const endGeo = new THREE.BoxGeometry(1.18, 0.48, 0.08);
    [-0.78, 0.78].forEach((ez) => {
      const end = new THREE.Mesh(endGeo, darkWood);
      end.position.set(0, 0.84, ez);
      end.castShadow = true;
      this.group.add(end);
    });

    // Brancards (poignées avant vers +Z pour tirer/pousser)
    const shaftGeo = new THREE.BoxGeometry(0.08, 0.08, 1.25);
    [-0.44, 0.44].forEach((hx) => {
      const shaft = new THREE.Mesh(shaftGeo, darkWood);
      shaft.position.set(hx, 0.66, 1.32);
      shaft.rotation.x = -0.14;
      shaft.castShadow = true;
      this.group.add(shaft);
    });
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.07, 0.07), darkWood);
    crossbar.position.set(0, 0.75, 1.88);
    this.group.add(crossbar);

    // Essieu métallique
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.56, 8), ironMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.44, -0.08);
    this.group.add(axle);

    // Deux grandes roues à rayons médiévales
    const buildWheel = () => {
      const w = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 16), darkWood);
      rim.rotation.y = Math.PI / 2;
      rim.castShadow = true;
      w.add(rim);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.018, 6, 16), ironMat);
      tire.rotation.y = Math.PI / 2;
      w.add(tire);
      const spokeGeo = new THREE.BoxGeometry(0.035, 0.8, 0.045);
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Mesh(spokeGeo, woodMat);
        sp.rotation.x = (i * Math.PI) / 4;
        w.add(sp);
      }
      return w;
    };

    this.wheelLeft = buildWheel();
    this.wheelLeft.position.set(-0.72, 0.44, -0.08);
    this.wheelRight = buildWheel();
    this.wheelRight.position.set(0.72, 0.44, -0.08);
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
    return 240;
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
      bricks: new THREE.MeshLambertMaterial({ map: this.textures.brick, color: '#cf734e' }),
      slabs: new THREE.MeshLambertMaterial({ map: this.textures.slab, color: '#dfe3e8' }),
      beams: new THREE.MeshLambertMaterial({ map: this.textures.wood, color: '#8f5a2c' }),
      stone: new THREE.MeshLambertMaterial({ map: this.textures.stone, color: '#9ea4ad' }),
      wood: new THREE.MeshLambertMaterial({ color: '#6b4222' }),
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
