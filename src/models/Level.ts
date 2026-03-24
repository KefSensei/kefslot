export type GoalType =
  | 'score'
  | 'collect'
  | 'clear_blockers'
  | 'cascades'
  | 'power_ups'
  | 'dual_collect' // Issue #17: collect two different symbol types
  | 'chain_cascade' // Issue #19: X cascades in a single chain
  | 'protect_egg' // Issue #19: keep dragon egg alive for N spins
  | 'assemble_relic'; // Issue #20: collect 4 relic pieces

export interface LevelGoal {
  type: GoalType;
  target: number;
  symbolId?: string; // for 'collect' type
  symbolId2?: string; // for 'dual_collect' second target
  target2?: number; // for 'dual_collect' second target amount
  current: number;
  current2?: number; // for 'dual_collect'
}

export interface LevelIntroDef {
  title: string;
  description: string;
}

// Conveyor row configuration (Issue #17)
export interface ConveyorConfig {
  row: number;
  direction: 'left' | 'right';
}

// Portal pair configuration (Issue #18)
export interface PortalPairConfig {
  id: string;
  cell1: { row: number; col: number };
  cell2: { row: number; col: number };
}

// Multiplier tile placement (Issue #16)
export interface MultiplierTileConfig {
  row: number;
  col: number;
  multiplier: number; // 2 or 3
}

// Chain blocker group (Issue #16)
export interface ChainBlockerConfig {
  cells: { row: number; col: number }[];
}

// Transformer cell config (Issue #19)
export interface TransformerConfig {
  row: number;
  col: number;
  transformsTo: string; // symbolId
}

// Phase shift config (Issue #20)
export interface PhaseConfig {
  phase: number;
  activeCells: { row: number; col: number }[]; // which cells are active in this phase
}

// Dragon egg placement (Issue #19)
export interface DragonEggConfig {
  row: number;
  col: number;
  spinsToHatch: number; // usually 3
}

// Relic piece placement (Issue #20)
export interface RelicPieceConfig {
  piece: number; // 1-4
  row: number;
  col: number;
}

// Column lock config (Issue #17)
export interface ColumnLockConfig {
  columns: number[]; // which columns lock after each spin
  lockAfterSpins: number; // how many spins before columns start locking
}

// Treasure chest config (Issue #17)
export interface TreasureChestConfig {
  row: number;
  col: number;
  hitsNeeded: number; // usually 3
}

// Boss phase config (Issue #19, #20)
export interface BossPhaseConfig {
  phase: number;
  gridSize?: { rows: number; cols: number }; // for board expansion
  mechanics?: string[]; // which mechanics activate in this phase
  intro?: LevelIntroDef;
}

export interface LevelDef {
  id: number;
  world: number;
  name: string;
  spins: number;
  movesPerSpin: number;
  goals: Omit<LevelGoal, 'current' | 'current2'>[];
  availableSymbolIds: string[];
  hasBlockers: boolean;
  blockerType?: 'ice' | 'stone';
  blockerCount?: number;
  blockerTypeSecondary?: 'ice' | 'stone';
  blockerCountSecondary?: number;
  starThresholds: [number, number, number];
  intro?: LevelIntroDef;

  // === NEW MECHANIC FLAGS ===

  // Issue #16: Multiplier tiles
  multiplierTiles?: MultiplierTileConfig[];

  // Issue #16: Chain blockers
  chainBlockers?: ChainBlockerConfig[];

  // Issue #16: Timed moves (seconds per move)
  timedMoves?: number; // seconds per move, undefined = no timer

  // Issue #17: Lava tiles (initial count, spread rate)
  lavaConfig?: {
    initialCount: number;
    spreadEveryNSpins: number;
  };

  // Issue #17: Locked symbols (count placed per spin)
  lockedSymbolCount?: number;

  // Issue #17: Conveyor rows
  conveyors?: ConveyorConfig[];

  // Issue #17: Cursed symbols
  cursedConfig?: {
    initialCount: number;
    spreadAfterSpins: number;
  };

  // Issue #17: Column locks
  columnLocks?: ColumnLockConfig;

  // Issue #17: Treasure chests
  treasureChests?: TreasureChestConfig[];

  // Issue #17: Combo streak enabled
  comboStreak?: boolean;

  // Issue #18: Gravity flip
  gravityFlip?: boolean;
  flipEveryNSpins?: number;

  // Issue #18: Fog of War
  fogCount?: number; // number of fogged cells

  // Issue #18: Power-up combos enabled
  powerUpCombos?: boolean;

  // Issue #18: Thorn blockers
  thornCount?: number;

  // Issue #18: Shadow symbols
  shadowCount?: number;

  // Issue #18: Vines
  vineConfig?: {
    initialCount: number;
    growthPerSpin: number;
    growFromEdges: boolean;
  };

  // Issue #18: Portal pairs
  portals?: PortalPairConfig[];

  // Issue #18: Total swap budget (replaces per-spin moves)
  totalSwapBudget?: number;

  // Issue #19: Blizzard
  blizzardConfig?: {
    freezeEveryNSpins: number;
    cellsToFreeze: number;
  };

  // Issue #19: Transformer tiles
  transformers?: TransformerConfig[];

  // Issue #19: Dragon eggs
  dragonEggs?: DragonEggConfig[];

  // Issue #19: Frozen columns
  frozenColumns?: number[]; // column indices

  // Issue #19: Board expansion
  gridSize?: { rows: number; cols: number }; // default 5x5

  // Issue #19: Power-up forge (pre-spin shop)
  powerUpForge?: boolean;

  // Issue #19: Fire symbols enabled
  fireSymbols?: boolean;

  // Issue #19/20: Multi-phase boss
  bossPhases?: BossPhaseConfig[];

  // Issue #20: Phase shifts
  phaseShifts?: PhaseConfig[];

  // Issue #20: Mirror board
  mirrorAxis?: 'vertical' | 'horizontal';

  // Issue #20: Score decay
  scoreDecay?: {
    ratePerSecond: number;
    maxRate: number;
  };

  // Issue #20: Relic pieces
  relicPieces?: RelicPieceConfig[];

  // Issue #20: Prestige symbols enabled
  prestigeSymbols?: boolean;

  // Issue #20: Mega power-up enabled
  megaPowerUp?: boolean;

  // Issue #20: Cascade-only mode (no moves, auto-cascade)
  cascadeOnlyMode?: boolean;

  // Issue #20: Gauntlet (sequential mini-boards)
  gauntlet?: { rows: number; cols: number }[];

  // Issue #20: Remix level (combo of mechanics, no new ones)
  isRemix?: boolean;
  remixName?: string;
}
