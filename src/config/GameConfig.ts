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
  cellSize: 80,
  gridPadding: 20,

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
export const GameConfig: typeof StaticConfig & {
  activeWidth: number;
  activeHeight: number;
  isPortrait: boolean;
  isTouch: boolean;
} = {
  ...StaticConfig,

  // Active dimensions (updated on resize)
  activeWidth: StaticConfig.width as number,
  activeHeight: StaticConfig.height as number,
  isPortrait: false,
  isTouch: typeof window !== 'undefined' && 'ontouchstart' in window,
};
