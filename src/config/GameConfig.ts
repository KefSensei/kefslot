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
  cellSize: 80, // legacy alias — use cellWidth/cellHeight for layout
  cellSizeLandscape: 66,
  cellSizePortrait: 60,
  // Rectangular cell dimensions — width fills the landscape cabinet hole
  cellWidthLandscape: 100,
  cellHeightLandscape: 62,
  cellWidthPortrait: 76,
  cellHeightPortrait: 58,
  gridPadding: 20,

  // Grid center positions (relative to active canvas) — tuned to slot cabinet art
  // Landscape: cabinet hole is ~x115-685 (w570), ~y75-465 (h390) → center (400, 270)
  // Frame pad=16, totalH=326 → frame top=91, frame bottom=449 (fits within hole with ~16px margin)
  gridCenterLandscape: { x: 400, y: 270 } as { x: number; y: number },
  gridCenterPortrait: { x: 250, y: 360 } as { x: number; y: number },

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
  cellWidth: number;
  cellHeight: number;
  isPortrait: boolean;
  isTouch: boolean;
} = {
  ...StaticConfig,

  // Active dimensions (updated on resize)
  activeWidth: StaticConfig.width as number,
  activeHeight: StaticConfig.height as number,
  cellSize: StaticConfig.cellSizeLandscape as number,
  cellWidth: StaticConfig.cellWidthLandscape as number,
  cellHeight: StaticConfig.cellHeightLandscape as number,
  isPortrait: false,
  isTouch: typeof window !== 'undefined' && 'ontouchstart' in window,
};
