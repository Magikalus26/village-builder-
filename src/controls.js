// src/controls.js — Contrôles tactiles iPhone 16e (joystick gauche, look droit) + Clavier/Souris
// Utilise exclusivement pointer events avec anti-rebond pour éviter tout double déclenchement sur iOS Safari.

export class PlayerControls {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.enabled = false;
    this.lookLocked = false; // Verrouillé pendant l'utilisation du banc de scie
    this.sensitivity = 1.0;

    // État de mouvement normalisé (-1..1)
    this.moveX = 0;
    this.moveY = 0; // +1 = avancer, -1 = reculer

    // État caméra (radians)
    this.yaw = 0.25;
    this.pitch = -0.06;

    // Clavier
    this.keys = new Set();

    // Touch pointers actifs
    this.joyPointerId = null;
    this.joyOrigin = { x: 0, y: 0 };
    this.joyMaxRadius = 46;

    this.lookPointerId = null;
    this.lookPrev = { x: 0, y: 0 };

    // Hold continu pour pose rapide 1-par-1 (avec cadence stricte anti double-comptage)
    this.primaryHeld = false;
    this.lastPrimaryFire = 0;
    this.primaryTapDebounceMs = 175;
    this.primaryHoldIntervalMs = 155;

    this._bindDOM();
  }

  setEnabled(flag) {
    this.enabled = flag;
    if (!flag) {
      this.resetInputs();
    }
  }

  setLookLocked(flag) {
    this.lookLocked = flag;
    if (flag) {
      this.lookPointerId = null;
      this.joyPointerId = null;
      this.moveX = 0;
      this.moveY = 0;
      this._updateKnob(0, 0);
    }
  }

  setSensitivity(val) {
    this.sensitivity = Math.max(0.3, Math.min(2.5, Number(val) || 1.0));
  }

  resetInputs() {
    this.moveX = 0;
    this.moveY = 0;
    this.keys.clear();
    this.joyPointerId = null;
    this.lookPointerId = null;
    this.primaryHeld = false;
    this._updateKnob(0, 0);
  }

  _updateKnob(dx, dy) {
    const knob = document.getElementById('joystick-knob');
    if (knob) {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }

  _bindDOM() {
    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');
    const lookZone = document.getElementById('look-zone');

    // --- Joystick virtuel gauche ---
    joyZone.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.lookLocked) return;
      if (this.joyPointerId !== null) return;
      e.preventDefault();
      this.callbacks.onUserGesture?.();
      this.joyPointerId = e.pointerId;
      joyZone.setPointerCapture(e.pointerId);
      const rect = joyBase.getBoundingClientRect();
      this.joyOrigin.x = rect.left + rect.width * 0.5;
      this.joyOrigin.y = rect.top + rect.height * 0.5;
      this._handleJoyMove(e.clientX, e.clientY);
    }, { passive: false });

    joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      e.preventDefault();
      this._handleJoyMove(e.clientX, e.clientY);
    }, { passive: false });

    const endJoy = (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      this.joyPointerId = null;
      this.moveX = 0;
      this.moveY = 0;
      this._updateKnob(0, 0);
    };
    joyZone.addEventListener('pointerup', endJoy);
    joyZone.addEventListener('pointercancel', endJoy);

    // --- Glissement caméra à droite ---
    lookZone.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.lookLocked) return;
      if (this.lookPointerId !== null) return;
      e.preventDefault();
      this.callbacks.onUserGesture?.();
      this.lookPointerId = e.pointerId;
      lookZone.setPointerCapture(e.pointerId);
      this.lookPrev.x = e.clientX;
      this.lookPrev.y = e.clientY;
    }, { passive: false });

    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookPointerId || !this.enabled || this.lookLocked) return;
      e.preventDefault();
      const dx = e.clientX - this.lookPrev.x;
      const dy = e.clientY - this.lookPrev.y;
      this.lookPrev.x = e.clientX;
      this.lookPrev.y = e.clientY;

      const scale = 0.0052 * this.sensitivity;
      this.yaw -= dx * scale;
      this.pitch = Math.max(-1.22, Math.min(1.22, this.pitch - dy * scale));
    }, { passive: false });

    const endLook = (e) => {
      if (e.pointerId !== this.lookPointerId) return;
      this.lookPointerId = null;
    };
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);

    // --- Bouton Action Principal (pointerdown uniquement => zéro double-event iOS!) ---
    const btnPrimary = document.getElementById('btn-act-primary');
    btnPrimary.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.enabled || this.lookLocked) return;
      this.callbacks.onUserGesture?.();
      this.primaryHeld = true;
      const now = performance.now();
      if (now - this.lastPrimaryFire >= this.primaryTapDebounceMs) {
        this.lastPrimaryFire = now;
        this.callbacks.onPrimaryAction?.();
      }
    }, { passive: false });

    const endPrimary = () => {
      this.primaryHeld = false;
    };
    btnPrimary.addEventListener('pointerup', endPrimary);
    btnPrimary.addEventListener('pointercancel', endPrimary);
    btnPrimary.addEventListener('pointerleave', endPrimary);

    // --- Boutons secondaires (pointerdown exclusif) ---
    document.getElementById('btn-act-jump').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.enabled || this.lookLocked) return;
      this.callbacks.onUserGesture?.();
      this.callbacks.onJump?.();
    }, { passive: false });

    document.getElementById('btn-act-cart').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.enabled || this.lookLocked) return;
      this.callbacks.onUserGesture?.();
      this.callbacks.onCartToggle?.();
    }, { passive: false });

    document.getElementById('btn-act-load').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.enabled || this.lookLocked) return;
      this.callbacks.onUserGesture?.();
      this.callbacks.onCartLoad?.();
    }, { passive: false });

    // --- Clavier & Souris Desktop ---
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'KeyB' || e.code === 'Tab') {
        e.preventDefault();
        this.callbacks.onToggleCodex?.();
        return;
      }
      if (this.lookLocked) return;
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.callbacks.onJump?.();
      } else if (e.code === 'KeyE') {
        const now = performance.now();
        if (now - this.lastPrimaryFire >= this.primaryTapDebounceMs) {
          this.lastPrimaryFire = now;
          this.callbacks.onPrimaryAction?.();
        }
      } else if (e.code === 'KeyF') {
        this.callbacks.onCartToggle?.();
      } else if (e.code === 'KeyR') {
        this.callbacks.onCartLoad?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  _handleJoyMove(clientX, clientY) {
    const rawX = clientX - this.joyOrigin.x;
    const rawY = clientY - this.joyOrigin.y;
    const dist = Math.hypot(rawX, rawY);
    const clamped = Math.min(dist, this.joyMaxRadius);
    const angle = Math.atan2(rawY, rawX);
    const dx = Math.cos(angle) * clamped;
    const dy = Math.sin(angle) * clamped;
    this._updateKnob(dx, dy);

    const norm = clamped / this.joyMaxRadius;
    if (norm < 0.08) {
      this.moveX = 0;
      this.moveY = 0;
    } else {
      this.moveX = (dx / this.joyMaxRadius);
      this.moveY = -(dy / this.joyMaxRadius); // Vers le haut = avancer (+1)
    }
  }

  getMovementVector() {
    let x = this.moveX;
    let y = this.moveY;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  update(dt) {
    if (!this.enabled || this.lookLocked) return;

    // Rotation clavier optionnelle (Q/E flèches)
    if (this.keys.has('KeyQ')) this.yaw += 1.9 * dt;

    // Maintien du bouton principal : pose cadencée 1 brique par impulsion (strictement 1 par tick)
    if (this.primaryHeld) {
      const now = performance.now();
      if (now - this.lastPrimaryFire >= this.primaryHoldIntervalMs) {
        this.lastPrimaryFire = now;
        this.callbacks.onPrimaryAction?.();
      }
    }
  }
}
