/**
 * MechanicsEngine — Centralized handler for all world-specific mechanics.
 *
 * Each mechanic is a self-contained module that hooks into the game loop at
 * specific points: onSpinStart, onSpinEnd, onSwap, onMatch, onCascade, etc.
 * The engine queries the current LevelDef to decide which mechanics are active.
 */

import { CellData, createCell, BlockerType } from '@/models/Symbol';
import { LevelDef } from '@/models/Level';
import { GameConfig } from '@/config/GameConfig';
import { getSymbolsForLevel, SymbolDef } from '@/config/SymbolConfig';
import { weightedRandom } from '@/utils/MathUtils';
import { events } from '@/core/EventBus';

export interface MechanicEvent {
  type: string;
  data: Record<string, unknown>;
}

export class MechanicsEngine {
  private level: LevelDef | null = null;
  private grid: (CellData | null)[][] = [];
  private spinCount = 0;
  private comboStreak = 0;
  private scatterCount = 0;
  private gravityDirection: 'down' | 'up' = 'down';
  private totalSwapsUsed = 0;
  private scoreDecayTimer = 0;
  private lockedColumns = new Set<number>();
  private relicPiecesCollected = 0;
  private currentPhase = 0;
  private eggTimers: Map<string, number> = new Map(); // "r,c" -> spins remaining

  setLevel(level: LevelDef): void {
    this.level = level;
    this.spinCount = 0;
    this.comboStreak = 0;
    this.scatterCount = 0;
    this.gravityDirection = 'down';
    this.totalSwapsUsed = 0;
    this.scoreDecayTimer = 0;
    this.lockedColumns.clear();
    this.relicPiecesCollected = 0;
    this.currentPhase = 0;
    this.eggTimers.clear();
  }

  setGrid(grid: (CellData | null)[][]): void {
    this.grid = grid;
  }

  getGravityDirection(): 'down' | 'up' {
    return this.gravityDirection;
  }

  getComboStreak(): number {
    return this.comboStreak;
  }

  getScatterCount(): number {
    return this.scatterCount;
  }

  getTotalSwapsUsed(): number {
    return this.totalSwapsUsed;
  }

  getLockedColumns(): Set<number> {
    return this.lockedColumns;
  }

  getCurrentPhase(): number {
    return this.currentPhase;
  }

  getRelicPiecesCollected(): number {
    return this.relicPiecesCollected;
  }

  // =====================================================
  // SPIN LIFECYCLE HOOKS
  // =====================================================

  /** Called before a new spin starts */
  onSpinStart(): MechanicEvent[] {
    if (!this.level) return [];
    this.spinCount++;
    const mechanicEvents: MechanicEvent[] = [];

    // Gravity flip (Issue #18)
    if (this.level.gravityFlip && this.level.flipEveryNSpins) {
      if (this.spinCount % this.level.flipEveryNSpins === 0) {
        this.gravityDirection = this.gravityDirection === 'down' ? 'up' : 'down';
        mechanicEvents.push({ type: 'gravityFlip', data: { direction: this.gravityDirection } });
      }
    }

    // Blizzard (Issue #19)
    if (this.level.blizzardConfig) {
      if (this.spinCount % this.level.blizzardConfig.freezeEveryNSpins === 0 && this.spinCount > 1) {
        const frozen = this.applyBlizzard(this.level.blizzardConfig.cellsToFreeze);
        mechanicEvents.push({ type: 'blizzard', data: { frozenCells: frozen } });
      }
    }

    // Conveyor shift (Issue #17)
    if (this.level.conveyors && this.level.conveyors.length > 0) {
      const shifted = this.shiftConveyors();
      if (shifted.length > 0) {
        mechanicEvents.push({ type: 'conveyorShift', data: { shifts: shifted } });
      }
    }

    // Column locks (Issue #17)
    if (this.level.columnLocks && this.spinCount > this.level.columnLocks.lockAfterSpins) {
      this.applyColumnLocks();
      mechanicEvents.push({ type: 'columnLock', data: { locked: [...this.lockedColumns] } });
    }

    // Lava spread (Issue #17)
    if (this.level.lavaConfig && this.spinCount > 1) {
      if (this.spinCount % this.level.lavaConfig.spreadEveryNSpins === 0) {
        const spread = this.spreadLava();
        mechanicEvents.push({ type: 'lavaSpread', data: { newLavaCells: spread } });
      }
    }

    // Curse spread (Issue #17)
    if (this.level.cursedConfig) {
      const spread = this.spreadCurses();
      if (spread.length > 0) {
        mechanicEvents.push({ type: 'curseSpread', data: { newCursedCells: spread } });
      }
    }

    // Vine growth (Issue #18)
    if (this.level.vineConfig && this.spinCount > 1) {
      const grown = this.growVines();
      if (grown.length > 0) {
        mechanicEvents.push({ type: 'vineGrowth', data: { newVineCells: grown } });
      }
    }

    // Dragon egg tick (Issue #19)
    if (this.level.dragonEggs) {
      const hatched = this.tickDragonEggs();
      if (hatched.length > 0) {
        mechanicEvents.push({ type: 'dragonEggHatch', data: { hatched } });
      }
    }

    // Phase shift (Issue #20)
    if (this.level.phaseShifts && this.level.phaseShifts.length > 0) {
      const nextPhase = this.spinCount % this.level.phaseShifts.length;
      if (nextPhase !== this.currentPhase) {
        this.currentPhase = nextPhase;
        this.applyPhaseShift();
        mechanicEvents.push({ type: 'phaseShift', data: { phase: this.currentPhase } });
      }
    }

    return mechanicEvents;
  }

  /** Called after spin resolves (post-cascade) */
  onSpinEnd(): MechanicEvent[] {
    if (!this.level) return [];
    const mechanicEvents: MechanicEvent[] = [];

    // Place lava tiles on first spin
    if (this.level.lavaConfig && this.spinCount === 1) {
      const placed = this.placeLavaInitial(this.level.lavaConfig.initialCount);
      mechanicEvents.push({ type: 'lavaPlaced', data: { cells: placed } });
    }

    // Place locked symbols
    if (this.level.lockedSymbolCount && this.level.lockedSymbolCount > 0) {
      const locked = this.placeLocks(this.level.lockedSymbolCount);
      mechanicEvents.push({ type: 'locksPlaced', data: { cells: locked } });
    }

    // Place fog
    if (this.level.fogCount && this.spinCount === 1) {
      const fogged = this.placeFog(this.level.fogCount);
      mechanicEvents.push({ type: 'fogPlaced', data: { cells: fogged } });
    }

    // Place shadow symbols
    if (this.level.shadowCount && this.spinCount === 1) {
      const shadowed = this.placeShadows(this.level.shadowCount);
      mechanicEvents.push({ type: 'shadowsPlaced', data: { cells: shadowed } });
    }

    // Place cursed symbols initially
    if (this.level.cursedConfig && this.spinCount === 1) {
      const cursed = this.placeCursedInitial(this.level.cursedConfig.initialCount);
      mechanicEvents.push({ type: 'cursedPlaced', data: { cells: cursed } });
    }

    // Place thorns initially
    if (this.level.thornCount && this.spinCount === 1) {
      const thorns = this.placeThorns(this.level.thornCount);
      mechanicEvents.push({ type: 'thornsPlaced', data: { cells: thorns } });
    }

    // Place dragon eggs
    if (this.level.dragonEggs && this.spinCount === 1) {
      this.placeDragonEggs();
      mechanicEvents.push({ type: 'dragonEggsPlaced', data: { eggs: this.level.dragonEggs } });
    }

    // Place relic pieces
    if (this.level.relicPieces && this.spinCount === 1) {
      this.placeRelicPieces();
      mechanicEvents.push({ type: 'relicPiecesPlaced', data: { pieces: this.level.relicPieces } });
    }

    // Setup portals
    if (this.level.portals && this.spinCount === 1) {
      this.setupPortals();
      mechanicEvents.push({ type: 'portalsSetup', data: { portals: this.level.portals } });
    }

    // Setup transformers
    if (this.level.transformers && this.spinCount === 1) {
      this.setupTransformers();
      mechanicEvents.push({ type: 'transformersSetup', data: { transformers: this.level.transformers } });
    }

    // Setup multiplier tiles
    if (this.level.multiplierTiles && this.spinCount === 1) {
      this.setupMultiplierTiles();
      mechanicEvents.push({ type: 'multiplierTilesSetup', data: { tiles: this.level.multiplierTiles } });
    }

    // Setup chain blockers
    if (this.level.chainBlockers && this.spinCount === 1) {
      this.setupChainBlockers();
      mechanicEvents.push({ type: 'chainBlockersSetup', data: { chains: this.level.chainBlockers } });
    }

    return mechanicEvents;
  }

  // =====================================================
  // SWAP/MATCH HOOKS
  // =====================================================

  /** Called when a valid swap is made — returns bonus score multiplier */
  onSwap(r1: number, c1: number, r2: number, c2: number): { bonusMultiplier: number; events: MechanicEvent[] } {
    if (!this.level) return { bonusMultiplier: 1, events: [] };
    const mechanicEvents: MechanicEvent[] = [];
    let bonusMultiplier = 1;

    this.totalSwapsUsed++;

    // Combo streak (Issue #17)
    if (this.level.comboStreak) {
      this.comboStreak++;
      if (this.comboStreak >= 3) bonusMultiplier *= 1.5;
      if (this.comboStreak >= 5) bonusMultiplier *= 2;
      if (this.comboStreak >= 8) bonusMultiplier *= 3;
      mechanicEvents.push({ type: 'comboStreak', data: { streak: this.comboStreak } });
    }

    // Shadow peek (Issue #18) — briefly reveal swapped shadow symbols
    const cell1 = this.grid[r1]?.[c1];
    const cell2 = this.grid[r2]?.[c2];
    if (cell1?.isShadow || cell2?.isShadow) {
      mechanicEvents.push({
        type: 'shadowPeek',
        data: {
          cells: [cell1?.isShadow ? { row: r1, col: c1 } : null, cell2?.isShadow ? { row: r2, col: c2 } : null].filter(
            Boolean,
          ),
        },
      });
    }

    return { bonusMultiplier, events: mechanicEvents };
  }

  /** Called when a swap fails (invalid) */
  onInvalidSwap(): void {
    // Break combo streak on invalid swap
    if (this.level?.comboStreak) {
      this.comboStreak = 0;
    }
  }

  /** Called when matches are cleared — handles special cell interactions */
  onMatchCleared(matches: { cells: { row: number; col: number }[]; symbolId: string }[]): {
    bonusScore: number;
    events: MechanicEvent[];
  } {
    if (!this.level) return { bonusScore: 0, events: [] };
    const mechanicEvents: MechanicEvent[] = [];
    let bonusScore = 0;

    const allCells = matches.flatMap((m) => m.cells);

    // Scatter tracking
    for (const match of matches) {
      if (match.symbolId === 'scatter') {
        this.scatterCount += match.cells.length;
        if (this.scatterCount >= 3) {
          mechanicEvents.push({ type: 'scatterBonus', data: { count: this.scatterCount } });
          this.scatterCount -= 3; // consume 3
        }
      }
    }

    // Multiplier tile bonus (Issue #16)
    if (this.level.multiplierTiles) {
      for (const cell of allCells) {
        const gridCell = this.grid[cell.row]?.[cell.col];
        if (gridCell?.tileMultiplier) {
          bonusScore += 50 * gridCell.tileMultiplier;
          mechanicEvents.push({
            type: 'multiplierTileHit',
            data: { row: cell.row, col: cell.col, multiplier: gridCell.tileMultiplier },
          });
        }
      }
    }

    // Chain blocker propagation (Issue #16)
    for (const cell of allCells) {
      const gridCell = this.grid[cell.row]?.[cell.col];
      if (gridCell?.chainLink) {
        const linked = this.grid[gridCell.chainLink.row]?.[gridCell.chainLink.col];
        if (linked?.isBlocker) {
          linked.blockerHealth--;
          if (linked.blockerHealth <= 0) {
            linked.isBlocker = false;
            mechanicEvents.push({
              type: 'chainBreak',
              data: { row: gridCell.chainLink.row, col: gridCell.chainLink.col },
            });
          } else {
            mechanicEvents.push({
              type: 'chainWeaken',
              data: { row: gridCell.chainLink.row, col: gridCell.chainLink.col, health: linked.blockerHealth },
            });
          }
        }
      }
    }

    // Thorn damage (Issue #18) — matching adjacent to thorns costs score
    if (this.level.thornCount) {
      for (const cell of allCells) {
        const neighbors = this.getNeighbors(cell.row, cell.col);
        for (const n of neighbors) {
          const nCell = this.grid[n.row]?.[n.col];
          if (nCell?.blockerType === 'thorn') {
            bonusScore -= 100; // penalty
            mechanicEvents.push({ type: 'thornDamage', data: { row: n.row, col: n.col } });
          }
        }
      }
    }

    // Fire symbol radius melt (Issue #19)
    for (const match of matches) {
      const sym = this.grid[match.cells[0]?.row]?.[match.cells[0]?.col];
      if (sym?.symbol.isFire || match.symbolId === 'firegem') {
        for (const cell of match.cells) {
          const neighbors = this.getNeighbors(cell.row, cell.col);
          for (const n of neighbors) {
            const nCell = this.grid[n.row]?.[n.col];
            if (nCell?.isBlocker) {
              nCell.blockerHealth = 0;
              nCell.isBlocker = false;
              bonusScore += 200;
              mechanicEvents.push({ type: 'fireMelt', data: { row: n.row, col: n.col } });
            }
          }
        }
      }
    }

    // Fog reveal (Issue #18) — clearing adjacent to fog reveals it
    if (this.level.fogCount) {
      for (const cell of allCells) {
        const neighbors = this.getNeighbors(cell.row, cell.col);
        for (const n of neighbors) {
          const nCell = this.grid[n.row]?.[n.col];
          if (nCell?.isFogged) {
            nCell.isFogged = false;
            mechanicEvents.push({ type: 'fogReveal', data: { row: n.row, col: n.col } });
          }
        }
      }
    }

    // Vine cutting (Issue #18) — matching adjacent to vine cuts it
    if (this.level.vineConfig) {
      for (const cell of allCells) {
        const neighbors = this.getNeighbors(cell.row, cell.col);
        for (const n of neighbors) {
          const nCell = this.grid[n.row]?.[n.col];
          if (nCell?.blockerType === 'vine') {
            nCell.isBlocker = false;
            nCell.blockerType = null;
            nCell.blockerHealth = 0;
            mechanicEvents.push({ type: 'vineCut', data: { row: n.row, col: n.col } });
          }
        }
      }
    }

    // Locked symbol unlock (Issue #17) — adjacent match unlocks
    if (this.level.lockedSymbolCount) {
      for (const cell of allCells) {
        const neighbors = this.getNeighbors(cell.row, cell.col);
        for (const n of neighbors) {
          const nCell = this.grid[n.row]?.[n.col];
          if (nCell?.isLocked) {
            nCell.isLocked = false;
            mechanicEvents.push({ type: 'symbolUnlocked', data: { row: n.row, col: n.col } });
          }
        }
      }
    }

    // Treasure chest hits (Issue #17)
    if (this.level.treasureChests) {
      for (const cell of allCells) {
        const neighbors = this.getNeighbors(cell.row, cell.col);
        for (const n of neighbors) {
          const nCell = this.grid[n.row]?.[n.col];
          if (nCell?.isChest) {
            nCell.chestHitsReceived = (nCell.chestHitsReceived || 0) + 1;
            if (nCell.chestHitsReceived >= (nCell.chestHitsNeeded || 3)) {
              // Chest opens!
              nCell.isChest = false;
              bonusScore += 500;
              mechanicEvents.push({ type: 'chestOpened', data: { row: n.row, col: n.col } });
            } else {
              mechanicEvents.push({
                type: 'chestHit',
                data: {
                  row: n.row,
                  col: n.col,
                  hits: nCell.chestHitsReceived,
                  needed: nCell.chestHitsNeeded,
                },
              });
            }
          }
        }
      }
    }

    // Mirror match (Issue #20) — duplicate matches on mirror side
    if (this.level.mirrorAxis) {
      const mirroredMatches = this.getMirroredMatches(allCells);
      if (mirroredMatches.length > 0) {
        bonusScore += mirroredMatches.length * 50;
        mechanicEvents.push({ type: 'mirrorMatch', data: { cells: mirroredMatches } });
        // Clear mirrored cells
        for (const mc of mirroredMatches) {
          this.grid[mc.row][mc.col] = null;
        }
      }
    }

    // Relic piece collection (Issue #20)
    if (this.level.relicPieces) {
      for (const cell of allCells) {
        const gridCell = this.grid[cell.row]?.[cell.col];
        if (gridCell?.isRelic) {
          this.relicPiecesCollected++;
          gridCell.isRelic = false;
          mechanicEvents.push({
            type: 'relicCollected',
            data: { piece: gridCell.relicPiece, total: this.relicPiecesCollected },
          });
          if (this.relicPiecesCollected >= 4) {
            bonusScore += 5000;
            mechanicEvents.push({ type: 'relicAssembled', data: {} });
          }
        }
      }
    }

    return { bonusScore, events: mechanicEvents };
  }

  // =====================================================
  // POWER-UP COMBO DETECTION (Issue #18)
  // =====================================================

  /** Check if swapping two power-ups creates a combo */
  isPowerUpCombo(r1: number, c1: number, r2: number, c2: number): string | null {
    if (!this.level?.powerUpCombos) return null;
    const cell1 = this.grid[r1]?.[c1];
    const cell2 = this.grid[r2]?.[c2];
    if (!cell1?.powerUp || !cell2?.powerUp) return null;

    const types = [cell1.powerUp, cell2.powerUp].sort().join('+');
    // blast+bomb = cross explosion (row+column+3x3)
    // blast+rainbow = all of one color explode in lines
    // bomb+rainbow = 3x3 on every instance of a color
    if (types === 'blast+bomb') return 'cross_explosion';
    if (types === 'blast+rainbow') return 'color_lines';
    if (types === 'bomb+rainbow') return 'color_bombs';
    if (types === 'blast+blast') return 'double_blast';
    if (types === 'bomb+bomb') return 'mega_bomb';
    if (types === 'rainbow+rainbow') return 'full_clear';
    return null;
  }

  /** Execute a power-up combo and return cleared cells */
  executePowerUpCombo(
    comboType: string,
    r1: number,
    c1: number,
    r2: number,
    c2: number,
  ): { cleared: { row: number; col: number }[]; score: number } {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 5;
    const cleared: { row: number; col: number }[] = [];

    switch (comboType) {
      case 'cross_explosion': {
        // Clear row + column of r1 + 3x3 around r2
        for (let c = 0; c < cols; c++) cleared.push({ row: r1, col: c });
        for (let r = 0; r < rows; r++) cleared.push({ row: r, col: c1 });
        for (let r = r2 - 1; r <= r2 + 1; r++) {
          for (let c = c2 - 1; c <= c2 + 1; c++) {
            if (r >= 0 && r < rows && c >= 0 && c < cols) cleared.push({ row: r, col: c });
          }
        }
        break;
      }
      case 'color_lines': {
        // All of one color explode in row/column lines
        const targetId = this.getRandomSymbolId();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (this.grid[r][c]?.symbol.id === targetId) {
              for (let cc = 0; cc < cols; cc++) cleared.push({ row: r, col: cc });
              break;
            }
          }
        }
        break;
      }
      case 'color_bombs': {
        // 3x3 on every instance of a color
        const targetId = this.getRandomSymbolId();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (this.grid[r][c]?.symbol.id === targetId) {
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  const nr = r + dr;
                  const nc = c + dc;
                  if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) cleared.push({ row: nr, col: nc });
                }
              }
            }
          }
        }
        break;
      }
      case 'double_blast': {
        // Clear both row and column
        for (let c = 0; c < cols; c++) {
          cleared.push({ row: r1, col: c });
          cleared.push({ row: r2, col: c });
        }
        for (let r = 0; r < rows; r++) {
          cleared.push({ row: r, col: c1 });
          cleared.push({ row: r, col: c2 });
        }
        break;
      }
      case 'mega_bomb': {
        // 5x5 area centered between the two
        const cr = Math.floor((r1 + r2) / 2);
        const cc = Math.floor((c1 + c2) / 2);
        for (let r = cr - 2; r <= cr + 2; r++) {
          for (let c = cc - 2; c <= cc + 2; c++) {
            if (r >= 0 && r < rows && c >= 0 && c < cols) cleared.push({ row: r, col: c });
          }
        }
        break;
      }
      case 'full_clear': {
        // Clear entire board
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            cleared.push({ row: r, col: c });
          }
        }
        break;
      }
    }

    // Deduplicate
    const unique = [...new Map(cleared.map((c) => [`${c.row},${c.col}`, c])).values()];

    // Clear cells
    for (const pos of unique) {
      if (this.grid[pos.row]?.[pos.col]) {
        this.grid[pos.row][pos.col] = null;
      }
    }

    return { cleared: unique, score: unique.length * 30 * 3 };
  }

  // =====================================================
  // MEGA POWER-UP (Issue #20)
  // =====================================================

  /** Check for triangle of 3 adjacent power-ups */
  findMegaPowerUp(): { cells: { row: number; col: number }[] } | null {
    if (!this.level?.megaPowerUp) return null;
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 5;

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        // Check 3 possible triangles from (r,c)
        const positions = [
          [
            { row: r, col: c },
            { row: r, col: c + 1 },
            { row: r + 1, col: c },
          ],
          [
            { row: r, col: c },
            { row: r, col: c + 1 },
            { row: r + 1, col: c + 1 },
          ],
          [
            { row: r, col: c },
            { row: r + 1, col: c },
            { row: r + 1, col: c + 1 },
          ],
        ];
        for (const tri of positions) {
          if (tri.every((p) => this.grid[p.row]?.[p.col]?.powerUp)) {
            return { cells: tri };
          }
        }
      }
    }
    return null;
  }

  /** Activate mega power-up — clears half the board */
  activateMegaPowerUp(cells: { row: number; col: number }[]): {
    cleared: { row: number; col: number }[];
    score: number;
  } {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 5;
    const allPositions: { row: number; col: number }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.grid[r][c]) allPositions.push({ row: r, col: c });
      }
    }

    // Clear ~half randomly in a spiral pattern
    const half = Math.floor(allPositions.length / 2);
    const shuffled = allPositions.sort(() => Math.random() - 0.5).slice(0, half);

    for (const pos of shuffled) {
      this.grid[pos.row][pos.col] = null;
    }

    return { cleared: shuffled, score: shuffled.length * 100 };
  }

  // =====================================================
  // SWAP VALIDATION EXTENSIONS
  // =====================================================

  /** Check if a cell can be swapped (additional restrictions beyond base rules) */
  canSwap(row: number, col: number): boolean {
    if (!this.level) return true;
    const cell = this.grid[row]?.[col];
    if (!cell) return false;

    // Locked symbols can't be swapped
    if (cell.isLocked) return false;

    // Fogged cells can't be swapped
    if (cell.isFogged) return false;

    // Column-locked cells can't be swapped
    if (this.lockedColumns.has(col)) return false;

    // Vine-covered cells can't be swapped
    if (cell.blockerType === 'vine') return false;

    // Dragon eggs can't be swapped
    if (cell.isDragonEgg) return false;

    // Inactive cells (phase shift) can't be swapped
    if (cell.isActive === false) return false;

    return true;
  }

  /** Check total swap budget */
  hasSwapsRemaining(): boolean {
    if (!this.level?.totalSwapBudget) return true;
    return this.totalSwapsUsed < this.level.totalSwapBudget;
  }

  // =====================================================
  // PORTAL TELEPORTATION (Issue #18)
  // =====================================================

  /** During gravity, if a symbol falls into a portal, teleport it */
  handlePortalTeleport(row: number, col: number): { row: number; col: number } | null {
    if (!this.level?.portals) return null;
    const cell = this.grid[row]?.[col];
    if (!cell?.portalId) return null;

    // Find the paired portal
    for (const portal of this.level.portals) {
      if (portal.id === cell.portalId) {
        if (portal.cell1.row === row && portal.cell1.col === col) {
          return portal.cell2;
        }
        if (portal.cell2.row === row && portal.cell2.col === col) {
          return portal.cell1;
        }
      }
    }
    return null;
  }

  // =====================================================
  // TRANSFORMER TILES (Issue #19)
  // =====================================================

  /** When a symbol lands on a transformer, change its type */
  handleTransformer(row: number, col: number): boolean {
    const cell = this.grid[row]?.[col];
    if (!cell?.transformsTo) return false;

    const targetSymbol = getSymbolsForLevel(this.level?.id || 1).find((s) => s.id === cell.transformsTo);
    if (targetSymbol && this.grid[row][col]) {
      this.grid[row][col]!.symbol = targetSymbol;
      return true;
    }
    return false;
  }

  // =====================================================
  // SCORE DECAY (Issue #20)
  // =====================================================

  /** Calculate score decay amount based on elapsed time */
  getScoreDecay(elapsedMs: number): number {
    if (!this.level?.scoreDecay) return 0;
    return Math.floor((elapsedMs / 1000) * this.level.scoreDecay.ratePerSecond);
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private getNeighbors(row: number, col: number): { row: number; col: number }[] {
    const result: { row: number; col: number }[] = [];
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 5;
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        result.push({ row: nr, col: nc });
      }
    }
    return result;
  }

  private getRandomSymbolId(): string {
    const ids: string[] = [];
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell && !cell.symbol.isWild && !cell.symbol.isScatter) {
          ids.push(cell.symbol.id);
        }
      }
    }
    return ids[Math.floor(Math.random() * ids.length)] || 'ruby';
  }

  private getRandomEmptyCells(count: number): { row: number; col: number }[] {
    const available: { row: number; col: number }[] = [];
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < (this.grid[0]?.length || 5); c++) {
        const cell = this.grid[r][c];
        if (cell && !cell.isBlocker && !cell.isLava && !cell.isChest && !cell.isDragonEgg && !cell.isRelic) {
          available.push({ row: r, col: c });
        }
      }
    }
    // Shuffle and take count
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  private applyBlizzard(count: number): { row: number; col: number }[] {
    const cells = this.getRandomEmptyCells(count);
    for (const pos of cells) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isBlocker = true;
        cell.blockerType = 'ice';
        cell.blockerHealth = 1;
      }
    }
    return cells;
  }

  private shiftConveyors(): { row: number; from: number; to: number }[] {
    if (!this.level?.conveyors) return [];
    const shifts: { row: number; from: number; to: number }[] = [];
    const cols = this.grid[0]?.length || 5;

    for (const conveyor of this.level.conveyors) {
      const r = conveyor.row;
      if (r < 0 || r >= this.grid.length) continue;

      const row = this.grid[r];
      if (conveyor.direction === 'right') {
        const last = row[cols - 1];
        for (let c = cols - 1; c > 0; c--) {
          row[c] = row[c - 1];
          if (row[c]) row[c]!.col = c;
        }
        row[0] = last;
        if (row[0]) row[0]!.col = 0;
      } else {
        const first = row[0];
        for (let c = 0; c < cols - 1; c++) {
          row[c] = row[c + 1];
          if (row[c]) row[c]!.col = c;
        }
        row[cols - 1] = first;
        if (row[cols - 1]) row[cols - 1]!.col = cols - 1;
      }
      shifts.push({ row: r, from: 0, to: cols - 1 });
    }
    return shifts;
  }

  private applyColumnLocks(): void {
    if (!this.level?.columnLocks) return;
    this.lockedColumns.clear();
    // Lock random columns from the config list
    const available = [...this.level.columnLocks.columns];
    const count = Math.min(2, available.length); // lock up to 2 columns
    const shuffled = available.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      this.lockedColumns.add(shuffled[i]);
    }
  }

  private spreadLava(): { row: number; col: number }[] {
    const newCells: { row: number; col: number }[] = [];
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.grid[r][c]?.isLava) {
          const neighbors = this.getNeighbors(r, c);
          for (const n of neighbors) {
            const nCell = this.grid[n.row][n.col];
            if (nCell && !nCell.isBlocker && !nCell.isLava) {
              if (Math.random() < 0.3) {
                nCell.isLava = true;
                newCells.push({ row: n.row, col: n.col });
              }
            }
          }
        }
      }
    }
    return newCells;
  }

  private spreadCurses(): { row: number; col: number }[] {
    if (!this.level?.cursedConfig) return [];
    const newCursed: { row: number; col: number }[] = [];

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < (this.grid[0]?.length || 5); c++) {
        const cell = this.grid[r][c];
        if (cell?.isCursed) {
          cell.curseTurnsLeft = (cell.curseTurnsLeft || this.level.cursedConfig.spreadAfterSpins) - 1;
          if (cell.curseTurnsLeft <= 0) {
            // Spread to neighbors
            const neighbors = this.getNeighbors(r, c);
            for (const n of neighbors) {
              const nCell = this.grid[n.row][n.col];
              if (nCell && !nCell.isCursed && !nCell.isBlocker) {
                nCell.isCursed = true;
                nCell.curseTurnsLeft = this.level.cursedConfig.spreadAfterSpins;
                newCursed.push({ row: n.row, col: n.col });
              }
            }
          }
        }
      }
    }
    return newCursed;
  }

  private growVines(): { row: number; col: number }[] {
    if (!this.level?.vineConfig) return [];
    const newVines: { row: number; col: number }[] = [];
    const cols = this.grid[0]?.length || 5;
    const rows = this.grid.length;

    // Find existing vines and grow from them
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.grid[r][c]?.blockerType === 'vine') {
          const neighbors = this.getNeighbors(r, c);
          for (const n of neighbors) {
            const nCell = this.grid[n.row][n.col];
            if (nCell && !nCell.isBlocker && Math.random() < 0.25) {
              nCell.isBlocker = true;
              nCell.blockerType = 'vine';
              nCell.blockerHealth = 1;
              newVines.push({ row: n.row, col: n.col });
              if (newVines.length >= this.level.vineConfig.growthPerSpin) return newVines;
            }
          }
        }
      }
    }
    return newVines;
  }

  private tickDragonEggs(): { row: number; col: number; bonus: number }[] {
    const hatched: { row: number; col: number; bonus: number }[] = [];

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < (this.grid[0]?.length || 5); c++) {
        const cell = this.grid[r][c];
        if (cell?.isDragonEgg) {
          cell.eggSpinsLeft = (cell.eggSpinsLeft || 3) - 1;
          cell.eggStage = Math.min(2, (cell.eggStage || 0) + 1);

          if (cell.eggSpinsLeft <= 0) {
            // Hatch!
            cell.isDragonEgg = false;
            hatched.push({ row: r, col: c, bonus: 2000 });
          }
        }
      }
    }
    return hatched;
  }

  private placeLavaInitial(count: number): { row: number; col: number }[] {
    const cells = this.getRandomEmptyCells(count);
    for (const pos of cells) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isLava = true;
      }
    }
    return cells;
  }

  private placeLocks(count: number): { row: number; col: number }[] {
    const cells = this.getRandomEmptyCells(count);
    for (const pos of cells) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isLocked = true;
      }
    }
    return cells;
  }

  private placeFog(count: number): { row: number; col: number }[] {
    const cells = this.getRandomEmptyCells(count);
    for (const pos of cells) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isFogged = true;
      }
    }
    return cells;
  }

  private placeShadows(count: number): { row: number; col: number }[] {
    const cells = this.getRandomEmptyCells(count);
    for (const pos of cells) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isShadow = true;
      }
    }
    return cells;
  }

  private placeCursedInitial(count: number): { row: number; col: number }[] {
    const cells = this.getRandomEmptyCells(count);
    for (const pos of cells) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isCursed = true;
        cell.curseTurnsLeft = this.level?.cursedConfig?.spreadAfterSpins || 2;
      }
    }
    return cells;
  }

  private placeThorns(count: number): { row: number; col: number }[] {
    const cells = this.getRandomEmptyCells(count);
    for (const pos of cells) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isBlocker = true;
        cell.blockerType = 'thorn';
        cell.blockerHealth = 99; // thorns can't be broken by adjacent matches
      }
    }
    return cells;
  }

  private placeDragonEggs(): void {
    if (!this.level?.dragonEggs) return;
    for (const egg of this.level.dragonEggs) {
      const cell = this.grid[egg.row]?.[egg.col];
      if (cell) {
        cell.isDragonEgg = true;
        cell.eggSpinsLeft = egg.spinsToHatch;
        cell.eggStage = 0;
      }
    }
  }

  private placeRelicPieces(): void {
    if (!this.level?.relicPieces) return;
    for (const piece of this.level.relicPieces) {
      const cell = this.grid[piece.row]?.[piece.col];
      if (cell) {
        cell.isRelic = true;
        cell.relicPiece = piece.piece;
      }
    }
  }

  private setupPortals(): void {
    if (!this.level?.portals) return;
    for (const portal of this.level.portals) {
      const cell1 = this.grid[portal.cell1.row]?.[portal.cell1.col];
      const cell2 = this.grid[portal.cell2.row]?.[portal.cell2.col];
      if (cell1) cell1.portalId = portal.id;
      if (cell2) cell2.portalId = portal.id;
    }
  }

  private setupTransformers(): void {
    if (!this.level?.transformers) return;
    for (const t of this.level.transformers) {
      const cell = this.grid[t.row]?.[t.col];
      if (cell) cell.transformsTo = t.transformsTo;
    }
  }

  private setupMultiplierTiles(): void {
    if (!this.level?.multiplierTiles) return;
    for (const t of this.level.multiplierTiles) {
      const cell = this.grid[t.row]?.[t.col];
      if (cell) cell.tileMultiplier = t.multiplier;
    }
  }

  private setupChainBlockers(): void {
    if (!this.level?.chainBlockers) return;
    for (const chain of this.level.chainBlockers) {
      for (let i = 0; i < chain.cells.length; i++) {
        const cell = this.grid[chain.cells[i].row]?.[chain.cells[i].col];
        if (cell) {
          cell.isBlocker = true;
          cell.blockerType = 'chain';
          cell.blockerHealth = 1;
          // Link to next in chain
          if (i + 1 < chain.cells.length) {
            cell.chainLink = chain.cells[i + 1];
          }
        }
      }
    }
  }

  private applyPhaseShift(): void {
    if (!this.level?.phaseShifts) return;
    const phase = this.level.phaseShifts[this.currentPhase];
    if (!phase) return;

    const activeSet = new Set(phase.activeCells.map((c) => `${c.row},${c.col}`));
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < (this.grid[0]?.length || 5); c++) {
        const cell = this.grid[r][c];
        if (cell) {
          cell.isActive = activeSet.has(`${r},${c}`);
        }
      }
    }
  }

  private getMirroredMatches(cells: { row: number; col: number }[]): { row: number; col: number }[] {
    if (!this.level?.mirrorAxis) return [];
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 5;
    const mirrored: { row: number; col: number }[] = [];

    for (const cell of cells) {
      let mr: number, mc: number;
      if (this.level.mirrorAxis === 'vertical') {
        mr = cell.row;
        mc = cols - 1 - cell.col;
      } else {
        mr = rows - 1 - cell.row;
        mc = cell.col;
      }
      if (mr >= 0 && mr < rows && mc >= 0 && mc < cols && this.grid[mr][mc]) {
        mirrored.push({ row: mr, col: mc });
      }
    }
    return mirrored;
  }
}
