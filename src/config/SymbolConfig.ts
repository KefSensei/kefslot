export interface SymbolDef {
  id: string;
  name: string;
  color: number;
  shape: 'circle' | 'diamond' | 'square' | 'triangle' | 'star' | 'hexagon';
  value: number;       // base score value
  weight: number;      // spawn probability weight (higher = more common)
  isWild?: boolean;
  isScatter?: boolean;
  isMultiplier?: boolean;
  unlockLevel: number; // level at which this symbol becomes available
}

export const SymbolConfig: SymbolDef[] = [
  // World 1: Enchanted Meadow basics
  { id: 'ruby',      name: 'Ruby',           color: 0xe74c3c, shape: 'diamond',  value: 10,  weight: 30, unlockLevel: 1 },
  { id: 'emerald',   name: 'Emerald',        color: 0x2ecc71, shape: 'diamond',  value: 10,  weight: 30, unlockLevel: 1 },
  { id: 'sapphire',  name: 'Sapphire',       color: 0x3498db, shape: 'circle',   value: 10,  weight: 30, unlockLevel: 1 },
  { id: 'amethyst',  name: 'Amethyst',       color: 0x9b59b6, shape: 'circle',   value: 15,  weight: 25, unlockLevel: 1 },
  { id: 'topaz',     name: 'Topaz',          color: 0xf39c12, shape: 'triangle', value: 15,  weight: 25, unlockLevel: 1 },
  { id: 'potion',    name: 'Magic Potion',   color: 0xe91e63, shape: 'square',   value: 20,  weight: 15, unlockLevel: 2 },

  // Special symbols
  { id: 'roxy',      name: 'Roxy',           color: 0xf1c40f, shape: 'star',     value: 25,  weight: 5,  unlockLevel: 1, isWild: true },
  { id: 'scatter',   name: 'Magic Scroll',   color: 0x1abc9c, shape: 'hexagon',  value: 0,   weight: 8,  unlockLevel: 4, isScatter: true },
  { id: 'multiplier',name: 'Multiplier Orb', color: 0xff6b6b, shape: 'circle',   value: 0,   weight: 6,  unlockLevel: 5, isMultiplier: true },

  // World 2: Crystal Caverns
  { id: 'crystal',   name: 'Crystal',        color: 0x00d2ff, shape: 'diamond',  value: 20,  weight: 25, unlockLevel: 11 },
  { id: 'mushroom',  name: 'Glowshroom',     color: 0xff9ff3, shape: 'triangle', value: 15,  weight: 25, unlockLevel: 11 },
  { id: 'bat',       name: 'Cave Bat',       color: 0x636e72, shape: 'square',   value: 25,  weight: 20, unlockLevel: 11 },
];

export function getSymbolsForLevel(level: number): SymbolDef[] {
  return SymbolConfig.filter(s => s.unlockLevel <= level);
}
