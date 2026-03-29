import { SymbolDef } from '@/config/SymbolConfig';

export type PowerUpType = 'blast' | 'bomb' | 'rainbow' | null;

export interface CellData {
  symbol: SymbolDef;
  row: number;
  col: number;
  powerUp: PowerUpType;
  isBlocker: boolean;
  blockerHealth: number; // hits needed to clear
  chainId: number | null; // chain blocker group id — blockers with the same id are linked
  tileMultiplier: number; // 0 = none, 2 = ×2, 3 = ×3 score zone
}

export function createCell(symbol: SymbolDef, row: number, col: number): CellData {
  return {
    symbol,
    row,
    col,
    powerUp: null,
    isBlocker: false,
    blockerHealth: 0,
    chainId: null,
    tileMultiplier: 0,
  };
}
