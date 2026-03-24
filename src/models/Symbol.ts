import { SymbolDef } from '@/config/SymbolConfig';

export type PowerUpType = 'blast' | 'bomb' | 'rainbow' | null;
export type BlockerType = 'ice' | 'stone' | 'chain' | 'thorn' | 'vine' | 'frozen_column' | null;

export interface CellData {
  symbol: SymbolDef;
  row: number;
  col: number;
  powerUp: PowerUpType;

  // Blockers
  isBlocker: boolean;
  blockerHealth: number;
  blockerType: BlockerType;

  // Chain blockers (Issue #16) — linked to another blocker
  chainLink?: { row: number; col: number };

  // Multiplier tiles (Issue #16) — cell-level multiplier
  tileMultiplier?: number; // e.g., 2 or 3

  // Locked symbols (Issue #17) — symbol visible but locked, must unlock first
  isLocked?: boolean;

  // Cursed symbols (Issue #17) — spreads to neighbors if not cleared
  isCursed?: boolean;
  curseTurnsLeft?: number; // spreads when this reaches 0

  // Treasure chests (Issue #17)
  isChest?: boolean;
  chestHitsNeeded?: number;
  chestHitsReceived?: number;

  // Fog of War (Issue #18)
  isFogged?: boolean;

  // Shadow symbols (Issue #18) — identity hidden
  isShadow?: boolean;

  // Portal pairs (Issue #18)
  portalId?: string; // matching pair ID (e.g., 'A', 'B')

  // Lava tiles (Issue #17)
  isLava?: boolean;
  lavaSpreadIn?: number; // spins until it spreads

  // Dragon eggs (Issue #19)
  isDragonEgg?: boolean;
  eggSpinsLeft?: number;
  eggStage?: number; // 0=pristine, 1=cracked, 2=glowing

  // Transformer tiles (Issue #19) — cell transforms symbols that land on it
  transformsTo?: string; // symbolId to transform into

  // Fire symbol (Issue #19) — melts adjacent blockers on match
  isFire?: boolean;

  // Phase shift (Issue #20) — cell can be active or inactive
  isActive?: boolean;

  // Mirror (Issue #20)
  mirrorPair?: { row: number; col: number };

  // Relic pieces (Issue #20)
  isRelic?: boolean;
  relicPiece?: number; // 1-4

  // Prestige symbol (Issue #20)
  isPrestige?: boolean;
}

export function createCell(symbol: SymbolDef, row: number, col: number): CellData {
  return {
    symbol,
    row,
    col,
    powerUp: null,
    isBlocker: false,
    blockerHealth: 0,
    blockerType: null,
    isActive: true,
  };
}
