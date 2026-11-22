// src/main.js — Point d'entrée principal de VILLAGE BUILDER: MEDIEVAL PARISH
// Orchestre Three.js (pixelRatio <= 2 pour Safari iPhone 16e), tous les modules gameplay et la sauvegarde localStorage.

import * as THREE from 'three';
import { SoundEngine } from './audio.js';
import { PlayerControls } from './controls.js';
import { VILLAGE_LAYOUT, VillageWorld, createProceduralTextures, isInsideRiver } from './world.js';
import { ResourceSystem } from './resources.js';
import { WorkbenchStation } from './workbench.js';
import { Handcart } from './transport.js';
import { BuildingSystem } from './building.js';
import { InteriorSystem } from './interiors.js';
import { ArchitectCodex } from './questbook.js';

const SAVE_KEY = 'vb_medieval_parish_save_v1';

class VillageBuilderGame {
  constructor() {
    this.running = false;
    this.inGameplay = false;
    this.saveDebounceTimer = null;

    // Inventaire porté par le joueur (dotation initiale prête à bâtir + illimité via carrière/forêt/scie)
    this.inventory = {
      bricks: 36,
      slabs: 18,
      beams: 12,
      stone: 8,
      wood: 6,
    };

    // Physique joueur en vue subjective
    this.playerPos = new THREE.Vector3(VILLAGE_LAYOUT.spawn.x, 0, VILLAGE_LAYOUT.spawn.z);
    this.playerVelY = 0;
    this.isGrounded = true;
    this.eyeHeight = 1.68;
    this.handSwing = 0;

    // Contexte interactif courant (calculé à chaque frame pour le bouton principal diégétique)
    this.currentContext = { type: 'none', target: null };

    this._initRendererAndScene();
    this._initModules();
    this._initHeldToolViewmodel();
    this._bindMenuAndModals();
    this._checkExistingSave();

    this.clock = new THREE.Clock();
    this._animate();
  }

  _initRendererAndScene() {
    const container = document.getElementById('game-container');
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      66,
      window.innerWidth / window.innerHeight,
      0.1,
      320
    );
    this.camera.rotation.order = 'YXZ';

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    // Plafonnement strict du pixelRatio à 2 pour 60 FPS fluides sur iPhone 16e Safari
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _initModules() {
    this.audio = new SoundEngine();
    this.textures = createProceduralTextures();
    this.world = new VillageWorld(this.scene, this.textures);
    this.resources = new ResourceSystem(this.scene, this.textures, this.audio);
    this.workbench = new WorkbenchStation(this.scene, this.textures, this.audio);
    this.handcart = new Handcart(this.scene, this.textures, this.audio);

    this.building = new BuildingSystem(
      this.scene,
      this.textures,
      this.audio,
      (b) => {
        this.interiors.syncWithBuilding(b);
        this._refreshHUD();
        this._scheduleSave();
      },
      (b) => {
        this.interiors.syncWithBuilding(b);
        this.codex.notifyDot?.classList.remove('hidden');
        this.codex._syncTrackedBeacon();
        this._refreshHUD();
        this._saveNow();
      }
    );

    this.interiors = new InteriorSystem(this.scene, this.textures, this.audio, this.building);

    this.controls = new PlayerControls({
      onUserGesture: () => this.audio.unlock(),
      onPrimaryAction: () => this._handlePrimaryAction(),
      onJump: () => {
        if (this.isGrounded) {
          this.playerVelY = 6.4;
          this.isGrounded = false;
        }
      },
      onCartToggle: () => {
        if (this.handcart.toggleAttach(this.playerPos)) {
          this.codex.markMilestone('carted');
          this._refreshHUD();
          this._scheduleSave();
        }
      },
      onCartLoad: () => {
        const loaded = this.handcart.loadFromZoneOrInventory(this.playerPos, this.inventory);
        if (loaded > 0) {
          this.codex.markMilestone('carted');
          this._refreshHUD();
          this._scheduleSave();
        }
      },
      onToggleCodex: () => {
        if (!this.workbench.active) this.codex.toggle();
      },
    });
    this.controls.yaw = VILLAGE_LAYOUT.spawn.yaw;

    this.codex = new ArchitectCodex(this.building, this.world, this.audio, {
      onOpenStateChange: (open) => {
        this.controls.setEnabled(this.inGameplay && !open && !this.workbench.active);
      },
      getInventory: () => this.inventory,
      getCartCargo: () => this.handcart.cargo,
      onTeleportToBuilding: (id) => {
        const b = this.building.getBuildingById(id);
        if (!b) return;
        // Place le joueur juste devant la porte du bâtiment choisi
        const offset = new THREE.Vector3(0, 0, b.cfg.depth * 0.5 + 3.2);
        if (b.cfg.doorSide === 'north') offset.set(0, 0, -(b.cfg.depth * 0.5 + 3.2));
        if (b.cfg.doorSide === 'west') offset.set(-(b.cfg.width * 0.5 + 3.2), 0, 0);
        if (b.cfg.doorSide === 'east') offset.set(b.cfg.width * 0.5 + 3.2, 0, 0);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), b.cfg.rotY);
        this.playerPos.set(b.cfg.x + offset.x, 0, b.cfg.z + offset.z);
        this.controls.yaw = Math.atan2(this.playerPos.x - b.cfg.x, this.playerPos.z - b.cfg.z);
        this.controls.pitch = -0.05;
      },
      onTeleportToSpot: (spot) => {
        if (spot === 'plaza') this.playerPos.set(2, 0, 8);
        else if (spot === 'workbench') this.playerPos.set(VILLAGE_LAYOUT.workbench.x - 2.6, 0, VILLAGE_LAYOUT.workbench.z + 2.4);
        else if (spot === 'quarry') this.playerPos.set(VILLAGE_LAYOUT.quarry.x - 9, 0, VILLAGE_LAYOUT.quarry.z + 2);
      },
    });
  }

  _initHeldToolViewmodel() {
    // Outil / brique diégétique tenu en main droite (renforce l'immersion première personne)
    this.handGroup = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.42, 7),
      new THREE.MeshLambertMaterial({ color: '#7a4b25' })
    );
    handle.position.set(0, -0.1, 0);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.09, 0.11),
      new THREE.MeshStandardMaterial({ color: '#adb4bd', metalness: 0.65, roughness: 0.35 })
    );
    head.position.set(0, 0.12, 0);
    this.toolMesh = new THREE.Group();
    this.toolMesh.add(handle, head);

    this.heldBrickMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.12, 0.14),
      this.textures.createPBRMaterial('brick', { color: '#cf7c55', normalStrength: 1.0 })
    );
    this.heldBrickMesh.visible = false;

    this.handGroup.add(this.toolMesh, this.heldBrickMesh);
    this.handGroup.position.set(0.36, -0.32, -0.58);
    this.camera.add(this.handGroup);
    this.scene.add(this.camera);
  }

  _bindMenuAndModals() {
    const mainMenu = document.getElementById('main-menu');
    const hud = document.getElementById('hud');
    const wbUI = document.getElementById('workbench-ui');
    const optModal = document.getElementById('options-modal');

    const enterGame = (loadSaved) => {
      this.audio.unlock();
      if (loadSaved) {
        this._loadSave();
      }
      mainMenu.classList.add('hidden');
      hud.classList.remove('hidden');
      this.inGameplay = true;
      this.controls.setEnabled(true);
      this._refreshHUD();
    };

    document.getElementById('btn-play').addEventListener('click', () => {
      // Si une partie existe déjà et que le joueur clique "Jouer", on entre directement dans le village
      // (le bouton "Nouvelle Partie" dans Options permet une réinitialisation complète sans perte accidentelle)
      enterGame(Boolean(this._readSaveRaw()));
    });

    document.getElementById('btn-continue').addEventListener('click', () => {
      enterGame(true);
    });

    document.getElementById('btn-menu-codex').addEventListener('click', () => {
      this.audio.unlock();
      this.codex.open();
    });

    document.getElementById('btn-menu-options').addEventListener('click', () => {
      this.audio.unlock();
      optModal.classList.remove('hidden');
    });

    document.getElementById('btn-hud-menu').addEventListener('click', () => {
      this._saveNow();
      this.inGameplay = false;
      this.controls.setEnabled(false);
      hud.classList.add('hidden');
      this._checkExistingSave();
      mainMenu.classList.remove('hidden');
    });

    document.getElementById('btn-hud-codex').addEventListener('click', () => {
      this.codex.open();
    });

    // --- Interface Banc de Scie ---
    document.querySelectorAll('.wb-recipe-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const recipeId = btn.dataset.recipe;
        this.workbench.setRecipe(recipeId);
        document.querySelectorAll('.wb-recipe-btn').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
      });
    });

    document.getElementById('btn-wb-cut').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.audio.unlock();
      const res = this.workbench.triggerCut(this.inventory, this.handcart);
      if (res.ok) {
        this.codex.markMilestone('sawed');
        this._refreshWorkbenchUI();
        this._refreshHUD();
        this._scheduleSave();
      }
    }, { passive: false });

    document.getElementById('btn-wb-exit').addEventListener('click', () => {
      this.workbench.exit(this.camera, this.controls);
      wbUI.classList.add('hidden');
      hud.classList.remove('hidden');
      this.handGroup.visible = true;
      this._refreshHUD();
    });

    // --- Modal Options ---
    document.getElementById('btn-options-close').addEventListener('click', () => {
      optModal.classList.add('hidden');
    });
    optModal.addEventListener('click', (e) => {
      if (e.target === optModal) optModal.classList.add('hidden');
    });

    document.getElementById('opt-sound').addEventListener('change', (e) => {
      this.audio.setEnabled(e.target.checked);
    });
    document.getElementById('opt-sens').addEventListener('input', (e) => {
      this.controls.setSensitivity(e.target.value);
    });
    document.getElementById('opt-shadows').addEventListener('change', (e) => {
      this.world.setShadowsEnabled(e.target.checked);
    });
    document.getElementById('btn-opt-save').addEventListener('click', () => {
      this._saveNow();
      optModal.classList.add('hidden');
    });
    document.getElementById('btn-opt-reset').addEventListener('click', () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
      window.location.reload();
    });
  }

  _refreshWorkbenchUI() {
    const cartStone = this.handcart.cargo.stone || 0;
    const cartWood = this.handcart.cargo.wood || 0;
    document.getElementById('wb-stone').textContent = this.inventory.stone + cartStone;
    document.getElementById('wb-wood').textContent = this.inventory.wood + cartWood;
    document.getElementById('wb-slabs').textContent = this.inventory.slabs;
    document.getElementById('wb-bricks').textContent = this.inventory.bricks;
    document.getElementById('wb-beams').textContent = this.inventory.beams;
  }

  _refreshHUD() {
    document.getElementById('hud-bricks').textContent = this.inventory.bricks + (this.handcart.cargo.bricks || 0);
    document.getElementById('hud-slabs').textContent = this.inventory.slabs + (this.handcart.cargo.slabs || 0);
    document.getElementById('hud-beams').textContent = this.inventory.beams + (this.handcart.cargo.beams || 0);
    document.getElementById('hud-stone').textContent = this.inventory.stone + (this.handcart.cargo.stone || 0);
    document.getElementById('hud-wood').textContent = this.inventory.wood + (this.handcart.cargo.wood || 0);

    // Pastille de progression du chantier actif (uniquement icône + chiffre exact)
    const sitePill = document.getElementById('hud-site-ring');
    const activeB = this.building.activeBuilding;
    if (activeB) {
      sitePill.classList.remove('hidden');
      document.getElementById('hud-site-icon').textContent = activeB.icon;
      document.getElementById('hud-site-count').textContent = `${activeB.placedCount}/${activeB.targetBricks}`;
    } else {
      sitePill.classList.add('hidden');
    }

    // Badge charrette si saisie
    const cartBadge = document.getElementById('hud-cart-badge');
    if (this.handcart.attached) {
      cartBadge.classList.remove('hidden');
      document.getElementById('hud-cart-count').textContent =
        `${this.handcart.getTotalCount()}/${this.handcart.getMaxCapacity()}`;
    } else {
      cartBadge.classList.add('hidden');
    }
  }

  _updateContextualActions() {
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    lookDir.y = 0;
    lookDir.normalize();

    const nearBench = this.workbench.isPlayerNear(this.playerPos);
    const nearInterior = this.interiors.findNearbyInteractive(this.playerPos);
    const targetNode = this.resources.findTargetNode(this.playerPos, lookDir);
    const snapped = this.building.snappedTarget;

    // Priorité contextuelle claire et naturelle :
    // 1. Pose de brique aim-snappée  2. Banc de scie  3. Enclume / Porte  4. Extraction carrière/forêt
    if (snapped) {
      this.currentContext = { type: 'place', target: snapped };
    } else if (nearBench) {
      this.currentContext = { type: 'workbench', target: this.workbench };
    } else if (nearInterior) {
      this.currentContext = { type: nearInterior.type, target: nearInterior };
    } else if (targetNode) {
      this.currentContext = { type: 'harvest', target: targetNode };
    } else {
      this.currentContext = { type: 'none', target: null };
    }

    // Met à jour l'apparence diégétique du réticule, de la main et des boutons contextuels
    const reticle = document.getElementById('reticle');
    const primaryBtn = document.getElementById('btn-act-primary');
    const primaryIco = document.getElementById('btn-act-primary-ico');

    reticle.classList.toggle('snapped', this.currentContext.type === 'place');
    reticle.classList.toggle('harvest', this.currentContext.type === 'harvest');
    primaryBtn.classList.toggle('mode-snap', this.currentContext.type === 'place');

    if (this.currentContext.type === 'place') {
      const mat = snapped.slot.materialType;
      primaryIco.textContent = mat === 'slabs' ? '⬜' : mat === 'beams' ? '🪵' : '🧱';
      this.toolMesh.visible = false;
      this.heldBrickMesh.visible = true;
    } else if (this.currentContext.type === 'workbench') {
      primaryIco.textContent = '🪚';
      this.toolMesh.visible = true;
      this.heldBrickMesh.visible = false;
    } else if (this.currentContext.type === 'door') {
      primaryIco.textContent = '🚪';
      this.toolMesh.visible = true;
      this.heldBrickMesh.visible = false;
    } else if (this.currentContext.type === 'anvil') {
      primaryIco.textContent = '⚒';
      this.toolMesh.visible = true;
      this.heldBrickMesh.visible = false;
    } else if (this.currentContext.type === 'harvest') {
      primaryIco.textContent = targetNode.type === 'stone' ? '⛏' : '🪓';
      this.toolMesh.visible = true;
      this.heldBrickMesh.visible = false;
    } else {
      primaryIco.textContent = '⚒';
      this.toolMesh.visible = true;
      this.heldBrickMesh.visible = false;
    }

    // Bouton charrette & bouton chargement (visibles uniquement quand pertinents)
    const nearCart = this.handcart.attached || this.handcart.isPlayerNear(this.playerPos);
    const btnCart = document.getElementById('btn-act-cart');
    const btnLoad = document.getElementById('btn-act-load');
    btnCart.classList.toggle('hidden', !nearCart);
    document.getElementById('btn-act-cart-ico').textContent = this.handcart.attached ? '✋' : '🛞';

    const nearBrickStock = Math.hypot(
      this.playerPos.x - VILLAGE_LAYOUT.brickStock.x,
      this.playerPos.z - VILLAGE_LAYOUT.brickStock.z
    ) < 9.5;
    const nearResStock = Math.hypot(
      this.playerPos.x - VILLAGE_LAYOUT.resourceStock.x,
      this.playerPos.z - VILLAGE_LAYOUT.resourceStock.z
    ) < 9.5;
    const canLoad = nearCart && (nearBrickStock || nearResStock || this.inventory.bricks + this.inventory.slabs + this.inventory.stone + this.inventory.wood > 0);
    btnLoad.classList.toggle('hidden', !canLoad);
  }

  _handlePrimaryAction() {
    this.handSwing = 1.0;

    if (this.currentContext.type === 'place') {
      const res = this.building.tryPlaceSnappedBrick(this.inventory, this.handcart);
      if (res.ok) {
        this._refreshHUD();
      }
      return;
    }

    if (this.currentContext.type === 'workbench') {
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('workbench-ui').classList.remove('hidden');
      this.handGroup.visible = false;
      this.workbench.enter(this.camera, this.controls);
      this._refreshWorkbenchUI();
      return;
    }

    if (this.currentContext.type === 'door' || this.currentContext.type === 'anvil') {
      this.interiors.interact(this.currentContext.target);
      return;
    }

    if (this.currentContext.type === 'harvest') {
      if (this.resources.hitNode(this.currentContext.target, this.playerPos)) {
        this.codex.markMilestone('extracted');
      }
    }
  }

  _updatePlayerPhysics(dt) {
    if (!this.inGameplay || this.workbench.active || this.codex.isOpen) return;

    const mv = this.controls.getMovementVector();
    const baseSpeed = this.handcart.attached ? 5.2 : 6.8;

    if (Math.abs(mv.x) > 0.01 || Math.abs(mv.y) > 0.01) {
      const sin = Math.sin(this.controls.yaw);
      const cos = Math.cos(this.controls.yaw);
      const forwardX = -sin;
      const forwardZ = -cos;
      const rightX = cos;
      const rightZ = -sin;

      const stepX = (forwardX * mv.y + rightX * mv.x) * baseSpeed * dt;
      const stepZ = (forwardZ * mv.y + rightZ * mv.x) * baseSpeed * dt;

      const nextPos = new THREE.Vector3(
        THREE.MathUtils.clamp(this.playerPos.x + stepX, -72, 72),
        this.playerPos.y,
        THREE.MathUtils.clamp(this.playerPos.z + stepZ, -72, 72)
      );

      // Empêche de tomber dans la rivière (le pont reste 100 % traversable)
      if (!isInsideRiver(nextPos.x, nextPos.z, 0.25)) {
        this.building.resolveWallCollision(nextPos, this.interiors);
        this.playerPos.x = nextPos.x;
        this.playerPos.z = nextPos.z;
      }
    }

    // Gravité & saut
    if (!this.isGrounded || this.playerVelY > 0) {
      this.playerVelY -= 18 * dt;
      this.playerPos.y += this.playerVelY * dt;
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVelY = 0;
        this.isGrounded = true;
      }
    }

    // Mise à jour caméra première personne (strictement droite, up=(0,1,0))
    this.camera.up.set(0, 1, 0);
    const bob = (Math.abs(mv.x) + Math.abs(mv.y) > 0.1 && this.isGrounded)
      ? Math.sin(performance.now() * 0.011) * 0.045
      : 0;
    this.camera.position.set(
      this.playerPos.x,
      this.playerPos.y + this.eyeHeight + bob,
      this.playerPos.z
    );
    this.camera.rotation.set(this.controls.pitch, this.controls.yaw, 0, 'YXZ');

    // Animation de balancement de la main / outil
    if (this.handSwing > 0) {
      this.handSwing = Math.max(0, this.handSwing - dt * 5.5);
      const s = Math.sin(this.handSwing * Math.PI);
      this.handGroup.rotation.x = -s * 0.72;
      this.handGroup.position.z = -0.58 - s * 0.12;
    } else {
      this.handGroup.rotation.x = 0;
      this.handGroup.position.z = -0.58;
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;

    this.controls.update(dt);
    this.world.update(dt, elapsed, this.inGameplay ? this.playerPos : VILLAGE_LAYOUT.plaza);

    if (this.inGameplay) {
      this._updatePlayerPhysics(dt);
      this.workbench.update(dt, this.camera);
      this.handcart.update(dt, this.playerPos, this.controls.yaw);
      this.resources.update(dt, this.playerPos, this.handcart, (type, amount, toCart) => {
        if (!toCart) {
          this.inventory[type] = (this.inventory[type] || 0) + amount;
        }
        this._refreshHUD();
        this._scheduleSave();
      });

      if (!this.workbench.active) {
        this.building.update(dt, elapsed, this.camera, this.playerPos);
        this._updateContextualActions();
      }
      this.interiors.update(dt, elapsed);
    } else {
      // Sur le menu principal : légère orbite panoramique du village en arrière-plan 3D
      const ang = elapsed * 0.09;
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(Math.cos(ang) * 34, 18, Math.sin(ang) * 34);
      this.camera.lookAt(2, 2, -2);
    }

    this.renderer.render(this.scene, this.camera);
  }

  // =========================================================================
  // SAUVEGARDE AUTOMATIQUE localStorage
  // =========================================================================
  _readSaveRaw() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  _checkExistingSave() {
    const data = this._readSaveRaw();
    const btnContinue = document.getElementById('btn-continue');
    const meta = document.getElementById('continue-meta');
    if (data && data.buildings) {
      let count = 0;
      for (const ranges of Object.values(data.buildings)) {
        if (Array.isArray(ranges)) {
          for (const [, len] of ranges) count += len;
        }
      }
      btnContinue.classList.remove('hidden');
      meta.textContent = `${count.toLocaleString('fr-FR')} briques`;
    } else {
      btnContinue.classList.add('hidden');
    }
  }

  _scheduleSave() {
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => this._saveNow(), 1200);
  }

  _saveNow() {
    try {
      const payload = {
        v: 1,
        inventory: { ...this.inventory },
        player: {
          x: this.playerPos.x,
          z: this.playerPos.z,
          yaw: this.controls.yaw,
          pitch: this.controls.pitch,
        },
        handcart: this.handcart.serialize(),
        buildings: this.building.serialize(),
        codex: this.codex.serialize(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (_) {
      // Ignore quota errors on private browsing
    }
  }

  _loadSave() {
    const data = this._readSaveRaw();
    if (!data) return;
    if (data.inventory) Object.assign(this.inventory, data.inventory);
    if (data.player) {
      this.playerPos.set(data.player.x || 4, 0, data.player.z || 13);
      this.controls.yaw = data.player.yaw ?? VILLAGE_LAYOUT.spawn.yaw;
      this.controls.pitch = data.player.pitch ?? -0.05;
    }
    this.handcart.deserialize(data.handcart);
    this.building.deserialize(data.buildings);
    this.interiors.syncAll();
    this.codex.deserialize(data.codex);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__villageBuilder = new VillageBuilderGame();
});
