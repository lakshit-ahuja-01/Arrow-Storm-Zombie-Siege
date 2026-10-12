import Phaser from 'phaser';
import { MatterRagdoll } from '../physics/MatterRagdoll';
import { BowType, BOW_METADATA, HeroSkinId } from '../types';
import { soundFX } from '../systems/SoundFX';

export const BOW_BASE_DAMAGE: Record<BowType, number> = {
  normal: 26,     // Free Default Bow (0 skulls)
  fire: 30,       // Molotov Fire Bow (35 skulls) - fire DOT 25 DPS
  ice: 31,        // Cryo Frost Bow (40 skulls) - freeze 3.5s & 2.5x shatter crit
  triple: 27,     // Triple Multishot Bow (45 skulls) - 3 spread arrows
  viper: 32,      // Toxic Viper Bow (45 skulls) - poison 35 DPS
  buzzsaw: 34,    // Buzzsaw Shredder (50 skulls) - 3 targets & limb sever
  tesla: 36,      // Tesla Lightning Bow (55 skulls) - 4-target chain arcs
  ricochet: 36,   // Ricochet Bouncer Bow (55 skulls) - chain bounces
  holy: 38,       // Holy Radiant Spear (60 skulls) - 4x pierce & smite
  homing: 37,     // Homing Seeker Bow (60 skulls) - auto curved steering
  storm: 28,      // Storm Rain Bow (65 skulls) - 5x barrage spread
  cluster: 40,    // Cluster Bomb Bow (70 skulls) - 140px demolition blast
  ballista: 44,   // Siege Harpoon Ballista (75 skulls) - 5 pierces & knockback slam
  blackhole: 48,  // Vortex Graviton Bow (90 skulls) - singularity gravity pull
};

export class Player {
  public scene: Phaser.Scene;
  public id: string;
  public x: number;
  public y: number;
  public ragdoll: MatterRagdoll;

  public maxHP: number = 115;
  public hp: number = 115;
  public dead: boolean = false;

  public arrowDamage: number = 28;
  public arrowSpeed: number = 1250;
  public bowType: BowType = 'normal';

  // 🔄 Dual Weapon Loadout ([1] Primary & [2] Secondary)
  public primaryBow: BowType = 'normal';
  public secondaryBow: BowType = 'normal';
  public activeSlot: 1 | 2 = 1;

  public damageMul: number = 1;
  public chargeSpeedMul: number = 1;
  public skulls: number = 0;

  // 💎 Tactical Special Skill Charges & Invulnerability
  public nukeCharges: number = 0;
  public lightningCharges: number = 0;
  public get timeFreezeCharges(): number { return this.lightningCharges; }
  public set timeFreezeCharges(v: number) { this.lightningCharges = v; }
  public divineAegisCharges: number = 0;
  public invincible: boolean = false;
  public hasWave1HealthBonus: boolean = false;

  public switchWeapon(slot?: 1 | 2): void {
    if (this.dead) return;
    const targetSlot = slot !== undefined ? slot : (this.activeSlot === 1 ? 2 : 1);
    const targetBow = targetSlot === 1 ? this.primaryBow : this.secondaryBow;
    if (!targetBow) return;

    this.activeSlot = targetSlot;
    this.bowType = targetBow;
    this.arrowDamage = this.getBowBaseDamage(targetBow);
    soundFX.playBowDraw();

    const bowMeta = BOW_METADATA[targetBow] || { name: targetBow.toUpperCase(), icon: '🏹' };
    (this.scene as any).spawnFloatingText?.(`${bowMeta.icon} [${targetSlot}] ${bowMeta.name} READY!`, this.x, this.y - 70, targetSlot === 1 ? '#00d2d3' : '#f5a623', 20);
    (this.scene as any).updateWeaponHUD?.();
  }

  public equipToSlot(slot: 1 | 2, bow: BowType): void {
    if (slot === 1) {
      if (this.secondaryBow === bow && this.primaryBow !== bow) {
        this.secondaryBow = this.primaryBow;
      }
      this.primaryBow = bow;
    } else {
      if (this.primaryBow === bow && this.secondaryBow !== bow) {
        this.primaryBow = this.secondaryBow;
      }
      this.secondaryBow = bow;
    }

    this.activeSlot = slot;
    this.bowType = bow;
    this.arrowDamage = this.getBowBaseDamage(bow);

    if (this.scene) {
      (this.scene as any).primaryBow = this.primaryBow;
      (this.scene as any).secondaryBow = this.secondaryBow;
      (this.scene as any).equippedBow = this.bowType;
      (this.scene as any).saveGameData?.();
      (this.scene as any).updateWeaponHUD?.();
    }
  }

  // 🥋 Archer Hero Skins & Cosmetics
  public currentSkin: HeroSkinId = 'default';

  public setSkin(skin: HeroSkinId): void {
    this.currentSkin = skin;
    if (this.scene) {
      (this.scene as any).currentSkin = skin;
      (this.scene as any).saveGameData?.();
    }
  }

  // Hero Perks
  public eagleEyeLevel: number = 0;
  public windWalkerLevel: number = 0;
  public adrenalineLevel: number = 0;
  public adrenalineTimer: number = 0;
  public ghostArrowLevel: number = 0;
  public bountyMul: number = 1;

  public isEndless: boolean = false;

  // Stamina System
  public maxStamina: number = 100;
  public stamina: number = 100;
  public staminaRegenRate: number = 7.0; // Slightly increased auto stamina recovery per second
  public staminaKillBonus: number = 8;  // Substantial reward restored on killing a zombie
  public staminaHeadshotBonus: number = 15; // High-impact reward on headshot kill
  public staminaRegenDelay: number = 0; // Brief cooldown before natural regeneration starts after firing

  /**
   * Configures Endless Mode stamina buffs:
   * 2x Max Stamina (200), boosted Regen Rate (11.5/s), 2x Kill & Headshot Recovery Bonuses (14/28),
   * and slightly decreased stamina consumption costs (jump cost 4, lower bow costs, faster delay).
   */
  public setEndlessMode(enabled: boolean = true): void {
    this.isEndless = enabled;
    if (enabled) {
      this.maxHP = 100;
      this.hp = 100;
      this.arrowDamage = 26;
      this.maxStamina = 200;
      this.stamina = 200;
      this.staminaRegenRate = 11.5; // Enhanced natural stamina regen
      this.staminaKillBonus = 14; // 2x stamina reward per zombie kill
      this.staminaHeadshotBonus = 28; // 2x stamina reward per headshot kill
      this.jumpStaminaCost = 4; // Decreased jump stamina cost
    } else {
      this.maxHP = 115;
      this.hp = 115;
      this.arrowDamage = 28;
      this.maxStamina = 100;
      this.stamina = 100;
      this.staminaRegenRate = 7.0;
      this.staminaKillBonus = 8;
      this.staminaHeadshotBonus = 15;
      this.jumpStaminaCost = 5;
    }
  }

  public getBowBaseDamage(type?: BowType): number {
    const t = type || this.bowType;
    const base = BOW_BASE_DAMAGE[t] || 26;
    const isEndless = this.isEndless || (this.scene as any)?.gameMode === 'endless';
    if (!isEndless && t === 'normal') {
      return 28; // Campaign mode slight boost to starting normal bow
    }
    return base;
  }

  public getStaminaCost(): number {
    let cost = 22;
    if (this.bowType === 'triple') cost = 28;
    else if (this.bowType === 'storm') cost = 42; // 🌩️ Storm Rain Bow: balanced high stamina consumption for celestial lightning rain
    else if (this.bowType === 'cluster' || this.bowType === 'ballista' || this.bowType === 'buzzsaw') cost = 26;
    else if (this.bowType === 'blackhole') cost = 32;
    else if (this.bowType === 'holy') cost = 25;
    else if (this.bowType === 'ricochet') cost = 24;

    // In Endless Mode: slightly decrease arrow stamina cost (~20% reduction)
    if (this.isEndless || (this.scene as any)?.gameMode === 'endless') {
      cost = Math.round(cost * 0.80);
    }
    return cost;
  }

  /**
   * Returns current stamina cost scaled dynamically by how far the bow is pulled.
   * If arrow projectile is near (low pull), less stamina is reduced.
   * If bow is pulled high/fully, full stamina is reduced.
   */
  public getCurrentStaminaCost(customFrac?: number): number {
    const baseCost = this.getStaminaCost();
    const pullFrac = customFrac !== undefined
      ? Math.max(0.12, Math.min(1.0, customFrac))
      : (this.isCharging ? Math.max(0.12, Math.min(1.0, this.chargeFrac)) : 0.25);
    
    // For Storm Rain: balanced pull scaling
    const minFactor = this.bowType === 'storm' ? 0.35 : 0.20;
    const factor = minFactor + (1.0 - minFactor) * pullFrac;

    const isEndlessMode = this.isEndless || (this.scene as any)?.gameMode === 'endless';
    const minCost = isEndlessMode 
      ? (this.bowType === 'storm' ? 14 : 3) 
      : (this.bowType === 'storm' ? 18 : 5);
    return Math.max(minCost, Math.round(baseCost * factor));
  }

  public restoreStamina(amount: number): void {
    if (this.dead || amount <= 0) return;
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    const sFill = document.getElementById('stamina-fill-p1');
    if (sFill) {
      sFill.classList.add('flash-boost');
      setTimeout(() => sFill.classList.remove('flash-boost'), 250);
    }
  }

  public isCharging: boolean = false;
  public chargeFrac: number = 0;
  public chargeTime: number = 0;
  public maxCharge: number = 1.25;
  public cooldown: number = 0;

  public onGround: boolean = true;
  public vy: number = 0;
  public maxJumps: number = 1;
  public jumpsLeft: number = 1;
  public jumpStaminaCost: number = 6; // Stamina consumed per athletic jump / double jump
  public prevSpace: boolean = false;
  public armorMul: number = 1.0;
  public damageReduction: number = 0;
  public aerialSnipeBonus: number = 0;
  public dodgesCount: number = 0;
  public hasMarksmanEye: boolean = true;
  public headshotCritBonus: number = 0;
  public fullChargeDmgBonus: number = 0;
  public hasSecondWind: boolean = false;
  public secondWindReady: boolean = false;
  public berserkerLevel: number = 0;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    this.scene = scene;
    this.id = id;
    this.x = x;
    this.y = y;

    this.ragdoll = new MatterRagdoll(scene, x, y, {
      scale: 1.0,
      isZombie: false
    });
  }

  public aimTargetX: number = 0;
  public aimTargetY: number = 0;

  public setAim(targetX: number, targetY: number): void {
    this.aimTargetX = targetX;
    this.aimTargetY = targetY;
    const pivotX = this.x;
    const pivotY = this.y - 45 * this.ragdoll.scale;
    this.ragdoll.aimAngle = Math.atan2(targetY - pivotY, targetX - pivotX);
    this.ragdoll.faceDir = targetX > this.x ? 1 : -1;
  }

  public getBowTipPosition(): { x: number; y: number } {
    const s = this.ragdoll.scale;
    const ang = this.ragdoll.aimAngle;
    const shoulderX = this.x + 4 * s;
    const shoulderY = this.y - 44 * s;
    const bowArmLen = 34 * s;
    const handX = shoulderX + Math.cos(ang) * bowArmLen;
    const handY = shoulderY + Math.sin(ang) * bowArmLen;
    return {
      x: handX + Math.cos(ang) * 16 * s,
      y: handY + Math.sin(ang) * 16 * s
    };
  }

  public startCharge(): void {
    if (this.dead || this.cooldown > 0) return;

    const isEndlessMode = this.isEndless || (this.scene as any)?.gameMode === 'endless';
    const minCost = this.bowType === 'storm'
      ? (isEndlessMode ? 6 : 8)
      : Math.max(isEndlessMode ? 3 : 5, Math.round(this.getStaminaCost() * 0.20));

    if (this.stamina < minCost) {
      soundFX.playArmorHit();
      const warningText = '⚡ EXHAUSTED! NEED STAMINA TO DRAW BOW!';
      (this.scene as any).spawnFloatingText?.(warningText, this.x, this.y - 65, '#f39c12', 20);
      (this.scene as any).shakeScreen?.(3, 0.1);
      const sBar = document.getElementById('hud-stamina-p1');
      if (sBar) {
        sBar.classList.add('stamina-warning');
        setTimeout(() => sBar.classList.remove('stamina-warning'), 650);
      }
      return;
    }

    this.isCharging = true;
    this.chargeFrac = 0.08;
    this.chargeTime = 0.08;
    soundFX.playBowDraw();
  }

  public releaseArrow(): { x?: number; y?: number; vx: number; vy: number; damage: number; type: BowType; bonusPierce: number; isPrimaryStorm?: boolean }[] | null {
    if (!this.isCharging || this.dead) return null;
    const power = Math.max(0.25, Math.min(1.0, this.chargeFrac));
    
    // Deduct stamina scaled by pull: near release = less stamina, full pull = more stamina
    const cost = this.getCurrentStaminaCost(this.chargeFrac);
    this.stamina = Math.max(0, this.stamina - cost);
    const isEndlessMode = this.isEndless || (this.scene as any)?.gameMode === 'endless';
    const baseDelay = isEndlessMode ? 0.35 : 0.6;
    this.staminaRegenDelay = this.bowType === 'storm' ? (baseDelay + 0.20) : baseDelay;

    this.isCharging = false;
    this.chargeFrac = 0;
    this.chargeTime = 0;
    
    // Enforce intentional millisecond gap between consecutive arrow shots (prevents rapid continuous firing)
    const isHeavyBow = this.bowType === 'storm' || this.bowType === 'ballista' || this.bowType === 'blackhole' || this.bowType === 'cluster';
    const baseCooldown = isHeavyBow ? 0.68 : (this.bowType === 'triple' || this.bowType === 'buzzsaw' ? 0.60 : 0.55);
    this.cooldown = this.adrenalineTimer > 0 ? baseCooldown * 0.80 : baseCooldown;

    soundFX.playBowRelease(power);

    // Hide charge meter
    const chargeEl = document.getElementById('charge-indicator');
    if (chargeEl) chargeEl.classList.add('hidden');

    const speed = this.arrowSpeed * power * (this.adrenalineTimer > 0 ? 1.25 : 1.0);
    const ang = this.ragdoll.aimAngle;
    const bannerMul = (this.scene as any).tower?.hasBanner ? 1 + ((this.scene as any).tower.bannerLevel || 1) * 0.20 : 1.0;

    // Aerial Snipe bonus: airborne shots deal bonus critical damage only if upgraded!
    const isAirborne = !this.onGround;
    const airMul = (isAirborne && this.aerialSnipeBonus > 0) ? (1.0 + this.aerialSnipeBonus) : 1.0;
    const baseDmg = this.getBowBaseDamage();
    this.arrowDamage = baseDmg;
    // Berserker rage bonus at low HP (<30%)
    const isBerserk = this.berserkerLevel > 0 && this.hp < this.maxHP * 0.30;
    const berserkDmgMul = isBerserk ? (1.0 + this.berserkerLevel * 0.80) : 1.0;

    // Full charge perfect shot bonus
    const isFullCharge = power >= 0.95 && this.fullChargeDmgBonus > 0;
    const fullChargeMul = isFullCharge ? (1.0 + this.fullChargeDmgBonus) : 1.0;
    const pullDmgMul = 0.50 + 0.50 * power;
    let dmg = baseDmg * this.damageMul * bannerMul * airMul * pullDmgMul * berserkDmgMul * fullChargeMul;
    if (this.ghostArrowLevel > 0) {
      // Phantom Quiver: +15% armor shredding damage per tier for all bows
      dmg *= (1 + this.ghostArrowLevel * 0.15);
    }

    if (isAirborne && this.aerialSnipeBonus > 0) {
      (this.scene as any).spawnFloatingText?.(`AIR SNIPE! 🦅 +${Math.round(this.aerialSnipeBonus * 100)}%`, this.x, this.y - 45, '#ffd700', 20);
      (this.scene as any).shakeScreen?.(5, 0.12);
    }
    if (isBerserk) {
      (this.scene as any).spawnFloatingText?.(`BERSERK RAGE! 😤 +${Math.round(this.berserkerLevel * 80)}%`, this.x, this.y - 65, '#ff4757', 20);
      (this.scene as any).shakeScreen?.(6, 0.15);
    }
    if (isFullCharge) {
      (this.scene as any).spawnFloatingText?.('PERFECT SHOT! 🎯', this.x, this.y - 55, '#f5a623', 18);
    }

    const isDedicatedPierce = this.bowType === 'ballista' || this.bowType === 'holy' || this.bowType === 'buzzsaw';
    const bonusPierce = isDedicatedPierce ? (this.ghostArrowLevel || 0) : 0;

    const list: { x?: number; y?: number; vx: number; vy: number; damage: number; type: BowType; bonusPierce: number; isPrimaryStorm?: boolean }[] = [];
    if (this.bowType === 'triple') {
      [-0.12, 0, 0.12].forEach(aOff => {
        list.push({
          vx: Math.cos(ang + aOff) * speed,
          vy: Math.sin(ang + aOff) * speed,
          damage: dmg,
          type: 'triple',
          bonusPierce
        });
      });
    } else if (this.bowType === 'storm') {
      // 🌩️ STORM RAIN BOW
      const vx = Math.cos(ang) * speed * 1.15;
      const vy = Math.sin(ang) * speed * 1.15;

      // 1. The Main Player Arrow fired from the bow:
      // When this arrow hits a zombie or the ground, it triggers the storm rain barrage with a slight delay!
      list.push({
        vx,
        vy,
        damage: dmg * 0.9,
        type: 'storm',
        bonusPierce,
        isPrimaryStorm: true
      });
    } else {
      list.push({
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        damage: dmg,
        type: this.bowType,
        bonusPierce
      });
    }
    return list;
  }

  public update(dt: number, spacePressed: boolean, deckY: number, deckX?: number): void {
    if (this.dead) return;

    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.adrenalineTimer > 0) this.adrenalineTimer -= dt;

    // Stamina recovery: pauses during draw and for 0.8s after firing
    if (this.staminaRegenDelay > 0) {
      this.staminaRegenDelay -= dt;
    } else if (!this.isCharging && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * dt);
    }

    if (this.isCharging) {
      const isBerserk = this.berserkerLevel > 0 && this.hp < this.maxHP * 0.30;
      const berserkSpeedMul = isBerserk ? (1.0 + this.berserkerLevel * 0.50) : 1.0;
      const effSpeed = this.chargeSpeedMul * (this.adrenalineTimer > 0 ? 1.6 : 1.0) * berserkSpeedMul;
      this.chargeTime += dt * effSpeed;
      this.chargeFrac = Math.min(1, this.chargeTime / this.maxCharge);
      this.ragdoll.bowDrawFrac = this.chargeFrac;

      const currentCost = this.getCurrentStaminaCost();

      // Update in-game charge meter and live stamina deduction preview
      const chargeEl = document.getElementById('charge-indicator');
      const fillEl = document.getElementById('charge-fill');
      const staminaTag = document.getElementById('charge-stamina-tag');
      if (chargeEl) {
        chargeEl.classList.remove('hidden');
        const scaleX = window.innerWidth / (this.scene.scale.width || window.innerWidth || 1);
        const scaleY = window.innerHeight / (this.scene.scale.height || window.innerHeight || 1);
        chargeEl.style.left = `${this.x * scaleX}px`;
        chargeEl.style.top = `${(this.y - 78) * scaleY}px`;
      }
      if (fillEl) fillEl.style.width = `${this.chargeFrac * 100}%`;
      if (staminaTag) {
        const canAfford = this.stamina >= currentCost;
        staminaTag.textContent = `⚡ -${currentCost} STAMINA`;
        if (!canAfford) {
          staminaTag.classList.add('danger');
          staminaTag.classList.remove('warn');
        } else if (currentCost > this.stamina * 0.75) {
          staminaTag.classList.add('warn');
          staminaTag.classList.remove('danger');
        } else {
          staminaTag.classList.remove('warn', 'danger');
        }
      }
    } else {
      this.ragdoll.bowDrawFrac = 0;
      const chargeEl = document.getElementById('charge-indicator');
      if (chargeEl) chargeEl.classList.add('hidden');
    }

    // ── Dynamic Jump & Double Jump (Consumes Stamina) ──
    const spaceJustPressed = spacePressed && !this.prevSpace;
    this.prevSpace = spacePressed;

    if (spaceJustPressed && this.jumpsLeft > 0) {
      this.triggerJump();
    }

    if (this.onGround) {
      this.y = deckY;
      if (deckX !== undefined) this.x = deckX;
      this.vy = 0;
      this.jumpsLeft = this.maxJumps;
    } else {
      // Wind Walker Airborne Slow-Mo Matrix Aim
      if (this.windWalkerLevel > 0 && this.isCharging) {
        (this.scene as any).triggerSlowMo?.(0.35, 0.12);
        this.vy += 850 * dt; // Gliding floaty air hang-time
      } else {
        this.vy += 1600 * dt;
      }
      this.y += this.vy * dt;
      if (this.y >= deckY) {
        this.y = deckY;
        if (deckX !== undefined) this.x = deckX;
        this.vy = 0;
        this.onGround = true;
        this.jumpsLeft = this.maxJumps; // Reset double-jump counter on landing
      }
    }

    this.ragdoll.setPosition(this.x, this.y);
  }

  public triggerJump(): void {
    if (this.dead || this.jumpsLeft <= 0) return;
    const isEndlessMode = this.isEndless || (this.scene as any)?.gameMode === 'endless';
    const minJumpStamina = isEndlessMode ? 3 : 4;
    if (this.stamina < minJumpStamina) {
      const sBar = document.getElementById('hud-stamina-p1');
      if (sBar) {
        sBar.classList.add('stamina-warning');
        setTimeout(() => sBar.classList.remove('stamina-warning'), 650);
      }
      (this.scene as any).spawnFloatingText?.('⚠️ LOW STAMINA! CANNOT JUMP', this.x, this.y - 45, '#ff4757', 16);
      return;
    }

    this.stamina = Math.max(0, this.stamina - this.jumpStaminaCost);
    this.staminaRegenDelay = isEndlessMode ? 0.2 : 0.3;
    this.jumpsLeft--;
    const jumpPower = this.windWalkerLevel >= 2 ? -880 : (this.windWalkerLevel === 1 ? -820 : -720);
    this.vy = jumpPower;
    if (!this.onGround) {
      soundFX.playJump();
      (this.scene as any).spawnFloatingText?.(`DOUBLE JUMP! 🪽 (-${this.jumpStaminaCost} ⚡)`, this.x, this.y - 25, '#00d2d3', 16);
      (this.scene as any).shakeScreen?.(4, 0.1);
    } else {
      soundFX.playJump();
      (this.scene as any).spawnFloatingText?.(`-${this.jumpStaminaCost} ⚡ STAMINA`, this.x, this.y - 40, '#f1c40f', 14);
    }
    this.onGround = false;
  }

  public takeDamage(amount: number): void {
    if (this.dead || this.invincible || amount <= 0) return;
    const dr = Math.min(0.80, this.damageReduction || 0);
    const reducedAmount = Math.max(1, amount * (this.armorMul || 1.0) * (1 - dr));
    this.hp = Math.max(0, this.hp - reducedAmount);
    soundFX.playFleshHit(true);

    if ((this.scene as any).onPlayerDamage) {
      (this.scene as any).onPlayerDamage(reducedAmount);
    }

    if (this.hp <= 0) {
      if (this.hasSecondWind && this.secondWindReady) {
        this.secondWindReady = false;
        this.hp = Math.round(this.maxHP * 0.40);
        soundFX.playGemCollect();
        (this.scene as any).spawnFloatingText?.('💨 SECOND WIND REVIVE! +40% HP ❤️', this.x, this.y - 70, '#00d2d3', 24);
        (this.scene as any).shakeScreen?.(10, 0.25);
        (this.scene as any).cameras?.main?.flash?.(300, 0, 210, 211, true);
        return;
      }
      this.hp = 0;
      this.dead = true;
      this.ragdoll.dead = true;
      this.ragdoll.relaxForDeath(-80, -160);
      if ((this.scene as any).onPlayerDeath) {
        (this.scene as any).onPlayerDeath();
      }
    }
  }

  public revive(deckY: number, deckX?: number): void {
    this.dead = false;
    this.hp = Math.round(this.maxHP * 0.5);
    this.stamina = this.maxStamina;
    this.isCharging = false;
    this.chargeFrac = 0;
    this.chargeTime = 0;
    this.cooldown = 0;
    this.vy = 0;
    this.onGround = true;
    this.jumpsLeft = this.maxJumps;
    if (deckX !== undefined) this.x = deckX;
    this.y = deckY;
    this.ragdoll.revive(this.x, this.y);
    this.ragdoll.setPosition(this.x, this.y);
  }

  public render(g: Phaser.GameObjects.Graphics): void {
    this.ragdoll.renderGraphics(g, {
      isHero: true,
      heroSkin: this.currentSkin,
      bowType: this.bowType
    });

    // Overhead Stamina Gauge (Visible whenever stamina is not full or during bow charge)
    if ((this.stamina < this.maxStamina || this.isCharging) && !this.dead) {
      const s = this.ragdoll.scale;
      const barW = 44 * s;
      const barH = 5 * s;
      const bx = this.x - barW / 2;
      const by = this.y - 82 * s;
      const sFrac = Math.max(0, Math.min(1, this.stamina / this.maxStamina));

      // Dark background
      g.fillStyle(0x0a0e17, 0.85);
      g.fillRoundedRect(bx - 1.5, by - 1.5, barW + 3, barH + 3, 2.5);

      if (this.isCharging) {
        const liveCost = this.getCurrentStaminaCost();
        const remFrac = Math.max(0, Math.min(1, (this.stamina - liveCost) / this.maxStamina));

        // Deduction ghost bar in red/orange
        g.fillStyle(0xff4757, 0.7);
        g.fillRoundedRect(bx, by, barW * sFrac, barH, 2);

        // Live remaining stamina fill
        const fillCol = remFrac < 0.25 ? 0xff4757 : (remFrac < 0.5 ? 0xf5af3e : 0xf29a0a);
        g.fillStyle(fillCol, 0.95);
        g.fillRoundedRect(bx, by, barW * remFrac, barH, 2);
      } else {
        // Energy bar fill
        const fillCol = sFrac < 0.25 ? 0xff4757 : (sFrac < 0.5 ? 0xf5af3e : 0xf29a0a);
        g.fillStyle(fillCol, 0.95);
        g.fillRoundedRect(bx, by, barW * sFrac, barH, 2);
      }

      // Border outline
      g.lineStyle(1, 0xffffff, 0.3);
      g.strokeRoundedRect(bx - 1.5, by - 1.5, barW + 3, barH + 3, 2.5);
    }

  }
}
