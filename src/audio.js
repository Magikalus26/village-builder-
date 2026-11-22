// src/audio.js — Synthétiseur Web Audio procédural (zéro asset audio externe, Safari iOS ready)

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.unlocked = false;
    this.lastCartRollAt = 0;
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
  }

  _ready() {
    if (!this.enabled) return false;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return false;
    return true;
  }

  _noiseBuffer(durationSec = 0.12) {
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * durationSec));
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }
    return buf;
  }

  playPickaxeStone() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;

    // Claquement métallique aigu + impact sourd de la pierre
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450 + Math.random() * 240, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.09);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.09);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.26, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noise.connect(filter).connect(nGain).connect(this.ctx.destination);
    noise.start(t);
  }

  playChopWood() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210 + Math.random() * 35, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.1);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.06);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.18, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(filter).connect(nGain).connect(this.ctx.destination);
    noise.start(t);
  }

  playRagdollBounce(intensity = 0.5, isWood = false) {
    if (!this._ready()) return;
    const vol = Math.min(0.22, Math.max(0.03, intensity * 0.16));
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isWood ? 'triangle' : 'sine';
    const base = isWood ? 240 : 420;
    osc.frequency.setValueAtTime(base + Math.random() * 140, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.45, t + 0.06);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playPickup() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(790, t + 0.08);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.095);
  }

  playSawCut() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    // Double va-et-vient de scie + tintement de coupe achevée
    for (let i = 0; i < 2; i++) {
      const start = t + i * 0.11;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(0.09);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, start);
      filter.frequency.linearRampToValueAtTime(2400, start + 0.08);
      filter.Q.value = 3.5;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      noise.connect(filter).connect(g).connect(this.ctx.destination);
      noise.start(start);
    }

    const chime = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(660, t + 0.21);
    chime.frequency.exponentialRampToValueAtTime(990, t + 0.34);
    cGain.gain.setValueAtTime(0.14, t + 0.21);
    cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    chime.connect(cGain).connect(this.ctx.destination);
    chime.start(t + 0.21);
    chime.stop(t + 0.37);
  }

  playBrickPlace() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const pitch = 360 + Math.random() * 90;
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.065);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);

    // Légère touche de mortier
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.045);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.09, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    noise.connect(filter).connect(nGain).connect(this.ctx.destination);
    noise.start(t);
  }

  playCartRoll() {
    if (!this._ready()) return;
    const now = performance.now();
    if (now - this.lastCartRollAt < 260) return;
    this.lastCartRollAt = now;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95 + Math.random() * 25, t);
    osc.frequency.linearRampToValueAtTime(70, t + 0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    gain.gain.setValueAtTime(0.055, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(filter).connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.095);
  }

  playDoorCreak() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(280, t + 0.14);
    osc.frequency.linearRampToValueAtTime(190, t + 0.24);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 480;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(filter).connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playAnvilClang() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    [1180, 1770, 2360].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.14 / (idx + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.46);
    });
  }

  playPageFlip() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.11);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    noise.connect(filter).connect(g).connect(this.ctx.destination);
    noise.start(t);
  }

  playFanfare() {
    if (!this._ready()) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      const st = t + i * 0.09;
      osc.frequency.setValueAtTime(f, st);
      g.gain.setValueAtTime(0.16, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.55);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.58);
    });
  }
}
