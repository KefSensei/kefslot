import { SymbolDef } from '@/config/SymbolConfig';

export type PowerUpType = 'blast' | 'bomb' | 'rainbow' | null;

export interface CellData {
  symbol: SymbolDef;
  row: number;
  col: number;
  powerUp: PowerUpType;
  isBlocker: boolean;
  blockerHealth: number; // hits needed to clear
}

export function createCell(symbol: SymbolDef, row: number, col: number): CellData {
  return {
    symbol,
    row,
    col,
    powerUp: null,
    isBlocker: false,
    blockerHealth: 0,
  };
}
