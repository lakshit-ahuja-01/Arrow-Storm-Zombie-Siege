import Phaser from 'phaser';
import { soundFX } from '../systems/SoundFX';

export interface TowerDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  w: number;
  h: number;
  color: number;
  type: 'plank' | 'splinter' | 'spike' | 'iron' | 'stone' | 'gold' | 'ember';
  life: number;
  maxLife: number;
  bounces: number;
}

export interface TowerDustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  maxR: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
}

export interface TowerSmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  maxR: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
}

export interface TowerEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
}

export interface TowerSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
}

export interface TowerRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
}

export class Tower {
  public scene: Phaser.Scene;
  public width: number = 140;
  public height: number = 115;
  public maxHP: number = 360;
  public hp: number = 360;

  // 🏰 Clash of Clans Tower Evolution Tier (1 to 5)
  // Tier 1: Wooden Scout Outpost (Classic Level 1-2)
  // Tier 2: Reinforced Stone Bastion (Cobblestone plinths & iron brackets, Level 3-4)
  // Tier 3: Fortified Castle Keep (Ashlar stone masonry, castle crenellations, portcullis, Level 5-6)
  // Tier 4: Royal Iron Citadel (Black slate, gold filigree trim, lion heraldry, dual braziers, Level 7-8)
  // Tier 5: Apex Dragon Citadel (Obsidian monoliths, pulsing magma runes, dragon battlements, Level 9-11)
  public tier: number = 1;

  public hasSpikes: boolean = false;
  public hasCaltrops: boolean = false;
  public hasTarMoat: boolean = false;
  public hasPitchPits: boolean = false;
  public hasGunpowderBarrels: boolean = false;
  public sentryLevel: number = 0;
  public sentryTimer: number = 0;
  public hasBanner: boolean = false;
  public bannerLevel: number = 0;
  public bannerRegenTimer: number = 0;
  public damageReduction: number = 0;
  public hpRegen: number = 0;
  public hpRegenTimer: number = 0;
  public hasSmokeScreen: boolean = false;

  // 💥 Destruction State & Dynamic Collapse Simulation
  public isDestroyed: boolean = false;
  public collapseProgress: number = 0; // 0 = standing, 1 = fully collapsed ruins
  public collapseVelocity: number = 0;
  public impactDustSpawned: boolean = false;

  public debris: TowerDebris[] = [];
  public dustClouds: TowerDustParticle[] = [];
  public smokePuffs: TowerSmokePuff[] = [];
  public embers: TowerEmber[] = [];
  public smokeTimer: number = 0;

  // 🌟 Upgrade Evolution Animation VFX (Clash of Clans Level-Up Burst)
  public upgradeAnimTimer: number = 0;
  public upgradeSparks: TowerSpark[] = [];
  public upgradeRings: TowerRing[] = [];

  private _customX: number | null = null;
  public get x(): number {
    if (this._customX !== null) return this._customX;
    return Math.max(90, this.scene.cameras.main.width * 0.16);
  }
  public set x(val: number) {
    this._customX = val;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public get groundY(): number {
    return this.scene.cameras.main.height * 0.72;
  }

  public get topY(): number {
    return this.groundY - this.height;
  }

  public invincible: boolean = false;

  public getTierName(tierNum: number = this.tier): string {
    switch (tierNum) {
      case 1: return 'Wooden Outpost';
      case 2: return 'Stone Bastion';
      case 3: return 'Castle Keep';
      case 4: return 'Royal Citadel';
      case 5: return 'Apex Dragon Citadel';
      default: return 'Fortified Citadel';
    }
  }

  public getNextTierName(): string {
    if (this.tier >= 5) return 'Max Fortress Tier';
    return this.getTierName(this.tier + 1);
  }

  /**
   * Upgrades the tower tier and triggers celebration effects
   */
  public upgradeTier(targetTier?: number, silent: boolean = false): void {
    const oldTier = this.tier;
    if (targetTier !== undefined) {
      this.tier = Math.min(5, Math.max(1, targetTier));
    } else {
      this.tier = Math.min(5, this.tier + 1);
    }
    if (this.tier !== oldTier && !silent) {
      this.triggerUpgradeEffect();
    }
  }

  /**
   * Triggers the celebratory Clash of Clans building level-up burst VFX:
   * Expanding golden sunburst shockwaves, glittering fireworks, screenshake, sound FX, and title alert.
   */
  public triggerUpgradeEffect(): void {
    this.upgradeAnimTimer = 1.6;
    soundFX.playGemCollect();
    soundFX.playExplosion();
    (this.scene as any).shakeScreen?.(12, 0.35);

    const title = `🌟 FORTRESS EVOLVED: ${this.getTierName().toUpperCase()}! 🏰`;
    (this.scene as any).spawnFloatingText?.(title, this.x, this.topY - 60, '#f1c40f', 24);

    const tx = this.x;
    const ty = this.topY + this.height * 0.45;

    // Golden Shockwave Rings
    this.upgradeRings.push({
      x: tx,
      y: ty,
      r: 15,
      maxR: 210,
      alpha: 1.0,
      color: 0xf1c40f,
      life: 1.2,
      maxLife: 1.2
    });
    this.upgradeRings.push({
      x: tx,
      y: ty,
      r: 8,
      maxR: 160,
      alpha: 0.85,
      color: 0xffffff,
      life: 0.9,
      maxLife: 0.9
    });

    // 36 Celebration Sparks (fireworks burst)
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.upgradeSparks.push({
        x: tx + (Math.random() - 0.5) * 60,
        y: ty + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        r: 2.5 + Math.random() * 2.5,
        alpha: 1.0,
        color: Math.random() > 0.4 ? 0xf1c40f : (Math.random() > 0.5 ? 0xffffff : 0xe67e22),
        life: 1.0 + Math.random() * 0.6,
        maxLife: 1.6
      });
    }
  }

  public takeDamage(amount: number): void {
    if (this.invincible || amount <= 0) return;
    const dr = Math.min(0.80, this.damageReduction || 0);
    const reducedAmount = Math.max(1, amount * (1 - dr));
    this.hp = Math.max(0, this.hp - reducedAmount);

    if (this.hp <= 0 && !this.isDestroyed) {
      this.triggerDestruction();
    }

    if ((this.scene as any).onTowerDamage) {
      (this.scene as any).onTowerDamage(reducedAmount);
    }
  }

  public repair(amount: number): void {
    if (this.isDestroyed) {
      this.restore();
    }
    this.hp = Math.min(this.maxHP, this.hp + amount);
    if ((this.scene as any).spawnFloatingText) {
      (this.scene as any).spawnFloatingText(`+${amount} TOWER HP 🛡️`, this.x, this.topY - 30, '#2ecc71', 22);
    }
  }

  /**
   * Resets tower state upon revive or wave restart.
   * Note: preserves this.tier so the player keeps their unlocked Clash of Clans fortress!
   */
  public restore(): void {
    this.isDestroyed = false;
    this.collapseProgress = 0;
    this.collapseVelocity = 0;
    this.impactDustSpawned = false;
    this.debris = [];
    this.dustClouds = [];
    this.smokePuffs = [];
    this.embers = [];
    this.smokeTimer = 0;
  }

  /**
   * Triggers the dramatic tower destruction sequence adapted to the current fortress tier
   */
  public triggerDestruction(): void {
    if (this.isDestroyed && this.collapseProgress > 0) return;
    this.isDestroyed = true;
    this.hp = 0;
    this.collapseProgress = 0.05;
    this.collapseVelocity = 0.45;
    this.impactDustSpawned = false;

    // Sound FX & Shockwave
    soundFX.playExplosion();
    soundFX.playArmorHit();
    (this.scene as any).shakeScreen?.(24, 0.7);
    (this.scene as any).spawnFloatingText?.(`💥 ${this.getTierName().toUpperCase()} DESTROYED! 💥`, this.x, this.topY - 45, '#e74c3c', 26);

    const tx = this.x;
    const ty = this.topY;
    const gy = this.groundY;
    const w = this.width;

    // 1. Heavy Debris Chunks (Stone masonry for Tiers 2-5, Timber for Tier 1)
    const isStone = this.tier >= 2;
    for (let i = 0; i < 20; i++) {
      const px = tx - w / 2 + Math.random() * w;
      const py = ty + 10 + Math.random() * (this.height - 20);
      const angle = -Math.PI * 0.5 + (Math.random() - 0.35) * 1.8;
      const speed = 200 + Math.random() * 340;
      let col = Math.random() > 0.4 ? 0x4a2810 : 0x2d1806;
      let dType: TowerDebris['type'] = 'plank';

      if (isStone && Math.random() < 0.65) {
        dType = 'stone';
        col = this.tier >= 4 ? (Math.random() > 0.5 ? 0x1e272e : 0x2f3542) : 0x576574;
      }
      if (this.tier >= 4 && Math.random() < 0.25) {
        dType = 'gold';
        col = 0xf1c40f;
      }

      this.debris.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 16,
        w: 16 + Math.random() * 24,
        h: 6 + Math.random() * 6,
        color: col,
        type: dType,
        life: 4.5 + Math.random() * 2.5,
        maxLife: 6.0,
        bounces: 0
      });
    }

    // 2. Sharp Wood & Stone Splinters
    for (let i = 0; i < 16; i++) {
      const px = tx + (Math.random() - 0.2) * (w * 0.85);
      const py = ty + 20 + Math.random() * (this.height - 30);
      const angle = -Math.PI * 0.5 + (Math.random() - 0.3) * 2.2;
      const speed = 260 + Math.random() * 380;
      this.debris.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 22,
        w: 9 + Math.random() * 12,
        h: 3 + Math.random() * 4,
        color: isStone ? 0x8395a7 : 0x8b5a2b,
        type: 'splinter',
        life: 3.5 + Math.random() * 2.0,
        maxLife: 5.0,
        bounces: 0
      });
    }

    // 3. Snapped Barricade Spikes
    for (let i = 0; i < 6; i++) {
      this.debris.push({
        x: tx + w / 2 - 8 + Math.random() * 15,
        y: gy - 20 - i * 16,
        vx: 140 + Math.random() * 240,
        vy: -160 - Math.random() * 200,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 12,
        w: 24 + Math.random() * 12,
        h: 9 + Math.random() * 5,
        color: this.tier >= 4 ? 0xf1c40f : (this.tier >= 2 || this.hasSpikes ? 0x7f8c8d : 0x3a1f0a),
        type: 'spike',
        life: 5.5 + Math.random() * 2,
        maxLife: 7.0,
        bounces: 0
      });
    }

    // 4. Shattered Iron & Gold Plates
    if (this.tier >= 2 || this.damageReduction > 0) {
      for (let i = 0; i < 8; i++) {
        this.debris.push({
          x: tx - w / 2 + Math.random() * w,
          y: ty + 30 + Math.random() * 50,
          vx: (Math.random() - 0.4) * 260,
          vy: -180 - Math.random() * 240,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 14,
          w: 14 + Math.random() * 10,
          h: 5 + Math.random() * 3,
          color: this.tier >= 4 ? 0xf1c40f : 0x8395a7,
          type: 'iron',
          life: 4.8,
          maxLife: 5.5,
          bounces: 0
        });
      }
    }

    // 5. Initial Billowing Dust Clouds
    for (let i = 0; i < 22; i++) {
      const dx = tx - w / 2 + Math.random() * (w + 20);
      const dy = ty + 20 + Math.random() * (gy - ty);
      this.dustClouds.push({
        x: dx,
        y: dy,
        vx: (Math.random() - 0.4) * 140,
        vy: -50 - Math.random() * 90,
        r: 14 + Math.random() * 18,
        maxR: 40 + Math.random() * 45,
        alpha: 0.70 + Math.random() * 0.25,
        color: Math.random() > 0.4 ? 0x57606f : 0x747d8c,
        life: 1.6 + Math.random() * 1.0,
        maxLife: 2.6
      });
    }

    // 6. Flying Glowing Embers
    for (let i = 0; i < 22; i++) {
      this.embers.push({
        x: tx - w / 2 + Math.random() * w,
        y: ty + Math.random() * (gy - ty),
        vx: (Math.random() - 0.3) * 180,
        vy: -160 - Math.random() * 240,
        r: 2 + Math.random() * 2.5,
        alpha: 0.95,
        color: this.tier === 5 ? (Math.random() > 0.5 ? 0x00d2d3 : 0xff3838) : (Math.random() > 0.5 ? 0xff4757 : 0xffa502),
        life: 2.0 + Math.random() * 1.5,
        maxLife: 3.0
      });
    }
  }

  public update(dt: number, enemies: any[], _arrows: any[]): void {
    // 1. Upgrade VFX Animation
    if (this.upgradeAnimTimer > 0) {
      this.upgradeAnimTimer = Math.max(0, this.upgradeAnimTimer - dt);

      for (let i = this.upgradeSparks.length - 1; i >= 0; i--) {
        const sp = this.upgradeSparks[i];
        sp.vy += 450 * dt; // Gravity
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) this.upgradeSparks.splice(i, 1);
      }

      for (let i = this.upgradeRings.length - 1; i >= 0; i--) {
        const ring = this.upgradeRings[i];
        ring.r += (ring.maxR - ring.r) * 6.5 * dt;
        ring.life -= dt;
        if (ring.life <= 0) this.upgradeRings.splice(i, 1);
      }
    }

    // If destroyed or collapsing, run destruction physics
    if (this.isDestroyed || this.collapseProgress > 0) {
      this.updateDestruction(dt);
      return;
    }

    // 2. Rooftop Auto-Crossbow Turret auto-firing
    if (this.sentryLevel > 0) {
      this.sentryTimer -= dt;
      if (this.sentryTimer <= 0) {
        this.sentryTimer = Math.max(0.65, 1.3 - this.sentryLevel * 0.22);
        const sx = this.x + this.width / 2 + 5;
        const sy = this.topY - 40;

        let target: any = null;
        let minDist = 999999;
        for (const z of enemies) {
          if (!z.dead && z.x > sx) {
            const d = Phaser.Math.Distance.Between(sx, sy, z.x, z.y);
            if (d < minDist) {
              minDist = d;
              target = z;
            }
          }
        }

        if (target && (this.scene as any).spawnSentryArrow) {
          (this.scene as any).spawnSentryArrow(sx, sy, target.x, target.y - 40, 26 + this.sentryLevel * 12);
        }
      }
    }

    // 3. War Banner HP Regeneration
    if (this.hasBanner) {
      this.bannerRegenTimer -= dt;
      if (this.bannerRegenTimer <= 0) {
        this.bannerRegenTimer = 4.0;
        if (this.hp < this.maxHP) {
          const heal = 12 * (this.bannerLevel || 1);
          this.hp = Math.min(this.maxHP, this.hp + heal);
          if ((this.scene as any).spawnFloatingText) {
            (this.scene as any).spawnFloatingText(`+${heal} 🏰`, this.x + 30, this.topY - 20, '#2ecc71', 18);
          }
        }
      }
    }

    // 4. Holy Healing Shrine Passive HP Regeneration
    if (this.hpRegen > 0 && this.hp < this.maxHP) {
      this.hpRegenTimer -= dt;
      if (this.hpRegenTimer <= 0) {
        this.hpRegenTimer = 1.0;
        this.repair(this.hpRegen);
      }
    }
  }

  public updateDestruction(dt: number): void {
    const gy = this.groundY;

    // 1. Collapse Progression & Heavy Ground Slam
    if (this.collapseProgress < 1.0) {
      this.collapseVelocity += 2.6 * dt;
      this.collapseProgress = Math.min(1.0, this.collapseProgress + this.collapseVelocity * dt);

      if (this.collapseProgress >= 0.86 && !this.impactDustSpawned) {
        this.impactDustSpawned = true;
        soundFX.playArmorHit();
        (this.scene as any).shakeScreen?.(15, 0.4);

        for (let i = 0; i < 20; i++) {
          const dir = (i % 2 === 0 ? 1 : -1);
          this.dustClouds.push({
            x: this.x + (Math.random() - 0.3) * this.width,
            y: gy - 4 - Math.random() * 12,
            vx: dir * (90 + Math.random() * 180),
            vy: -35 - Math.random() * 70,
            r: 16 + Math.random() * 18,
            maxR: 45 + Math.random() * 55,
            alpha: 0.75,
            color: 0x57606f,
            life: 1.8 + Math.random() * 1.2,
            maxLife: 3.0
          });
        }
      }
    }

    // 2. Continuous Smoldering Smoke Puffs & Embers
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.085;
      const tx = this.x;
      const w = this.width;

      this.smokePuffs.push({
        x: tx - w / 2 + Math.random() * w,
        y: gy - 12 - Math.random() * 26,
        vx: (Math.random() - 0.4) * 28,
        vy: -50 - Math.random() * 55,
        r: 8 + Math.random() * 12,
        maxR: 28 + Math.random() * 26,
        alpha: 0.60 + Math.random() * 0.25,
        color: Math.random() > 0.5 ? 0x2f3542 : 0x1e272e,
        life: 2.4 + Math.random() * 1.4,
        maxLife: 3.8
      });

      if (Math.random() < 0.45) {
        this.embers.push({
          x: tx - w / 2 + Math.random() * w,
          y: gy - 8 - Math.random() * 22,
          vx: (Math.random() - 0.5) * 40,
          vy: -75 - Math.random() * 70,
          r: 1.5 + Math.random() * 2,
          alpha: 0.95,
          color: this.tier === 5 ? (Math.random() > 0.5 ? 0x00d2d3 : 0xff3838) : (Math.random() > 0.5 ? 0xff4757 : 0xffa502),
          life: 1.6 + Math.random() * 1.2,
          maxLife: 2.8
        });
      }
    }

    // 3. Update Debris Physics
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += 760 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vRot * dt;

      if (d.y >= gy - 3) {
        d.y = gy - 3;
        if (d.bounces < 3 && Math.abs(d.vy) > 60) {
          d.vy = -d.vy * 0.40;
          d.vx *= 0.65;
          d.vRot *= 0.55;
          d.bounces++;
        } else {
          d.vy = 0;
          d.vx *= 0.80;
          d.vRot = 0;
        }
      }

      d.life -= dt;
      if (d.life <= 0) {
        this.debris.splice(i, 1);
      }
    }

    // 4. Update Dust Clouds
    for (let i = this.dustClouds.length - 1; i >= 0; i--) {
      const dc = this.dustClouds[i];
      dc.x += dc.vx * dt;
      dc.y += dc.vy * dt;
      dc.r += (dc.maxR - dc.r) * 4.2 * dt;
      dc.life -= dt;
      if (dc.life <= 0) this.dustClouds.splice(i, 1);
    }

    // 5. Update Smoke Puffs
    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const sp = this.smokePuffs[i];
      sp.x += sp.vx * dt + Math.sin(Date.now() * 0.003 + sp.x) * 10 * dt;
      sp.y += sp.vy * dt;
      sp.r += (sp.maxR - sp.r) * 2.8 * dt;
      sp.life -= dt;
      if (sp.life <= 0) this.smokePuffs.splice(i, 1);
    }

    // 6. Update Embers
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const em = this.embers[i];
      em.x += em.vx * dt;
      em.y += em.vy * dt;
      em.life -= dt;
      if (em.life <= 0) this.embers.splice(i, 1);
    }
  }

  public render(g: Phaser.GameObjects.Graphics): void {
    if (this.isDestroyed || this.collapseProgress > 0 || this.hp <= 0) {
      this.renderDestroyedRuins(g);
      return;
    }

    const tx = this.x;
    const ty = this.topY;
    const gy = this.groundY;
    const w = this.width;

    // 1. Caltrops Field
    if (this.hasCaltrops) {
      const frontX = tx + w / 2 + 20;
      g.lineStyle(2.2, 0xbdc3c7, 1);
      for (let c = 0; c < 12; c++) {
        const cx = frontX + c * 12 + ((c % 2) * 5);
        const cy = gy - 2;
        g.lineBetween(cx - 5, cy, cx, cy - 9);
        g.lineBetween(cx, cy - 9, cx + 5, cy);
        g.lineBetween(cx, cy - 9, cx, cy);
      }
    }

    // 2. Flaming Tar Trench
    if (this.hasTarMoat) {
      const pitX = tx + w / 2 + 8;
      const pitW = 95;
      g.fillStyle(0x140c06, 1);
      g.fillRect(pitX, gy - 3, pitW, 9);
      g.fillStyle(0xd35400, 1);
      g.fillRect(pitX + 4, gy - 2, pitW - 8, 5);
      g.fillStyle(0xe74c3c, 0.9);
      for (let f = 0; f < 6; f++) {
        const fx = pitX + 8 + f * 15;
        const fh = 9 + Math.sin(Date.now() * 0.014 + f * 1.5) * 6;
        g.fillTriangle(fx - 4, gy, fx, gy - fh, fx + 4, gy);
      }
    }

    // 3. Render Fortress Architecture by Clash of Clans Tier
    switch (this.tier) {
      case 1:
        this.renderTier1(g, tx, ty, gy, w);
        break;
      case 2:
        this.renderTier2(g, tx, ty, gy, w);
        break;
      case 3:
        this.renderTier3(g, tx, ty, gy, w);
        break;
      case 4:
        this.renderTier4(g, tx, ty, gy, w);
        break;
      case 5:
        this.renderTier5(g, tx, ty, gy, w);
        break;
      default:
        this.renderTier1(g, tx, ty, gy, w);
        break;
    }

    // 4. Barricade Spikes (Visual styling evolves dynamically with Tower Tier!)
    this.renderBarricadeSpikes(g, tx, gy, w);

    // 5. Rooftop Auto-Crossbow Turret (Styling evolves with Tower Tier)
    if (this.sentryLevel > 0) {
      this.renderSentryTurret(g, tx, ty, w);
    }

    // 6. War Banner of Valor
    if (this.hasBanner) {
      this.renderWarBanner(g, tx, ty, w);
    }

    // 7. Defensive Smoke Screen Cloud
    if (this.hasSmokeScreen) {
      const smokeX = tx + w / 2 + 10;
      const t = Date.now() * 0.001;
      g.fillStyle(0x718093, 0.22);
      for (let s = 0; s < 5; s++) {
        const sx = smokeX + s * 45 + Math.sin(t * 1.5 + s) * 12;
        const sy = gy - 20 + Math.cos(t * 1.2 + s) * 8;
        g.fillCircle(sx, sy, 28 + s * 4);
      }
    }

    // 8. Reinforced Iron Gate Bands
    if (this.damageReduction > 0) {
      g.fillStyle(0x576574, 1);
      g.fillRect(tx - w / 2 + 4, ty + 24, w - 8, 8);
      g.fillRect(tx - w / 2 + 4, gy - 28, w - 8, 8);
      g.lineStyle(1.5, 0x8395a7, 1);
      g.strokeRect(tx - w / 2 + 4, ty + 24, w - 8, 8);
      g.strokeRect(tx - w / 2 + 4, gy - 28, w - 8, 8);
      g.fillStyle(0xc8d6e5, 1);
      for (let rx = tx - w / 2 + 14; rx < tx + w / 2 - 10; rx += 24) {
        g.fillCircle(rx, ty + 28, 2);
        g.fillCircle(rx, gy - 24, 2);
      }
    }

    // 9. Holy Healing Shrine Relic Pedestal
    if (this.hpRegen > 0) {
      const sx = tx - w / 2 + 24;
      const sy = ty - 26;
      g.fillStyle(0x2f3640, 1);
      g.fillRect(sx - 7, sy + 6, 14, 20);
      g.fillStyle(0xdcdde1, 1);
      g.fillRect(sx - 9, sy + 4, 18, 4);
      const pulse = 0.75 + Math.sin(Date.now() * 0.006) * 0.25;
      g.fillStyle(0x2ecc71, pulse);
      g.fillRect(sx - 2, sy - 8, 4, 14);
      g.fillRect(sx - 7, sy - 4, 14, 4);
      g.fillStyle(0x55efc4, pulse * 0.5);
      g.fillCircle(sx, sy - 1, 9);
    }

    // 10. Upgrade Level-Up Visual Burst Effect Overlay
    if (this.upgradeAnimTimer > 0) {
      this.renderUpgradeVFX(g);
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 🏰 CLASH OF CLANS TIER ARCHITECTURE RENDERERS
  // ═════════════════════════════════════════════════════════════════

  /**
   * TIER 1: Wooden Scout Outpost (Classic Clash Level 1-2)
   * Natural timber logs, rope bindings around joints, rough planks, rustic wooden railing.
   */
  private renderTier1(g: Phaser.GameObjects.Graphics, tx: number, ty: number, gy: number, w: number): void {
    // 3 Round Timber Log Pillars
    g.fillStyle(0x2d1806, 1);
    g.fillRect(tx - w / 2 + 8, ty + 12, 18, gy - ty - 12);
    g.fillRect(tx + w / 2 - 26, ty + 12, 18, gy - ty - 12);
    g.fillRect(tx - 9, ty + 12, 18, gy - ty - 12);

    // Diagonal Cross Braces
    g.lineStyle(9, 0x1e0e03, 1);
    g.lineBetween(tx - w / 2 + 16, ty + 24, tx + w / 2 - 16, gy);
    g.lineBetween(tx + w / 2 - 16, ty + 24, tx - w / 2 + 16, gy);

    // Hemp Rope Wrappings at joints
    g.lineStyle(3, 0xd4ac0d, 0.9);
    for (const px of [tx - w / 2 + 8, tx - 9, tx + w / 2 - 26]) {
      g.lineBetween(px - 1, ty + 20, px + 19, ty + 20);
      g.lineBetween(px - 1, gy - 22, px + 19, gy - 22);
    }

    // Wooden Deck Platform
    g.fillStyle(0x4a2810, 1);
    g.fillRect(tx - w / 2 - 12, ty, w + 24, 16);
    g.fillStyle(0x6b3c1b, 1);
    g.fillRect(tx - w / 2 - 12, ty, w + 24, 4);

    // Plank grooves
    g.lineStyle(2, 0x1e0e03, 1);
    for (let x = tx - w / 2; x < tx + w / 2; x += 22) {
      g.lineBetween(x, ty, x, ty + 16);
    }

    // Rustic Timber Railing
    g.fillStyle(0x3a1f0a, 1);
    g.fillRect(tx - w / 2 - 8, ty - 32, 10, 32);
    g.fillRect(tx + w / 2 - 2, ty - 32, 10, 32);
    g.fillRect(tx - w / 2 - 10, ty - 36, w + 20, 8);

    // Wall Torch
    const torchX = tx - w / 2 - 16;
    const torchY = ty - 14;
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(torchX - 3, torchY, 6, 22);
    g.fillStyle(0xffa502, 0.9);
    g.fillCircle(torchX, torchY - 8 + Math.sin(Date.now() * 0.012) * 2, 7);
  }

  /**
   * TIER 2: Reinforced Stone Bastion (Clash Level 3-4)
   * Carved cobblestone plinths at pillar bases, black steel corner L-brackets,
   * dark oak beams, reinforced deck, hanging forged iron cage lantern.
   */
  private renderTier2(g: Phaser.GameObjects.Graphics, tx: number, ty: number, gy: number, w: number): void {
    const plinthH = 32;

    // 1. Squared Dark Oak Timber Pillars
    g.fillStyle(0x231305, 1);
    g.fillRect(tx - w / 2 + 7, ty + 14, 20, gy - ty - plinthH - 14);
    g.fillRect(tx + w / 2 - 27, ty + 14, 20, gy - ty - plinthH - 14);
    g.fillRect(tx - 10, ty + 14, 20, gy - ty - plinthH - 14);

    // Heavy Steel Diagonal Braces
    g.lineStyle(8, 0x3d3d3d, 1);
    g.lineBetween(tx - w / 2 + 16, ty + 26, tx + w / 2 - 16, gy - plinthH);
    g.lineBetween(tx + w / 2 - 16, ty + 26, tx - w / 2 + 16, gy - plinthH);

    // 2. Chiseled Cobblestone & Granite Foundation Plinths at base of each pillar
    for (const px of [tx - w / 2 + 4, tx - 13, tx + w / 2 - 30]) {
      // Pedestal Block
      g.fillStyle(0x485460, 1);
      g.fillRect(px, gy - plinthH, 26, plinthH);
      // Stone Cap Trim
      g.fillStyle(0x808e9b, 1);
      g.fillRect(px - 2, gy - plinthH, 30, 6);
      g.fillStyle(0x2f3640, 1);
      g.fillRect(px - 1, gy - 4, 28, 4);
      // Chiseled Mortar Seams
      g.lineStyle(1.5, 0x1e272e, 0.9);
      g.lineBetween(px, gy - plinthH + 15, px + 26, gy - plinthH + 15);
      g.lineBetween(px + 13, gy - plinthH + 6, px + 13, gy - plinthH + 15);
      g.lineBetween(px + 8, gy - plinthH + 15, px + 8, gy);
      g.lineBetween(px + 20, gy - plinthH + 15, px + 20, gy);
    }

    // Steel Corner L-Brackets with Silver Bolts
    g.fillStyle(0x2c3e50, 1);
    for (const px of [tx - w / 2 + 6, tx - 11, tx + w / 2 - 28]) {
      g.fillRect(px, gy - plinthH - 8, 22, 10);
      g.fillStyle(0xdcdde1, 1);
      g.fillCircle(px + 4, gy - plinthH - 3, 2);
      g.fillCircle(px + 18, gy - plinthH - 3, 2);
      g.fillStyle(0x2c3e50, 1);
    }

    // 3. Fortified Dark Oak Deck with Steel Trim
    g.fillStyle(0x351b08, 1);
    g.fillRect(tx - w / 2 - 14, ty, w + 28, 18);
    g.fillStyle(0x576574, 1);
    g.fillRect(tx - w / 2 - 14, ty, w + 28, 5); // Steel rim
    g.lineStyle(1.5, 0x8395a7, 1);
    g.strokeRect(tx - w / 2 - 14, ty, w + 28, 5);

    // Deck Studs
    g.fillStyle(0xdcdde1, 1);
    for (let x = tx - w / 2 - 10; x < tx + w / 2 + 10; x += 22) {
      g.fillCircle(x, ty + 2.5, 1.8);
    }

    // Railing with Steel Reinforced Corner Caps
    g.fillStyle(0x2a1505, 1);
    g.fillRect(tx - w / 2 - 10, ty - 32, 12, 32);
    g.fillRect(tx + w / 2 - 2, ty - 32, 12, 32);
    g.fillRect(tx - w / 2 - 12, ty - 38, w + 24, 8);
    // Steel Cap Plates
    g.fillStyle(0x576574, 1);
    g.fillRect(tx - w / 2 - 12, ty - 38, 16, 8);
    g.fillRect(tx + w / 2 - 4, ty - 38, 16, 8);

    // 4. Hanging Forged Iron Cage Lantern with Warm Glowing Amber Core
    const lanternX = tx - w / 2 - 18;
    const lanternY = ty - 10;
    // Iron Bracket
    g.lineStyle(3, 0x2f3640, 1);
    g.lineBetween(tx - w / 2 - 4, ty - 24, lanternX, lanternY - 12);
    g.lineBetween(lanternX, lanternY - 12, lanternX, lanternY - 4);
    // Lantern Body
    g.fillStyle(0x1e272e, 1);
    g.fillRect(lanternX - 7, lanternY - 4, 14, 4);
    g.fillRect(lanternX - 6, lanternY + 12, 12, 4);
    // Amber Light Core
    const flicker = 0.8 + Math.sin(Date.now() * 0.015) * 0.2;
    g.fillStyle(0xf39c12, flicker);
    g.fillRect(lanternX - 5, lanternY, 10, 12);
    g.fillStyle(0xf1c40f, 0.25);
    g.fillCircle(lanternX, lanternY + 6, 22); // Warm ambient glow halo
    // Iron Cage Bars
    g.lineStyle(1.5, 0x2f3640, 1);
    g.lineBetween(lanternX - 2, lanternY, lanternX - 2, lanternY + 12);
    g.lineBetween(lanternX + 2, lanternY, lanternX + 2, lanternY + 12);
  }

  /**
   * TIER 3: Fortified Castle Keep (Clash Level 5-6)
   * Ashlar stone masonry pillars with individual bricks & mortar, arched lintel,
   * iron portcullis gate, castle crenellations (crenels & merlons), bronze lion heraldry shield, stone corbels.
   */
  private renderTier3(g: Phaser.GameObjects.Graphics, tx: number, ty: number, gy: number, w: number): void {
    // 1. Solid Ashlar Stone Masonry Pillars
    const colW = 24;
    const cols = [tx - w / 2 + 4, tx - 12, tx + w / 2 - 28];

    for (const cx of cols) {
      g.fillStyle(0x4b5863, 1);
      g.fillRect(cx, ty + 16, colW, gy - ty - 16);
      g.fillStyle(0x636e72, 1);
      g.fillRect(cx, ty + 16, 4, gy - ty - 16); // 3D highlight edge

      // Individual Brick Mortar Lines
      g.lineStyle(1.5, 0x2d3436, 0.9);
      for (let y = ty + 24; y < gy - 6; y += 14) {
        g.lineBetween(cx, y, cx + colW, y);
        // Staggered vertical seams
        const stagger = ((Math.floor((y - ty) / 14)) % 2 === 0) ? 8 : 16;
        g.lineBetween(cx + stagger, y - 14, cx + stagger, y);
      }
    }

    // 2. Central Stone Archway & Portcullis Gate
    // Vaulted Arch
    g.fillStyle(0x3d474f, 1);
    g.fillRect(tx - 32, ty + 20, 64, 14);
    g.lineStyle(2, 0x2d3436, 1);
    g.strokeRect(tx - 32, ty + 20, 64, 14);

    // Iron Portcullis Gate Bars (between pillars)
    g.lineStyle(3, 0x1e272e, 0.95);
    for (let bx = tx - 24; bx <= tx + 24; bx += 10) {
      g.lineBetween(bx, ty + 34, bx, gy - 2);
      // Drop-spikes on bottom of gate
      g.fillStyle(0x1e272e, 1);
      g.fillTriangle(bx - 3, gy - 2, bx + 3, gy - 2, bx, gy + 4);
    }
    // Horizontal Portcullis Spacers
    g.lineBetween(tx - 26, ty + 50, tx + 26, ty + 50);
    g.lineBetween(tx - 26, ty + 74, tx + 26, ty + 74);

    // 3. Carved Stone Corbel Brackets under the deck
    g.fillStyle(0x636e72, 1);
    for (const cx of [tx - w / 2 - 6, tx - 28, tx + 12, tx + w / 2 - 12]) {
      g.fillTriangle(cx, ty + 16, cx + 16, ty + 16, cx + 16, ty + 32);
    }

    // 4. Solid Stone Deck Platform & Medieval Castle Battlements (Crenellations!)
    g.fillStyle(0x3d474f, 1);
    g.fillRect(tx - w / 2 - 14, ty, w + 28, 16);
    g.fillStyle(0x747d8c, 1);
    g.fillRect(tx - w / 2 - 14, ty, w + 28, 4); // Flagstone rim

    // Castle Battlements (Crenels & Merlons)
    // 5 Raised Stone Merlons along parapet with embrasures (arrow slits)
    const merlonW = 16;
    const merlonH = 34;
    const gap = 12;
    const startX = tx - w / 2 - 12;

    for (let i = 0; i < 5; i++) {
      const mx = startX + i * (merlonW + gap);
      // Merlon Stone Body
      g.fillStyle(0x4b5863, 1);
      g.fillRect(mx, ty - merlonH + 8, merlonW, merlonH - 8);
      // Chamfered Capstone
      g.fillStyle(0x747d8c, 1);
      g.fillRect(mx - 2, ty - merlonH + 4, merlonW + 4, 5);
      g.lineStyle(1.5, 0x2d3436, 1);
      g.strokeRect(mx, ty - merlonH + 8, merlonW, merlonH - 8);
      // Central Arrow Slit (Embrasure)
      g.fillStyle(0x1e272e, 1);
      g.fillRect(mx + merlonW / 2 - 1.5, ty - merlonH + 14, 3, 12);
    }

    // 5. Bronze Garrison Lion Heraldry Shield on Central Arch
    const shieldX = tx;
    const shieldY = ty + 24;
    g.fillStyle(0xcd7f32, 1);
    g.fillTriangle(shieldX - 12, shieldY, shieldX + 12, shieldY, shieldX, shieldY + 16);
    g.fillRect(shieldX - 12, shieldY - 8, 24, 8);
    // Golden Lion Face Outline
    g.fillStyle(0xf1c40f, 1);
    g.fillCircle(shieldX, shieldY - 1, 4.5);
    g.fillStyle(0xe74c3c, 1);
    g.fillCircle(shieldX, shieldY - 1, 2); // Center Ruby

    // 6. Wall Brazier Sconce
    const bzX = tx - w / 2 - 18;
    const bzY = ty - 4;
    g.fillStyle(0x2f3640, 1);
    g.fillRect(bzX - 6, bzY, 12, 14);
    g.fillTriangle(bzX - 8, bzY, bzX + 8, bzY, bzX, bzY + 14);
    // Dynamic Leaping Fire
    g.fillStyle(0xe67e22, 0.95);
    g.fillCircle(bzX, bzY - 4 + Math.sin(Date.now() * 0.012) * 2, 7);
    g.fillStyle(0xf1c40f, 0.9);
    g.fillCircle(bzX, bzY - 5 + Math.sin(Date.now() * 0.016) * 1.5, 4);
  }

  /**
   * TIER 4: Royal Iron Citadel (Clash Level 7-8)
   * Dark slate & obsidian masonry, polished royal gold edge trims & corner filigree,
   * black iron-plated bulkheads with brass rivets, golden crown battlement tips,
   * royal golden lion crest with ruby eyes, dual roaring forged-iron braziers.
   */
  private renderTier4(g: Phaser.GameObjects.Graphics, tx: number, ty: number, gy: number, w: number): void {
    const colW = 26;
    const cols = [tx - w / 2 + 3, tx - 13, tx + w / 2 - 29];

    // 1. Dark Slate Castle Masonry Pillars with Gilded Gold Trims
    for (const cx of cols) {
      g.fillStyle(0x1a1e24, 1);
      g.fillRect(cx, ty + 16, colW, gy - ty - 16);

      // Black Iron Armor Plates on lower halves
      g.fillStyle(0x2c3e50, 1);
      g.fillRect(cx + 2, gy - 44, colW - 4, 38);
      g.lineStyle(1.5, 0x485460, 1);
      g.strokeRect(cx + 2, gy - 44, colW - 4, 38);

      // Polished Brass/Gold Rivets
      g.fillStyle(0xf1c40f, 1);
      g.fillCircle(cx + 6, gy - 38, 2);
      g.fillCircle(cx + colW - 6, gy - 38, 2);
      g.fillCircle(cx + 6, gy - 12, 2);
      g.fillCircle(cx + colW - 6, gy - 12, 2);

      // Royal Gilded Gold Edge Trims on Pillars!
      g.lineStyle(2, 0xf1c40f, 1);
      g.lineBetween(cx, ty + 16, cx, gy);
      g.lineBetween(cx + colW, ty + 16, cx + colW, gy);
    }

    // 2. Gothic Arched Gate with Molten Inner Furnace Glow
    g.fillStyle(0x0f1115, 1);
    g.fillRect(tx - 34, ty + 24, 68, gy - ty - 24);
    // Molten furnace glow from inside gate
    const innerPulse = 0.4 + Math.sin(Date.now() * 0.008) * 0.2;
    g.fillStyle(0xd35400, innerPulse);
    g.fillRect(tx - 28, ty + 42, 56, gy - ty - 42);

    // Heavy Gilded Arch Lintel
    g.fillStyle(0x2c3e50, 1);
    g.fillRect(tx - 36, ty + 18, 72, 14);
    g.lineStyle(2.5, 0xf1c40f, 1);
    g.strokeRect(tx - 36, ty + 18, 72, 14);

    // 3. Polished Black Obsidian Deck with Gold Inlays
    g.fillStyle(0x1e272e, 1);
    g.fillRect(tx - w / 2 - 16, ty, w + 32, 18);
    // Polished Gold Rim
    g.fillStyle(0xf1c40f, 1);
    g.fillRect(tx - w / 2 - 16, ty, w + 32, 5);
    g.fillStyle(0xd4ac0d, 1);
    g.fillRect(tx - w / 2 - 16, ty + 5, w + 32, 2);

    // 4. Black Iron Battlements Crowned with Sharp Gilded Spear Merlons!
    const merlonW = 18;
    const merlonH = 38;
    const gap = 11;
    const startX = tx - w / 2 - 14;

    for (let i = 0; i < 5; i++) {
      const mx = startX + i * (merlonW + gap);
      // Black Iron Merlon
      g.fillStyle(0x2c3e50, 1);
      g.fillRect(mx, ty - merlonH + 12, merlonW, merlonH - 12);
      g.lineStyle(1.5, 0x485460, 1);
      g.strokeRect(mx, ty - merlonH + 12, merlonW, merlonH - 12);
      // Gilded Golden Spear Point Crown!
      g.fillStyle(0xf1c40f, 1);
      g.fillTriangle(mx, ty - merlonH + 12, mx + merlonW, ty - merlonH + 12, mx + merlonW / 2, ty - merlonH);
      // Ruby Accent
      g.fillStyle(0xe74c3c, 1);
      g.fillCircle(mx + merlonW / 2, ty - merlonH + 8, 2);
    }

    // 5. Grand Royal Lion Crest (Gold with Glowing Ruby Eyes)
    const crestX = tx;
    const crestY = ty + 24;
    g.fillStyle(0xf1c40f, 1);
    g.fillCircle(crestX, crestY, 10);
    g.fillTriangle(crestX - 10, crestY + 6, crestX + 10, crestY + 6, crestX, crestY + 16);
    // Glowing Ruby Eyes
    g.fillStyle(0xff3838, 1);
    g.fillCircle(crestX - 3.5, crestY - 1, 1.8);
    g.fillCircle(crestX + 3.5, crestY - 1, 1.8);

    // 6. Dual Roaring Hanging Braziers (Left & Right)
    for (const bzX of [tx - w / 2 - 20, tx + w / 2 + 10]) {
      const bzY = ty - 4;
      // Chains
      g.lineStyle(2, 0xd4ac0d, 1);
      g.lineBetween(bzX, ty - 22, bzX, bzY);
      // Ornate Iron Bowl
      g.fillStyle(0x1e272e, 1);
      g.fillTriangle(bzX - 10, bzY, bzX + 10, bzY, bzX, bzY + 14);
      g.lineStyle(1.5, 0xf1c40f, 1);
      g.strokeTriangle(bzX - 10, bzY, bzX + 10, bzY, bzX, bzY + 14);
      // Roaring Fire
      const fH = 8 + Math.sin(Date.now() * 0.015 + bzX) * 4;
      g.fillStyle(0xff793f, 0.95);
      g.fillTriangle(bzX - 7, bzY, bzX + 7, bzY, bzX, bzY - fH - 6);
      g.fillStyle(0xf1c40f, 0.9);
      g.fillTriangle(bzX - 4, bzY, bzX + 4, bzY, bzX, bzY - fH - 2);
    }
  }

  /**
   * TIER 5: Apex Dragon Citadel (Master Fortress, Clash Level 9-11+)
   * Volcanic basalt monolith pillars, pulsing magma runes carved into the stone,
   * dragon-scale titanium armor plates, dragon-wing flared horn battlements,
   * imperial dragon skull crest, twin roaring ethereal azure/crimson dragonfire braziers,
   * and glowing citadel power aura.
   */
  private renderTier5(g: Phaser.GameObjects.Graphics, tx: number, ty: number, gy: number, w: number): void {
    const colW = 28;
    const cols = [tx - w / 2 + 2, tx - 14, tx + w / 2 - 30];
    const time = Date.now() * 0.005;

    // 1. Volcanic Basalt Monolith Pillars
    for (const cx of cols) {
      g.fillStyle(0x0d0e12, 1);
      g.fillRect(cx, ty + 16, colW, gy - ty - 16);

      // Titanium Dragon-Scale Plates
      g.fillStyle(0x1e272e, 1);
      g.fillRect(cx + 3, gy - 50, colW - 6, 44);
      g.lineStyle(2, 0xd4ac0d, 1); // Dragon Gold Edge
      g.strokeRect(cx + 3, gy - 50, colW - 6, 44);

      // Pulsing Magma Runes carved into the basalt!
      const runePulse = 0.65 + Math.sin(time + cx * 0.1) * 0.35;
      g.lineStyle(2.5, 0xff3838, runePulse);
      // Ancient runic glyph shapes
      g.lineBetween(cx + 8, ty + 35, cx + colW - 8, ty + 45);
      g.lineBetween(cx + colW - 8, ty + 45, cx + 8, ty + 55);
      g.lineBetween(cx + 14, ty + 30, cx + 14, ty + 60);

      g.lineStyle(2, 0xffa502, runePulse * 0.8);
      g.lineBetween(cx + 10, gy - 40, cx + colW - 10, gy - 24);
      g.lineBetween(cx + colW - 10, gy - 40, cx + 10, gy - 24);
    }

    // 2. Swirling Abyssal Dragon Portal inside central arch
    g.fillStyle(0x08090c, 1);
    g.fillRect(tx - 36, ty + 24, 72, gy - ty - 24);
    // Molten core radiance
    const portalGlow = 0.5 + Math.sin(time * 1.5) * 0.25;
    g.fillStyle(0xff3838, portalGlow * 0.6);
    g.fillEllipse(tx, gy - 36, 48, 54);
    g.fillStyle(0xff793f, portalGlow * 0.4);
    g.fillEllipse(tx, gy - 36, 28, 34);

    // Monumental Obsidian Dragon Arch Lintel
    g.fillStyle(0x1e272e, 1);
    g.fillRect(tx - 38, ty + 16, 76, 16);
    g.lineStyle(3, 0xf1c40f, 1);
    g.strokeRect(tx - 38, ty + 16, 76, 16);

    // 3. Polished Obsidian Dragon Deck Platform
    g.fillStyle(0x0f1115, 1);
    g.fillRect(tx - w / 2 - 18, ty, w + 36, 18);
    // Molten Gold Trim Band
    g.fillStyle(0xf1c40f, 1);
    g.fillRect(tx - w / 2 - 18, ty, w + 36, 6);
    // Molten Lava Vein across deck
    g.lineStyle(2, 0xff4757, 0.8 + Math.sin(time * 2) * 0.2);
    g.lineBetween(tx - w / 2 - 12, ty + 12, tx + w / 2 + 12, ty + 12);

    // 4. Dragon-Wing Flared Horn Battlements & Spiked Crown Merlons!
    const merlonW = 18;
    const merlonH = 42;
    const gap = 11;
    const startX = tx - w / 2 - 15;

    for (let i = 0; i < 5; i++) {
      const mx = startX + i * (merlonW + gap);
      // Obsidian Merlon Block
      g.fillStyle(0x161820, 1);
      g.fillRect(mx, ty - merlonH + 14, merlonW, merlonH - 14);
      g.lineStyle(1.5, 0xd4ac0d, 1);
      g.strokeRect(mx, ty - merlonH + 14, merlonW, merlonH - 14);

      // Flared Dragon Horn Crown Spire!
      g.fillStyle(0xf1c40f, 1);
      g.fillTriangle(mx - 2, ty - merlonH + 14, mx + merlonW + 2, ty - merlonH + 14, mx + merlonW / 2, ty - merlonH);
      // Pulsing Magma Core Gem
      g.fillStyle(0xff3838, 0.95);
      g.fillCircle(mx + merlonW / 2, ty - merlonH + 8, 2.5);
    }

    // Outer Dragon Horn Finials on far corners
    g.fillStyle(0xd4ac0d, 1);
    // Left Horn
    g.fillTriangle(tx - w / 2 - 18, ty - 28, tx - w / 2 - 12, ty, tx - w / 2 - 28, ty - 42);
    // Right Horn
    g.fillTriangle(tx + w / 2 + 18, ty - 28, tx + w / 2 + 12, ty, tx + w / 2 + 28, ty - 42);

    // 5. Imperial Dragon Skull Heraldic Crest (Molten Gold with Blazing Cyan Eyes)
    const crestX = tx;
    const crestY = ty + 24;
    g.fillStyle(0xf1c40f, 1);
    // Horned Dragon Skull Polygon
    g.fillTriangle(crestX - 14, crestY - 6, crestX + 14, crestY - 6, crestX, crestY + 16);
    g.fillTriangle(crestX - 18, crestY - 14, crestX - 6, crestY - 6, crestX - 10, crestY);
    g.fillTriangle(crestX + 18, crestY - 14, crestX + 6, crestY - 6, crestX + 10, crestY);
    // Blazing Ethereal Cyan Dragon Eyes!
    g.fillStyle(0x00d2d3, 1);
    g.fillCircle(crestX - 4.5, crestY - 1, 2.2);
    g.fillCircle(crestX + 4.5, crestY - 1, 2.2);

    // 6. Twin Roaring Dragonfire Braziers (Azure core + Crimson Flame!)
    for (const bzX of [tx - w / 2 - 24, tx + w / 2 + 14]) {
      const bzY = ty - 4;
      // Dragon Claw Bracket
      g.fillStyle(0xd4ac0d, 1);
      g.fillRect(bzX - 2, ty - 24, 4, 20);
      // Obsidian Claw Bowl
      g.fillStyle(0x161820, 1);
      g.fillTriangle(bzX - 12, bzY, bzX + 12, bzY, bzX, bzY + 16);
      g.lineStyle(2, 0xf1c40f, 1);
      g.strokeTriangle(bzX - 12, bzY, bzX + 12, bzY, bzX, bzY + 16);

      // Roaring Dragon Fire (Cyan core + Crimson outer)
      const fH = 12 + Math.sin(time * 3 + bzX) * 5;
      g.fillStyle(0xff3838, 0.95);
      g.fillTriangle(bzX - 8, bzY, bzX + 8, bzY, bzX, bzY - fH - 8);
      g.fillStyle(0xffa502, 0.9);
      g.fillTriangle(bzX - 5, bzY, bzX + 5, bzY, bzX, bzY - fH - 3);
      g.fillStyle(0x00d2d3, 0.95); // Azure dragonfire core
      g.fillTriangle(bzX - 3, bzY, bzX + 3, bzY, bzX, bzY - fH + 2);
    }
  }

  /**
   * Barricade Spikes: Material and shape scale dynamically with Tower Tier!
   */
  private renderBarricadeSpikes(g: Phaser.GameObjects.Graphics, tx: number, gy: number, w: number): void {
    for (let i = 0; i < 4; i++) {
      const sy = gy - 15 - i * 16;
      const spikeLen = 24 + this.tier * 3 + (this.hasSpikes ? 10 : 0);

      if (this.tier >= 4) {
        // Gilded Black Steel Blades with Gold Edges
        g.fillStyle(0x1e272e, 1);
        g.fillTriangle(tx + w / 2 - 10, sy, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 - 10, sy + 12);
        g.lineStyle(1.8, 0xf1c40f, 1);
        g.strokeTriangle(tx + w / 2 - 10, sy, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 - 10, sy + 12);
        if (this.tier === 5) {
          // Glowing Molten Core Vein
          g.fillStyle(0xff3838, 0.9);
          g.fillRect(tx + w / 2 - 6, sy + 5, spikeLen * 0.65, 2);
        }
      } else if (this.tier >= 3) {
        // Solid Forged Steel Castle Spikes
        g.fillStyle(0x7f8c8d, 1);
        g.fillTriangle(tx + w / 2 - 10, sy, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 - 10, sy + 12);
        g.lineStyle(1.8, 0xbdc3c7, 1);
        g.strokeTriangle(tx + w / 2 - 10, sy, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 - 10, sy + 12);
        g.lineStyle(1.5, 0xecf0f1, 1);
        g.lineBetween(tx + w / 2 - 10, sy + 6, tx + w / 2 + spikeLen - 4, sy + 6); // Central blade rib
      } else if (this.tier === 2) {
        // Iron-Capped Oak Palisade Stakes
        g.fillStyle(0x4a2810, 1);
        g.fillTriangle(tx + w / 2 - 10, sy, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 - 10, sy + 12);
        // Steel Armor Cap
        g.fillStyle(0x95a5a6, 1);
        g.fillTriangle(tx + w / 2 + spikeLen - 12, sy + 3, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 + spikeLen - 12, sy + 9);
      } else {
        // Tier 1: Rustic Wooden Stakes
        g.fillStyle(this.hasSpikes ? 0x7f8c8d : 0x4a2810, 1);
        g.fillTriangle(tx + w / 2 - 10, sy, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 - 10, sy + 12);
        if (this.hasSpikes) {
          g.lineStyle(1.5, 0xbdc3c7, 1);
          g.strokeTriangle(tx + w / 2 - 10, sy, tx + w / 2 + spikeLen, sy + 6, tx + w / 2 - 10, sy + 12);
        }
      }
    }
  }

  /**
   * Sentry Turret: Adapts to the tower's architectural grandeur
   */
  private renderSentryTurret(g: Phaser.GameObjects.Graphics, tx: number, ty: number, w: number): void {
    const sentryX = tx + w / 2 - 4;
    const sentryY = ty - 42;

    if (this.tier >= 4) {
      // Royal Gilded Clockwork Ballista
      g.lineStyle(4, 0xf1c40f, 1);
      g.lineBetween(sentryX - 8, ty - 32, sentryX, sentryY);
      g.lineBetween(sentryX + 8, ty - 32, sentryX, sentryY);
      g.fillStyle(0x2c3e50, 1);
      g.fillRect(sentryX - 6, sentryY - 4, 24, 8);
      g.lineStyle(3, 0xf1c40f, 1);
      g.strokeRect(sentryX - 6, sentryY - 4, 24, 8);
      // Double Crossbow Arms
      g.lineStyle(3.5, 0xe67e22, 1);
      g.lineBetween(sentryX + 12, sentryY - 16, sentryX + 4, sentryY);
      g.lineBetween(sentryX + 4, sentryY, sentryX + 12, sentryY + 16);
      g.lineBetween(sentryX + 16, sentryY - 12, sentryX + 8, sentryY);
      g.lineBetween(sentryX + 8, sentryY, sentryX + 16, sentryY + 12);
      g.fillStyle(0xff3838, 1);
      g.fillCircle(sentryX + 18, sentryY, 3.5);
    } else {
      // Standard / Castle Ballista
      g.lineStyle(3.5, this.tier >= 3 ? 0x7f8c8d : 0x2c3e50, 1);
      g.lineBetween(sentryX - 8, ty - 32, sentryX, sentryY);
      g.lineBetween(sentryX + 8, ty - 32, sentryX, sentryY);
      g.fillStyle(0x7f8c8d, 1);
      g.fillRect(sentryX - 6, sentryY - 3, 22, 6);
      g.lineStyle(3, 0xf39c12, 1);
      g.lineBetween(sentryX + 10, sentryY - 14, sentryX + 4, sentryY);
      g.lineBetween(sentryX + 4, sentryY, sentryX + 10, sentryY + 14);
      g.fillStyle(0xff4757, 1);
      g.fillCircle(sentryX + 16, sentryY, 2.5);
    }
  }

  /**
   * War Banner: Royal Heraldry Banner
   */
  private renderWarBanner(g: Phaser.GameObjects.Graphics, tx: number, ty: number, w: number): void {
    const poleX = tx - w / 2 + 6;
    const poleY = ty - 68;
    g.lineStyle(3.5, 0xd4ac0d, 1);
    g.lineBetween(poleX, ty, poleX, poleY);
    g.fillStyle(0xf1c40f, 1);
    g.fillCircle(poleX, poleY, 4.5);

    const flap = Math.sin(Date.now() * 0.007) * 7;
    g.fillStyle(this.tier >= 4 ? 0x8e44ad : 0xc0392b, 1); // Royal Purple for Tier 4-5, Crimson for 1-3
    g.fillTriangle(poleX, poleY + 4, poleX + 34 + flap, poleY + 13, poleX, poleY + 26);
    // Gold Heraldic Insignia
    g.fillStyle(0xf1c40f, 1);
    g.fillCircle(poleX + 14, poleY + 14, 4);
  }

  /**
   * Celebratory Upgrade Level-Up VFX Overlay
   */
  private renderUpgradeVFX(g: Phaser.GameObjects.Graphics): void {
    // Expanding Sunburst Rings
    for (const ring of this.upgradeRings) {
      const a = ring.alpha * (ring.life / ring.maxLife);
      g.lineStyle(3.5, ring.color, a);
      g.strokeCircle(ring.x, ring.y, ring.r);
    }

    // Glittering Fireworks Sparks
    for (const sp of this.upgradeSparks) {
      const a = sp.alpha * (sp.life / sp.maxLife);
      g.fillStyle(sp.color, a);
      g.fillCircle(sp.x, sp.y, sp.r);
    }
  }

  /**
   * Visually renders the tower as completely demolished ruins,
   * reflecting the specific tier's structural materials!
   */
  private renderDestroyedRuins(g: Phaser.GameObjects.Graphics): void {
    const tx = this.x;
    const ty = this.topY;
    const gy = this.groundY;
    const w = this.width;
    const p = Math.max(0.05, Math.min(1.0, this.collapseProgress));

    const dropY = p * (this.height * 0.74);
    const tilt = p * 0.46;

    // ── 1. Charred Ground Rubble Base Mound ──
    const rubbleBaseCol = this.tier >= 4 ? 0x0a0c10 : (this.tier >= 2 ? 0x1f2429 : 0x190d04);
    g.fillStyle(rubbleBaseCol, 0.95);
    g.fillEllipse(tx, gy - 1, w * 1.35, 24);
    g.fillStyle(0x2d1806, 0.95);
    g.fillEllipse(tx - 6, gy - 5, w * 1.15, 16);

    // Scattered stone/timber rubble chunks
    const stoneCol = this.tier >= 4 ? 0x1e272e : (this.tier >= 2 ? 0x485460 : 0x130a03);
    g.fillStyle(stoneCol, 1);
    g.fillTriangle(tx - w / 2 - 12, gy, tx - w / 2 + 6, gy - 14, tx - w / 2 + 18, gy);
    g.fillTriangle(tx - 18, gy, tx - 4, gy - 18, tx + 14, gy);
    g.fillTriangle(tx + 25, gy, tx + 46, gy - 16, tx + w / 2 + 22, gy);

    // Broken gold trim fragments for Tier 4-5
    if (this.tier >= 4) {
      g.fillStyle(0xf1c40f, 0.85);
      g.fillRect(tx - 24, gy - 10, 10, 3);
      g.fillRect(tx + 32, gy - 8, 12, 3);
    }

    // ── 2. Snapped Pillar Stumps (Material matches Tier!) ──
    const stumpCol = this.tier >= 4 ? 0x1a1e24 : (this.tier >= 2 ? 0x3d474f : 0x2d1806);
    const lpX = tx - w / 2 + 8;
    const lpStumpTop = gy - 42;
    g.fillStyle(stumpCol, 1);
    g.fillRect(lpX, lpStumpTop, 18, 42);
    // Splinter / stone fracture teeth
    g.fillStyle(this.tier >= 2 ? 0x2f3640 : 0x1e0e03, 1);
    g.fillTriangle(lpX, lpStumpTop, lpX + 5, lpStumpTop - 14, lpX + 9, lpStumpTop);
    g.fillTriangle(lpX + 6, lpStumpTop, lpX + 12, lpStumpTop - 18, lpX + 15, lpStumpTop);
    g.fillTriangle(lpX + 11, lpStumpTop, lpX + 17, lpStumpTop - 11, lpX + 18, lpStumpTop);

    // Center Stump
    const cpX = tx - 9;
    const cpStumpTop = gy - 22;
    g.fillStyle(stumpCol, 1);
    g.fillRect(cpX, cpStumpTop, 18, 22);
    g.fillTriangle(cpX, cpStumpTop, cpX + 6, cpStumpTop - 12, cpX + 11, cpStumpTop);
    g.fillTriangle(cpX + 9, cpStumpTop, cpX + 15, cpStumpTop - 10, cpX + 18, cpStumpTop);

    // Right Stump
    const rpX = tx + w / 2 - 26;
    const rpStumpTop = gy - 11;
    g.fillStyle(stumpCol, 1);
    g.fillRect(rpX, rpStumpTop, 18, 11);
    g.fillTriangle(rpX, rpStumpTop, rpX + 8, rpStumpTop - 8, rpX + 18, rpStumpTop);

    // ── 3. Crashed & Split Deck Platform ──
    const lDeckStartX = tx - w / 2 - 14;
    const lDeckStartY = ty + dropY * 0.42;
    const lDeckBreakX = tx - 6;
    const lDeckBreakY = ty + dropY * 0.68 + Math.sin(tilt) * 20;

    const deckCol = this.tier >= 4 ? 0x1e272e : (this.tier >= 3 ? 0x3d474f : 0x3d210b);
    g.lineStyle(14, deckCol, 1);
    g.lineBetween(lDeckStartX, lDeckStartY, lDeckBreakX, lDeckBreakY);
    g.lineStyle(4, this.tier >= 4 ? 0xf1c40f : 0x5a3114, 1);
    g.lineBetween(lDeckStartX, lDeckStartY - 5, lDeckBreakX, lDeckBreakY - 5);

    // Right deck section (slams violently down into dirt)
    const rDeckStartX = lDeckBreakX + 4;
    const rDeckStartY = lDeckBreakY + 4;
    const rDeckEndX = tx + w / 2 + 18;
    const rDeckEndY = Math.min(gy - 3, ty + dropY + Math.sin(tilt) * (w * 0.55));

    g.lineStyle(14, this.tier >= 4 ? 0x2c3e50 : 0x4a2810, 1);
    g.lineBetween(rDeckStartX, rDeckStartY, rDeckEndX, rDeckEndY);
    g.lineStyle(4, this.tier >= 4 ? 0xf1c40f : 0x6b3c1b, 1);
    g.lineBetween(rDeckStartX, rDeckStartY - 5, rDeckEndX, rDeckEndY - 5);

    // Splinter teeth at the deck rupture point
    g.fillStyle(0x8b5a2b, 1);
    g.fillTriangle(lDeckBreakX - 3, lDeckBreakY - 7, lDeckBreakX + 7, lDeckBreakY, lDeckBreakX - 3, lDeckBreakY + 7);

    // Smashed Barricade Spikes scattered in dirt
    g.fillStyle(this.tier >= 4 ? 0xf1c40f : 0x7f8c8d, 1);
    g.fillTriangle(tx + w / 2 - 4, gy - 2, tx + w / 2 + 28, gy - 5, tx + w / 2 - 2, gy - 9);
    g.fillTriangle(tx + w / 2 - 16, gy - 8, tx + w / 2 + 12, gy - 18, tx + w / 2 - 12, gy - 16);

    // Glowing Embers inside the Rubble
    for (let e = 0; e < 6; e++) {
      const ex = tx - w / 2 + 18 + e * 22;
      const ey = gy - 4 - ((e % 2) * 5);
      const pulse = 0.6 + Math.sin(Date.now() * 0.009 + e * 1.7) * 0.4;
      g.fillStyle(this.tier === 5 ? (e % 2 === 0 ? 0x00d2d3 : 0xff3838) : (e % 2 === 0 ? 0xe74c3c : 0xf39c12), pulse);
      g.fillCircle(ex, ey, 2.5);
    }

    // Dynamic Flying & Bouncing Debris
    for (const d of this.debris) {
      const alpha = Math.max(0, Math.min(1, d.life / 1.0));
      g.save();
      const cosR = Math.cos(d.rot);
      const sinR = Math.sin(d.rot);

      if (d.type === 'plank' || d.type === 'stone' || d.type === 'gold' || d.type === 'iron') {
        g.fillStyle(d.color, alpha);
        const hw = d.w * 0.5;
        const hh = d.h * 0.5;
        const p1x = d.x + (-hw * cosR - -hh * sinR);
        const p1y = d.y + (-hw * sinR + -hh * cosR);
        const p2x = d.x + (hw * cosR - -hh * sinR);
        const p2y = d.y + (hw * sinR + -hh * cosR);
        const p3x = d.x + (hw * cosR - hh * sinR);
        const p3y = d.y + (hw * sinR + hh * cosR);
        const p4x = d.x + (-hw * cosR - hh * sinR);
        const p4y = d.y + (-hw * sinR + hh * cosR);
        g.fillTriangle(p1x, p1y, p2x, p2y, p3x, p3y);
        g.fillTriangle(p1x, p1y, p3x, p3y, p4x, p4y);
      } else if (d.type === 'spike') {
        g.fillStyle(d.color, alpha);
        const tipX = d.x + cosR * d.w;
        const tipY = d.y + sinR * d.w;
        const b1X = d.x - cosR * (d.w * 0.3) - sinR * (d.h * 0.5);
        const b1Y = d.y - sinR * (d.w * 0.3) + cosR * (d.h * 0.5);
        const b2X = d.x - cosR * (d.w * 0.3) + sinR * (d.h * 0.5);
        const b2Y = d.y - sinR * (d.w * 0.3) - cosR * (d.h * 0.5);
        g.fillTriangle(tipX, tipY, b1X, b1Y, b2X, b2Y);
      } else if (d.type === 'splinter') {
        g.fillStyle(d.color, alpha);
        const tipX = d.x + cosR * d.w;
        const tipY = d.y + sinR * d.w;
        const b1X = d.x - sinR * d.h;
        const b1Y = d.y + cosR * d.h;
        const b2X = d.x + sinR * d.h;
        const b2Y = d.y - cosR * d.h;
        g.fillTriangle(tipX, tipY, b1X, b1Y, b2X, b2Y);
      } else {
        g.fillStyle(d.color, alpha);
        g.fillCircle(d.x, d.y, d.h * 0.6);
      }
      g.restore();
    }

    // Volumetric Expanding Dust Shockwaves
    for (const dc of this.dustClouds) {
      const normLife = Math.max(0, Math.min(1, dc.life / dc.maxLife));
      const a = dc.alpha * normLife;
      g.fillStyle(dc.color, a * 0.45);
      g.fillCircle(dc.x, dc.y, dc.r);
      g.fillStyle(dc.color, a * 0.75);
      g.fillCircle(dc.x, dc.y, dc.r * 0.62);
    }

    // Continuous Billowing Smoke Plumes
    for (const sp of this.smokePuffs) {
      const normLife = Math.max(0, Math.min(1, sp.life / sp.maxLife));
      const a = sp.alpha * Math.sin(normLife * Math.PI);
      g.fillStyle(sp.color, a * 0.55);
      g.fillCircle(sp.x, sp.y, sp.r);
      g.fillStyle(0x141820, a * 0.35);
      g.fillCircle(sp.x, sp.y - 3, sp.r * 0.65);
    }

    // Floating Ember Sparks
    for (const em of this.embers) {
      const normLife = Math.max(0, Math.min(1, em.life / em.maxLife));
      g.fillStyle(em.color, em.alpha * normLife);
      g.fillCircle(em.x, em.y, em.r);
    }
  }
}
