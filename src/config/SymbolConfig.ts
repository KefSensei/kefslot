export interface SymbolDef {
  id: string;
  name: string;
  color: number;
  shape: 'circle' | 'diamond' | 'square' | 'triangle' | 'star' | 'hexagon';
  value: number; // base score value
  weight: number; // spawn probability weight (higher = more common)
  isWild?: boolean;
  isScatter?: boolean;
  isMultiplier?: boolean;
  isFire?: boolean; // Issue #19: melts adjacent blockers on match
  isPrestige?: boolean; // Issue #20: ultra-rare 5x value
  unlockLevel: number; // level at which this symbol becomes available
}

export const SymbolConfig: SymbolDef[] = [
  // ============================================
  // World 1: Enchanted Meadow (Levels 1-10)
  // ============================================
  { id: 'ruby', name: 'Ruby', color: 0xe74c3c, shape: 'diamond', value: 10, weight: 30, unlockLevel: 1 },
  { id: 'emerald', name: 'Emerald', color: 0x2ecc71, shape: 'diamond', value: 10, weight: 30, unlockLevel: 1 },
  { id: 'sapphire', name: 'Sapphire', color: 0x3498db, shape: 'circle', value: 10, weight: 30, unlockLevel: 1 },
  { id: 'amethyst', name: 'Amethyst', color: 0x9b59b6, shape: 'circle', value: 15, weight: 25, unlockLevel: 1 },
  { id: 'topaz', name: 'Topaz', color: 0xf39c12, shape: 'triangle', value: 15, weight: 25, unlockLevel: 1 },
  { id: 'potion', name: 'Magic Potion', color: 0xe91e63, shape: 'square', value: 20, weight: 15, unlockLevel: 2 },

  // Special symbols (World 1)
  {
    id: 'roxy',
    name: 'Roxy',
    color: 0xf1c40f,
    shape: 'star',
    value: 25,
    weight: 5,
    unlockLevel: 1,
    isWild: true,
  },
  {
    id: 'scatter',
    name: 'Magic Scroll',
    color: 0x1abc9c,
    shape: 'hexagon',
    value: 0,
    weight: 8,
    unlockLevel: 4,
    isScatter: true,
  },
  {
    id: 'multiplier',
    name: 'Multiplier Orb',
    color: 0xff6b6b,
    shape: 'circle',
    value: 0,
    weight: 6,
    unlockLevel: 5,
    isMultiplier: true,
  },

  // ============================================
  // World 2: Crystal Caverns (Levels 11-20)
  // ============================================
  { id: 'crystal', name: 'Crystal', color: 0x00d2ff, shape: 'diamond', value: 20, weight: 25, unlockLevel: 11 },
  { id: 'mushroom', name: 'Glowshroom', color: 0xff9ff3, shape: 'triangle', value: 15, weight: 25, unlockLevel: 11 },
  { id: 'bat', name: 'Cave Bat', color: 0x636e72, shape: 'square', value: 25, weight: 20, unlockLevel: 11 },

  // ============================================
  // World 3: Volcanic Forge (Levels 21-30)
  // ============================================
  { id: 'obsidian', name: 'Obsidian', color: 0x2d3436, shape: 'diamond', value: 20, weight: 25, unlockLevel: 21 },
  { id: 'magma', name: 'Magma Stone', color: 0xff6348, shape: 'circle', value: 20, weight: 25, unlockLevel: 21 },
  { id: 'ember', name: 'Ember', color: 0xff9f43, shape: 'triangle', value: 15, weight: 25, unlockLevel: 21 },
  { id: 'slag', name: 'Volcanic Slag', color: 0x6d4c41, shape: 'square', value: 15, weight: 25, unlockLevel: 21 },

  // ============================================
  // World 4: Sunken Ruins (Levels 31-40)
  // ============================================
  { id: 'pearl', name: 'Pearl', color: 0xffeaa7, shape: 'circle', value: 20, weight: 25, unlockLevel: 31 },
  { id: 'coral', name: 'Coral', color: 0xfd79a8, shape: 'triangle', value: 15, weight: 25, unlockLevel: 31 },
  { id: 'shell', name: 'Sea Shell', color: 0xdfe6e9, shape: 'hexagon', value: 15, weight: 25, unlockLevel: 31 },
  { id: 'trident', name: 'Trident Shard', color: 0x0984e3, shape: 'diamond', value: 20, weight: 20, unlockLevel: 31 },

  // ============================================
  // World 5: Skyward Spire (Levels 41-50)
  // ============================================
  { id: 'cloud', name: 'Cloud Gem', color: 0xb2bec3, shape: 'circle', value: 15, weight: 25, unlockLevel: 41 },
  {
    id: 'lightning',
    name: 'Lightning Bolt',
    color: 0xfdcb6e,
    shape: 'triangle',
    value: 20,
    weight: 25,
    unlockLevel: 41,
  },
  { id: 'wind', name: 'Wind Crystal', color: 0x74b9ff, shape: 'diamond', value: 20, weight: 25, unlockLevel: 41 },
  { id: 'feather', name: 'Sky Feather', color: 0xa29bfe, shape: 'hexagon', value: 15, weight: 25, unlockLevel: 41 },

  // ============================================
  // World 6: Shadow Forest (Levels 51-60)
  // ============================================
  { id: 'moonstone', name: 'Moonstone', color: 0xc8d6e5, shape: 'circle', value: 20, weight: 25, unlockLevel: 51 },
  { id: 'nightbloom', name: 'Nightbloom', color: 0xa55eea, shape: 'triangle', value: 15, weight: 25, unlockLevel: 51 },
  { id: 'shadowgem', name: 'Shadow Gem', color: 0x2c2c54, shape: 'diamond', value: 20, weight: 25, unlockLevel: 51 },
  { id: 'spore', name: 'Glow Spore', color: 0x26de81, shape: 'square', value: 15, weight: 25, unlockLevel: 51 },

  // ============================================
  // World 7: Frozen Wastes (Levels 61-70)
  // ============================================
  { id: 'icicle', name: 'Icicle', color: 0x48dbfb, shape: 'triangle', value: 20, weight: 25, unlockLevel: 61 },
  { id: 'snowflake', name: 'Snowflake', color: 0xc7ecee, shape: 'hexagon', value: 15, weight: 25, unlockLevel: 61 },
  { id: 'froststone', name: 'Frost Stone', color: 0x54a0ff, shape: 'diamond', value: 20, weight: 25, unlockLevel: 61 },
  { id: 'aurora', name: 'Aurora Shard', color: 0x78e08f, shape: 'circle', value: 15, weight: 20, unlockLevel: 61 },

  // ============================================
  // World 8: Dragon's Lair (Levels 71-80)
  // ============================================
  {
    id: 'firegem',
    name: 'Fire Gem',
    color: 0xff4757,
    shape: 'diamond',
    value: 25,
    weight: 15,
    unlockLevel: 71,
    isFire: true,
  },
  { id: 'dragonfang', name: 'Dragon Fang', color: 0xf8b500, shape: 'triangle', value: 20, weight: 25, unlockLevel: 71 },
  { id: 'dragonscale', name: 'Dragon Scale', color: 0x2ed573, shape: 'square', value: 20, weight: 25, unlockLevel: 71 },
  { id: 'molten', name: 'Molten Core', color: 0xff6b81, shape: 'circle', value: 25, weight: 20, unlockLevel: 71 },

  // ============================================
  // World 9: Astral Realm (Levels 81-90)
  // ============================================
  { id: 'stardust', name: 'Stardust', color: 0xf368e0, shape: 'circle', value: 20, weight: 25, unlockLevel: 81 },
  { id: 'nebula', name: 'Nebula Crystal', color: 0x7d5fff, shape: 'diamond', value: 20, weight: 25, unlockLevel: 81 },
  { id: 'comet', name: 'Comet Shard', color: 0x82ccdd, shape: 'triangle', value: 25, weight: 20, unlockLevel: 81 },
  { id: 'void', name: 'Void Stone', color: 0x3d3d3d, shape: 'square', value: 25, weight: 20, unlockLevel: 81 },

  // ============================================
  // World 10: Roxy's Tower (Levels 91-100)
  // ============================================
  { id: 'arcane', name: 'Arcane Gem', color: 0xbe2edd, shape: 'diamond', value: 25, weight: 25, unlockLevel: 91 },
  { id: 'runic', name: 'Runic Stone', color: 0x6ab04c, shape: 'square', value: 20, weight: 25, unlockLevel: 91 },
  { id: 'enchanted', name: 'Enchanted Orb', color: 0x22a6b3, shape: 'circle', value: 20, weight: 25, unlockLevel: 91 },
  { id: 'tower', name: 'Tower Crystal', color: 0xf9ca24, shape: 'triangle', value: 25, weight: 20, unlockLevel: 91 },
  {
    id: 'prestige',
    name: 'Prestige Diamond',
    color: 0xffffff,
    shape: 'star',
    value: 50,
    weight: 3,
    unlockLevel: 93,
    isPrestige: true,
  },
];

export function getSymbolsForLevel(level: number): SymbolDef[] {
  return SymbolConfig.filter((s) => s.unlockLevel <= level);
}
