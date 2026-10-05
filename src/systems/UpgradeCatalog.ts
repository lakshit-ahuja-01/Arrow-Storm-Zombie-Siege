import { UpgradeItem, UpgradeCategory } from '../types';

export const BASE_UPGRADES: UpgradeItem[] = [
  // ═════════════════════════════════════════════
  // 🏹 WEAPON ARSENAL (BOWS & PROJECTILE ARCHETYPES)
  // ═════════════════════════════════════════════
  {
    id: 'normal',
    category: 'bows',
    name: 'Standard Recurve Bow',
    icon: '🏹',
    desc: 'Reliable wooden recurve bow with steady firing rate and kinetic pierce',
    cost: 0,
    statLabel: '25 Dmg • Standard Kinetic',
    apply: (p: any) => { p.bowType = 'normal'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('normal') : 25; },
    oneTime: true,
    bought: true,
  },
  {
    id: 'fire',
    category: 'bows',
    name: 'Molotov Fire Bow',
    icon: '🔥',
    desc: 'Ignites zombies in spreading fire, burning 8 DPS for 2.2s',
    cost: 35,
    statLabel: '30 Dmg • Spreading Fire DOT',
    apply: (p: any) => { p.bowType = 'fire'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('fire') : 30; },
    oneTime: true,
  },
  {
    id: 'ice',
    category: 'bows',
    name: 'Cryo Frost Bow',
    icon: '❄️',
    desc: 'Freezes zombies solid for 3.5s; frozen foes take 2.5x shatter damage!',
    cost: 40,
    statLabel: '31 Dmg • 3.5s Freeze & Shatter Crit',
    apply: (p: any) => { p.bowType = 'ice'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('ice') : 31; },
    oneTime: true,
  },
  {
    id: 'triple',
    category: 'bows',
    name: 'Triple Multishot Bow',
    icon: '🏹',
    desc: 'Fires 3 deadly arrows simultaneously in a cone spread',
    cost: 45,
    statLabel: '27x3 Dmg • 3x Spread Arrows',
    apply: (p: any) => { p.bowType = 'triple'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('triple') : 27; },
    oneTime: true,
  },
  {
    id: 'viper',
    category: 'bows',
    name: 'Toxic Viper Bow',
    icon: '🐍',
    desc: 'Venomous darts inflict ramping neurotoxin poison dealing 35 DPS',
    cost: 45,
    statLabel: '32 Dmg • 35 Poison DPS',
    apply: (p: any) => { p.bowType = 'viper'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('viper') : 32; },
    oneTime: true,
  },
  {
    id: 'buzzsaw',
    category: 'bows',
    name: 'Buzzsaw Shredder',
    icon: '🪚',
    desc: 'Slices through up to 3 zombies in a line, amputating limbs',
    cost: 50,
    statLabel: '34 Dmg • 3-Target Piercing Sever',
    apply: (p: any) => { p.bowType = 'buzzsaw'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('buzzsaw') : 34; },
    oneTime: true,
  },
  {
    id: 'tesla',
    category: 'bows',
    name: 'Tesla Lightning Bow',
    icon: '⚡',
    desc: 'Chains high-voltage electric arcs across 4 nearby undead',
    cost: 55,
    statLabel: '36 Dmg • 4-Target Chain Shock',
    apply: (p: any) => { p.bowType = 'tesla'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('tesla') : 36; },
    oneTime: true,
  },
  {
    id: 'ricochet',
    category: 'bows',
    name: 'Ricochet Bouncer Bow',
    icon: '💫',
    desc: 'Arrows bounce between up to 3 nearby enemies on impact, chaining destruction',
    cost: 55,
    statLabel: '36 Dmg • 3 Chain Bounces',
    apply: (p: any) => { p.bowType = 'ricochet'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('ricochet') : 36; },
    oneTime: true,
  },
  {
    id: 'holy',
    category: 'bows',
    name: 'Holy Radiant Spear',
    icon: '✝️',
    desc: 'Divine light that pierces through up to 4 zombies with crits',
    cost: 60,
    statLabel: '38 Dmg • 4x Divine Pierce & Smite',
    apply: (p: any) => { p.bowType = 'holy'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('holy') : 38; },
    oneTime: true,
  },
  {
    id: 'homing',
    category: 'bows',
    name: 'Homing Seeker Bow',
    icon: '🎯',
    desc: 'Enchanted arrows subtly curve toward the nearest undead target mid-flight',
    cost: 60,
    statLabel: '37 Dmg • Guided Auto-Curving',
    apply: (p: any) => { p.bowType = 'homing'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('homing') : 37; },
    oneTime: true,
  },
  {
    id: 'storm',
    category: 'bows',
    name: 'Storm Rain Bow',
    icon: '🌩️',
    desc: 'Releases 5 arrows in a wide arc raining down from above like a storm barrage',
    cost: 65,
    statLabel: '28x5 Dmg • 5x Storm Barrage',
    apply: (p: any) => { p.bowType = 'storm'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('storm') : 28; },
    oneTime: true,
  },
  {
    id: 'cluster',
    category: 'bows',
    name: 'Cluster Bomb Bow',
    icon: '💣',
    desc: 'Heavy explosive arrow launching zombies into ragdoll orbits',
    cost: 70,
    statLabel: '40 Dmg • 140px Blast AOE',
    apply: (p: any) => { p.bowType = 'cluster'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('cluster') : 40; },
    oneTime: true,
  },
  {
    id: 'ballista',
    category: 'bows',
    name: 'Siege Harpoon Ballista',
    icon: '🔱',
    desc: 'Fires massive steel harpoons piercing 5 zombies with 3.5x knockback',
    cost: 75,
    statLabel: '44 Dmg • 5x Pierce & Heavy Slam',
    apply: (p: any) => { p.bowType = 'ballista'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('ballista') : 44; },
    oneTime: true,
  },
  {
    id: 'blackhole',
    category: 'bows',
    name: 'Vortex Graviton Bow',
    icon: '🌀',
    desc: 'Impact generates a gravity vortex pulling all nearby undead into a singularity',
    cost: 90,
    statLabel: '48 Dmg • Singularity Vortex Pull',
    apply: (p: any) => { p.bowType = 'blackhole'; p.arrowDamage = p.getBowBaseDamage ? p.getBowBaseDamage('blackhole') : 48; },
    oneTime: true,
  },

  // ═════════════════════════════════════════════
  // ⚔️ HERO ARCHER PERKS (STATS & PASSIVES)
  // ═════════════════════════════════════════════
  {
    id: 'dmg1',
    category: 'archer',
    name: 'Razor Broadheads',
    icon: '🗡️',
    desc: 'Sharpened broadhead tips deal +30% arrow damage per level',
    cost: 25,
    statLabel: '+30% Base Arrow Damage',
    apply: (p: any) => { p.damageMul = (p.damageMul || 1) * 1.30; },
    maxLevel: 5,
    level: 0,
  },
  {
    id: 'drawSpeed',
    category: 'archer',
    name: 'Quick-Draw Reflexes',
    icon: '⚡',
    desc: 'Draw and charge bow +25% faster for rapid barrages',
    cost: 25,
    statLabel: '+25% Charge Draw Speed',
    apply: (p: any) => { p.chargeSpeedMul = (p.chargeSpeedMul || 1) * 1.25; },
    maxLevel: 4,
    level: 0,
  },
  {
    id: 'vitality',
    category: 'archer',
    name: 'Vitality Elixir',
    icon: '❤️',
    desc: '+35 Archer Max HP & instantly heals to full health',
    cost: 30,
    statLabel: '+35 Max HP & Full Heal',
    apply: (p: any) => { p.maxHP += 35; p.hp = p.maxHP; },
    maxLevel: 4,
    level: 0,
  },
  {
    id: 'doubleJump',
    category: 'archer',
    name: 'Falcon Wings (Double Jump)',
    icon: '🪽',
    desc: 'Unlocks mid-air double jump! Press [SPACE] in air to leap over deadly enemy volleys and acid bile',
    cost: 50,
    statLabel: 'Double Jump [SPACE] in Air',
    apply: (p: any) => { p.maxJumps = 2; p.jumpsLeft = 2; },
    oneTime: true,
  },
  {
    id: 'ironArmor',
    category: 'archer',
    name: 'Reinforced Iron Mail',
    icon: '🛡️',
    desc: 'Hardened armor plates reduce all incoming damage to the Archer by 30%',
    cost: 40,
    statLabel: '-30% Damage Taken',
    apply: (p: any) => { p.armorMul = (p.armorMul || 1) * 0.70; },
    maxLevel: 2,
    level: 0,
  },
  {
    id: 'aerialStrike',
    category: 'archer',
    name: 'Apex Predator (Air Snipe)',
    icon: '🦅',
    desc: 'Arrows shot while jumping deal +50% bonus critical damage and pierce through shields!',
    cost: 45,
    statLabel: '+50% Mid-Air Arrow Damage',
    apply: (p: any) => { p.aerialSnipeBonus = (p.aerialSnipeBonus || 0) + 0.50; },
    maxLevel: 2,
    level: 0,
  },
  {
    id: 'windWalker',
    category: 'archer',
    name: 'Wind Walker Agility',
    icon: '👟',
    desc: 'Boosts jump height and activates slow-mo matrix aim while airborne!',
    cost: 40,
    statLabel: 'Airborne Slow-Mo Matrix Aim',
    apply: (p: any) => { p.windWalkerLevel = (p.windWalkerLevel || 0) + 1; },
    maxLevel: 2,
    level: 0,
  },
  {
    id: 'magnet',
    category: 'archer',
    name: 'Bounty Hunter',
    icon: '🧲',
    desc: '+25% more skull bounties from all zombie kills',
    cost: 35,
    statLabel: '+25% Skull Drop Bounty',
    apply: (p: any) => { p.bountyMul = (p.bountyMul || 1) * 1.25; },
    maxLevel: 3,
    level: 0,
  },
  {
    id: 'eagleEye',
    category: 'archer',
    name: 'Eagle Eye Precision',
    icon: '🎯',
    desc: 'Increases Headshot critical damage multiplier from 2.8x up to 4.6x!',
    cost: 35,
    statLabel: '+0.6x Headshot Crit Multiplier',
    apply: (p: any) => { p.eagleEyeLevel = (p.eagleEyeLevel || 0) + 1; },
    maxLevel: 3,
    level: 0,
  },
  {
    id: 'adrenaline',
    category: 'archer',
    name: 'Adrenaline Surge',
    icon: '🔥',
    desc: 'Scoring a kill triggers a 3.5s frenzy burst: +60% draw speed & faster arrows!',
    cost: 40,
    statLabel: 'Frenzy Rush: +60% Draw on Kill',
    apply: (p: any) => { p.adrenalineLevel = (p.adrenalineLevel || 0) + 1; },
    maxLevel: 3,
    level: 0,
  },
  {
    id: 'ghostArrow',
    category: 'archer',
    name: 'Phantom Quiver',
    icon: '👻',
    desc: 'Empowers siege weapons with +1 pierce penetration, and grants +15% armor-shredding damage to all arrows!',
    cost: 50,
    statLabel: '+1 Pierce for Siege / +15% Armor Shred',
    apply: (p: any) => { p.ghostArrowLevel = (p.ghostArrowLevel || 0) + 1; },
    maxLevel: 2,
    level: 0,
  },
  {
    id: 'ironLungs',
    category: 'archer',
    name: 'Iron Lungs (Max Stamina)',
    icon: '🫁',
    desc: 'Increases Archer Max Stamina by +35 per tier, allowing you to draw and fire more arrows before exhaustion!',
    cost: 30,
    statLabel: '+35 Max Stamina Gauge',
    apply: (p: any) => {
      p.maxStamina = (p.maxStamina || 100) + 35;
      p.stamina = p.maxStamina;
    },
    maxLevel: 4,
    level: 0,
  },
  {
    id: 'rapidRecovery',
    category: 'archer',
    name: 'Combat Conditioning (Stamina)',
    icon: '⚡',
    desc: 'Stamina regenerates +30% faster and slaying zombies grants +3 additional stamina recovery (+5 on headshots)!',
    cost: 35,
    statLabel: '+30% Regen & +3 Kill Recovery',
    apply: (p: any) => {
      p.staminaRegenRate = (p.staminaRegenRate || 7.0) * 1.30;
      p.staminaKillBonus = (p.staminaKillBonus || 6) + 3;
      p.staminaHeadshotBonus = (p.staminaHeadshotBonus || 12) + 5;
    },
    maxLevel: 3,
    level: 0,
  },

  // ═════════════════════════════════════════════
  // 🏰 FORTRESS DEFENSES & TRAPS
  // ═════════════════════════════════════════════
  {
    id: 'fieldRepair',
    category: 'tower',
    name: 'Emergency Planks',
    icon: '🔨',
    desc: 'Instantly restores +150 Health to the barricade',
    cost: 20,
    statLabel: '+150 Instant Barricade HP',
    apply: (_p: any, tower: any) => { if (tower) tower.repair(150); },
    repeatable: true,
  },
  {
    id: 'towerHP',
    category: 'tower',
    name: 'Fortify Barricade',
    icon: '🏰',
    desc: '+120 Tower Max HP and fully repairs the barricade',
    cost: 35,
    statLabel: '+120 Barricade HP & Repair',
    apply: (_p: any, tower: any) => { if (tower) { tower.maxHP += 120; tower.repair(120); } },
    maxLevel: 5,
    level: 0,
  },
  {
    id: 'spikes',
    category: 'tower',
    name: 'Spiked Iron Railing',
    icon: '🛡️',
    desc: 'Zombies clawing the barricade take 32 return damage per second',
    cost: 40,
    statLabel: 'Thorns: 32 DPS Retaliation',
    apply: (_p: any, tower: any) => { if (tower) tower.hasSpikes = true; },
    oneTime: true,
  },
  {
    id: 'caltrops',
    category: 'tower',
    name: 'Caltrop Spike Moat',
    icon: '⚙️',
    desc: 'Covers ground ahead with sharp steel spikes; slows foes 45% & inflicts 15 bleed DPS',
    cost: 45,
    statLabel: 'Slow Moat: 45% Slow + 15 Bleed DPS',
    apply: (_p: any, tower: any) => { if (tower) tower.hasCaltrops = true; },
    oneTime: true,
  },
  {
    id: 'banner',
    category: 'tower',
    name: 'War Banner of Valor',
    icon: '🚩',
    desc: 'Elevates a royal crest granting +20% hero damage aura & +12 barricade HP regen every 4s',
    cost: 50,
    statLabel: '+20% Damage Aura & +12 HP/4s Regen',
    apply: (_p: any, tower: any) => { if (tower) { tower.hasBanner = true; tower.bannerLevel = (tower.bannerLevel || 0) + 1; } },
    maxLevel: 2,
    level: 0,
  },
  {
    id: 'tarMoat',
    category: 'tower',
    name: 'Flaming Tar Trench',
    icon: '🌋',
    desc: 'Ignites a boiling ditch of flaming pitch dealing continuous fire damage to oncoming walkers',
    cost: 55,
    statLabel: 'Trap: 14 Fire DPS Moat',
    apply: (_p: any, tower: any) => { if (tower) tower.hasTarMoat = true; },
    oneTime: true,
  },
  {
    id: 'pitchPits',
    category: 'tower',
    name: 'Pitch Pits (Tar Pools)',
    icon: '🛢️',
    desc: 'Excavates viscous pitch pits across the battlefield that slow zombies by 52%. Fire & explosive arrows ignite them into roaring infernos!',
    cost: 45,
    statLabel: 'Hazard: 52% Slow + Fire Arrow Inferno',
    apply: (_p: any, tower: any) => {
      if (tower) {
        tower.hasPitchPits = true;
        (tower.scene as any)?.setupBattlefieldHazards?.();
      }
    },
    oneTime: true,
  },
  {
    id: 'gunpowderBarrels',
    category: 'tower',
    name: 'Gunpowder Barrels',
    icon: '💣',
    desc: 'Deploys high-explosive powder kegs along the battlefield. Arrow impacts ignite the fuse triggering a massive 160px AoE demolition blast!',
    cost: 50,
    statLabel: 'Hazard: 160px Detonation (120-180 AoE)',
    apply: (_p: any, tower: any) => {
      if (tower) {
        tower.hasGunpowderBarrels = true;
        (tower.scene as any)?.setupBattlefieldHazards?.();
      }
    },
    oneTime: true,
  },
  {
    id: 'sentry',
    category: 'tower',
    name: 'Auto-Crossbow Turret',
    icon: '🏹',
    desc: 'Mounts a rooftop clockwork ballista that automatically targets & snipes oncoming zombies!',
    cost: 65,
    statLabel: 'Auto-Turret: 1.1s Rapid Sniper',
    apply: (_p: any, tower: any) => { if (tower) tower.sentryLevel = (tower.sentryLevel || 0) + 1; },
    maxLevel: 3,
    level: 0,
  },

  // ═════════════════════════════════════════════
  // ⚔️ NEW HERO ARCHER PERKS
  // ═════════════════════════════════════════════
  {
    id: 'ironConstitution',
    category: 'archer',
    name: 'Iron Constitution',
    icon: '🛡️',
    desc: 'Hardens the archer\'s body, reducing all incoming damage by 12% per level',
    cost: 30,
    statLabel: '-12% Incoming Damage Reduction',
    apply: (p: any) => { p.damageMul = (p.damageMul || 1); p.damageReduction = (p.damageReduction || 0) + 0.12; },
    maxLevel: 3,
    level: 0,
  },
  {
    id: 'arrowSmith',
    category: 'archer',
    name: 'Arrowsmith Expertise',
    icon: '🔧',
    desc: 'Master arrow-crafting increases projectile velocity by +18% per level',
    cost: 25,
    statLabel: '+18% Arrow Flight Speed',
    apply: (p: any) => { p.arrowSpeed = (p.arrowSpeed || 1250) * 1.18; },
    maxLevel: 4,
    level: 0,
  },
  {
    id: 'marksmanFocus',
    category: 'archer',
    name: 'Marksman Focus',
    icon: '🎯',
    desc: 'When fully charged, arrow deals +45% bonus damage for the perfect shot',
    cost: 35,
    statLabel: 'Full Charge: +45% Damage Bonus',
    apply: (p: any) => { p.fullChargeDmgBonus = (p.fullChargeDmgBonus || 0) + 0.45; },
    maxLevel: 3,
    level: 0,
  },
  {
    id: 'marksmanEye',
    category: 'archer',
    name: "Marksman's Focus",
    icon: '🎯',
    desc: 'Hones eagle-eyed precision, granting +35% Headshot Critical Damage and +15% Arrow Velocity!',
    cost: 35,
    statLabel: '+35% Headshot Crit & +15% Velocity',
    apply: (p: any) => {
      p.headshotCritBonus = (p.headshotCritBonus || 0) + 0.35;
      p.arrowSpeed = (p.arrowSpeed || 1400) * 1.15;
    },
    oneTime: true,
  },
  {
    id: 'secondWind',
    category: 'archer',
    name: 'Second Wind',
    icon: '💨',
    desc: 'Once per wave, auto-revive with 40% HP when you would be slain. Ready for next wave!',
    cost: 65,
    statLabel: 'Passive: Auto-Revive 40% HP Once',
    apply: (p: any) => { p.hasSecondWind = true; p.secondWindReady = true; },
    oneTime: true,
  },
  {
    id: 'berserkerRage',
    category: 'archer',
    name: 'Berserker Rage',
    icon: '😤',
    desc: 'At low HP (<30%), enter a berserk state dealing +80% damage and 50% faster charging',
    cost: 45,
    statLabel: 'Berserk <30% HP: +80% Dmg & Speed',
    apply: (p: any) => { p.berserkerLevel = (p.berserkerLevel || 0) + 1; },
    maxLevel: 2,
    level: 0,
  },

  // ═════════════════════════════════════════════
  // 🏰 NEW FORTRESS DEFENSES & TRAPS
  // ═════════════════════════════════════════════
  {
    id: 'ironGate',
    category: 'tower',
    name: 'Reinforced Iron Gate',
    icon: '⛩️',
    desc: 'Fortifies the barricade with iron plating, reducing all tower damage taken by 20%',
    cost: 45,
    statLabel: '-20% Tower Damage Received',
    apply: (_p: any, tower: any) => { if (tower) { tower.damageReduction = (tower.damageReduction || 0) + 0.20; } },
    maxLevel: 2,
    level: 0,
  },
  {
    id: 'healingShrine',
    category: 'tower',
    name: 'Holy Healing Shrine',
    icon: '⚕️',
    desc: 'A radiant shrine channels ancient magic, restoring +3 Tower HP every second passively',
    cost: 50,
    statLabel: '+3 HP/s Passive Tower Regen',
    apply: (_p: any, tower: any) => { if (tower) tower.hpRegen = (tower.hpRegen || 0) + 3; },
    maxLevel: 3,
    level: 0,
  },
  {
    id: 'trebuchet',
    category: 'tower',
    name: 'Siege Trebuchet',
    icon: '⚔️',
    desc: 'Installs a rooftop war trebuchet that hurls boulders at zombies every 4s for 90 AoE damage',
    cost: 75,
    statLabel: 'Trebuchet: 90 AoE every 4s',
    apply: (_p: any, tower: any) => { if (tower) tower.hasTrebuchet = true; },
    oneTime: true,
  },
  {
    id: 'smokeScreen',
    category: 'tower',
    name: 'Smoke Grenade Arsenal',
    icon: '💨',
    desc: 'Deploys smoke bombs that reduce zombie accuracy and movement speed by 35% in the zone',
    cost: 45,
    statLabel: 'Smoke Zone: 35% Zombie Slow Cloud',
    apply: (_p: any, tower: any) => { if (tower) tower.hasSmokeScreen = true; },
    oneTime: true,
  },

  // ═════════════════════════════════════════════
  // 💎 SPECIAL ELITE TIER & TACTICAL ULTIMATE SKILLS
  // ═════════════════════════════════════════════
  {
    id: 'nukeStrike',
    category: 'special',
    name: '☢️ Orbital Nuclear Strike',
    icon: '💥',
    desc: 'Calls down an orbital nuclear bombardment wiping out every undead on screen for 450 AoE damage! Press [R] in combat.',
    cost: 95,
    statLabel: '+1 Tactical Strike Charge • [R] Hotkey',
    apply: (p: any) => {
      p.nukeCharges = (p.nukeCharges || 0) + 1;
      const s = p.scene || (window as any).game?.scene?.getScene('MainScene');
      s?.updateSkillsHUD?.();
    },
    repeatable: true,
  },
  {
    id: 'lightningStorm',
    category: 'special',
    name: '⚡ Chain Lightning Tempest',
    icon: '⚡',
    desc: 'Summons a cataclysmic 100,000-volt hyper-lightning storm! Towering thunderbolts strike from the heavens and chain across every undead on screen for 260 shock damage & paralysis! Press [T] in combat.',
    cost: 75,
    statLabel: '+1 Lightning Tempest Charge • [T] Hotkey',
    apply: (p: any) => {
      p.lightningCharges = (p.lightningCharges || 0) + 1;
      const s = p.scene || (window as any).game?.scene?.getScene('MainScene');
      s?.updateSkillsHUD?.();
    },
    repeatable: true,
  },
  {
    id: 'godMode',
    category: 'special',
    name: '✨ Divine Aegis Shield',
    icon: '🌟',
    desc: 'Holy aegis grants 6s total invulnerability & +60 HP recovery to hero and barricade! Press [G] in combat.',
    cost: 80,
    statLabel: '+1 Invulnerability Charge • [G] Hotkey',
    apply: (p: any) => {
      p.divineAegisCharges = (p.divineAegisCharges || 0) + 1;
      const s = p.scene || (window as any).game?.scene?.getScene('MainScene');
      s?.updateSkillsHUD?.();
    },
    repeatable: true,
  },
  {
    id: 'unlockVolley',
    category: 'special',
    name: '🔥 Rain of Fire Volley [F]',
    icon: '🔥',
    desc: 'Starting one-time unlock: Unleashes catastrophic barrages of 28+ flaming arrows to incinerate the undead horde! Press [F] in combat.',
    cost: 300,
    statLabel: 'Unlock Active [F] Rain of Fire Skill',
    apply: (p: any) => {
      const s = p.scene || (window as any).game?.scene?.getScene('MainScene');
      if (s) {
        s.hasVolleyUnlocked = true;
        s.updateSkillsHUD?.();
      }
    },
    oneTime: true,
  },
  {
    id: 'volleyMastery',
    category: 'special',
    name: '🔥 Rain of Fire Volley Mastery',
    icon: '🏹',
    desc: 'Upgrades your [F] Volley skill: -4s cooldown & +10 flaming arrows per tier for catastrophic barrages!',
    cost: 35,
    statLabel: '-4s Cooldown & +10 Extra Arrows',
    apply: (p: any) => {
      const s = p.scene || (window as any).game?.scene?.getScene('MainScene');
      if (s) {
        s.volleyMaxCooldown = Math.max(12, (s.volleyMaxCooldown || 24) - 4);
        s.volleyArrowCount = (s.volleyArrowCount || 28) + 10;
        s.updateSkillsHUD?.();
      }
    },
    maxLevel: 3,
    level: 0,
  },
  {
    id: 'unlockFrostNova',
    category: 'special',
    name: '❄️ Glacial Frost Nova [E]',
    icon: '❄️',
    desc: 'Starting one-time unlock: Instantly flash-freezes ALL active zombies solid in cryogenic ice for 4.5 seconds! Press [E] in combat.',
    cost: 500,
    statLabel: 'Unlock Active [E] Permafrost Freeze Nova',
    apply: (p: any) => {
      const s = p.scene || (window as any).game?.scene?.getScene('MainScene');
      if (s) {
        s.hasFrostNovaUnlocked = true;
        s.updateSkillsHUD?.();
      }
    },
    oneTime: true,
  },
  {
    id: 'frostMastery',
    category: 'special',
    name: '❄️ Glacial Frost Nova Mastery',
    icon: '🧊',
    desc: 'Upgrades your [E] Frost Nova skill: -5s cooldown, +1.2s freeze duration, and inflicts 60 shatter AoE damage to all frozen foes!',
    cost: 40,
    statLabel: '-5s Cooldown, +1.2s Freeze & 60 AoE Dmg',
    apply: (p: any) => {
      const s = p.scene || (window as any).game?.scene?.getScene('MainScene');
      if (s) {
        s.frostNovaMaxCooldown = Math.max(14, (s.frostNovaMaxCooldown || 28) - 5);
        s.frostNovaDuration = (s.frostNovaDuration || 4.5) + 1.2;
        s.frostNovaDamage = (s.frostNovaDamage || 0) + 60;
        s.updateSkillsHUD?.();
      }
    },
    maxLevel: 3,
    level: 0,
  },
];

export function createUpgradeCatalog(): UpgradeItem[] {
  return BASE_UPGRADES.map(u => ({ ...u, level: 0, bought: u.id === 'normal' ? true : false }));
}
