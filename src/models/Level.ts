export type GoalType = 'score' | 'collect' | 'clear_blockers' | 'cascades' | 'power_ups';

export interface LevelGoal {
  type: GoalType;
  target: number;
  symbolId?: string; // for 'collect' type
  current: number;
}

export interface LevelIntroDef {
  title: string;
  description: string;
}

export interface LevelDef {
  id: number;
  world: number;
  name: string;
  spins: number; // total spins allowed
  movesPerSpin: number; // match-3 moves per spin
  goals: Omit<LevelGoal, 'current'>[];
  availableSymbolIds: string[];
  hasBlockers: boolean;
  blockerType?: 'ice' | 'stone';
  blockerCount?: number;
  blockerTypeSecondary?: 'ice' | 'stone';
  blockerCountSecondary?: number;
  // World 2 mechanics
  multiplierTileCount?: number; // how many ×2/×3 tiles to seed on the grid
  hasChainBlockers?: boolean; // blockers linked in chains (destroying one weakens next)
  chainBlockerCount?: number; // number of chained blockers to place
  hasTimedMoves?: boolean; // countdown ring per move; faster = score bonus
  scatterThreshold?: number; // scatters needed for a bonus spin (default 3)
  starThresholds: [number, number, number]; // score thresholds for 1/2/3 stars
  intro?: LevelIntroDef;
}
