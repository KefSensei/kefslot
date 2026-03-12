import { Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { CellData, PowerUpType } from '@/models/Symbol';
import { SymbolDef, getSymbolsForLevel } from '@/config/SymbolConfig';
import { weightedRandom } from '@/utils/MathUtils';
import { createCell } from '@/models/Symbol';
import { MatchEffects } from '@/effects/MatchEffects';
import gsap from 'gsap';

const CELL = GameConfig.cellSize;
const GAP = 4;

export class SlotGrid extends Container {
  private cells: (CellSprite | null)[][] = [];
  private gridData: (CellData | null)[][] = [];
  private _interactive = false;
  private matchEffects: MatchEffects;

  // Drag state
  private dragStart: { row: number; col: number; px: number; py: number } | null = null;
  private isDragging = false;

  onSwapAttempt: ((r1: number, c1: number, r2: number, c2: number) => void) | null = null;

  constructor() {
    super();
    this.matchEffects = new MatchEffects();
    this.addChild(this.matchEffects);
  }

  /** Access the effects layer for external use */
  getEffects(): MatchEffects {
    return this.matchEffects;
  }

  // Generate a fresh grid for a level (allow initial matches for auto-resolve)
  generateGrid(level: number): (CellData | null)[][] {
    const symbols = getSymbolsForLevel(level);
    const rows = GameConfig.rows;
    const cols = GameConfig.cols;

    this.gridData = [];
    for (let r = 0; r < rows; r++) {
      this.gridData[r] = [];
      for (let c = 0; c < cols; c++) {
        const sym = weightedRandom(symbols);
        this.gridData[r][c] = createCell(sym, r, c);
      }
    }

    this.renderGrid();
    return this.gridData;
  }

  // Sync visual to data
  renderGrid(): void {
    // Keep effects layer, remove everything else
    const effectsRef = this.matchEffects;
    this.removeChildren();
    this.addChild(effectsRef);
    this.cells = [];

    const rows = GameConfig.rows;
    const cols = GameConfig.cols;
    const totalW = cols * (CELL + GAP) - GAP;
    const totalH = rows * (CELL + GAP) - GAP;
    const offsetX = -totalW / 2;
    const offsetY = -totalH / 2;

    // Background panel
    const bg = new Graphics();
    bg.roundRect(offsetX - 12, offsetY - 12, totalW + 24, totalH + 24, 12);
    bg.fill({ color: 0x0d0520, alpha: 0.6 });
    this.addChildAt(bg, 0);

    for (let r = 0; r < rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < cols; c++) {
        const data = this.gridData[r]?.[c];
        if (data) {
          const sprite = new CellSprite(data);
          sprite.x = offsetX + c * (CELL + GAP);
          sprite.y = offsetY + r * (CELL + GAP);
          this.addChild(sprite);
          this.cells[r][c] = sprite;

          // Drag handlers
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerdown', (e: FederatedPointerEvent) => this.onDragStart(r, c, e));
          sprite.on('pointermove', (e: FederatedPointerEvent) => this.onDragMove(r, c, e));
          sprite.on('pointerup', () => this.onDragEnd());
          sprite.on('pointerupoutside', () => this.onDragEnd());
        } else {
          this.cells[r][c] = null;
        }
      }
    }

    // Make sure effects are on top
    this.setChildIndex(effectsRef, this.children.length - 1);
  }

  setInteractive(enabled: boolean): void {
    this._interactive = enabled;
    this.dragStart = null;
    this.isDragging = false;
  }

  // Update grid data and re-render
  async updateGrid(newData: (CellData | null)[][]): Promise<void> {
    this.gridData = newData;
    this.renderGrid();
  }

  // Animate clearing matched cells with confetti
  async animateClear(positions: { row: number; col: number }[], score?: number): Promise<void> {
    const tl = gsap.timeline();
    const worldPositions: { x: number; y: number }[] = [];
    let color = 0xffffff;

    for (const pos of positions) {
      const sprite = this.cells[pos.row]?.[pos.col];
      if (sprite) {
        worldPositions.push({ x: sprite.x, y: sprite.y });
        color = sprite.data.symbol.color;
        tl.to(sprite.scale, { x: 0, y: 0, duration: 0.25, ease: 'back.in' }, 0);
        tl.to(sprite, { alpha: 0, duration: 0.25 }, 0);
      }
    }

    // Confetti and floating score
    if (worldPositions.length > 0) {
      this.matchEffects.spawnConfetti(worldPositions, color);
      if (score && score > 0) {
        const cx = worldPositions.reduce((s, p) => s + p.x, 0) / worldPositions.length;
        const cy = worldPositions.reduce((s, p) => s + p.y, 0) / worldPositions.length;
        this.matchEffects.showFloatingScore(cx, cy, score, color);
      }
    }

    await tl.then();
  }

  // Animate the spin: symbols roll upward and fade
  async animateSpin(): Promise<void> {
    const allSprites = this.cells.flat().filter(Boolean) as CellSprite[];
    if (allSprites.length === 0) return;

    const tl = gsap.timeline();
    for (let c = 0; c < GameConfig.cols; c++) {
      for (let r = 0; r < GameConfig.rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          tl.to(sprite, {
            y: sprite.y - 300,
            alpha: 0,
            duration: 0.35,
            ease: 'power2.in',
          }, c * 0.08 + r * 0.02);
        }
      }
    }
    await tl.then();
  }

  // Slot-style reel drop animation: symbols fall from above per column
  async animateLand(): Promise<void> {
    this.renderGrid();
    const rows = GameConfig.rows;
    const cols = GameConfig.cols;

    const tl = gsap.timeline();

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          const targetY = sprite.y;
          // Start from way above, staggered per column like a slot reel
          sprite.y = targetY - 600 - r * 60;
          sprite.alpha = 1;

          // Each column drops with a reel-like stagger
          const colDelay = c * 0.15;
          const rowDelay = r * 0.04;

          tl.to(sprite, {
            y: targetY,
            duration: 0.45,
            ease: 'bounce.out',
          }, colDelay + rowDelay);
        }
      }
    }
    await tl.then();
  }

  // Animate gravity drop for cells that moved down
  async animateGravityDrop(newData: (CellData | null)[][]): Promise<void> {
    const oldPositions = new Map<string, { x: number; y: number }>();

    // Capture current positions by cell identity
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < (this.cells[r]?.length || 0); c++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          oldPositions.set(`${sprite.data.symbol.id}_${r}_${c}`, { x: sprite.x, y: sprite.y });
        }
      }
    }

    this.gridData = newData;
    this.renderGrid();

    const tl = gsap.timeline();
    const totalW = GameConfig.cols * (CELL + GAP) - GAP;
    const totalH = GameConfig.rows * (CELL + GAP) - GAP;
    const offsetY = -totalH / 2;

    for (let c = 0; c < GameConfig.cols; c++) {
      for (let r = 0; r < GameConfig.rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (!sprite) continue;
        const data = newData[r]?.[c];
        if (!data) continue;

        const targetY = sprite.y;

        // New cells (filled from top) start above the grid
        if (data.row !== r || !oldPositions.has(`${data.symbol.id}_${data.row}_${data.col}`)) {
          sprite.y = offsetY - 100 - Math.random() * 100;
          tl.to(sprite, {
            y: targetY,
            duration: 0.4,
            ease: 'bounce.out',
          }, c * 0.05 + r * 0.03);
        }
      }
    }

    if (tl.getChildren().length > 0) {
      await tl.then();
    }
  }

  // Animate swap between two cells
  async animateSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    const s1 = this.cells[r1]?.[c1];
    const s2 = this.cells[r2]?.[c2];
    if (!s1 || !s2) return;

    const tl = gsap.timeline();
    tl.to(s1, { x: s2.x, y: s2.y, duration: 0.2, ease: 'power2.inOut' }, 0);
    tl.to(s2, { x: s1.x, y: s1.y, duration: 0.2, ease: 'power2.inOut' }, 0);
    await tl.then();
  }

  // Animate invalid swap (bounce back)
  async animateInvalidSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    const s1 = this.cells[r1]?.[c1];
    const s2 = this.cells[r2]?.[c2];
    if (!s1 || !s2) return;

    const s1x = s1.x, s1y = s1.y;
    const s2x = s2.x, s2y = s2.y;

    const tl = gsap.timeline();
    tl.to(s1, { x: s2x, y: s2y, duration: 0.15, ease: 'power2.inOut' }, 0);
    tl.to(s2, { x: s1x, y: s1y, duration: 0.15, ease: 'power2.inOut' }, 0);
    tl.to(s1, { x: s1x, y: s1y, duration: 0.15, ease: 'power2.inOut' }, 0.15);
    tl.to(s2, { x: s2x, y: s2y, duration: 0.15, ease: 'power2.inOut' }, 0.15);
    await tl.then();
  }

  /** Get cell position in local coords */
  getCellPosition(row: number, col: number): { x: number; y: number } | null {
    const sprite = this.cells[row]?.[col];
    if (sprite) return { x: sprite.x + CELL / 2, y: sprite.y + CELL / 2 };
    return null;
  }

  // --- Drag-to-swap ---

  private onDragStart(row: number, col: number, e: FederatedPointerEvent): void {
    if (!this._interactive) return;
    const local = e.getLocalPosition(this);
    this.dragStart = { row, col, px: local.x, py: local.y };
    this.isDragging = true;

    // Highlight the cell
    this.cells[row]?.[col]?.setSelected(true);
  }

  private onDragMove(_row: number, _col: number, e: FederatedPointerEvent): void {
    if (!this._interactive || !this.isDragging || !this.dragStart) return;

    const local = e.getLocalPosition(this);
    const dx = local.x - this.dragStart.px;
    const dy = local.y - this.dragStart.py;
    const threshold = CELL * 0.4;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      // Determine swap direction
      let dr = 0, dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        dc = dx > 0 ? 1 : -1;
      } else {
        dr = dy > 0 ? 1 : -1;
      }

      const tr = this.dragStart.row + dr;
      const tc = this.dragStart.col + dc;

      // Validate target is in bounds
      if (tr >= 0 && tr < GameConfig.rows && tc >= 0 && tc < GameConfig.cols) {
        // Clear highlight
        this.cells[this.dragStart.row]?.[this.dragStart.col]?.setSelected(false);

        // Trigger swap
        const { row: sr, col: sc } = this.dragStart;
        this.dragStart = null;
        this.isDragging = false;
        this.onSwapAttempt?.(sr, sc, tr, tc);
      }
    }
  }

  private onDragEnd(): void {
    if (this.dragStart) {
      this.cells[this.dragStart.row]?.[this.dragStart.col]?.setSelected(false);
    }
    this.dragStart = null;
    this.isDragging = false;
  }
}

// Individual cell visual
class CellSprite extends Container {
  private bg: Graphics;
  private icon: Graphics;
  private cellLabel: Text;
  private selectHighlight: Graphics;

  constructor(public data: CellData) {
    super();

    const size = CELL;

    // Background tile
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, size, size, 8);
    this.bg.fill({ color: 0x1e0a3a, alpha: 0.8 });
    this.bg.stroke({ color: data.symbol.color, width: 2, alpha: 0.5 });
    this.addChild(this.bg);

    // Symbol shape
    this.icon = new Graphics();
    this.drawShape(this.icon, data.symbol.shape, data.symbol.color, size);
    this.addChild(this.icon);

    // Power-up indicator
    if (data.powerUp) {
      const puIcon = this.createPowerUpIndicator(data.powerUp);
      this.addChild(puIcon);
    }

    // Symbol label (first letter)
    const style = new TextStyle({ fontSize: 11, fill: 0xffffff, fontFamily: 'monospace' });
    this.cellLabel = new Text({ text: data.symbol.name.charAt(0), style });
    this.cellLabel.x = 4;
    this.cellLabel.y = 2;
    this.addChild(this.cellLabel);

    // Selection highlight
    this.selectHighlight = new Graphics();
    this.selectHighlight.roundRect(-2, -2, size + 4, size + 4, 10);
    this.selectHighlight.stroke({ color: 0xf1c40f, width: 3, alpha: 0.9 });
    this.selectHighlight.visible = false;
    this.addChild(this.selectHighlight);
  }

  setSelected(selected: boolean): void {
    this.selectHighlight.visible = selected;
  }

  private drawShape(g: Graphics, shape: string, color: number, size: number): void {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.3;

    switch (shape) {
      case 'circle':
        g.circle(cx, cy, r);
        g.fill({ color });
        break;
      case 'diamond':
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy);
        g.lineTo(cx, cy + r);
        g.lineTo(cx - r, cy);
        g.closePath();
        g.fill({ color });
        break;
      case 'square':
        g.rect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
        g.fill({ color });
        break;
      case 'triangle':
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy + r * 0.7);
        g.lineTo(cx - r, cy + r * 0.7);
        g.closePath();
        g.fill({ color });
        break;
      case 'star': {
        const spikes = 5;
        const outerR = r;
        const innerR = r * 0.5;
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const radius = i % 2 === 0 ? outerR : innerR;
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fill({ color });
        break;
      }
      case 'hexagon': {
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fill({ color });
        break;
      }
    }
  }

  private createPowerUpIndicator(type: PowerUpType): Graphics {
    const g = new Graphics();
    const size = CELL;
    const color = type === 'blast' ? 0x00e5ff : type === 'bomb' ? 0xff5722 : 0xffd700;
    g.circle(size - 12, 12, 8);
    g.fill({ color });
    g.stroke({ color: 0xffffff, width: 1.5 });
    return g;
  }
}
