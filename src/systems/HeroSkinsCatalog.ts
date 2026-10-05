import { HeroSkinId } from '../types';

export interface HeroSkinDef {
  id: HeroSkinId;
  name: string;
  themeTitle: string;
  icon: string;
  cost: number;
  desc: string;
  tags: string[];
  accentColor: string;
}

export const HERO_SKINS_CATALOG: HeroSkinDef[] = [
  {
    id: 'default',
    name: 'Forest Warden (Classic)',
    themeTitle: 'FRONTIER EMERALD RANGER',
    icon: '🏹',
    cost: 0,
    desc: 'The legendary emerald ranger of the frontier with feathered hood, woven cloak, and rugged archer gauntlets.',
    tags: ['Emerald Hood & Cape', 'Leather Vambraces', 'Frontier Ranger Mark'],
    accentColor: '#2ecc71',
  },
  {
    id: 'shadow_assassin',
    name: 'Shadow Assassin Archer',
    themeTitle: 'OBSIDIAN NIGHTSTALKER',
    icon: '🥷',
    cost: 60,
    desc: 'Black hooded cloak with ragged shadows, dark ninja cloth mask, stealth vambraces, and piercing glowing violet demonic eyes.',
    tags: ['Glowing Violet Eyes', 'Ragged Shadow Shroud', 'Stealth Shinobi Garb'],
    accentColor: '#a855f7',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Ranger',
    themeTitle: 'NEO-TOKYO CYBERNETIC SNIPER',
    icon: '⚡',
    cost: 75,
    desc: 'Neon cyber-visor with digital HUD optics, carbon techwear suit, neon leg emitters, and holographic bow luminescence.',
    tags: ['Neon Cyan Cyber-Visor', 'Holographic Bow Glow', 'Carbon Techwear Suit'],
    accentColor: '#00d2d3',
  },
  {
    id: 'valkyrie',
    name: 'Valkyrie Hunter',
    themeTitle: 'HEAVENLY SHIELDMAIDEN',
    icon: '🪽',
    cost: 90,
    desc: 'Majestic golden winged helmet, polished solar battle cuirass, radiant golden aura, and flowing glowing holy wings cape.',
    tags: ['Golden Winged Helmet', 'Glowing Holy Wings Cape', 'Solar Battle Cuirass'],
    accentColor: '#f1c40f',
  },
  {
    id: 'skeleton',
    name: 'Undead Skeleton Marksman',
    themeTitle: 'CRYPT REVENANT SHADOW',
    icon: '💀',
    cost: 100,
    desc: 'Turn the tables and play as an undead marksman with bleached bone anatomy, tattered burial shroud, and spectral soul-fire eyes!',
    tags: ['Play as Undead Marksman', 'Spectral Soul-Fire Eyes', 'Bleached Bone Anatomy'],
    accentColor: '#e74c3c',
  },
];
