import { CellData, PowerUpType, createCell } from '@/models/Symbol';
import { CascadeEngine, MatchGroup } from '@/slots/CascadeEngine';
import { GameConfig } from '@/config/GameConfig';
import { getSymbolsForLevel } from '@/config/SymbolConfig';
import { weightedRandom } from '@/utils/MathUtils';
import { events } from '@/core/EventBus';

export interface SwapResult {
  valid: boolean;
  matches: MatchGroup[];
  powerUpsCreated: { row: number; col: number; type: PowerUpType }[];
  score: number;
  cascades: number;
}

export class Match3Engine {
  private cascade = new CascadeEngine();
  private grid: (CellData | null)[][] = [];
  private rows = GameConfig.rows;
  private cols = GameConfig.cols;
  private currentLevel = 1;

  getGrid(): (CellData | null)[][] {
    return this.grid;
  }

  setGrid(grid: (CellData | null)[][]): void {
    this.grid = grid;
  }

  setLevel(level: number): void {
    this.currentLevel = level;
  }

  // Check if a swap between two adjacent cells is valid (produces at least one match)
  isValidSwap(r1: number, c1: number, r2: number, c2: number): boolean {
    if (!this.isAdjacent(r1, c1, r2, c2)) return false;
    if (!this.grid[r1][c1] || !this.grid[r2][c2]) return false;

    // Swap temporarily
    this.swap(r1, c1, r2, c2);
    const matches = this.cascade.findMatches(this.grid);
    // Swap back
    this.swap(r1, c1, r2, c2);

    return matches.length > 0;
  }

  // Execute a swap and resolve all resulting matches + cascades
  async executeSwap(r1: number, c1: number, r2: number, c2: number): Promise<SwapResult> {
    if (!this.isValidSwap(r1, c1, r2, c2)) {
      return { valid: false, matches: [], powerUpsCreated: [], score: 0, cascades: 0 };
    }

    this.swap(r1, c1, r2, c2);
    events.emit('swap', { r1, c1, r2, c2 });

    let totalScore = 0;
    let cascadeLevel = 0;
    const allMatches: MatchGroup[] = [];
    const allPowerUps: { row: number; col: number; type: PowerUpType }[] = [];

    // Resolve cascades
    let matches = this.cascade.findMatches(this.grid);
    while (matches.length > 0) {
      const multiplier = this.cascade.getMultiplier(cascadeLevel);

      for (const match of matches) {
        // Score
        const baseScore = match.cells.length >= 5
          ? GameConfig.match5Score
          : match.cells.length >= 4
            ? GameConfig.match4Score
            : GameConfig.match3Score;
        totalScore += baseScore * multiplier;

        // Create power-ups for 4+ matches
        const powerUp = this.determinePowerUp(match);
        if (powerUp) {
          allPowerUps.push(powerUp);
        }
      }

      allMatches.push(...matches);

      // Remove matched cells
      this.clearMatches(matches);
      events.emit('matchCleared', { matches, cascadeLevel });

      // Place power-ups
      for (const pu of allPowerUps) {
        if (!this.grid[pu.row][pu.col]) {
          const symbols = getSymbolsForLevel(this.currentLevel);
          const sym = symbols[0]; // placeholder
          const cell = createCell(sym, pu.row, pu.col);
          cell.powerUp = pu.type;
          this.grid[pu.row][pu.col] = cell;
        }
      }

      // Gravity: drop symbols down
      this.applyGravity();
      events.emit('gravityApplied');

      // Fill empty spaces
      this.fillEmptySpaces();
      events.emit('gridFilled');

      cascadeLevel++;
      matches = this.cascade.findMatches(this.grid);
    }

    return { valid: true, matches: allMatches, powerUpsCreated: allPowerUps, score: totalScore, cascades: cascadeLevel };
  }

  // Activate a power-up at the given position
  activatePowerUp(row: number, col: number): { cleared: { row: number; col: number }[]; score: number } {
    const cell = this.grid[row][col];
    if (!cell || !cell.powerUp) return { cleared: [], score: 0 };

    const cleared: { row: number; col: number }[] = [];
    const type = cell.powerUp;

    if (type === 'blast') {
      // Clear entire row or column (random)
      if (Math.random() < 0.5) {
        for (let c = 0; c < this.cols; c++) cleared.push({ row, col: c });
      } else {
        for (let r = 0; r < this.rows; r++) cleared.push({ row: r, col });
      }
    } else if (type === 'bomb') {
      // Clear 3x3
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            cleared.push({ row: r, col: c });
          }
        }
      }
    } else if (type === 'rainbow') {
      // Clear all of a random symbol type
      const targetId = this.getRandomSymbolOnBoard();
      if (targetId) {
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            if (this.grid[r][c]?.symbol.id === targetId) {
              cleared.push({ row: r, col: c });
            }
          }
        }
      }
    }

    // Clear the cells
    for (const pos of cleared) {
      this.grid[pos.row][pos.col] = null;
    }

    return { cleared, score: cleared.length * GameConfig.baseSymbolScore * 3 };
  }

  /** Find a valid swap hint — returns the first valid adjacent pair or null */
  findHint(): { r1: number; c1: number; r2: number; c2: number } | null {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // Check right neighbor
        if (c + 1 < this.cols && this.isValidSwap(r, c, r, c + 1)) {
          return { r1: r, c1: c, r2: r, c2: c + 1 };
        }
        // Check down neighbor
        if (r + 1 < this.rows && this.isValidSwap(r, c, r + 1, c)) {
          return { r1: r, c1: c, r2: r + 1, c2: c };
        }
      }
    }
    return null;
  }

  private determinePowerUp(match: MatchGroup): { row: number; col: number; type: PowerUpType } | null {
    if (match.cells.length >= 5) {
      const mid = match.cells[Math.floor(match.cells.length / 2)];
      return { row: mid.row, col: mid.col, type: 'rainbow' };
    }
    if (match.cells.length === 4) {
      // Check if it's a line or L-shape
      const isHorizontal = match.cells.every(c => c.row === match.cells[0].row);
      const isVertical = match.cells.every(c => c.col === match.cells[0].col);
      const mid = match.cells[Math.floor(match.cells.length / 2)];
      if (isHorizontal || isVertical) {
        return { row: mid.row, col: mid.col, type: 'blast' };
      }
      return { row: mid.row, col: mid.col, type: 'bomb' };
    }
    return null;
  }

  private swap(r1: number, c1: number, r2: number, c2: number): void {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;

    // Update cell positions
    if (this.grid[r1][c1]) {
      this.grid[r1][c1]!.row = r1;
      this.grid[r1][c1]!.col = c1;
    }
    if (this.grid[r2][c2]) {
      this.grid[r2][c2]!.row = r2;
      this.grid[r2][c2]!.col = c2;
    }
  }

  private isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  private clearMatches(matches: MatchGroup[]): void {
    for (const match of matches) {
      for (const pos of match.cells) {
        this.grid[pos.row][pos.col] = null;
      }
    }
  }

  private applyGravity(): void {
    for (let c = 0; c < this.cols; c++) {
      let writeRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c]) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = this.grid[r][c];
            this.grid[writeRow][c]!.row = writeRow;
            this.grid[r][c] = null;
          }
          writeRow--;
        }
      }
    }
  }

  private fillEmptySpaces(): void {
    const symbols = getSymbolsForLevel(this.currentLevel);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) {
          this.grid[r][c] = createCell(weightedRandom(symbols), r, c);
        }
      }
    }
  }

  private getRandomSymbolOnBoard(): string | null {
    const ids = new Set<string>();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell && !cell.symbol.isWild && !cell.symbol.isScatter) {
          ids.add(cell.symbol.id);
        }
      }
    }
    const arr = [...ids];
    return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
  }
}
