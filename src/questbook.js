// src/questbook.js — Codex de l'Architecte / Livre de Quêtes style "Neo Adventure"
// Suit la progression réelle bâtiment par bâtiment selon le plan IMG_0581.JPG

export class ArchitectCodex {
  constructor(buildingSystem, world, audio, callbacks) {
    this.buildingSystem = buildingSystem;
    this.world = world;
    this.audio = audio;
    this.callbacks = callbacks;

    this.isOpen = false;
    this.activeTab = 'quests';
    this.trackedBuildingId = 'house_chaumiere';

    // Jalons logistiques suivis automatiquement
    this.milestones = {
      extracted: false,
      sawed: false,
      carted: false,
    };

    this.modalEl = document.getElementById('codex-modal');
    this.questsPanel = document.getElementById('codex-tab-quests');
    this.planPanel = document.getElementById('codex-tab-plan');
    this.stockPanel = document.getElementById('codex-tab-stock');
    this.summaryEl = document.getElementById('codex-total-summary');
    this.notifyDot = document.getElementById('codex-dot');

    this._bindEvents();
    this._syncTrackedBeacon();
  }

  _bindEvents() {
    document.getElementById('btn-codex-close').addEventListener('click', () => this.close());
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    document.querySelectorAll('.codex-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        this.activeTab = tabBtn.dataset.tab;
        this.audio.playPageFlip();
        document.querySelectorAll('.codex-tab').forEach((b) => {
          b.classList.toggle('active', b === tabBtn);
        });
        this.questsPanel.classList.toggle('hidden', this.activeTab !== 'quests');
        this.planPanel.classList.toggle('hidden', this.activeTab !== 'plan');
        this.stockPanel.classList.toggle('hidden', this.activeTab !== 'stock');
        this.render();
      });
    });
  }

  markMilestone(key) {
    if (!this.milestones[key]) {
      this.milestones[key] = true;
      this.notifyDot?.classList.remove('hidden');
    }
  }

  open() {
    this.isOpen = true;
    this.notifyDot?.classList.add('hidden');
    this.audio.playPageFlip();
    this.render();
    this.modalEl.classList.remove('hidden');
    this.callbacks.onOpenStateChange?.(true);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
    this.callbacks.onOpenStateChange?.(false);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  setTrackedBuilding(id) {
    this.trackedBuildingId = id;
    this._syncTrackedBeacon();
    this.render();
  }

  _syncTrackedBeacon() {
    const b = this.buildingSystem.getBuildingById(this.trackedBuildingId);
    if (b && !b.completed) {
      this.world.setTrackedTarget({ x: b.cfg.x, z: b.cfg.z });
    } else {
      const nextUnfinished = this.buildingSystem.buildings
        .slice()
        .sort((a, c) => a.cfg.order - c.cfg.order)
        .find((x) => !x.completed);
      if (nextUnfinished) {
        this.trackedBuildingId = nextUnfinished.id;
        this.world.setTrackedTarget({ x: nextUnfinished.cfg.x, z: nextUnfinished.cfg.z });
      } else {
        this.world.setTrackedTarget(null);
      }
    }
  }

  render() {
    const totalPlaced = this.buildingSystem.getTotalPlacedBricks();
    const totalTarget = this.buildingSystem.getTotalTargetBricks();
    if (this.summaryEl) {
      this.summaryEl.textContent = `${totalPlaced.toLocaleString('fr-FR')} / ${totalTarget.toLocaleString('fr-FR')} briques posées`;
    }

    if (this.activeTab === 'quests') {
      this._renderQuests();
    } else if (this.activeTab === 'stock') {
      this._renderStock();
    }
  }

  _renderQuests() {
    const ordered = this.buildingSystem.buildings
      .slice()
      .sort((a, b) => a.cfg.order - b.cfg.order);

    const stepsHtml = `
      <div class="quest-card">
        <div class="quest-top">
          <div class="quest-name">🧭 Préparation du Chantier</div>
          <div class="quest-count">${Object.values(this.milestones).filter(Boolean).length}/3</div>
        </div>
        <div class="codex-legend-grid" style="margin-top:8px;">
          <div class="legend-chip">${this.milestones.extracted ? '✅' : '⛏'} Extraire pierre & bois</div>
          <div class="legend-chip">${this.milestones.sawed ? '✅' : '🪚'} Scier dalles & briques</div>
          <div class="legend-chip">${this.milestones.carted ? '✅' : '🛞'} Tirer la charrette</div>
          <div class="legend-chip">✨ Viser un blueprint</div>
        </div>
      </div>
    `;

    const buildingsHtml = ordered.map((b) => {
      const pct = Math.min(100, (b.placedCount / b.targetBricks) * 100);
      const isTracked = this.trackedBuildingId === b.id && !b.completed;
      const isAssisted = this.buildingSystem.masonAssistIds.has(b.id);

      return `
        <article class="quest-card ${b.completed ? 'completed' : ''} ${isTracked ? 'tracked' : ''}">
          <div class="quest-top">
            <div class="quest-name">${b.icon} ${b.name} ${b.completed ? '✅' : ''}</div>
            <div class="quest-count">${b.placedCount.toLocaleString('fr-FR')} / ${b.targetBricks.toLocaleString('fr-FR')}</div>
          </div>
          <div class="quest-bar"><div class="quest-bar-fill" style="width:${pct.toFixed(2)}%"></div></div>
          <div class="quest-actions">
            ${!b.completed ? `
              <button class="q-btn ${isTracked ? 'active' : 'primary'}" data-act="track" data-id="${b.id}" type="button">
                ${isTracked ? '📍 Suivi actif' : '📍 Guider'}
              </button>
              <button class="q-btn ${isAssisted ? 'active' : ''}" data-act="masons" data-id="${b.id}" type="button">
                ${isAssisted ? '👷 Maçons actifs' : '👷 Compagnons'}
              </button>
              <button class="q-btn" data-act="finish" data-id="${b.id}" type="button">
                🏛 Achever & Visiter
              </button>
            ` : `
              <button class="q-btn active" data-act="visit" data-id="${b.id}" type="button">
                🚪 Aller visiter l'intérieur
              </button>
            `}
          </div>
        </article>
      `;
    }).join('');

    this.questsPanel.innerHTML = stepsHtml + buildingsHtml;

    // Attache les actions des boutons du Codex
    this.questsPanel.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        if (act === 'track') {
          this.setTrackedBuilding(id);
          this.close();
        } else if (act === 'masons') {
          this.buildingSystem.toggleMasonAssist(id);
          this.render();
        } else if (act === 'finish') {
          this.buildingSystem.completeBuildingNow(id);
          this._syncTrackedBeacon();
          this.render();
        } else if (act === 'visit') {
          this.callbacks.onTeleportToBuilding?.(id);
          this.close();
        }
      });
    });
  }

  _renderStock() {
    const inv = this.callbacks.getInventory();
    const cart = this.callbacks.getCartCargo();
    const cartTotal = Object.values(cart).reduce((a, b) => a + b, 0);

    this.stockPanel.innerHTML = `
      <div class="stock-grid">
        <div class="stock-box"><span>🧱 Briques (sac)</span><span>${inv.bricks}</span></div>
        <div class="stock-box"><span>⬜ Dalles (sac)</span><span>${inv.slabs}</span></div>
        <div class="stock-box"><span>🪵 Poutres (sac)</span><span>${inv.beams}</span></div>
        <div class="stock-box"><span>🪨 Pierre brute</span><span>${inv.stone}</span></div>
        <div class="stock-box"><span>🌲 Rondins</span><span>${inv.wood}</span></div>
        <div class="stock-box"><span>🛞 Charrette</span><span>${cartTotal} / 240</span></div>
      </div>
      <div class="quest-actions">
        <button id="btn-codex-plaza" class="q-btn primary" type="button">⛲ Revenir sur la Place</button>
        <button id="btn-codex-bench" class="q-btn" type="button">🪚 Aller au Banc de Scie</button>
        <button id="btn-codex-quarry" class="q-btn" type="button">⛏ Aller à la Carrière</button>
      </div>
    `;

    this.stockPanel.querySelector('#btn-codex-plaza')?.addEventListener('click', () => {
      this.callbacks.onTeleportToSpot?.('plaza');
      this.close();
    });
    this.stockPanel.querySelector('#btn-codex-bench')?.addEventListener('click', () => {
      this.callbacks.onTeleportToSpot?.('workbench');
      this.close();
    });
    this.stockPanel.querySelector('#btn-codex-quarry')?.addEventListener('click', () => {
      this.callbacks.onTeleportToSpot?.('quarry');
      this.close();
    });
  }

  serialize() {
    return {
      trackedBuildingId: this.trackedBuildingId,
      milestones: { ...this.milestones },
    };
  }

  deserialize(data) {
    if (!data) return;
    if (data.trackedBuildingId) this.trackedBuildingId = data.trackedBuildingId;
    if (data.milestones) Object.assign(this.milestones, data.milestones);
    this._syncTrackedBeacon();
  }
}
