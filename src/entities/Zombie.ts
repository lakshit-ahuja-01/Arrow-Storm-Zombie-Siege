import Phaser from 'phaser';
import { MatterRagdoll } from '../physics/MatterRagdoll';
import { ZombieType, BowType } from '../types';
import { soundFX } from '../systems/SoundFX';

export interface AttachedArrow {
  part: 'torso' | 'head' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm';
  relX: number;
  relY: number;
  angle: number;
  type: BowType;
  wobble: number;
}

export class Zombie {
  public scene: Phaser.Scene;
  public x: number;
  public y: number;
  public type: ZombieType;
  public ragdoll: MatterRagdoll;

  public maxHP: number;
  public hp: number;
  public speed: number;
  public damage: number;
  public playerDamage: number = 6;
  public zombieLevel: number = 1;
  public scale: number;
  public skullBounty: number;
  public isBloodMoon: boolean = false;
  public inPitchPit: boolean = false;
  public inCaltrops: boolean = false;
  public inSmokeScreen: boolean = false;

  public dead: boolean = false;
  public deadTimer: number = 0;
  public killedByHeadshot: boolean = false;
  public isFrozen: boolean = false;
  public frozenTimer: number = 0;
  public isBurning: boolean = false;
  public burnTimer: number = 0;
  public isPoisoned: boolean = false;
  public poisonTimer: number = 0;
  public poisonDPS: number = 35;
  public hitFlashTimer: number = 0;
  public hitStaggerTimer: number = 0;
  public rewardGiven: boolean = false;
  public drainHp: number = 0;

  public helmet: { hp: number; maxHP: number } | null = null;
  public shield: { hp: number; maxHP: number } | null = null;
  public summonTimer: number = 0;
  public attackTimer: number = 0;
  public legsRemaining: number = 2;
  public isCrawling: boolean = false;
  public isSpitter: boolean = false;
  public isEnraged: boolean = false;
  public waveNum: number = 1;
  public skinColor: string = '#4e6d3c';
  public clothesColor: string = '#353b48';
  public cuts: Array<{ x: number; y: number; angle: number; len: number; bloodDrip: number }> = [];
  public preferredDistance: number = 0;
  public personalTargetOffset: number = 0;
  public groundYOffset: number = 0;

  // Attached arrows stuck in body
  public attachedArrows: AttachedArrow[] = [];
  public isDying: boolean = false;
  public deathDelayTimer: number = 0;
  public pendingDeathImpX: number = 0;
  public pendingDeathImpY: number = 0;
  public pendingHitArea?: 'head' | 'torso' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm';
  public lastHitArrowType: BowType = 'normal';
  public isShocked: boolean = false;
  public shockTimer: number = 0;
  public weakenedAttackTimer: number = 0;

  // Archetype Special Behaviors
  public isCharging: boolean = false;
  public chargeTimer: number = 0;
  public teleportCooldown: number = 0;
  public meteorTimer: number = 0;
  public summonMinionTimer: number = 0;
  public berserkerLeapTimer: number = 0;
  public berserkerChopPhase: number = 0;

  // Tier 16-20 Archetype Powers
  public isFrenzied: boolean = false;
  public frenzyBuffTimer: number = 0;
  public frenzyScreamTimer: number = 0;
  public cleaverTimer: number = 0;
  public clusterTimer: number = 0;
  public riftSlashTimer: number = 0;
  public malakorMeteorTimer: number = 0;
  public malakorSummonTimer: number = 0;
  public malakorStompTimer: number = 0;
  public malakorAttackPhase: number = 0;
  public malakorCleaving: boolean = false;
  public malakorHalberdTip: { x: number; y: number } = { x: 0, y: 0 };

  // Elemental & Special Status Effect States
  public isHolySmitten: boolean = false;
  public holySmiteTimer: number = 0;
  public isSeekerLocked: boolean = false;
  public seekerLockTimer: number = 0;
  public isBlastedCharred: boolean = false;
  public charredTimer: number = 0;
  public isHarpoonStruck: boolean = false;
  public harpoonStruckTimer: number = 0;

  public addAttachedArrow(part: 'torso' | 'head' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm', worldX: number, worldY: number, angle: number, type: BowType): void {
    if (this.attachedArrows.length >= 8) this.attachedArrows.shift();
    let refX = this.x;
    let refY = this.y - 32 * this.scale;
    if (part === 'head' && this.ragdoll.head) {
      refX = this.ragdoll.head.position.x;
      refY = this.ragdoll.head.position.y;
    } else if (part === 'leftLeg' && this.ragdoll.leftThigh) {
      refX = this.ragdoll.leftThigh.position.x;
      refY = this.ragdoll.leftThigh.position.y;
    } else if (part === 'rightLeg' && this.ragdoll.rightThigh) {
      refX = this.ragdoll.rightThigh.position.x;
      refY = this.ragdoll.rightThigh.position.y;
    } else if (this.ragdoll.torso) {
      refX = this.ragdoll.torso.position.x;
      refY = this.ragdoll.torso.position.y;
    }
    this.attachedArrows.push({
      part,
      relX: worldX - refX,
      relY: worldY - refY,
      angle,
      type,
      wobble: 0.35
    });
  }

  public addCut(x: number, y: number, angle: number, len: number = 18): void {
    if (this.cuts.length > 8) this.cuts.shift();
    const torsoX = this.ragdoll.hasTorso && this.ragdoll.torso ? this.ragdoll.torso.position.x : this.x;
    const torsoY = this.ragdoll.hasTorso && this.ragdoll.torso ? this.ragdoll.torso.position.y : this.y - 32 * this.scale;
    this.cuts.push({
      x: x - torsoX,
      y: y - torsoY,
      angle,
      len,
      bloodDrip: 6 + Math.random() * 8
    });
  }

  public static isAirAttackType(type: ZombieType): boolean {
    return (
      type === 'bloater' ||
      type === 'skeleton' ||
      type === 'necromancer' ||
      type === 'frostwight' ||
      type === 'phantom' ||
      type === 'pyro' ||
      type === 'stalker' ||
      type === 'siren' ||
      type === 'harvester' ||
      type === 'slobber'
    );
  }

  public isAirAttacker(): boolean {
    return this.isSpitter || Zombie.isAirAttackType(this.type);
  }

  public static getGroundFallback(wave: number): ZombieType {
    const r = Math.random();
    if (wave <= 2) return r < 0.5 ? 'walker' : 'crawler';
    if (wave <= 4) return r < 0.4 ? 'buckethead' : (r < 0.7 ? 'crawler' : 'walker');
    if (wave <= 7) return r < 0.35 ? 'centurion' : (r < 0.7 ? 'buckethead' : 'crawler');
    if (wave <= 10) return r < 0.35 ? 'berserker' : (r < 0.7 ? 'centurion' : 'buckethead');
    if (wave <= 14) return r < 0.25 ? 'juggernaut' : (r < 0.52 ? 'berserker' : (r < 0.76 ? 'centurion' : 'buckethead'));
    if (wave <= 19) return r < 0.12 ? 'voidknight' : (r < 0.34 ? 'juggernaut' : (r < 0.58 ? 'berserker' : (r < 0.78 ? 'centurion' : 'buckethead')));
    // Wave 20+ / Endless:
    if (r < 0.14) return 'voidknight';
    if (r < 0.36) return 'juggernaut';
    if (r < 0.60) return 'berserker';
    return r < 0.80 ? 'centurion' : 'buckethead';
  }

  constructor(scene: Phaser.Scene, x: number, waveNum: number, forceType?: ZombieType) {
    this.scene = scene;
    this.x = x;
    this.waveNum = waveNum;
    
    // Natural battlefield fanning & visual depth offsets (prevents 1D stacking)
    this.personalTargetOffset = (Math.random() - 0.5) * 80;
    this.groundYOffset = (Math.random() - 0.5) * 16;
    this.y = (scene.cameras.main.height * 0.72) + this.groundYOffset;

    let chosenType = forceType || this.pickType(waveNum);

    // Enforce active air-attack zombie limits per level:
    const activeAirCount = ((scene as any).zombies || []).filter(
      (z: Zombie) => !z.dead && z.isAirAttacker()
    ).length;
    const maxAir = (scene as any).getMaxAirAttackers ? (scene as any).getMaxAirAttackers(waveNum) : 2;

    if (!forceType && Zombie.isAirAttackType(chosenType)) {
      if (activeAirCount >= maxAir) {
        chosenType = Zombie.getGroundFallback(waveNum);
      }
    }

    this.type = chosenType;

    const stats = this.getStats();

    // Bloaters are natural spitters; walkers have a 12% chance if under air attacker limit
    const canWalkerSpit = waveNum >= 3 && activeAirCount < maxAir && Math.random() < 0.12;
    this.isSpitter = this.type === 'bloater' || (this.type === 'walker' && canWalkerSpit);
    if (this.isSpitter && this.type === 'walker') {
      stats.skin = '#38ef7d';
    }

    this.scale = stats.scale;
    this.skinColor = stats.skin;
    this.clothesColor = stats.clothes;
    this.maxHP = this.hp = this.drainHp = stats.hp;
    this.isBloodMoon = !!(scene as any).isBloodMoon?.();
    // Slight organic speed variance so zombies don't march in identical lockstep
    this.speed = stats.speed * (this.isBloodMoon ? 1.20 : 1.0) * (0.88 + Math.random() * 0.24);
    this.damage = stats.damage;
    this.playerDamage = stats.playerDamage;
    this.zombieLevel = stats.level;
    this.skullBounty = stats.bounty;
    this.helmet = stats.hasHelmet ? { hp: stats.helmetHP || 50, maxHP: stats.helmetHP || 50 } : null;
    this.shield = stats.hasShield ? { hp: stats.shieldHP || 75, maxHP: stats.shieldHP || 75 } : null;

    // Initial attack timer & preferred sniping distance for ranged foes:
    const isEndless = (this.scene as any)?.gameMode === 'endless';
    if (isEndless) {
      // Original attack timers for Endless Mode
      if (this.type === 'skeleton') {
        this.preferredDistance = 480 + Math.random() * 260; // 480px to 740px back
        this.summonTimer = 1.8 + Math.random() * 1.4;
      } else if (this.type === 'frostwight') {
        this.preferredDistance = 420 + Math.random() * 200; // 420px to 620px back
        this.summonTimer = 2.0 + Math.random() * 1.5;
      } else if (this.type === 'pyro') {
        this.preferredDistance = 580 + Math.random() * 200; // 580px to 780px back (long-distance mortar)
        this.summonTimer = 2.0 + Math.random() * 1.5;
      } else if (this.type === 'stalker') {
        this.preferredDistance = 580 + Math.random() * 180; // 580px to 760px back (long-distance siege bomber)
        this.summonTimer = 2.4 + Math.random() * 1.4;
      } else if (this.type === 'phantom') {
        this.preferredDistance = 350 + Math.random() * 160;
        this.summonTimer = 1.8 + Math.random() * 1.2;
        this.teleportCooldown = 2.0;
      } else if (this.type === 'reaper') {
        this.preferredDistance = 330;
        this.meteorTimer = 3.5;
        this.summonMinionTimer = 5.5;
        this.summonTimer = 2.2;
      } else if (this.type === 'siren') {
        this.preferredDistance = 340 + Math.random() * 140;
        this.summonTimer = 2.2 + Math.random() * 1.0;
        this.frenzyScreamTimer = 4.0 + Math.random() * 2.0;
      } else if (this.type === 'harvester') {
        this.preferredDistance = 280 + Math.random() * 120;
        this.cleaverTimer = 2.0 + Math.random() * 1.2;
      } else if (this.type === 'slobber') {
        this.preferredDistance = 540 + Math.random() * 180; // 540px to 720px back (siege lob)
        this.clusterTimer = 2.4 + Math.random() * 1.4;
      } else if (this.type === 'voidknight') {
        this.preferredDistance = 320 + Math.random() * 120;
        this.riftSlashTimer = 4.5 + Math.random() * 2.5;
        this.teleportCooldown = 2.5;
      } else if (this.type === 'malakor') {
        this.preferredDistance = 140; // Aggressive advance close to barricade
        this.malakorMeteorTimer = 3.0;
        this.malakorSummonTimer = 6.0;
        this.malakorStompTimer = 3.8;
        this.summonTimer = 2.0;
      } else {
        this.summonTimer = Math.max(2.4, 5.2 - waveNum * 0.4) + Math.random() * 2.0;
      }
    } else {
      // Calibrated reaction window for Campaign Mode
      if (this.type === 'skeleton') {
        this.preferredDistance = 480 + Math.random() * 260; // 480px to 740px back
        this.summonTimer = 2.4 + Math.random() * 1.6;
      } else if (this.type === 'frostwight') {
        this.preferredDistance = 420 + Math.random() * 200; // 420px to 620px back
        this.summonTimer = 2.6 + Math.random() * 1.6;
      } else if (this.type === 'pyro') {
        this.preferredDistance = 580 + Math.random() * 200; // 580px to 780px back (long-distance mortar)
        this.summonTimer = 2.6 + Math.random() * 1.6;
      } else if (this.type === 'stalker') {
        this.preferredDistance = 580 + Math.random() * 180; // 580px to 760px back (long-distance siege bomber)
        this.summonTimer = 3.0 + Math.random() * 1.5;
      } else if (this.type === 'phantom') {
        this.preferredDistance = 350 + Math.random() * 160;
        this.summonTimer = 2.4 + Math.random() * 1.4;
        this.teleportCooldown = 2.8;
      } else if (this.type === 'reaper') {
        this.preferredDistance = 330;
        this.meteorTimer = 4.5;
        this.summonMinionTimer = 7.0;
        this.summonTimer = 2.8;
      } else if (this.type === 'siren') {
        this.preferredDistance = 340 + Math.random() * 140;
        this.summonTimer = 2.8 + Math.random() * 1.2;
        this.frenzyScreamTimer = 5.2 + Math.random() * 2.0;
      } else if (this.type === 'harvester') {
        this.preferredDistance = 280 + Math.random() * 120;
        this.cleaverTimer = 2.6 + Math.random() * 1.4;
      } else if (this.type === 'slobber') {
        this.preferredDistance = 540 + Math.random() * 180; // 540px to 720px back (siege lob)
        this.clusterTimer = 3.2 + Math.random() * 1.6;
      } else if (this.type === 'voidknight') {
        this.preferredDistance = 320 + Math.random() * 120;
        this.riftSlashTimer = 5.2 + Math.random() * 2.5;
        this.teleportCooldown = 3.2;
      } else if (this.type === 'malakor') {
        this.preferredDistance = 140; // Aggressive advance close to barricade
        this.malakorMeteorTimer = 3.8;
        this.malakorSummonTimer = 7.5;
        this.malakorStompTimer = 4.2;
        this.summonTimer = 2.5;
      } else {
        this.summonTimer = Math.max(3.0, 5.8 - waveNum * 0.35) + Math.random() * 2.0;
      }
    }

    this.ragdoll = new MatterRagdoll(scene, x, this.y, {
      scale: this.scale,
      isZombie: true,
      zombieType: this.type,
      skinColor: stats.skin,
      clothesColor: stats.clothes,
      isBloodMoon: this.isBloodMoon
    });
    this.ragdoll.faceDir = -1;
  }

  public pickType(wave: number): ZombieType {
    if (wave === 1) return 'walker';

    const r = Math.random();
    if (wave === 2) {
      return r < 0.45 ? 'crawler' : 'walker';
    }
    if (wave === 3) {
      if (r < 0.45) return 'buckethead';
      if (r < 0.75) return 'crawler';
      return 'walker';
    }
    if (wave === 4) {
      if (r < 0.32) return 'bloater';
      if (r < 0.68) return 'buckethead';
      return 'crawler';
    }
    if (wave === 5) {
      if (r < 0.28) return 'skeleton';
      if (r < 0.42) return 'bloater';
      if (r < 0.72) return 'buckethead';
      return 'crawler';
    }
    if (wave === 6) {
      if (r < 0.24) return 'necromancer';
      if (r < 0.38) return 'skeleton';
      if (r < 0.68) return 'buckethead';
      if (r < 0.86) return 'crawler';
      return 'walker';
    }
    if (wave === 7) {
      if (r < 0.38) return 'centurion';
      if (r < 0.66) return 'buckethead';
      if (r < 0.84) return 'necromancer';
      return 'skeleton';
    }
    if (wave === 8) {
      if (r < 0.40) return 'berserker';
      if (r < 0.68) return 'centurion';
      if (r < 0.85) return 'necromancer';
      return 'skeleton';
    }
    if (wave === 9) {
      if (r < 0.28) return 'frostwight';
      if (r < 0.60) return 'berserker';
      if (r < 0.80) return 'centurion';
      return 'buckethead';
    }
    if (wave === 10) {
      // Wave 10 Minion Horde (Supporting the single Gargantuar Titan Mid-Boss)
      if (r < 0.18) return 'frostwight';
      if (r < 0.45) return 'berserker';
      if (r < 0.72) return 'centurion';
      if (r < 0.90) return 'buckethead';
      return 'crawler';
    }
    if (wave === 11) {
      if (r < 0.28) return 'phantom';
      if (r < 0.60) return 'berserker';
      if (r < 0.80) return 'centurion';
      return 'buckethead';
    }
    if (wave === 12) {
      if (r < 0.28) return 'pyro';
      if (r < 0.58) return 'berserker';
      if (r < 0.78) return 'centurion';
      return 'phantom';
    }
    if (wave === 13) {
      if (r < 0.28) return 'stalker';
      if (r < 0.58) return 'berserker';
      if (r < 0.78) return 'centurion';
      return 'pyro';
    }
    if (wave === 14) {
      if (r < 0.22) return 'juggernaut';
      if (r < 0.44) return 'berserker';
      if (r < 0.64) return 'stalker';
      if (r < 0.82) return 'centurion';
      return 'buckethead';
    }
    if (wave === 15) {
      // Wave 15 Minion Horde (Supporting the 3 Abyssal Lich King Titans)
      if (r < 0.24) return 'stalker';
      if (r < 0.48) return 'berserker';
      if (r < 0.70) return 'centurion';
      if (r < 0.85) return 'phantom';
      return 'buckethead';
    }
    if (wave === 16) {
      if (r < 0.22) return 'siren';
      if (r < 0.44) return 'juggernaut';
      if (r < 0.64) return 'berserker';
      if (r < 0.82) return 'centurion';
      return 'buckethead';
    }
    if (wave === 17) {
      if (r < 0.22) return 'harvester';
      if (r < 0.44) return 'juggernaut';
      if (r < 0.64) return 'berserker';
      if (r < 0.82) return 'centurion';
      return 'crawler';
    }
    if (wave === 18) {
      if (r < 0.22) return 'slobber';
      if (r < 0.44) return 'juggernaut';
      if (r < 0.64) return 'berserker';
      if (r < 0.82) return 'centurion';
      return 'buckethead';
    }
    if (wave === 19) {
      if (r < 0.14) return 'voidknight'; // Noticeably reduced from 0.38 to 0.14
      if (r < 0.34) return 'juggernaut';
      if (r < 0.54) return 'berserker';
      if (r < 0.72) return 'centurion';
      if (r < 0.86) return 'harvester';
      return 'buckethead';
    }
    if (wave === 20) {
      // Wave 20 Minion Horde (Supporting the 5 Apex God Titans)
      if (r < 0.14) return 'voidknight'; // Noticeably reduced from 0.35 to 0.14
      if (r < 0.36) return 'berserker';
      if (r < 0.56) return 'harvester';
      if (r < 0.76) return 'centurion';
      if (r < 0.88) return 'juggernaut';
      return 'crawler';
    }

    // Endless Mode (Wave 21+): 68% ground, 32% air
    if (wave > 20) {
      if (wave % 5 === 0) {
        // High-threat elite guard supporting the endless apex boss titans
        const rEnd = Math.random();
        if (rEnd < 0.15) return 'voidknight'; // Reduced from 0.35 to 0.15
        if (rEnd < 0.42) return 'berserker';
        if (rEnd < 0.68) return 'harvester';
        if (rEnd < 0.86) return 'centurion';
        return 'buckethead';
      }

      // Ground enemies have 2x greater presence:
      const groundPool: ZombieType[] = [
        'walker', 'crawler', 'buckethead', 'centurion', 'berserker', 'juggernaut', 'voidknight'
      ];
      const airPool: ZombieType[] = [
        'bloater', 'skeleton', 'necromancer', 'frostwight', 'phantom', 'pyro', 'stalker', 'siren', 'harvester', 'slobber'
      ];

      if (Math.random() < 0.68) {
        return groundPool[Math.floor(Math.random() * groundPool.length)];
      } else {
        return airPool[Math.floor(Math.random() * airPool.length)];
      }
    }

    const groundPool: ZombieType[] = [
      'walker', 'crawler', 'buckethead', 'centurion', 'berserker', 'juggernaut', 'voidknight'
    ];
    return groundPool[Math.floor(Math.random() * groundPool.length)];
  }

  public getStats() {
    let stats: {
      hp: number;
      speed: number;
      damage: number;
      playerDamage: number;
      level: number;
      scale: number;
      hasHelmet?: boolean;
      helmetHP?: number;
      hasShield?: boolean;
      shieldHP?: number;
      skin: string;
      clothes: string;
      bounty: number;
    };

    const isEndless = (this.scene as any)?.gameMode === 'endless';

    if (isEndless) {
      // ══════════════════════════════════════════════════════════
      // ORIGINAL ENDLESS MODE STATS (Unnerfed, True Challenge)
      // ══════════════════════════════════════════════════════════
      switch (this.type) {
        case 'walker':
          // Level 1: Rotten Shambler - Shambling walker with solid undead flesh
          stats = { hp: 68, speed: 75, damage: 8, playerDamage: 6, level: 1, scale: 1.0, hasHelmet: false, skin: '#4e6d3c', clothes: '#353b48', bounty: 6 };
          break;
        case 'crawler':
          // Level 2: Feral Crawler - Fast low quadrupeds
          stats = { hp: 78, speed: 155, damage: 12, playerDamage: 9, level: 2, scale: 0.88, hasHelmet: false, skin: '#8e44ad', clothes: '#2c3e50', bounty: 10 };
          break;
        case 'buckethead':
          // Level 3: Armored Buckethead - Deflects headshots with heavy bucket
          stats = { hp: 110, speed: 80, damage: 16, playerDamage: 12, level: 3, scale: 1.05, hasHelmet: true, helmetHP: 50, skin: '#4e6d3c', clothes: '#2c3e50', bounty: 16 };
          break;
        case 'bloater':
          // Level 4: Volatile Bloater - High HP toxic acid spitter & suicide explosion
          stats = { hp: 180, speed: 60, damage: 22, playerDamage: 15, level: 4, scale: 1.35, hasHelmet: false, skin: '#5a8234', clothes: '#3e2723', bounty: 22 };
          break;
        case 'skeleton':
          // Level 5: Crypt Skeleton Archer - Ranged bone arrows
          stats = { hp: 90, speed: 70, damage: 14, playerDamage: 12, level: 5, scale: 0.96, hasHelmet: false, skin: '#ecf0f1', clothes: '#2c3e50', bounty: 26 };
          break;
        case 'necromancer':
          // Level 6: Dark Necromancer - Shadow skulls & summons
          stats = { hp: 160, speed: 50, damage: 20, playerDamage: 16, level: 6, scale: 1.08, hasHelmet: false, skin: '#2c3e50', clothes: '#8e44ad', bounty: 35 };
          break;
        case 'centurion':
          // Level 7: Shielded Centurion - Frontal iron tower shield
          stats = { hp: 150, speed: 65, damage: 24, playerDamage: 18, level: 7, scale: 1.10, hasShield: true, shieldHP: 75, skin: '#4e6d3c', clothes: '#7f8c8d', bounty: 38 };
          break;
        case 'berserker':
          // Level 8: Cleaver Berserker - Dual cleavers, blood rage
          stats = { hp: 195, speed: 95, damage: 30, playerDamage: 22, level: 8, scale: 1.15, hasHelmet: false, skin: '#c0392b', clothes: '#1e272e', bounty: 42 };
          break;
        case 'frostwight':
          // Level 9: Cryo Wight - Frost aura, immune to freeze, ice shards
          stats = { hp: 220, speed: 68, damage: 28, playerDamage: 20, level: 9, scale: 1.12, hasHelmet: false, skin: '#74b9ff', clothes: '#0984e3', bounty: 48 };
          break;
        case 'boss':
          // Level 10: Gargantuar Titan - Colossal mid-boss titan
          stats = { hp: 1350, speed: 48, damage: 60, playerDamage: 38, level: 10, scale: 2.2, hasHelmet: true, helmetHP: 75, skin: '#2d3436', clothes: '#000000', bounty: 150 };
          break;
        case 'phantom':
          // Level 11: Phantom Wraith - Ethereal, phase blinks, sonic screech wave
          stats = { hp: 180, speed: 88, damage: 28, playerDamage: 22, level: 11, scale: 1.05, hasHelmet: false, skin: '#a29bfe', clothes: '#6c5ce7', bounty: 55 };
          break;
        case 'pyro':
          // Level 12: Infernal Immolator - Molten firebomber, immune to fire, death blast
          stats = { hp: 240, speed: 65, damage: 35, playerDamage: 25, level: 12, scale: 1.15, hasHelmet: false, skin: '#e17055', clothes: '#2d3436', bounty: 65 };
          break;
        case 'stalker':
          // Level 13: Shadow Stalker - Ultra agile leaping mantis, razor blades
          stats = { hp: 200, speed: 175, damage: 38, playerDamage: 28, level: 13, scale: 0.95, hasHelmet: false, skin: '#2c3e50', clothes: '#c0392b', bounty: 75 };
          break;
        case 'juggernaut':
          // Level 14: Dread Juggernaut - Ironclad siege breaker, ram charge, 50% body armor
          stats = { hp: 580, speed: 52, damage: 52, playerDamage: 35, level: 14, scale: 1.45, hasHelmet: true, helmetHP: 60, hasShield: true, shieldHP: 90, skin: '#636e72', clothes: '#2f3542', bounty: 120 };
          break;
        case 'reaper':
          // Level 15: Abyssal Lich King - Void Sovereign Boss, void meteors, summons, scythe
          stats = { hp: 2400, speed: 42, damage: 85, playerDamage: 55, level: 15, scale: 2.3, hasHelmet: true, helmetHP: 120, skin: '#1e272e', clothes: '#3c40c6', bounty: 350 };
          break;
        case 'siren':
          // Level 16: Corpse Siren Banshee - Ultrasonic shrieks, stamina drain, and Horde Frenzy aura
          stats = { hp: 320, speed: 96, damage: 34, playerDamage: 24, level: 16, scale: 1.05, hasHelmet: false, skin: '#81ecec', clothes: '#2d3436', bounty: 85 };
          break;
        case 'harvester':
          // Level 17: Plague Harvester Butcher - Dual executioner cleavers, Soul Leech heal
          stats = { hp: 460, speed: 82, damage: 46, playerDamage: 32, level: 17, scale: 1.25, hasHelmet: true, helmetHP: 80, skin: '#d63031', clothes: '#1e272e', bounty: 105 };
          break;
        case 'slobber':
          // Level 18: Caustic Acid Slobber - Rubbery blubber (45% arrow resist), caustic cluster bombs, toxic death cloud
          stats = { hp: 720, speed: 56, damage: 56, playerDamage: 36, level: 18, scale: 1.55, hasHelmet: false, skin: '#00b894', clothes: '#2d3436', bounty: 135 };
          break;
        case 'voidknight':
          // Level 19: Void Revenant Warmaster - Runic ward shield, phase blink, abyssal rift slashes
          stats = { hp: 950, speed: 76, damage: 70, playerDamage: 42, level: 19, scale: 1.38, hasHelmet: true, helmetHP: 100, hasShield: true, shieldHP: 120, skin: '#2d3436', clothes: '#6c5ce7', bounty: 190 };
          break;
        case 'malakor':
          // Level 20: Malakor Eldritch Dragon Titan - Grand Apex God Boss, 4200 HP, cataclysmic void meteors, summons, titan stomp
          stats = { hp: 4200, speed: 40, damage: 110, playerDamage: 65, level: 20, scale: 2.7, hasHelmet: true, helmetHP: 200, skin: '#0a0a0a', clothes: '#800020', bounty: 600 };
          break;
        default:
          stats = { hp: 68, speed: 80, damage: 10, playerDamage: 6, level: 1, scale: 1.0, hasHelmet: false, skin: '#4e6d3c', clothes: '#353b48', bounty: 6 };
      }

      // Endless Mode Scaling (Wave 21+)
      if (this.waveNum > 20) {
        const mul = 1 + (this.waveNum - 20) * 0.16;
        stats.hp = Math.round(stats.hp * mul);
        stats.damage = Math.round(stats.damage * (1 + (this.waveNum - 20) * 0.10));
        stats.playerDamage = Math.round(stats.playerDamage * (1 + (this.waveNum - 20) * 0.10));
        stats.bounty = Math.round(stats.bounty * (1 + (this.waveNum - 20) * 0.12));

        // Endless mode: Zombie size increases dynamically with their strength!
        const strengthFactor = Math.min(1.85, 1 + (this.waveNum - 20) * 0.032);
        stats.scale = Number((stats.scale * strengthFactor).toFixed(2));

        // Milestone Boss Night Scaling (Waves 30, 40, 50, 60...):
        if (this.waveNum % 10 === 0 && (this.type === 'boss' || this.type === 'reaper' || this.type === 'malakor')) {
          const bossTier = Math.floor(this.waveNum / 10);
          stats.hp = Math.round(stats.hp * (1 + (bossTier - 2) * 0.22));
          stats.damage = Math.round(stats.damage * (1 + (bossTier - 2) * 0.12));
          stats.playerDamage = Math.round(stats.playerDamage * (1 + (bossTier - 2) * 0.10));
          stats.bounty = Math.round(stats.bounty * (1 + (bossTier - 2) * 0.35));

          // Colossal Titan Boss scale
          const bossTitanGrowth = Math.min(1.55, 1 + (bossTier - 2) * 0.14);
          stats.scale = Number(Math.min(3.6, stats.scale * bossTitanGrowth).toFixed(2));
        }
      }
    } else {
      // ══════════════════════════════════════════════════════════
      // CAMPAIGN MODE STATS (Calibrated Slightly Less Punishing)
      // ══════════════════════════════════════════════════════════
      switch (this.type) {
        case 'walker':
          // Level 1: Rotten Shambler - Shambling walker with solid undead flesh
          stats = { hp: 54, speed: 68, damage: 6, playerDamage: 5, level: 1, scale: 1.0, hasHelmet: false, skin: '#4e6d3c', clothes: '#353b48', bounty: 6 };
          break;
        case 'crawler':
          // Level 2: Feral Crawler - Fast low quadrupeds
          stats = { hp: 62, speed: 135, damage: 9, playerDamage: 7, level: 2, scale: 0.88, hasHelmet: false, skin: '#8e44ad', clothes: '#2c3e50', bounty: 10 };
          break;
        case 'buckethead':
          // Level 3: Armored Buckethead - Deflects headshots with heavy bucket
          stats = { hp: 88, speed: 72, damage: 12, playerDamage: 9, level: 3, scale: 1.05, hasHelmet: true, helmetHP: 40, skin: '#4e6d3c', clothes: '#2c3e50', bounty: 16 };
          break;
        case 'bloater':
          // Level 4: Volatile Bloater - High HP toxic acid spitter & suicide explosion
          stats = { hp: 145, speed: 54, damage: 16, playerDamage: 11, level: 4, scale: 1.35, hasHelmet: false, skin: '#5a8234', clothes: '#3e2723', bounty: 22 };
          break;
        case 'skeleton':
          // Level 5: Crypt Skeleton Archer - Ranged bone arrows
          stats = { hp: 72, speed: 64, damage: 11, playerDamage: 9, level: 5, scale: 0.96, hasHelmet: false, skin: '#ecf0f1', clothes: '#2c3e50', bounty: 26 };
          break;
        case 'necromancer':
          // Level 6: Dark Necromancer - Shadow skulls & summons
          stats = { hp: 130, speed: 48, damage: 15, playerDamage: 12, level: 6, scale: 1.08, hasHelmet: false, skin: '#2c3e50', clothes: '#8e44ad', bounty: 35 };
          break;
        case 'centurion':
          // Level 7: Shielded Centurion - Frontal iron tower shield
          stats = { hp: 120, speed: 60, damage: 18, playerDamage: 13, level: 7, scale: 1.10, hasShield: true, shieldHP: 60, skin: '#4e6d3c', clothes: '#7f8c8d', bounty: 38 };
          break;
        case 'berserker':
          // Level 8: Cleaver Berserker - Dual cleavers, blood rage
          stats = { hp: 155, speed: 86, damage: 22, playerDamage: 16, level: 8, scale: 1.15, hasHelmet: false, skin: '#c0392b', clothes: '#1e272e', bounty: 42 };
          break;
        case 'frostwight':
          // Level 9: Cryo Wight - Frost aura, immune to freeze, ice shards
          stats = { hp: 175, speed: 64, damage: 21, playerDamage: 15, level: 9, scale: 1.12, hasHelmet: false, skin: '#74b9ff', clothes: '#0984e3', bounty: 48 };
          break;
        case 'boss':
          // Level 10: Gargantuar Titan - Colossal mid-boss titan
          stats = { hp: 1050, speed: 44, damage: 45, playerDamage: 26, level: 10, scale: 2.2, hasHelmet: true, helmetHP: 60, skin: '#2d3436', clothes: '#000000', bounty: 150 };
          break;
        case 'phantom':
          // Level 11: Phantom Wraith - Ethereal, phase blinks, sonic screech wave
          stats = { hp: 145, speed: 82, damage: 21, playerDamage: 16, level: 11, scale: 1.05, hasHelmet: false, skin: '#a29bfe', clothes: '#6c5ce7', bounty: 55 };
          break;
        case 'pyro':
          // Level 12: Infernal Immolator - Molten firebomber, immune to fire, death blast
          stats = { hp: 190, speed: 60, damage: 25, playerDamage: 18, level: 12, scale: 1.15, hasHelmet: false, skin: '#e17055', clothes: '#2d3436', bounty: 65 };
          break;
        case 'stalker':
          // Level 13: Shadow Stalker - Ultra agile leaping mantis, razor blades
          stats = { hp: 160, speed: 148, damage: 28, playerDamage: 20, level: 13, scale: 0.95, hasHelmet: false, skin: '#2c3e50', clothes: '#c0392b', bounty: 75 };
          break;
        case 'juggernaut':
          // Level 14: Dread Juggernaut - Ironclad siege breaker, ram charge, 50% body armor
          stats = { hp: 460, speed: 48, damage: 38, playerDamage: 25, level: 14, scale: 1.45, hasHelmet: true, helmetHP: 48, hasShield: true, shieldHP: 70, skin: '#636e72', clothes: '#2f3542', bounty: 120 };
          break;
        case 'reaper':
          // Level 15: Abyssal Lich King - Void Sovereign Boss, void meteors, summons, scythe
          stats = { hp: 1850, speed: 38, damage: 60, playerDamage: 38, level: 15, scale: 2.3, hasHelmet: true, helmetHP: 90, skin: '#1e272e', clothes: '#3c40c6', bounty: 350 };
          break;
        case 'siren':
          // Level 16: Corpse Siren Banshee - Ultrasonic shrieks, stamina drain, and Horde Frenzy aura
          stats = { hp: 250, speed: 86, damage: 24, playerDamage: 17, level: 16, scale: 1.05, hasHelmet: false, skin: '#81ecec', clothes: '#2d3436', bounty: 85 };
          break;
        case 'harvester':
          // Level 17: Plague Harvester Butcher - Dual executioner cleavers, Soul Leech heal
          stats = { hp: 360, speed: 76, damage: 32, playerDamage: 22, level: 17, scale: 1.25, hasHelmet: true, helmetHP: 60, skin: '#d63031', clothes: '#1e272e', bounty: 105 };
          break;
        case 'slobber':
          // Level 18: Caustic Acid Slobber - Rubbery blubber (45% arrow resist), caustic cluster bombs, toxic death cloud
          stats = { hp: 560, speed: 52, damage: 40, playerDamage: 25, level: 18, scale: 1.55, hasHelmet: false, skin: '#00b894', clothes: '#2d3436', bounty: 135 };
          break;
        case 'voidknight':
          // Level 19: Void Revenant Warmaster - Runic ward shield, phase blink, abyssal rift slashes
          stats = { hp: 740, speed: 70, damage: 48, playerDamage: 28, level: 19, scale: 1.38, hasHelmet: true, helmetHP: 80, hasShield: true, shieldHP: 90, skin: '#2d3436', clothes: '#6c5ce7', bounty: 190 };
          break;
        case 'malakor':
          // Level 20: Malakor Eldritch Dragon Titan - Grand Apex God Boss, 3200 HP, cataclysmic void meteors, summons, titan stomp
          stats = { hp: 3200, speed: 36, damage: 75, playerDamage: 42, level: 20, scale: 2.7, hasHelmet: true, helmetHP: 150, skin: '#0a0a0a', clothes: '#800020', bounty: 600 };
          break;
        default:
          stats = { hp: 54, speed: 72, damage: 7, playerDamage: 5, level: 1, scale: 1.0, hasHelmet: false, skin: '#4e6d3c', clothes: '#353b48', bounty: 6 };
      }
    }

    return stats;
  }

  public update(dt: number, tower: any, allZombies?: Zombie[]): void {
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    if (this.hitStaggerTimer > 0) this.hitStaggerTimer -= dt;

    // Smooth damage ghost drain lag
    if (this.drainHp === undefined) this.drainHp = this.hp;
    if (this.drainHp > this.hp) {
      this.drainHp = Math.max(this.hp, this.drainHp - (this.maxHP * 0.75 + 15) * dt);
    } else {
      this.drainHp = this.hp;
    }

    // Attached arrow wobble decay
    for (const arr of this.attachedArrows) {
      if (arr.wobble > 0) arr.wobble -= dt;
    }

    if (this.shockTimer > 0) {
      this.shockTimer -= dt;
      if (this.shockTimer <= 0) this.isShocked = false;
    }

    // Death delay phase on fatal body hit: showcase the arrow effect on the body, then shatter/collapse!
    if (this.isDying && !this.dead) {
      this.deathDelayTimer -= dt;
      if (this.deathDelayTimer <= 0) {
        this.die(this.pendingDeathImpX, this.pendingDeathImpY, false, this.pendingHitArea);
      }
      return;
    }

    if (this.dead) {
      this.deadTimer += dt;

      // Safety ground clamp so no ragdoll body part tunnels through terrain (including severed limbs/heads)
      const gy = tower?.groundY || (this.scene.cameras.main.height * 0.72);
      const parts = [
        this.ragdoll.head,
        this.ragdoll.torso,
        this.ragdoll.leftUpperArm,
        this.ragdoll.leftForearm,
        this.ragdoll.rightUpperArm,
        this.ragdoll.rightForearm,
        this.ragdoll.leftThigh,
        this.ragdoll.leftCalf,
        this.ragdoll.rightThigh,
        this.ragdoll.rightCalf
      ].filter(Boolean) as MatterJS.BodyType[];

      for (const p of parts) {
        if (p.position.y > gy + 6) {
          this.scene.matter.body.setPosition(p, { x: p.position.x, y: gy + 6 });
          this.scene.matter.body.setVelocity(p, { x: p.velocity.x * 0.8, y: 0 });
        }
      }

      if (this.isFrozen) {
        if (this.frozenTimer > 0) {
          this.frozenTimer -= dt;
          if (this.frozenTimer <= 0) this.isFrozen = false;
        }
        for (const p of parts) {
          this.scene.matter.body.setVelocity(p, { x: p.velocity.x * 0.5, y: Math.min(p.velocity.y, 2) });
        }
      }

      if (this.isPoisoned && this.poisonTimer > 0) {
        this.poisonTimer -= dt;
        if (this.poisonTimer <= 0) this.isPoisoned = false;
      }
      if (this.isBurning && this.burnTimer > 0) {
        this.burnTimer -= dt;
        if (this.burnTimer <= 0) this.isBurning = false;
      }
      if (this.isHolySmitten && this.holySmiteTimer > 0) {
        this.holySmiteTimer -= dt;
        if (this.holySmiteTimer <= 0) this.isHolySmitten = false;
      }
      if (this.isSeekerLocked && this.seekerLockTimer > 0) {
        this.seekerLockTimer -= dt;
        if (this.seekerLockTimer <= 0) this.isSeekerLocked = false;
      }
      if (this.isBlastedCharred && this.charredTimer > 0) {
        this.charredTimer -= dt;
        if (this.charredTimer <= 0) this.isBlastedCharred = false;
      }
      if (this.isHarpoonStruck && this.harpoonStruckTimer > 0) {
        this.harpoonStruckTimer -= dt;
        if (this.harpoonStruckTimer <= 0) this.isHarpoonStruck = false;
      }
      return;
    }

    // Continuously lock living ground units to the responsive ground line (responsive across all window resizes)
    const currentGroundY = (tower ? tower.groundY : (this.scene.cameras.main.height * 0.72)) + this.groundYOffset;
    if (this.type !== 'phantom') {
      this.y = currentGroundY;
    }

    if (this.isFrozen) {
      this.frozenTimer -= dt;
      if (this.frozenTimer <= 0) this.isFrozen = false;
      this.ragdoll.setPosition(this.x, this.y);
      return;
    }

    // Holy Smite Radiant Consecration Tick
    if (this.isHolySmitten) {
      this.holySmiteTimer -= dt;
      this.hp -= 30 * dt;
      if (this.hp <= 0) {
        this.die(0, -110);
        return;
      }
      if (this.holySmiteTimer <= 0) this.isHolySmitten = false;
    }

    // Seeker Lock Timer
    if (this.isSeekerLocked) {
      this.seekerLockTimer -= dt;
      if (this.seekerLockTimer <= 0) this.isSeekerLocked = false;
    }

    // Charred Timer
    if (this.isBlastedCharred) {
      this.charredTimer -= dt;
      if (this.charredTimer <= 0) this.isBlastedCharred = false;
    }

    // Harpoon Impact Timer
    if (this.isHarpoonStruck) {
      this.harpoonStruckTimer -= dt;
      if (this.harpoonStruckTimer <= 0) this.isHarpoonStruck = false;
    }

    // Hazards: Caltrop Moat
    const towerFront = tower.x + tower.width / 2;
    this.inCaltrops = !!(tower.hasCaltrops && this.x >= towerFront + 15 && this.x <= towerFront + 165);
    if (this.inCaltrops) {
      this.hp -= 15 * dt;
      if (this.hp <= 0) {
        this.die(0, -90);
        return;
      }
    }

    // Hazards: Flaming Tar Trench
    if (tower.hasTarMoat && this.x >= towerFront + 8 && this.x <= towerFront + 115) {
      if (this.type !== 'pyro') {
        this.isBurning = true;
        this.burnTimer = Math.max(this.burnTimer, 1.8);
        this.hp -= 14 * dt;
        if (this.hp <= 0) {
          this.die(0, -110);
          return;
        }
      }
    }

    // Hazards: Smoke Screen Slow Zone
    this.inSmokeScreen = !!(tower.hasSmokeScreen && this.x >= towerFront && this.x <= towerFront + 260);

    if (this.weakenedAttackTimer > 0) this.weakenedAttackTimer -= dt;

    // Poison Tick
    if (this.isPoisoned) {
      this.poisonTimer -= dt;
      this.hp -= 12 * dt;
      if (this.hp <= 0) {
        this.die(0, -100);
        return;
      }
      if (this.poisonTimer <= 0) this.isPoisoned = false;
    }

    // Burn Tick
    if (this.isBurning) {
      if (this.type === 'pyro') {
        this.isBurning = false;
        this.burnTimer = 0;
      } else {
        this.burnTimer -= dt;
        this.hp -= 8 * dt; // Balanced 8 DPS (down from 20) so fire burns steadily without instant kill
        if (this.hp <= 0) {
          this.die(0, -100);
          return;
        }
        if (this.burnTimer <= 0) this.isBurning = false;
      }
    }

    // ── Ranged attacks targeting Archer on tower platform ──
    const canSpit = this.isSpitter || this.type === 'bloater' || this.type === 'necromancer';
    const sceneHazards = (this.scene as any).enemyHazards || [];
    const maxSimultaneousHazards = this.waveNum <= 2 ? 1 : (this.waveNum <= 8 ? 3 : 4);
    const playerTargetY = tower.topY - 38; // Archer's chest height on tower platform

    if (canSpit && !this.dead && !this.isFrozen) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0 && this.x > tower.x + 95 && sceneHazards.length < maxSimultaneousHazards) {
        this.summonTimer = Math.max(3.5, 7.2 - this.waveNum * 0.6) + Math.random() * 1.5;
        const p = (this.scene as any).player;
        if (p && !p.dead) {
          const pType = this.type === 'necromancer' ? 'shadow_skull' : 'acid_spit';
          const pDmg = this.type === 'necromancer' ? (this.playerDamage + 6) : this.playerDamage;
          (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 45 * this.scale, p.x, playerTargetY, pType, pDmg);
        }
      }
    }

    // Crypt Skeleton Archer: fires bone arrows from distance as well as nearby!
    if (this.type === 'skeleton' && !this.dead && !this.isFrozen) {
      this.summonTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const canShoot = this.x <= camW + 60 && this.x > tower.x + 80;
      if (this.summonTimer <= 0 && canShoot && sceneHazards.length < maxSimultaneousHazards) {
        this.summonTimer = 3.6 + Math.random() * 1.5;
        const p = (this.scene as any).player;
        if (p && !p.dead) {
          const arrowDmg = this.playerDamage + 4; // Scales with skeleton level
          (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 35 * this.scale, p.x, playerTargetY, 'bone_arrow', arrowDmg);
        }
      }
    }

    // Frost Wight: immune to freeze, shoots freezing ice shards from distance
    if (this.type === 'frostwight' && !this.dead) {
      this.isFrozen = false; // Glacial frost wight is immune to freeze
      this.summonTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const canShoot = this.x <= camW + 60 && this.x > tower.x + 80;
      if (this.summonTimer <= 0 && canShoot && sceneHazards.length < maxSimultaneousHazards) {
        this.summonTimer = 4.0 + Math.random() * 1.5;
        const p = (this.scene as any).player;
        if (p && !p.dead) {
          const shardDmg = this.playerDamage + 4; // Scales with frostwight level
          (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 40 * this.scale, p.x, playerTargetY, 'frost_shard', shardDmg);
        }
      }
    }

    // Phantom Wraith: floating ethereal undead, emits sonic screech wave
    if (this.type === 'phantom' && !this.dead) {
      if (this.teleportCooldown > 0) this.teleportCooldown -= dt;
      // Ghostly hovering bob
      this.y = (this.scene.cameras.main.height * 0.72) - 14 + Math.sin(Date.now() * 0.006) * 10;
      this.ragdoll.setPosition(this.x, this.y);

      if (!this.isFrozen) {
        this.summonTimer -= dt;
        const camW = (this.scene as any).cameras?.main?.width || 1280;
        const canShoot = this.x <= camW + 60 && this.x > tower.x + 80;
        if (this.summonTimer <= 0 && canShoot && sceneHazards.length < maxSimultaneousHazards) {
          this.summonTimer = 3.8 + Math.random() * 1.4;
          const p = (this.scene as any).player;
          if (p && !p.dead) {
            const screechDmg = this.playerDamage + 4; // Scales with phantom level
            (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 40 * this.scale, p.x, playerTargetY, 'sonic_screech', screechDmg);
          }
        }
      }
    }

    // Infernal Pyro: immune to fire, hurls bouncing magma firebombs at the Tower Barricade
    if (this.type === 'pyro' && !this.dead) {
      this.isBurning = false; // Immune to fire
      this.summonTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const canShoot = this.x <= camW + 60 && this.x >= tower.x + 320;
      if (this.summonTimer <= 0 && canShoot && !this.isFrozen && sceneHazards.length < maxSimultaneousHazards) {
        this.summonTimer = 3.6 + Math.random() * 1.5;
        const bombDmg = this.playerDamage + 8; // Scales with pyro level
        const targetTowerX = tower.x + tower.width / 2 + 5;
        const targetTowerY = tower.topY + 35;
        (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 42 * this.scale, targetTowerX, targetTowerY, 'fire_bomb', bombDmg);
      }
    }

    // Shadow Stalker: agile siege bomber, hurls explosive shadow bombs at Tower Barricade from long range
    if (this.type === 'stalker' && !this.dead && !this.isFrozen) {
      this.summonTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const minThrowDist = tower.x + 360;
      const canShoot = this.x <= camW + 60 && this.x >= minThrowDist;
      if (this.summonTimer <= 0 && canShoot && sceneHazards.length < maxSimultaneousHazards) {
        this.summonTimer = 3.2 + Math.random() * 1.2;
        const bladeDmg = this.playerDamage + 6; // Scales with stalker level
        const targetBarricadeX = tower.x + tower.width / 2 + 5;
        const targetBarricadeY = tower.topY + 35;
        (this.scene as any).spawnEnemyProjectile?.(
          this.x,
          this.y - 30 * this.scale,
          targetBarricadeX,
          targetBarricadeY,
          'shadow_blade',
          bladeDmg
        );
      }
      // Shadow Dash Leap (repositions at distance, never leaps into near point-blank)
      const minDashDist = tower.x + (this.preferredDistance || 620) + 90;
      if (Math.random() < 0.012 && this.x > minDashDist) {
        this.x -= 65;
        (this.scene as any).spawnFloatingText?.('⚡ SHADOW DASH!', this.x, this.y - 45, '#ff5252', 18);
      }
    }

    // Dread Juggernaut: Unstoppable Battering Ram Charge
    if (this.type === 'juggernaut' && !this.dead && !this.isFrozen) {
      const distToTower = this.x - (tower.x + tower.width / 2);
      if (distToTower < 320 && distToTower > 40 && !this.isCharging) {
        this.chargeTimer += dt;
        if (this.chargeTimer >= 1.0) {
          this.isCharging = true;
          this.speed = 175;
          (this.scene as any).spawnFloatingText?.('⚠️ JUGGERNAUT RAM CHARGE! ⚠️', this.x, this.y - 70, '#e74c3c', 22);
          (this.scene as any).shakeScreen?.(8, 0.25);
          soundFX.playZombieMoan();
        }
      }
    }

    // Abyssal Lich King (Grand Apex Finale Boss Wave 15)
    if (this.type === 'reaper' && !this.dead) {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0 && !this.isFrozen && sceneHazards.length < maxSimultaneousHazards) {
        this.meteorTimer = 4.6 + Math.random() * 1.5;
        const p = (this.scene as any).player;
        if (p && !p.dead) {
          const sx = this.x - 80 + Math.random() * 160;
          const meteorDmg = this.playerDamage - 7; // Scales with apex boss level (~48)
          (this.scene as any).spawnEnemyProjectile?.(sx, 70, p.x, playerTargetY, 'void_meteor', meteorDmg);
          (this.scene as any).spawnFloatingText?.('☄️ VOID METEOR RAIN! JUMP! ☄️', p.x, p.y - 85, '#9b59b6', 22);
        }
      }
      this.summonMinionTimer -= dt;
      if (this.summonMinionTimer <= 0 && !this.isFrozen) {
        this.summonMinionTimer = 8.5;
        (this.scene as any).spawnZombieMinion?.('skeleton', this.x + 70);
        (this.scene as any).spawnFloatingText?.('💀 MINIONS ARISE!', this.x, this.y - 95, '#d946ef', 22);
      }
    }

    // Cleaver Berserker: Aggressive shock troop leaping, chopping & blood rage
    if (this.type === 'berserker' && !this.dead && !this.isFrozen) {
      this.berserkerChopPhase += dt * (this.isEnraged ? 18 : 10);
      this.berserkerLeapTimer += dt;

      // Ferocious Berserker Cleaver Lunge Leap toward tower barricade
      const distToTower = this.x - (tower.x + tower.width / 2);
      if (distToTower > 60 && distToTower < 360 && this.berserkerLeapTimer >= (this.isEnraged ? 2.0 : 3.2)) {
        this.berserkerLeapTimer = 0;
        const bFrontX = tower.x + tower.width / 2 + (tower.hasSpikes ? 32 : 24);
        const minBarricadeStopX = bFrontX + 8 * this.scale;
        this.x = Math.max(minBarricadeStopX, this.x - 85);
        this.ragdoll.setPosition(this.x, this.y);
        soundFX.playZombieMoan();
        (this.scene as any).shakeScreen?.(6, 0.15);
        (this.scene as any).spawnFloatingText?.('⚡ BERSERKER LEAP! ⚡', this.x, this.y - 50, '#ff4757', 20);
      }

      // Blood Rage below 60% HP
      if (!this.isEnraged && this.hp <= this.maxHP * 0.6) {
        this.isEnraged = true;
        this.speed = 195;
        soundFX.playZombieMoan();
        (this.scene as any).shakeScreen?.(8, 0.2);
        (this.scene as any).spawnFloatingText?.('🔥 BLOOD RAGE! +100% SPEED!', this.x, this.y - 55, '#ff3838', 22);
      }
    }

    // Frenzy Speed Decay (Buffed by Siren)
    if (this.isFrenzied) {
      this.frenzyBuffTimer -= dt;
      if (this.frenzyBuffTimer <= 0) {
        this.isFrenzied = false;
        this.speed /= 1.35;
      }
    }

    // Corpse Siren Banshee: Ultrasonic Screech & Horde Frenzy Aura
    if (this.type === 'siren' && !this.dead && !this.isFrozen) {
      this.summonTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const canShoot = this.x <= camW + 60 && this.x > tower.x + 80;
      if (this.summonTimer <= 0 && canShoot && sceneHazards.length < maxSimultaneousHazards) {
        this.summonTimer = 3.4 + Math.random() * 1.2;
        const p = (this.scene as any).player;
        if (p && !p.dead) {
          (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 40 * this.scale, p.x, playerTargetY, 'sonic_screech', this.playerDamage + 6);
        }
      }
      this.frenzyScreamTimer -= dt;
      if (this.frenzyScreamTimer <= 0 && this.x <= camW + 40) {
        this.frenzyScreamTimer = 6.5 + Math.random() * 1.5;
        (this.scene as any).spawnFloatingText?.('⚡ HORDE FRENZY SCREAM! ⚡', this.x, this.y - 65, '#81ecec', 22);
        soundFX.playZombieMoan();
        (this.scene as any).shakeScreen?.(10, 0.25);
        for (const z of (this.scene as any).zombies || []) {
          if (!z.dead && Math.abs(z.x - this.x) < 380 && !z.isFrenzied) {
            z.isFrenzied = true;
            z.frenzyBuffTimer = 4.2;
            z.speed *= 1.35;
            (this.scene as any).spawnFloatingText?.('+35% SPD!', z.x, z.y - 45, '#00d2d3', 16);
          }
        }
      }
    }

    // Plague Harvester Butcher: Dual Cleavers
    if (this.type === 'harvester' && !this.dead && !this.isFrozen) {
      this.cleaverTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const canShoot = this.x <= camW + 60 && this.x > tower.x + 80;
      if (this.cleaverTimer <= 0 && canShoot && sceneHazards.length < maxSimultaneousHazards) {
        this.cleaverTimer = 3.0 + Math.random() * 1.2;
        const p = (this.scene as any).player;
        if (p && !p.dead) {
          (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 36 * this.scale, p.x, playerTargetY, 'cleaver', this.playerDamage + 6);
        }
      }
    }

    // Caustic Acid Slobber: Cluster Bombs at Tower Barricade
    if (this.type === 'slobber' && !this.dead && !this.isFrozen) {
      this.clusterTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const canShoot = this.x <= camW + 60 && this.x >= tower.x + 300;
      if (this.clusterTimer <= 0 && canShoot && sceneHazards.length < maxSimultaneousHazards) {
        this.clusterTimer = 3.6 + Math.random() * 1.4;
        const targetTowerX = tower.x + tower.width / 2 + 5;
        const targetTowerY = tower.topY + 35;
        (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 44 * this.scale, targetTowerX, targetTowerY, 'bile_bomb', this.playerDamage + 10);
      }
    }

    // Void Revenant Warmaster: Abyssal Rift Slashes & Phase Shifts
    if (this.type === 'voidknight' && !this.dead) {
      if (this.teleportCooldown > 0) this.teleportCooldown -= dt;
      this.riftSlashTimer -= dt;
      const camW = (this.scene as any).cameras?.main?.width || 1280;
      const canShoot = this.x <= camW + 60 && this.x > tower.x + 80;
      const activeSlashes = sceneHazards.filter(h => h.subType === 'abyssal_slash' && !h.dead).length;
      if (this.riftSlashTimer <= 0 && canShoot && !this.isFrozen && activeSlashes < 2 && sceneHazards.length < maxSimultaneousHazards) {
        this.riftSlashTimer = 6.5 + Math.random() * 3.0; // Noticeably reduced rate (was 3.4s)
        const p = (this.scene as any).player;
        if (p && !p.dead) {
          // 50% chance target player, 50% chance target tower deck (less relentless direct snipes)
          const targetY = Math.random() < 0.5 ? playerTargetY : tower.topY + 25;
          (this.scene as any).spawnEnemyProjectile?.(this.x, this.y - 40 * this.scale, p.x, targetY, 'abyssal_slash', this.playerDamage + 2);
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // 👑 MALAKOR ELDRITCH DRAGON TITAN: ACTIVE BOSS MECHANICS
    // ═══════════════════════════════════════════════════════
    if (this.type === 'malakor' && !this.dead) {
      this.malakorAttackPhase += dt * 3.5;

      // 1. Blazing Dragon Hellfire Meteor Barrage (Direct laser-straight fireball toward player)
      this.malakorMeteorTimer -= dt;
      if (this.malakorMeteorTimer <= 0 && !this.isFrozen) {
        this.malakorMeteorTimer = 4.2 + Math.random() * 1.5;
        const p = (this.scene as any).player;
        const targetX = (p && !p.dead) ? p.x : tower.x + 30;
        const targetY = (p && !p.dead) ? (p.y - 35) : tower.topY - 35;

        // Launch from Malakor's forward-brandished glowing halberd tip
        const halX = (this.malakorHalberdTip && this.malakorHalberdTip.x) ? this.malakorHalberdTip.x : (this.x - 70 * this.scale);
        const halY = (this.malakorHalberdTip && this.malakorHalberdTip.y) ? this.malakorHalberdTip.y : (this.y - 120 * this.scale);
        (this.scene as any).spawnEnemyProjectile?.(halX, halY, targetX, targetY, 'dragon_hellfire_meteor', this.playerDamage + 10);
        soundFX.playExplosion();
        (this.scene as any).shakeScreen?.(18, 0.40);
        (this.scene as any).spawnFloatingText?.('🔥 MALAKOR HURLS DRAGON HELLFIRE! 🔥', this.x - 40, this.y - 130, '#ff3838', 24);
      }

      // 2. Colossal Dragon Halberd Cleave & Seismic Ground Flame Wave (Every 4.8s)
      this.malakorStompTimer -= dt;
      if (this.malakorStompTimer <= 0 && !this.isFrozen) {
        this.malakorStompTimer = 4.8 + Math.random() * 1.6;
        this.isCharging = true;
        
        // Wind-up overhead for 0.40s, then slam forward-down into the earth!
        setTimeout(() => {
          if (this.dead) return;
          this.isCharging = false;
          this.malakorCleaving = true;
          soundFX.playExplosion();
          (this.scene as any).shakeScreen?.(24, 0.50);
          (this.scene as any).spawnFloatingText?.('⚡ DRAGON CATACLYSM HALBERD CLEAVE! ⚡', this.x - 50, this.y - 100, '#ff4757', 24);

          const slamX = this.x - 70 * this.scale;
          (this.scene as any).spawnGroundFlameWave?.(slamX, tower.groundY - 8, this.playerDamage + 8, '🔥 DRAGON CATACLYSM WAVE');

          setTimeout(() => {
            this.malakorCleaving = false;
          }, 450);
        }, 400);
      }

      // 3. Summon Elite Vanguard Guards
      this.malakorSummonTimer -= dt;
      if (this.malakorSummonTimer <= 0 && !this.isFrozen) {
        this.malakorSummonTimer = 8.5;
        const minionType: ZombieType = Math.random() < 0.5 ? 'berserker' : 'centurion';
        (this.scene as any).spawnZombieMinion?.(minionType, this.x + 60);
        (this.scene as any).spawnFloatingText?.('👑 MALAKOR AWAKENS VANGUARD GUARDS! 👑', this.x, this.y - 140, '#e74c3c', 22);
      }
    }

    // Movement toward Barricade (Ranged foes hold position at sniping distance)
    // The wooden tower platform and barricade spikes extend to tower.x + tower.width / 2 + (tower.hasSpikes ? 32 : 24)
    const barricadeFrontX = tower.x + tower.width / 2 + (tower.hasSpikes ? 32 : 24);
    // Hard boundary: zombie center stops right against the barricade spikes (8px offset) so chest touches spikes and claws reach wood
    const minBarricadeStopX = barricadeFrontX + 8 * this.scale;

    let targetX = minBarricadeStopX;
    if (this.type === 'skeleton') {
      targetX = tower.x + (this.preferredDistance || 560) + this.personalTargetOffset;
    } else if (this.type === 'frostwight') {
      targetX = tower.x + (this.preferredDistance || 480) + this.personalTargetOffset;
    } else if (this.type === 'pyro') {
      targetX = tower.x + (this.preferredDistance || 600) + this.personalTargetOffset;
    } else if (this.type === 'stalker') {
      targetX = tower.x + (this.preferredDistance || 620) + this.personalTargetOffset;
    } else if (this.type === 'phantom') {
      targetX = tower.x + (this.preferredDistance || 360) + this.personalTargetOffset;
    } else if (this.type === 'reaper' || this.type === 'malakor') {
      targetX = tower.x + (this.preferredDistance || 320) + this.personalTargetOffset;
    } else if (this.type === 'siren') {
      targetX = tower.x + (this.preferredDistance || 340) + this.personalTargetOffset;
    } else if (this.type === 'harvester') {
      targetX = tower.x + (this.preferredDistance || 280) + this.personalTargetOffset;
    } else if (this.type === 'slobber') {
      targetX = tower.x + (this.preferredDistance || 560) + this.personalTargetOffset;
    } else if (this.type === 'voidknight') {
      targetX = tower.x + (this.preferredDistance || 320) + this.personalTargetOffset;
    }

    let moveSpeed = this.speed;

    // ── Progressive Injury Movement Penalty based on Damage Taken ──
    // Fresh uninjured zombies charge with full velocity. As arrows tear into flesh, pierce muscles,
    // and shatter bones, their speed decreases smoothly in direct proportion to damage taken.
    const healthFrac = Math.max(0.05, Math.min(1.0, this.hp / (this.maxHP || 1)));
    const damageTakenRatio = 1.0 - healthFrac;
    // Berserkers in blood frenzy resist slowing; standard undead suffer realistic crippling
    const injurySlowSensitivity = (this.isEnraged || this.isFrenzied) ? 0.25 : 0.60;
    const injurySpeedMult = Math.max(0.35, 1.0 - damageTakenRatio * injurySlowSensitivity);
    moveSpeed *= injurySpeedMult;

    // Momentary kinetic impact stagger slow on hit
    if (this.hitStaggerTimer > 0) {
      moveSpeed *= 0.45;
    }

    if (this.inPitchPit) moveSpeed *= 0.52;
    if (this.inCaltrops) moveSpeed *= 0.55;
    if (this.inSmokeScreen) moveSpeed *= 0.65;
    moveSpeed = Math.max(16, moveSpeed);

    // ── Zombie Flocking & Dynamic Separation Spacing ──
    let isQueued = false;
    if (allZombies && allZombies.length > 1 && !this.dead) {
      let sepForce = 0;
      let shouldSlowBehind = false;
      const isAir = this.isAirAttacker();

      for (let i = 0; i < allZombies.length; i++) {
        const other = allZombies[i];
        if (other === this || other.dead) continue;
        if (isAir !== other.isAirAttacker()) continue; // Separate ground with ground, air with air

        const dx = this.x - other.x;
        const dist = Math.abs(dx);
        const minSpacing = (this.scale + other.scale) * 22; // ~44px spacing between normal units, ~70px for titans

        if (dist < minSpacing) {
          const overlap = minSpacing - dist;
          const pushWeight = (overlap / minSpacing);
          if (dx > 0) {
            sepForce += pushWeight * 48; // Push right
          } else if (dx < 0) {
            // Push left ONLY if we are safely ahead of minBarricadeStopX so we don't penetrate the barricade
            if (this.x > minBarricadeStopX + 6) {
              sepForce -= pushWeight * 48; // Push left
            }
          } else {
            sepForce += (this.personalTargetOffset >= 0 ? 1 : -1) * 32;
          }

          // If another zombie is directly in front on the way to the tower:
          if (dx > 0 && dist < minSpacing * 0.95) {
            shouldSlowBehind = true;
            isQueued = true;
          }
        }
      }

      this.x += sepForce * dt;
      // Absolute clamp: no zombie can ever be pushed into or past the tower barricade
      this.x = Math.max(minBarricadeStopX, this.x);

      if (shouldSlowBehind) {
        moveSpeed *= 0.68; // Smooth queueing prevents rear zombies clipping into front zombies
      }
    }

    if (this.x > targetX) {
      this.x = Math.max(targetX, this.x - moveSpeed * dt);
    }
    // Hard clamp to keep all zombies strictly in front of the tower barricade
    this.x = Math.max(minBarricadeStopX, this.x);

    // Only front zombie physically at the barricade claws it; rear queued zombies hold ready posture
    const isAtBarricade = this.x <= minBarricadeStopX + 10 && (!isQueued || this.x <= minBarricadeStopX + 3);
    const interval = (this.type === 'boss' || this.type === 'reaper' || this.type === 'malakor') ? 2.2 : 1.1;
    let attackPhase = 0;

    if (isAtBarricade) {
      this.attackTimer += dt;
      attackPhase = (this.attackTimer % interval) / interval;
    } else {
      this.attackTimer = 0;
    }

    this.ragdoll.setPosition(this.x, this.y, {
      isAttacking: isAtBarricade && !this.isFrozen,
      attackPhase,
      isQueued: isQueued && !isAtBarricade,
      speedMult: injurySpeedMult * (this.hitStaggerTimer > 0 ? 0.45 : 1.0)
    });

    if (isAtBarricade && this.attackTimer >= interval) {
      this.attackTimer = 0;
      let tDmg = this.damage;
      let pDmg = this.playerDamage;

      // Diminish attack if recently struck by player arrow
      if (this.weakenedAttackTimer > 0) {
        tDmg = Math.max(1, Math.round(tDmg * 0.60));
        pDmg = Math.max(1, Math.round(pDmg * 0.60));
        (this.scene as any).spawnFloatingText?.('💥 WEAKENED ATTACK! -40% DMG', this.x, this.y - 55, '#2ecc71', 16);
      }

      // Visceral wood impact sound and flying wood splinters off the barricade
      soundFX.playFleshHit(false);
      (this.scene as any).spawnWoodSplinters?.(barricadeFrontX - 4, this.y - 25 * this.scale);

      if (this.type === 'boss') {
        tower.takeDamage(tDmg);
        soundFX.playExplosion();
        (this.scene as any).shakeScreen?.(15, 0.38);
        (this.scene as any).spawnDeckShockwave?.(pDmg, '⚡ TITAN SEISMIC SLAM');
      } else if (this.type === 'reaper') {
        tower.takeDamage(tDmg);
        soundFX.playExplosion();
        (this.scene as any).shakeScreen?.(18, 0.45);
        (this.scene as any).spawnDeckShockwave?.(pDmg, '⚡ REAPER VOID SHOCKWAVE');
      } else if (this.type === 'malakor') {
        tower.takeDamage(tDmg);
        soundFX.playExplosion();
        (this.scene as any).shakeScreen?.(24, 0.55);
        (this.scene as any).spawnDeckShockwave?.(pDmg, '⚡ MALAKOR TITAN CATACLYSM');
      } else if (this.type === 'juggernaut') {
        const mult = this.isCharging ? 1.6 : 1.0;
        const finalTDmg = Math.round(tDmg * mult);
        const finalPDmg = Math.round(pDmg * mult);
        tower.takeDamage(finalTDmg);
        this.isCharging = false;
        this.speed = 52;
        soundFX.playExplosion();
        (this.scene as any).shakeScreen?.(14, 0.35);

        const p = (this.scene as any).player;
        if (p && !p.dead && p.onGround) {
          p.takeDamage(finalPDmg);
          (this.scene as any).spawnFloatingText?.(`💥 JUGGERNAUT RAM! -${finalPDmg} HP ❤️`, p.x, p.y - 70, '#e74c3c', 22);
        }
      } else {
        // Berserker enrage bonus:
        if (this.type === 'berserker' && this.isEnraged) {
          tDmg = Math.round(tDmg * 1.5);
          pDmg = Math.round(pDmg * 1.5);
        }

        tower.takeDamage(tDmg);

        // Barricade shock & claw splinters: damages the player if standing on the deck
        const p = (this.scene as any).player;
        if (p && !p.dead && p.onGround && Math.random() < 0.45) {
          p.takeDamage(pDmg);
          const levelLabel = `L${this.zombieLevel || 1}`;
          (this.scene as any).spawnFloatingText?.(`${levelLabel} CLAW! -${pDmg} HP ❤️`, p.x, p.y - 65, '#ff4757', 18);
          (this.scene as any).shakeScreen?.(6 + (this.zombieLevel || 1) * 0.5, 0.2);
        }
      }

      // Thorns
      if (tower.hasSpikes) {
        this.hp -= 32;
        soundFX.playArmorHit();
        if (this.hp <= 0) {
          this.die(0, -120);
          return;
        }
      }
    }

    if (Math.random() < 0.002) soundFX.playZombieMoan();
  }

  public hitLeg(amount: number, impX: number, impY: number, arrowType: BowType = 'normal'): void {
    if (this.dead || this.isDying) return;
    this.hitFlashTimer = 0.12;

    const isHeavyStrike = amount >= 40 || arrowType === 'ballista' || arrowType === 'buzzsaw';

    if (isHeavyStrike) {
      if (this.legsRemaining === 2) {
        this.legsRemaining = 1;
        this.ragdoll.shatterPart('rightLeg', impX * 0.5, impY * 0.5);
        this.speed *= 0.50; // Limping on 1 leg!
        soundFX.playFleshHit(true);
        (this.scene as any).shakeScreen?.(6, 0.15);
        (this.scene as any).spawnFloatingText?.('🦵 LEG SEVERED! -50% SPEED', this.x, this.y - 45, '#f1c40f', 20);
        this.takeDamage(amount, impX * 0.5, impY * 0.5, false, 'rightLeg');
      } else if (this.legsRemaining === 1) {
        this.legsRemaining = 0;
        this.ragdoll.shatterPart('leftLeg', impX * 0.5, impY * 0.5);
        this.ragdoll.isCrawling = true;
        this.isCrawling = true;
        this.speed *= 0.45; // Down to slow crawling speed!
        soundFX.playFleshHit(true);
        (this.scene as any).shakeScreen?.(10, 0.25);
        (this.scene as any).spawnFloatingText?.('🩸 BOTH LEGS SEVERED! CRAWLER!', this.x, this.y - 35, '#ff3838', 22);
        this.takeDamage(amount, impX * 0.5, impY * 0.5, false, 'leftLeg');
      } else {
        this.takeDamage(amount, impX * 0.4, impY * 0.4, false, 'torso');
      }
    } else {
      // Moderate leg hit: arrow embeds in leg, slows zombie slightly without instantly amputating!
      this.speed *= 0.88;
      soundFX.playFleshHit(false);
      const legDmg = Math.round(amount * 0.65);
      (this.scene as any).spawnFloatingText?.(`-${legDmg} LEG HIT 🦵`, this.x, this.y - 35, '#e2e8f0', 16);
      this.takeDamage(amount, impX * 0.4, impY * 0.4, false, this.legsRemaining === 2 ? 'rightLeg' : 'leftLeg');
    }
  }

  public takeDamage(amount: number, impX: number, impY: number, isHeadshot: boolean = false, hitArea?: 'head' | 'torso' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm'): void {
    if (this.dead || this.isDying) return;
    this.hitFlashTimer = 0.08;

    // Stagger enemy attack and diminish next attack damage
    this.attackTimer = Math.max(0, this.attackTimer - 0.5);
    this.weakenedAttackTimer = 2.5;

    // Undead Natural Damage Resistance:
    // Non-headshot hits are resisted by undead flesh & armor plating
    if (!isHeadshot && hitArea !== 'head') {
      if (this.type === 'juggernaut') {
        amount *= 0.50; // Heavy iron plate armor
        soundFX.playArmorHit();
        (this.scene as any).spawnFloatingText?.(`🛡️ 50% ARMOR DEFLECT! -${Math.round(amount)}`, this.x, this.y - 50, '#95a5a6', 16);
      } else if (this.type === 'slobber') {
        amount *= 0.55; // Rubbery blubber absorbs 45% projectile damage
        soundFX.playFleshHit(false);
        (this.scene as any).spawnFloatingText?.(`🛡️ 45% BLUBBER ABSORB! -${Math.round(amount)}`, this.x, this.y - 50, '#00b894', 16);
      } else if (this.type === 'malakor') {
        amount *= 0.50; // Eldritch Dragon Titan mass absorbs 50% damage
        soundFX.playArmorHit();
        (this.scene as any).spawnFloatingText?.(`🛡️ 50% TITAN MASS DEFLECT! -${Math.round(amount)}`, this.x, this.y - 60, '#e74c3c', 18);
      } else if (this.type === 'boss' || this.type === 'reaper') {
        amount *= 0.65; // Colossal titan mass absorbs 35% damage
      } else if (hitArea === 'leftLeg' || hitArea === 'rightLeg') {
        amount *= 0.65; // Peripheral leg hit resistance (35% reduction)
      } else {
        amount *= 0.75; // 25% undead flesh damage resistance on torso & body
      }
    }

    // Centurion Frontal Shield Block (Headshots and leg shots bypass the shield!)
    if (this.shield && this.shield.hp > 0 && !isHeadshot && hitArea !== 'leftLeg' && hitArea !== 'rightLeg') {
      this.shield.hp -= amount;
      soundFX.playArmorHit();
      (this.scene as any).spawnFloatingText?.(`🛡️ SHIELD BLOCKED! -${Math.round(amount)}`, this.x, this.y - 45, '#bdc3c7', 16);
      if (this.shield.hp <= 0) {
        this.shield = null;
        soundFX.playExplosion();
        (this.scene as any).spawnFloatingText?.('💥 SHIELD SHATTERED!', this.x, this.y - 55, '#f1c40f', 20);
      }
      return;
    }

    // Phantom Phase Blink on damage
    if (this.type === 'phantom' && this.teleportCooldown <= 0 && Math.random() < 0.45) {
      this.teleportCooldown = 2.4;
      const blinkDist = (Math.random() < 0.5 ? -1 : 1) * (85 + Math.random() * 40);
      const towerObj = (this.scene as any).tower;
      const minBarricadeStopX = towerObj ? (towerObj.x + towerObj.width / 2 + (towerObj.hasSpikes ? 32 : 24) + 8 * this.scale) : 260;
      this.x = Math.max(minBarricadeStopX, this.x + blinkDist);
      (this.scene as any).spawnFloatingText?.('✨ PHASE BLINK!', this.x, this.y - 50, '#a29bfe', 20);
      this.ragdoll.setPosition(this.x, this.y);
    }

    // Void Revenant Warmaster Phase Shift on damage
    if (this.type === 'voidknight' && this.teleportCooldown <= 0 && Math.random() < 0.35) {
      this.teleportCooldown = 2.4;
      const blinkDist = (Math.random() < 0.5 ? -1 : 1) * (75 + Math.random() * 35);
      const towerObj = (this.scene as any).tower;
      const minBarricadeStopX = towerObj ? (towerObj.x + towerObj.width / 2 + (towerObj.hasSpikes ? 32 : 24) + 8 * this.scale) : 260;
      this.x = Math.max(minBarricadeStopX, this.x + blinkDist);
      (this.scene as any).spawnFloatingText?.('⚡ VOID SHIFT!', this.x, this.y - 50, '#6c5ce7', 20);
      this.ragdoll.setPosition(this.x, this.y);
    }

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      if (isHeadshot) {
        // Headshot: Immediate crisp decapitation & skull pop!
        this.die(impX, impY, true, 'head');
      } else if (this.isFrozen || this.isBlastedCharred || this.type === 'bloater' || this.type === 'pyro' || this.type === 'slobber' || this.lastHitArrowType === 'ballista' || this.lastHitArrowType === 'buzzsaw') {
        // Instant devastating shattering deaths (frost fracture, bloater burst, kinetic piercing overkill)!
        this.die(impX, impY, false, hitArea);
      } else {
        // Body / limb damage: show effect of arrow, then body shatters/collapses!
        this.isDying = true;
        this.deathDelayTimer = 0.32; // brief moment to showcase the arrow impact & elemental fury!
        this.pendingDeathImpX = impX;
        this.pendingDeathImpY = impY;
        this.pendingHitArea = hitArea;
        const isSuperHeavy = this.type === 'juggernaut' || this.type === 'reaper' || this.type === 'boss' || this.type === 'malakor';
        const impMul = isSuperHeavy ? 0.05 : 0.3;
        this.ragdoll.applyImpulse(impX * impMul, impY * impMul);
      }
    } else {
      // Super heavy undead possess massive weight: immune/highly resistant to knockback
      const isSuperHeavy = this.type === 'juggernaut' || this.type === 'reaper' || this.type === 'boss' || this.type === 'malakor' || this.type === 'slobber';
      const impMul = isSuperHeavy ? 0.06 : 0.4;
      this.ragdoll.applyImpulse(impX * impMul, impY * impMul);

      // Kinetic hit stumble & momentary stagger on damage taken
      this.hitStaggerTimer = isSuperHeavy ? 0.10 : 0.22;
      if (impX > 0) {
        const pushDist = Math.min(16, impX * (isSuperHeavy ? 0.03 : 0.14));
        this.x += pushDist;
        this.ragdoll.setPosition(this.x, this.y);
      }
    }
  }

  public die(impX: number, impY: number, isHeadshot: boolean = false, hitArea?: 'head' | 'torso' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm'): void {
    if (this.dead) return;
    this.dead = true;
    this.isDying = false;
    this.killedByHeadshot = isHeadshot;
    this.ragdoll.dead = true;

    // Harvester Soul Leech: Nearby Living Harvesters gain +45 HP when any undead falls!
    if ((this.scene as any).zombies) {
      for (const other of (this.scene as any).zombies) {
        if (!other.dead && other.type === 'harvester' && other !== this) {
          const dist = Math.abs(other.x - this.x);
          if (dist < 320) {
            other.hp = Math.min(other.maxHP, other.hp + 45);
            (this.scene as any).spawnFloatingText?.('🩸 SOUL LEECH! +45 HP', other.x, other.y - 65, '#ff3838', 20);
          }
        }
      }
    }

    // Check if a specific limb or the full body should shatter
    let shouldShatter = false;
    let isFullShatter = false;
    let shatteredPart: 'head' | 'torso' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm' | 'all' = 'head';
    let shatterOpts: { isFrozen?: boolean; isExplosive?: boolean; isCharred?: boolean; isAcid?: boolean; isFullBody?: boolean } = {};

    if (this.isFrozen) {
      // ❄️ Glacial frost shatter: entire frozen zombie disintegrates into crystalline ice, frosted bone & frozen meat!
      shouldShatter = true;
      isFullShatter = true;
      shatteredPart = 'all';
      shatterOpts = { isFrozen: true, isFullBody: true };
    } else if (this.isBlastedCharred || this.type === 'bloater' || this.type === 'pyro' || this.type === 'slobber') {
      // 💥 Massive demolition blast / explosive bloater / pyro / slobber detonation
      shouldShatter = true;
      isFullShatter = true;
      shatteredPart = 'all';
      shatterOpts = {
        isExplosive: true,
        isFullBody: true,
        isCharred: this.isBlastedCharred || this.type === 'pyro',
        isAcid: this.type === 'bloater' || this.type === 'slobber'
      };
    } else if (isHeadshot || hitArea === 'head') {
      // 💀 Crisp headshot decapitation & skull pop!
      shouldShatter = true;
      shatteredPart = 'head';
      shatterOpts = { isExplosive: false };
    } else if (this.lastHitArrowType === 'ballista' || this.lastHitArrowType === 'buzzsaw') {
      // 🏹 Heavy kinetic ballista / buzzsaw projectile: obliterates struck limb or full torso
      shouldShatter = true;
      if (hitArea && hitArea !== 'torso') {
        shatteredPart = hitArea;
      } else {
        isFullShatter = true;
        shatteredPart = 'all';
        shatterOpts = { isExplosive: true, isFullBody: true };
      }
    } else if (this.isShocked) {
      // ⚡ Lightning storm overload
      shouldShatter = true;
      shatteredPart = 'torso';
    } else {
      // Normal arrow torso hit: stays intact, collapses limp as a ragdoll with arrows stuck in it!
      shouldShatter = false;
    }

    if (shouldShatter) {
      // Determine impact coordinates for flying gibs
      let gibX = this.x;
      let gibY = this.y - 32 * this.scale;
      if (isFullShatter) {
        if (this.ragdoll.torso) {
          gibX = this.ragdoll.torso.position.x;
          gibY = this.ragdoll.torso.position.y;
        }
        this.ragdoll.shatterAll();
      } else {
        if (shatteredPart === 'head' && this.ragdoll.head) {
          gibX = this.ragdoll.head.position.x;
          gibY = this.ragdoll.head.position.y;
        } else if (shatteredPart === 'leftLeg' && this.ragdoll.leftThigh) {
          gibX = this.ragdoll.leftThigh.position.x;
          gibY = this.ragdoll.leftThigh.position.y;
        } else if (shatteredPart === 'rightLeg' && this.ragdoll.rightThigh) {
          gibX = this.ragdoll.rightThigh.position.x;
          gibY = this.ragdoll.rightThigh.position.y;
        } else if (shatteredPart === 'leftArm' && this.ragdoll.leftUpperArm) {
          gibX = this.ragdoll.leftUpperArm.position.x;
          gibY = this.ragdoll.leftUpperArm.position.y;
        } else if (shatteredPart === 'rightArm' && this.ragdoll.rightUpperArm) {
          gibX = this.ragdoll.rightUpperArm.position.x;
          gibY = this.ragdoll.rightUpperArm.position.y;
        } else if (shatteredPart === 'torso' && this.ragdoll.torso) {
          gibX = this.ragdoll.torso.position.x;
          gibY = this.ragdoll.torso.position.y;
        }
        this.ragdoll.shatterPart(shatteredPart as any, impX, impY);
      }

      // Spawn flying bone/flesh/ice gibs in scene
      if ((this.scene as any).spawnShatteredBodyGibs) {
        (this.scene as any).spawnShatteredBodyGibs(
          gibX,
          gibY,
          shatteredPart,
          this.scale,
          this.skinColor,
          this.clothesColor,
          impX,
          impY,
          shatterOpts
        );
      }
    }

    // Bloater, Pyro & Slobber Suicide Explosion
    if ((this.type === 'bloater' || this.type === 'pyro' || this.type === 'slobber') && (this.scene as any).spawnBloaterExplosion) {
      const expTDmg = this.type === 'pyro' ? 50 : (this.type === 'slobber' ? 56 : 38);
      const expPDmg = this.type === 'pyro' ? 28 : (this.type === 'slobber' ? 32 : 20);
      (this.scene as any).spawnBloaterExplosion(this.x, this.y - 40, expTDmg, expPDmg);
      if (this.type === 'pyro') {
        (this.scene as any).spawnFloatingText?.('💥 PYRO DETONATION! 🔥', this.x, this.y - 65, '#ff4757', 22);
      } else if (this.type === 'slobber') {
        (this.scene as any).spawnFloatingText?.('☣️ CAUSTIC SLUDGE DETONATION! ☣️', this.x, this.y - 65, '#00b894', 22);
      }
    }

    // Glacial Ice Shatter
    if (this.isFrozen && (this.scene as any).spawnIceShatter) {
      (this.scene as any).spawnIceShatter(this.x, this.y - 35 * this.scale, this.scale * 0.7);
    }

    if (isHeadshot) {
      soundFX.playHeadshot();
    } else {
      soundFX.playFleshHit(true);
    }

    // Natural physical collapse: remaining body parts fall limp under gravity and settle naturally
    if (this.isFrozen) {
      this.ragdoll.relaxForDeath(0, 5);
    } else {
      this.ragdoll.relaxForDeath(impX * 0.25, impY * 0.25 + 35);
    }

    if ((this.scene as any).onZombieKilled) {
      (this.scene as any).onZombieKilled(this);
    }
  }

  public destroy(): void {
    this.ragdoll.destroy();
  }

  public render(g: Phaser.GameObjects.Graphics): void {
    const s = this.scale;

    let corpseAlpha = 1.0;
    if (this.dead) {
      if (this.deadTimer > 3.5) {
        corpseAlpha = Math.max(0, 1 - (this.deadTimer - 3.5) / 1.5);
      }
    }
    if (corpseAlpha <= 0) return;

    const time = Date.now() * 0.015;
    const tX = this.ragdoll.hasTorso && this.ragdoll.torso ? this.ragdoll.torso.position.x : this.x;
    const tY = this.ragdoll.hasTorso && this.ragdoll.torso ? this.ragdoll.torso.position.y : this.y - 32 * s;
    const hX = this.ragdoll.hasHead && this.ragdoll.head ? this.ragdoll.head.position.x : tX;
    const hY = this.ragdoll.hasHead && this.ragdoll.head ? this.ragdoll.head.position.y : tY - 30 * s;

    // === Status Effect Underlays ===
    if (this.isFrozen && this.frozenTimer > 0) {
      const fAlpha = corpseAlpha * Math.min(1.0, this.frozenTimer / 0.5);
      // Ice crystal aura under the zombie
      g.lineStyle(2 * s, 0x74b9ff, 0.55 * fAlpha);
      const pts = 6;
      for (let i = 0; i < pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const r = 28 * s;
        g.lineBetween(
          tX, tY,
          tX + Math.cos(ang) * r, tY + Math.sin(ang) * r
        );
      }
      g.fillStyle(0x74b9ff, 0.22 * fAlpha);
      g.fillCircle(tX, tY, 30 * s);
    }

    if (this.isPoisoned && this.poisonTimer > 0) {
      const pAlpha = corpseAlpha * Math.min(1.0, this.poisonTimer / 0.5);
      // Toxic drip glow
      g.fillStyle(0x2ed573, 0.3 * pAlpha);
      g.fillCircle(tX, tY, 24 * s);
    }

    // === Ragdoll Body with Elemental Tinting ===
    this.ragdoll.renderGraphics(g, {
      isHero: false,
      hitFlash: this.hitFlashTimer > 0,
      isFrozen: this.isFrozen && this.frozenTimer > 0,
      isBurning: this.isBurning && this.burnTimer > 0,
      isPoisoned: this.isPoisoned && this.poisonTimer > 0,
      isHoly: this.isHolySmitten && this.holySmiteTimer > 0,
      isCharred: this.isBlastedCharred && this.charredTimer > 0,
      alpha: corpseAlpha
    });



    // === Sizzling Corrosive Toxic Acid Effect on Zombie ===
    if (this.isPoisoned && this.poisonTimer > 0) {
      const pAlpha = corpseAlpha * Math.min(1.0, this.poisonTimer / 0.5);
      // 1. Foaming, animated acid bubbles across torso and shoulders
      const numBubbles = 6;
      for (let b = 0; b < numBubbles; b++) {
        const bOffX = Math.sin(time * 3 + b * 2) * 12 * s;
        const bOffY = Math.cos(time * 3.5 + b * 1.5) * 14 * s;
        const bubR = (2.2 + Math.sin(time * 5 + b * 3) * 1.2) * s;
        g.fillStyle(0x2ed573, 0.85 * pAlpha);
        g.fillCircle(tX + bOffX, tY + bOffY, bubR);
        g.fillStyle(0xa8ff78, 0.95 * pAlpha);
        g.fillCircle(tX + bOffX - 0.7 * s, tY + bOffY - 0.7 * s, bubR * 0.45);
      }

      // 2. Corrosive acid melting drips dripping down toward feet
      for (let d = 0; d < 3; d++) {
        const dx = tX + (d - 1) * 9 * s;
        const dripProg = (time * 12 + d * 10) % 36;
        const dy = tY + dripProg * s;
        g.fillStyle(0x2ed573, 0.9 * pAlpha);
        g.fillCircle(dx, dy, 2.2 * s);
        g.lineStyle(1.4 * s, 0x2ed573, 0.75 * pAlpha);
        g.lineBetween(dx, dy - 5 * s, dx, dy);
      }

      // 3. Toxic green caustic smoke vapors rising
      g.fillStyle(0x2ed573, 0.25 * pAlpha);
      g.fillCircle(hX - 2 * s, hY - 18 * s - Math.sin(time * 2) * 4, 9 * s);
      g.fillStyle(0xa8ff78, 0.18 * pAlpha);
      g.fillCircle(hX + 3 * s, hY - 28 * s - Math.cos(time * 2.5) * 5, 12 * s);
    }

    // === Holy Radiant Sacred Smite & Consecration on Zombie ===
    if (this.isHolySmitten && this.holySmiteTimer > 0) {
      const holyAlpha = corpseAlpha * Math.min(1.0, this.holySmiteTimer / 0.8);

      // 1. Blazing Golden Column of Celestial Light beaming down onto zombie
      g.fillStyle(0xfff200, 0.28 * holyAlpha);
      g.fillRect(tX - 16 * s, 0, 32 * s, tY + 40 * s);
      g.fillStyle(0xffffff, 0.45 * holyAlpha);
      g.fillRect(tX - 7 * s, 0, 14 * s, tY + 40 * s);

      // 2. Sacred Spinning Golden Halo hovering above head
      const haloY = hY - 18 * s;
      g.lineStyle(3.2 * s, 0xf1c40f, 0.95 * holyAlpha);
      g.strokeCircle(hX, haloY, 11 * s);
      g.lineStyle(1.4 * s, 0xffffff, 1 * holyAlpha);
      g.strokeCircle(hX, haloY, 11 * s);

      // 3. Radiant Sunburst Rays piercing outwards from the chest
      const numRays = 8;
      for (let r = 0; r < numRays; r++) {
        const ra = (r * Math.PI * 2) / numRays + time * 2;
        const rLen = (18 + Math.sin(time * 8 + r) * 6) * s;
        g.lineStyle(2.4 * s, 0xffd700, 0.85 * holyAlpha);
        g.lineBetween(tX, tY, tX + Math.cos(ra) * rLen, tY + Math.sin(ra) * rLen);
        g.lineStyle(1.2 * s, 0xffffff, 0.95 * holyAlpha);
        g.lineBetween(tX, tY, tX + Math.cos(ra) * (rLen * 0.5), tY + Math.sin(ra) * (rLen * 0.5));
      }

      // 4. Ascending golden holy motes
      for (let hm = 0; hm < 4; hm++) {
        const hmx = tX + Math.sin(time * 4 + hm * 2) * 14 * s;
        const hmy = tY - ((time * 20 + hm * 12) % 45) * s;
        g.fillStyle(0xfffa65, 0.9 * holyAlpha);
        g.fillCircle(hmx, hmy, 2.2 * s);
      }
    }

    // === Homing Seeker Target Lock-On Reticle on Zombie ===
    if (this.isSeekerLocked && this.seekerLockTimer > 0) {
      const lockAlpha = corpseAlpha * Math.min(1.0, this.seekerLockTimer / 0.5);
      const reticleR = 20 * s;

      // 1. Pulsing holographic violet lock ring around torso
      g.lineStyle(2.2 * s, 0xd946ef, 0.85 * lockAlpha);
      g.strokeCircle(tX, tY, reticleR);

      // 2. 4 Rotating Corner Brackets [ + ]
      const rot = time * 3;
      const bDist = 24 * s;
      for (let b = 0; b < 4; b++) {
        const ba = rot + (b * Math.PI) / 2;
        const bx = tX + Math.cos(ba) * bDist;
        const by = tY + Math.sin(ba) * bDist;
        g.lineStyle(2 * s, 0x00f2fe, 0.95 * lockAlpha);
        g.strokeCircle(bx, by, 2.5 * s);
      }

      // 3. Floating overhead Seeker Target Diamond
      const diaY = hY - 26 * s - Math.sin(time * 6) * 3 * s;
      g.fillStyle(0xd946ef, 0.95 * lockAlpha);
      g.fillTriangle(hX, diaY - 6 * s, hX - 5 * s, diaY, hX + 5 * s, diaY);
      g.fillTriangle(hX, diaY + 6 * s, hX - 5 * s, diaY, hX + 5 * s, diaY);
      g.fillStyle(0xffffff, 1 * lockAlpha);
      g.fillCircle(hX, diaY, 1.8 * s);
    }

    // === Attached Impaled Arrows on Zombie Body ===
    for (const arr of this.attachedArrows) {
      let partX = tX;
      let partY = tY;
      if (arr.part === 'leftLeg' && this.ragdoll.leftThigh) {
        partX = this.ragdoll.leftThigh.position.x;
        partY = this.ragdoll.leftThigh.position.y;
      } else if (arr.part === 'rightLeg' && this.ragdoll.rightThigh) {
        partX = this.ragdoll.rightThigh.position.x;
        partY = this.ragdoll.rightThigh.position.y;
      } else if (arr.part === 'head' && this.ragdoll.head) {
        partX = this.ragdoll.head.position.x;
        partY = this.ragdoll.head.position.y;
      }
      const arrX = partX + arr.relX;
      const arrY = partY + arr.relY;
      const wob = arr.wobble > 0 ? Math.sin(Date.now() * 0.05) * arr.wobble * 5 : 0;
      const ang = arr.angle + wob * 0.05;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const perpA_X = -sinA;
      const perpA_Y = cosA;

      // Shaft protruding backwards from the entry wound
      const shaftLen = 22 * s;
      const tailX = arrX - cosA * shaftLen;
      const tailY = arrY - sinA * shaftLen;

      // Clean dark charcoal arrow shaft
      g.lineStyle(2.2 * s, 0x1e272e, 1 * corpseAlpha);
      g.lineBetween(arrX, arrY, tailX, tailY);

      // Sleek chevron fletchings hugging the shaft
      const fletchCol = arr.type === 'fire' ? 0xff4757 : arr.type === 'ice' ? 0x00d2d3 : arr.type === 'viper' ? 0x2ed573 : arr.type === 'tesla' ? 0x00f2fe : arr.type === 'holy' ? 0xf1c40f : 0xe74c3c;
      const fFrontX = tailX + cosA * (6 * s);
      const fFrontY = tailY + sinA * (6 * s);
      const fWidth = 2.8 * s;

      // Two aerodynamic vanes
      g.fillStyle(fletchCol, 1 * corpseAlpha);
      g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX + perpA_X * fWidth, tailY + perpA_Y * fWidth);
      g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX - perpA_X * fWidth, tailY - perpA_Y * fWidth);

      // Arrow nock bead
      g.fillStyle(0x0a0f0a, 1 * corpseAlpha);
      g.fillCircle(tailX, tailY, 1.2 * s);

      // Clean dark blood puncture entry wound
      g.fillStyle(0x350005, 0.9 * corpseAlpha);
      g.fillCircle(arrX, arrY, 2.0 * s);

      // Elemental Tip Glow / Spark on impact wound
      if (arr.type === 'fire') {
        g.fillStyle(0xff4757, 0.85);
        g.fillCircle(arrX, arrY, 3.0 * s);
      } else if (arr.type === 'ice') {
        g.fillStyle(0x00d2d3, 0.85);
        g.fillCircle(arrX, arrY, 3.0 * s);
      } else if (arr.type === 'viper') {
        g.fillStyle(0x2ed573, 0.85);
        g.fillCircle(arrX, arrY, 2.8 * s);
      } else if (arr.type === 'tesla' || arr.type === 'storm') {
        g.fillStyle(0x00f2fe, 0.9);
        g.fillCircle(arrX, arrY, 3.0 * s);
      }
    }

    // === Crackling Lightning Shock Effect ===
    if (this.isShocked && this.shockTimer > 0) {
      const sAlpha = corpseAlpha * Math.min(1.0, this.shockTimer / 0.4);
      g.lineStyle(1.8 * s, 0x00f2fe, 0.9 * sAlpha);
      for (let arc = 0; arc < 3; arc++) {
        const ax1 = tX + (Math.random() - 0.5) * 24 * s;
        const ay1 = tY - (Math.random() - 0.5) * 36 * s;
        const ax2 = ax1 + (Math.random() - 0.5) * 16 * s;
        const ay2 = ay1 + (Math.random() - 0.5) * 16 * s;
        g.lineBetween(ax1, ay1, ax2, ay2);
      }
    }

    // === Corrosive Toxic Acid Bubbling on Flesh ===
    if (this.isPoisoned && this.poisonTimer > 0) {
      const pAlpha = corpseAlpha * Math.min(1.0, this.poisonTimer / 0.5);
      for (let b = 0; b < 3; b++) {
        const bx = tX + Math.sin(time * 5 + b * 2) * 14 * s;
        const by = tY + Math.cos(time * 4 + b * 3) * 18 * s;
        g.fillStyle(0x2ed573, 0.8 * pAlpha);
        g.fillCircle(bx, by, (2 + (b % 2)) * s);
        g.fillStyle(0xa8ff78, 0.9 * pAlpha);
        g.fillCircle(bx, by - 1 * s, 1.2 * s);
      }
    }

    // === Bomb / Cluster Explosion Scorch & Debris ===
    if (this.isBlastedCharred && this.charredTimer > 0) {
      const cAlpha = corpseAlpha * Math.min(1.0, this.charredTimer / 0.8);
      // Dark soot patches
      g.fillStyle(0x1e272e, 0.65 * cAlpha);
      g.fillCircle(tX - 4 * s, tY - 3 * s, 10 * s);
      g.fillCircle(tX + 6 * s, tY + 5 * s, 8 * s);

      // Billowing black explosion smoke
      g.fillStyle(0x2f3640, 0.35 * cAlpha);
      g.fillCircle(tX - 3 * s, tY - 18 * s - ((time * 15) % 25) * s, 11 * s);

      // Popping gunpowder sparks
      for (let sp = 0; sp < 3; sp++) {
        const spx = tX + Math.sin(time * 6 + sp * 2) * 12 * s;
        const spy = tY - (8 + sp * 8 + (time * 12) % 20) * s;
        g.fillStyle(sp % 2 === 0 ? 0xffa502 : 0xff4757, 0.9 * cAlpha);
        g.fillCircle(spx, spy, 1.8 * s);
      }
    }

    // === Siege Harpoon Impalement Shock & Crater ===
    if (this.isHarpoonStruck && this.harpoonStruckTimer > 0) {
      const hAlpha = corpseAlpha * Math.min(1.0, this.harpoonStruckTimer / 0.3);
      // Massive steel projectile exit hole with arterial spurt
      g.fillStyle(0x3d0000, 1 * hAlpha);
      g.fillCircle(tX, tY, 7 * s);
      g.lineStyle(2.5 * s, 0x8b0000, 1 * hAlpha);
      g.strokeCircle(tX, tY, 10 * s);
      // Fissure cracks
      g.lineStyle(1.8 * s, 0x57606f, 0.9 * hAlpha);
      g.lineBetween(tX, tY, tX - 14 * s, tY - 6 * s);
      g.lineBetween(tX, tY, tX + 12 * s, tY + 8 * s);
    }

    // === Roaring Animated Fire Effect on Zombie ===
    if (this.isBurning && this.burnTimer > 0) {
      const bAlpha = corpseAlpha * Math.min(1.0, this.burnTimer / 0.5);

      // 1. Billowing dark smoke puffs rising above head
      g.fillStyle(0x2d3436, 0.35 * bAlpha);
      g.fillCircle(hX - 3 * s, hY - 22 * s - Math.sin(time * 2) * 4, 10 * s);
      g.fillStyle(0x2d3436, 0.22 * bAlpha);
      g.fillCircle(hX + 4 * s, hY - 36 * s - Math.cos(time * 2.2) * 5, 13 * s);

      // 2. Active leaping flame tongues on torso & head
      const numFlames = 5;
      for (let f = 0; f < numFlames; f++) {
        const fOffX = (f - 2) * 7 * s;
        const flk = Math.sin(time * 4 + f * 1.8) * 4 * s;
        const flameH = (22 + (f % 2) * 12 + Math.cos(time * 5 + f) * 6) * s;
        const baseY = tY + 4 * s;
        const rootX = tX + fOffX;

        // Outer red-orange flame
        g.fillStyle(0xff4757, 0.85 * bAlpha);
        g.fillTriangle(
          rootX, baseY - flameH,
          rootX - 6 * s + flk * 0.4, baseY,
          rootX + 6 * s - flk * 0.4, baseY
        );

        // Inner bright orange flame
        g.fillStyle(0xffa502, 0.95 * bAlpha);
        g.fillTriangle(
          rootX + flk * 0.3, baseY - flameH * 0.75,
          rootX - 3.5 * s, baseY,
          rootX + 3.5 * s, baseY
        );

        // Hot yellow core
        g.fillStyle(0xffeb3b, 1 * bAlpha);
        g.fillTriangle(
          rootX + flk * 0.2, baseY - flameH * 0.45,
          rootX - 1.8 * s, baseY,
          rootX + 1.8 * s, baseY
        );
      }

      // 3. Dancing fire embers drifting into air
      for (let em = 0; em < 4; em++) {
        const emX = tX + Math.sin(time * 3 + em * 2) * 16 * s;
        const emY = tY - (25 + em * 14 + (time * 15 + em * 8) % 30) * s;
        g.fillStyle(em % 2 === 0 ? 0xffeb3b : 0xff4757, 0.9 * bAlpha);
        g.fillCircle(emX, emY, (1.8 + (em % 2) * 0.8) * s);
      }
    }


    // === Helmet (Buckethead) ===
    if (this.helmet && this.ragdoll.hasHead && !this.ragdoll.decapitated && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;
      g.fillStyle(0x7f8c8d, 1);
      g.fillRect(hx - 14 * s, hy - 20 * s, 28 * s, 24 * s);
      g.lineStyle(2, 0x2c3e50, 1);
      g.strokeRect(hx - 14 * s, hy - 20 * s, 28 * s, 24 * s);
      // Eye slit
      g.lineStyle(3 * s, 0x1e272e, 1);
      g.lineBetween(hx - 7 * s, hy - 8 * s, hx + 7 * s, hy - 8 * s);
    }

    // === Necromancer Purple Crown ===
    if (this.type === 'necromancer' && !this.dead) {
      const staffX = this.x + this.ragdoll.faceDir * 14 * s;
      const staffTopY = this.y - 90 * s;
      g.lineStyle(3 * s, 0xd1b4eb, 1);
      g.lineBetween(staffX, this.y - 30 * s, staffX, staffTopY);
      // Void orb on staff tip
      g.fillStyle(0xe056fd, 0.9);
      g.fillCircle(staffX, staffTopY, 8 * s);
      g.fillStyle(0x686de0, 0.6);
      g.fillCircle(staffX, staffTopY, 5 * s);
    }



    // === Centurion Iron Riot Shield ===
    if (this.shield && !this.dead) {
      const shX = this.x + this.ragdoll.faceDir * 18 * s;
      const shY = this.y - 32 * s;
      g.fillStyle(0x57606f, 1);
      g.fillRoundedRect(shX - 6 * s, shY - 24 * s, 12 * s, 48 * s, 4);
      g.lineStyle(2.5 * s, 0x2f3542, 1);
      g.strokeRoundedRect(shX - 6 * s, shY - 24 * s, 12 * s, 48 * s, 4);
      // Heraldic Cross
      g.fillStyle(0xf1f2f6, 0.95);
      g.fillRect(shX - 4 * s, shY - 3 * s, 8 * s, 6 * s);
      g.fillRect(shX - 3 * s, shY - 12 * s, 6 * s, 24 * s);
    }

    // === Berserker Dual Meat Cleavers & Blood Aura ===
    if (this.type === 'berserker' && !this.dead) {
      const timeNow = Date.now() * 0.001;
      const leftChop = Math.sin(this.berserkerChopPhase || timeNow * 8) * 8 * s;
      const rightChop = Math.cos(this.berserkerChopPhase || timeNow * 8) * 8 * s;

      const drawCleaver = (cx: number, cy: number, chopY: number) => {
        const bladeW = 16 * s;
        const bladeH = 12 * s;
        const hx = cx;
        const hy = cy + chopY;

        // Wooden handle with bronze rivets
        g.fillStyle(0x5c3a21, 1);
        g.fillRect(hx - 2.5 * s, hy - 4 * s, 5 * s, 10 * s);
        g.fillStyle(0xd35400, 1);
        g.fillCircle(hx, hy + 1 * s, 1.2 * s);

        // Steel Cleaver Rectangular Blade with beveled cutting edge
        g.fillStyle(0x718093, 1); // Darker steel spine
        g.fillRect(hx - 4 * s, hy - 16 * s, bladeW, 3 * s);
        g.fillStyle(0xdcdde1, 1); // Polished broad blade
        g.fillRect(hx - 4 * s, hy - 13 * s, bladeW, bladeH - 3 * s);
        g.fillStyle(0xffffff, 0.9); // Razor sharp bottom edge
        g.fillRect(hx - 4 * s, hy - 1 * s, bladeW, 1.8 * s);

        // Dark blood stain on cutting corner
        g.fillStyle(0x990000, 0.9);
        g.fillRect(hx + 8 * s, hy - 14 * s, 4 * s, bladeH);
        g.fillStyle(0x5a0000, 0.95);
        g.fillRect(hx + 10 * s, hy - 14 * s, 2 * s, bladeH);
      };

      if (this.ragdoll.leftForearm) {
        drawCleaver(this.ragdoll.leftForearm.position.x, this.ragdoll.leftForearm.position.y, leftChop);
      }
      if (this.ragdoll.rightForearm) {
        drawCleaver(this.ragdoll.rightForearm.position.x, this.ragdoll.rightForearm.position.y, rightChop);
      }
    }

    // === Skeleton Archer Bone Bow ===
    if (this.type === 'skeleton' && !this.dead) {
      const bx = this.ragdoll.leftForearm.position.x;
      const by = this.ragdoll.leftForearm.position.y;
      g.lineStyle(2.5 * s, 0xdcdde1, 1);
      g.beginPath();
      g.arc(bx + 4 * s, by, 16 * s, Math.PI * 0.6, Math.PI * 1.4);
      g.strokePath();

      const isAiming = this.summonTimer < 1.0;
      const pull = isAiming ? 6 * s : 0;
      g.lineStyle(1.2 * s, 0xffffff, 0.85);
      g.lineBetween(bx - 3 * s, by - 14 * s, bx - 3 * s + pull, by);
      g.lineBetween(bx - 3 * s + pull, by, bx - 3 * s, by + 14 * s);

      if (isAiming) {
        // Nocked white bone arrow aimed at player tower
        g.lineStyle(2 * s, 0xecf0f1, 1);
        g.lineBetween(bx - 16 * s, by, bx + 10 * s, by);
        g.fillStyle(0xdcdde1, 1);
        g.fillTriangle(bx - 20 * s, by, bx - 15 * s, by - 3 * s, bx - 15 * s, by + 3 * s);
      }
    }

    // === Phantom Wraith Ethereal Wisps ===
    if (this.type === 'phantom' && !this.dead) {

      for (let w = 0; w < 3; w++) {
        const wx = this.x + Math.sin(Date.now() * 0.005 + w * 2) * 14 * s;
        const wy = this.y - (10 + w * 12 + (Date.now() * 0.02 + w * 10) % 20) * s;
        g.fillStyle(0x00f2fe, 0.45);
        g.fillCircle(wx, wy, 3.5 * s);
      }
    }

    // === Infernal Pyro Molten Cracks & Fire Horns ===
    if (this.type === 'pyro' && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;
      g.fillStyle(0xff4757, 0.95);
      g.fillTriangle(hx - 10 * s, hy - 14 * s, hx - 16 * s, hy - 26 * s, hx - 6 * s, hy - 18 * s);
      g.fillTriangle(hx + 10 * s, hy - 14 * s, hx + 16 * s, hy - 26 * s, hx + 6 * s, hy - 18 * s);
    }

    // === Shadow Stalker Razor Mantis Blades & Dynamite Sticks ===
    if (this.type === 'stalker' && !this.dead) {
      const drawBlade = (fx: number, fy: number) => {
        g.fillStyle(0x2c2c54, 1);
        g.fillRect(fx - 2 * s, fy - 16 * s, 4 * s, 20 * s);
        g.fillStyle(0xff5252, 1);
        g.fillTriangle(fx, fy - 22 * s, fx - 3 * s, fy - 12 * s, fx + 3 * s, fy - 12 * s);
        // Flickering fiery spark fuse tip
        const sparkPulse = Math.sin(Date.now() * 0.025 + fx) * 1.2 * s;
        g.fillStyle(0xffd32a, 1);
        g.fillCircle(fx, fy - 23 * s, 2.2 * s + sparkPulse);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(fx, fy - 23 * s, 1.0 * s);
      };
      drawBlade(this.ragdoll.leftForearm.position.x, this.ragdoll.leftForearm.position.y);
      drawBlade(this.ragdoll.rightForearm.position.x, this.ragdoll.rightForearm.position.y);
    }

    // === Dread Juggernaut Heavy Spiked Ram Plate & Spiked Horns ===
    if (this.type === 'juggernaut' && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;
      g.fillStyle(0x353b48, 1);
      g.fillRect(hx - 16 * s, hy - 18 * s, 32 * s, 22 * s);
      g.lineStyle(2 * s, 0x718093, 1);
      g.strokeRect(hx - 16 * s, hy - 18 * s, 32 * s, 22 * s);
      const ramX = this.x - 18 * s;
      const ramY = this.y - 32 * s;
      g.fillStyle(0xdcdde1, 1);
      g.fillTriangle(ramX - 10 * s, ramY - 10 * s, ramX, ramY - 16 * s, ramX, ramY - 4 * s);
      g.fillTriangle(ramX - 12 * s, ramY + 4 * s, ramX, ramY - 2 * s, ramX, ramY + 10 * s);
    }

    // === Abyssal Lich King Grand Crown & Void Scythe ===
    if (this.type === 'reaper' && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;
      g.fillStyle(0x2f3640, 1);
      g.beginPath();
      g.moveTo(hx - 22 * s, hy - 20 * s);
      g.lineTo(hx - 18 * s, hy - 38 * s);
      g.lineTo(hx - 10 * s, hy - 24 * s);
      g.lineTo(hx, hy - 42 * s);
      g.lineTo(hx + 10 * s, hy - 24 * s);
      g.lineTo(hx + 18 * s, hy - 38 * s);
      g.lineTo(hx + 22 * s, hy - 20 * s);
      g.closePath();
      g.fillPath();
      g.lineStyle(2 * s, 0xa55eea, 1);
      g.strokePath();

      // Giant Death Scythe
      const scX = this.x + this.ragdoll.faceDir * 24 * s;
      const scTopY = this.y - 120 * s;
      g.lineStyle(4 * s, 0x4b6584, 1);
      g.lineBetween(scX, this.y + 10 * s, scX, scTopY);
      g.fillStyle(0xa55eea, 0.95);
      g.beginPath();
      g.moveTo(scX, scTopY);
      g.arc(scX - 32 * s, scTopY + 10 * s, 42 * s, -Math.PI * 0.45, Math.PI * 0.15);
      g.lineTo(scX, scTopY + 22 * s);
      g.closePath();
      g.fillPath();
      g.lineStyle(2.5 * s, 0xd1d8e0, 1);
      g.strokePath();

    }

    // === Corpse Siren Banshee: Ultrasonic Aura & Screaming Rings ===
    if (this.type === 'siren' && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;
      // Glowing ethereal eyes & screaming mouth
      g.fillStyle(0x00cec9, 0.95);
      g.fillCircle(hx - 4 * s, hy - 4 * s, 2.5 * s);
      g.fillCircle(hx + 4 * s, hy - 4 * s, 2.5 * s);
      g.fillStyle(0x81ecec, 1);
      g.fillEllipse(hx, hy + 4 * s, 4 * s, 6 * s);

    }

    // === Plague Harvester Butcher: Spiked Iron Mask, Apron & Dual Cleavers ===
    if (this.type === 'harvester' && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;
      // Spiked executioner iron mask
      g.fillStyle(0x2d3436, 1);
      g.fillRect(hx - 12 * s, hy - 16 * s, 24 * s, 20 * s);
      g.lineStyle(2 * s, 0xd63031, 0.9);
      g.strokeRect(hx - 12 * s, hy - 16 * s, 24 * s, 20 * s);
      // Bloodied horizontal eye slit
      g.lineStyle(2.5 * s, 0xff7675, 1);
      g.lineBetween(hx - 8 * s, hy - 6 * s, hx + 8 * s, hy - 6 * s);

      // Blood-soaked butcher apron
      g.fillStyle(0x631010, 0.9);
      g.fillRect(tX - 10 * s, tY - 14 * s, 20 * s, 28 * s);
      g.lineStyle(1.8 * s, 0xd63031, 1);
      g.strokeRect(tX - 10 * s, tY - 14 * s, 20 * s, 28 * s);

      // Twin executioner cleavers
      const drawHeavyCleaver = (cx: number, cy: number) => {
        g.fillStyle(0xdcdde1, 1);
        g.fillRect(cx - 4 * s, cy - 18 * s, 18 * s, 12 * s);
        g.fillStyle(0x2f3542, 1);
        g.fillRect(cx - 3 * s, cy - 6 * s, 5 * s, 10 * s);
        g.fillStyle(0xc0392b, 1);
        g.fillRect(cx + 9 * s, cy - 18 * s, 5 * s, 12 * s);
      };
      drawHeavyCleaver(this.ragdoll.leftForearm.position.x, this.ragdoll.leftForearm.position.y);
      drawHeavyCleaver(this.ragdoll.rightForearm.position.x, this.ragdoll.rightForearm.position.y);
    }

    // === Caustic Acid Slobber: Pulsating Toxic Pustules & Dripping Slime ===
    if (this.type === 'slobber' && !this.dead) {
      const pTime = Date.now() * 0.01;
      const drawPustule = (px: number, py: number, r: number, phase: number) => {
        const pr = (r + Math.sin(pTime + phase) * 2) * s;
        g.fillStyle(0x00b894, 0.85);
        g.fillCircle(px, py, pr);
        g.fillStyle(0x55efc4, 0.95);
        g.fillCircle(px - 1.5 * s, py - 1.5 * s, pr * 0.45);
        g.lineStyle(1.5 * s, 0x006266, 0.9);
        g.strokeCircle(px, py, pr);
      };
      drawPustule(tX - 14 * s, tY - 12 * s, 7, 0);
      drawPustule(tX + 16 * s, tY - 8 * s, 9, 1.5);
      drawPustule(tX - 8 * s, tY + 12 * s, 8, 3.0);
      drawPustule(tX + 10 * s, tY + 14 * s, 6.5, 4.5);

      // Acid vapor aura
      g.fillStyle(0x00b894, 0.16);
      g.fillCircle(this.x, this.y - 36 * s, 42 * s + Math.sin(pTime * 0.8) * 4 * s);
    }

    // === Void Revenant Warmaster: Obsidian Horns & Runic Greatsword ===
    if (this.type === 'voidknight' && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;
      // Curved obsidian horns
      g.fillStyle(0x1e272e, 1);
      g.beginPath();
      g.moveTo(hx - 10 * s, hy - 14 * s);
      g.lineTo(hx - 22 * s, hy - 32 * s);
      g.lineTo(hx - 6 * s, hy - 18 * s);
      g.closePath();
      g.fillPath();
      g.beginPath();
      g.moveTo(hx + 10 * s, hy - 14 * s);
      g.lineTo(hx + 22 * s, hy - 32 * s);
      g.lineTo(hx + 6 * s, hy - 18 * s);
      g.closePath();
      g.fillPath();

      // Glowing Runic Greatsword in hand
      const swordX = this.ragdoll.rightForearm.position.x;
      const swordY = this.ragdoll.rightForearm.position.y;
      g.lineStyle(4 * s, 0x2d3436, 1);
      g.lineBetween(swordX, swordY + 12 * s, swordX, swordY - 42 * s);
      g.lineStyle(2.5 * s, 0x6c5ce7, 1);
      g.lineBetween(swordX, swordY + 12 * s, swordX, swordY - 42 * s);
      // Crossguard
      g.lineStyle(3 * s, 0xa29bfe, 1);
      g.lineBetween(swordX - 10 * s, swordY - 8 * s, swordX + 10 * s, swordY - 8 * s);

    }

    // === Malakor Eldritch Dragon Titan: Grand Apex Sovereign Crown & Hellfire Aura ===
    if (this.type === 'malakor' && !this.dead) {
      const hx = this.ragdoll.head.position.x;
      const hy = this.ragdoll.head.position.y;

      // 4 Massive Jagged Obsidian Dragon Horns
      g.fillStyle(0x000000, 1);
      g.fillTriangle(hx - 14 * s, hy - 18 * s, hx - 34 * s, hy - 48 * s, hx - 8 * s, hy - 26 * s);
      g.fillTriangle(hx + 14 * s, hy - 18 * s, hx + 34 * s, hy - 48 * s, hx + 8 * s, hy - 26 * s);
      g.fillTriangle(hx - 22 * s, hy - 12 * s, hx - 42 * s, hy - 32 * s, hx - 14 * s, hy - 18 * s);
      g.fillTriangle(hx + 22 * s, hy - 12 * s, hx + 42 * s, hy - 32 * s, hx + 14 * s, hy - 18 * s);

      // Eldritch Dragon Crown with Glowing Blood Rubies
      g.fillStyle(0xb71540, 1);
      g.beginPath();
      g.moveTo(hx - 24 * s, hy - 24 * s);
      g.lineTo(hx - 20 * s, hy - 44 * s);
      g.lineTo(hx - 10 * s, hy - 28 * s);
      g.lineTo(hx, hy - 50 * s);
      g.lineTo(hx + 10 * s, hy - 28 * s);
      g.lineTo(hx + 20 * s, hy - 44 * s);
      g.lineTo(hx + 24 * s, hy - 24 * s);
      g.closePath();
      g.fillPath();
      g.lineStyle(2.5 * s, 0xff3838, 1);
      g.strokePath();

      // Glowing Dragon Eyes
      g.fillStyle(0xff3838, 1);
      g.fillCircle(hx - 8 * s, hy - 6 * s, 3.5 * s);
      g.fillCircle(hx + 8 * s, hy - 6 * s, 3.5 * s);

      // Massive Animated Eldritch Cataclysm Halberd
      const handX = this.ragdoll.rightForearm ? this.ragdoll.rightForearm.position.x : (this.x - 20 * s);
      const handY = this.ragdoll.rightForearm ? this.ragdoll.rightForearm.position.y : (this.y - 45 * s);
      const halLen = 145 * s;

      // Forward-facing battle stance (toward tower to the left)
      // Idle forward angle: -Math.PI * 0.72 (-130 deg, forward-up)
      // Overhead windup: -Math.PI * 0.50 (-90 deg, straight up)
      // Cleave slam: -Math.PI * 0.95 (-171 deg, slamming forward-down into earth)
      let swingAngle = -Math.PI * 0.72 + Math.sin(this.malakorAttackPhase || Date.now() * 0.003) * 0.08;
      if (this.malakorCleaving) {
        swingAngle = -Math.PI * 0.95;
      } else if (this.isCharging) {
        swingAngle = -Math.PI * 0.50;
      }

      const tipX = handX + Math.cos(swingAngle) * halLen;
      const tipY = handY + Math.sin(swingAngle) * halLen;
      const buttX = handX - Math.cos(swingAngle) * (45 * s);
      const buttY = handY - Math.sin(swingAngle) * (45 * s);
      this.malakorHalberdTip = { x: tipX, y: tipY };

      // Heavy Obsidian & Bronze Shaft
      g.lineStyle(6 * s, 0x1e272e, 1);
      g.lineBetween(buttX, buttY, tipX, tipY);
      g.lineStyle(3 * s, 0xd35400, 0.9);
      g.lineBetween(buttX, buttY, tipX, tipY);

      // Pommel Spike
      g.fillStyle(0xd63031, 1);
      g.fillCircle(buttX, buttY, 6 * s);

      // Grand Dragon Crescent Axe Blade & Piercing Spearhead
      // Perpendicular vector for the blade facing forward towards player:
      const fwdNormX = Math.sin(swingAngle);
      const fwdNormY = -Math.cos(swingAngle);
      const axeCenter = { x: handX + Math.cos(swingAngle) * (halLen * 0.82), y: handY + Math.sin(swingAngle) * (halLen * 0.82) };
      
      // Crescent Dragon Axe Head (Facing forward towards player)
      g.fillStyle(0xd63031, 1);
      g.beginPath();
      g.moveTo(axeCenter.x, axeCenter.y);
      g.lineTo(axeCenter.x + fwdNormX * (36 * s) - Math.cos(swingAngle) * (18 * s), axeCenter.y + fwdNormY * (36 * s) - Math.sin(swingAngle) * (18 * s));
      g.lineTo(axeCenter.x + fwdNormX * (44 * s) + Math.cos(swingAngle) * (18 * s), axeCenter.y + fwdNormY * (44 * s) + Math.sin(swingAngle) * (18 * s));
      g.lineTo(tipX - Math.cos(swingAngle) * (12 * s), tipY - Math.sin(swingAngle) * (12 * s));
      g.closePath();
      g.fillPath();
      g.lineStyle(3.5 * s, 0xff4757, 1);
      g.strokePath();

      // Sharp Back Hook (Facing backward)
      g.fillStyle(0x718093, 1);
      g.beginPath();
      g.moveTo(axeCenter.x, axeCenter.y);
      g.lineTo(axeCenter.x - fwdNormX * (22 * s) - Math.cos(swingAngle) * (14 * s), axeCenter.y - fwdNormY * (22 * s) - Math.sin(swingAngle) * (14 * s));
      g.lineTo(axeCenter.x - fwdNormX * (14 * s) + Math.cos(swingAngle) * (10 * s), axeCenter.y - fwdNormY * (14 * s) + Math.sin(swingAngle) * (10 * s));
      g.closePath();
      g.fillPath();

      // Gleaming Molten Spear Tip
      g.fillStyle(0xfff200, 1);
      g.fillTriangle(
        tipX + Math.cos(swingAngle) * (24 * s), tipY + Math.sin(swingAngle) * (24 * s),
        tipX + fwdNormX * (10 * s), tipY + fwdNormY * (10 * s),
        tipX - fwdNormX * (10 * s), tipY - fwdNormY * (10 * s)
      );
      g.lineStyle(2.5 * s, 0xff3838, 1);
      g.strokeTriangle(
        tipX + Math.cos(swingAngle) * (24 * s), tipY + Math.sin(swingAngle) * (24 * s),
        tipX + fwdNormX * (10 * s), tipY + fwdNormY * (10 * s),
        tipX - fwdNormX * (10 * s), tipY - fwdNormY * (10 * s)
      );

      // Flaming runes along the blade
      const fTime = Date.now() * 0.01;
      g.fillStyle(0xffa502, 0.85);
      g.fillCircle(axeCenter.x + Math.sin(fTime) * 4 * s, axeCenter.y + Math.cos(fTime) * 4 * s, 6 * s);

    }

    // === Crystalline Glacial Ice Prison (Rendered over Zombie Body) ===
    if (this.isFrozen && this.frozenTimer > 0) {
      const fAlpha = corpseAlpha * Math.min(1.0, this.frozenTimer / 0.5);
      const iTime = Date.now() * 0.005;
      const zMidX = tX;
      const zMidY = tY;
      const zW = 34 * s;
      const zH = 75 * s;

      // Swirling Sub-Zero Cold Frost Vapor Mist
      g.fillStyle(0x00d2d3, 0.18 * fAlpha);
      g.fillCircle(zMidX, zMidY, 26 * s + Math.sin(iTime * 3) * 4);
      g.fillStyle(0xdff9fb, 0.25 * fAlpha);
      g.fillCircle(zMidX, zMidY - 12 * s, 20 * s + Math.cos(iTime * 3.5) * 3);

      // 1. Multifaceted Translucent Glacial Ice Block
      g.fillStyle(0x74b9ff, 0.50 * fAlpha);
      g.beginPath();
      g.moveTo(zMidX - zW * 0.6, zMidY - zH * 0.52);
      g.lineTo(zMidX + zW * 0.1, zMidY - zH * 0.58);
      g.lineTo(zMidX + zW * 0.65, zMidY - zH * 0.48);
      g.lineTo(zMidX + zW * 0.75, zMidY + zH * 0.15);
      g.lineTo(zMidX + zW * 0.55, zMidY + zH * 0.52);
      g.lineTo(zMidX - zW * 0.55, zMidY + zH * 0.52);
      g.lineTo(zMidX - zW * 0.75, zMidY + zH * 0.12);
      g.closePath();
      g.fillPath();

      // Ice Refraction Shading Facets
      g.fillStyle(0x00d2d3, 0.35 * fAlpha);
      g.beginPath();
      g.moveTo(zMidX - zW * 0.6, zMidY - zH * 0.52);
      g.lineTo(zMidX, zMidY - zH * 0.2);
      g.lineTo(zMidX + zW * 0.65, zMidY - zH * 0.48);
      g.lineTo(zMidX + zW * 0.1, zMidY - zH * 0.58);
      g.closePath();
      g.fillPath();

      g.fillStyle(0xdff9fb, 0.42 * fAlpha);
      g.beginPath();
      g.moveTo(zMidX, zMidY - zH * 0.2);
      g.lineTo(zMidX - zW * 0.75, zMidY + zH * 0.12);
      g.lineTo(zMidX - zW * 0.3, zMidY + zH * 0.4);
      g.closePath();
      g.fillPath();

      // Crisp White Facet Highlight Edges
      g.lineStyle(2 * s, 0xffffff, 0.85 * fAlpha);
      g.lineBetween(zMidX - zW * 0.6, zMidY - zH * 0.52, zMidX, zMidY - zH * 0.2);
      g.lineBetween(zMidX, zMidY - zH * 0.2, zMidX + zW * 0.65, zMidY - zH * 0.48);
      g.lineBetween(zMidX, zMidY - zH * 0.2, zMidX - zW * 0.3, zMidY + zH * 0.4);
      g.lineBetween(zMidX, zMidY - zH * 0.2, zMidX + zW * 0.35, zMidY + zH * 0.35);

      // 2. Protruding Sharp Glacial Crystal Spikes / Spires
      const drawIceSpike = (sx: number, sy: number, length: number, ang: number, w: number) => {
        const cA = Math.cos(ang);
        const sA = Math.sin(ang);
        const pX = -sA;
        const pY = cA;

        g.fillStyle(0xdff9fb, 0.8 * fAlpha);
        g.fillTriangle(
          sx + cA * length, sy + sA * length,
          sx - pX * w, sy - pY * w,
          sx + pX * w, sy + pY * w
        );
        g.lineStyle(1.5, 0xffffff, 0.95 * fAlpha);
        g.lineBetween(sx, sy, sx + cA * length, sy + sA * length);
      };

      // Spikes from head/crown
      drawIceSpike(hX - 6 * s, hY - 10 * s, 26 * s, -Math.PI * 0.65, 5 * s);
      drawIceSpike(hX + 8 * s, hY - 12 * s, 32 * s, -Math.PI * 0.35, 6 * s);

      // Spikes from shoulders & torso
      drawIceSpike(zMidX - 14 * s, zMidY - 10 * s, 28 * s, -Math.PI * 0.85, 5.5 * s);
      drawIceSpike(zMidX + 16 * s, zMidY - 14 * s, 34 * s, -Math.PI * 0.15, 6 * s);
      drawIceSpike(zMidX - 18 * s, zMidY + 16 * s, 22 * s, -Math.PI * 0.95, 4.5 * s);
      drawIceSpike(zMidX + 20 * s, zMidY + 18 * s, 25 * s, -Math.PI * 0.05, 5 * s);

      // 3. Shimmering Diamond Stars
      for (let star = 0; star < 3; star++) {
        const starX = zMidX + Math.sin(iTime + star * 2) * (zW * 0.6);
        const starY = zMidY - 20 * s + Math.cos(iTime * 1.5 + star) * (zH * 0.35);
        g.fillStyle(0xffffff, 0.95 * fAlpha);
        g.fillCircle(starX, starY, 2.2);
        g.lineStyle(1, 0xffffff, 0.95 * fAlpha);
        g.lineBetween(starX - 4, starY, starX + 4, starY);
        g.lineBetween(starX, starY - 4, starX, starY + 4);
      }
    }

    // === Tactical Overhead Health, Armor & Status Plate ===
    const isBoss = this.type === 'boss' || this.type === 'reaper' || this.type === 'malakor';
    const isElite = this.type === 'juggernaut' || this.type === 'harvester' || this.type === 'voidknight' || this.type === 'siren' || this.type === 'slobber';
    if (!this.dead && (this.hp < this.maxHP || isBoss || isElite || this.isSeekerLocked)) {
      const barW = (this.type === 'malakor' ? 128 : this.type === 'reaper' ? 104 : isBoss ? 82 : isElite ? 66 : 52) * s;
      const barH = this.type === 'malakor' ? 12 : this.type === 'reaper' ? 10 : isBoss ? 8.5 : 6.5;
      const bx = this.x - barW / 2;
      const by = this.y - (this.type === 'malakor' ? 172 : this.type === 'reaper' ? 142 : isBoss ? 124 : 100) * s;
      const frac = Math.max(0, Math.min(1, this.hp / this.maxHP));
      const drainFrac = Math.max(0, Math.min(1, (this.drainHp ?? this.hp) / this.maxHP));
      const isHit = this.hitFlashTimer > 0;
      const isCritical = frac < 0.25;

      // ── 1. Floating Threat Crown / Crest Badge (Rendered Above Bar) ──
      const crestY = by - (isBoss ? 16 : 11) * s;
      if (this.type === 'malakor') {
        // Grand Obsidian Dragon Crown with Ruby Core
        g.fillStyle(0xb71540, 0.95);
        g.fillTriangle(this.x, crestY - 8 * s, this.x - 12 * s, crestY, this.x + 12 * s, crestY);
        g.fillStyle(0xff3838, 1);
        g.fillCircle(this.x, crestY - 3 * s, 3 * s);
        g.lineStyle(1.5 * s, 0xffd700, 1);
        g.strokeCircle(this.x, crestY - 3 * s, 3 * s);
      } else if (this.type === 'reaper') {
        // Abyssal Void Crown
        g.fillStyle(0x6c5ce7, 0.95);
        g.fillTriangle(this.x, crestY - 7 * s, this.x - 10 * s, crestY, this.x + 10 * s, crestY);
        g.fillStyle(0xdff9fb, 1);
        g.fillCircle(this.x, crestY - 2 * s, 2.5 * s);
      } else if (isBoss) {
        // Golden Titan Crown
        g.fillStyle(0xf1c40f, 1);
        g.fillTriangle(this.x, crestY - 6 * s, this.x - 8 * s, crestY, this.x + 8 * s, crestY);
        g.fillTriangle(this.x - 7 * s, crestY - 4 * s, this.x - 11 * s, crestY, this.x - 3 * s, crestY);
        g.fillTriangle(this.x + 7 * s, crestY - 4 * s, this.x + 3 * s, crestY, this.x + 11 * s, crestY);
      } else if (isElite) {
        // Silver Vanguard Skull Chevron
        g.fillStyle(0xdcdde1, 0.9);
        g.fillTriangle(this.x, crestY - 4 * s, this.x - 6 * s, crestY, this.x + 6 * s, crestY);
      }

      // ── 2. Floating Active Status Effect Pips (Above Bar) ──
      const activeIcons: { col: number; symbol: string; border: number }[] = [];
      if (this.isBurning && this.burnTimer > 0) activeIcons.push({ col: 0xff4757, symbol: 'fire', border: 0xffa502 });
      if (this.isFrozen && this.frozenTimer > 0) activeIcons.push({ col: 0x00d2d3, symbol: 'ice', border: 0xffffff });
      if (this.isPoisoned && this.poisonTimer > 0) activeIcons.push({ col: 0x2ed573, symbol: 'toxic', border: 0xa8ff78 });
      if (this.isShocked && this.shockTimer > 0) activeIcons.push({ col: 0x00f2fe, symbol: 'shock', border: 0xf1c40f });
      if (this.isSeekerLocked && this.seekerLockTimer > 0) activeIcons.push({ col: 0xd946ef, symbol: 'lock', border: 0xffffff });
      if (this.isEnraged || this.isFrenzied) activeIcons.push({ col: 0xff1744, symbol: 'rage', border: 0xff5252 });

      if (activeIcons.length > 0) {
        const iconSize = 7 * s;
        const iconSpacing = 10 * s;
        const totalW = activeIcons.length * iconSpacing;
        const startX = this.x - totalW * 0.5 + iconSize * 0.5;
        const iconY = by - (isBoss ? 24 : 16) * s;

        activeIcons.forEach((ico, idx) => {
          const ix = startX + idx * iconSpacing;
          // Glowing status pill badge
          g.fillStyle(ico.col, 0.95);
          g.fillCircle(ix, iconY, iconSize * 0.5);
          g.lineStyle(1 * s, ico.border, 1);
          g.strokeCircle(ix, iconY, iconSize * 0.5);
          // Highlight spark
          g.fillStyle(0xffffff, 0.9);
          g.fillCircle(ix - 1 * s, iconY - 1 * s, iconSize * 0.2);
        });
      }

      // ── 3. Secondary Armor / Shield Bar (Rendered Directly Above Health Bar) ──
      if (this.shield && this.shield.hp > 0) {
        const sFrac = Math.max(0, Math.min(1, this.shield.hp / (this.shield.maxHP || 75)));
        const shH = 4 * s;
        const shY = by - shH - 3;
        // Shield backplate
        g.fillStyle(0x070b14, 0.85);
        g.fillRoundedRect(bx - 2, shY - 1, barW + 4, shH + 2, 2);
        // Cyan energy shield fill
        g.fillStyle(0x00d2d3, 0.95);
        g.fillRoundedRect(bx, shY, barW * sFrac, shH, 1.5);
        // Shield icon pip
        g.fillStyle(0x00f2fe, 1);
        g.fillCircle(bx - 6, shY + shH * 0.5, 3 * s);
        g.lineStyle(1, 0xffffff, 0.9);
        g.strokeCircle(bx - 6, shY + shH * 0.5, 3 * s);
      } else if (this.helmet && this.helmet.hp > 0) {
        const hFrac = Math.max(0, Math.min(1, this.helmet.hp / (this.helmet.maxHP || 50)));
        const hlH = 4 * s;
        const hlY = by - hlH - 3;
        // Helmet backplate
        g.fillStyle(0x070b14, 0.85);
        g.fillRoundedRect(bx - 2, hlY - 1, barW + 4, hlH + 2, 2);
        // Steel armor fill
        g.fillStyle(0x95a5a6, 0.95);
        g.fillRoundedRect(bx, hlY, barW * hFrac, hlH, 1.5);
        // Helmet icon pip
        g.fillStyle(0xdcdde1, 1);
        g.fillRoundedRect(bx - 8, hlY + hlH * 0.5 - 2.5, 5, 5, 1);
      }

      // ── 4. Main Health Backplate with Critical Pulse ──
      const dangerCol = (Math.sin(Date.now() * 0.012) > 0) ? 0xff4757 : 0x7f1d1d;
      const borderCol = isHit ? 0xffffff : (isCritical ? dangerCol : (this.type === 'malakor' ? 0xff3838 : isBoss ? 0xf1c40f : isElite ? 0xa855f7 : 0x334155));
      g.fillStyle(0x060911, 0.92);
      g.fillRoundedRect(bx - 2.5, by - 2.5, barW + 5, barH + 5, 3.5);
      g.lineStyle(isBoss ? 2 : 1.2, borderCol, 0.95);
      g.strokeRoundedRect(bx - 2.5, by - 2.5, barW + 5, barH + 5, 3.5);

      // ── 5. White / Crimson Ghost Damage Drain Bar ──
      if (drainFrac > frac) {
        g.fillStyle(0xffffff, 0.85);
        g.fillRoundedRect(bx, by, barW * drainFrac, barH, 2.5);
      }

      // ── 6. Health Fill by Archetype ──
      let colMain = 0x2ecc71;
      if (this.type === 'malakor') colMain = 0xb71540;
      else if (this.type === 'voidknight') colMain = 0x6c5ce7;
      else if (this.type === 'slobber') colMain = 0x00b894;
      else if (this.type === 'harvester') colMain = 0xd63031;
      else if (this.type === 'siren') colMain = 0x00cec9;
      else if (this.type === 'reaper') colMain = 0x8854d0;
      else if (isBoss) colMain = 0xe74c3c;
      else if (this.type === 'juggernaut') colMain = 0x718093;
      else if (this.type === 'pyro') colMain = 0xe67e22;
      else if (this.type === 'stalker') colMain = 0xff5252;
      else if (this.type === 'phantom') colMain = 0xa29bfe;
      else if (this.type === 'bloater') colMain = 0x2ed573;
      else if (this.type === 'necromancer') colMain = 0xa855f7;
      else if (this.type === 'frostwight') colMain = 0x00d2d3;
      else if (this.type === 'berserker') colMain = 0xff4757;
      else if (this.type === 'crawler') colMain = 0x9b59b6;

      const fillW = Math.max(0, barW * frac);
      if (fillW > 0) {
        g.fillStyle(isHit ? 0xffffff : colMain, 1);
        g.fillRoundedRect(bx, by, fillW, barH, 2.5);

        // Gloss highlight line across top of health bar
        g.fillStyle(0xffffff, 0.42);
        g.fillRect(bx, by, fillW, barH * 0.4);
      }


    }
  }
}
