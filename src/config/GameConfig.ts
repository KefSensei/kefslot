export const GameConfig = {
  // Canvas
  width: 800,
  height: 700,
  backgroundColor: 0x1a0a2e,

  // Grid
  cols: 5,
  rows: 5, // 5x5 grid for match-3 hybrid (bigger than standard 5x3 slots)
  cellSize: 80,
  gridPadding: 20,

  // Timing (ms)
  spinDuration: 1500,
  reelStagger: 150, // delay between each reel stopping
  cascadeDelay: 300,
  swapDuration: 200,
  matchClearDelay: 400,
  gravityDelay: 200,

  // Match-3
  defaultMoves: 5, // moves per spin in match-3 phase

  // Scoring
  baseSymbolScore: 10,
  cascadeMultipliers: [1, 2, 3, 5, 8, 13, 21],
  match3Score: 50,
  match4Score: 150,
  match5Score: 500,

  // Power-ups
  powerUp4Match: 'blast',   // clears row or column
  powerUp4Square: 'bomb',   // clears 3x3
  powerUp5Match: 'rainbow', // clears all of one type
} as const;
