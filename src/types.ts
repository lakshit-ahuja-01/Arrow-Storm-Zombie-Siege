export type BowType =
  | 'normal'
  | 'fire'
  | 'ice'
  | 'triple'
  | 'buzzsaw'
  | 'tesla'
  | 'holy'
  | 'cluster'
  | 'viper'
  | 'ballista'
  | 'blackhole'
  | 'storm'
  | 'ricochet'
  | 'homing';

export const BOW_METADATA: Record<BowType, { name: string; icon: string }> = {
  normal: { name: 'STANDARD', icon: '🏹' },
  fire: { name: 'MOLOTOV', icon: '🔥' },
  ice: { name: 'CRYO FROST', icon: '❄️' },
  triple: { name: 'MULTISHOT', icon: '🏹' },
  viper: { name: 'VIPER TOXIN', icon: '🐍' },
  buzzsaw: { name: 'BUZZSAW', icon: '🪚' },
  tesla: { name: 'TESLA SHOCK', icon: '⚡' },
  ricochet: { name: 'RICOCHET', icon: '💫' },
  holy: { name: 'RADIANT', icon: '✝️' },
  homing: { name: 'SEEKER', icon: '🎯' },
  storm: { name: 'STORM RAIN', icon: '🌩️' },
  cluster: { name: 'CLUSTER BOMB', icon: '💣' },
  ballista: { name: 'BALLISTA', icon: '🔱' },
  blackhole: { name: 'GRAVITON', icon: '🌀' }
};

export type GameMode = 'campaign' | 'endless';

export type ZombieType =
  | 'walker'       // Level 1: Rotten Shambler (Easy, 35 HP, slow)
  | 'crawler'      // Level 2: Feral Crawler (Low lunges, fast)
  | 'buckethead'   // Level 3: Armored Buckethead (Helmet shield)
  | 'bloater'      // Level 4: Volatile Bloater (Acid spit & explosion)
  | 'skeleton'     // Level 5: Crypt Skeleton Archer (Ranged bone arrows)
  | 'necromancer'  // Level 6: Dark Necromancer (Shadow skulls & summon)
  | 'centurion'    // Level 7: Shielded Centurion (Riot shield blocking torso)
  | 'berserker'    // Level 8: Cleaver Berserker (Blood rage +100% speed)
  | 'frostwight'   // Level 9: Cryo Wight (Glacial cryo armor & slow shards)
  | 'boss'         // Level 10: Gargantuar Titan (Mid-Boss, 750 HP, seismic slams)
  | 'phantom'      // Level 11: Phantom Wraith (Teleporting Banshee & sonic waves)
  | 'pyro'         // Level 12: Infernal Immolator (Magma Firebombs & death crater)
  | 'stalker'      // Level 13: Shadow Stalker (High-leaping predator & shadow blades)
  | 'juggernaut'   // Level 14: Dread Juggernaut (Ironclad Battering Ram & charge)
  | 'reaper'       // Level 15: Abyssal Lich King (Void Sovereign & meteors)
  | 'siren'        // Level 16: Corpse Siren Banshee (Horde Frenzy Scream & sonic wail)
  | 'harvester'    // Level 17: Plague Harvester Butcher (Soul Leech Regen & flying cleavers)
  | 'slobber'      // Level 18: Caustic Acid Slobber (Triple acid cluster & 40% pierce armor)
  | 'voidknight'   // Level 19: Void Revenant Warmaster (Runic energy ward & abyssal rift slashes)
  | 'malakor';     // Level 20: Malakor Eldritch Dragon Titan (Grand Apex God Boss, 4200 HP)

export type HeroSkinId = 'default' | 'shadow_assassin' | 'cyberpunk' | 'valkyrie' | 'skeleton';

export type UpgradeCategory = 'bows' | 'archer' | 'tower' | 'special';

export interface UpgradeItem {
  id: string;
  category: UpgradeCategory;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  statLabel: string;
  apply: (p: any, tower?: any) => void;
  oneTime?: boolean;
  repeatable?: boolean;
  maxLevel?: number;
  level?: number;
  bought?: boolean;
}

export type GameState = 'menu' | 'playing' | 'shop' | 'pause' | 'gameover' | 'victory' | 'wardrobe';

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  scale: number;
}
