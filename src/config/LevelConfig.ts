import { LevelDef } from '@/models/Level';

export const LevelConfigs: LevelDef[] = [
  // World 1: Enchanted Meadow
  // Each level introduces a new mechanic that persists in all subsequent levels.
  // Feature ramp: match3 → cascades → blast → bomb → ice → rainbow → stone → collect → limited spins → boss

  // Level 1: INTRODUCES basic matching (5 symbols, simple score goal)
  {
    id: 1, world: 1, name: 'First Steps',
    spins: 5, movesPerSpin: 5,
    goals: [{ type: 'score', target: 500 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst', 'topaz'],
    hasBlockers: false,
    starThresholds: [500, 1000, 2000],
    intro: {
      title: 'Welcome!',
      description: 'Spin the reels to fill the board, then drag to swap adjacent gems and match 3 or more in a row!',
    },
  },

  // Level 2: INTRODUCES cascades (5 symbols — cascades happen naturally from gravity fills)
  {
    id: 2, world: 1, name: 'Cascade Valley',
    spins: 5, movesPerSpin: 5,
    goals: [{ type: 'cascades', target: 3 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst', 'topaz'],
    hasBlockers: false,
    starThresholds: [800, 1500, 3000],
    intro: {
      title: 'Cascade Chains!',
      description: 'When gems fall after a match, they can trigger chain reactions! Each cascade multiplies your score.',
    },
  },

  // Level 3: INTRODUCES blast power-up (only 4 symbols → frequent 4-in-a-line matches)
  // Persists: cascades still happen naturally
  {
    id: 3, world: 1, name: 'Blast Off',
    spins: 5, movesPerSpin: 6,
    goals: [{ type: 'power_ups', target: 1 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst'],
    hasBlockers: false,
    starThresholds: [1000, 2000, 4000],
    intro: {
      title: 'Blast Power-Up!',
      description: 'Match 4 in a line to create a Blast gem! Tap it to clear an entire row or column.',
    },
  },

  // Level 4: INTRODUCES bomb power-up (still 4 symbols → L/T shapes form naturally)
  // Persists: blast power-ups still form from 4-in-line
  {
    id: 4, world: 1, name: 'Bomb Squad',
    spins: 6, movesPerSpin: 5,
    goals: [{ type: 'power_ups', target: 2 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst'],
    hasBlockers: false,
    starThresholds: [1200, 2500, 5000],
    intro: {
      title: 'Bomb Power-Up!',
      description: 'Match 4 in an L or T shape to create a Bomb! Tap it to clear a 3x3 area around it.',
    },
  },

  // Level 5: INTRODUCES ice blockers (4 ice tiles, 4 symbols for power-up creation)
  // Persists: power-ups (blast/bomb) from 4 symbols, cascades
  {
    id: 5, world: 1, name: 'Frozen Garden',
    spins: 6, movesPerSpin: 6,
    goals: [{ type: 'clear_blockers', target: 4 }, { type: 'score', target: 1500 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst'],
    hasBlockers: true,
    blockerType: 'ice',
    blockerCount: 4,
    starThresholds: [2000, 4000, 8000],
    intro: {
      title: 'Ice Blockers!',
      description: 'Ice tiles block your path! Match next to them to break the ice. Use power-ups to clear them faster!',
    },
  },

  // Level 6: INTRODUCES rainbow power-up (only 3 symbols → very frequent 5-matches)
  // Persists: ice blockers (3), blast/bomb power-ups
  {
    id: 6, world: 1, name: 'Rainbow Bridge',
    spins: 6, movesPerSpin: 6,
    goals: [{ type: 'power_ups', target: 3 }, { type: 'clear_blockers', target: 3 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire'],
    hasBlockers: true,
    blockerType: 'ice',
    blockerCount: 3,
    starThresholds: [2500, 5000, 10000],
    intro: {
      title: 'Rainbow Power-Up!',
      description: 'Match 5 in a row to create a Rainbow gem! Tap it to clear all gems of one color from the board.',
    },
  },

  // Level 7: INTRODUCES stone blockers (need 2 hits — power-ups help a lot here)
  // Persists: ice blockers (2), all power-ups, 4 symbols for power-up generation
  {
    id: 7, world: 1, name: 'Stone Keep',
    spins: 7, movesPerSpin: 6,
    goals: [{ type: 'clear_blockers', target: 5 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst'],
    hasBlockers: true,
    blockerType: 'stone',
    blockerCount: 3,
    blockerTypeSecondary: 'ice',
    blockerCountSecondary: 2,
    starThresholds: [3000, 6000, 12000],
    intro: {
      title: 'Stone Blockers!',
      description: 'Stone tiles are tougher — they need TWO adjacent matches to break! Use power-ups to help.',
    },
  },

  // Level 8: INTRODUCES collection goal (collect rubies while dealing with ice)
  // Persists: ice blockers (3), power-ups from 4 symbols
  {
    id: 8, world: 1, name: 'Gem Collector',
    spins: 6, movesPerSpin: 6,
    goals: [{ type: 'collect', target: 12, symbolId: 'ruby' }, { type: 'clear_blockers', target: 3 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst'],
    hasBlockers: true,
    blockerType: 'ice',
    blockerCount: 3,
    starThresholds: [3000, 7000, 14000],
    intro: {
      title: 'Gem Collection!',
      description: 'Collect specific gems to complete the level. Focus your matches on the target gem!',
    },
  },

  // Level 9: INTRODUCES limited spins (3 spins — high pressure, stone blockers + power-ups needed)
  // Persists: stone blockers (2), ice blockers (2), all power-ups from 4 symbols
  {
    id: 9, world: 1, name: 'Last Chance',
    spins: 3, movesPerSpin: 7,
    goals: [{ type: 'score', target: 3000 }, { type: 'clear_blockers', target: 4 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst'],
    hasBlockers: true,
    blockerType: 'stone',
    blockerCount: 2,
    blockerTypeSecondary: 'ice',
    blockerCountSecondary: 2,
    starThresholds: [3000, 6000, 12000],
    intro: {
      title: 'Limited Spins!',
      description: 'Only 3 spins but more moves each! Every spin counts — use power-ups to clear blockers fast!',
    },
  },

  // Level 10: BOSS — all mechanics together, multi-goal, high difficulty
  // All features: stone + ice blockers, power-ups, collection, score, cascades
  {
    id: 10, world: 1, name: 'Meadow Guardian',
    spins: 8, movesPerSpin: 6,
    goals: [{ type: 'score', target: 8000 }, { type: 'power_ups', target: 3 }, { type: 'clear_blockers', target: 6 }],
    availableSymbolIds: ['ruby', 'emerald', 'sapphire', 'amethyst'],
    hasBlockers: true,
    blockerType: 'stone',
    blockerCount: 3,
    blockerTypeSecondary: 'ice',
    blockerCountSecondary: 3,
    starThresholds: [8000, 15000, 25000],
    intro: {
      title: "The Meadow Guardian!",
      description: "Everything you've learned comes together! Break ice and stone, create power-ups, and reach a massive score!",
    },
  },

  // World 2: Crystal Caverns
  {
    id: 11, world: 2, name: 'Into the Depths',
    spins: 6, movesPerSpin: 5,
    goals: [{ type: 'score', target: 3000 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy'],
    hasBlockers: false,
    starThresholds: [3000, 6000, 12000],
  },
  {
    id: 12, world: 2, name: 'Crystal Harvest',
    spins: 6, movesPerSpin: 6,
    goals: [{ type: 'collect', target: 20, symbolId: 'crystal' }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'multiplier'],
    hasBlockers: false,
    starThresholds: [4000, 8000, 15000],
  },
  {
    id: 13, world: 2, name: 'Frozen Path',
    spins: 7, movesPerSpin: 6,
    goals: [{ type: 'clear_blockers', target: 5 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'scatter'],
    hasBlockers: true,
    blockerType: 'ice',
    blockerCount: 5,
    starThresholds: [5000, 10000, 18000],
  },
  {
    id: 14, world: 2, name: 'Bat Colony',
    spins: 6, movesPerSpin: 5,
    goals: [{ type: 'collect', target: 15, symbolId: 'bat' }, { type: 'score', target: 5000 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'multiplier'],
    hasBlockers: false,
    starThresholds: [5000, 10000, 20000],
  },
  {
    id: 15, world: 2, name: 'Rainbow Cavern',
    spins: 7, movesPerSpin: 7,
    goals: [{ type: 'power_ups', target: 5 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'scatter', 'multiplier'],
    hasBlockers: false,
    starThresholds: [6000, 12000, 22000],
  },
  {
    id: 16, world: 2, name: 'Deep Freeze',
    spins: 7, movesPerSpin: 6,
    goals: [{ type: 'clear_blockers', target: 10 }, { type: 'score', target: 6000 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'multiplier'],
    hasBlockers: true,
    blockerType: 'ice',
    blockerCount: 10,
    starThresholds: [6000, 13000, 25000],
  },
  {
    id: 17, world: 2, name: 'Glowshroom Garden',
    spins: 7, movesPerSpin: 6,
    goals: [{ type: 'collect', target: 25, symbolId: 'mushroom' }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'scatter', 'multiplier'],
    hasBlockers: false,
    starThresholds: [7000, 14000, 28000],
  },
  {
    id: 18, world: 2, name: 'Combo Crafter',
    spins: 8, movesPerSpin: 7,
    goals: [{ type: 'power_ups', target: 8 }, { type: 'cascades', target: 10 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'scatter', 'multiplier'],
    hasBlockers: false,
    starThresholds: [8000, 16000, 30000],
  },
  {
    id: 19, world: 2, name: 'Crystal Storm',
    spins: 8, movesPerSpin: 6,
    goals: [{ type: 'score', target: 15000 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'scatter', 'multiplier'],
    hasBlockers: true,
    blockerType: 'stone',
    blockerCount: 5,
    starThresholds: [15000, 25000, 40000],
  },
  {
    id: 20, world: 2, name: 'Cavern Lord',
    spins: 10, movesPerSpin: 7,
    goals: [{ type: 'score', target: 20000 }, { type: 'power_ups', target: 10 }, { type: 'cascades', target: 15 }],
    availableSymbolIds: ['crystal', 'mushroom', 'bat', 'amethyst', 'sapphire', 'roxy', 'scatter', 'multiplier'],
    hasBlockers: true,
    blockerType: 'stone',
    blockerCount: 6,
    starThresholds: [20000, 35000, 50000],
  },
];

export function getLevelConfig(id: number): LevelDef | undefined {
  return LevelConfigs.find(l => l.id === id);
}
