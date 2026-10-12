import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Tower } from '../entities/Tower';
import { Zombie } from '../entities/Zombie';
import { Arrow } from '../entities/Arrow';
import { Pickup } from '../entities/Pickup';
import { FloatingText, UpgradeItem, GameState, GameMode, ZombieType, BowType, BOW_METADATA, HeroSkinId } from '../types';
import { createUpgradeCatalog } from '../systems/UpgradeCatalog';
import { soundFX } from '../systems/SoundFX';
import { uiManager } from '../systems/UIManager';
import { crazyGames } from '../systems/CrazyGamesSDK';
import { getGameResolution } from '../main';

interface ActiveVortex {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  angle: number;
}

export interface EnemyHazard {
  id: string;
  type: 'projectile' | 'shockwave';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: number;
  name: string;
  dead: boolean;
  dodged: boolean;
  life: number;
  trail: Array<{ x: number; y: number }>;
  subType?: string;
  rot?: number;
  vRot?: number;
  gravity?: number;
  targetsTower?: boolean;
}

export interface PitchPit {
  id: string;
  x: number;
  y: number;
  width: number;
  isIgnited: boolean;
  igniteTimer: number;
  bubbles: Array<{ xOff: number; r: number; phase: number; speed: number }>;
}

export interface GunpowderBarrel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dead: boolean;
  isIgnited: boolean;
  fuseTimer: number;
  flashTimer: number;
}

export class MainScene extends Phaser.Scene {
  public player!: Player;
  public tower!: Tower;
  public zombies: Zombie[] = [];
  public arrows: Arrow[] = [];
  public pickups: Pickup[] = [];
  public vortices: ActiveVortex[] = [];
  public enemyHazards: EnemyHazard[] = [];
  public pitchPits: PitchPit[] = [];
  public gunpowderBarrels: GunpowderBarrel[] = [];
  public floatingTexts: FloatingText[] = [];
  public upgrades: UpgradeItem[] = [];

  public wave: number = 0;
  public kills: number = 0;
  public enemiesToSpawn: number = 0;
  public spawnTimer: number = 0;
  public spawnInterval: number = 1.1;
  public state: GameState = 'menu';
  public gameMode: GameMode = 'campaign';
  public waveFeaturedSpawned: boolean = false;
  public totalEnemiesThisWave: number = 0;
  public bigZombiesSpawnedThisWave: number = 0;
  public equippedBow: BowType = 'normal';
  public primaryBow: BowType = 'normal';
  public secondaryBow: BowType = 'normal';
  public currentSkin: HeroSkinId = 'default';
  public unlockedSkins: string[] = ['default'];
  public campaignWave: number = 1;
  public highestCampaignWave: number = 1;
  public endlessBestWave: number = 0;
  public campaignCompleted: boolean = false;
  public endlessRunSkullsEarned: number = 0;
  public endlessRunSkullsBanked: number = 0;
  public get endlessSkullsBanked(): number { return this.endlessRunSkullsBanked; }
  public set endlessSkullsBanked(v: number) { this.endlessRunSkullsBanked = v; }
  public waveCompleting: boolean = false;
  public waveCompleteDelay: number = 0;

  public timeScale: number = 1.0;
  public slowMoTimer: number = 0;
  public hitStopTimer: number = 0;
  public combo: number = 0;
  public comboTimer: number = 0;

  private graphicsLayer!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private stars: Array<{ x: number; y: number; r: number; phase: number; speed: number; col: number }> = [];

  public lightningStrikes: Array<{
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    branches: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>>;
    chains: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>>;
    impactX: number;
    impactY: number;
    shockwaveR: number;
    life: number;
    maxLife: number;
  }> = [];

  public ambientThunderTimer: number = 6.0;
  public ambientLightningBolts: Array<{
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    branches: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>>;
    color: number;
    glowColor: number;
    life: number;
    maxLife: number;
  }> = [];

  public iceShards: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    rot: number;
    vRot: number;
    life: number;
    maxLife: number;
    col: number;
  }> = [];

  public electricSparks: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    col: number;
  }> = [];

  public bodyGibs: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vRot: number;
    type: 'bone' | 'flesh' | 'skull' | 'cloth' | 'rib' | 'ice' | 'ember' | 'acid';
    col: number;
    secondaryCol?: number;
    w: number;
    h: number;
    life: number;
    maxLife: number;
    restitution: number;
    friction: number;
    hasStainedGround?: boolean;
    points?: Array<{ x: number; y: number }>;
  }> = [];

  public groundStains: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    col: number;
    alpha: number;
    life: number;
    maxLife: number;
  }> = [];

  public bloodMists: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    maxR: number;
    alpha: number;
    col: number;
    life: number;
    maxLife: number;
  }> = [];

  public bloodSplats: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    life: number;
    maxLife: number;
    col: number;
  }> = [];

  public explosions: Array<{
    x: number;
    y: number;
    r: number;
    maxR: number;
    life: number;
    maxLife: number;
    particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; col: number; life: number; maxLife: number }>;
  }> = [];

  public holyBeams: Array<{
    x: number;
    targetY: number;
    shockwaveR: number;
    life: number;
    maxLife: number;
  }> = [];

  public harpoonShockwaves: Array<{
    x: number;
    y: number;
    r: number;
    maxR: number;
    life: number;
    maxLife: number;
    shards: Array<{ x: number; y: number; vx: number; vy: number; r: number; rot: number; vRot: number }>;
  }> = [];

  public toxicSplashes: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    life: number;
    maxLife: number;
    col: number;
  }> = [];

  // ── Active Tactical Ultimate Skills ([F] / [E] / [R] / [T] / [G]) ──
  public hasVolleyUnlocked: boolean = false;
  public hasFrostNovaUnlocked: boolean = false;
  public volleyCooldown: number = 0;
  public volleyMaxCooldown: number = 24;
  public volleyArrowCount: number = 28;
  public frostNovaCooldown: number = 0;
  public frostNovaMaxCooldown: number = 28;
  public frostNovaDuration: number = 4.5;
  public frostNovaDamage: number = 0;
  public volleyBarrageRemaining: number = 0;
  public volleyBarrageTimer: number = 0;
  public divineAegisTimer: number = 0;

  constructor() {
    super({ key: 'MainScene' });
  }

  public create(): void {
    const res = getGameResolution();
    const w = res.width;
    const h = res.height;
    this.scale.resize(w, h);
    this.cameras.main.setSize(w, h);
    this.matter.world.setBounds(0, 0, w, h * 0.72 + 20);

    this.graphicsLayer = this.add.graphics();
    this.upgrades = createUpgradeCatalog();
    this.tower = new Tower(this);
    this.player = new Player(this, 'player1', this.tower.x, this.tower.topY);
    this.updateCameraView();
    this.loadGameData(true);
    if (this.player) {
      this.player.setEndlessMode(this.gameMode === 'endless');
      this.player.primaryBow = this.primaryBow || 'normal';
      this.player.secondaryBow = this.secondaryBow || 'normal';
      this.player.activeSlot = 1;
      this.player.bowType = this.player.primaryBow;
      this.player.arrowDamage = this.player.getBowBaseDamage(this.player.bowType);
      if (this.currentSkin) this.player.currentSkin = this.currentSkin;
    }
    this.updateMenuSkullsUI();
    this.updateWeaponHUD();

    // Generate night sky stars
    for (let s = 0; s < 75; s++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.65),
        r: 0.8 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 3.5,
        col: Math.random() < 0.25 ? 0xffcccc : Math.random() < 0.5 ? 0xdfe6e9 : 0xffffff
      });
    }

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Pointer events for bow aim & charge (Canvas events)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.player && !this.player.dead) {
        this.player.setAim(pointer.worldX, pointer.worldY);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      try { soundFX.ensure(); } catch {}
      if (this.state === 'playing' && (pointer.leftButtonDown() || pointer.isDown) && this.player && !this.player.dead) {
        this.player.setAim(pointer.worldX, pointer.worldY);
        this.player.startCharge();
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.state === 'playing' && this.player && this.player.isCharging) {
        this.player.setAim(pointer.worldX, pointer.worldY);
        const released = this.player.releaseArrow();
        if (released) {
          const spawnPos = this.player.getBowTipPosition();
          released.forEach(r => {
            const startX = r.x !== undefined ? r.x : spawnPos.x;
            const startY = r.y !== undefined ? r.y : spawnPos.y;
            this.arrows.push(new Arrow(this, startX, startY, r.vx, r.vy, 'player1', {
              damage: r.damage,
              type: r.type,
              bonusPierce: r.bonusPierce,
              isPrimaryStorm: r.isPrimaryStorm
            }));
          });
        }
      }
    });

    // Global window listeners: guarantees bow ALWAYS aims and ALWAYS releases even during fast mouse or touch drags
    const getAimCoords = (clientX: number, clientY: number) => {
      let screenX = clientX;
      let screenY = clientY;
      const canvasEl = this.game.canvas;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          const normX = (clientX - rect.left) / rect.width;
          const normY = (clientY - rect.top) / rect.height;
          screenX = normX * this.scale.width;
          screenY = normY * this.scale.height;
        }
      } else {
        const scaleX = this.scale.width / (window.innerWidth || 1);
        const scaleY = this.scale.height / (window.innerHeight || 1);
        screenX = clientX * scaleX;
        screenY = clientY * scaleY;
      }
      if (this.cameras && this.cameras.main) {
        const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY);
        return { x: worldPoint.x, y: worldPoint.y };
      }
      return { x: screenX, y: screenY };
    };

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.player && !this.player.dead) {
        const coords = getAimCoords(e.clientX, e.clientY);
        this.player.setAim(coords.x, coords.y);
      }
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.state === 'playing' && this.player && this.player.isCharging) {
        const coords = getAimCoords(e.clientX, e.clientY);
        this.player.setAim(coords.x, coords.y);
        const released = this.player.releaseArrow();
        if (released) {
          const spawnPos = this.player.getBowTipPosition();
          released.forEach(r => {
            const startX = r.x !== undefined ? r.x : spawnPos.x;
            const startY = r.y !== undefined ? r.y : spawnPos.y;
            this.arrows.push(new Arrow(this, startX, startY, r.vx, r.vy, 'player1', {
              damage: r.damage,
              type: r.type,
              bonusPierce: r.bonusPierce,
              isPrimaryStorm: r.isPrimaryStorm
            }));
          });
        }
      }
    });

    window.addEventListener('touchstart', (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('button, .btn, .hud-weapon-btn, .hud-skill-btn, .mobile-jump-btn, input, a, .interactive')) {
        return;
      }
      try { soundFX.ensure(); } catch {}
      if (this.state === 'playing' && this.player && !this.player.dead && e.touches.length > 0) {
        const coords = getAimCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.player.setAim(coords.x, coords.y);
        this.player.startCharge();
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0 && this.player && !this.player.dead) {
        const coords = getAimCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.player.setAim(coords.x, coords.y);
      }
    }, { passive: true });

    window.addEventListener('touchend', (e: TouchEvent) => {
      if (this.state === 'playing' && this.player && this.player.isCharging) {
        if (e.changedTouches && e.changedTouches.length > 0) {
          const coords = getAimCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          this.player.setAim(coords.x, coords.y);
        }
        const released = this.player.releaseArrow();
        if (released) {
          const spawnPos = this.player.getBowTipPosition();
          released.forEach(r => {
            const startX = r.x !== undefined ? r.x : spawnPos.x;
            const startY = r.y !== undefined ? r.y : spawnPos.y;
            this.arrows.push(new Arrow(this, startX, startY, r.vx, r.vy, 'player1', {
              damage: r.damage,
              type: r.type,
              bonusPierce: r.bonusPierce,
              isPrimaryStorm: r.isPrimaryStorm
            }));
          });
        }
      }
    });

    window.addEventListener('touchcancel', () => {
      if (this.player) {
        this.player.isCharging = false;
      }
    }, { passive: true });

    // Wire HTML UI Buttons
    this.wireUI();
    this.updateHomeUpgradesBtn();

    uiManager.setState('menu');
  }

  private wireUI(): void {
    const cardCampaign = document.getElementById('card-mode-campaign');
    const cardEndless = document.getElementById('card-mode-endless');
    if (cardCampaign && cardEndless) {
      cardCampaign.onclick = () => {
        soundFX.playBowDraw();
        this.setGameMode('campaign');
      };
      cardEndless.onclick = () => {
        soundFX.playBowDraw();
        this.setGameMode('endless');
      };
    }

    const btnMenuUpgrades = document.getElementById('btn-menu-upgrades');
    if (btnMenuUpgrades) {
      btnMenuUpgrades.onclick = () => {
        if (this.gameMode === 'endless') {
          this.showEndlessMenuNotice();
        } else {
          this.openShopFromMenu();
        }
      };
    }

    const btnMenuWardrobe = document.getElementById('btn-menu-wardrobe');
    if (btnMenuWardrobe) {
      btnMenuWardrobe.onclick = () => {
        soundFX.playBowDraw();
        this.openWardrobeFromMenu();
      };
    }

    const btnWardrobeBack = document.getElementById('btn-wardrobe-back');
    if (btnWardrobeBack) {
      btnWardrobeBack.onclick = () => {
        soundFX.playBowDraw();
        this.returnToMenu();
      };
    }

    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.onclick = () => {
        soundFX.ensure();
        this.startGame(this.gameMode);
      };
    }

    const btnRestartCamp = document.getElementById('btn-restart-campaign');
    if (btnRestartCamp) {
      btnRestartCamp.onclick = () => {
        soundFX.playBowDraw();
        this.campaignWave = 1;
        this.saveGameData();
        this.startGame('campaign');
      };
    }


    const btnRetry = document.getElementById('btn-retry');
    if (btnRetry) btnRetry.onclick = () => this.startGame(this.gameMode);

    const btnContinueEndless = document.getElementById('btn-continue-endless');
    if (btnContinueEndless) {
      btnContinueEndless.onclick = () => {
        this.gameMode = 'endless';
        if (this.player) {
          this.player.setEndlessMode(true);
        }
        this.openShop();
      };
    }

    const btnVicMenu = document.getElementById('btn-vic-menu');
    if (btnVicMenu) {
      btnVicMenu.onclick = () => {
        this.returnToMenu();
      };
    }

    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) {
      btnMenu.onclick = () => {
        this.returnToMenu();
      };
    }

    const btnNextWave = document.getElementById('btn-next-wave');
    if (btnNextWave) {
      btnNextWave.onclick = () => {
        if (this.gameMode === 'endless') {
          this.player.hp = Math.min(this.player.maxHP, this.player.hp + 30);
        } else {
          const healAmount = Math.max(75, Math.round(this.player.maxHP * 0.65));
          this.player.hp = Math.min(this.player.maxHP, this.player.hp + healAmount);
          if (this.tower) this.tower.repair(80);
        }
        this.state = 'playing';
        uiManager.setState('playing');
        this.startNextWave();
      };
    }

    const btnHudPause = document.getElementById('btn-hud-pause');
    if (btnHudPause) btnHudPause.onclick = () => this.togglePause();

    const btnPauseResume = document.getElementById('btn-pause-resume');
    if (btnPauseResume) btnPauseResume.onclick = () => this.togglePause();

    const btnPauseShop = document.getElementById('btn-pause-shop');
    if (btnPauseShop) {
      btnPauseShop.onclick = () => {
        soundFX.playBowDraw();
        this.openShopFromMenu();
      };
    }

    const btnPauseRestart = document.getElementById('btn-pause-restart');
    if (btnPauseRestart) {
      btnPauseRestart.onclick = () => this.restartWave();
    }

    const btnPauseMenu = document.getElementById('btn-pause-menu');
    if (btnPauseMenu) {
      btnPauseMenu.onclick = () => {
        this.returnToMenu();
      };
    }

    const updateSoundUI = (on: boolean) => {
      const btnSound = document.getElementById('btn-sound');
      if (btnSound) {
        btnSound.innerHTML = `
          <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
            ${on ? '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>' : '<line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>'}
          </svg>
          <span id="sound-text">SOUND: ${on ? 'ON' : 'OFF'}</span>
        `;
      }
      const btnHudSound = document.getElementById('btn-hud-sound');
      if (btnHudSound) {
        btnHudSound.innerHTML = `
          <svg class="hud-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
            ${on ? '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>' : '<line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>'}
          </svg>
        `;
      }
    };

    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.onclick = () => {
        const on = soundFX.toggleMute();
        updateSoundUI(on);
      };
    }

    const btnHudSound = document.getElementById('btn-hud-sound');
    if (btnHudSound) {
      btnHudSound.onclick = () => {
        const on = soundFX.toggleMute();
        updateSoundUI(on);
      };
    }

    updateSoundUI(!soundFX.muted);

    const btnSlot1 = document.getElementById('weapon-slot-1');
    if (btnSlot1) {
      btnSlot1.onclick = () => {
        if (this.state === 'playing' && this.player && !this.player.dead) {
          this.player.switchWeapon(1);
        }
      };
    }

    const btnSlot2 = document.getElementById('weapon-slot-2');
    if (btnSlot2) {
      btnSlot2.onclick = () => {
        if (this.state === 'playing' && this.player && !this.player.dead) {
          this.player.switchWeapon(2);
        }
      };
    }

    const btnVolley = document.getElementById('skill-btn-volley');
    if (btnVolley) {
      btnVolley.onclick = () => {
        if (this.state === 'playing') this.triggerArrowVolley();
      };
    }

    const btnFrost = document.getElementById('skill-btn-frost');
    if (btnFrost) {
      btnFrost.onclick = () => {
        if (this.state === 'playing') this.triggerFrostNova();
      };
    }

    const btnNuke = document.getElementById('skill-btn-nuke');
    if (btnNuke) {
      btnNuke.onclick = () => {
        if (this.state === 'playing') this.triggerNukeStrike();
      };
    }

    const btnLightning = document.getElementById('skill-btn-lightning') || document.getElementById('skill-btn-freeze');
    if (btnLightning) {
      btnLightning.onclick = () => {
        if (this.state === 'playing') this.triggerChainLightning();
      };
    }

    const btnAegis = document.getElementById('skill-btn-aegis');
    if (btnAegis) {
      btnAegis.onclick = () => {
        if (this.state === 'playing') this.triggerDivineAegis();
      };
    }

    const btnMobileJump = document.getElementById('mobile-jump-btn');
    if (btnMobileJump) {
      const doJump = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
        try { soundFX.ensure(); } catch {}
        if (this.state === 'playing' && this.player && !this.player.dead) {
          this.player.triggerJump();
        }
      };
      btnMobileJump.addEventListener('touchstart', doJump, { passive: false });
      btnMobileJump.addEventListener('click', doJump);
    }

    window.addEventListener('keydown', e => {
      // Don't trigger game shortcuts if typing inside text inputs or selects
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyP' || key === 'p' || code === 'Escape' || key === 'escape') {
        if (this.state === 'playing' || this.state === 'pause') {
          e.preventDefault();
          this.togglePause();
          return;
        }
      }

      if (this.state === 'playing' && this.player && !this.player.dead) {
        if (code === 'Digit1' || key === '1') {
          e.preventDefault();
          this.player.switchWeapon(1);
        } else if (code === 'Digit2' || key === '2') {
          e.preventDefault();
          this.player.switchWeapon(2);
        } else if (code === 'KeyQ' || key === 'q') {
          e.preventDefault();
          this.player.switchWeapon(); // Quick-swap between Primary and Secondary
        } else if (code === 'KeyF' || key === 'f') {
          e.preventDefault();
          this.triggerArrowVolley();
        } else if (code === 'KeyE' || key === 'e') {
          e.preventDefault();
          this.triggerFrostNova();
        } else if (code === 'KeyR' || key === 'r') {
          e.preventDefault();
          this.triggerNukeStrike();
        } else if (code === 'KeyT' || key === 't') {
          e.preventDefault();
          this.triggerChainLightning();
        } else if (code === 'KeyG' || key === 'g') {
          e.preventDefault();
          this.triggerDivineAegis();
        }
      }

      if (this.state === 'shop' && (code === 'Space' || code === 'Enter' || key === ' ' || key === 'enter')) {
        e.preventDefault();
        document.getElementById('btn-next-wave')?.click();
      }
    });
  }

  public restartWave(): void {
    this.waveCompleting = false;
    this.waveCompleteDelay = 0;
    this.zombies.forEach(z => z.destroy());
    this.zombies = [];
    this.arrows.forEach(a => a.destroy());
    this.arrows = [];
    this.pickups = [];
    this.bodyGibs = [];
    this.groundStains = [];
    this.bloodMists = [];
    if (this.player) {
      this.player.revive(this.tower.topY, this.tower.x);
      this.player.hp = this.player.maxHP;
    }
    if (this.tower) {
      this.tower.hp = this.tower.maxHP;
    }
    this.state = 'playing';
    uiManager.setState('playing');
    this.wave = Math.max(0, this.wave - 1);
    this.startNextWave();
  }

  public startGame(mode?: GameMode): void {
    if (mode) this.gameMode = mode;
    this.tower = new Tower(this);
    this.tower.hp = this.tower.maxHP;
    this.wave = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.waveFeaturedSpawned = false;
    this.waveCompleting = false;
    this.waveCompleteDelay = 0;

    this.zombies.forEach(z => z.destroy());
    this.zombies = [];
    this.arrows.forEach(a => a.destroy());
    this.arrows = [];
    this.pickups = [];
    this.bodyGibs = [];
    this.groundStains = [];
    this.bloodMists = [];
    this.vortices = [];
    this.floatingTexts = [];
    this.pitchPits = [];
    this.gunpowderBarrels = [];

    if (this.player && this.player.ragdoll) {
      try {
        this.matter.world.remove(this.player.ragdoll.composite);
      } catch (err) {}
    }
    this.player = new Player(this, 'player1', this.tower.x, this.tower.topY);

    if (this.gameMode === 'endless') {
      // ── Endless Mode: 2x Stamina Increase & slightly decreased consumption costs ──
      this.player.setEndlessMode(true);
      if (this.tower) {
        this.tower.maxHP = 300;
        this.tower.hp = 300;
      }
      this.hasVolleyUnlocked = false;
      this.hasFrostNovaUnlocked = false;
      this.volleyMaxCooldown = 24;
      this.volleyArrowCount = 28;
      this.frostNovaMaxCooldown = 28;
      this.frostNovaDuration = 4.5;
      this.frostNovaDamage = 0;
      // Upgrades start fresh from the beginning (Level 0, unbought)
      // In-game progression only: starts fresh at Level 0 with standard bow and 0 skulls.
      this.upgrades = createUpgradeCatalog();
      this.equippedBow = 'normal';
      this.primaryBow = 'normal';
      this.secondaryBow = 'normal';
      this.player.primaryBow = 'normal';
      this.player.secondaryBow = 'normal';
      this.player.activeSlot = 1;
      this.player.bowType = 'normal';
      this.player.arrowDamage = this.player.getBowBaseDamage('normal');
      this.player.skulls = 0;
      this.endlessSkullsBanked = 0;
      this.wave = 0;
      if (this.currentSkin) this.player.currentSkin = this.currentSkin;
      // Do NOT apply outside campaign upgrades!
    } else {
      this.player.setEndlessMode(false);
      if (this.tower) {
        this.tower.maxHP = 360;
        this.tower.hp = 360;
      }
      // ── Campaign Mode: Load persistent upgrades and equipped gear ──
      this.loadGameData();
      const currentSkulls = (this.player && typeof this.player.skulls === 'number' && this.player.skulls > 0) ? this.player.skulls : 40;
      this.player.skulls = currentSkulls;
      this.player.primaryBow = this.primaryBow || 'normal';
      this.player.secondaryBow = this.secondaryBow || 'normal';
      this.player.activeSlot = 1;
      this.player.bowType = this.player.primaryBow;
      this.player.arrowDamage = this.player.getBowBaseDamage(this.player.bowType);
      if (this.currentSkin) this.player.currentSkin = this.currentSkin;
      this.applyPurchasedUpgrades();
      const startW = (this.campaignWave && this.campaignWave > 1 && !this.campaignCompleted) ? (this.campaignWave - 1) : 0;
      this.wave = startW;
    }

    if (this.tower) {
      this.tower.hp = this.tower.maxHP;
    }

    this.state = 'playing';
    uiManager.setState('playing');

    // Reset Active Ultimate Skills
    this.volleyCooldown = 0;
    this.frostNovaCooldown = 0;
    this.volleyBarrageRemaining = 0;
    this.volleyBarrageTimer = 0;
    this.updateSkillsHUD();
    this.updateWeaponHUD();
    uiManager.updateHUD(this.player, this.tower, this.wave, 0, this.kills, this.gameMode);

    this.startNextWave();
  }

  public showVictoryScreen(): void {
    crazyGames.gameplayStop();
    crazyGames.happyTime();
    this.campaignCompleted = true;
    this.campaignWave = 1;
    this.saveGameData();
    this.state = 'victory';
    soundFX.playGemCollect();
    soundFX.playBowRelease(0.5);
    uiManager.setState('victory');
    const vKills = document.getElementById('vic-kills');
    if (vKills) vKills.textContent = `${this.kills}`;
    const vGems = document.getElementById('vic-gems');
    if (vGems) vGems.textContent = `${this.player.skulls}`;
    const vWave = document.getElementById('vic-wave');
    if (vWave) vWave.textContent = `20 / 20`;
  }

  public startNextWave(): void {
    crazyGames.gameplayStart();
    this.waveCompleting = false;
    this.waveCompleteDelay = 0;
    // ── Clean up all dead zombie corpses, stuck arrows, and lingering hazards from previous wave! ──
    for (const z of this.zombies) {
      try {
        if (z.dead) z.destroy();
      } catch (e) {}
    }
    this.zombies = this.zombies.filter(z => !z.dead);

    for (const a of this.arrows) {
      try {
        if (a.stuck) a.destroy();
      } catch (e) {}
    }
    this.arrows = this.arrows.filter(a => !a.stuck);
    this.enemyHazards = [];
    this.setupBattlefieldHazards(true);

    this.waveFeaturedSpawned = false;
    if (this.player && this.player.hasSecondWind) {
      this.player.secondWindReady = true;
    }
    this.wave++;
    if (this.gameMode === 'endless') {
      // Original unnerfed Endless Mode swarm sizes and spawn pacing
      this.enemiesToSpawn = 4 + Math.floor(this.wave * 2.8);
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(0.40, 1.2 - this.wave * 0.055);
    } else {
      // Calibrated easier Campaign Mode swarm sizes and spawn pacing
      this.enemiesToSpawn = 3 + Math.floor(this.wave * 2.1);
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(0.60, 1.35 - this.wave * 0.040);
    }
    this.totalEnemiesThisWave = this.enemiesToSpawn;
    this.bigZombiesSpawnedThisWave = 0;

    const configs: Record<number, { title: string; desc: string }> = {
      1: { title: 'STAGE 1: ROTTEN WALKERS', desc: 'Slow shamblers approaching the fortress! Aim for the head!' },
      2: { title: 'STAGE 2: FERAL CRAWLERS', desc: 'Low quadrupeds lunging on all fours! Aim low to sever legs!' },
      3: { title: 'STAGE 3: ARMORED BUCKETHEADS', desc: 'Heavy iron buckets deflect headshots! Crack armor or target limbs!' },
      4: { title: 'STAGE 4: VOLATILE BLOATERS', desc: 'Corrosive acid spitters! Detonates in a toxic blast upon death!' },
      5: { title: 'STAGE 5: SKELETON ARCHERS', desc: 'Ancient crypt marksmen shooting bone arrows! Press [SPACE] to air-dodge!' },
      6: { title: 'STAGE 6: DARK NECROMANCERS', desc: 'Cursed sorcerers casting shadow skulls and raising minions!' },
      7: { title: 'STAGE 7: SHIELDED CENTURIONS', desc: 'Heavy iron shields block torso arrows! Shoot feet or arc for headshots!' },
      8: { title: 'STAGE 8: CLEAVER BERSERKERS', desc: 'Dual-wielding cleavers! Enters fiery Blood Rage under 50% HP!' },
      9: { title: 'STAGE 9: CRYO FROST WIGHTS', desc: 'Glacial frozen horrors immune to ice! Throws freezing ice shards!' },
      10: { title: 'STAGE 10: GARGANTUAR TITAN (MID-BOSS)', desc: 'Colossal behemoth crusher! Aim for the head with elemental arrows!' },
      11: { title: 'STAGE 11: PHANTOM WRAITHS', desc: 'Ethereal undead! Phase-blinks through arrows and screeches piercing sonic waves!' },
      12: { title: 'STAGE 12: INFERNAL IMMOLATORS', desc: 'Molten magma bombers immune to fire! Hurls bouncing fiery firebombs!' },
      13: { title: 'STAGE 13: SHADOW STALKERS', desc: 'Ultra-fast mantis predators lunging forward with razor shadow blades!' },
      14: { title: 'STAGE 14: DREAD JUGGERNAUTS', desc: 'Ironclad fortress crushers! 50% body armor deflection & unstoppable Ram Charge!' },
      15: { title: 'STAGE 15: TRI-TITAN ABYSSAL SIEGE (BOSS FIGHT)', desc: '3 Colossal Abyssal Lich Kings emerge! Rains cosmic meteors and commands elite undead legions!' },
      16: { title: 'STAGE 16: CORPSE SIREN BANSHEES', desc: 'Ultrasonic banshees emitting deafening shrieks and unleashing Horde Frenzy to empower all undead!' },
      17: { title: 'STAGE 17: PLAGUE HARVESTERS', desc: 'Twin-cleaver executioners with Soul Leech! They instantly heal when nearby undead fall!' },
      18: { title: 'STAGE 18: CAUSTIC ACID SLOBBERS', desc: 'Colossal blubber mutants with 45% arrow resistance! Lobs caustic clusters and bursts into toxic clouds!' },
      19: { title: 'STAGE 19: VOID REVENANT WARMASTERS', desc: 'Obsidian armored warlords with Runic Shields! Phase-blinks through space and slashes with Abyssal Rifts!' },
      20: { title: 'STAGE 20: PENTA-TITAN APEX REIGN (FINAL GOD BOSS)', desc: '5 Grand Apex Eldritch Titans led by Malakor! Cataclysmic void storms, seismic stomps, and apocalyptic might!' },
    };

    let endlessTitle = `NIGHT ${this.wave}: INFINITE SIEGE`;
    let endlessDesc = 'Endless mode! The undead horde grows faster, stronger, and more relentless!';
    if (this.wave >= 10 && this.wave % 5 === 0) {
      const targetBigZombies = this.getTargetBigZombiesForWave(this.wave);
      endlessTitle = `NIGHT ${this.wave}: 👑 ${targetBigZombies}-TITAN APOCALYPSE (BOSS FIGHT)`;
      endlessDesc = `${targetBigZombies} Colossal Apex Titans march upon the fortress with catastrophic destructive power!`;
    }

    const defaultEndlessCfg = {
      title: endlessTitle,
      desc: endlessDesc
    };
    const isBlood = this.isBloodMoon();
    if (isBlood) {
      soundFX.playThunderStrike();
      this.cameras.main.flash(500, 200, 30, 45, true);
      this.shakeScreen(9, 0.35);
      this.spawnFloatingText('🩸 BLOOD MOON ECLIPSE RISES! 🩸', this.cameras.main.width * 0.5, 140, '#ff1744', 32);
    }

    const cfg = (this.gameMode === 'campaign' ? configs[this.wave] : null) || defaultEndlessCfg;
    const finalTitle = isBlood ? `🩸 BLOOD MOON: ${cfg.title}` : cfg.title;
    const finalDesc = isBlood ? `🩸 3X SKULLS! Demonic Undead (+20% Speed)! ${cfg.desc}` : cfg.desc;

    uiManager.showWaveAnnouncement(this.wave, finalTitle, finalDesc, isBlood);
    uiManager.updateHUD(this.player, this.tower, this.wave, this.enemiesToSpawn, this.kills, this.gameMode);
  }

  public togglePause(): void {
    if (this.state === 'playing') {
      crazyGames.gameplayStop();
      this.state = 'pause';
      uiManager.setState('pause');
      const waveEl = document.getElementById('pause-wave');
      if (waveEl) waveEl.textContent = `${this.wave}`;
      const enEl = document.getElementById('pause-enemies');
      if (enEl) enEl.textContent = `${this.zombies.filter(z => !z.dead).length + this.enemiesToSpawn}`;
      const skEl = document.getElementById('pause-skulls');
      if (skEl) skEl.textContent = `${this.player.skulls}`;
    } else if (this.state === 'pause') {
      crazyGames.gameplayStart();
      this.state = 'playing';
      uiManager.setState('playing');
    }
  }

  public openShop(): void {
    crazyGames.gameplayStop();
    uiManager.shopOpenedFromMenu = false;
    // Clean up dead bodies immediately when entering shop
    for (const z of this.zombies) {
      if (z.dead) z.destroy();
    }
    this.zombies = this.zombies.filter(z => !z.dead);
    for (const a of this.arrows) {
      if (a.stuck) a.destroy();
    }
    this.arrows = this.arrows.filter(a => !a.stuck);
    this.enemyHazards = [];

    this.state = 'shop';
    uiManager.setState('shop');
    uiManager.buildShop(this.upgrades, this.player, this.tower, this.wave, () => {
      this.saveGameData();
      uiManager.updateHUD(this.player, this.tower, this.wave, 0, this.kills, this.gameMode);
    });
  }

  public updateHomeUpgradesBtn(): void {
    const btn = document.getElementById('btn-menu-upgrades');
    if (!btn) return;
    const badge = btn.querySelector('.nav-badge-pill') as HTMLElement;
    if (this.gameMode === 'endless') {
      btn.classList.add('endless-locked');
      if (badge) {
        badge.textContent = 'IN-GAME ONLY';
        badge.style.background = '#e50914';
        badge.style.color = '#ffffff';
        badge.style.boxShadow = '0 0 12px rgba(229, 9, 20, 0.85)';
      }
    } else {
      btn.classList.remove('endless-locked');
      if (badge) {
        badge.textContent = 'CAMPAIGN';
        badge.style.background = '#e50914';
        badge.style.color = '#ffffff';
        badge.style.boxShadow = '0 0 12px rgba(229, 9, 20, 0.85)';
      }
    }
  }

  public showEndlessMenuNotice(): void {
    soundFX.playArmorHit();
    const existing = document.getElementById('endless-menu-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'endless-menu-toast';
    toast.className = 'endless-toast-banner';
    toast.innerHTML = '⚡ <b>ENDLESS MODE:</b> All upgrades start from the beginning and are unlocked <b>in-game only</b> between nights!';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  public onSkullCollected(val: number): void {
    if (this.gameMode === 'endless') {
      this.endlessRunSkullsEarned += val;
    }
    const gemCount = document.getElementById('gem-count');
    if (gemCount && this.player) {
      gemCount.textContent = `${this.player.skulls}`;
    }
    const mCount = document.getElementById('menu-skulls-count');
    if (mCount && this.player) {
      mCount.textContent = `${this.player.skulls}`;
    }
    const hudGems = document.getElementById('hud-gems');
    if (hudGems) {
      hudGems.classList.add('pulse');
      setTimeout(() => hudGems.classList.remove('pulse'), 150);
    }
  }

  public bankEndlessSkulls(): void {
    if (this.gameMode !== 'endless') return;
    try {
      const dataStr = crazyGames.getItem('ragdoll_archers_save_v1');
      const existingData = dataStr ? JSON.parse(dataStr) : {};

      const unbanked = Math.max(0, this.endlessRunSkullsEarned - this.endlessRunSkullsBanked);
      if (unbanked > 0) {
        const curSkulls = typeof existingData.skulls === 'number' ? existingData.skulls : 40;
        existingData.skulls = curSkulls + unbanked;
        this.endlessRunSkullsBanked = this.endlessRunSkullsEarned;
      }
      if (this.wave > (existingData.endlessBestWave || 0)) {
        existingData.endlessBestWave = this.wave;
        this.endlessBestWave = this.wave;
      }
      existingData.soundMuted = soundFX.muted;
      existingData.gameMode = this.gameMode;
      crazyGames.setItem('ragdoll_archers_save_v1', JSON.stringify(existingData));
    } catch (e) {}
  }

  public returnToMenu(): void {
    crazyGames.gameplayStop();
    // 1. If ending an active endless run, bank all earned skulls and update peak wave
    if (this.gameMode === 'endless') {
      this.bankEndlessSkulls();
    }

    // 2. Clear lingering game objects from battlefield
    for (const z of this.zombies) {
      try { z.destroy(); } catch (e) {}
    }
    this.zombies = [];
    for (const a of this.arrows) {
      try { a.destroy(); } catch (e) {}
    }
    this.arrows = [];
    this.pickups = [];
    this.vortices = [];
    this.floatingTexts = [];
    this.pitchPits = [];
    this.gunpowderBarrels = [];
    this.enemyHazards = [];

    // 3. Switch state
    this.state = 'menu';
    uiManager.setState('menu');

    // 4. Reload persistent campaign data (skulls, equipment, upgrades)
    this.loadGameData(false);

    // 5. Update UI counters and buttons
    this.updateHomeUpgradesBtn();
    this.updateMenuSkullsUI();
  }

  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    if (this.player) {
      this.player.setEndlessMode(mode === 'endless');
    }
    this.saveGameData();
    this.updateHomeUpgradesBtn();
    this.updateMenuSkullsUI();
  }

  public openShopFromMenu(): void {
    if (this.gameMode === 'endless') {
      this.showEndlessMenuNotice();
      return;
    }
    this.state = 'shop';
    uiManager.shopOpenedFromMenu = true;
    this.loadGameData(false);
    uiManager.setState('shop');
    uiManager.buildShop(this.upgrades, this.player, this.tower, this.wave, () => {
      this.saveGameData();
      this.updateMenuSkullsUI();
    });
  }

  public openWardrobeFromMenu(): void {
    this.state = 'wardrobe';
    uiManager.shopOpenedFromMenu = true;
    this.loadGameData(false);
    uiManager.buildWardrobe(this.player, this);
    uiManager.setState('wardrobe');
  }

  public loadGameData(restoreMode: boolean = false): void {
    let dataStr: string | null = null;
    try {
      dataStr = crazyGames.getItem('ragdoll_archers_save_v1');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (typeof data.skulls === 'number' && !isNaN(data.skulls) && this.player) {
          // Normalize inflated skulls caused by previous reload doubling bug
          if (data.skulls > 50000) {
            this.player.skulls = 1000;
          } else {
            this.player.skulls = Math.max(0, data.skulls);
          }
        }
        if (typeof data.campaignWave === 'number') {
          this.campaignWave = Math.max(1, Math.min(20, data.campaignWave));
        }
        if (typeof data.highestCampaignWave === 'number') {
          this.highestCampaignWave = Math.max(1, data.highestCampaignWave);
        }
        if (typeof data.endlessBestWave === 'number') {
          this.endlessBestWave = Math.max(0, data.endlessBestWave);
        }
        if (typeof data.campaignCompleted === 'boolean') {
          this.campaignCompleted = data.campaignCompleted;
        }
        if (restoreMode && (data.gameMode === 'campaign' || data.gameMode === 'endless')) {
          this.gameMode = data.gameMode;
        }

        const soundStorage = crazyGames.getItem('ragdoll_archers_sound_muted');
        if (soundStorage !== null) {
          soundFX.muted = soundStorage === 'true';
        } else if (typeof data.soundMuted === 'boolean') {
          soundFX.muted = data.soundMuted;
        }

        if (data.primaryBow) {
          const bow = (data.primaryBow === 'vampire' ? 'normal' : data.primaryBow);
          this.primaryBow = bow;
          if (this.player) this.player.primaryBow = bow;
        } else if (data.equippedBow) {
          const bow = (data.equippedBow === 'vampire' ? 'normal' : data.equippedBow);
          this.primaryBow = bow;
          if (this.player) this.player.primaryBow = bow;
        }
        if (data.secondaryBow) {
          const bow2 = (data.secondaryBow === 'vampire' ? 'normal' : data.secondaryBow);
          this.secondaryBow = bow2;
          if (this.player) this.player.secondaryBow = bow2;
        }
        const activeBow = this.player ? (this.player.activeSlot === 1 ? this.player.primaryBow : this.player.secondaryBow) : (this.primaryBow || 'normal');
        this.equippedBow = activeBow;
        if (this.player) {
          this.player.bowType = activeBow;
          this.player.arrowDamage = this.player.getBowBaseDamage(activeBow);
        }
        if (data.currentSkin) {
          this.currentSkin = data.currentSkin;
          if (this.player) this.player.currentSkin = data.currentSkin;
        }
        if (Array.isArray(data.unlockedSkins)) {
          this.unlockedSkins = data.unlockedSkins;
        } else {
          this.unlockedSkins = ['default'];
        }
        // Migrate any previously purchased skin from saved upgrades
        if (Array.isArray(data.upgrades)) {
          data.upgrades.forEach((u: any) => {
            if (u.id?.startsWith('skin_') && u.bought) {
              const skinKey = u.id.replace('skin_', '');
              if (!this.unlockedSkins.includes(skinKey)) {
                this.unlockedSkins.push(skinKey);
              }
            }
          });
        }
        if (!this.unlockedSkins.includes(this.currentSkin)) {
          this.unlockedSkins.push(this.currentSkin);
        }
        if (Array.isArray(data.upgrades)) {
          data.upgrades = data.upgrades.filter((u: any) => u.id !== 'trebuchet');
        }
        if (Array.isArray(data.upgrades) && this.upgrades) {
          data.upgrades.forEach((saved: any) => {
            const found = this.upgrades.find(u => u.id === saved.id || (saved.id === 'cryo' && u.id === 'ice'));
            if (found) {
              found.bought = saved.bought;
              found.level = saved.level || 0;
            }
          });
        }
        if (this.player) {
          if (typeof data.nukeCharges === 'number') this.player.nukeCharges = data.nukeCharges;
          if (typeof data.lightningCharges === 'number') this.player.lightningCharges = data.lightningCharges;
          else if (typeof data.timeFreezeCharges === 'number') this.player.lightningCharges = data.timeFreezeCharges;
          if (typeof data.divineAegisCharges === 'number') this.player.divineAegisCharges = data.divineAegisCharges;
        }
        if (typeof data.hasVolleyUnlocked === 'boolean') {
          this.hasVolleyUnlocked = data.hasVolleyUnlocked;
        }
        if (typeof data.hasFrostNovaUnlocked === 'boolean') {
          this.hasFrostNovaUnlocked = data.hasFrostNovaUnlocked;
        }
        if (this.upgrades) {
          const vu = this.upgrades.find(u => u.id === 'unlockVolley');
          if (vu && this.hasVolleyUnlocked) vu.bought = true;
          const fu = this.upgrades.find(u => u.id === 'unlockFrostNova');
          if (fu && this.hasFrostNovaUnlocked) fu.bought = true;
        }
      }
    } catch (e) {}

    // Starter Bounty: 40 Skulls for new players (or if save has no skulls)
    if (!dataStr && this.player) {
      this.player.skulls = 40;
      this.saveGameData();
    } else if (this.player && (this.player.skulls === undefined || this.player.skulls === 0)) {
      this.player.skulls = 40;
      this.saveGameData();
    }

    this.updateMenuSkullsUI();
    this.updateWeaponHUD();
  }

  public saveGameData(): void {
    try {
      const dataStr = crazyGames.getItem('ragdoll_archers_save_v1');
      const existingData = dataStr ? JSON.parse(dataStr) : {};

      // In endless mode during active gameplay/shop/gameover:
      // Only bank skulls earned and record endlessBestWave.
      // NEVER overwrite campaign upgrades or campaign bow inventory!
      if (this.gameMode === 'endless' && (this.state === 'playing' || this.state === 'gameover' || this.state === 'shop')) {
        this.bankEndlessSkulls();
        this.updateMenuSkullsUI();
        return;
      }

      const pBow = this.player ? this.player.primaryBow : (this.primaryBow || 'normal');
      const sBow = this.player ? this.player.secondaryBow : (this.secondaryBow || 'normal');
      const currentBow = this.player ? this.player.bowType : (this.equippedBow || pBow);

      if (this.gameMode === 'campaign' && this.wave > 0 && !this.campaignCompleted) {
        this.campaignWave = Math.min(20, this.wave);
        this.highestCampaignWave = Math.max(this.highestCampaignWave || 1, this.wave);
      }

      // Persistent Skulls:
      let savedSkulls: number;
      if (this.player && typeof this.player.skulls === 'number' && (this.gameMode === 'campaign' || this.state === 'menu' || this.state === 'wardrobe')) {
        savedSkulls = Math.max(0, this.player.skulls);
      } else if (typeof existingData.skulls === 'number') {
        savedSkulls = Math.max(0, existingData.skulls);
      } else {
        savedSkulls = 40;
      }

      // Safeguard campaign upgrades: never overwrite with blank endless upgrades
      let upgradesToSave = existingData.upgrades;
      if (this.gameMode === 'campaign' || (this.state === 'menu' && this.upgrades && this.upgrades.length > 0)) {
        const hasBought = this.upgrades.some(u => u.bought || (u.level && u.level > 0));
        if (hasBought || !Array.isArray(existingData.upgrades) || existingData.upgrades.length === 0) {
          upgradesToSave = this.upgrades.map(u => ({ id: u.id, bought: u.bought, level: u.level || 0 }));
        }
      }

      const data = {
        version: 1,
        skulls: savedSkulls,
        equippedBow: (this.gameMode === 'campaign' || this.state === 'menu') ? currentBow : (existingData.equippedBow || 'normal'),
        primaryBow: (this.gameMode === 'campaign' || this.state === 'menu') ? pBow : (existingData.primaryBow || 'normal'),
        secondaryBow: (this.gameMode === 'campaign' || this.state === 'menu') ? sBow : (existingData.secondaryBow || 'normal'),
        currentSkin: this.player ? this.player.currentSkin : (this.currentSkin || 'default'),
        unlockedSkins: this.unlockedSkins,
        nukeCharges: this.player ? (this.player.nukeCharges || 0) : (existingData.nukeCharges || 0),
        lightningCharges: this.player ? (this.player.lightningCharges || 0) : (existingData.lightningCharges || 0),
        timeFreezeCharges: this.player ? (this.player.lightningCharges || 0) : (existingData.lightningCharges || 0),
        divineAegisCharges: this.player ? (this.player.divineAegisCharges || 0) : (existingData.divineAegisCharges || 0),
        hasVolleyUnlocked: this.hasVolleyUnlocked || (existingData.hasVolleyUnlocked ?? false),
        hasFrostNovaUnlocked: this.hasFrostNovaUnlocked || (existingData.hasFrostNovaUnlocked ?? false),
        campaignWave: this.campaignWave || existingData.campaignWave || 1,
        highestCampaignWave: this.highestCampaignWave || existingData.highestCampaignWave || 1,
        endlessBestWave: Math.max(this.endlessBestWave || 0, existingData.endlessBestWave || 0),
        campaignCompleted: this.campaignCompleted || existingData.campaignCompleted || false,
        gameMode: this.gameMode,
        soundMuted: soundFX.muted,
        upgrades: upgradesToSave || []
      };

      crazyGames.setItem('ragdoll_archers_save_v1', JSON.stringify(data));
      this.updateMenuSkullsUI();
    } catch (e) {}
  }

  public resetAllProgress(): void {
    try {
      crazyGames.removeItem('ragdoll_archers_save_v1');
    } catch (e) {}

    // 1. Reset Upgrades to baseline
    this.upgrades = createUpgradeCatalog();

    // 2. Reset Player Stats & Gear
    if (this.player) {
      this.player.skulls = 40;
      this.player.primaryBow = 'normal';
      this.player.secondaryBow = 'normal';
      this.player.bowType = 'normal';
      this.player.activeSlot = 1;
      this.player.currentSkin = 'default';
      this.player.arrowDamage = this.player.getBowBaseDamage('normal');
      this.player.maxHP = 115;
      this.player.hp = 115;
      this.player.stamina = 100;
      this.player.maxStamina = 100;
      this.player.arrowSpeed = 1250;
      this.player.damageMul = 1;
      this.player.chargeSpeedMul = 1;
      this.player.nukeCharges = 0;
      this.player.lightningCharges = 0;
      this.player.divineAegisCharges = 0;
      this.player.invincible = false;
    }

    // 3. Reset Scene State
    this.primaryBow = 'normal';
    this.secondaryBow = 'normal';
    this.equippedBow = 'normal';
    this.currentSkin = 'default';
    this.unlockedSkins = ['default'];
    this.hasVolleyUnlocked = false;
    this.hasFrostNovaUnlocked = false;
    this.campaignWave = 1;
    this.wave = 1;
    this.highestCampaignWave = 1;
    this.endlessBestWave = 0;
    this.campaignCompleted = false;

    // 4. Reset Tower
    if (this.tower) {
      this.tower.maxHP = 360;
      this.tower.hp = 360;
      this.tower.hasSpikes = false;
      this.tower.hasCaltrops = false;
      this.tower.hasTarMoat = false;
      this.tower.hasPitchPits = false;
      this.tower.hasGunpowderBarrels = false;
      this.tower.sentryLevel = 0;
      this.tower.hasBanner = false;
      this.tower.damageReduction = 0;
      this.tower.hpRegen = 0;
    }

    // 5. Persist clean baseline data
    this.saveGameData();

    // 6. Refresh UI Counters & Labels
    this.updateMenuSkullsUI();
    this.updateWeaponHUD();
    this.updateHomeUpgradesBtn();

    const btnPlayText = document.getElementById('btn-play-text');
    if (btnPlayText) btnPlayText.textContent = 'NEW GAME';
    const btnPlayBadge = document.getElementById('btn-play-badge');
    if (btnPlayBadge) {
      btnPlayBadge.textContent = 'NIGHT 1';
      btnPlayBadge.classList.add('hidden');
    }
    const btnRestartCamp = document.getElementById('btn-restart-campaign');
    if (btnRestartCamp) btnRestartCamp.classList.add('hidden');
    const campSub = document.getElementById('campaign-mode-sub');
    if (campSub) campSub.textContent = '20 Escalating Nights';

    // 7. Refresh View if inside Shop, Wardrobe or Paused
    if (this.state === 'shop') {
      uiManager.buildShop(this.upgrades, this.player, this.tower, this.wave, () => {
        this.saveGameData();
        this.updateMenuSkullsUI();
      });
    } else if (this.state === 'wardrobe') {
      uiManager.buildWardrobe(this.player, this);
    } else if (this.state === 'pause') {
      this.returnToMenu();
    }

    soundFX.playArmorHit();
    this.showResetSuccessToast();
  }

  public showResetSuccessToast(): void {
    const existing = document.getElementById('reset-toast-banner');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'reset-toast-banner';
    toast.className = 'endless-toast-banner';
    toast.style.borderColor = '#10b981';
    toast.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.5)';
    toast.innerHTML = '<b>ALL PROGRESS RESET:</b> Started completely fresh with 40 starter skulls!';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  public updateMenuSkullsUI(): void {
    const currentSkulls = (this.player && typeof this.player.skulls === 'number') ? this.player.skulls : 50;
    const el = document.getElementById('menu-skulls-count');
    if (el) {
      el.textContent = `${currentSkulls}`;
    }
    const wardEl = document.getElementById('wardrobe-skulls');
    if (wardEl) {
      wardEl.textContent = `${currentSkulls}`;
    }
    const btnPlayText = document.getElementById('btn-play-text');
    const btnPlayBadge = document.getElementById('btn-play-badge');
    if (btnPlayText) {
      if (this.gameMode === 'endless') {
        btnPlayText.textContent = 'START ENDLESS';
        if (btnPlayBadge) btnPlayBadge.classList.add('hidden');
      } else {
        if (this.campaignWave > 1 && !this.campaignCompleted) {
          btnPlayText.textContent = 'CONTINUE';
          if (btnPlayBadge) {
            btnPlayBadge.textContent = `NIGHT ${this.campaignWave}`;
            btnPlayBadge.classList.remove('hidden');
          }
        } else {
          btnPlayText.textContent = 'NEW GAME';
          if (btnPlayBadge) btnPlayBadge.classList.add('hidden');
        }
      }
    }
    const btnRestartCamp = document.getElementById('btn-restart-campaign');
    if (btnRestartCamp) {
      if (this.gameMode === 'campaign' && this.campaignWave > 1 && !this.campaignCompleted) {
        btnRestartCamp.classList.remove('hidden');
      } else {
        btnRestartCamp.classList.add('hidden');
      }
    }
    const cardCampaign = document.getElementById('card-mode-campaign');
    const cardEndless = document.getElementById('card-mode-endless');
    if (cardCampaign && cardEndless) {
      if (this.gameMode === 'endless') {
        cardEndless.classList.add('active');
        cardCampaign.classList.remove('active');
      } else {
        cardCampaign.classList.add('active');
        cardEndless.classList.remove('active');
      }
    }
    const campSub = document.getElementById('campaign-mode-sub');
    if (campSub) {
      if (this.campaignCompleted) {
        campSub.textContent = 'Campaign Conquered (20/20)';
      } else if (this.campaignWave > 1) {
        campSub.textContent = `Night ${this.campaignWave} of 20 Reached`;
      } else {
        campSub.textContent = '20 Escalating Nights';
      }
    }
    const endSub = document.getElementById('endless-mode-sub');
    if (endSub) {
      if (this.endlessBestWave > 0) {
        endSub.textContent = `Infinite Survival • Best: Night ${this.endlessBestWave}`;
      } else {
        endSub.textContent = 'Infinite Survival • 2X Skulls';
      }
    }
  }

  public applyPurchasedUpgrades(): void {
    if (!this.player || !this.tower || !this.upgrades) return;
    // Reset active tactical masteries to baseline before accumulating levels
    this.volleyMaxCooldown = 24;
    this.volleyArrowCount = 28;
    this.frostNovaMaxCooldown = 28;
    this.frostNovaDuration = 4.5;
    this.frostNovaDamage = 0;
    for (const up of this.upgrades) {
      if (up.bought) {
        if (up.category === 'bows') {
          // Do not overwrite the player's explicitly chosen equipped bow!
          continue;
        }
        if (up.id === 'nukeStrike' || up.id === 'lightningStorm' || up.id === 'timeStop' || up.id === 'godMode') {
          // Tactical charges are stored and spent dynamically, do not re-apply
          continue;
        }
        if (up.maxLevel && (up.level || 0) > 0) {
          for (let l = 0; l < (up.level || 1); l++) {
            up.apply(this.player, this.tower);
          }
        } else {
          up.apply(this.player, this.tower);
        }
      }
    }
    const volleyUp = this.upgrades.find(u => u.id === 'unlockVolley');
    if (volleyUp?.bought || this.hasVolleyUnlocked) {
      this.hasVolleyUnlocked = true;
      if (volleyUp) volleyUp.bought = true;
    }
    const frostUp = this.upgrades.find(u => u.id === 'unlockFrostNova');
    if (frostUp?.bought || this.hasFrostNovaUnlocked) {
      this.hasFrostNovaUnlocked = true;
      if (frostUp) frostUp.bought = true;
    }
    this.updateSkillsHUD();

    // Re-apply player's active equipped bow & skin
    if (this.player) {
      const activeBow = this.player.activeSlot === 1 ? this.player.primaryBow : this.player.secondaryBow;
      if (activeBow) {
        this.player.bowType = activeBow;
        this.player.arrowDamage = this.player.getBowBaseDamage(activeBow);
      }
      if (this.currentSkin) {
        this.player.currentSkin = this.currentSkin;
      }
    }
    this.updateWeaponHUD();
    this.setupBattlefieldHazards(false);
  }

  public triggerSlowMo(scale: number = 0.22, duration: number = 0.4): void {
    this.timeScale = scale;
    this.slowMoTimer = duration;
  }

  public shakeScreen(intensity: number = 8, duration: number = 0.25): void {
    this.cameras.main.shake(duration * 1000, intensity * 0.002);
  }

  public spawnFloatingText(text: string, x: number, y: number, color: string = '#ffd700', size: number = 20): void {
    this.floatingTexts.push({
      text, x, y,
      vx: (Math.random() - 0.5) * 40,
      vy: -90,
      color, size,
      life: 0.8,
      maxLife: 0.8,
      scale: 1.0
    });
  }


  public spawnBloaterExplosion(x: number, y: number, tDmg: number = 40, pDmg: number = 22): void {
    this.spawnExplosion(x, y, 160);
    const dTower = Phaser.Math.Distance.Between(x, y, this.tower.x, this.tower.groundY);
    if (dTower < 200) {
      this.tower.takeDamage(tDmg);
      if (!this.player.dead) this.player.takeDamage(pDmg);
    }
  }

  public spawnEnemyProjectile(sx: number, sy: number, tx: number, ty: number, projType: string, dmg: number): void {
    const isBomb = projType === 'fire_bomb' || projType === 'bile_bomb' || projType === 'shadow_blade' || projType === 'shadow_bomb';
    let targetX = tx;
    let targetY = ty;
    if (isBomb) {
      // Siege bombs explicitly target the Tower Barricade structure
      targetX = tx !== undefined ? tx : (this.tower.x + this.tower.width / 2 + 5);
      targetY = ty !== undefined ? ty : (this.tower.topY + 35);
    } else {
      // Projectiles target the Archer hero on the tower deck (chest height: topY - 38)
      const targetChestY = this.tower.topY - 38;
      targetX = this.player ? this.player.x : tx;
      targetY = (ty !== undefined && ty < this.tower.topY - 20) ? ty : targetChestY;
    }

    let ang = Math.atan2(targetY - sy, targetX - sx);
    let effDmg = dmg;

    // Defensive Smoke Screen: 35% accuracy deflection and 35% damage reduction if firing from/through smoke
    const towerFront = this.tower.x + this.tower.width / 2;
    if (this.tower.hasSmokeScreen && sx >= towerFront && sx <= towerFront + 280) {
      ang += (Math.random() - 0.5) * 0.32; // Inaccurate aim through thick smoke
      effDmg *= 0.65;
    }
    let spd = 340;
    let col = 0x00ff88;
    let rad = 14;
    let name = '☣️ ACID BILE';
    let warn = '⚠️ ACID SPIT! [SPACE] JUMP! ⚠️';
    let vRot = 0;
    let gravity = 0;
    let vx = 0;
    let vy = 0;

    if (projType === 'shadow_skull') {
      spd = 350;
      col = 0xa855f7;
      name = '💀 SHADOW SKULL';
      warn = '⚠️ SHADOW SKULL! [SPACE] JUMP! ⚠️';
    } else if (projType === 'bone_arrow') {
      spd = 410;
      col = 0xecf0f1;
      rad = 10;
      name = '🏹 BONE ARROW';
      warn = '⚠️ BONE ARROW! [SPACE] JUMP! ⚠️';
    } else if (projType === 'frost_shard') {
      spd = 360;
      col = 0x00d2d3;
      rad = 12;
      name = '❄️ FROST SHARD';
      warn = '⚠️ FROST SHARD! [SPACE] JUMP! ⚠️';
      vRot = 12;
    } else if (projType === 'bile_bomb') {
      spd = 330;
      col = 0x2ecc71;
      rad = 16;
      name = '💣 BILE BOMB';
      warn = '💣 BILE BOMB! INCOMING AT TOWER! 💣';
      vRot = 6;
      gravity = 420;
    } else if (projType === 'cleaver') {
      spd = 370;
      col = 0xff4757;
      rad = 15;
      name = '🪓 MEAT CLEAVER';
      warn = '⚠️ FLYING CLEAVER! [SPACE] JUMP! ⚠️';
      vRot = 16;
    } else if (projType === 'sonic_screech') {
      spd = 360;
      col = 0xa29bfe;
      rad = 16;
      name = '🔊 SONIC SCREECH';
      warn = '⚠️ SONIC SCREECH! [SPACE] JUMP! ⚠️';
      vRot = 8;
    } else if (projType === 'fire_bomb') {
      spd = 340;
      col = 0xff793f;
      rad = 17;
      name = '🔥 MAGMA FIREBOMB';
      warn = '🔥 FIREBOMB! INCOMING AT TOWER! 🔥';
      vRot = 7;
      gravity = 420;
    } else if (projType === 'shadow_blade' || projType === 'shadow_bomb') {
      spd = 350;
      col = 0xff5252;
      rad = 15;
      name = '💣 SHADOW BOMB';
      warn = '💣 SHADOW BOMB! INCOMING AT TOWER! 💣';
      vRot = 16;
      gravity = 420;
    } else if (projType === 'void_meteor') {
      spd = 270;
      col = 0xa55eea;
      rad = 22;
      name = '☄️ VOID METEOR';
      warn = '☄️ VOID METEOR! [SPACE] JUMP! ☄️';
      vRot = 4;
    } else if (projType === 'dragon_hellfire_meteor') {
      spd = 400;
      col = 0xff3838;
      rad = 24;
      name = '🔥 DRAGON HELLFIRE METEOR';
      warn = '🔥 DRAGON HELLFIRE METEOR! JUMP OR SHOOT! 🔥';
      vRot = 6;
      gravity = 0; // ZERO GRAVITY for laser-direct flight path directly toward target!
    } else if (projType === 'abyssal_slash') {
      spd = 350;
      col = 0x6c5ce7;
      rad = 15;
      name = '🌌 ABYSSAL RIFT SLASH';
      warn = '⚠️ ABYSSAL RIFT! [SPACE] JUMP! ⚠️';
      vRot = 10;
    }

    if (isBomb) {
      const dx = targetX - sx;
      const flightTime = Math.max(0.65, Math.abs(dx) / spd);
      vx = dx / flightTime;
      const dy = targetY - sy;
      vy = (dy - 0.5 * gravity * flightTime * flightTime) / flightTime;
    } else {
      vx = Math.cos(ang) * spd;
      vy = Math.sin(ang) * spd;
    }

    const finalDmg = Math.max(8, Math.round(effDmg));
    this.enemyHazards.push({
      id: 'hazard_' + Date.now() + Math.random(),
      type: 'projectile',
      x: sx,
      y: sy,
      vx,
      vy,
      gravity,
      targetsTower: isBomb,
      damage: finalDmg,
      radius: rad,
      color: col,
      name: name,
      dead: false,
      dodged: false,
      life: 9.5,
      trail: [],
      subType: projType,
      rot: ang,
      vRot
    });
    soundFX.playBowRelease(0.65);
    this.spawnFloatingText(warn, isBomb ? (this.tower.x + 30) : this.player.x, (isBomb ? this.tower.topY - 45 : this.player.y - 70), isBomb ? '#ff793f' : '#2ecc71', 18);
  }

  public spawnDeckShockwave(dmg: number = 35, shockwaveName: string = '⚡ SEISMIC WAVE'): void {
    this.enemyHazards.push({
      id: 'shockwave_' + Date.now(),
      type: 'shockwave',
      x: this.tower.x + this.tower.width / 2 + 10,
      y: this.tower.topY + 6,
      vx: -280,
      vy: 0,
      damage: dmg,
      radius: 22,
      color: 0xf39c12,
      name: shockwaveName,
      dead: false,
      dodged: false,
      life: 3.5,
      trail: []
    });
    this.spawnFloatingText(`⚠️ ${shockwaveName}! JUMP! ⚠️`, this.player.x, this.player.y - 75, '#f39c12', 20);
    this.shakeScreen(10, 0.25);
  }

  public spawnGroundFlameWave(sx: number, sy: number, dmg: number = 38, waveName: string = '🔥 DRAGON CATACLYSM WAVE'): void {
    this.enemyHazards.push({
      id: 'ground_wave_' + Date.now() + Math.random(),
      type: 'shockwave',
      subType: 'ground_flame_wave',
      x: sx,
      y: sy,
      vx: -380,
      vy: 0,
      damage: dmg,
      radius: 28,
      color: 0xff3838,
      name: waveName,
      dead: false,
      dodged: false,
      life: 6.0,
      trail: []
    });
    this.spawnFloatingText(`⚠️ ${waveName}! JUMP OR SHOOT! ⚠️`, this.player.x, this.player.y - 80, '#ff3838', 22);
    this.shakeScreen(14, 0.3);
  }

  public getTargetBigZombiesForWave(wave: number): number {
    if (wave < 10) return 0;
    if (this.gameMode === 'endless') {
      // In Endless mode, milestone waves (every 5 waves) scale endlessly:
      // Wave 10: 1, Wave 15: 3, Wave 20: 5, Wave 25: 7, Wave 30: 9, Wave 35: 11, Wave 40: 13, Wave 50: 17...
      if (wave % 5 === 0) {
        return 1 + Math.round(((wave - 10) / 5) * 2);
      }
      return 0;
    } else {
      // Campaign Mode: exactly 1 in level 10, 3 in level 15, and 5 in level 20
      if (wave === 10) return 1;
      if (wave === 15) return 3;
      if (wave === 20) return 5;
      return 0;
    }
  }

  public getBigZombieTypeForWave(wave: number, index: number, totalBig: number): ZombieType {
    if (wave === 10) return 'boss';
    if (wave === 15) return 'reaper';
    if (wave === 20) {
      const w20Types: ZombieType[] = ['malakor', 'boss', 'reaper', 'boss', 'malakor'];
      return w20Types[index % w20Types.length];
    }
    // Endless mode high milestone waves (25+):
    // Final climax titan of the wave is always Malakor!
    if (index === totalBig - 1) return 'malakor';
    // Opening titan is Malakor on waves 30, 40, 50, etc., otherwise Reaper
    if (index === 0) return wave % 10 === 0 ? 'malakor' : 'reaper';
    // Intermediary titans cycle dynamically between Boss, Reaper, and Malakor
    const cycle: ZombieType[] = ['boss', 'reaper', 'boss', 'malakor', 'reaper'];
    return cycle[index % cycle.length];
  }

  public getMaxAirAttackers(wave: number): number {
    const isBlood = this.isBloodMoon();
    if (wave <= 2) return 1; // Levels 1-2: Up to 1
    if (wave <= 5) return 2; // Levels 3-5: Up to 2
    if (wave <= 9) return 3; // Levels 6-9: Up to 3
    if (wave <= 14) return isBlood ? 4 : 3; // Levels 10-14: Up to 3 (4 on Blood Moon)
    return isBlood ? 5 : 4; // Endgame / Endless: Up to 4 (5 on Blood Moon)
  }

  public spawnZombieMinion(type: ZombieType, x?: number): void {
    const spawnX = x || (this.cameras.main.width + 60);
    let chosenType = type;
    if (Zombie.isAirAttackType(type)) {
      const activeAirCount = this.zombies.filter(z => !z.dead && z.isAirAttacker()).length;
      if (activeAirCount >= this.getMaxAirAttackers(this.wave)) {
        chosenType = 'crawler';
      }
    }
    const z = new Zombie(this, spawnX, this.wave, chosenType);
    this.zombies.push(z);
  }

  public spawnBlackHole(x: number, y: number): void {
    soundFX.playExplosion();
    this.vortices.push({
      x, y,
      r: 175,
      life: 2.2,
      maxLife: 2.2,
      angle: 0
    });
    this.spawnFloatingText('🌀 GRAVITY VORTEX!', x, y - 45, '#a29bfe', 24);
    this.shakeScreen(8, 0.3);
  }

  public spawnSentryArrow(sx: number, sy: number, tx: number, ty: number, dmg: number): void {
    const ang = Math.atan2(ty - sy, tx - sx);
    const spd = 1100;
    this.arrows.push(new Arrow(this, sx, sy, Math.cos(ang) * spd, Math.sin(ang) * spd, 'player1', {
      damage: dmg,
      type: 'normal'
    }));
    soundFX.playBowRelease(0.75);
    this.spawnFloatingText('🎯 SENTRY!', sx, sy - 16, '#ffd700', 14);
  }

  public onPlayerDamage(_amount: number): void {
    uiManager.triggerDamageFlash();
    this.shakeScreen(6, 0.2);
    uiManager.updateHUD(this.player, this.tower, this.wave, this.zombies.length, this.kills, this.gameMode);
  }

  public onTowerDamage(_amount: number): void {
    uiManager.triggerDamageFlash();
    this.shakeScreen(6, 0.2);
    uiManager.updateHUD(this.player, this.tower, this.wave, this.zombies.length, this.kills, this.gameMode);
    if (this.tower.hp <= 0) {
      this.showGameOver('Tower Barricade Overrun!');
    }
  }

  private gameOverTimeout: any = null;

  public onPlayerDeath(): void {
    if (this.gameOverTimeout) clearTimeout(this.gameOverTimeout);
    this.gameOverTimeout = setTimeout(() => {
      this.showGameOver('Archer Slain by Undead!');
    }, 1000);
  }

  public onZombieKilled(z: Zombie): void {
    this.kills++;
    if (this.player.adrenalineLevel > 0) {
      this.player.adrenalineTimer = 3.5;
      this.spawnFloatingText('ADRENALINE RUSH! ⚡', this.player.x, this.player.y - 75, '#ff4757', 20);
    }

    // Stamina recovery scaled by zombie level and difficulty (substantially increased for high-tier and apex boss encounters)
    const baseStamina = z.killedByHeadshot 
      ? (this.player.staminaHeadshotBonus || 12) 
      : (this.player.staminaKillBonus || 6);
    const zLevel = Math.max(1, z.zombieLevel || 1);
    const isApexBoss = z.type === 'malakor' || z.type === 'reaper' || (z.scale >= 1.9 && z.maxHP >= 2000);
    const isMidBoss = z.type === 'boss' || (z.scale >= 1.5 && z.maxHP >= 600);
    const isBoss = isApexBoss || isMidBoss;
    
    // Level scaling: +1.5 stamina per tier above Level 1; headshots scale at +2.2 per tier
    const tierBonus = Math.round((zLevel - 1) * (z.killedByHeadshot ? 2.2 : 1.5));

    // Boss extra bounty for taking down titanic threats
    let bossBonus = 0;
    if (isApexBoss) {
      // Grand Apex God-Bosses (Malakor Lv 20, Abyssal Lich King Lv 15): massive stamina reward!
      bossBonus = z.killedByHeadshot ? 35 : 22;
    } else if (isMidBoss) {
      // Mid-Bosses (Gargantuar Titan Lv 10):
      bossBonus = z.killedByHeadshot ? 20 : 12;
    }

    // Endless mode extra scaling above wave 15
    const endlessBonus = (z.waveNum && z.waveNum > 15) ? Math.min(25, Math.floor((z.waveNum - 15) * 0.8)) : 0;

    const staminaBonus = baseStamina + tierBonus + bossBonus + endlessBonus;
    this.player.restoreStamina(staminaBonus);

    const staminaColor = isApexBoss ? '#e056fd' : (isMidBoss ? '#9b59b6' : (zLevel >= 8 ? '#00d2d3' : '#f1c40f'));
    const bossTag = isApexBoss ? ' 👑👑' : (isMidBoss ? ' 👑' : '');
    this.spawnFloatingText(`+${staminaBonus} ⚡ STAMINA${bossTag}`, this.player.x, this.player.y - 65, staminaColor, isBoss ? 22 : 16);

    // Skull bounty rewards:
    // Base: 1 skull for body kill, 2 skulls for headshot kill
    let baseBounty = z.killedByHeadshot ? 2 : 1;
    if (isApexBoss) {
      baseBounty += z.killedByHeadshot ? 16 : 10;
    } else if (isMidBoss) {
      baseBounty += z.killedByHeadshot ? 8 : 5;
    }

    // Apply Bounty Hunter upgrade multiplier
    let finalBounty = Math.round(baseBounty * (this.player.bountyMul || 1));

    const isBlood = this.isBloodMoon();
    const isEndless = this.gameMode === 'endless';

    // 🩸 Blood Moon Multiplier: 3x Skulls!
    if (isBlood) {
      finalBounty *= 3;
    } else if (isEndless) {
      // In Endless mode: DOUBLE the amount of skulls! (2x Multiplier)
      finalBounty *= 2;
    }

    this.pickups.push(new Pickup(this, z.x, z.y - 30, 'skull', finalBounty));
    const bountyColor = isBlood ? '#ff4757' : '#ffd700';

    if (isBoss) {
      const modeText = isBlood ? ' (3x BLOOD MOON 🩸)' : (isEndless ? ' (2x ENDLESS)' : '');
      this.spawnFloatingText(`BOSS BOUNTY! 💀 +${finalBounty}${modeText}`, z.x, z.y - 50, bountyColor, 22);
    } else if (z.killedByHeadshot) {
      const modeText = isBlood ? ' (3x BLOOD MOON 🩸)' : (isEndless ? ' (2x ENDLESS)' : '');
      this.spawnFloatingText(`HEADSHOT! 💀 +${finalBounty}${modeText}`, z.x, z.y - 45, bountyColor, 20);
    } else if (isBlood) {
      this.spawnFloatingText(`BLOOD BOUNTY! 💀 +${finalBounty} (3x 🩸)`, z.x, z.y - 35, '#ff4757', 17);
    } else if (isEndless) {
      this.spawnFloatingText(`💀 +${finalBounty} (2x)`, z.x, z.y - 35, '#ffd700', 16);
    }

    if (Math.random() < 0.25) {
      this.pickups.push(new Pickup(this, z.x, z.y - 30, 'apple', 25));
    }
  }

  public showGameOver(reason: string): void {
    crazyGames.gameplayStop();
    crazyGames.recordGamePlayedAndCheckMidgameAd();
    if (this.gameMode === 'campaign' && this.wave > 0) {
      this.campaignWave = this.wave;
    }
    this.saveGameData();
    this.state = 'gameover';
    uiManager.setState('gameover');
    const title = document.getElementById('gameover-title');
    if (title) title.textContent = reason;
    const waveEl = document.getElementById('go-wave');
    if (waveEl) waveEl.textContent = `${this.wave}`;
    const killsEl = document.getElementById('go-kills');
    if (killsEl) killsEl.textContent = `${this.kills}`;
    const gemsEl = document.getElementById('go-gems');
    if (gemsEl) gemsEl.textContent = `${this.player.skulls}`;

    // Update Tactical Upgrade Alert Callout
    const skulls = this.player.skulls || 0;
    const skullsHint = document.getElementById('go-alert-skulls');
    if (skullsHint) skullsHint.textContent = `💀 ${skulls} SKULLS READY`;
    const alertMsg = document.getElementById('go-alert-msg');
    if (alertMsg) {
      if (skulls >= 35) {
        alertMsg.textContent = `You have ${skulls} unspent Skulls! Fortify your bow damage, turret ballistas, or fortress armor in the Armory before retrying.`;
      } else {
        alertMsg.textContent = `The horde breached your defenses! Upgrade bow kinetic pierce, passive health regeneration, or deploy rooftop ballistas to survive Night ${this.wave}.`;
      }
    }
  }

  public openShopFromGameOver(): void {
    this.state = 'shop';
    uiManager.shopOpenedFromMenu = false;
    uiManager.shopOpenedFromGameOver = true;
    uiManager.setState('shop');
    uiManager.buildShop(this.upgrades, this.player, this.tower, this.wave, () => {
      this.saveGameData();
      this.updateMenuSkullsUI();
    });
  }

  public reviveHero(): void {
    if (!this.player || !this.tower) return;
    if (this.gameOverTimeout) {
      clearTimeout(this.gameOverTimeout);
      this.gameOverTimeout = null;
    }

    // Revive player entity and reset ragdoll physics upright on tower
    this.player.revive(this.tower.topY, this.tower.x);

    // Restore tower health to at least 50%
    if (this.tower.hp <= 0) {
      this.tower.hp = Math.round(this.tower.maxHP * 0.5);
    } else {
      this.tower.hp = Math.max(this.tower.hp, Math.round(this.tower.maxHP * 0.5));
    }

    // Divine shockwave: push back and stun nearby melee zombies
    for (const z of this.zombies) {
      if (!z.dead) {
        const distToTower = Math.abs(z.x - this.tower.x);
        if (distToTower < 450) {
          z.x += 240;
          z.isFrozen = true;
          z.frozenTimer = 2.5;
        }
      }
    }

    // Grant 3.5 seconds of Divine Aegis invulnerability
    this.divineAegisTimer = 3.5;
    this.player.invincible = true;
    this.tower.invincible = true;

    // Reset game state
    this.state = 'playing';
    uiManager.setState('playing');
    uiManager.updateHUD(this.player, this.tower, this.wave, this.enemiesToSpawn + this.zombies.filter(z => !z.dead).length, this.kills, this.gameMode);

    soundFX.playGemCollect();
    this.cameras.main.flash(350, 46, 204, 113, true);
    this.shakeScreen(8, 0.25);
    this.spawnFloatingText('HERO REVIVED (+50% HP & DIVINE SHIELD)!', this.player.x, this.player.y - 50, '#2ecc71', 26);

    crazyGames.gameplayStart();
  }

  // ═══════════════════════════════════════════════════════
  // ⚔️ TACTICAL ACTIVE ULTIMATE ABILITIES ([F] / [E] / [R] / [T] / [G])
  // ═══════════════════════════════════════════════════════

  public triggerArrowVolley(): void {
    if (!this.hasVolleyUnlocked) {
      const cost = 300;
      if (this.player && this.player.skulls >= cost) {
        this.player.skulls -= cost;
        this.hasVolleyUnlocked = true;
        const volleyUp = this.upgrades?.find(u => u.id === 'unlockVolley');
        if (volleyUp) volleyUp.bought = true;
        this.saveGameData();
        soundFX.playGemCollect();
        this.cameras.main.flash(350, 255, 100, 50, true);
        this.shakeScreen(10, 0.3);
        this.spawnFloatingText('🔥 UNLOCKED RAIN OF FIRE VOLLEY! (-300 💀) 🔥', this.player.x, this.player.y - 70, '#ff4757', 24);
        uiManager.updateHUD(this.player, this.tower, this.wave, this.enemiesToSpawn + this.zombies.filter(z => !z.dead).length, this.kills, this.gameMode);
        this.updateSkillsHUD();
      } else {
        soundFX.playArmorHit();
        const current = this.player?.skulls || 0;
        this.spawnFloatingText(`🔒 NEED 300 💀 TO UNLOCK VOLLEY! (${current}/300)`, this.player?.x || 200, (this.player?.y || 200) - 60, '#ff4757', 20);
        return;
      }
    }
    if (this.volleyCooldown > 0 || this.state !== 'playing' || !this.player || this.player.dead) return;
    this.volleyCooldown = this.volleyMaxCooldown;
    this.volleyBarrageRemaining = this.volleyArrowCount || 28;
    this.volleyBarrageTimer = 0;
    soundFX.playBowRelease(0.5);
    soundFX.playExplosion();
    this.shakeScreen(15, 0.45);
    this.spawnFloatingText('🔥 RAIN OF FIRE VOLLEY! [F] 🔥', this.cameras.main.width * 0.55, 120, '#ff4757', 28);
    this.updateSkillsHUD();
  }

  public triggerFrostNova(): void {
    if (!this.hasFrostNovaUnlocked) {
      const cost = 500;
      if (this.player && this.player.skulls >= cost) {
        this.player.skulls -= cost;
        this.hasFrostNovaUnlocked = true;
        const frostUp = this.upgrades?.find(u => u.id === 'unlockFrostNova');
        if (frostUp) frostUp.bought = true;
        this.saveGameData();
        soundFX.playIceFreeze();
        this.cameras.main.flash(350, 0, 210, 255, true);
        this.shakeScreen(10, 0.3);
        this.spawnFloatingText('❄️ UNLOCKED GLACIAL FROST NOVA! (-500 💀) ❄️', this.player.x, this.player.y - 70, '#00d2d3', 24);
        uiManager.updateHUD(this.player, this.tower, this.wave, this.enemiesToSpawn + this.zombies.filter(z => !z.dead).length, this.kills, this.gameMode);
        this.updateSkillsHUD();
      } else {
        soundFX.playArmorHit();
        const current = this.player?.skulls || 0;
        this.spawnFloatingText(`🔒 NEED 500 💀 TO UNLOCK FROST NOVA! (${current}/500)`, this.player?.x || 200, (this.player?.y || 200) - 60, '#00d2d3', 20);
        return;
      }
    }
    if (this.frostNovaCooldown > 0 || this.state !== 'playing' || !this.player || this.player.dead) return;
    this.frostNovaCooldown = this.frostNovaMaxCooldown;
    soundFX.playIceFreeze();
    soundFX.playIceShatter();
    this.cameras.main.flash(260, 110, 220, 255, true);
    this.shakeScreen(14, 0.4);
    this.spawnFloatingText('❄️ GLACIAL FROST NOVA! FREEZE! [E] ❄️', this.cameras.main.width * 0.55, 120, '#00d2d3', 28);

    const dur = this.frostNovaDuration || 4.5;
    const dmg = this.frostNovaDamage || 0;
    let frozenCount = 0;
    for (const z of this.zombies) {
      if (!z.dead) {
        z.isFrozen = true;
        z.frozenTimer = dur;
        if (dmg > 0) z.takeDamage(dmg, 0, -50, false);
        this.spawnIceShatter(z.x, z.y - 30 * z.scale, z.scale * 0.85);
        frozenCount++;
      }
    }
    if (frozenCount > 0) {
      this.spawnFloatingText(`❄️ ${frozenCount} UNDEAD FROZEN SOLID!`, this.player.x, this.player.y - 85, '#00f2fe', 22);
    }
    this.updateSkillsHUD();
  }

  public triggerNukeStrike(): void {
    if (this.state !== 'playing' || !this.player || this.player.dead) return;
    const charges = this.player.nukeCharges || 0;
    if (charges <= 0) {
      soundFX.playArmorHit();
      this.spawnFloatingText('⚠️ NO NUKE CHARGES! BUY IN SHOP', this.cameras.main.width * 0.5, 140, '#ff4757', 22);
      return;
    }
    this.player.nukeCharges--;
    this.saveGameData();
    this.updateSkillsHUD();

    soundFX.playExplosion();
    soundFX.playThunderStrike();
    this.cameras.main.flash(500, 255, 140, 40, true);
    this.shakeScreen(26, 0.65);
    this.spawnFloatingText('☢️ TACTICAL NUCLEAR AIRSTRIKE! [R] ☢️', this.cameras.main.width * 0.5, 100, '#f39c12', 32);

    const w = this.cameras.main.width;
    const groundY = this.tower ? this.tower.groundY : this.cameras.main.height * 0.72;
    for (let i = 0; i < 7; i++) {
      const exX = 80 + (w - 160) * (i / 6) + (Math.random() - 0.5) * 60;
      const exY = groundY - 30 - Math.random() * 80;
      this.time.delayedCall(i * 45, () => {
        this.spawnExplosion(exX, exY, 180);
      });
    }

    let killCount = 0;
    for (const z of this.zombies) {
      if (!z.dead) {
        z.takeDamage(450, (z.x - this.player.x) * 1.5, -450, false);
        killCount++;
      }
    }
    if (killCount > 0) {
      this.spawnFloatingText(`💥 ${killCount} UNDEAD ANNIHILATED!`, this.cameras.main.width * 0.5, 150, '#ff4757', 24);
    }
  }

  public triggerChainLightning(): void {
    if (this.state !== 'playing' || !this.player || this.player.dead) return;
    const charges = this.player.lightningCharges || this.player.timeFreezeCharges || 0;
    if (charges <= 0) {
      soundFX.playArmorHit();
      this.spawnFloatingText('⚠️ NO LIGHTNING CHARGES! BUY IN SHOP', this.cameras.main.width * 0.5, 140, '#00d2d3', 22);
      return;
    }
    this.player.lightningCharges = Math.max(0, charges - 1);
    this.saveGameData();
    this.updateSkillsHUD();

    soundFX.playThunderStrike();
    this.cameras.main.flash(260, 200, 240, 255, true);
    this.shakeScreen(18, 0.45);
    this.spawnFloatingText('⚡ CHAIN LIGHTNING TEMPEST! [T] ⚡', this.cameras.main.width * 0.5, 100, '#00f2fe', 32);

    const activeZombies = this.zombies.filter(z => !z.dead);
    if (activeZombies.length === 0) {
      this.spawnHeavenlyThunderStrike(this.cameras.main.width * 0.65, this.tower.topY + 60);
      return;
    }

    // Call down sky thunderbolts into enemy clusters
    const strikeCount = Math.min(5, activeZombies.length);
    for (let i = 0; i < strikeCount; i++) {
      const targetZ = activeZombies[Math.floor(i * (activeZombies.length / strikeCount))];
      if (targetZ) {
        this.time.delayedCall(i * 65, () => {
          if (!targetZ.dead) {
            this.spawnHeavenlyThunderStrike(targetZ.x, targetZ.y - 25 * targetZ.scale, targetZ);
          }
        });
      }
    }

    // High-voltage electrocution & 260 shock damage to ALL zombies on screen
    let shockedCount = 0;
    for (const z of activeZombies) {
      z.takeDamage(260, (Math.random() - 0.5) * 80, -130, false, 'torso');
      this.spawnFloatingText('⚡ -260 SHOCK!', z.x + (Math.random() - 0.5) * 20, z.y - 45 * z.scale, '#00d2d3', 18);
      for (let s = 0; s < 6; s++) {
        this.electricSparks.push({
          x: z.x,
          y: z.y - 30 * z.scale,
          vx: (Math.random() - 0.5) * 350,
          vy: -80 - Math.random() * 220,
          life: 0.45 + Math.random() * 0.35,
          maxLife: 0.7,
          col: Math.random() < 0.6 ? 0x00f2fe : 0xa29bfe
        });
      }
      shockedCount++;
    }

    if (shockedCount > 0) {
      this.time.delayedCall(160, () => {
        this.spawnFloatingText(`⚡ ${shockedCount} UNDEAD FRIED BY LIGHTNING! ⚡`, this.cameras.main.width * 0.5, 145, '#ffd700', 24);
      });
    }
  }

  // Backward compatibility alias:
  public triggerTimeFreeze(): void {
    this.triggerChainLightning();
  }

  public triggerDivineAegis(): void {
    if (this.state !== 'playing' || !this.player || this.player.dead) return;
    const charges = this.player.divineAegisCharges || 0;
    if (charges <= 0) {
      soundFX.playArmorHit();
      this.spawnFloatingText('⚠️ NO DIVINE AEGIS! BUY IN SHOP', this.cameras.main.width * 0.5, 140, '#ffd700', 22);
      return;
    }
    this.player.divineAegisCharges--;
    this.saveGameData();
    this.updateSkillsHUD();

    soundFX.playGemCollect();
    soundFX.playIceFreeze();
    this.cameras.main.flash(450, 255, 240, 140, true);
    this.shakeScreen(12, 0.35);
    this.spawnFloatingText('DIVINE AEGIS SHIELD! INVULNERABLE! [G]', this.cameras.main.width * 0.5, 100, '#ffd700', 30);

    this.player.invincible = true;
    if (this.tower) this.tower.invincible = true;
    this.player.hp = Math.min(this.player.maxHP, this.player.hp + 60);
    if (this.tower) this.tower.repair(100);
    this.divineAegisTimer = 6.0;

    this.time.delayedCall(6000, () => {
      if (this.player) this.player.invincible = false;
      if (this.tower) this.tower.invincible = false;
      this.divineAegisTimer = 0;
      this.spawnFloatingText('🛡️ Aegis Shield Expired', this.player.x, this.player.y - 70, '#cbd5e1', 18);
    });
  }

  public updateSkillsHUD(): void {
    const btnVolley = document.getElementById('skill-btn-volley');
    const overlayVolley = document.getElementById('skill-cd-overlay-volley');
    const textVolley = document.getElementById('skill-cd-text-volley');
    const iconVolley = document.getElementById('skill-icon-volley');
    const keyVolley = document.getElementById('skill-key-volley');
    if (btnVolley && overlayVolley && textVolley) {
      if (!this.hasVolleyUnlocked) {
        btnVolley.classList.remove('ready', 'cooldown');
        btnVolley.classList.add('skill-locked');
        btnVolley.title = 'Locked: Rain of Fire Volley (Unlock in Shop for 300 💀)';
        overlayVolley.style.height = '0%';
        textVolley.textContent = '';
        if (iconVolley) iconVolley.textContent = '🔒';
        if (keyVolley) {
          keyVolley.textContent = '💀 300';
          keyVolley.classList.add('lock-badge');
        }
      } else {
        if (iconVolley) iconVolley.textContent = '🔥';
        if (keyVolley) {
          keyVolley.textContent = '[F]';
          keyVolley.classList.remove('lock-badge');
        }
        btnVolley.title = 'Rain of Fire Volley [F]';
        if (this.volleyCooldown > 0) {
          btnVolley.classList.remove('ready', 'skill-locked');
          btnVolley.classList.add('cooldown');
          const frac = Math.min(1, this.volleyCooldown / this.volleyMaxCooldown);
          overlayVolley.style.height = `${Math.round(frac * 100)}%`;
          textVolley.textContent = `${Math.ceil(this.volleyCooldown)}s`;
        } else {
          btnVolley.classList.add('ready');
          btnVolley.classList.remove('cooldown', 'skill-locked');
          overlayVolley.style.height = '0%';
          textVolley.textContent = 'READY';
        }
      }
    }

    const btnFrost = document.getElementById('skill-btn-frost');
    const overlayFrost = document.getElementById('skill-cd-overlay-frost');
    const textFrost = document.getElementById('skill-cd-text-frost');
    const iconFrost = document.getElementById('skill-icon-frost');
    const keyFrost = document.getElementById('skill-key-frost');
    if (btnFrost && overlayFrost && textFrost) {
      if (!this.hasFrostNovaUnlocked) {
        btnFrost.classList.remove('ready', 'cooldown');
        btnFrost.classList.add('skill-locked');
        btnFrost.title = 'Locked: Glacial Frost Nova (Unlock in Shop for 500 💀)';
        overlayFrost.style.height = '0%';
        textFrost.textContent = '';
        if (iconFrost) iconFrost.textContent = '🔒';
        if (keyFrost) {
          keyFrost.textContent = '💀 500';
          keyFrost.classList.add('lock-badge');
        }
      } else {
        if (iconFrost) iconFrost.textContent = '❄️';
        if (keyFrost) {
          keyFrost.textContent = '[E]';
          keyFrost.classList.remove('lock-badge');
        }
        btnFrost.title = 'Glacial Frost Nova [E]';
        if (this.frostNovaCooldown > 0) {
          btnFrost.classList.remove('ready', 'skill-locked');
          btnFrost.classList.add('cooldown');
          const frac = Math.min(1, this.frostNovaCooldown / this.frostNovaMaxCooldown);
          overlayFrost.style.height = `${Math.round(frac * 100)}%`;
          textFrost.textContent = `${Math.ceil(this.frostNovaCooldown)}s`;
        } else {
          btnFrost.classList.add('ready');
          btnFrost.classList.remove('cooldown', 'skill-locked');
          overlayFrost.style.height = '0%';
          textFrost.textContent = 'READY';
        }
      }
    }

    // ── Update Tactical Special Skills Dock ([R] / [T] / [G]) ──
    // Only display tactical skills when the player buys them (charges > 0)
    const nukeCount = this.player ? (this.player.nukeCharges || 0) : 0;
    const lightningCount = this.player ? (this.player.lightningCharges || this.player.timeFreezeCharges || 0) : 0;
    const aegisCount = this.player ? (this.player.divineAegisCharges || 0) : 0;

    const tacticalDock = document.getElementById('hud-tactical-dock');
    const btnNuke = document.getElementById('skill-btn-nuke');
    const badgeNuke = document.getElementById('skill-charge-nuke');
    if (btnNuke && badgeNuke) {
      if (nukeCount > 0) {
        btnNuke.style.display = 'flex';
        badgeNuke.textContent = `x${nukeCount}`;
        btnNuke.classList.add('ready');
        badgeNuke.classList.remove('zero');
      } else {
        btnNuke.style.display = 'none';
        btnNuke.classList.remove('ready');
      }
    }

    const btnLightning = document.getElementById('skill-btn-lightning') || document.getElementById('skill-btn-freeze');
    const badgeLightning = document.getElementById('skill-charge-lightning') || document.getElementById('skill-charge-freeze');
    if (btnLightning && badgeLightning) {
      if (lightningCount > 0) {
        btnLightning.style.display = 'flex';
        badgeLightning.textContent = `x${lightningCount}`;
        btnLightning.classList.add('ready');
        badgeLightning.classList.remove('zero');
      } else {
        btnLightning.style.display = 'none';
        btnLightning.classList.remove('ready');
      }
    }

    const btnAegis = document.getElementById('skill-btn-aegis');
    const badgeAegis = document.getElementById('skill-charge-aegis');
    if (btnAegis && badgeAegis) {
      if (aegisCount > 0) {
        btnAegis.style.display = 'flex';
        badgeAegis.textContent = `x${aegisCount}`;
        btnAegis.classList.add('ready');
        badgeAegis.classList.remove('zero');
      } else {
        btnAegis.style.display = 'none';
        btnAegis.classList.remove('ready');
      }
    }

    if (tacticalDock) {
      const anyTactical = (nukeCount > 0) || (lightningCount > 0) || (aegisCount > 0);
      tacticalDock.style.display = anyTactical ? 'flex' : 'none';
    }
  }

  public updateWeaponHUD(): void {
    if (!this.player) return;

    const slot1Btn = document.getElementById('weapon-slot-1');
    const slot2Btn = document.getElementById('weapon-slot-2');
    const icon1 = document.getElementById('weapon-icon-1');
    const icon2 = document.getElementById('weapon-icon-2');
    const name1 = document.getElementById('weapon-name-1');
    const name2 = document.getElementById('weapon-name-2');

    const meta1 = BOW_METADATA[this.player.primaryBow] || { name: 'STANDARD', icon: '🏹' };
    const meta2 = BOW_METADATA[this.player.secondaryBow] || { name: 'SECONDARY', icon: '🏹' };

    if (icon1) icon1.textContent = meta1.icon;
    if (name1) name1.textContent = meta1.name;
    if (icon2) icon2.textContent = meta2.icon;
    if (name2) name2.textContent = meta2.name;

    if (slot1Btn) {
      slot1Btn.classList.toggle('active', this.player.activeSlot === 1);
    }
    if (slot2Btn) {
      slot2Btn.classList.toggle('active', this.player.activeSlot === 2);
    }
  }

  public isBloodMoon(): boolean {
    if (this.wave <= 0) return false;
    if (this.gameMode === 'endless') {
      return this.wave % 5 === 0;
    } else {
      return this.wave === 10 || this.wave === 15 || this.wave === 20 || (this.wave > 0 && this.wave % 10 === 0);
    }
  }

  public triggerAmbientThunderstorm(): void {
    if (!this.isBloodMoon()) return;
    const isBlood = true;
    this.ambientThunderTimer = 5.0 + Math.random() * 6.0;

    soundFX.playThunderStrike();
    this.cameras.main.flash(220, 255, 45, 55, true);
    this.shakeScreen(7, 0.28);

    const w = this.cameras.main.width;
    const startX = w * 0.12 + Math.random() * (w * 0.76);
    const groundY = this.tower ? this.tower.groundY : this.cameras.main.height * 0.72;
    const steps = 11;
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const branches: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>> = [];

    let curX = startX;
    let curY = -15;
    const dy = (groundY - curY) / steps;

    for (let s = 1; s <= steps; s++) {
      const nextY = curY + dy;
      const nextX = curX + (Math.random() - 0.5) * 48;
      segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

      if (s > 2 && s < steps - 2 && Math.random() < 0.45) {
        const bSegs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
        let bx = curX;
        let by = curY;
        const bDir = Math.random() < 0.5 ? -1 : 1;
        for (let bs = 0; bs < 4; bs++) {
          const nbx = bx + bDir * (12 + Math.random() * 18);
          const nby = by + 14 + Math.random() * 14;
          bSegs.push({ x1: bx, y1: by, x2: nbx, y2: nby });
          bx = nbx;
          by = nby;
        }
        branches.push(bSegs);
      }
      curX = nextX;
      curY = nextY;
    }

    this.ambientLightningBolts.push({
      segments,
      branches,
      color: isBlood ? 0xff3838 : 0x00f2fe,
      glowColor: isBlood ? 0x990017 : 0x6c5ce7,
      life: 0.32,
      maxLife: 0.32
    });
  }

  public spawnHeavenlyThunderStrike(targetX: number, targetY: number, primaryTarget?: Zombie): void {
    soundFX.playThunderStrike();
    this.shakeScreen(16, 0.35);
    this.cameras.main.flash(180, 210, 235, 255, true);
    this.spawnFloatingText('⚡ THUNDER FROM ABOVE! ⚡', targetX, targetY - 65, '#00f2fe', 26);

    // 1. Generate main jagged bolt from sky down to target
    const skyY = -20;
    const startX = targetX + (Math.random() - 0.5) * 80;
    const steps = 14;
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    let curX = startX;
    let curY = skyY;

    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      const nextY = skyY + (targetY - skyY) * frac;
      const jitter = (1 - frac) * 35 + 8;
      const nextX = s === steps ? targetX : (startX + (targetX - startX) * frac + (Math.random() - 0.5) * jitter);
      segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
      curX = nextX;
      curY = nextY;
    }

    // 2. Generate 3 sky branch forks
    const branches: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>> = [];
    for (let b = 0; b < 3; b++) {
      const branchOriginIdx = Math.floor(steps * (0.2 + b * 0.25));
      if (branchOriginIdx < segments.length) {
        const seg = segments[branchOriginIdx];
        const branch: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
        let bx = seg.x2;
        let by = seg.y2;
        const bDir = (b % 2 === 0 ? 1 : -1);
        for (let bs = 0; bs < 4; bs++) {
          const nbx = bx + bDir * (18 + Math.random() * 22);
          const nby = by + 20 + Math.random() * 25;
          branch.push({ x1: bx, y1: by, x2: nbx, y2: nby });
          bx = nbx;
          by = nby;
        }
        branches.push(branch);
      }
    }

    // 3. Chain lightning to up to 3 nearby zombies!
    const chains: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>> = [];
    let chainCount = 3;
    for (const other of this.zombies) {
      if (chainCount <= 0) break;
      if (!other.dead && other !== primaryTarget) {
        const d = Phaser.Math.Distance.Between(targetX, targetY, other.x, other.y - 30 * other.scale);
        if (d < 220) {
          other.takeDamage(35, (other.x - targetX) * 2, -100, false);
          // Generate chain lightning segment
          const chainSegs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
          const cSteps = 6;
          let cx = targetX;
          let cy = targetY;
          for (let cs = 1; cs <= cSteps; cs++) {
            const frac = cs / cSteps;
            const destX = other.x;
            const destY = other.y - 30 * other.scale;
            const ncx = cs === cSteps ? destX : (targetX + (destX - targetX) * frac + (Math.random() - 0.5) * 20);
            const ncy = cs === cSteps ? destY : (targetY + (destY - targetY) * frac + (Math.random() - 0.5) * 20);
            chainSegs.push({ x1: cx, y1: cy, x2: ncx, y2: ncy });
            cx = ncx;
            cy = ncy;
          }
          chains.push(chainSegs);
          chainCount--;
        }
      }
    }

    // 4. Register the full strike effect
    this.lightningStrikes.push({
      segments,
      branches,
      chains,
      impactX: targetX,
      impactY: targetY,
      shockwaveR: 10,
      life: 0.35,
      maxLife: 0.35
    });

    // 5. Scatter flying electric sparks at impact
    for (let sp = 0; sp < 28; sp++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 320;
      this.electricSparks.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        life: 0.4 + Math.random() * 0.35,
        maxLife: 0.75,
        col: Math.random() < 0.6 ? 0x00f2fe : 0xffffff
      });
    }
  }

  public spawnIceShatter(x: number, y: number, scale: number = 1): void {
    soundFX.playZombieShatter(true);
    this.shakeScreen(9, 0.22);
    this.cameras.main.flash(120, 180, 240, 255, true);
    this.spawnFloatingText('❄️ FROST SHATTER! ❄️', x, y - 50, '#00d2d3', 24);

    const count = Math.round(28 * scale);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 100 + Math.random() * 320;
      this.iceShards.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 130,
        r: (4 + Math.random() * 7) * scale,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 18,
        life: 0.65 + Math.random() * 0.55,
        maxLife: 1.2,
        col: Math.random() < 0.3 ? 0xffffff : Math.random() < 0.7 ? 0x74b9ff : 0x00d2d3
      });
    }
  }

  public spawnCuttingSlash(x: number, y: number, angle: number, arrowType: string, isHeadshot: boolean = false): void {
    // Flesh-Cutting Blood Spray & Droplets spurting along cut trajectory (no artificial crescent lines)
    const count = isHeadshot ? 16 : (arrowType === 'ballista' ? 18 : (arrowType === 'buzzsaw' ? 15 : 10));
    for (let b = 0; b < count; b++) {
      const sprayAng = angle + (Math.random() - 0.5) * 0.85;
      const spd = (130 + Math.random() * 260) * (isHeadshot ? 1.4 : 1.0);
      const bCol = Math.random() < 0.6 ? 0x8b0000 : (Math.random() < 0.5 ? 0xc0392b : 0xff3838);

      this.bloodSplats.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(sprayAng) * spd,
        vy: Math.sin(sprayAng) * spd - 60,
        r: 2.2 + Math.random() * 2.8,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        col: bCol
      });
    }
  }

  public spawnWoodSplinters(x: number, y: number): void {
    for (let s = 0; s < 5; s++) {
      this.bodyGibs.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 12,
        vx: 45 + Math.random() * 110,
        vy: -30 - Math.random() * 85,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 14,
        type: 'cloth',
        col: Math.random() < 0.6 ? 0x6b3c1b : 0x4a2810,
        w: 3.5 + Math.random() * 4,
        h: 1.8 + Math.random() * 2.2,
        life: 0.55,
        maxLife: 0.55,
        restitution: 0.25,
        friction: 0.8
      });
    }
  }

  public spawnShatteredBodyGibs(
    x: number,
    y: number,
    area: 'head' | 'torso' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm' | 'all' | string,
    scale: number,
    skinColor: string,
    clothesColor: string,
    impX: number,
    impY: number,
    opts?: {
      isFrozen?: boolean;
      isExplosive?: boolean;
      isCharred?: boolean;
      isAcid?: boolean;
      isFullBody?: boolean;
    }
  ): void {
    const s = scale;
    const skinCol = Phaser.Display.Color.HexStringToColor(skinColor).color;
    const clothCol = Phaser.Display.Color.HexStringToColor(clothesColor).color;
    const boneCol = 0x8c7863;
    const darkBoneCol = 0x6e5d4b;
    const fleshCol = 0x6d131a;
    const deepGoreCol = 0x3d0008;

    const isFrozen = !!opts?.isFrozen;
    const isCharred = !!opts?.isCharred;
    const isAcid = !!opts?.isAcid;
    const isFullBody = !!opts?.isFullBody || area === 'all';
    const isExplosive = !!opts?.isExplosive || isFullBody;

    // Trigger visceral layered shatter sound (ice crystalline crack or meaty gore snap)
    soundFX.playZombieShatter(isFrozen);

    // Screen impulse feedback
    if (isFullBody || isExplosive || isFrozen) {
      this.shakeScreen(isFrozen ? 9 : 12, 0.22);
    } else if (area === 'head') {
      this.shakeScreen(6, 0.15);
    }

    // Determine piece count based on shattered area (subtle anatomical tissue/splinters, real body parts drop via ragdoll)
    let count = 6;
    if (isFullBody || isFrozen) {
      count = Math.round((10 + Math.random() * 4) * Math.min(1.2, s));
    } else if (area === 'head') {
      count = Math.round(6 * Math.min(1.2, s));
    } else if (area === 'torso') {
      count = Math.round(8 * Math.min(1.2, s));
    }

    // Helper: generate irregular jagged polygon vertices around origin
    const makeJaggedPoints = (w: number, h: number, verts: number = 5): Array<{ x: number; y: number }> => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let v = 0; v < verts; v++) {
        const ang = (v / verts) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const rx = (w * 0.5) * (0.6 + Math.random() * 0.7);
        const ry = (h * 0.5) * (0.6 + Math.random() * 0.7);
        pts.push({ x: Math.cos(ang) * rx, y: Math.sin(ang) * ry });
      }
      return pts;
    };

    // ── Generate Body Gibs ──
    for (let i = 0; i < count; i++) {
      let gType: 'bone' | 'flesh' | 'skull' | 'cloth' | 'rib' | 'ice' | 'ember' | 'acid' = 'flesh';
      let col = fleshCol;
      let secondaryCol: number | undefined;
      let w = (3.5 + Math.random() * 4) * s;
      let h = (4.5 + Math.random() * 6) * s;
      let restitution = 0.15;
      let friction = 0.75;
      let verts = 5;

      if (isFrozen) {
        // ❄️ Glacial Cryo Shatter: Razor-sharp ice shards, frosted bone, and frozen meat
        const r = Math.random();
        if (r < 0.48) {
          gType = 'ice';
          col = Math.random() < 0.35 ? 0xffffff : (Math.random() < 0.7 ? 0x74b9ff : 0x00d2d3);
          secondaryCol = 0xdff9fb;
          w = (4 + Math.random() * 7) * s;
          h = (5 + Math.random() * 9) * s;
          restitution = 0.55;
          friction = 0.94;
          verts = 4 + Math.floor(Math.random() * 2);
        } else if (r < 0.78) {
          gType = 'flesh';
          col = Math.random() < 0.5 ? 0x5a2d36 : 0x4834d4;
          secondaryCol = 0x81ecec;
          w = (3.5 + Math.random() * 5) * s;
          h = (4 + Math.random() * 6) * s;
          restitution = 0.28;
          friction = 0.82;
          verts = 5;
        } else {
          gType = 'bone';
          col = darkBoneCol;
          secondaryCol = 0x00cec9;
          w = (2.5 + Math.random() * 3) * s;
          h = (6 + Math.random() * 8) * s;
          restitution = 0.46;
          friction = 0.88;
          verts = 4;
        }
      } else if (isAcid) {
        // ☣️ Caustic Acidic Viscera: Dissolved sizzling bile and corroded bones
        const r = Math.random();
        if (r < 0.45) {
          gType = 'acid';
          col = Math.random() < 0.6 ? 0x2ed573 : 0x26de81;
          secondaryCol = 0xf1c40f;
          w = (4 + Math.random() * 6) * s;
          h = (4 + Math.random() * 6) * s;
          restitution = 0.12;
          friction = 0.7;
          verts = 6;
        } else if (r < 0.75) {
          gType = 'flesh';
          col = Math.random() < 0.5 ? 0x1e3725 : deepGoreCol;
          secondaryCol = 0x2ed573;
          w = (4 + Math.random() * 5) * s;
          h = (4 + Math.random() * 6) * s;
          restitution = 0.14;
          friction = 0.75;
          verts = 5;
        } else {
          gType = 'bone';
          col = darkBoneCol;
          secondaryCol = 0x2ed573;
          w = (2 + Math.random() * 3) * s;
          h = (5 + Math.random() * 6) * s;
          restitution = 0.4;
          friction = 0.85;
          verts = 4;
        }
      } else if (isCharred) {
        // 🔥 Searing Demolition Blast: Glowing embers, charred meat & blackened bones
        const r = Math.random();
        if (r < 0.4) {
          gType = 'ember';
          col = Math.random() < 0.5 ? 0xff4757 : 0xff793f;
          secondaryCol = 0xf6e58d;
          w = (3.5 + Math.random() * 5) * s;
          h = (3.5 + Math.random() * 5) * s;
          restitution = 0.35;
          friction = 0.8;
          verts = 5;
        } else if (r < 0.7) {
          gType = 'bone';
          col = Math.random() < 0.6 ? 0x2d3436 : 0x1e272e;
          secondaryCol = 0xff4757;
          w = (2.5 + Math.random() * 3) * s;
          h = (6 + Math.random() * 7) * s;
          restitution = 0.42;
          friction = 0.85;
          verts = 4;
        } else {
          gType = 'flesh';
          col = 0x2c0b0e;
          secondaryCol = 0xff3838;
          w = (4 + Math.random() * 5) * s;
          h = (4 + Math.random() * 6) * s;
          restitution = 0.12;
          friction = 0.7;
          verts = 5;
        }
      } else if (area === 'head') {
        // 💀 Decapitation / Headshot: Cranial plates, brain tissue, skull splinters
        const r = Math.random();
        if (r < 0.42) {
          gType = 'skull';
          col = Math.random() < 0.5 ? darkBoneCol : boneCol;
          secondaryCol = deepGoreCol;
          w = (4.5 + Math.random() * 4.5) * s;
          h = (4.5 + Math.random() * 4.5) * s;
          restitution = 0.45;
          friction = 0.85;
          verts = 5;
        } else if (r < 0.75) {
          gType = 'flesh';
          col = Math.random() < 0.6 ? skinCol : fleshCol;
          secondaryCol = deepGoreCol;
          w = (3.5 + Math.random() * 4.5) * s;
          h = (3.5 + Math.random() * 4.5) * s;
          restitution = 0.12;
          friction = 0.75;
          verts = 5;
        } else {
          gType = 'bone';
          col = darkBoneCol;
          secondaryCol = deepGoreCol;
          w = (2 + Math.random() * 2.5) * s;
          h = (4 + Math.random() * 4) * s;
          restitution = 0.42;
          friction = 0.85;
          verts = 4;
        }
      } else if (area === 'torso' || isFullBody) {
        // 🫁 Torso / Full Dismemberment: Rib cage, spinal vertebrae, organ viscera & cloth
        const r = Math.random();
        if (r < 0.22) {
          gType = 'rib';
          col = boneCol;
          secondaryCol = 0x3a0005;
          w = (5 + Math.random() * 6) * s;
          h = (2.5 + Math.random() * 2.5) * s;
          restitution = 0.38;
          friction = 0.82;
          verts = 4;
        } else if (r < 0.46) {
          gType = 'bone';
          col = Math.random() < 0.6 ? darkBoneCol : boneCol;
          secondaryCol = 0x3a0005;
          w = (2 + Math.random() * 2.5) * s;
          h = (5 + Math.random() * 6) * s;
          restitution = 0.44;
          friction = 0.85;
          verts = 4;
        } else if (r < 0.76) {
          gType = 'flesh';
          col = Math.random() < 0.5 ? fleshCol : deepGoreCol;
          secondaryCol = skinCol;
          w = (4 + Math.random() * 5) * s;
          h = (4 + Math.random() * 5) * s;
          restitution = 0.12;
          friction = 0.75;
          verts = 5;
        } else {
          gType = 'cloth';
          col = clothCol;
          w = (4 + Math.random() * 5) * s;
          h = (4 + Math.random() * 5) * s;
          restitution = 0.08;
          friction = 0.65;
          verts = 5;
        }
      } else {
        // 🦴 Limb Shatter (Leg / Arm)
        const r = Math.random();
        if (r < 0.42) {
          gType = 'bone';
          col = darkBoneCol;
          secondaryCol = 0x3a0005;
          w = (2 + Math.random() * 2.5) * s;
          h = (5 + Math.random() * 6) * s;
          restitution = 0.44;
          friction = 0.85;
          verts = 4;
        } else if (r < 0.75) {
          gType = 'flesh';
          col = Math.random() < 0.6 ? skinCol : fleshCol;
          secondaryCol = deepGoreCol;
          w = (3.5 + Math.random() * 4) * s;
          h = (3.5 + Math.random() * 4) * s;
          restitution = 0.14;
          friction = 0.75;
          verts = 5;
        } else {
          gType = 'cloth';
          col = clothCol;
          w = (4 + Math.random() * 5) * s;
          h = (4 + Math.random() * 5) * s;
          restitution = 0.08;
          friction = 0.65;
          verts = 5;
        }
      }

      // Trajectory and velocity
      const spreadAng = Math.random() * Math.PI * 2;
      const speed = (isFullBody || isExplosive ? 140 : 100) + Math.random() * (isFullBody ? 360 : 280);
      const vx = impX * 0.4 + Math.cos(spreadAng) * speed;
      const vy = impY * 0.35 - (90 + Math.random() * (isFullBody ? 340 : 250));

      this.bodyGibs.push({
        x: x + (Math.random() - 0.5) * 16 * s,
        y: y + (Math.random() - 0.5) * 16 * s,
        vx,
        vy,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 22,
        type: gType,
        col,
        secondaryCol,
        w,
        h,
        life: 1.4 + Math.random() * 0.8,
        maxLife: 2.2,
        restitution,
        friction,
        hasStainedGround: false,
        points: makeJaggedPoints(w, h, verts)
      });
    }

    // ── Volumetric Aerosolized Blood / Cryo / Acid Mists ──
    const mistCount = isFullBody || isFrozen ? 8 : (area === 'head' ? 6 : 4);
    const mistCol = isFrozen ? 0x74b9ff : (isAcid ? 0x2ed573 : (isCharred ? 0x2d3436 : 0x8b0000));
    for (let m = 0; m < mistCount; m++) {
      const mistAng = Math.random() * Math.PI * 2;
      const mistSpd = 30 + Math.random() * 90;
      this.bloodMists.push({
        x: x + (Math.random() - 0.5) * 12 * s,
        y: y + (Math.random() - 0.5) * 12 * s,
        vx: impX * 0.15 + Math.cos(mistAng) * mistSpd,
        vy: impY * 0.15 + Math.sin(mistAng) * mistSpd - 40,
        r: (5 + Math.random() * 6) * s,
        maxR: (22 + Math.random() * 20) * s,
        alpha: 0.65,
        col: mistCol,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9
      });
    }

    // ── Directional Arterial Blood Spurts ──
    const spurtCount = isFrozen ? 8 : (isFullBody ? 24 : (area === 'head' ? 18 : 12));
    const bloodBaseCol = isAcid ? 0x2ed573 : 0x8b0000;
    const bloodDarkCol = isAcid ? 0x145a32 : 0x4a0008;

    for (let b = 0; b < spurtCount; b++) {
      const sprayAng = (Math.random() - 0.5) * Math.PI * 1.2;
      const spd = 130 + Math.random() * 280;
      this.bloodSplats.push({
        x: x + (Math.random() - 0.5) * 8 * s,
        y: y + (Math.random() - 0.5) * 8 * s,
        vx: impX * 0.25 + Math.cos(sprayAng) * spd,
        vy: -110 - Math.random() * 240,
        r: (2.2 + Math.random() * 3.2) * s,
        life: 0.55 + Math.random() * 0.45,
        maxLife: 1.0,
        col: Math.random() < 0.6 ? bloodBaseCol : bloodDarkCol
      });
    }
  }

  public spawnExplosion(x: number, y: number, radius: number = 140): void {
    soundFX.playExplosion();
    this.shakeScreen(15, 0.35);
    this.cameras.main.flash(90, 255, 120, 40, true);
    this.spawnFloatingText('💥 DEMOLITION BLAST! 💣', x, y - 55, '#f59e0b', 26);

    // AOE Damage & Kinetic launch to nearby zombies
    for (const z of this.zombies) {
      if (!z.dead) {
        const d = Phaser.Math.Distance.Between(x, y, z.x, z.y - 35 * z.scale);
        if (d <= radius) {
          const falloff = 1 - (d / radius);
          const dmg = Math.round(50 + falloff * 75);
          const pushDir = Math.sign(z.x - x) || 1;
          const pushX = pushDir * (80 + falloff * 240);
          const pushY = -(140 + falloff * 260);
          z.takeDamage(dmg, pushX, pushY, false);
          z.isBlastedCharred = true;
          z.charredTimer = 3.5;
        }
      }
    }

    // Explosions ignite nearby pitch pits and detonate nearby barrels
    for (const pit of this.pitchPits) {
      if (!pit.isIgnited && Math.abs(x - pit.x) <= pit.width / 2 + radius * 0.7) {
        this.ignitePitchPit(pit);
      }
    }
    for (const b of this.gunpowderBarrels) {
      if (!b.dead && Math.abs(x - b.x) <= b.width / 2 + radius * 0.75) {
        this.detonateGunpowderBarrel(b, true);
      }
    }

    // Explosion visual particles
    const parts: Array<{ x: number; y: number; vx: number; vy: number; r: number; col: number; life: number; maxLife: number }> = [];
    for (let p = 0; p < 28; p++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 320;
      const col = Math.random() < 0.3 ? 0xff4757 : (Math.random() < 0.6 ? 0xffa502 : 0xfff200);
      parts.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        r: 3 + Math.random() * 6,
        col,
        life: 0.45 + Math.random() * 0.4,
        maxLife: 0.85
      });
    }

    this.explosions.push({
      x,
      y,
      r: 12,
      maxR: radius,
      life: 0.45,
      maxLife: 0.45,
      particles: parts
    });
  }

  public spawnHolySmite(x: number, targetY: number, targetZombie: Zombie): void {
    soundFX.playGemCollect();
    this.shakeScreen(10, 0.25);
    this.cameras.main.flash(110, 255, 240, 180, true);
    this.spawnFloatingText('CELESTIAL SMITE!', x, targetY - 60, '#f1c40f', 26);

    targetZombie.isHolySmitten = true;
    targetZombie.holySmiteTimer = 3.5;

    // AOE Consecration
    for (const other of this.zombies) {
      if (!other.dead && other !== targetZombie) {
        const d = Phaser.Math.Distance.Between(x, targetY, other.x, other.y - 35 * other.scale);
        if (d < 160) {
          other.takeDamage(45, 0, -80, false);
          other.isHolySmitten = true;
          other.holySmiteTimer = 2.5;
        }
      }
    }

    this.holyBeams.push({
      x,
      targetY,
      shockwaveR: 10,
      life: 0.45,
      maxLife: 0.45
    });

    // Scatter golden sparks
    for (let s = 0; s < 20; s++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 240;
      this.electricSparks.push({
        x,
        y: targetY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 80,
        life: 0.5 + Math.random() * 0.35,
        maxLife: 0.85,
        col: Math.random() < 0.5 ? 0xfff200 : 0xffffff
      });
    }
  }

  public triggerStormRainOnImpact(impactX: number, dmg: number, bonusPierce: number = 0, delayMs: number = 140): void {
    const callDelayed = (fn: () => void, ms: number) => {
      if (this.time && typeof this.time.delayedCall === 'function') {
        this.time.delayedCall(ms, fn);
      } else {
        setTimeout(fn, ms);
      }
    };

    const minRainX = this.tower.x + this.tower.width / 2 + 15;
    const maxRainX = this.cameras.main.width - 35;
    const targetX = Phaser.Math.Clamp(impactX, minRainX, maxRainX);

    callDelayed(() => {
      if (this.state !== 'playing') return;

      // 🌩️ Thunder roar & sky lightning flash right as the storm rain barrage descends over the impact area!
      soundFX.playThunderStrike();
      this.shakeScreen(11, 0.25);
      this.spawnFloatingText('🌩️ STORM RAIN! ⚡', targetX, 55, '#00d2d3', 24);
      this.cameras?.main?.flash(90, 180, 240, 255, true);

      // Rain of 5 Electrified Storm Arrows falling from the sky OVER where the arrow hit:
      const spreadOffsets = [-180, -90, 0, 90, 180];
      spreadOffsets.forEach((xOff, idx) => {
        callDelayed(() => {
          if (this.state !== 'playing') return;
          const skyX = targetX + xOff + (Math.random() - 0.5) * 20;
          const skyY = -40;
          const rainVx = 25 + Math.random() * 35;
          const rainVy = 860 + Math.random() * 100;

          this.arrows.push(new Arrow(this, skyX, skyY, rainVx, rainVy, 'player1', {
            damage: dmg,
            type: 'storm',
            bonusPierce: 0,
            isPrimaryStorm: false
          }));
        }, idx * 25);
      });
    }, delayMs);
  }

  // ═══════════════════════════════════════════════════════
  // 🛢️ INTERACTIVE BATTLEFIELD HAZARDS (Pitch Pits & Gunpowder Barrels)
  // ═══════════════════════════════════════════════════════

  public setupBattlefieldHazards(forceReset: boolean = false): void {
    const gy = this.tower.groundY;
    if (forceReset) {
      this.pitchPits = [];
      this.gunpowderBarrels = [];
    }

    // Check if player has unlocked Pitch Pits and Gunpowder Barrels in shop
    const hasPitchPits = !!this.tower?.hasPitchPits;
    const hasGunpowderBarrels = !!this.tower?.hasGunpowderBarrels;

    if (hasPitchPits && this.pitchPits.length === 0) {
      const pitCount = this.wave >= 3 ? 2 : 1;
      const pitLocations = pitCount === 1 
        ? [590 + (Math.random() - 0.5) * 60] 
        : [480 + (Math.random() - 0.5) * 40, 830 + (Math.random() - 0.5) * 60];

      pitLocations.forEach((px, i) => {
        const pitW = 130 + Math.random() * 25;
        const bubbles: Array<{ xOff: number; r: number; phase: number; speed: number }> = [];
        for (let b = 0; b < 6; b++) {
          bubbles.push({
            xOff: (Math.random() - 0.5) * (pitW - 24),
            r: 2 + Math.random() * 3.5,
            phase: Math.random() * Math.PI * 2,
            speed: 2 + Math.random() * 3
          });
        }
        this.pitchPits.push({
          id: `pit_${this.wave}_${i}`,
          x: px,
          y: gy,
          width: pitW,
          isIgnited: false,
          igniteTimer: 0,
          bubbles
        });
      });
    }

    if (hasGunpowderBarrels && this.gunpowderBarrels.length === 0) {
      const barrelCount = this.wave >= 2 ? 2 : 1;
      const barrelXPositions = barrelCount === 1
        ? [740 + (Math.random() - 0.5) * 60]
        : [660 + (Math.random() - 0.5) * 50, 970 + (Math.random() - 0.5) * 60];

      barrelXPositions.forEach((bx, i) => {
        this.gunpowderBarrels.push({
          id: `barrel_${this.wave}_${i}`,
          x: bx,
          y: gy,
          width: 32,
          height: 42,
          dead: false,
          isIgnited: false,
          fuseTimer: 0,
          flashTimer: 0
        });
      });
    }
  }

  public ignitePitchPit(pit: PitchPit): void {
    if (pit.isIgnited) return;
    pit.isIgnited = true;
    pit.igniteTimer = 7.5; // burns for 7.5s

    soundFX.playExplosion();
    this.shakeScreen(7, 0.22);
    this.spawnFloatingText('🔥 PITCH PIT INFERNO! 🔥', pit.x, pit.y - 45, '#ff4757', 24);

    // Initial ignition burst
    this.spawnExplosion(pit.x, pit.y - 8, 90);

    // Chain detonate any barrels sitting right in or next to the pit
    for (const b of this.gunpowderBarrels) {
      if (!b.dead && Math.abs(b.x - pit.x) <= pit.width / 2 + 15) {
        this.time.delayedCall(160, () => {
          this.detonateGunpowderBarrel(b, true);
        });
      }
    }
  }

  public detonateGunpowderBarrel(b: GunpowderBarrel, isSuperBlast: boolean = false): void {
    if (b.dead) return;
    b.dead = true;

    const blastR = isSuperBlast ? 210 : 160;
    const dmg = isSuperBlast ? 320 : 220;

    soundFX.playExplosion();
    this.shakeScreen(isSuperBlast ? 16 : 12, 0.35);
    this.cameras.main.flash(isSuperBlast ? 140 : 100, 255, 120, 40, true);

    this.spawnExplosion(b.x, b.y - 18, blastR);
    this.spawnFloatingText(isSuperBlast ? '💥🔥 INFERNO KEG BLAST! 💥' : '💥 POWDER KEG BLAST! 💥', b.x, b.y - 45, isSuperBlast ? '#ff4757' : '#ffa502', 24);

    // Splinter debris flying outward
    for (let s = 0; s < 10; s++) {
      this.bodyGibs.push({
        x: b.x,
        y: b.y - 15,
        vx: (Math.random() - 0.5) * 550,
        vy: -200 - Math.random() * 400,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 15,
        type: 'cloth',
        col: Math.random() < 0.6 ? 0x5c3a1e : 0x2f3640,
        w: 5 + Math.random() * 7,
        h: 2 + Math.random() * 4,
        life: 1.2,
        maxLife: 1.2,
        restitution: 0.35,
        friction: 0.75
      });
    }

    // Damage all zombies within blast radius
    for (const z of this.zombies) {
      if (!z.dead) {
        const d = Phaser.Math.Distance.Between(b.x, b.y - 15, z.x, z.y - 30 * z.scale);
        if (d <= blastR) {
          const pushX = (z.x - b.x >= 0 ? 1 : -1) * (200 + (1 - d / blastR) * 250);
          const pushY = -150 - (1 - d / blastR) * 220;
          z.takeDamage(dmg, pushX, pushY, false, 'torso');
          z.isBurning = true;
          z.burnTimer = Math.max(z.burnTimer, 3.5);
          z.isBlastedCharred = true;
          z.charredTimer = 3.0;
        }
      }
    }

    // Chain ignite pitch pits within blast radius
    for (const pit of this.pitchPits) {
      if (!pit.isIgnited && Math.abs(b.x - pit.x) <= pit.width / 2 + blastR * 0.75) {
        this.ignitePitchPit(pit);
      }
    }

    // Chain detonate nearby barrels
    for (const other of this.gunpowderBarrels) {
      if (!other.dead && other !== b && Math.abs(other.x - b.x) <= blastR) {
        this.time.delayedCall(120, () => {
          this.detonateGunpowderBarrel(other, true);
        });
      }
    }
  }

  public checkFireGroundPitchIgnition(x: number, _y: number): void {
    for (const pit of this.pitchPits) {
      if (!pit.isIgnited && Math.abs(x - pit.x) <= pit.width / 2 + 15) {
        this.ignitePitchPit(pit);
      }
    }
    for (const b of this.gunpowderBarrels) {
      if (!b.dead && Math.abs(x - b.x) <= b.width / 2 + 15) {
        this.detonateGunpowderBarrel(b, true);
      }
    }
  }

  public renderBattlefieldHazards(g: Phaser.GameObjects.Graphics): void {
    const time = Date.now() * 0.001;

    // ── 1. Render Pitch Pits (Tar Pools) ──
    for (const pit of this.pitchPits) {
      const left = pit.x - pit.width / 2;
      const right = pit.x + pit.width / 2;
      const gy = pit.y;

      if (!pit.isIgnited) {
        // ── Dormant Pitch Pit (Sticky Viscous Black Tar Pool) ──
        // Excavated earthen basin
        g.fillStyle(0x0a0c10, 1);
        g.fillRect(left, gy - 2, pit.width, 10);
        g.fillStyle(0x151b24, 0.9);
        g.fillRect(left + 4, gy - 1, pit.width - 8, 5);

        // Wooden retention stakes on left & right with iron pins
        g.fillStyle(0x3e2714, 1);
        g.fillRect(left - 5, gy - 9, 7, 15);
        g.fillRect(right - 2, gy - 9, 7, 15);
        g.fillStyle(0x718093, 1);
        g.fillCircle(left - 1.5, gy - 2, 1.8);
        g.fillCircle(right + 1.5, gy - 2, 1.8);

        // Bubbling viscous black tar
        for (const b of pit.bubbles) {
          const bx = pit.x + b.xOff;
          const bSine = Math.sin(time * b.speed + b.phase);
          if (bSine > 0.1) {
            const curR = b.r * bSine;
            g.fillStyle(0x05070a, 0.95);
            g.fillCircle(bx, gy - curR * 0.4, curR);
            // Specular shiny highlight on tar bubble
            g.fillStyle(0x4b6584, 0.7);
            g.fillCircle(bx - curR * 0.3, gy - curR * 0.6, Math.max(1, curR * 0.35));
          }
        }

        // Subtle tar warning marker
        g.fillStyle(0xf1c40f, 0.3);
        g.fillRect(left + pit.width * 0.5 - 6, gy + 3, 12, 2);
      } else {
        // ── Ignited Pitch Pit (Raging Sea of Flames) ──
        // Molten fiery bed
        g.fillStyle(0x962d00, 1);
        g.fillRect(left - 2, gy - 3, pit.width + 4, 12);
        g.fillStyle(0xd35400, 1);
        g.fillRect(left + 2, gy - 2, pit.width - 4, 8);

        // Charred wooden retention stakes on fire
        g.fillStyle(0x1a0f08, 1);
        g.fillRect(left - 6, gy - 11, 8, 17);
        g.fillRect(right - 2, gy - 11, 8, 17);
        g.fillStyle(0xe74c3c, 0.9);
        g.fillTriangle(left - 6, gy - 11, left - 2, gy - 22, left + 2, gy - 11);
        g.fillTriangle(right - 2, gy - 11, right + 2, gy - 22, right + 6, gy - 11);

        // Dancing multi-layered flame tongues
        const flameCount = Math.floor(pit.width / 13);
        for (let f = 0; f < flameCount; f++) {
          const fx = left + 7 + f * 13;
          const flameWave1 = Math.sin(time * 16 + f * 1.8);
          const flameWave2 = Math.cos(time * 12 + f * 2.3);

          // Outer crimson flame
          const h1 = 28 + flameWave1 * 14 + (f % 2) * 8;
          g.fillStyle(0xe74c3c, 0.85);
          g.fillTriangle(fx - 7, gy, fx + flameWave2 * 4, gy - h1, fx + 7, gy);

          // Mid orange blaze
          const h2 = h1 * 0.72;
          g.fillStyle(0xf39c12, 0.9);
          g.fillTriangle(fx - 4.5, gy, fx + flameWave2 * 2.5, gy - h2, fx + 4.5, gy);

          // Core bright white-hot yellow
          const h3 = h1 * 0.42;
          g.fillStyle(0xfff200, 0.95);
          g.fillTriangle(fx - 2.5, gy, fx + flameWave2 * 1.2, gy - h3, fx + 2.5, gy);
        }

        // Floating upward sparks / embers
        for (let e = 0; e < 5; e++) {
          const ex = left + ((time * 45 + e * 31) % pit.width);
          const ey = gy - 15 - ((time * 80 + e * 45) % 65);
          const eAlpha = Math.max(0, 1 - (gy - ey) / 65);
          g.fillStyle(e % 2 === 0 ? 0xff4757 : 0xffa502, eAlpha);
          g.fillCircle(ex, ey, 1.8);
        }
      }
    }

    // ── 2. Render Gunpowder Barrels ──
    for (const b of this.gunpowderBarrels) {
      if (b.dead) continue;

      const bx = b.x;
      const by = b.y;
      const bw = b.width;
      const bh = b.height;
      const topY = by - bh;

      // Dark grounding shadow
      g.fillStyle(0x05070a, 0.6);
      g.fillEllipse(bx, by + 1, bw * 0.65, 5);

      // Oak wood barrel body (barrel bulge)
      g.fillStyle(0x4a2a14, 1);
      g.fillRoundedRect(bx - bw / 2, topY, bw, bh, 5);

      // Individual vertical staves shading
      g.fillStyle(0x6b3f20, 1);
      g.fillRect(bx - bw / 2 + 5, topY + 2, 7, bh - 4);
      g.fillRect(bx + bw / 2 - 12, topY + 2, 7, bh - 4);
      g.fillStyle(0x824e28, 1);
      g.fillRect(bx - 4, topY + 2, 8, bh - 4);

      // Forged iron hoops (top, middle, bottom)
      g.fillStyle(0x2d3436, 1);
      g.fillRect(bx - bw / 2 - 1, topY + 6, bw + 2, 5);
      g.fillRect(bx - bw / 2 - 1, topY + bh - 11, bw + 2, 5);

      // Silver hoop rivets
      g.fillStyle(0x95a5a6, 1);
      g.fillCircle(bx - bw / 2 + 3, topY + 8.5, 1.3);
      g.fillCircle(bx + bw / 2 - 3, topY + 8.5, 1.3);
      g.fillCircle(bx - bw / 2 + 3, topY + bh - 8.5, 1.3);
      g.fillCircle(bx + bw / 2 - 3, topY + bh - 8.5, 1.3);

      // Hazardous explosive stencil on center of barrel:
      // Yellow warning diamond
      g.fillStyle(0xf1c40f, 0.95);
      g.fillTriangle(bx, topY + 14, bx + 7, topY + 21, bx - 7, topY + 21);
      g.fillTriangle(bx, topY + 28, bx + 7, topY + 21, bx - 7, topY + 21);
      // Black skull mark inside
      g.fillStyle(0x1e272e, 1);
      g.fillCircle(bx, topY + 20, 2.8);
      g.fillRect(bx - 1.5, topY + 22, 3, 2);

      // Twisted rope fuse on barrel top
      g.lineStyle(2, 0xd2b48c, 1);
      g.lineBetween(bx, topY, bx + 5, topY - 7);
      g.lineBetween(bx + 5, topY - 7, bx + 9, topY - 6);

      // Sputtering fuse spark & smoke
      const sparkFlicker = Math.random();
      if (sparkFlicker > 0.3) {
        g.fillStyle(0xff4757, 1);
        g.fillCircle(bx + 9, topY - 6, 2.5);
        g.fillStyle(0xfff200, 1);
        g.fillCircle(bx + 9, topY - 6, 1.2);
        // Small puff of smoke
        g.fillStyle(0x718093, 0.45);
        g.fillCircle(bx + 11 + Math.sin(time * 8) * 2, topY - 11, 2.5);
      }
    }
  }

  /**
   * 🎯 Marksman's Eye: Precision Ballistic Trajectory Guide
   * Computes and renders a subtle, fading dotted ballistic trajectory arc while charging the bow,
   * projecting the exact gravitational flight path (800 px/s² drop) and impact point (headshots, crawlers, ground).
   */
  public renderAimTrajectory(g: Phaser.GameObjects.Graphics): void {
    if (!this.player || this.player.dead || this.state !== 'playing' || !this.player.isCharging) return;

    const bowTip = this.player.getBowTipPosition();
    const startX = bowTip.x;
    const startY = bowTip.y;

    const power = Math.max(0.25, Math.min(1.0, this.player.chargeFrac));
    const speed = this.player.arrowSpeed * power * (this.player.adrenalineTimer > 0 ? 1.25 : 1.0);
    const ang = this.player.ragdoll.aimAngle;
    const bowType = this.player.bowType;
    const spdMul = bowType === 'storm' ? 1.15 : 1.0;

    const bowColors: Record<string, { main: number; glow: number }> = {
      fire: { main: 0xff4757, glow: 0xffa502 },
      ice: { main: 0x00f2fe, glow: 0x48dbfb },
      tesla: { main: 0x00f2fe, glow: 0x54a0ff },
      viper: { main: 0x2ed573, glow: 0x7bed9f },
      ballista: { main: 0xf5f6fa, glow: 0xdcdde1 },
      blackhole: { main: 0xa29bfe, glow: 0x6c5ce7 },
      holy: { main: 0xffd700, glow: 0xfff200 },
      cluster: { main: 0xffa502, glow: 0xff6348 },
      buzzsaw: { main: 0xbdc3c7, glow: 0xecf0f1 },
      homing: { main: 0xc084fc, glow: 0x9b59b6 },
      storm: { main: 0x00d2d3, glow: 0x00f2fe },
      ricochet: { main: 0xf39c12, glow: 0xf1c40f },
      triple: { main: 0xf1c40f, glow: 0xfffa65 },
      normal: { main: 0x00f2fe, glow: 0xffffff }
    };
    const colTheme = bowColors[bowType] || bowColors.normal;

    const groundY = this.tower ? this.tower.groundY : this.cameras.main.height * 0.72;
    const camW = this.cameras.main.width;
    const dt = 0.022; // ~45 ticks/sec analytical physics simulation
    const maxSteps = 56;

    const traceArc = (angleOff: number = 0, isAux: boolean = false) => {
      const currentAng = ang + angleOff;
      let currVx = Math.cos(currentAng) * speed * spdMul;
      let currVy = Math.sin(currentAng) * speed * spdMul;
      let currX = startX;
      let currY = startY;

      const points: Array<{ x: number; y: number }> = [{ x: currX, y: currY }];

      for (let step = 0; step < maxSteps; step++) {
        const prevX = currX;
        const prevY = currY;

        currVy += 800 * dt;
        currX += currVx * dt;
        currY += currVy * dt;

        // Ground collision check with interpolation
        if (currY >= groundY) {
          const denom = Math.max(0.001, currY - prevY);
          const fraction = Math.max(0, Math.min(1, (groundY - prevY) / denom));
          const impactX = prevX + (currX - prevX) * fraction;
          points.push({ x: impactX, y: groundY });
          break;
        }

        // Off-screen boundary check
        if (currX > camW + 80 || currX < -80 || currY < -180) {
          points.push({ x: currX, y: currY });
          break;
        }

        points.push({ x: currX, y: currY });
      }

      return { points };
    };

    const animPhase = (this.time.now * 0.0035) % 1.0;

    const renderPath = (res: ReturnType<typeof traceArc>, isAux: boolean = false) => {
      const pts = res.points;
      if (pts.length < 2) return;

      const totalPts = pts.length;
      for (let i = 1; i < totalPts; i++) {
        const pt = pts[i];
        const prevPt = pts[i - 1];
        const tNorm = i / totalPts;

        // Fading alpha along arc from near player to terminus
        const chargeFactor = 0.65 + 0.35 * power;
        const baseAlpha = (1.0 - tNorm * 0.58) * chargeFactor * (isAux ? 0.38 : 0.95);

        // Dynamic forward pulse (marching dots along the trajectory)
        const wave = Math.sin(tNorm * 14 - animPhase * Math.PI * 2);
        const pulseFactor = 0.82 + 0.18 * wave;
        const finalAlpha = Math.max(0.12, Math.min(1.0, baseAlpha * pulseFactor));

        // Outer glow dot
        const glowR = isAux ? 2.0 : (3.0 + 0.8 * wave);
        g.fillStyle(colTheme.glow, finalAlpha * 0.45);
        g.fillCircle(pt.x, pt.y, glowR);

        // Inner bright core dot
        const coreR = isAux ? 1.1 : (1.5 + 0.4 * wave);
        g.fillStyle(colTheme.main, finalAlpha * 0.98);
        g.fillCircle(pt.x, pt.y, coreR);

        // Connecting guide dashes
        if (i % 2 === 0) {
          g.lineStyle(1.4, colTheme.main, finalAlpha * 0.35);
          g.lineBetween(prevPt.x, prevPt.y, pt.x, pt.y);
        }
      }
    };

    if (bowType === 'triple') {
      renderPath(traceArc(-0.12, true), true);
      renderPath(traceArc(0.12, true), true);
    }
    renderPath(traceArc(0, false), false);
  }

  public spawnStormImpactGround(x: number, y: number, dmg: number): void {
    soundFX.playThunderStrike();
    this.shakeScreen(7, 0.18);
    const skyY = -20;
    const boltSegs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let curX = x + (Math.random() - 0.5) * 25;
    let curY = skyY;
    const bSteps = 6;
    for (let s = 1; s <= bSteps; s++) {
      const frac = s / bSteps;
      const nextY = skyY + (y - skyY) * frac;
      const nextX = s === bSteps ? x : (curX + (x - curX) * frac + (Math.random() - 0.5) * 16);
      boltSegs.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
      curX = nextX;
      curY = nextY;
    }
    this.lightningStrikes.push({
      segments: boltSegs,
      branches: [],
      chains: [],
      impactX: x,
      impactY: y,
      shockwaveR: 10,
      life: 0.28,
      maxLife: 0.28
    });
    for (const other of this.zombies) {
      if (!other.dead) {
        const d = Phaser.Math.Distance.Between(x, y, other.x, other.y - 30 * other.scale);
        if (d < 95) {
          other.takeDamage(Math.round(dmg * 0.6), (other.x - x) * 1.5, -60, false);
          this.spawnFloatingText('⚡ GROUND SHOCK!', other.x, other.y - 30, '#00f2fe', 16);
        }
      }
    }
  }

  public spawnHarpoonImpact(x: number, y: number, angle: number, targetZombie: Zombie): void {
    soundFX.playFleshHit(true);
    this.shakeScreen(14, 0.3);
    targetZombie.isHarpoonStruck = true;
    targetZombie.harpoonStruckTimer = 0.8;
    this.spawnFloatingText('🔱 IMPALED! [SIEGE HARPOON]', x, y - 45, '#ced6e0', 22);

    const shards: Array<{ x: number; y: number; vx: number; vy: number; r: number; rot: number; vRot: number }> = [];
    for (let sh = 0; sh < 10; sh++) {
      const sa = angle + (Math.random() - 0.5) * 1.5;
      const spd = 120 + Math.random() * 260;
      shards.push({
        x,
        y,
        vx: Math.cos(sa) * spd,
        vy: Math.sin(sa) * spd - 60,
        r: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12
      });
    }

    this.harpoonShockwaves.push({
      x,
      y,
      r: 8,
      maxR: 70,
      life: 0.35,
      maxLife: 0.35,
      shards
    });
  }

  public spawnSeekerImpact(x: number, y: number, targetZombie: Zombie): void {
    soundFX.playBowRelease(1.2);
    targetZombie.isSeekerLocked = true;
    targetZombie.seekerLockTimer = 4.0;
    this.spawnFloatingText('🎯 TARGET LOCKED! [SEEKER]', x, y - 50, '#d946ef', 22);

    // Arcane sparkle ring
    for (let s = 0; s < 16; s++) {
      const ang = (s / 16) * Math.PI * 2;
      const spd = 90 + Math.random() * 150;
      this.electricSparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.4 + Math.random() * 0.25,
        maxLife: 0.65,
        col: Math.random() < 0.5 ? 0xd946ef : 0x00f2fe
      });
    }
  }

  public spawnToxicCorrosion(x: number, y: number, targetZombie: Zombie): void {
    soundFX.playFleshHit(false);
    targetZombie.isPoisoned = true;
    targetZombie.poisonTimer = 5.0;
    this.spawnFloatingText('☣️ ACID CORROSION! 🧪', x, y - 45, '#2ed573', 22);

    for (let t = 0; t < 14; t++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 220;
      this.toxicSplashes.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        r: 2.5 + Math.random() * 3.5,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        col: Math.random() < 0.6 ? 0x2ed573 : 0xa8ff78
      });
    }
  }

  public applyArrowElementalEffects(a: Arrow, z: Zombie, tipX: number, tipY: number, isHeadshot: boolean, dmg: number): void {
    if (a.type === 'fire') {
      if (z.type !== 'pyro') {
        z.isBurning = true;
        z.burnTimer = Math.max(z.burnTimer, 2.2);
        // Spreading napalm flames to nearby zombies (controlled radius & duration)
        for (const other of this.zombies) {
          if (!other.dead && other !== z && other.type !== 'pyro') {
            const d = Phaser.Math.Distance.Between(tipX, tipY, other.x, other.y - 30 * other.scale);
            if (d < 50) {
              other.isBurning = true;
              other.burnTimer = Math.max(other.burnTimer, 1.5);
              this.spawnFloatingText('🔥 SPREAD!', other.x, other.y - 30, '#ff4757', 15);
            }
          }
        }
      }
    }
    if (a.type === 'ice') {
      if (z.isFrozen) {
        this.spawnIceShatter(z.x, z.y - 35 * z.scale, z.scale);
        z.takeDamage(a.damage * 0.75, 0, -50, false);
      } else {
        z.isFrozen = true;
        z.frozenTimer = 4.2;
        soundFX.playIceFreeze();
        this.spawnFloatingText('❄️ FROZEN SOLID!', z.x, z.y - 45, '#00d2d3', 22);
      }
    }
    if (a.type === 'tesla') {
      z.isShocked = true;
      z.shockTimer = 2.5;
      this.spawnHeavenlyThunderStrike(z.x, z.y - 35 * z.scale, z);
    }
    if (a.type === 'viper') {
      this.spawnToxicCorrosion(tipX, tipY, z);
      z.speed *= 0.75;
    }
    if (a.type === 'buzzsaw') {
      soundFX.playFleshHit(true);
      this.shakeScreen(6, 0.15);
      this.spawnCuttingSlash(tipX, tipY, a.angle, 'buzzsaw', true);
      this.spawnFloatingText('🪚 SERRATED SHRED!', tipX, tipY - 30, '#bdc3c7', 20);
      for (let sp = 0; sp < 10; sp++) {
        const sang = a.angle + Math.PI + (Math.random() - 0.5) * 1.6;
        const sspd = 80 + Math.random() * 200;
        this.electricSparks.push({
          x: tipX,
          y: tipY,
          vx: Math.cos(sang) * sspd,
          vy: Math.sin(sang) * sspd - 40,
          life: 0.3,
          maxLife: 0.3,
          col: Math.random() < 0.5 ? 0xffeb3b : 0xdcdde1
        });
      }
    }
    if (a.type === 'triple') {
      soundFX.playArmorHit();
      this.spawnFloatingText('💥 MULTI-STRIKE!', tipX, tipY - 25, '#f1c40f', 18);
    }
    if (a.type === 'storm') {
      z.isShocked = true;
      z.shockTimer = 2.8;
      soundFX.playThunderStrike();
      this.shakeScreen(9, 0.2);
      this.spawnFloatingText('🌩️ TEMPEST STRIKE! ⚡', tipX, tipY - 45, '#00d2d3', 22);
      const skyY = -20;
      const boltSegs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
      let curX = tipX + (Math.random() - 0.5) * 20;
      let curY = skyY;
      const bSteps = 7;
      for (let s = 1; s <= bSteps; s++) {
        const frac = s / bSteps;
        const nextY = skyY + (tipY - skyY) * frac;
        const nextX = s === bSteps ? tipX : (curX + (tipX - curX) * frac + (Math.random() - 0.5) * 16);
        boltSegs.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
        curX = nextX;
        curY = nextY;
      }
      this.lightningStrikes.push({
        segments: boltSegs,
        branches: [],
        chains: [],
        impactX: tipX,
        impactY: tipY,
        shockwaveR: 10,
        life: 0.3,
        maxLife: 0.3
      });
      for (const other of this.zombies) {
        if (!other.dead && other !== z) {
          const d = Phaser.Math.Distance.Between(tipX, tipY, other.x, other.y - 30 * other.scale);
          if (d < 100) {
            other.takeDamage(Math.round(a.damage * 0.65), (other.x - tipX) * 1.5, -60, false);
            this.spawnFloatingText('⚡ SHOCKED!', other.x, other.y - 30, '#00f2fe', 16);
          }
        }
      }
      if (a.isPrimaryStorm) {
        a.isPrimaryStorm = false;
        this.triggerStormRainOnImpact(tipX, a.damage, a.pierceCount);
      }
    }
    if (a.type === 'holy') {
      this.spawnHolySmite(tipX, z.y - 35 * z.scale, z);
    }
    if (a.type === 'cluster') {
      this.spawnExplosion(tipX, tipY, 150);
      z.isBlastedCharred = true;
      z.charredTimer = 3.5;
      a.dead = true;
    }
    if (a.type === 'ballista') {
      this.spawnHarpoonImpact(tipX, tipY, a.angle, z);
    }
    if (a.type === 'homing') {
      this.spawnSeekerImpact(tipX, tipY, z);
    }
    if (a.type === 'blackhole') {
      this.spawnBlackHole(a.x, a.y);
    }
    if (a.type === 'ricochet') {
      a.bounceCount = (a.bounceCount || 0) + 1;
      a.hitEntities.add(z);
      soundFX.playArmorHit();
      this.spawnFloatingText(`💫 RICOCHET #${a.bounceCount}!`, tipX, tipY - 25, '#f39c12', 18);
      if (a.bounceCount < 3) {
        let nextTarget: Zombie | null = null;
        let nextDist = 320;
        for (const other of this.zombies) {
          if (!other.dead && !a.hitEntities.has(other)) {
            const d = Phaser.Math.Distance.Between(tipX, tipY, other.x, other.y - 30 * other.scale);
            if (d < nextDist) {
              nextDist = d;
              nextTarget = other;
            }
          }
        }
        if (nextTarget) {
          const targetAng = Phaser.Math.Angle.Between(tipX, tipY, nextTarget.x, nextTarget.y - 30 * nextTarget.scale);
          const bounceSpeed = Math.max(900, Math.sqrt(a.vx * a.vx + a.vy * a.vy) * 0.95);
          a.vx = Math.cos(targetAng) * bounceSpeed;
          a.vy = Math.sin(targetAng) * bounceSpeed;
          a.x = tipX + Math.cos(targetAng) * 14;
          a.y = tipY + Math.sin(targetAng) * 14;
          a.stuck = false;
          a.dead = false;
          a.pierceCount = Math.max(a.pierceCount, 1);
          this.matter.body.setPosition(a.body, { x: a.x, y: a.y });
          this.matter.body.setVelocity(a.body, { x: a.vx / 60, y: a.vy / 60 });
          for (let sp = 0; sp < 8; sp++) {
            const sang = Math.random() * Math.PI * 2;
            const sspd = 60 + Math.random() * 140;
            this.electricSparks.push({
              x: tipX,
              y: tipY,
              vx: Math.cos(sang) * sspd,
              vy: Math.sin(sang) * sspd - 40,
              life: 0.3,
              maxLife: 0.3,
              col: 0xf39c12
            });
          }
        }
      }
    }
  }

  public updateCameraView(): void {
    if (!this.cameras || !this.cameras.main) return;
    const isPortrait = window.innerWidth < window.innerHeight;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (isPortrait) {
      // In mobile portrait mode, zoom in dynamically so hero, tower, and zombies are clear and well-sized
      const zoom = 1.35;
      this.cameras.main.setZoom(zoom);

      const towerX = this.tower ? this.tower.x : (w * 0.16);
      const gy = this.tower ? this.tower.groundY : (h * 0.72);

      // Origin-compensated camera scroll: guarantees tower is at 16% of screen width and ground is at 72% of screen height
      const scrollX = towerX - w * 0.5 + (0.34 * w) / zoom;
      const scrollY = gy - h * 0.5 - (0.22 * h) / zoom;
      this.cameras.main.setScroll(scrollX, scrollY);
    } else {
      this.cameras.main.setZoom(1.0);
      this.cameras.main.setScroll(0, 0);
    }
  }

  public handleResize(_gameSize?: Phaser.Structs.Size): void {
    const res = getGameResolution();
    const w = res.width;
    const h = res.height;
    this.scale.resize(w, h);
    this.cameras.main.setSize(w, h);
    this.matter.world.setBounds(0, 0, w, h * 0.72 + 20);
    this.updateCameraView();

    if (this.tower && this.player && !this.player.dead) {
      this.player.x = this.tower.x;
      if (this.player.onGround) {
        this.player.y = this.tower.topY;
      }
      this.player.ragdoll.setPosition(this.player.x, this.player.y);
    }

    if (this.tower && this.zombies) {
      for (const z of this.zombies) {
        if (!z.dead) {
          z.y = this.tower.groundY + z.groundYOffset;
          z.ragdoll.setPosition(z.x, z.y);
        }
      }
    }
  }

  public update(_time: number, delta: number): void {
    const rawDt = Math.min(delta / 1000, 0.05);

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= rawDt;
      if (this.slowMoTimer <= 0) this.timeScale = 1.0;
    }
    const dt = rawDt * this.timeScale;

    // Background Rendering
    this.graphicsLayer.clear();
    this.renderAtmosphere(this.graphicsLayer);

    // Aim Pointer
    const pointer = this.input.activePointer;
    if (this.player && !this.player.dead) {
      this.player.setAim(pointer.worldX, pointer.worldY);
    }

    if (this.state === 'playing') {
      // ── Update Active Tactical Ultimate Skills Cooldowns & Spawning ──
      if (this.volleyCooldown > 0) {
        this.volleyCooldown = Math.max(0, this.volleyCooldown - rawDt);
      }
      if (this.frostNovaCooldown > 0) {
        this.frostNovaCooldown = Math.max(0, this.frostNovaCooldown - rawDt);
      }
      if (this.divineAegisTimer > 0) {
        this.divineAegisTimer = Math.max(0, this.divineAegisTimer - rawDt);
        if (this.divineAegisTimer <= 0) {
          if (this.player) this.player.invincible = false;
          if (this.tower) this.tower.invincible = false;
        }
      }

      if (this.volleyBarrageRemaining > 0) {
        this.volleyBarrageTimer += rawDt;
        if (this.volleyBarrageTimer >= 0.04) {
          this.volleyBarrageTimer = 0;
          this.volleyBarrageRemaining--;
          const startX = 260 + Math.random() * (this.cameras.main.width - 240);
          const startY = -40 - Math.random() * 50;
          const vx = (Math.random() - 0.25) * 160 + 110;
          const vy = 820 + Math.random() * 240;
          this.arrows.push(new Arrow(this, startX, startY, vx, vy, 'player1', {
            damage: 60,
            type: 'fire',
            bonusPierce: 0
          }));
          if (this.volleyBarrageRemaining % 5 === 0) {
            soundFX.playBowRelease(0.7);
          }
        }
      }
      this.updateSkillsHUD();

      // ── Dynamic Thunderstorms & Atmospheric Lightning (Boss / Blood Moon Waves Only) ──
      if (this.isBloodMoon()) {
        this.ambientThunderTimer -= rawDt;
        if (this.ambientThunderTimer <= 0) {
          this.triggerAmbientThunderstorm();
        }
      }

      for (let i = this.ambientLightningBolts.length - 1; i >= 0; i--) {
        const bolt = this.ambientLightningBolts[i];
        bolt.life -= rawDt;
        if (bolt.life <= 0) {
          this.ambientLightningBolts.splice(i, 1);
        }
      }

      // Spawn timer
      if (this.enemiesToSpawn > 0) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnTimer -= this.spawnInterval;
          const targetBigZombies = this.getTargetBigZombiesForWave(this.wave);

          // Guarantee the unique featured enemy for this wave on the first spawn
          if (!this.waveFeaturedSpawned) {
            this.waveFeaturedSpawned = true;
            if (targetBigZombies > 0) {
              const bType = this.getBigZombieTypeForWave(this.wave, 0, targetBigZombies);
              const bScaleOffset = bType === 'malakor' ? 80 : 70;
              this.zombies.push(new Zombie(this, this.cameras.main.width + bScaleOffset + Math.random() * 40, this.wave, bType));
              this.bigZombiesSpawnedThisWave++;

              const isFinal = this.bigZombiesSpawnedThisWave === targetBigZombies;
              const bossName = bType === 'malakor' ? 'MALAKOR ELDRITCH GOD TITAN' : (bType === 'reaper' ? 'ABYSSAL LICH TITAN' : 'GARGANTUAR TITAN');
              const bossCol = bType === 'malakor' ? '#ff3838' : (bType === 'reaper' ? '#9b59b6' : '#ff4757');
              soundFX.playExplosion();
              this.shakeScreen(bType === 'malakor' ? 24 : 18, 0.48);
              this.spawnFloatingText(`👑 [1/${targetBigZombies}] ${bossName} ENGAGING! 👑`, this.cameras.main.width * 0.72, this.cameras.main.height * 0.35, bossCol, 26);
            } else if (this.wave <= 20) {
              const featuredMap: Record<number, ZombieType> = {
                1: 'walker',
                2: 'crawler',
                3: 'buckethead',
                4: 'bloater',
                5: 'skeleton',
                6: 'necromancer',
                7: 'centurion',
                8: 'berserker',
                9: 'frostwight',
                11: 'phantom',
                12: 'pyro',
                13: 'stalker',
                14: 'juggernaut',
                16: 'siren',
                17: 'harvester',
                18: 'slobber',
                19: 'voidknight'
              };
              const fType = featuredMap[this.wave] || 'walker';
              this.zombies.push(new Zombie(this, this.cameras.main.width + 60 + Math.random() * 70, this.wave, fType));
            } else {
              this.zombies.push(new Zombie(this, this.cameras.main.width + 60 + Math.random() * 70, this.wave));
            }
          } else {
            // Subsequent spawns in the wave:
            const total = this.totalEnemiesThisWave || 25;
            let spawnedBig = false;

            if (targetBigZombies > 0 && this.bigZombiesSpawnedThisWave < targetBigZombies) {
              const nextIndex = this.bigZombiesSpawnedThisWave; // 1 to targetBigZombies - 1
              // Spaced evenly across remaining enemies
              const threshold = Math.max(1, Math.floor(total * (1 - nextIndex / targetBigZombies)));
              if (this.enemiesToSpawn <= threshold) {
                const bType = this.getBigZombieTypeForWave(this.wave, nextIndex, targetBigZombies);
                const bScaleOffset = bType === 'malakor' ? 80 : 70;
                this.zombies.push(new Zombie(this, this.cameras.main.width + bScaleOffset + Math.random() * 40, this.wave, bType));
                this.bigZombiesSpawnedThisWave++;
                spawnedBig = true;

                const isFinal = this.bigZombiesSpawnedThisWave === targetBigZombies;
                const bossName = bType === 'malakor' ? 'APEX DRAGON TITAN' : (bType === 'reaper' ? 'ABYSSAL LICH TITAN' : 'COLOSSAL TITAN CRUSHER');
                const bossCol = bType === 'malakor' ? '#ff3838' : (bType === 'reaper' ? '#e056fd' : '#ff4757');
                soundFX.playExplosion();
                this.shakeScreen(isFinal ? 24 : 18, isFinal ? 0.55 : 0.40);
                this.spawnFloatingText(`👑 [${this.bigZombiesSpawnedThisWave}/${targetBigZombies}] ${bossName} ${isFinal ? 'AWAKENS!' : 'ADVANCING!'} 👑`, this.cameras.main.width * 0.72, this.cameras.main.height * 0.40, bossCol, isFinal ? 28 : 24);
              }
            }

            if (!spawnedBig) {
              this.zombies.push(new Zombie(this, this.cameras.main.width + 60 + Math.random() * 70, this.wave));
            }
          }
          this.enemiesToSpawn--;
        }
      }

      // Space key for jump
      const spacePressed = this.spaceKey ? this.spaceKey.isDown : false;
      this.player.update(dt, spacePressed, this.tower.topY, this.tower.x);

      // Smooth bow draw buffering: if player is holding mouse/touch down once the millisecond firing gap expires
      if (
        this.state === 'playing' &&
        this.player &&
        !this.player.dead &&
        !this.player.isCharging &&
        this.player.cooldown <= 0 &&
        this.input.activePointer &&
        (this.input.activePointer.leftButtonDown() || this.input.activePointer.isDown)
      ) {
        this.player.setAim(this.input.activePointer.x, this.input.activePointer.y);
        this.player.startCharge();
      }

      // Tower defenses & auto-turret
      this.tower.update(dt, this.zombies, this.arrows);

      // Zombie updates (passing all zombies for dynamic flocking and separation spacing)
      for (const z of this.zombies) {
        z.update(dt, this.tower, this.zombies);
      }

      // Reset pitch pit status before checking hazards
      for (const z of this.zombies) {
        z.inPitchPit = false;
        if (z.speed < 25 && !z.dead) {
          z.speed = 75; // Self-heal any zombie whose speed was previously multiplied to 0
        }
      }

      // ── Update Battlefield Hazards: Pitch Pits (Burning countdown & Zombie effects) ──
      for (const pit of this.pitchPits) {
        if (pit.isIgnited) {
          pit.igniteTimer -= dt;
          if (pit.igniteTimer <= 0) {
            pit.isIgnited = false;
            pit.igniteTimer = 0;
            this.spawnFloatingText('💨 PITCH PIT EXTINGUISHED', pit.x, pit.y - 25, '#7f8c8d', 16);
          }
        }
        for (const z of this.zombies) {
          if (!z.dead && z.x >= pit.x - pit.width / 2 && z.x <= pit.x + pit.width / 2) {
            if (pit.isIgnited) {
              z.isBurning = true;
              z.burnTimer = Math.max(z.burnTimer, 3.2);
              z.takeDamage(45 * dt, 0, -10 * dt, false, 'torso');
            } else {
              z.inPitchPit = true;
              if (z.isBurning) {
                this.ignitePitchPit(pit);
              }
            }
          }
        }
      }

      // Arrows & Collisions
      for (let i = this.arrows.length - 1; i >= 0; i--) {
        const a = this.arrows[i];
        a.update(dt, this.tower.groundY, this.tower);

        // Check Arrow Hit on Gunpowder Barrels
        if (!a.stuck && !a.dead) {
          for (const b of this.gunpowderBarrels) {
            if (!b.dead) {
              const bTop = b.y - b.height;
              if (a.x >= b.x - b.width / 2 - 4 && a.x <= b.x + b.width / 2 + 4 &&
                  a.y >= bTop - 4 && a.y <= b.y + 4) {
                this.detonateGunpowderBarrel(b, a.type === 'fire' || a.type === 'cluster');
                a.checkTriggerStormRain(a.x);
                a.dead = true;
                break;
              }
            }
          }
        }

        // Fire or Cluster Arrow in flight ignites Pitch Pits
        if (!a.dead && !a.stuck && (a.type === 'fire' || a.type === 'cluster')) {
          for (const pit of this.pitchPits) {
            if (!pit.isIgnited && Math.abs(a.x - pit.x) <= pit.width / 2 && a.y >= this.tower.groundY - 30) {
              this.ignitePitchPit(pit);
            }
          }
        }

        // ── Mid-Air Arrow Interception: Shooting Enemy Attacks Diminishes/Neutralizes Them ──
        if (!a.dead && !a.stuck && this.enemyHazards.length > 0) {
          const cosA = Math.cos(a.angle);
          const sinA = Math.sin(a.angle);
          const arrowTipX = a.x + cosA * 18;
          const arrowTipY = a.y + sinA * 18;

          for (let hi = this.enemyHazards.length - 1; hi >= 0; hi--) {
            const h = this.enemyHazards[hi];
            if (!h.dead) {
              const hitRadius = (h.radius || 18) + (a.type === 'ballista' ? 24 : 18);
              const distTip = Phaser.Math.Distance.Between(arrowTipX, arrowTipY, h.x, h.y);
              const distCenter = Phaser.Math.Distance.Between(a.x, a.y, h.x, h.y);
              const minHazardDist = Math.min(distTip, distCenter);

              if (minHazardDist <= hitRadius) {
                // Intercepted enemy attack! Attack is neutralized and diminished!
                const isBomb = h.subType === 'fire_bomb' || h.subType === 'bile_bomb' || h.subType === 'shadow_blade' || h.subType === 'shadow_bomb';
                h.dead = true;
                this.enemyHazards.splice(hi, 1);

                if (h.subType === 'dragon_hellfire_meteor') {
                  // 🔥 Malakor Dragon Hellfire Meteor intercepted & diminished!
                  this.spawnExplosion(h.x, h.y, 85);
                  soundFX.playExplosion();
                  this.shakeScreen(15, 0.35);
                  for (let s = 0; s < 16; s++) {
                    this.bloodMists.push({
                      x: h.x + (Math.random() - 0.5) * 30,
                      y: h.y + (Math.random() - 0.5) * 30,
                      vx: (Math.random() - 0.5) * 260,
                      vy: (Math.random() - 0.5) * 260,
                      r: 8 + Math.random() * 8,
                      maxR: 22 + Math.random() * 12,
                      col: 0xff3838,
                      alpha: 0.9,
                      life: 0.5 + Math.random() * 0.4,
                      maxLife: 0.9
                    });
                  }
                  this.spawnFloatingText('🔥 DRAGON HELLFIRE INTERCEPTED! DIMINISHED! 🛡️', h.x, h.y - 35, '#ff3838', 22);
                } else if (h.subType === 'void_meteor') {
                  // ☄️ Void Meteor intercepted & neutralized!
                  this.spawnExplosion(h.x, h.y, 75);
                  soundFX.playExplosion();
                  this.shakeScreen(12, 0.30);
                  this.spawnFloatingText('☄️ VOID METEOR INTERCEPTED! DIMINISHED! 🌌', h.x, h.y - 35, '#a55eea', 22);
                } else if (h.subType === 'abyssal_slash') {
                  // 🌌 Voidknight Dimensional Rift Slash shattered!
                  soundFX.playArmorHit();
                  for (let s = 0; s < 12; s++) {
                    this.electricSparks.push({
                      x: h.x,
                      y: h.y,
                      vx: (Math.random() - 0.5) * 240,
                      vy: (Math.random() - 0.5) * 240,
                      life: 0.4 + Math.random() * 0.3,
                      maxLife: 0.7,
                      col: 0xa29bfe
                    });
                  }
                  this.spawnFloatingText('🌌 ABYSSAL RIFT STRUCK & SHATTERED! ⚡', h.x, h.y - 30, '#a29bfe', 20);
                } else if (h.type === 'shockwave' || h.subType === 'ground_flame_wave') {
                  // ⚡ Ground flame cataclysm or seismic wave disrupted!
                  soundFX.playExplosion();
                  this.shakeScreen(8, 0.2);
                  for (let s = 0; s < 12; s++) {
                    this.electricSparks.push({
                      x: h.x,
                      y: h.y,
                      vx: (Math.random() - 0.5) * 220,
                      vy: -40 - Math.random() * 120,
                      life: 0.4,
                      maxLife: 0.6,
                      col: 0xf1c40f
                    });
                  }
                  this.spawnFloatingText('⚡ WAVE DISRUPTED BY ARROW! 💥', h.x, h.y - 30, '#ffd700', 20);
                } else if (h.subType === 'acid_spit' || (h.name && h.name.includes('ACID'))) {
                  // 🧪 Acid spit popped in mid-air!
                  soundFX.playArmorHit();
                  for (let s = 0; s < 10; s++) {
                    this.toxicSplashes.push({
                      x: h.x,
                      y: h.y,
                      vx: (Math.random() - 0.5) * 160,
                      vy: (Math.random() - 0.5) * 160,
                      r: 4,
                      col: 0x2ecc71,
                      life: 0.4,
                      maxLife: 0.6
                    });
                  }
                  this.spawnFloatingText('🧪 ACID GLOBULE POPPED! DIMINISHED! 💨', h.x, h.y - 30, '#2ecc71', 20);
                } else if (h.subType === 'sonic_screech') {
                  // 🔊 Sonic wave shattered!
                  soundFX.playArmorHit();
                  this.spawnFloatingText('🔊 SONIC WAVE DISPERSED IN MID-AIR! ⚡', h.x, h.y - 30, '#a29bfe', 20);
                } else if (h.subType === 'shadow_skull') {
                  // 💀 Shadow skull banished!
                  soundFX.playArmorHit();
                  this.spawnFloatingText('SHADOW MAGIC PURGED!', h.x, h.y - 30, '#a855f7', 20);
                } else if (isBomb) {
                  // Early mid-air detonation: bomb damage and effect are completely neutralized/diminished!
                  this.spawnExplosion(h.x, h.y, 65);
                  soundFX.playExplosion();
                  this.shakeScreen(10, 0.25);
                  this.spawnFloatingText('🎯 BOMB INTERCEPTED! EFFECT DIMINISHED! 💥', h.x, h.y - 35, '#ffd700', 22);
                } else if (h.subType === 'bone_arrow') {
                  // Arrow-on-arrow mid-air deflection!
                  soundFX.playBowRelease(0.5);
                  for (let s = 0; s < 8; s++) {
                    this.electricSparks.push({
                      x: h.x,
                      y: h.y,
                      vx: (Math.random() - 0.5) * 220,
                      vy: (Math.random() - 0.5) * 220,
                      life: 0.35 + Math.random() * 0.25,
                      maxLife: 0.6,
                      col: 0xecf0f1
                    });
                  }
                  this.spawnFloatingText('🏹 ARROW INTERCEPTED! DEFLECTED! ⚡', h.x, h.y - 30, '#00d2d3', 20);
                } else if (h.subType === 'frost_shard') {
                  // Solid ice shard shattered in mid-air!
                  soundFX.playArmorHit();
                  for (let s = 0; s < 8; s++) {
                    this.iceShards.push({
                      x: h.x,
                      y: h.y,
                      vx: (Math.random() - 0.5) * 200,
                      vy: -30 - Math.random() * 100,
                      r: 4,
                      rot: Math.random() * Math.PI,
                      vRot: (Math.random() - 0.5) * 8,
                      life: 0.5,
                      maxLife: 0.5,
                      col: 0x00d2d3
                    });
                  }
                  this.spawnFloatingText('❄️ ICE SHARD SHATTERED! ⚡', h.x, h.y - 30, '#00d2d3', 20);
                } else {
                  // Physical flying cleaver or other projectile deflected in mid-air!
                  soundFX.playArmorHit();
                  for (let s = 0; s < 10; s++) {
                    this.electricSparks.push({
                      x: h.x,
                      y: h.y,
                      vx: (Math.random() - 0.5) * 260,
                      vy: (Math.random() - 0.5) * 260,
                      life: 0.35 + Math.random() * 0.25,
                      maxLife: 0.6,
                      col: 0x00f2fe
                    });
                  }
                  this.spawnFloatingText(`⚔️ ${h.name} DEFLECTED & DIMINISHED! ⚡`, h.x, h.y - 30, '#00d2d3', 20);
                }

                // Reward player for clutch tactical shot
                if (this.player) {
                  const bonusSkulls = (h.subType === 'dragon_hellfire_meteor' || h.subType === 'void_meteor') ? 2 : 1;
                  this.player.skulls = (this.player.skulls || 0) + bonusSkulls;
                  this.updateMenuSkullsUI();
                }

                a.checkTriggerStormRain(h.x);
                a.pierceCount--;
                if (a.pierceCount <= 0 && a.type !== 'buzzsaw' && a.type !== 'ballista' && a.type !== 'holy') {
                  a.dead = true;
                  break;
                }
              }
            }
          }
        }

        if (!a.stuck && !a.dead) {
          const cosA = Math.cos(a.angle);
          const sinA = Math.sin(a.angle);
          const tipX = a.x + cosA * 16;
          const tipY = a.y + sinA * 16;
          const pX = a.prevX ?? a.x;
          const pY = a.prevY ?? a.y;
          const prevTipX = pX + cosA * 16;
          const prevTipY = pY + sinA * 16;

          // Helper for continuous collision detection (CCD) swept segment distance
          const distSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const l2 = dx * dx + dy * dy;
            if (l2 === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
            let t = ((px - x1) * dx + (py - y1) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
          };

          // Sort live candidate zombies by distance to arrow start position along flight path
          // so the front-most zombie is struck first, stopping non-piercing arrows immediately
          const candidateZombies = this.zombies.filter(z => !z.dead && !a.hitEntities.has(z));
          candidateZombies.sort((z1, z2) => {
            const d1 = Phaser.Math.Distance.Between(pX, pY, z1.x, z1.y - 30 * z1.scale);
            const d2 = Phaser.Math.Distance.Between(pX, pY, z2.x, z2.y - 30 * z2.scale);
            return d1 - d2;
          });

          for (const z of candidateZombies) {
            if (z.dead || a.hitEntities.has(z)) continue;

            const hx = z.ragdoll.head.position.x;
            const hy = z.ragdoll.head.position.y;
            const minHeadDist = Math.min(
              Phaser.Math.Distance.Between(tipX, tipY, hx, hy),
              Phaser.Math.Distance.Between(a.x, a.y, hx, hy),
              distSeg(hx, hy, prevTipX, prevTipY, tipX, tipY)
            );
            const isHeadHit = minHeadDist <= 16 * z.scale;

            const tx = z.ragdoll.torso.position.x;
            const ty = z.ragdoll.torso.position.y;
            const minTorsoDist = Math.min(
              Phaser.Math.Distance.Between(tipX, tipY, tx, ty),
              Phaser.Math.Distance.Between(a.x, a.y, tx, ty),
              distSeg(tx, ty, prevTipX, prevTipY, tipX, tipY)
            );
            const inTorsoBox = (Math.abs(tipX - tx) <= 15 * z.scale && Math.abs(tipY - ty) <= 22 * z.scale) ||
                              (Math.abs(pX - tx) <= 15 * z.scale && Math.abs(pY - ty) <= 22 * z.scale);
            const isTorsoHit = minTorsoDist <= 20 * z.scale || inTorsoBox || (z.isCrawling && Phaser.Math.Distance.Between(tipX, tipY, z.x, z.y - 12 * z.scale) <= 25 * z.scale);

            // Precision Leg Hit: check distance to thighs, calves, and swept segments
            const leftThighDist = Math.min(
              Phaser.Math.Distance.Between(tipX, tipY, z.ragdoll.leftThigh.position.x, z.ragdoll.leftThigh.position.y),
              distSeg(z.ragdoll.leftThigh.position.x, z.ragdoll.leftThigh.position.y, prevTipX, prevTipY, tipX, tipY)
            );
            const rightThighDist = Math.min(
              Phaser.Math.Distance.Between(tipX, tipY, z.ragdoll.rightThigh.position.x, z.ragdoll.rightThigh.position.y),
              distSeg(z.ragdoll.rightThigh.position.x, z.ragdoll.rightThigh.position.y, prevTipX, prevTipY, tipX, tipY)
            );
            const leftCalfDist = Math.min(
              Phaser.Math.Distance.Between(tipX, tipY, z.ragdoll.leftCalf.position.x, z.ragdoll.leftCalf.position.y),
              distSeg(z.ragdoll.leftCalf.position.x, z.ragdoll.leftCalf.position.y, prevTipX, prevTipY, tipX, tipY)
            );
            const rightCalfDist = Math.min(
              Phaser.Math.Distance.Between(tipX, tipY, z.ragdoll.rightCalf.position.x, z.ragdoll.rightCalf.position.y),
              distSeg(z.ragdoll.rightCalf.position.x, z.ragdoll.rightCalf.position.y, prevTipX, prevTipY, tipX, tipY)
            );
            const minLegDist = Math.min(leftThighDist, rightThighDist, leftCalfDist, rightCalfDist);
            const inLegBox = tipY >= z.y - 16 * z.scale && tipY <= z.y + 24 * z.scale && Math.abs(tipX - z.x) <= 18 * z.scale;

            const isLegHit = !z.isCrawling && (minLegDist <= 16 * z.scale || inLegBox);

            const isDedicatedPierce = a.type === 'ballista' || a.type === 'buzzsaw' || a.type === 'holy';

            // 1. HEADSHOT
            if (isHeadHit) {
              a.hitEntities.add(z);
              z.lastHitArrowType = a.type;
              z.addAttachedArrow('head', tipX, tipY, a.angle, a.type);
              this.spawnCuttingSlash(tipX, tipY, a.angle, a.type, true);
              z.addCut(tipX, tipY, a.angle, 26);

              if (z.helmet) {
                z.helmet.hp -= a.damage;
                soundFX.playArmorHit();
                this.spawnFloatingText('🛡️ DEFLECTED!', a.x, a.y - 20, '#bdc3c7', 16);
                if (z.helmet.hp <= 0) {
                  z.helmet = null;
                  this.spawnFloatingText('💥 HELMET SHATTERED!', a.x, a.y - 35, '#f1c40f', 18);
                }
                a.checkTriggerStormRain(tipX);
                a.dead = true;
                break;
              }

              const critMul = 2.8 + (this.player.eagleEyeLevel || 0) * 0.6 + (this.player.headshotCritBonus || 0);
              const dmg = a.damage * critMul;
              soundFX.playHeadshot();
              this.shakeScreen(10, 0.25);
              this.spawnFloatingText(`💀 HEADSHOT! ${Math.round(dmg)}`, a.x, a.y - 35, '#ff3838', 26);

              const impX = a.type === 'ballista' ? a.body.velocity.x * 35 : a.body.velocity.x * 15;
              this.applyArrowElementalEffects(a, z, tipX, tipY, true, dmg);
              z.takeDamage(dmg, impX, a.body.velocity.y * 15, true, 'head');

              if (isDedicatedPierce) {
                a.pierceCount--;
                if (a.dead || a.pierceCount <= 0) { a.dead = true; break; }
              } else if (a.type === 'ricochet') {
                if (a.dead || a.bounceCount >= 3) { a.dead = true; break; }
                break;
              } else {
                // All standard arrows (fire, normal, ice, triple, viper, tesla, homing, storm, cluster, blackhole) STOP immediately!
                a.dead = true;
                a.pierceCount = 0;
                break;
              }
            }
            // 2. LEG HIT
            else if (isLegHit) {
              a.hitEntities.add(z);
              z.lastHitArrowType = a.type;
              z.addAttachedArrow('rightLeg', tipX, tipY, a.angle, a.type);
              this.applyArrowElementalEffects(a, z, tipX, tipY, false, a.damage);
              this.spawnCuttingSlash(tipX, tipY, a.angle, a.type, false);
              z.addCut(tipX, tipY, a.angle, 18);
              z.hitLeg(a.damage, a.body.velocity.x * 10, a.body.velocity.y * 10, a.type);

              if (isDedicatedPierce) {
                a.pierceCount--;
                if (a.dead || a.pierceCount <= 0) { a.dead = true; break; }
              } else if (a.type === 'ricochet') {
                if (a.dead || a.bounceCount >= 3) { a.dead = true; break; }
                break;
              } else {
                a.dead = true;
                a.pierceCount = 0;
                break;
              }
            }
            // 3. TORSO / BODY HIT
            else if (isTorsoHit) {
              a.hitEntities.add(z);

              // Cleaver Berserker: 35% chance to deflect/parry torso arrow with spinning meat cleavers!
              if (z.type === 'berserker' && !z.isFrozen && a.type !== 'ballista' && a.type !== 'buzzsaw' && Math.random() < 0.35) {
                soundFX.playArmorHit();
                this.spawnFloatingText('⚔️ CLEAVER PARRY!', a.x, a.y - 25, '#f1c40f', 18);
                this.shakeScreen(5, 0.12);
                a.checkTriggerStormRain(tipX);
                a.dead = true;
                break;
              }

              z.lastHitArrowType = a.type;
              z.addAttachedArrow('torso', tipX, tipY, a.angle, a.type);
              this.applyArrowElementalEffects(a, z, tipX, tipY, false, a.damage);
              this.spawnCuttingSlash(tipX, tipY, a.angle, a.type, false);
              z.addCut(tipX, tipY, a.angle, 22);
              soundFX.playFleshHit(false);
              const bodyDmgDisplay = Math.round(a.damage * (z.type === 'juggernaut' ? 0.50 : (z.type === 'boss' || z.type === 'reaper' ? 0.65 : 0.75)));
              this.spawnFloatingText(`-${bodyDmgDisplay} BODY HIT 🎯`, a.x, a.y - 18, '#ffffff', 18);
              const impX = a.type === 'ballista' ? a.body.velocity.x * 25 : a.body.velocity.x * 8;
              z.takeDamage(a.damage, impX, a.body.velocity.y * 8, false, 'torso');

              if (isDedicatedPierce) {
                a.pierceCount--;
                if (a.dead || a.pierceCount <= 0) { a.dead = true; break; }
              } else if (a.type === 'ricochet') {
                if (a.dead || a.bounceCount >= 3) { a.dead = true; break; }
                break;
              } else {
                a.dead = true;
                a.pierceCount = 0;
                break;
              }
            }
          }
        }

        if (a.dead) {
          a.checkTriggerStormRain(a.x);
          a.destroy();
          this.arrows.splice(i, 1);
        }
      }

      // Vortices
      for (let i = this.vortices.length - 1; i >= 0; i--) {
        const v = this.vortices[i];
        v.life -= dt;
        v.angle += dt * 8;
        for (const z of this.zombies) {
          if (!z.dead) {
            const d = Phaser.Math.Distance.Between(v.x, v.y, z.x, z.y - 40 * z.scale);
            if (d < v.r) {
              const pullStr = (1 - d / v.r) * 320 * dt;
              z.x += (v.x - z.x) * 0.05;
              z.takeDamage(40 * dt, 0, 0, false, 'torso');
            }
          }
        }
        if (v.life <= 0) this.vortices.splice(i, 1);
      }

      // ── Update Enemy Hazards (Projectiles & Shockwaves targeting Player) ──
      for (let i = this.enemyHazards.length - 1; i >= 0; i--) {
        const h = this.enemyHazards[i];
        h.life -= dt;
        if (h.gravity) {
          h.vy += h.gravity * dt;
        }
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.vRot) h.rot = (h.rot || 0) + h.vRot * dt;

        if (h.type === 'projectile') {
          h.trail.push({ x: h.x, y: h.y });
          if (h.trail.length > 8) h.trail.shift();

          const isBomb = h.subType === 'fire_bomb' || h.subType === 'bile_bomb' || h.subType === 'shadow_blade' || h.subType === 'shadow_bomb';

          // ── Tower Barricade Collision for Siege Bombs ──
          if (isBomb && !h.dead) {
            const towerFront = this.tower.x + this.tower.width / 2;
            const towerTopY = this.tower.topY;
            const towerGroundY = this.tower.groundY;
            const hitTower = (h.x <= towerFront + 14 && h.x >= this.tower.x - 30 && h.y >= towerTopY - 15 && h.y <= towerGroundY + 15)
                          || (h.y >= towerGroundY - 8 && h.x <= towerFront + 45);

            if (hitTower) {
              h.dead = true;
              this.tower.takeDamage(h.damage);
              this.spawnExplosion(h.x, h.y, 90);
              soundFX.playExplosion();
              this.shakeScreen(14, 0.35);
              const bombCol = h.subType === 'bile_bomb' ? '#2ecc71' : (h.subType === 'shadow_blade' || h.subType === 'shadow_bomb') ? '#ff5252' : '#ff793f';
              this.spawnFloatingText(`💣 BOMB HIT TOWER! -${Math.round(h.damage)} BARRICADE HP 🛡️`, this.tower.x + 30, this.tower.topY - 30, bombCol, 22);

              if (h.subType === 'fire_bomb' || h.subType === 'shadow_blade' || h.subType === 'shadow_bomb') {
                const blastCol = (h.subType === 'shadow_blade' || h.subType === 'shadow_bomb') ? 0xff5252 : 0xd35400;
                for (let s = 0; s < 14; s++) {
                  this.bloodMists.push({
                    x: h.x + (Math.random() - 0.5) * 35,
                    y: h.y - Math.random() * 35,
                    vx: (Math.random() - 0.5) * 80,
                    vy: -30 - Math.random() * 70,
                    r: 10 + Math.random() * 12,
                    maxR: 26 + Math.random() * 15,
                    col: 0xd35400,
                    alpha: 0.85,
                    life: 0.6 + Math.random() * 0.4,
                    maxLife: 1.0
                  });
                }
              }
            }
          }

          // ── Hit & Air Dodge Detection for Player (Direct Attacks, non-bombs) ──
          if (!isBomb && !this.player.dead && !h.dead) {
            // Player dimensions on tower deck:
            // Feet: this.player.y
            // Head: this.player.y - 65
            // Horizontal half-width: 22
            const rad = h.radius || 14;
            const overlapX = Math.abs(h.x - this.player.x) <= (22 + rad);
            const overlapY = (h.y + rad >= this.player.y - 68) && (h.y - rad <= this.player.y + 12);
            const playerDist = Phaser.Math.Distance.Between(h.x, h.y, this.player.x, this.player.y - 35);
            const isColliding = overlapX && (overlapY || playerDist <= (28 + rad));

            if (isColliding) {
              // Direct hit on the Player! (Applies whether on ground, jumping, falling, or landing right on the acid!)
              this.player.takeDamage(h.damage);
              this.spawnFloatingText(`${h.name} HIT! -${Math.round(h.damage)} HP ❤️`, this.player.x, this.player.y - 60, '#ff3838', 26);

              if (h.subType === 'acid_spit' || h.subType === 'bile_bomb' || (h.name && h.name.includes('ACID'))) {
                this.shakeScreen(18, 0.4);
                soundFX.playArmorHit();
                this.spawnFloatingText('☣️ ACID BURN! CORROSIVE DAMAGE! 🧪', this.player.x, this.player.y - 85, '#2ed573', 22);
                for (let s = 0; s < 14; s++) {
                  this.toxicSplashes.push({
                    x: this.player.x + (Math.random() - 0.5) * 30,
                    y: this.player.y - 15 - Math.random() * 45,
                    vx: (Math.random() - 0.5) * 180,
                    vy: -60 - Math.random() * 140,
                    r: 3 + Math.random() * 4.5,
                    col: 0x2ed573,
                    life: 0.7 + Math.random() * 0.4,
                    maxLife: 1.1
                  });
                }
              } else if (h.subType === 'sonic_screech') {
                this.player.stamina = Math.max(0, (this.player.stamina ?? 100) - 30);
                this.spawnFloatingText('⚡ SONIC DISRUPTION! -30 STAMINA ⚡', this.player.x, this.player.y - 85, '#a29bfe', 20);
                this.shakeScreen(14, 0.3);
                soundFX.playFleshHit(true);
              } else if (h.subType === 'void_meteor') {
                this.shakeScreen(24, 0.45);
                soundFX.playExplosion();
              } else if (h.subType === 'dragon_hellfire_meteor') {
                this.shakeScreen(26, 0.55);
                soundFX.playExplosion();
                this.spawnFloatingText('💥 DRAGON HELLFIRE IMPACT! 💥', this.player.x, this.player.y - 85, '#ff3838', 24);
              } else if (h.subType === 'abyssal_slash') {
                this.player.stamina = Math.max(0, (this.player.stamina ?? 100) - 20);
                this.spawnFloatingText('🌌 ABYSSAL RIFT! -20 STAMINA 🌌', this.player.x, this.player.y - 85, '#a55eea', 22);
                this.shakeScreen(20, 0.4);
                soundFX.playFleshHit(true);
              } else {
                this.shakeScreen(16, 0.35);
                soundFX.playFleshHit(true);
              }
              h.dead = true;
            } else if (!h.dodged && h.x < this.player.x - 14 && h.vx < 0) {
              // Projectile has cleanly passed the player without colliding!
              // If the player successfully jumped high enough so feet were above the projectile:
              const jumpedOver = !this.player.onGround && (this.player.y < h.y - rad);
              if (jumpedOver) {
                h.dodged = true;
                this.player.dodgesCount = (this.player.dodgesCount || 0) + 1;
                this.spawnFloatingText('DODGED! 💨 [AIR DODGE]', this.player.x, this.player.y - 50, '#2ecc71', 22);
                soundFX.playBowRelease(0.5);
              }
            }
          }

          // Offscreen despawn (full left side outside of screen so projectile smoothly exits screen)
          if (h.x < -120 || h.x > this.cameras.main.width + 120 || h.y > this.cameras.main.height + 120 || h.y < -120) {
            h.dead = true;
          }
        } else if (h.type === 'shockwave') {
          // If this is a ground flame wave advancing across the battlefield
          if (h.subType === 'ground_flame_wave') {
            const towerFront = this.tower.x + this.tower.width / 2 + 10;
            if (h.x <= towerFront && !(h as any).hitBarricade) {
              (h as any).hitBarricade = true;
              this.tower.takeDamage(h.damage * 0.70);
              this.spawnExplosion(h.x, this.tower.groundY - 25, 75);
              soundFX.playExplosion();
              this.shakeScreen(14, 0.35);
              this.spawnFloatingText('🔥 DRAGON CLEAVE IMPACTS BARRICADE! 🛡️', this.tower.x + 30, this.tower.groundY - 50, '#ff3838', 22);
              // Elevate wave to climb onto tower deck
              h.y = this.tower.topY + 6;
            }
          }

          // Shockwave traveling along tower deck
          if (Math.abs(h.x - this.player.x) < 26 && !this.player.dead && !h.dead) {
            if (this.player.onGround && !h.dodged) {
              h.dodged = true;
              this.player.takeDamage(h.damage);
              this.spawnFloatingText(`💥 ${h.name} HIT! -${Math.round(h.damage)} HP`, this.player.x, this.player.y - 65, '#e74c3c', 22);
              this.shakeScreen(14, 0.35);
            }
          } else if (!h.dodged && h.x < this.player.x - 16 && !this.player.dead) {
            // Player jumped over shockwave and shockwave passed behind the player
            h.dodged = true;
            this.spawnFloatingText('SHOCKWAVE CLEARED! 🪽', this.player.x, this.player.y - 50, '#f1c40f', 22);
            soundFX.playGemCollect();
          }

          // Shockwave exits full left side outside of screen
          if (h.x < -80) {
            h.dead = true;
          }
        }

        if (h.life <= 0 || h.dead) {
          this.enemyHazards.splice(i, 1);
        }
      }

      // Pickups
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pk = this.pickups[i];
        pk.update(dt, this.player);
        if (pk.dead) this.pickups.splice(i, 1);
      }

      // Clean dead zombies: allow natural physics collapse and ground settling, then fade out and destroy
      this.zombies = this.zombies.filter(z => {
        if (!z.dead) return true;
        if (z.deadTimer >= 5.0) {
          try { z.destroy(); } catch (e) {}
          return false;
        }
        return true;
      });

      // Check Wave Completion (Fast, snappy transition after last kill before showing upgrade shop)
      if (this.enemiesToSpawn <= 0 && this.zombies.filter(z => !z.dead).length === 0) {
        if (!this.waveCompleting) {
          // Last enemy just died! Fast 0.4s transition
          this.waveCompleting = true;
          this.waveCompleteDelay = 0.4;

          // Wave clear rewards: Stamina and Health recovery
          if (this.player && !this.player.dead) {
            const isCampaign = this.gameMode === 'campaign';

            // Give 50% stamina to player upon wave completion!
            const staminaBonus = Math.round((this.player.maxStamina || 100) * 0.5);
            this.player.restoreStamina(staminaBonus);
            this.spawnFloatingText(`+${staminaBonus}% STAMINA! ⚡`, this.player.x, this.player.y - 45, '#00d2d3', 24);

            if (isCampaign) {
              // Special permanent health upgrade after wave 1:
              if (this.wave === 1 && !this.player.hasWave1HealthBonus) {
                this.player.hasWave1HealthBonus = true;
                this.player.maxHP += 25; // Permanent health increase after wave 1 (115 -> 140 HP)
                this.player.hp = this.player.maxHP; // Fully healed
                this.spawnFloatingText('WAVE 1 SURVIVOR: +25 MAX HP!', this.player.x, this.player.y - 95, '#2ecc71', 26);
              } else {
                const hpHeal = Math.max(50, Math.round(this.player.maxHP * 0.45));
                this.player.hp = Math.min(this.player.maxHP, this.player.hp + hpHeal);
                this.spawnFloatingText(`+${hpHeal} HP RECOVERED! ❤️`, this.player.x, this.player.y - 70, '#2ecc71', 24);
              }

              if (this.tower) {
                this.tower.repair(50);
                this.spawnFloatingText('+50 FORTRESS REPAIR! 🛡️', this.tower.x, this.tower.topY - 30, '#3498db', 22);
              }
            } else {
              // Endless mode: slight breather heal
              this.player.hp = Math.min(this.player.maxHP, this.player.hp + 20);
              this.spawnFloatingText('+20 HP! ❤️', this.player.x, this.player.y - 70, '#2ecc71', 22);
            }

            soundFX.playGemCollect();
            uiManager.updateHUD(this.player, this.tower, this.wave, 0, this.kills, this.gameMode);
          }
        } else {
          // Count down the gap while ragdoll physics complete naturally
          this.waveCompleteDelay -= dt;
          if (this.waveCompleteDelay <= 0) {
            this.waveCompleting = false;

            // Destroy all dead bodies cleanly before opening shop
            for (const z of this.zombies) {
              try { if (z.dead) z.destroy(); } catch (e) {}
            }
            this.zombies = [];

            // Check if Campaign Mode is finished!
            if (this.gameMode === 'campaign') {
              if (this.wave >= 20) {
                this.showVictoryScreen();
              } else {
                this.campaignWave = this.wave + 1;
                this.highestCampaignWave = Math.max(this.highestCampaignWave || 1, this.wave + 1);
                this.saveGameData();
                this.openShop();
              }
            } else {
              this.saveGameData();
              this.openShop();
            }
          }
        }
      }

      // ── Update Visual Effects (Lightning Strikes, Ice Shards, Sparks) ──
      for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
        const ls = this.lightningStrikes[i];
        ls.life -= dt;
        ls.shockwaveR += 380 * dt;
        if (ls.life <= 0) this.lightningStrikes.splice(i, 1);
      }

      for (let i = this.electricSparks.length - 1; i >= 0; i--) {
        const sp = this.electricSparks[i];
        sp.life -= dt;
        sp.vy += 500 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        if (sp.life <= 0) this.electricSparks.splice(i, 1);
      }

      for (let i = this.iceShards.length - 1; i >= 0; i--) {
        const is = this.iceShards[i];
        is.life -= dt;
        is.vy += 650 * dt;
        is.x += is.vx * dt;
        is.y += is.vy * dt;
        is.rot += is.vRot * dt;
        if (is.life <= 0) this.iceShards.splice(i, 1);
      }

      // ── Update Shattered Body Gibs (Bone, Flesh, Ribs & Crystalline Shards) ──
      const groundY = this.tower ? this.tower.groundY : this.cameras.main.height * 0.72;
      for (let i = this.bodyGibs.length - 1; i >= 0; i--) {
        const bg = this.bodyGibs[i];
        bg.life -= dt;
        bg.vy += 880 * dt;
        bg.x += bg.vx * dt;
        bg.y += bg.vy * dt;
        bg.rot += bg.vRot * dt;

        // Realistic Ground Collision & Material Mechanics
        if (bg.y >= groundY - 2) {
          bg.y = groundY - 2;

          // Deposit persistent blood puddle / stain on first ground impact if organic
          if (!bg.hasStainedGround) {
            bg.hasStainedGround = true;
            if (bg.type === 'flesh' || bg.type === 'skull' || bg.type === 'rib' || bg.type === 'acid') {
              const stainCol = bg.type === 'acid' ? 0x27ae60 : (Math.random() < 0.6 ? 0x4a0008 : 0x6e000c);
              const stainW = (9 + Math.random() * 16) * Math.max(0.6, bg.w / 6);
              if (this.groundStains.length < 80) {
                this.groundStains.push({
                  x: bg.x,
                  y: groundY + 1,
                  w: stainW,
                  h: 3 + Math.random() * 2.5,
                  col: stainCol,
                  alpha: 0.88,
                  life: 20 + Math.random() * 10,
                  maxLife: 30
                });
              }
              // Impact splatter droplets
              for (let s = 0; s < 3; s++) {
                this.bloodSplats.push({
                  x: bg.x + (Math.random() - 0.5) * 6,
                  y: groundY - 2,
                  vx: (Math.random() - 0.5) * 80,
                  vy: -30 - Math.random() * 60,
                  r: 1.5 + Math.random() * 1.5,
                  life: 0.35 + Math.random() * 0.25,
                  maxLife: 0.6,
                  col: stainCol
                });
              }
            }
          }

          // Bounce according to material restitution
          bg.vy = -bg.vy * bg.restitution;
          bg.vx *= bg.friction;
          bg.vRot *= (bg.friction * 0.8);

          // Settle micro-jitters
          if (Math.abs(bg.vy) < 25) bg.vy = 0;
          if (Math.abs(bg.vx) < 15) bg.vx = 0;
        }

        if (bg.life <= 0) this.bodyGibs.splice(i, 1);
      }

      // ── Update Ground Blood Stains / Carnage Pools ──
      for (let i = this.groundStains.length - 1; i >= 0; i--) {
        const gs = this.groundStains[i];
        gs.life -= dt;
        if (gs.life <= 0) this.groundStains.splice(i, 1);
      }

      // ── Update Volumetric Blood / Cryo / Acid Mists ──
      for (let i = this.bloodMists.length - 1; i >= 0; i--) {
        const bm = this.bloodMists[i];
        bm.life -= dt;
        bm.x += bm.vx * dt;
        bm.y += bm.vy * dt;
        bm.vx *= 0.94;
        bm.vy *= 0.94;
        bm.r += (bm.maxR - bm.r) * 3.5 * dt;
        if (bm.life <= 0) this.bloodMists.splice(i, 1);
      }

      for (let i = this.bloodSplats.length - 1; i >= 0; i--) {
        const bs = this.bloodSplats[i];
        bs.life -= dt;
        bs.vy += 750 * dt;
        bs.x += bs.vx * dt;
        bs.y += bs.vy * dt;
        if (bs.life <= 0) this.bloodSplats.splice(i, 1);
      }

      // ── Update Explosions ──
      for (let i = this.explosions.length - 1; i >= 0; i--) {
        const ex = this.explosions[i];
        ex.life -= dt;
        ex.r += (ex.maxR - ex.r) * 12 * dt;
        for (let p = ex.particles.length - 1; p >= 0; p--) {
          const pt = ex.particles[p];
          pt.life -= dt;
          pt.vy += 400 * dt;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          if (pt.life <= 0) ex.particles.splice(p, 1);
        }
        if (ex.life <= 0) this.explosions.splice(i, 1);
      }

      // ── Update Holy Beams ──
      for (let i = this.holyBeams.length - 1; i >= 0; i--) {
        const hb = this.holyBeams[i];
        hb.life -= dt;
        hb.shockwaveR += 260 * dt;
        if (hb.life <= 0) this.holyBeams.splice(i, 1);
      }

      // ── Update Harpoon Kinetic Shockwaves ──
      for (let i = this.harpoonShockwaves.length - 1; i >= 0; i--) {
        const hs = this.harpoonShockwaves[i];
        hs.life -= dt;
        hs.r += 240 * dt;
        for (let s = hs.shards.length - 1; s >= 0; s--) {
          const sh = hs.shards[s];
          sh.vy += 500 * dt;
          sh.x += sh.vx * dt;
          sh.y += sh.vy * dt;
          sh.rot += sh.vRot * dt;
        }
        if (hs.life <= 0) this.harpoonShockwaves.splice(i, 1);
      }

      // ── Update Toxic Acid Splashes ──
      for (let i = this.toxicSplashes.length - 1; i >= 0; i--) {
        const ts = this.toxicSplashes[i];
        ts.life -= dt;
        ts.vy += 600 * dt;
        ts.x += ts.vx * dt;
        ts.y += ts.vy * dt;
        if (ts.life <= 0) this.toxicSplashes.splice(i, 1);
      }

      uiManager.updateHUD(this.player, this.tower, this.wave, this.zombies.filter(z => !z.dead).length + this.enemiesToSpawn, this.kills, this.gameMode);
      const activeBoss = this.zombies.find(z => !z.dead && (z.type === 'malakor' || z.type === 'reaper' || z.type === 'boss' || z.scale >= 1.5 || z.maxHP >= 450));
      uiManager.updateBossHUD(activeBoss || null);
    }

    // Render Entities
    this.renderBattlefieldHazards(this.graphicsLayer);
    this.tower.render(this.graphicsLayer);
    for (const pk of this.pickups) pk.render(this.graphicsLayer);
    for (const z of this.zombies) z.render(this.graphicsLayer);
    if (this.player) this.player.render(this.graphicsLayer);
    for (const a of this.arrows) a.render(this.graphicsLayer);

    // Divine Aegis invulnerability is active via player.invincible & tower.invincible without geometric overlays

    // 🎯 Ballistic Trajectory Guide (Active only when clicking/charging the bow)
    if (this.player && !this.player.dead && this.state === 'playing' && this.player.isCharging) {
      this.renderAimTrajectory(this.graphicsLayer);
    }

    // ── Render Persistent Ground Blood Stains / Carnage ──
    for (const gs of this.groundStains) {
      const alpha = Math.max(0, Math.min(1, gs.life / 5)) * gs.alpha;
      // Coagulated dark core pool
      this.graphicsLayer.fillStyle(gs.col, alpha * 0.92);
      this.graphicsLayer.fillEllipse(gs.x, gs.y, gs.w, gs.h);
      // Dried darker rim
      this.graphicsLayer.fillStyle(0x240306, alpha * 0.55);
      this.graphicsLayer.fillEllipse(gs.x, gs.y + 0.5, gs.w * 0.72, gs.h * 0.55);
    }

    // ── Render Volumetric Aerosolized Blood / Cryo / Acid Mists ──
    for (const bm of this.bloodMists) {
      const alpha = Math.max(0, bm.life / bm.maxLife) * bm.alpha;
      this.graphicsLayer.fillStyle(bm.col, alpha * 0.4);
      this.graphicsLayer.fillCircle(bm.x, bm.y, bm.r);
      this.graphicsLayer.fillStyle(bm.col, alpha * 0.2);
      this.graphicsLayer.fillCircle(bm.x, bm.y, bm.r * 1.35);
    }

    // ── Render Blood Splatters (Arterial Droplets) ──
    for (const bs of this.bloodSplats) {
      const alpha = Math.max(0, bs.life / bs.maxLife);
      this.graphicsLayer.fillStyle(bs.col, alpha * 0.95);
      this.graphicsLayer.fillCircle(bs.x, bs.y, bs.r);
      this.graphicsLayer.lineStyle(1.6, bs.col, alpha * 0.8);
      this.graphicsLayer.lineBetween(bs.x, bs.y, bs.x - bs.vx * 0.025, bs.y - bs.vy * 0.025);
    }

    // ── Render Shattered Body Gibs (Bone, Ribs, Flesh & Crystalline Shards) ──
    for (const bg of this.bodyGibs) {
      const alpha = Math.max(0, Math.min(1, bg.life / 0.8));
      const cosR = Math.cos(bg.rot);
      const sinR = Math.sin(bg.rot);

      if (bg.type === 'rib') {
        // Curved Anatomical Rib Bone
        this.graphicsLayer.lineStyle(2.4, bg.col, alpha);
        const rRad = bg.w;
        const p0x = bg.x - cosR * rRad;
        const p0y = bg.y - sinR * rRad;
        const p1x = bg.x + sinR * (rRad * 0.7);
        const p1y = bg.y - cosR * (rRad * 0.7);
        const p2x = bg.x + cosR * rRad + sinR * (rRad * 0.3);
        const p2y = bg.y + sinR * rRad - cosR * (rRad * 0.3);
        this.graphicsLayer.lineBetween(p0x, p0y, p1x, p1y);
        this.graphicsLayer.lineBetween(p1x, p1y, p2x, p2y);
        // Exposed red marrow fracture tip
        this.graphicsLayer.fillStyle(bg.secondaryCol || 0x3a0005, alpha * 0.9);
        this.graphicsLayer.fillCircle(p0x, p0y, 1.8);
      } else if (bg.type === 'bone') {
        // Fractured Weathered Bone Shard with Marrow Canal
        if (bg.points && bg.points.length >= 3) {
          const transformed = bg.points.map(pt => ({
            x: bg.x + cosR * pt.x - sinR * pt.y,
            y: bg.y + sinR * pt.x + cosR * pt.y
          }));
          this.graphicsLayer.fillStyle(bg.col, alpha);
          this.graphicsLayer.fillPoints(transformed as any, true);
          this.graphicsLayer.lineStyle(1.2, 0x1f1812, alpha * 0.8);
          this.graphicsLayer.strokePoints(transformed as any, true);
        } else {
          const p1x = bg.x - cosR * bg.w + sinR * (bg.h * 0.5);
          const p1y = bg.y - sinR * bg.w - cosR * (bg.h * 0.5);
          const p2x = bg.x + cosR * bg.w - sinR * (bg.h * 0.5);
          const p2y = bg.y + sinR * bg.w + cosR * (bg.h * 0.5);
          const p3x = bg.x + cosR * (bg.w * 0.4) + sinR * (bg.h * 0.5);
          const p3y = bg.y + sinR * (bg.w * 0.4) - cosR * (bg.h * 0.5);
          this.graphicsLayer.fillStyle(bg.col, alpha);
          this.graphicsLayer.fillTriangle(p1x, p1y, p2x, p2y, p3x, p3y);
          this.graphicsLayer.lineStyle(1.2, 0x1f1812, alpha * 0.8);
          this.graphicsLayer.strokeTriangle(p1x, p1y, p2x, p2y, p3x, p3y);
        }
        // Crimson Marrow Canal core
        const marrowLen = bg.h * 0.35;
        this.graphicsLayer.lineStyle(1.5, bg.secondaryCol || 0x3a0005, alpha * 0.9);
        this.graphicsLayer.lineBetween(
          bg.x - cosR * marrowLen, bg.y - sinR * marrowLen,
          bg.x + cosR * marrowLen, bg.y + sinR * marrowLen
        );
      } else if (bg.type === 'skull') {
        // Cranial Bone Plate with Suture Cracks
        if (bg.points && bg.points.length >= 3) {
          const transformed = bg.points.map(pt => ({
            x: bg.x + cosR * pt.x - sinR * pt.y,
            y: bg.y + sinR * pt.x + cosR * pt.y
          }));
          this.graphicsLayer.fillStyle(bg.col, alpha);
          this.graphicsLayer.fillPoints(transformed as any, true);
          this.graphicsLayer.lineStyle(1.4, 0x1f1812, alpha * 0.85);
          this.graphicsLayer.strokePoints(transformed as any, true);
        } else {
          this.graphicsLayer.fillStyle(bg.col, alpha);
          this.graphicsLayer.fillCircle(bg.x, bg.y, bg.w * 0.7);
        }
        // Inner shadow cavity & suture fracture lines
        this.graphicsLayer.lineStyle(1.2, 0x220508, alpha * 0.85);
        this.graphicsLayer.lineBetween(bg.x - cosR * 3, bg.y - sinR * 3, bg.x + cosR * 3, bg.y + sinR * 3);
      } else if (bg.type === 'ice') {
        // Crystalline Glacial Shard with Facets
        if (bg.points && bg.points.length >= 3) {
          const transformed = bg.points.map(pt => ({
            x: bg.x + cosR * pt.x - sinR * pt.y,
            y: bg.y + sinR * pt.x + cosR * pt.y
          }));
          this.graphicsLayer.fillStyle(bg.col, alpha * 0.9);
          this.graphicsLayer.fillPoints(transformed as any, true);
          this.graphicsLayer.lineStyle(1.4, 0xffffff, alpha * 0.95);
          this.graphicsLayer.strokePoints(transformed as any, true);
          // Internal crystalline facet refraction line
          if (transformed.length >= 4) {
            this.graphicsLayer.lineStyle(1.0, 0xdff9fb, alpha * 0.85);
            this.graphicsLayer.lineBetween(transformed[0].x, transformed[0].y, transformed[2].x, transformed[2].y);
          }
        } else {
          this.graphicsLayer.fillStyle(bg.col, alpha * 0.9);
          this.graphicsLayer.fillCircle(bg.x, bg.y, bg.w * 0.6);
        }
      } else if (bg.type === 'ember') {
        // Searing Fiery Ember with Glowing Core
        this.graphicsLayer.fillStyle(0x1e272e, alpha);
        this.graphicsLayer.fillCircle(bg.x, bg.y, bg.w * 0.7);
        this.graphicsLayer.fillStyle(bg.col, alpha * 0.95);
        this.graphicsLayer.fillCircle(bg.x, bg.y, bg.w * 0.45);
        this.graphicsLayer.fillStyle(0xf6e58d, alpha);
        this.graphicsLayer.fillCircle(bg.x, bg.y, bg.w * 0.2);
      } else if (bg.type === 'acid') {
        // Sizzling Toxic Bile / Caustic Globule
        this.graphicsLayer.fillStyle(bg.col, alpha * 0.9);
        this.graphicsLayer.fillCircle(bg.x, bg.y, bg.w * 0.65);
        this.graphicsLayer.fillStyle(0xf1c40f, alpha * 0.85);
        this.graphicsLayer.fillCircle(bg.x - 1, bg.y - 1, bg.w * 0.3);
        this.graphicsLayer.lineStyle(1.0, 0xffffff, alpha * 0.7);
        this.graphicsLayer.strokeCircle(bg.x, bg.y, bg.w * 0.65);
      } else if (bg.type === 'cloth') {
        // Tattered Fabric Shred
        if (bg.points && bg.points.length >= 3) {
          const transformed = bg.points.map(pt => ({
            x: bg.x + cosR * pt.x - sinR * pt.y,
            y: bg.y + sinR * pt.x + cosR * pt.y
          }));
          this.graphicsLayer.fillStyle(bg.col, alpha * 0.95);
          this.graphicsLayer.fillPoints(transformed as any, true);
        } else {
          this.graphicsLayer.fillStyle(bg.col, alpha);
          this.graphicsLayer.fillRoundedRect(bg.x - bg.w * 0.5, bg.y - bg.h * 0.5, bg.w, bg.h, 2);
        }
      } else {
        // Ragged Visceral Meat / Flesh with Wet Specular Highlight
        if (bg.points && bg.points.length >= 3) {
          const transformed = bg.points.map(pt => ({
            x: bg.x + cosR * pt.x - sinR * pt.y,
            y: bg.y + sinR * pt.x + cosR * pt.y
          }));
          this.graphicsLayer.fillStyle(bg.col, alpha);
          this.graphicsLayer.fillPoints(transformed as any, true);
          this.graphicsLayer.lineStyle(1.0, 0x3d0008, alpha * 0.75);
          this.graphicsLayer.strokePoints(transformed as any, true);
        } else {
          this.graphicsLayer.fillStyle(bg.col, alpha);
          this.graphicsLayer.fillCircle(bg.x, bg.y, bg.w * 0.7);
        }
        // Glistening wet specular highlight dot
        this.graphicsLayer.fillStyle(0xff6b81, alpha * 0.75);
        this.graphicsLayer.fillCircle(bg.x - cosR * 1.5 - sinR * 1.5, bg.y - sinR * 1.5 + cosR * 1.5, Math.max(1, bg.w * 0.22));
      }
    }


    // ── Render Ice Shards (Explosive Glacial Fragments) ──
    for (const is of this.iceShards) {
      const alpha = Math.max(0, is.life / is.maxLife);
      this.graphicsLayer.fillStyle(is.col, alpha * 0.95);
      this.graphicsLayer.fillTriangle(
        is.x + Math.cos(is.rot) * is.r, is.y + Math.sin(is.rot) * is.r,
        is.x + Math.cos(is.rot + 2.1) * is.r, is.y + Math.sin(is.rot + 2.1) * is.r,
        is.x + Math.cos(is.rot + 4.2) * (is.r * 0.7), is.y + Math.sin(is.rot + 4.2) * (is.r * 0.7)
      );
      this.graphicsLayer.lineStyle(1.2, 0xffffff, alpha * 0.85);
      this.graphicsLayer.lineBetween(
        is.x + Math.cos(is.rot) * is.r, is.y + Math.sin(is.rot) * is.r,
        is.x + Math.cos(is.rot + 2.1) * is.r, is.y + Math.sin(is.rot + 2.1) * is.r
      );
    }

    // ── Render Electric Sparks ──
    for (const sp of this.electricSparks) {
      const alpha = Math.max(0, sp.life / sp.maxLife);
      this.graphicsLayer.fillStyle(sp.col, alpha);
      this.graphicsLayer.fillCircle(sp.x, sp.y, 2.2 * alpha + 1);
      this.graphicsLayer.lineStyle(1.2, 0xffffff, alpha * 0.8);
      this.graphicsLayer.lineBetween(sp.x, sp.y, sp.x - sp.vx * 0.02, sp.y - sp.vy * 0.02);
    }

    // ── Render Heavenly Lightning Strikes from the Sky ──
    for (const ls of this.lightningStrikes) {
      const alpha = Math.max(0, ls.life / ls.maxLife);

      // Expanding Electric Ground Shockwave Ring
      this.graphicsLayer.lineStyle(4 * alpha + 1, 0x00f2fe, alpha * 0.9);
      this.graphicsLayer.strokeCircle(ls.impactX, ls.impactY, ls.shockwaveR);
      this.graphicsLayer.fillStyle(0x00f2fe, alpha * 0.28);
      this.graphicsLayer.fillCircle(ls.impactX, ls.impactY, Math.min(38, ls.shockwaveR * 0.5));

      // 1. Outer Electric Glow Layer
      this.graphicsLayer.lineStyle(9 * alpha + 2, 0x8c7ae6, alpha * 0.45);
      for (const seg of ls.segments) {
        this.graphicsLayer.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      }
      for (const br of ls.branches) {
        for (const seg of br) {
          this.graphicsLayer.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }

      // 2. Bright Cyan Arc Layer
      this.graphicsLayer.lineStyle(4.5 * alpha + 1, 0x00f2fe, alpha * 0.95);
      for (const seg of ls.segments) {
        this.graphicsLayer.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      }
      for (const br of ls.branches) {
        for (const seg of br) {
          this.graphicsLayer.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }

      // 3. Chain Lightning Arcs to nearby zombies
      this.graphicsLayer.lineStyle(3.5 * alpha + 1, 0x00f2fe, alpha * 0.9);
      for (const ch of ls.chains) {
        for (const seg of ch) {
          this.graphicsLayer.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }

      // 4. White-Hot Core
      this.graphicsLayer.lineStyle(2.4 * alpha + 0.8, 0xffffff, alpha);
      for (const seg of ls.segments) {
        this.graphicsLayer.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      }
      for (const ch of ls.chains) {
        for (const seg of ch) {
          this.graphicsLayer.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }
    }

    // ── Render Explosions (Bomb / Cluster Detonations) ──
    for (const ex of this.explosions) {
      const alpha = Math.max(0, ex.life / ex.maxLife);
      // Expanding fiery shockwave ring
      this.graphicsLayer.lineStyle(4.5 * alpha + 1, 0xffa502, alpha * 0.9);
      this.graphicsLayer.strokeCircle(ex.x, ex.y, ex.r);
      this.graphicsLayer.fillStyle(0xff4757, alpha * 0.35);
      this.graphicsLayer.fillCircle(ex.x, ex.y, ex.r * 0.7);
      this.graphicsLayer.fillStyle(0xffeb3b, alpha * 0.65);
      this.graphicsLayer.fillCircle(ex.x, ex.y, ex.r * 0.35);

      // Flying fiery shrapnel & embers
      for (const pt of ex.particles) {
        const pAlpha = Math.max(0, pt.life / pt.maxLife);
        this.graphicsLayer.fillStyle(pt.col, pAlpha * 0.95);
        this.graphicsLayer.fillCircle(pt.x, pt.y, pt.r * pAlpha);
      }
    }

    // ── Render Holy Celestial Beams (Holy Arrow Smite) ──
    for (const hb of this.holyBeams) {
      const alpha = Math.max(0, hb.life / hb.maxLife);
      // Celestial vertical pillar
      this.graphicsLayer.fillStyle(0xffd700, alpha * 0.35);
      this.graphicsLayer.fillRect(hb.x - 24, 0, 48, hb.targetY + 20);
      this.graphicsLayer.fillStyle(0xffffff, alpha * 0.7);
      this.graphicsLayer.fillRect(hb.x - 10, 0, 20, hb.targetY + 20);

      // Consecrated holy ground shockwave
      this.graphicsLayer.lineStyle(3.5 * alpha + 1, 0xf1c40f, alpha * 0.95);
      this.graphicsLayer.strokeCircle(hb.x, hb.targetY, hb.shockwaveR);
    }

    // ── Render Harpoon Shockwaves (Siege Harpoon Kinetic Impact) ──
    for (const hs of this.harpoonShockwaves) {
      const alpha = Math.max(0, hs.life / hs.maxLife);
      // Kinetic shock ring
      this.graphicsLayer.lineStyle(4 * alpha + 1, 0xced6e0, alpha * 0.85);
      this.graphicsLayer.strokeCircle(hs.x, hs.y, hs.r);
      // Flying armor / bone shards
      for (const sh of hs.shards) {
        this.graphicsLayer.fillStyle(0x718093, alpha);
        this.graphicsLayer.fillCircle(sh.x, sh.y, sh.r);
      }
    }

    // ── Render Toxic Splashes (Corrosive Acid Droplets) ──
    for (const ts of this.toxicSplashes) {
      const alpha = Math.max(0, ts.life / ts.maxLife);
      this.graphicsLayer.fillStyle(ts.col, alpha * 0.95);
      this.graphicsLayer.fillCircle(ts.x, ts.y, ts.r * alpha);
    }

    // Render Enemy Hazards (Unique Archetype Projectiles & Shockwaves)
    for (const h of this.enemyHazards) {
      if (h.type === 'projectile') {
        const sub = h.subType || 'acid_spit';
        const ang = Math.atan2(h.vy, h.vx);
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);

        // 1. Unique Trail per Archetype
        for (let t = 0; t < h.trail.length - 1; t++) {
          const a = (t / h.trail.length) * 0.7;
          if (sub === 'bone_arrow') {
            this.graphicsLayer.lineStyle(2.5 * a, 0xdfe6e9, a * 0.65);
          } else if (sub === 'shadow_skull') {
            this.graphicsLayer.lineStyle(5 * a, 0xa855f7, a * 0.75);
          } else if (sub === 'frost_shard') {
            this.graphicsLayer.lineStyle(3.5 * a, 0x00d2d3, a * 0.8);
          } else if (sub === 'bile_bomb') {
            this.graphicsLayer.lineStyle(4.5 * a, 0x2ecc71, a * 0.7);
          } else if (sub === 'cleaver') {
            this.graphicsLayer.lineStyle(2.5 * a, 0xff3838, a * 0.6);
          } else if (sub === 'sonic_screech') {
            this.graphicsLayer.lineStyle(6 * a, 0xa29bfe, a * 0.75);
          } else if (sub === 'fire_bomb') {
            this.graphicsLayer.lineStyle(5 * a, 0xff793f, a * 0.85);
          } else if (sub === 'shadow_blade') {
            this.graphicsLayer.lineStyle(3 * a, 0xff5252, a * 0.75);
          } else if (sub === 'void_meteor') {
            this.graphicsLayer.lineStyle(8 * a, 0x8854d0, a * 0.9);
          } else if (sub === 'dragon_hellfire_meteor') {
            this.graphicsLayer.lineStyle(10 * a, 0xff3838, a * 0.95);
          } else if (sub === 'abyssal_slash') {
            this.graphicsLayer.lineStyle(6 * a, 0x6c5ce7, a * 0.85);
          } else {
            this.graphicsLayer.lineStyle(4 * a, h.color, a);
          }
          this.graphicsLayer.lineBetween(h.trail[t].x, h.trail[t].y, h.trail[t + 1].x, h.trail[t + 1].y);
        }

        // 2. Specific Custom Vector Rendering per Type
        if (sub === 'bone_arrow') {
          // ── SKELETON: Carved Flying Bone Arrow ──
          const arrowLen = 34;
          const tailX = h.x - cosA * (arrowLen * 0.5);
          const tailY = h.y - sinA * (arrowLen * 0.5);
          const tipX = h.x + cosA * (arrowLen * 0.5);
          const tipY = h.y + sinA * (arrowLen * 0.5);

          // Ivory bone shaft
          this.graphicsLayer.lineStyle(4.5, 0x2c3e50, 0.9);
          this.graphicsLayer.lineBetween(tailX, tailY, tipX, tipY);
          this.graphicsLayer.lineStyle(2.8, 0xecf0f1, 1);
          this.graphicsLayer.lineBetween(tailX, tailY, tipX, tipY);

          // Jagged carved broadhead arrow tip
          const perpX = -sinA * 6.5;
          const perpY = cosA * 6.5;
          const barbX = tipX - cosA * 9;
          const barbY = tipY - sinA * 9;

          this.graphicsLayer.fillStyle(0xbdc3c7, 1);
          this.graphicsLayer.fillTriangle(tipX + cosA * 4, tipY + sinA * 4, barbX + perpX, barbY + perpY, barbX - perpX, barbY - perpY);
          this.graphicsLayer.lineStyle(1.5, 0x2c3e50, 0.95);
          this.graphicsLayer.strokeTriangle(tipX + cosA * 4, tipY + sinA * 4, barbX + perpX, barbY + perpY, barbX - perpX, barbY - perpY);

          // Dark Raven Feather Fletchings
          const fletchX = tailX + cosA * 6;
          const fletchY = tailY + sinA * 6;
          this.graphicsLayer.lineStyle(2.2, 0x34495e, 1);
          this.graphicsLayer.lineBetween(tailX, tailY, fletchX + perpX * 0.8, fletchY + perpY * 0.8);
          this.graphicsLayer.lineBetween(tailX, tailY, fletchX - perpX * 0.8, fletchY - perpY * 0.8);

        } else if (sub === 'bile_bomb') {
          // ── BLOATER: Toxic Acid Bile Bomb with Sparking Fuse ──
          const pulse = Math.sin(Date.now() * 0.015) * 2;
          const r = h.radius + pulse * 0.5;

          // Glowing corrosive green aura
          this.graphicsLayer.fillStyle(0x2ed573, 0.28);
          this.graphicsLayer.fillCircle(h.x, h.y, r * 1.5);

          // Glass flask / spherical sludge bomb
          this.graphicsLayer.fillStyle(0x1b4332, 0.95);
          this.graphicsLayer.fillCircle(h.x, h.y, r);
          this.graphicsLayer.lineStyle(2.2, 0x2ecc71, 0.9);
          this.graphicsLayer.strokeCircle(h.x, h.y, r);

          // Boiling glowing inner acid
          this.graphicsLayer.fillStyle(0x2ecc71, 0.9);
          this.graphicsLayer.fillCircle(h.x, h.y + 2, r * 0.65);
          this.graphicsLayer.fillStyle(0xfffa65, 0.85);
          this.graphicsLayer.fillCircle(h.x - 3, h.y - 1, 3.5);
          this.graphicsLayer.fillCircle(h.x + 4, h.y + 3, 2.5);

          // Sparking fuse on top
          const fuseX = h.x - cosA * (r * 0.8) - sinA * 4;
          const fuseY = h.y - sinA * (r * 0.8) + cosA * 4;
          this.graphicsLayer.lineStyle(2, 0xf39c12, 1);
          this.graphicsLayer.lineBetween(h.x, h.y - r * 0.6, fuseX, fuseY);

          // Crackling fire sparks from fuse
          this.graphicsLayer.fillStyle(0xff4757, 1);
          this.graphicsLayer.fillCircle(fuseX, fuseY, 3);
          this.graphicsLayer.fillStyle(0xffeb3b, 1);
          this.graphicsLayer.fillCircle(fuseX + (Math.random() - 0.5) * 4, fuseY + (Math.random() - 0.5) * 4, 1.8);

        } else if (sub === 'shadow_skull') {
          // ── NECROMANCER: Demonic Undead Shadow Skull ──
          // Dark spectral smoke halo
          this.graphicsLayer.fillStyle(0x3b0764, 0.45);
          this.graphicsLayer.fillCircle(h.x - cosA * 8, h.y - sinA * 8, 18);
          this.graphicsLayer.fillStyle(0xa855f7, 0.3);
          this.graphicsLayer.fillCircle(h.x, h.y, 16);

          // Violet demonic skull cranium
          this.graphicsLayer.fillStyle(0x581c87, 1);
          this.graphicsLayer.fillCircle(h.x, h.y, 11);
          this.graphicsLayer.lineStyle(2, 0xd946ef, 0.95);
          this.graphicsLayer.strokeCircle(h.x, h.y, 11);

          // Extended jaw
          const jawX = h.x + cosA * 8;
          const jawY = h.y + sinA * 8;
          this.graphicsLayer.fillStyle(0x3b0764, 1);
          this.graphicsLayer.fillRoundedRect(jawX - 5, jawY - 4, 10, 8, 2);

          // Sinister glowing magenta eye sockets
          const eyeOffX = -sinA * 4;
          const eyeOffY = cosA * 4;
          const eyeFwdX = h.x + cosA * 3;
          const eyeFwdY = h.y + sinA * 3;

          this.graphicsLayer.fillStyle(0xfae8ff, 1);
          this.graphicsLayer.fillCircle(eyeFwdX + eyeOffX, eyeFwdY + eyeOffY, 2.8);
          this.graphicsLayer.fillCircle(eyeFwdX - eyeOffX, eyeFwdY - eyeOffY, 2.8);
          this.graphicsLayer.fillStyle(0xd946ef, 0.8);
          this.graphicsLayer.fillCircle(eyeFwdX + eyeOffX, eyeFwdY + eyeOffY, 1.5);
          this.graphicsLayer.fillCircle(eyeFwdX - eyeOffX, eyeFwdY - eyeOffY, 1.5);

          // Undead teeth
          this.graphicsLayer.fillStyle(0xffffff, 1);
          for (let ti = -1; ti <= 1; ti++) {
            this.graphicsLayer.fillRect(jawX + ti * 3, jawY, 1.8, 3.5);
          }

        } else if (sub === 'frost_shard') {
          // ── FROST WIGHT: Spinning Faceted Glacial Ice Dagger ──
          const rot = h.rot || 0;
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          const len = 16;
          const wid = 7;

          // Glacial frost glow
          this.graphicsLayer.fillStyle(0x00d2d3, 0.35);
          this.graphicsLayer.fillCircle(h.x, h.y, 14);

          // Faceted ice diamond body
          const pTopX = h.x + cosR * len;
          const pTopY = h.y + sinR * len;
          const pBotX = h.x - cosR * len;
          const pBotY = h.y - sinR * len;
          const pLeftX = h.x - sinR * wid;
          const pLeftY = h.y + cosR * wid;
          const pRightX = h.x + sinR * wid;
          const pRightY = h.y - cosR * wid;

          this.graphicsLayer.fillStyle(0xdff9fb, 0.95);
          this.graphicsLayer.fillTriangle(pTopX, pTopY, pLeftX, pLeftY, h.x, h.y);
          this.graphicsLayer.fillStyle(0x0984e3, 0.95);
          this.graphicsLayer.fillTriangle(pBotX, pBotY, pRightX, pRightY, h.x, h.y);
          this.graphicsLayer.fillStyle(0x74b9ff, 0.9);
          this.graphicsLayer.fillTriangle(pTopX, pTopY, pRightX, pRightY, h.x, h.y);
          this.graphicsLayer.fillTriangle(pBotX, pBotY, pLeftX, pLeftY, h.x, h.y);

          this.graphicsLayer.lineStyle(1.8, 0xffffff, 0.95);
          this.graphicsLayer.lineBetween(pTopX, pTopY, pBotX, pBotY);
          this.graphicsLayer.lineBetween(pLeftX, pLeftY, pRightX, pRightY);

        } else if (sub === 'cleaver') {
          // ── BERSERKER: Spinning Meat Cleaver ──
          const rot = h.rot || 0;
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);

          this.graphicsLayer.fillStyle(0xff3838, 0.25);
          this.graphicsLayer.fillCircle(h.x, h.y, 15);

          const bW = 16;
          const bH = 11;
          const bx = h.x + cosR * 4;
          const by = h.y + sinR * 4;

          this.graphicsLayer.fillStyle(0xdcdde1, 1);
          this.graphicsLayer.fillRoundedRect(bx - bW * 0.5, by - bH * 0.5, bW, bH, 2);
          this.graphicsLayer.lineStyle(1.8, 0x2f3542, 1);
          this.graphicsLayer.strokeRoundedRect(bx - bW * 0.5, by - bH * 0.5, bW, bH, 2);

          this.graphicsLayer.fillStyle(0xc0392b, 1);
          this.graphicsLayer.fillRect(bx + bW * 0.3, by - bH * 0.5, 4, bH);

          const hx = h.x - cosR * 12;
          const hy = h.y - sinR * 12;
          this.graphicsLayer.fillStyle(0x574b90, 1);
          this.graphicsLayer.fillCircle(hx, hy, 4);

        } else if (sub === 'sonic_screech') {
          // ── PHANTOM: Expanding Ultrasonic Ring Waves ──
          const pulse = (Date.now() * 0.015) % 3;
          this.graphicsLayer.lineStyle(2.5, 0xa29bfe, 0.9);
          this.graphicsLayer.strokeCircle(h.x, h.y, h.radius + pulse * 4);
          this.graphicsLayer.lineStyle(1.8, 0x00f2fe, 0.7);
          this.graphicsLayer.strokeCircle(h.x, h.y, h.radius * 0.6);
          this.graphicsLayer.fillStyle(0x6c5ce7, 0.5);
          this.graphicsLayer.fillCircle(h.x, h.y, 6);

        } else if (sub === 'fire_bomb') {
          // ── PYRO: Molten Magma Firebomb ──
          const pulse = Math.sin(Date.now() * 0.02) * 2;
          this.graphicsLayer.fillStyle(0xff4757, 0.35);
          this.graphicsLayer.fillCircle(h.x, h.y, (h.radius + pulse) * 1.4);
          this.graphicsLayer.fillStyle(0xd35400, 1);
          this.graphicsLayer.fillCircle(h.x, h.y, h.radius);
          this.graphicsLayer.fillStyle(0xffa502, 1);
          this.graphicsLayer.fillCircle(h.x + 2, h.y - 2, h.radius * 0.6);
          this.graphicsLayer.fillStyle(0xffeb3b, 1);
          this.graphicsLayer.fillCircle(h.x, h.y, h.radius * 0.3);

        } else if (sub === 'shadow_blade') {
          // ── STALKER: Spinning Razor Shadow Shuriken ──
          const rot = h.rot || 0;
          this.graphicsLayer.fillStyle(0xff5252, 0.3);
          this.graphicsLayer.fillCircle(h.x, h.y, 14);
          for (let b = 0; b < 3; b++) {
            const bAng = rot + (b * Math.PI * 2) / 3;
            const tipX = h.x + Math.cos(bAng) * 15;
            const tipY = h.y + Math.sin(bAng) * 15;
            const pX = -Math.sin(bAng) * 4;
            const pY = Math.cos(bAng) * 4;
            this.graphicsLayer.fillStyle(0x2c2c54, 1);
            this.graphicsLayer.fillTriangle(tipX, tipY, h.x - pX, h.y - pY, h.x + pX, h.y + pY);
            this.graphicsLayer.lineStyle(1.5, 0xff5252, 1);
            this.graphicsLayer.lineBetween(h.x, h.y, tipX, tipY);
          }

        } else if (sub === 'void_meteor') {
          // ── REAPER: Colossal Cosmic Void Meteor ──
          const pulse = Math.sin(Date.now() * 0.01) * 3;
          this.graphicsLayer.fillStyle(0x3b0764, 0.45);
          this.graphicsLayer.fillCircle(h.x, h.y, 30 + pulse);
          this.graphicsLayer.fillStyle(0x8854d0, 0.6);
          this.graphicsLayer.fillCircle(h.x, h.y, 22 + pulse * 0.5);
          this.graphicsLayer.fillStyle(0x2c2c54, 1);
          this.graphicsLayer.fillCircle(h.x, h.y, 14);
          this.graphicsLayer.lineStyle(2.5, 0xa55eea, 1);
          this.graphicsLayer.strokeCircle(h.x, h.y, 14);
          this.graphicsLayer.fillStyle(0xfae8ff, 0.9);
          this.graphicsLayer.fillCircle(h.x - 3, h.y - 3, 4);

        } else if (sub === 'dragon_hellfire_meteor') {
          // ── MALAKOR: Blazing Crimson Dragon Hellfire Meteor ──
          const pulse = Math.sin(Date.now() * 0.012) * 4;
          const flightAng = Math.atan2(h.vy, h.vx);
          const backCos = Math.cos(flightAng + Math.PI);
          const backSin = Math.sin(flightAng + Math.PI);

          // 1. Billowing flame comet tail trailing behind along flight vector
          for (let t = 1; t <= 3; t++) {
            const dist = t * 16;
            const tRad = 20 - t * 4 + pulse * 0.5;
            this.graphicsLayer.fillStyle(t === 1 ? 0xff3838 : (t === 2 ? 0xff793f : 0xd35400), 0.55 - t * 0.12);
            this.graphicsLayer.fillCircle(h.x + backCos * dist, h.y + backSin * dist, tRad);
          }

          // 2. Dragon Fire Corona & Molten Mantle
          this.graphicsLayer.fillStyle(0xff3838, 0.40);
          this.graphicsLayer.fillCircle(h.x, h.y, 34 + pulse);
          this.graphicsLayer.fillStyle(0xff793f, 0.75);
          this.graphicsLayer.fillCircle(h.x, h.y, 24 + pulse * 0.6);
          this.graphicsLayer.fillStyle(0xffd32a, 1);
          this.graphicsLayer.fillCircle(h.x, h.y, 15);
          this.graphicsLayer.lineStyle(3, 0xff4757, 1);
          this.graphicsLayer.strokeCircle(h.x, h.y, 15);

          // 3. Sharp Dragon Plasma Horn Spikes pointing forward along flight direction
          const pNormX = -Math.sin(flightAng);
          const pNormY = Math.cos(flightAng);
          this.graphicsLayer.fillStyle(0xfff200, 0.95);
          this.graphicsLayer.fillTriangle(
            h.x + Math.cos(flightAng) * 24, h.y + Math.sin(flightAng) * 24,
            h.x + pNormX * 11, h.y + pNormY * 11,
            h.x - pNormX * 11, h.y - pNormY * 11
          );

          this.graphicsLayer.fillStyle(0xffffff, 0.95);
          this.graphicsLayer.fillCircle(h.x - 3, h.y - 3, 5);

        } else if (sub === 'abyssal_slash') {
          // ── VOID WARMASTER: Dimensional Rift Crescent Blade ──
          const rot = h.rot || 0;
          this.graphicsLayer.fillStyle(0x6c5ce7, 0.35);
          this.graphicsLayer.fillCircle(h.x, h.y, 22);

          // Dark purple crescent wave
          this.graphicsLayer.fillStyle(0x1e272e, 1);
          this.graphicsLayer.beginPath();
          this.graphicsLayer.arc(h.x, h.y, 22, rot - Math.PI * 0.45, rot + Math.PI * 0.45);
          this.graphicsLayer.arc(h.x - Math.cos(rot) * 9, h.y - Math.sin(rot) * 9, 16, rot + Math.PI * 0.45, rot - Math.PI * 0.45, true);
          this.graphicsLayer.closePath();
          this.graphicsLayer.fillPath();

          this.graphicsLayer.lineStyle(2.5, 0xa29bfe, 1);
          this.graphicsLayer.strokePath();

          // Void energy core
          this.graphicsLayer.fillStyle(0xffffff, 0.9);
          this.graphicsLayer.fillCircle(h.x, h.y, 4);

        } else {
          // ── SPITTER: Viscous Bubbling Acid Globule ──
          const wobble = Math.sin(Date.now() * 0.02) * 3;
          this.graphicsLayer.fillStyle(0x2ed573, 0.35);
          this.graphicsLayer.fillCircle(h.x, h.y, h.radius * 1.5);

          this.graphicsLayer.fillStyle(0x00ff88, 1);
          this.graphicsLayer.fillEllipse(h.x, h.y, h.radius + 4, h.radius - 2 + wobble);
          this.graphicsLayer.lineStyle(1.8, 0x10ac84, 0.95);
          this.graphicsLayer.strokeEllipse(h.x, h.y, h.radius + 4, h.radius - 2 + wobble);

          this.graphicsLayer.fillStyle(0xfff200, 0.9);
          this.graphicsLayer.fillCircle(h.x + cosA * 3, h.y + sinA * 3, 4);
          this.graphicsLayer.fillStyle(0xffffff, 0.8);
          this.graphicsLayer.fillCircle(h.x - 2, h.y - 2, 2.2);
        }
      } else if (h.type === 'shockwave') {
        if (h.subType === 'ground_flame_wave') {
          // ── MALAKOR: Infernal Dragon Flame Cataclysm Wave ──
          const fTime = Date.now() * 0.02;
          const pulse = Math.sin(fTime) * 6;
          // Outer flame aura
          this.graphicsLayer.fillStyle(0xff3838, 0.45);
          this.graphicsLayer.fillCircle(h.x, h.y - 14, 28 + pulse);
          // Molten surging crest
          this.graphicsLayer.fillStyle(0xff793f, 0.85);
          this.graphicsLayer.beginPath();
          this.graphicsLayer.moveTo(h.x + 18, h.y);
          this.graphicsLayer.lineTo(h.x - 22, h.y);
          this.graphicsLayer.lineTo(h.x - 14 + pulse, h.y - 42);
          this.graphicsLayer.lineTo(h.x - 2, h.y - 20);
          this.graphicsLayer.lineTo(h.x + 10 + pulse * 0.5, h.y - 36);
          this.graphicsLayer.closePath();
          this.graphicsLayer.fillPath();
          // Molten gold core teeth
          this.graphicsLayer.fillStyle(0xffd32a, 0.95);
          this.graphicsLayer.fillTriangle(h.x + 8, h.y, h.x - 14, h.y, h.x - 6, h.y - 26);
          this.graphicsLayer.lineStyle(2.5, 0xff3838, 1);
          this.graphicsLayer.strokeTriangle(h.x + 8, h.y, h.x - 14, h.y, h.x - 6, h.y - 26);
        } else {
          const pulse = Math.sin(Date.now() * 0.02) * 4;
          this.graphicsLayer.fillStyle(0xf39c12, 0.35);
          this.graphicsLayer.fillRoundedRect(h.x - 12, h.y - 28, 24, 32, 6);
          this.graphicsLayer.lineStyle(3, 0xff4757, 1);
          this.graphicsLayer.lineBetween(h.x, h.y, h.x - 6 + pulse, h.y - 26);
          this.graphicsLayer.lineBetween(h.x, h.y, h.x + 6 - pulse, h.y - 26);
        }
      }
    }

    // Floating text update & render
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      ft.x += ft.vx * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  private renderAtmosphere(g: Phaser.GameObjects.Graphics): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const gy = this.tower.groundY;
    const time = Date.now() * 0.001;
    const isBloodMoon = this.isBloodMoon();

    // ── 1. Celestial Sky Gradient (Apocalyptic Blood Crimson vs Midnight Obsidian) ──
    if (isBloodMoon) {
      // 🩸 Blood Moon Apocalyptic Sky
      g.fillStyle(0x220208, 1);
      g.fillRect(0, 0, w, gy);
      // Raging blood horizon haze & volcanic smoke
      g.fillStyle(0x6e0915, 0.65);
      g.fillRect(0, gy - h * 0.45, w, h * 0.45);
      g.fillStyle(0x9b0e1e, 0.32);
      g.fillRect(0, gy - h * 0.25, w, h * 0.25);
    } else {
      // Midnight Celestial Sky
      g.fillStyle(0x060810, 1);
      g.fillRect(0, 0, w, gy);
      // Horizon twilight haze
      g.fillStyle(0x1a0814, 0.45);
      g.fillRect(0, gy - h * 0.35, w, h * 0.35);
    }

    // ── 2. Twinkling Stars (Blood Ruby vs Silvery White) ──
    for (const star of this.stars) {
      const alpha = 0.3 + Math.sin(time * star.speed + star.phase) * 0.65;
      if (alpha > 0.1) {
        const starCol = isBloodMoon ? (Math.random() < 0.4 ? 0xff4757 : 0xff6b81) : star.col;
        g.fillStyle(starCol, Math.max(0.1, alpha));
        g.fillCircle(star.x, star.y, star.r);
        if (star.r > 1.8) {
          g.fillStyle(starCol, alpha * 0.25);
          g.fillCircle(star.x, star.y, star.r * 2.5);
        }
      }
    }

    // ── 3. The Moon: Red Lunar Eclipse (Blood Moon) vs Pearlescent Full Moon (Normal) ──
    const isPortrait = window.innerWidth < window.innerHeight;
    const moonX = isPortrait ? (this.cameras.main.scrollX + (this.cameras.main.width / this.cameras.main.zoom) * 0.78) : (w * 0.82);
    const moonY = isPortrait ? (this.cameras.main.scrollY + (this.cameras.main.height / this.cameras.main.zoom) * 0.16) : (h * 0.18);
    const moonR = isPortrait ? 40 : 50;

    if (isBloodMoon) {
      // 🩸 RED LUNAR ECLIPSE 🩸
      const pulse = 1 + Math.sin(time * 2.4) * 0.08;

      // Colossal ominous blood coronas radiating into space
      g.fillStyle(0xff0033, 0.08);
      g.fillCircle(moonX, moonY, moonR * 4.2 * pulse);
      g.fillStyle(0xd50000, 0.16);
      g.fillCircle(moonX, moonY, moonR * 2.8 * pulse);
      g.fillStyle(0xff1744, 0.28);
      g.fillCircle(moonX, moonY, moonR * 1.8 * pulse);

      // Fiery Red Eclipse Outer Corona Ring
      g.lineStyle(4.5, 0xff3838, 0.9);
      g.strokeCircle(moonX, moonY, moonR + 2);
      g.lineStyle(2.5, 0xffffff, 0.95);
      // Diamond ring / glowing fiery rim on eclipse crescent
      g.beginPath();
      g.arc(moonX, moonY, moonR + 1.5, -Math.PI * 0.85, -Math.PI * 0.25);
      g.strokePath();

      // Blood Moon Eclipsed Core (Deep blood scarlet with dark umbra)
      g.fillStyle(0x7a0c16, 1);
      g.fillCircle(moonX, moonY, moonR);
      g.fillStyle(0xa81422, 0.92);
      g.fillCircle(moonX - 4, moonY - 4, moonR * 0.94);

      // Dark Lunar Maria / Magma fissures
      g.fillStyle(0x42040a, 0.75);
      g.fillCircle(moonX - 14, moonY - 12, 12);
      g.fillCircle(moonX + 16, moonY + 8, 15);
      g.fillCircle(moonX - 6, moonY + 20, 10);
      g.fillCircle(moonX + 10, moonY - 18, 9);

      // Earth's Umbral Shadow creeping across the moon disk (Lunar Eclipse)
      g.fillStyle(0x130205, 0.88);
      g.fillCircle(moonX + 16, moonY + 10, moonR * 0.88);

      // Drifting dark apocalyptic smoke clouds across the eclipse
      g.fillStyle(0x28040a, 0.65);
      g.fillRoundedRect(moonX - 80 + Math.sin(time * 0.6) * 20, moonY - 8, 140, 18, 9);
      g.fillRoundedRect(moonX - 50 + Math.cos(time * 0.5) * 25, moonY + 16, 110, 16, 8);
    } else {
      // 🌕 Pearlescent Silver Full Moon
      g.fillStyle(0xdfe6e9, 0.06);
      g.fillCircle(moonX, moonY, moonR * 3.8);
      g.fillStyle(0x74b9ff, 0.10);
      g.fillCircle(moonX, moonY, moonR * 2.4);
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(moonX, moonY, moonR * 1.5);

      // Moon Core
      g.fillStyle(0xdfe6e9, 1);
      g.fillCircle(moonX, moonY, moonR);
      g.fillStyle(0xf5f6fa, 0.95);
      g.fillCircle(moonX - 4, moonY - 4, moonR * 0.92);

      // Lunar Maria / Dark Crater Textures
      g.fillStyle(0xb2bec3, 0.45);
      g.fillCircle(moonX - 12, moonY - 14, 11);
      g.fillCircle(moonX + 16, moonY + 8, 14);
      g.fillCircle(moonX - 6, moonY + 18, 9);
      g.fillCircle(moonX + 8, moonY - 18, 8);

      // Drifting night clouds
      g.fillStyle(0x130a1c, 0.55);
      g.fillRoundedRect(moonX - 70 + Math.sin(time * 0.5) * 15, moonY - 6, 120, 16, 8);
      g.fillRoundedRect(moonX - 40 + Math.cos(time * 0.4) * 20, moonY + 14, 90, 14, 7);
    }

    // ── 4. Dynamic Thunderstorm Sky Lightning Bolts ──
    for (const bolt of this.ambientLightningBolts) {
      const bAlpha = Math.max(0, bolt.life / bolt.maxLife);
      // Outer atmospheric illumination glow
      g.lineStyle(9 * bAlpha + 2, bolt.glowColor, bAlpha * 0.65);
      for (const seg of bolt.segments) {
        g.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      }
      for (const br of bolt.branches) {
        for (const seg of br) {
          g.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }
      // Inner sharp bolt core
      g.lineStyle(3.5 * bAlpha + 1, bolt.color, bAlpha * 0.95);
      for (const seg of bolt.segments) {
        g.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      }
      for (const br of bolt.branches) {
        for (const seg of br) {
          g.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }
      // White-hot center
      g.lineStyle(1.8 * bAlpha + 0.5, 0xffffff, bAlpha);
      for (const seg of bolt.segments) {
        g.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      }
    }

    // ── 5. Parallax Mountain Silhouettes ──
    // Far Mountains
    g.fillStyle(isBloodMoon ? 0x18060c : 0x0c0f1c, 1);
    g.beginPath();
    g.moveTo(0, gy);
    const farPts = [0, 0.12, 0.28, 0.44, 0.60, 0.78, 0.92, 1.0];
    const farHs  = [0.62, 0.46, 0.58, 0.42, 0.54, 0.38, 0.50, 0.62];
    farPts.forEach((p, i) => g.lineTo(w * p, h * farHs[i]));
    g.lineTo(w, gy);
    g.closePath();
    g.fillPath();

    // Near Jagged Peaks & Castle Silhouettes
    g.fillStyle(isBloodMoon ? 0x220912 : 0x141824, 1);
    g.beginPath();
    g.moveTo(0, gy);
    const nearPts = [0, 0.08, 0.22, 0.38, 0.52, 0.68, 0.84, 1.0];
    const nearHs  = [0.70, 0.56, 0.66, 0.52, 0.62, 0.48, 0.60, 0.70];
    nearPts.forEach((p, i) => g.lineTo(w * p, h * nearHs[i]));
    g.lineTo(w, gy);
    g.closePath();
    g.fillPath();

    // Sinister Gothic Trees on mountain ridge
    g.fillStyle(isBloodMoon ? 0x120409 : 0x0a0d16, 0.9);
    [0.10, 0.36, 0.64, 0.88].forEach(px => {
      const tx = w * px;
      const ty = gy - 12;
      // Trunk
      g.fillRect(tx - 3, ty - 32, 6, 32);
      // Gnarled branches
      g.lineStyle(2.5, isBloodMoon ? 0x120409 : 0x0a0d16, 1);
      g.lineBetween(tx, ty - 26, tx - 16, ty - 42);
      g.lineBetween(tx, ty - 22, tx + 18, ty - 38);
      g.lineBetween(tx - 16, ty - 42, tx - 22, ty - 52);
    });

    // ── 6. Rich Textured Graveyard Ground ──
    // Soil Base Gradient
    g.fillStyle(isBloodMoon ? 0x1f0b0f : 0x141d12, 1);
    g.fillRect(0, gy, w, h - gy);
    g.fillStyle(isBloodMoon ? 0x140609 : 0x0e140d, 1);
    g.fillRect(0, gy + 32, w, h - gy - 32);

    // Ancient cobblestone highlights & moss patches
    g.fillStyle(isBloodMoon ? 0x3d141a : 0x273d22, 0.45);
    for (let gx = 0; gx < w; gx += 45) {
      g.fillRoundedRect(gx + (gx % 17), gy + 8 + (gx % 23), 28, 10, 4);
    }

    if (isBloodMoon) {
      // 🩸 Glowing Blood Crimson Grass/Soil Surface Rim
      g.lineStyle(3.5, 0xd63031, 0.95);
      g.lineBetween(0, gy, w, gy);
      g.lineStyle(1.5, 0xff7675, 0.8);
      g.lineBetween(0, gy - 1, w, gy - 1);

      // Stylized Blood Grass Tufts along ground line
      g.lineStyle(2.2, 0xe74c3c, 0.85);
      for (let gx = 10; gx < w; gx += 28) {
        const gh = 7 + (gx % 6);
        g.lineBetween(gx, gy, gx - 3, gy - gh);
        g.lineBetween(gx, gy, gx + 4, gy - gh - 2);
      }
    } else {
      // Glowing Neon Grass/Soil Surface Rim
      g.lineStyle(3.5, 0x27ae60, 0.95);
      g.lineBetween(0, gy, w, gy);
      g.lineStyle(1.5, 0xa8e6cf, 0.6);
      g.lineBetween(0, gy - 1, w, gy - 1);

      // Stylized Dark Grass Tufts along ground line
      g.lineStyle(2.2, 0x2ecc71, 0.85);
      for (let gx = 10; gx < w; gx += 28) {
        const gh = 7 + (gx % 6);
        g.lineBetween(gx, gy, gx - 3, gy - gh);
        g.lineBetween(gx, gy, gx + 4, gy - gh - 2);
      }
    }

    // Graveyard Tombstones in background
    g.fillStyle(isBloodMoon ? 0x331a22 : 0x242d3a, 1);
    [w * 0.42, w * 0.58, w * 0.74, w * 0.91].forEach((tx, idx) => {
      // Arched headstone
      g.fillRoundedRect(tx - 9, gy - 24, 18, 24, 6);
      g.lineStyle(1.8, isBloodMoon ? 0x220e14 : 0x161b24, 1);
      g.strokeRoundedRect(tx - 9, gy - 24, 18, 24, 6);
      // Cross carving on stone
      g.lineStyle(1.6, isBloodMoon ? 0x5a232f : 0x3d495a, 0.8);
      g.lineBetween(tx, gy - 20, tx, gy - 10);
      g.lineBetween(tx - 4, gy - 16, tx + 4, gy - 16);
    });

    // ── 7. Atmospheric Drifting Ground Fog ──
    const fogPhase1 = time * 0.6;
    const fogPhase2 = time * 0.4;
    if (isBloodMoon) {
      // Rolling Crimson Blood Mist
      g.fillStyle(0xd63031, 0.05);
      for (let fx = -40; fx < w + 60; fx += 90) {
        const fogY1 = gy - 6 + Math.sin(fogPhase1 + fx * 0.015) * 6;
        g.fillEllipse(fx + (time * 18) % 90, fogY1, 95, 20);
      }
      g.fillStyle(0x9b0e1e, 0.06);
      for (let fx = 0; fx < w + 60; fx += 110) {
        const fogY2 = gy - 4 + Math.cos(fogPhase2 + fx * 0.012) * 8;
        g.fillEllipse(fx + (time * 12) % 110, fogY2, 110, 18);
      }
    } else {
      g.fillStyle(0x38ef7d, 0.02);
      for (let fx = -40; fx < w + 60; fx += 90) {
        const fogY1 = gy - 6 + Math.sin(fogPhase1 + fx * 0.015) * 6;
        g.fillEllipse(fx + (time * 15) % 90, fogY1, 95, 18);
      }
      g.fillStyle(0x74b9ff, 0.02);
      for (let fx = 0; fx < w + 60; fx += 110) {
        const fogY2 = gy - 4 + Math.cos(fogPhase2 + fx * 0.012) * 8;
        g.fillEllipse(fx + (time * 10) % 110, fogY2, 110, 16);
      }
    }
  }
}
