// src/resources.js — Extraction Ragdoll des Ressources (Carrière de Pierre & Forêt d'Extraction)
// Blocs de pierre et rondins détachés avec physique dynamique (gravité, rebond, roulement, spin)

import * as THREE from 'three';
import { VILLAGE_LAYOUT } from './world.js';

export class ResourceSystem {
  constructor(scene, textures, audio) {
    this.scene = scene;
    this.textures = textures;
    this.audio = audio;

    this.nodes = [];         // Roches de carrière & arbres exploitables
    this.ragdolls = [];      // Blocs / rondins physiques libres au sol
    this.chips = [];         // Particules d'impact

    this.stoneMat = new THREE.MeshLambertMaterial({ map: textures.stone, color: '#c4c7cc' });
    this.darkStoneMat = new THREE.MeshLambertMaterial({ map: textures.stone, color: '#9ea3aa' });
    this.barkMat = new THREE.MeshLambertMaterial({ color: '#6b4222' });
    this.logEndMat = new THREE.MeshLambertMaterial({ color: '#d9b382' });
    this.canopyMat = new THREE.MeshLambertMaterial({ color: '#479c35' });

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

    const rockGeo = new THREE.DodecahedronGeometry(1.35, 1);
    offsets.forEach(([ox, oz, scale], idx) => {
      const grp = new THREE.Group();
      const mesh = new THREE.Mesh(rockGeo, idx % 2 === 0 ? this.stoneMat : this.darkStoneMat);
      mesh.scale.set(scale * 1.15, scale * 0.85, scale);
      mesh.position.y = scale * 0.65;
      mesh.rotation.set(idx * 0.5, idx * 1.1, idx * 0.3);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);

      // Petit éclat rocheux accolé pour un volume naturel
      const sub = new THREE.Mesh(rockGeo, this.darkStoneMat);
      sub.scale.setScalar(scale * 0.52);
      sub.position.set(scale * 0.75, scale * 0.35, scale * 0.3);
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
      // Deux arbres accessibles près du chemin ouest
      [14, -6, 1.0], [16, 4, 0.95],
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.26, 0.38, 3.1, 7);
    const foliageGeo = new THREE.DodecahedronGeometry(1.75, 1);

    offsets.forEach(([ox, oz, scale], idx) => {
      const grp = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, this.barkMat);
      trunk.position.y = 1.55 * scale;
      trunk.scale.setScalar(scale);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      grp.add(trunk);

      const crown1 = new THREE.Mesh(foliageGeo, this.canopyMat);
      crown1.position.set(0, 3.8 * scale, 0);
      crown1.scale.set(scale * 1.05, scale * 0.92, scale);
      crown1.castShadow = true;
      grp.add(crown1);

      const crown2 = new THREE.Mesh(foliageGeo, this.canopyMat);
      crown2.position.set(0.6 * scale, 4.6 * scale, -0.3 * scale);
      crown2.scale.setScalar(scale * 0.68);
      crown2.castShadow = true;
      grp.add(crown2);

      grp.position.set(f.x + ox, 0, f.z + oz);
      grp.rotation.y = idx * 0.9;
      this.scene.add(grp);

      this.nodes.push({
        type: 'wood',
        group: grp,
        baseScale: 1,
        hp: 3,
        maxHp: 3,
        radius: 1.25 * scale,
        shakeTimer: 0,
        respawnTimer: 0,
        active: true,
      });
    });
  }

  // Trouve la roche ou l'arbre ciblé devant le joueur
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

  // Frappe un nœud : retour sonore/visuel + détachement physique ragdoll immédiat
  hitNode(node, hitOrigin) {
    if (!node || !node.active) return false;

    node.hp -= 1;
    node.shakeTimer = 0.28;

    if (node.type === 'stone') {
      this.audio.playPickaxeStone();
    } else {
      this.audio.playChopWood();
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(18); } catch (_) {}
    }

    // Particules d'impact immédiates
    this._spawnHitChips(node.group.position, node.type);

    // Chaque coup détache 1 bloc/rondin ragdoll ; la destruction finale en projette 2 de plus !
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
      node.respawnTimer = 26; // Repousse / nouvelle veine après 26 s
    }
    return true;
  }

  _spawnRagdollPiece(type, origin, awayDir) {
    let mesh;
    let halfH;
    if (type === 'stone') {
      const geo = new THREE.DodecahedronGeometry(0.32, 0);
      mesh = new THREE.Mesh(geo, this.stoneMat);
      mesh.scale.set(1.2, 0.78, 0.95);
      halfH = 0.25;
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
