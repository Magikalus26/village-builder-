// src/interiors.js — Intérieurs 100 % marchables sans chargement, portes ouvrables,
// toitures médiévales authentiques, autel de l'église, forge fonctionnelle et mobilier.

import * as THREE from 'three';

export class InteriorSystem {
  constructor(scene, textures, audio, buildingSystem) {
    this.scene = scene;
    this.textures = textures;
    this.audio = audio;
    this.buildingSystem = buildingSystem;

    this.entries = new Map(); // buildingId -> { root, roofGroup, interiorGroup, doorPivot, doorOpen, doorAngle, doorWorldPos, anvilPos, fireLight, embers }
    this._buildAllInteriors();
  }

  _buildAllInteriors() {
    for (const b of this.buildingSystem.buildings) {
      const cfg = b.cfg;
      const root = new THREE.Group();
      root.position.set(cfg.x, 0, cfg.z);
      root.rotation.y = cfg.rotY;
      this.scene.add(root);

      const roofGroup = new THREE.Group();
      const interiorGroup = new THREE.Group();
      root.add(roofGroup);
      root.add(interiorGroup);

      // 1. Porte en chêne ouvrable sur gonds dans l'encadrement exact du mur
      const doorInfo = this._buildInteractiveDoor(cfg);
      root.add(doorInfo.frameGroup);

      // 2. Toiture spécifique selon le plan IMG_0581.JPG (visible dès que le bâtiment est achevé)
      this._buildRoof(cfg, roofGroup);

      // 3. Mobilier & aménagements intérieurs 100 % marchables
      const extras = this._buildFurniture(cfg, interiorGroup);

      // Au démarrage, on révèle progressivement : intérieur visible dès les dalles/début, toit à 100 %
      roofGroup.visible = b.completed;
      interiorGroup.visible = b.placedCount >= 24 || b.completed;
      doorInfo.frameGroup.visible = b.placedCount >= 120 || b.completed;

      this.entries.set(b.id, {
        building: b,
        root,
        roofGroup,
        interiorGroup,
        doorFrame: doorInfo.frameGroup,
        doorPivot: doorInfo.pivot,
        doorLocalPos: doorInfo.localPos,
        doorOpen: true, // Ouverte par défaut tant que non fermée pour fluidité de visite
        doorAngle: 1.55,
        anvilLocalPos: extras.anvilLocalPos || null,
        fireLight: extras.fireLight || null,
        embers: extras.embers || [],
      });
    }
  }

  _buildInteractiveDoor(cfg) {
    const hw = cfg.width * 0.5;
    const hd = cfg.depth * 0.5;
    const woodMat = this.textures.createPBRMaterial('wood', { color: '#945d30', normalStrength: 1.15 });
    const frameMat = this.textures.createPBRMaterial('wood', { color: '#5c361a', normalStrength: 1.05 });
    const ironMat = new THREE.MeshStandardMaterial({ color: '#2f343b', metalness: 0.76, roughness: 0.36 });

    const frameGroup = new THREE.Group();
    const localPos = new THREE.Vector3();
    let rotY = 0;

    if (cfg.doorSide === 'south') {
      localPos.set(0, 0, hd);
      rotY = 0;
    } else if (cfg.doorSide === 'north') {
      localPos.set(0, 0, -hd);
      rotY = Math.PI;
    } else if (cfg.doorSide === 'west') {
      localPos.set(-hw, 0, 0);
      rotY = -Math.PI / 2;
    } else {
      localPos.set(hw, 0, 0);
      rotY = Math.PI / 2;
    }

    frameGroup.position.copy(localPos);
    frameGroup.rotation.y = rotY;

    // Montants + linteau
    const postGeo = new THREE.BoxGeometry(0.16, 2.42, 0.34);
    [-0.78, 0.78].forEach((px) => {
      const p = new THREE.Mesh(postGeo, frameMat);
      p.position.set(px, 1.21, 0);
      p.castShadow = true;
      frameGroup.add(p);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.2, 0.38), frameMat);
    lintel.position.set(0, 2.42, 0);
    frameGroup.add(lintel);

    // Vantail articulé sur pivot gauche
    const pivot = new THREE.Group();
    pivot.position.set(-0.7, 0, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.32, 0.1), woodMat);
    leaf.position.set(0.7, 1.16, 0);
    leaf.castShadow = true;
    pivot.add(leaf);

    // Pentures & poignée en fer forgé
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.12), ironMat);
    strap.position.set(0.62, 1.65, 0);
    pivot.add(strap);
    const strap2 = strap.clone();
    strap2.position.y = 0.65;
    pivot.add(strap2);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 10), ironMat);
    handle.position.set(1.2, 1.08, 0.08);
    pivot.add(handle);

    frameGroup.add(pivot);
    return { frameGroup, pivot, localPos };
  }

  _buildRoof(cfg, roofGroup) {
    const w = cfg.width;
    const d = cfg.depth;
    const h = cfg.wallHeight;
    const woodMat = this.textures.createPBRMaterial('wood', { color: '#7a4c26', normalStrength: 1.0 });

    const roofKind =
      cfg.style === 'chaumiere'
        ? 'thatch'
        : cfg.style === 'forge' || cfg.style === 'marchand'
          ? 'roofRed'
          : 'roofSlate';
    const roofMat = this.textures.createPBRMaterial(roofKind, {
      normalStrength: 1.25,
      side: THREE.DoubleSide,
    });
    const slateMat = this.textures.createPBRMaterial('roofSlate', { normalStrength: 1.15 });

    // Toit à deux pans ouvert par-dessous (charpente visible depuis l'intérieur marchable !)
    const ridgeH = cfg.style === 'church' ? 2.8 : cfg.style === 'mairie' ? 2.6 : 2.1;
    const overhang = 0.55;
    const halfSpan = d * 0.5 + overhang;
    const slopeLen = Math.hypot(halfSpan, ridgeH);
    const slopeAngle = Math.atan2(ridgeH, halfSpan);

    const panelGeo = new THREE.BoxGeometry(w + overhang * 1.4, 0.16, slopeLen);
    [-1, 1].forEach((side) => {
      const panel = new THREE.Mesh(panelGeo, roofMat);
      panel.position.set(0, h + ridgeH * 0.5, side * (halfSpan * 0.5));
      panel.rotation.x = side * slopeAngle;
      panel.castShadow = true;
      panel.receiveShadow = true;
      roofGroup.add(panel);
    });

    // Poutres de charpente intérieures apparentes
    const beamCount = Math.max(3, Math.floor(w / 2.4));
    for (let i = 0; i < beamCount; i++) {
      const bx = -w * 0.42 + (i / (beamCount - 1)) * w * 0.84;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, d - 0.3), woodMat);
      tie.position.set(bx, h - 0.12, 0);
      roofGroup.add(tie);
    }

    // Flèche + cloche dorée sur la Petite Église
    if (cfg.style === 'church') {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.65, 5.2, 4), slateMat);
      spire.position.set(-w * 0.5 + 1.75, 12.2, 0);
      spire.rotation.y = Math.PI / 4;
      spire.castShadow = true;
      roofGroup.add(spire);

      // Croix au sommet de la flèche
      const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd447', metalness: 0.75, roughness: 0.25 });
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), goldMat);
      crossV.position.set(-w * 0.5 + 1.75, 15.1, 0);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.65), goldMat);
      crossH.position.set(-w * 0.5 + 1.75, 15.32, 0);
      roofGroup.add(crossV, crossH);

      // Cloche dorée visible dans le beffroi
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 10), goldMat);
      bell.position.set(-w * 0.5 + 1.75, 8.6, 0);
      roofGroup.add(bell);

      // Calotte conique sur l'abside Est
      const apseRoof = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 2.2, 12, 1, false, 0, Math.PI),
        slateMat
      );
      apseRoof.position.set(w * 0.5, h + 1.0, 0);
      roofGroup.add(apseRoof);
    }

    // Campanile sur la Mairie
    if (cfg.style === 'mairie') {
      const cupolaRoof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.9, 4), slateMat);
      cupolaRoof.position.set(0, h + 4.0, 0);
      cupolaRoof.rotation.y = Math.PI / 4;
      cupolaRoof.castShadow = true;
      roofGroup.add(cupolaRoof);
    }
  }

  _buildFurniture(cfg, g) {
    const woodMat = this.textures.createPBRMaterial('wood', { normalStrength: 1.05 });
    const darkWood = this.textures.createPBRMaterial('wood', { color: '#5c361a', normalStrength: 1.0 });
    const stoneMat = this.textures.createPBRMaterial('stone', { normalStrength: 1.15 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd34e', metalness: 0.72, roughness: 0.25 });
    const clothWhite = new THREE.MeshLambertMaterial({ color: '#f7f1e1' });
    const clothRed = new THREE.MeshLambertMaterial({ color: '#a82c2c' });
    const ironMat = new THREE.MeshStandardMaterial({ color: '#3b4048', metalness: 0.75, roughness: 0.35 });

    const extras = { embers: [] };

    if (cfg.style === 'church') {
      // --- INTÉRIEUR PETITE ÉGLISE : Autel, croix, cierges, bancs en chêne, bénitier ---
      const dais = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 4.6), stoneMat);
      dais.position.set(cfg.width * 0.34, 0.18, 0);
      dais.receiveShadow = true;
      g.add(dais);

      const altar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 2.2), stoneMat);
      altar.position.set(cfg.width * 0.38, 0.82, 0);
      altar.castShadow = true;
      g.add(altar);

      const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.14, 2.28), clothWhite);
      cloth.position.set(cfg.width * 0.38, 1.32, 0);
      g.add(cloth);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), goldMat);
      crossV.position.set(cfg.width * 0.4, 1.82, 0);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.52), goldMat);
      crossH.position.set(cfg.width * 0.4, 2.02, 0);
      g.add(crossV, crossH);

      // Deux cierges allumés sur l'autel
      [-0.78, 0.78].forEach((cz) => {
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 8), clothWhite);
        candle.position.set(cfg.width * 0.38, 1.56, cz);
        g.add(candle);
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.05, 0.14, 6),
          new THREE.MeshBasicMaterial({ color: '#ffcf4d' })
        );
        flame.position.set(cfg.width * 0.38, 1.8, cz);
        g.add(flame);
      });

      const altarLight = new THREE.PointLight('#ffd88a', 1.5, 14);
      altarLight.position.set(cfg.width * 0.3, 2.5, 0);
      g.add(altarLight);
      extras.fireLight = altarLight;

      // 6 bancs en bois alignés de part et d'autre de l'allée centrale marchable
      for (let row = 0; row < 3; row++) {
        const px = -2.2 + row * 1.9;
        [-1.95, 1.95].forEach((pz) => {
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 2.1), woodMat);
          seat.position.set(px, 0.32, pz);
          seat.castShadow = true;
          g.add(seat);
          const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 2.1), darkWood);
          back.position.set(px - 0.24, 0.78, pz);
          g.add(back);
        });
      }
    } else if (cfg.style === 'mairie') {
      // --- INTÉRIEUR MAIRIE : Salle du conseil, table des cartes, bannières ---
      const table = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 1.8), woodMat);
      table.position.set(0, 0.92, -0.5);
      table.castShadow = true;
      g.add(table);
      [[-1.9, -1.2], [1.9, -1.2], [-1.9, 0.2], [1.9, 0.2]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), darkWood);
        leg.position.set(lx, 0.45, lz);
        g.add(leg);
      });
      // Plan du village déroulé sur la table du conseil
      const scroll = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), clothWhite);
      scroll.rotation.x = -Math.PI / 2;
      scroll.position.set(0, 1.01, -0.5);
      g.add(scroll);

      // Siège du Maire
      const throne = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.55, 0.72), darkWood);
      throne.position.set(0, 0.82, -2.1);
      g.add(throne);

      // Bannières médiévales rouges & or
      [-3.4, 3.4].forEach((bx) => {
        const banner = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.2, 0.05), clothRed);
        banner.position.set(bx, 2.7, -cfg.depth * 0.5 + 0.32);
        g.add(banner);
      });

      const hallLight = new THREE.PointLight('#ffdf9e', 1.4, 15);
      hallLight.position.set(0, 3.3, 0);
      g.add(hallLight);
      extras.fireLight = hallLight;
    } else if (cfg.style === 'forge') {
      // --- INTÉRIEUR FORGE FONCTIONNELLE : Foyer ardent, enclume interactive, tonneau ---
      const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 2.1), stoneMat);
      hearth.position.set(cfg.width * 0.5 - 1.1, 0.62, 0);
      hearth.castShadow = true;
      g.add(hearth);

      // Braises incandescentes
      const coals = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.26, 1.15),
        new THREE.MeshBasicMaterial({ color: '#ff6a1a' })
      );
      coals.position.set(cfg.width * 0.5 - 1.05, 1.24, 0);
      g.add(coals);

      // Particules d'étincelles montantes
      const emberGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const emberMat = new THREE.MeshBasicMaterial({ color: '#ffbe33' });
      for (let i = 0; i < 8; i++) {
        const em = new THREE.Mesh(emberGeo, emberMat);
        em.position.set(
          cfg.width * 0.5 - 1.05 + (Math.random() - 0.5) * 0.6,
          1.35 + Math.random() * 1.4,
          (Math.random() - 0.5) * 0.7
        );
        g.add(em);
        extras.embers.push({ mesh: em, baseY: 1.35, speed: 0.7 + Math.random() * 0.8 });
      }

      const fireLight = new THREE.PointLight('#ff8433', 2.2, 12);
      fireLight.position.set(cfg.width * 0.5 - 1.4, 2.0, 0);
      g.add(fireLight);
      extras.fireLight = fireLight;

      // Enclume en fer sur billot de chêne (interactive au toucher !)
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.68, 8), darkWood);
      stump.position.set(0.3, 0.38, 0.3);
      g.add(stump);
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 0.42), ironMat);
      anvil.position.set(0.3, 0.88, 0.3);
      anvil.castShadow = true;
      g.add(anvil);
      extras.anvilLocalPos = new THREE.Vector3(0.3, 0.9, 0.3);

      // Tonneau de trempe rempli d'eau
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.82, 10), woodMat);
      barrel.position.set(-1.3, 0.45, -1.2);
      g.add(barrel);
    } else {
      // --- INTÉRIEUR MAISONS VILLAGEOISES : Lit, table, foyer chaleureux, tonneaux ---
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 1.15), woodMat);
      bedFrame.position.set(-cfg.width * 0.28, 0.28, -cfg.depth * 0.22);
      g.add(bedFrame);
      const blanket = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.14, 1.08),
        cfg.style === 'chaumiere' ? clothRed : new THREE.MeshLambertMaterial({ color: '#3b6ea5' })
      );
      blanket.position.set(-cfg.width * 0.24, 0.52, -cfg.depth * 0.22);
      g.add(blanket);

      const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.95), woodMat);
      table.position.set(cfg.width * 0.22, 0.82, 0.25);
      g.add(table);
      const tBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.5), darkWood);
      tBase.position.set(cfg.width * 0.22, 0.42, 0.25);
      g.add(tBase);

      // Foyer domestique chaleureux
      const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.72), stoneMat);
      hearth.position.set(cfg.width * 0.25, 0.55, -cfg.depth * 0.5 + 0.58);
      g.add(hearth);
      const fire = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.36, 6),
        new THREE.MeshBasicMaterial({ color: '#ff8a2b' })
      );
      fire.position.set(cfg.width * 0.25, 0.45, -cfg.depth * 0.5 + 0.88);
      g.add(fire);

      const lamp = new THREE.PointLight('#ffcf86', 1.25, 10);
      lamp.position.set(0, 2.2, 0);
      g.add(lamp);
      extras.fireLight = lamp;
    }

    return extras;
  }

  // Synchronise la visibilité du toit, des portes et du mobilier selon l'avancement des briques
  syncWithBuilding(building) {
    const entry = this.entries.get(building.id);
    if (!entry) return;
    entry.interiorGroup.visible = building.placedCount >= 24 || building.completed;
    entry.doorFrame.visible = building.placedCount >= 120 || building.completed;
    entry.roofGroup.visible = building.completed;
  }

  syncAll() {
    for (const b of this.buildingSystem.buildings) {
      this.syncWithBuilding(b);
    }
  }

  isDoorOpen(buildingId) {
    const e = this.entries.get(buildingId);
    return e ? e.doorOpen : true;
  }

  findNearbyInteractive(playerPos) {
    let bestDoor = null;
    let bestDoorDist = 2.8;
    let bestAnvil = null;

    for (const [id, entry] of this.entries) {
      if (entry.doorFrame.visible) {
        const worldDoor = entry.doorLocalPos.clone().applyMatrix4(entry.root.matrixWorld);
        const d = Math.hypot(playerPos.x - worldDoor.x, playerPos.z - worldDoor.z);
        if (d < bestDoorDist) {
          bestDoorDist = d;
          bestDoor = { type: 'door', buildingId: id, entry, dist: d };
        }
      }
      if (entry.anvilLocalPos && entry.interiorGroup.visible) {
        const worldAnvil = entry.anvilLocalPos.clone().applyMatrix4(entry.root.matrixWorld);
        const da = Math.hypot(playerPos.x - worldAnvil.x, playerPos.z - worldAnvil.z);
        if (da < 2.4) {
          bestAnvil = { type: 'anvil', buildingId: id, entry, dist: da };
        }
      }
    }
    return bestAnvil || bestDoor;
  }

  interact(target) {
    if (!target) return false;
    if (target.type === 'door') {
      target.entry.doorOpen = !target.entry.doorOpen;
      this.audio.playDoorCreak();
      return true;
    }
    if (target.type === 'anvil') {
      this.audio.playAnvilClang();
      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch (_) {}
      }
      return true;
    }
    return false;
  }

  update(dt, elapsed) {
    for (const entry of this.entries.values()) {
      // Pivot fluide de la porte sur ses gonds
      const targetAngle = entry.doorOpen ? 1.55 : 0;
      entry.doorAngle = THREE.MathUtils.lerp(entry.doorAngle, targetAngle, Math.min(1, dt * 8));
      entry.doorPivot.rotation.y = entry.doorAngle;

      // Scintillement chaleureux du foyer / autel / forge
      if (entry.fireLight && entry.interiorGroup.visible) {
        entry.fireLight.intensity = 1.45 + Math.sin(elapsed * 9.5 + entry.root.position.x) * 0.25;
      }

      // Étincelles montantes de la forge
      for (const em of entry.embers) {
        em.mesh.position.y += dt * em.speed;
        if (em.mesh.position.y > em.baseY + 1.5) {
          em.mesh.position.y = em.baseY;
        }
      }
    }
  }
}
