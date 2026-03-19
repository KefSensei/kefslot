import { GameConfig } from '@/config/GameConfig';
import { CellData } from '@/models/Symbol';

export interface CascadeResult {
  matches: MatchGroup[];
  score: number;
  cascadeLevel: number;
}

export interface MatchGroup {
  cells: { row: number; col: number }[];
  symbolId: string;
}

export class CascadeEngine {
  // Find all horizontal and vertical matches of 3+ in the grid
  findMatches(grid: (CellData | null)[][]): MatchGroup[] {
    const rows = grid.length;
    const cols = grid[0].length;
    const matched = new Set<string>();
    const groups: MatchGroup[] = [];

    // Horizontal
    for (let r = 0; r < rows; r++) {
      let runStart = 0;
      for (let c = 1; c <= cols; c++) {
        const current = grid[r][c];
        const prev = grid[r][runStart];
        const sameSymbol = current && prev && this.symbolsMatch(current, prev);

        if (c < cols && sameSymbol) continue;

        const runLen = c - runStart;
        if (runLen >= 3 && prev) {
          const cells: { row: number; col: number }[] = [];
          for (let k = runStart; k < c; k++) {
            cells.push({ row: r, col: k });
            matched.add(`${r},${k}`);
          }
          groups.push({ cells, symbolId: prev.symbol.id });
        }
        runStart = c;
      }
    }

    // Vertical
    for (let c = 0; c < cols; c++) {
      let runStart = 0;
      for (let r = 1; r <= rows; r++) {
        const current = r < rows ? grid[r][c] : null;
        const prev = grid[runStart][c];
        const sameSymbol = current && prev && this.symbolsMatch(current, prev);

        if (r < rows && sameSymbol) continue;

        const runLen = r - runStart;
        if (runLen >= 3 && prev) {
          const cells: { row: number; col: number }[] = [];
          for (let k = runStart; k < r; k++) {
            if (!matched.has(`${k},${c}`)) {
              cells.push({ row: k, col: c });
            }
          }
          if (cells.length > 0) {
            groups.push({ cells, symbolId: prev.symbol.id });
          }
        }
        runStart = r;
      }
    }

    return groups;
  }

  // Calculate score for cascade level
  getMultiplier(cascadeLevel: number): number {
    const multipliers = GameConfig.cascadeMultipliers;
    return multipliers[Math.min(cascadeLevel, multipliers.length - 1)];
  }

  // Check if two cells match (wilds match everything, blockers never match)
  private symbolsMatch(a: CellData, b: CellData): boolean {
    if (a.isBlocker || b.isBlocker) return false;
    if (a.symbol.isWild || b.symbol.isWild) return true;
    return a.symbol.id === b.symbol.id;
  }
}
