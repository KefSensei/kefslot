// Static configuration (never changes)
const StaticConfig = {
  // Default canvas (landscape / desktop)
  width: 800,
  height: 700,

  // Portrait canvas (mobile)
  portraitWidth: 500,
  portraitHeight: 900,

  backgroundColor: 0x1a0a2e,

  // Grid
  cols: 5,
  rows: 5,
  cellSize: 80, // default (landscape), overridden at runtime per orientation
  cellSizeLandscape: 66,
  cellSizePortrait: 60,
  gridPadding: 20,

  // Grid center positions (relative to active canvas) — tuned to slot cabinet art
  gridCenterLandscape: { x: 405, y: 280 } as { x: number; y: number },
  gridCenterPortrait: { x: 250, y: 377 } as { x: number; y: number },

  // Timing (ms)
  spinDuration: 1500,
  reelStagger: 150,
  cascadeDelay: 300,
  swapDuration: 200,
  matchClearDelay: 400,
  gravityDelay: 200,

  // Match-3
  defaultMoves: 5,

  // Scoring
  baseSymbolScore: 10,
  cascadeMultipliers: [1, 2, 3, 5, 8, 13, 21] as readonly number[],
  match3Score: 50,
  match4Score: 150,
  match5Score: 500,

  // Power-ups
  powerUp4Match: 'blast' as const,
  powerUp4Square: 'bomb' as const,
  powerUp5Match: 'rainbow' as const,
} as const;

// Mutable runtime layout state
export const GameConfig: Omit<typeof StaticConfig, 'cellSize'> & {
  activeWidth: number;
  activeHeight: number;
  cellSize: number;
  isPortrait: boolean;
  isTouch: boolean;
} = {
  ...StaticConfig,

  // Active dimensions (updated on resize)
  activeWidth: StaticConfig.width as number,
  activeHeight: StaticConfig.height as number,
  cellSize: StaticConfig.cellSizeLandscape as number,
  isPortrait: false,
  isTouch: typeof window !== 'undefined' && 'ontouchstart' in window,
};
