// src/resources.js — Extraction Ragdoll des Ressources (Carrière de Pierre & Forêt d'Extraction)
// Blocs de pierre et rondins détachés avec physique dynamique (gravité, rebond, roulement, spin)

import * as THREE from 'three';
import {
  VILLAGE_LAYOUT,
  buildFracturedRockGeometry,
  buildSculptedOakGeometries,
  buildSculptedPineGeometries,
} from './world.js';

export class ResourceSystem {
  constructor(scene, textures, audio) {
    this.scene = scene;
    this.textures = textures;
    this.audio = audio;

    this.nodes = [];
    this.ragdolls = [];
    this.chips = [];

    this.stoneMat = textures.createPBRMaterial('rock', {
      color: '#d4d1c8',
      normalStrength: 1.35,
      roughness: 0.86,
      vertexColors: true,
      flatShading: true,
    });
    this.darkStoneMat = textures.createPBRMaterial('rock', {
      color: '#aba8a0',
      normalStrength: 1.4,
      roughness: 0.9,
      vertexColors: true,
      flatShading: true,
    });
    this.barkMat = textures.createPBRMaterial('bark', { color: '#8a5932', normalStrength: 1.3 });
    this.logEndMat = new THREE.MeshStandardMaterial({ color: '#dfb886', roughness: 0.82 });
    this.treeBarkMat = textures.createPBRMaterial('bark', {
      normalStrength: 1.35,
      roughness: 0.92,
      vertexColors: true,
    });
    this.canopyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.0,
    });

    this.ragdollRockGeo = buildFracturedRockGeometry(17, 0.34, false);

    this._spawnQuarryNodes();
    this._spawnForestNodes();
  }

  _spawnQuarryNodes() {
    const q = VILLAGE_LAYOUT.quarry;
    const offsets = [
      [0, 0, 1.35], [-4.2, -3.5, 1.15], [4.5, -2.8, 1.4], [-5.8, 2.2, 1.1],
      [2.8, 4.6, 1.25], [-1.8, 5.8, 1.0], [7.2, 1.4, 1.5], [6.4, -6.5, 1.3],
      [-0.5, -7.2, 1.2], [-7.6, -1.8, 1.15], [1.2, -3.2, 0.95], [8.5, 5.2, 1.35],
    ];

    const rockVariants = [
      buildFracturedRockGeometry(3, 1.35, true),
      buildFracturedRockGeometry(8, 1.35, true),
      buildFracturedRockGeometry(14, 1.35, true),
    ];

    offsets.forEach(([ox, oz, scale], idx) => {
      const grp = new THREE.Group();
      const geo = rockVariants[idx % rockVariants.length];
      const mesh = new THREE.Mesh(geo, idx % 2 === 0 ? this.stoneMat : this.darkStoneMat);
      mesh.scale.set(scale * 1.18, scale * 0.86, scale);
      mesh.position.y = scale * 0.56;
      mesh.rotation.set(0, idx * 1.15, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);

      const sub = new THREE.Mesh(rockVariants[(idx + 1) % rockVariants.length], this.darkStoneMat);
      sub.scale.setScalar(scale * 0.54);
      sub.position.set(scale * 0.78, scale * 0.32, scale * 0.35);
      sub.rotation.y = idx * 2.1;
      sub.castShadow = true;
      grp.add(sub);

      grp.position.set(q.x + ox, 0, q.z + oz);
      this.scene.add(grp);

      this.nodes.push({
        type: 'stone',
        group: grp,
        baseScale: 1,
        hp: 3,
        maxHp: 3,
        radius: 1.5 * scale,
        shakeTimer: 0,
        respawnTimer: 0,
        active: true,
      });
    });
  }

  _spawnForestNodes() {
    const f = VILLAGE_LAYOUT.extraction;
    const offsets = [
      [0, 0, 1.05], [-5.2, -3.2, 1.15], [4.6, -4.4, 0.95], [-6.8, 3.8, 1.2],
      [3.5, 5.2, 1.0], [-2.2, 6.6, 1.1], [6.8, 1.2, 1.05], [-8.4, -1.2, 1.15],
      [-1.5, -7.4, 1.1], [5.8, -8.2, 0.95], [1.8, -2.8, 0.92],
      [14, -6, 1.0], [16, 4, 0.95],
    ];

    const oak = buildSculptedOakGeometries();
    const pine = buildSculptedPineGeometries();

    offsets.forEach(([ox, oz, scale], idx) => {
      const grp = new THREE.Group();
      const spec = idx % 3 === 0 ? pine : oak;

      const trunk = new THREE.Mesh(spec.trunkGeo, this.treeBarkMat);
      trunk.scale.setScalar(scale);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      grp.add(trunk);

      const canopy = new THREE.Mesh(spec.canopyGeo, this.canopyMat);
      canopy.scale.setScalar(scale);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      grp.add(canopy);

      grp.position.set(f.x + ox, 0, f.z + oz);
      grp.rotation.y = idx * 0.9;
      this.scene.add(grp);

      this.nodes.push({
        type: 'wood',
        group: grp,
        baseScale: 1,
        hp: 3,
        maxHp: 3,
        radius: 1.35 * scale,
        shakeTimer: 0,
        respawnTimer: 0,
        active: true,
      });
    });
  }

  findTargetNode(playerPos, lookDir, maxDist = 4.6) {
    let best = null;
    let bestScore = Infinity;
    for (const node of this.nodes) {
      if (!node.active) continue;
      const dx = node.group.position.x - playerPos.x;
      const dz = node.group.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxDist + node.radius) continue;
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      const dot = nx * lookDir.x + nz * lookDir.z;
      if (dot < 0.45) continue;
      const score = dist - dot * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best;
  }

  hitNode(node, hitOrigin) {
    if (!node || !node.active) return false;

    node.hp -= 1;
    node.shakeTimer = 0.28;

    if (node.type === 'stone') this.audio.playPickaxeStone();
    else this.audio.playChopWood();
    if (navigator.vibrate) {
      try { navigator.vibrate(18); } catch (_) {}
    }

    this._spawnHitChips(node.group.position, node.type);

    const ejectDir = new THREE.Vector3(
      node.group.position.x - hitOrigin.x,
      0,
      node.group.position.z - hitOrigin.z
    );
    if (ejectDir.lengthSq() < 0.01) ejectDir.set(1, 0, 0);
    ejectDir.normalize();

    const dropCount = node.hp <= 0 ? 3 : 1;
    for (let i = 0; i < dropCount; i++) {
      this._spawnRagdollPiece(node.type, node.group.position, ejectDir);
    }

    if (node.hp <= 0) {
      node.active = false;
      node.group.visible = false;
      node.respawnTimer = 26;
    }
    return true;
  }

  _spawnRagdollPiece(type, origin, awayDir) {
    let mesh;
    let halfH;
    if (type === 'stone') {
      mesh = new THREE.Mesh(this.ragdollRockGeo, this.stoneMat);
      mesh.scale.set(1.15, 0.78, 0.96);
      halfH = 0.24;
    } else {
      const geo = new THREE.CylinderGeometry(0.16, 0.17, 0.92, 7);
      geo.rotateZ(Math.PI / 2);
      mesh = new THREE.Mesh(geo, [this.barkMat, this.logEndMat, this.logEndMat]);
      halfH = 0.17;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const spreadAngle = (Math.random() - 0.5) * Math.PI * 1.4;
    const vx = (Math.cos(spreadAngle) * (-awayDir.x) - Math.sin(spreadAngle) * (-awayDir.z)) * (2.6 + Math.random() * 2.4);
    const vz = (Math.sin(spreadAngle) * (-awayDir.x) + Math.cos(spreadAngle) * (-awayDir.z)) * (2.6 + Math.random() * 2.4);

    mesh.position.set(
      origin.x + (Math.random() - 0.5) * 0.9,
      1.15 + Math.random() * 0.55,
      origin.z + (Math.random() - 0.5) * 0.9
    );
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.scene.add(mesh);

    this.ragdolls.push({
      type,
      mesh,
      halfH,
      vel: new THREE.Vector3(vx, 3.6 + Math.random() * 2.6, vz),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 11,
        (Math.random() - 0.5) * 11,
        (Math.random() - 0.5) * 11
      ),
      age: 0,
      bounces: 0,
      settled: false,
    });
  }

  _spawnHitChips(origin, type) {
    const mat = new THREE.MeshBasicMaterial({ color: type === 'stone' ? '#d4d6d9' : '#c99357' });
    const geo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(origin.x, 1.1, origin.z);
      this.scene.add(m);
      this.chips.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 5.2,
          2.2 + Math.random() * 3.0,
          (Math.random() - 0.5) * 5.2
        ),
        life: 0.48,
      });
    }
  }

  // Ramassage magnétique automatique des pièces ragdoll au sol (ou directement vers la charrette si proche)
  update(dt, playerPos, handcart, onCollect) {
    // 1. Shake & respawn des nœuds
    for (const node of this.nodes) {
      if (!node.active) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.active = true;
          node.hp = node.maxHp;
          node.group.visible = true;
          node.group.scale.setScalar(0.1);
        }
        continue;
      }
      if (node.group.scale.x < 1) {
        const s = Math.min(1, node.group.scale.x + dt * 2.4);
        node.group.scale.setScalar(s);
      }
      if (node.shakeTimer > 0) {
        node.shakeTimer = Math.max(0, node.shakeTimer - dt);
        const amp = node.shakeTimer * 0.24;
        node.group.rotation.z = Math.sin(node.shakeTimer * 48) * amp;
      } else {
        node.group.rotation.z *= 0.85;
      }
    }

    // 2. Physique ragdoll dynamique (gravité, rebonds, roulement, frottement, ramassage)
    const gravity = -18.5;
    for (let i = this.ragdolls.length - 1; i >= 0; i--) {
      const r = this.ragdolls[i];
      r.age += dt;

      if (!r.settled) {
        r.vel.y += gravity * dt;
        r.mesh.position.addScaledVector(r.vel, dt);
        r.mesh.rotation.x += r.angVel.x * dt;
        r.mesh.rotation.y += r.angVel.y * dt;
        r.mesh.rotation.z += r.angVel.z * dt;

        // Rebond réaliste sur le sol
        if (r.mesh.position.y <= r.halfH) {
          r.mesh.position.y = r.halfH;
          if (Math.abs(r.vel.y) > 1.05) {
            const restitution = r.type === 'stone' ? 0.42 : 0.36;
            this.audio.playRagdollBounce(Math.abs(r.vel.y) / 7, r.type === 'wood');
            r.vel.y = -r.vel.y * restitution;
            r.vel.x *= 0.76;
            r.vel.z *= 0.76;
            // Conversion vitesse linéaire -> roulement réaliste
            r.angVel.x = r.vel.z * 2.2;
            r.angVel.z = -r.vel.x * 2.2;
            r.angVel.y *= 0.65;
            r.bounces += 1;
          } else {
            r.vel.y = 0;
            // Roulement & frottement au sol
            const drag = Math.exp(-4.2 * dt);
            r.vel.x *= drag;
            r.vel.z *= drag;
            r.angVel.multiplyScalar(Math.exp(-5.0 * dt));
            if (r.vel.lengthSq() < 0.025 && r.angVel.lengthSq() < 0.08) {
              r.settled = true;
            }
          }
        }
      }

      // Ramassage magnétique après 0.55 s de chute (pour toujours apprécier le rebond ragdoll!)
      if (r.age > 0.55) {
        const cartPos = handcart ? handcart.group.position : null;
        const distPlayer = Math.hypot(
          r.mesh.position.x - playerPos.x,
          r.mesh.position.z - playerPos.z
        );
        const distCart = cartPos
          ? Math.hypot(r.mesh.position.x - cartPos.x, r.mesh.position.z - cartPos.z)
          : Infinity;

        const targetPos = (distCart < 3.4 && handcart.canAcceptOne()) ? cartPos : (distPlayer < 2.6 ? playerPos : null);
        if (targetPos) {
          r.settled = true;
          r.mesh.position.lerp(new THREE.Vector3(targetPos.x, 0.9, targetPos.z), Math.min(1, dt * 11));
          const rem = Math.hypot(r.mesh.position.x - targetPos.x, r.mesh.position.z - targetPos.z);
          if (rem < 0.55) {
            this.scene.remove(r.mesh);
            r.mesh.geometry.dispose();
            this.ragdolls.splice(i, 1);
            this.audio.playPickup();
            if (targetPos === cartPos && handcart.addItem(r.type, 1)) {
              onCollect(r.type, 0, true); // Ajouté visuellement dans la charrette
            } else {
              onCollect(r.type, 1, false);
            }
          }
        }
      }
    }

    // 3. Particules d'impact
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const c = this.chips[i];
      c.life -= dt;
      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        this.chips.splice(i, 1);
        continue;
      }
      c.vel.y -= 16 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += 8 * dt;
      c.mesh.scale.setScalar(c.life * 2);
    }
  }
}
