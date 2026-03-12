import { Container, Graphics, Text, TextStyle, FederatedPointerEvent, FillGradient } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { CellData, PowerUpType } from '@/models/Symbol';
import { SymbolDef, getSymbolsForLevel } from '@/config/SymbolConfig';
import { weightedRandom } from '@/utils/MathUtils';
import { createCell } from '@/models/Symbol';
import { MatchEffects } from '@/effects/MatchEffects';
import { lightenColor, darkenColor, colorToHex } from '@/utils/ColorUtils';
import gsap from 'gsap';

const CELL = GameConfig.cellSize;
const GAP = 4;

// Cached gradients per symbol color
const gradientCache = new Map<number, FillGradient>();
function getSymbolGradient(color: number): FillGradient {
  if (gradientCache.has(color)) return gradientCache.get(color)!;
  const grad = new FillGradient({
    type: 'linear',
    colorStops: [
      { offset: 0, color: colorToHex(lightenColor(color, 0.35)) },
      { offset: 0.5, color: colorToHex(color) },
      { offset: 1, color: colorToHex(darkenColor(color, 0.35)) },
    ],
    textureSpace: 'local',
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  });
  gradientCache.set(color, grad);
  return grad;
}

// Gold frame gradient
function createGoldGradient(vertical = false): FillGradient {
  return new FillGradient({
    type: 'linear',
    colorStops: [
      { offset: 0, color: '#8B7332' },
      { offset: 0.4, color: '#D4AF37' },
      { offset: 0.6, color: '#F5D060' },
      { offset: 1, color: '#8B7332' },
    ],
    textureSpace: 'local',
    start: vertical ? { x: 0.5, y: 0 } : { x: 0, y: 0.5 },
    end: vertical ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 },
  });
}

export class SlotGrid extends Container {
  private cells: (CellSprite | null)[][] = [];
  private gridData: (CellData | null)[][] = [];
  private _interactive = false;
  private matchEffects: MatchEffects;

  // Frame elements
  private frameContainer = new Container();
  private frameLightStrip: Graphics | null = null;

  // Idle animation
  private shimmerGraphic: Graphics | null = null;
  private shimmerTween: gsap.core.Tween | null = null;

  // Hint overlay
  private hintGraphics: Graphics[] = [];
  private hintTweens: gsap.core.Tween[] = [];

  // Power-up glow
  private powerUpGlowTweens: gsap.core.Tween[] = [];

  // Drag state
  private dragStart: { row: number; col: number; px: number; py: number } | null = null;
  private isDragging = false;

  onSwapAttempt: ((r1: number, c1: number, r2: number, c2: number) => void) | null = null;
  onPowerUpTap: ((row: number, col: number) => void) | null = null;

  constructor() {
    super();
    this.addChild(this.frameContainer);
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
    const effectsRef = this.matchEffects;
    const frameRef = this.frameContainer;

    // Remove everything except frame and effects
    this.removeChildren();
    this.addChild(frameRef);
    this.addChild(effectsRef);
    this.cells = [];

    const rows = GameConfig.rows;
    const cols = GameConfig.cols;
    const totalW = cols * (CELL + GAP) - GAP;
    const totalH = rows * (CELL + GAP) - GAP;
    const offsetX = -totalW / 2;
    const offsetY = -totalH / 2;

    // Build slot machine frame
    this.buildFrame(offsetX, offsetY, totalW, totalH);

    // Cell tiles background
    const tilesBg = new Graphics();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * (CELL + GAP);
        const y = offsetY + r * (CELL + GAP);
        tilesBg.roundRect(x, y, CELL, CELL, 6);
        tilesBg.fill({ color: lightenColor(0x0d0520, 0.08), alpha: 0.7 });
      }
    }
    this.addChildAt(tilesBg, 1);

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
          sprite.on('pointerup', (e: FederatedPointerEvent) => this.onDragEnd(e));
          sprite.on('pointerupoutside', () => this.onDragEnd());
        } else {
          this.cells[r][c] = null;
        }
      }
    }

    // Make sure effects are on top
    this.setChildIndex(effectsRef, this.children.length - 1);

    // Start idle animations
    this.startIdleAnimations(offsetX, offsetY, totalW, totalH);
  }

  private buildFrame(offsetX: number, offsetY: number, totalW: number, totalH: number): void {
    this.frameContainer.removeChildren();
    const pad = 16;
    const fx = offsetX - pad;
    const fy = offsetY - pad;
    const fw = totalW + pad * 2;
    const fh = totalH + pad * 2;

    // Dark background panel
    const panel = new Graphics();
    panel.roundRect(fx - 2, fy - 2, fw + 4, fh + 4, 14);
    panel.fill({ color: 0x0d0520, alpha: 0.85 });
    this.frameContainer.addChild(panel);

    // Gold frame border
    const frame = new Graphics();
    frame.roundRect(fx, fy, fw, fh, 12);
    frame.stroke({ color: 0xD4AF37, width: 4, alpha: 0.9 });
    this.frameContainer.addChild(frame);

    // Inner gold trim
    const innerFrame = new Graphics();
    innerFrame.roundRect(fx + 6, fy + 6, fw - 12, fh - 12, 8);
    innerFrame.stroke({ color: 0xF5D060, width: 1.5, alpha: 0.4 });
    this.frameContainer.addChild(innerFrame);

    // Corner diamonds
    const corners = [
      { x: fx, y: fy },
      { x: fx + fw, y: fy },
      { x: fx, y: fy + fh },
      { x: fx + fw, y: fy + fh },
    ];
    for (const corner of corners) {
      const d = new Graphics();
      const s = 8;
      d.moveTo(corner.x, corner.y - s);
      d.lineTo(corner.x + s, corner.y);
      d.lineTo(corner.x, corner.y + s);
      d.lineTo(corner.x - s, corner.y);
      d.closePath();
      d.fill({ color: 0xF5D060 });
      this.frameContainer.addChild(d);
    }

    // Reel dividers (vertical lines between columns)
    const cols = GameConfig.cols;
    for (let c = 1; c < cols; c++) {
      const lx = offsetX + c * (CELL + GAP) - GAP / 2;
      const divider = new Graphics();
      divider.moveTo(lx, offsetY - 4);
      divider.lineTo(lx, offsetY + GameConfig.rows * (CELL + GAP) - GAP + 4);
      divider.stroke({ color: 0x2a1050, width: 1.5, alpha: 0.5 });
      this.frameContainer.addChild(divider);
    }

    // Light strip (pulses on wins)
    this.frameLightStrip = new Graphics();
    this.frameLightStrip.roundRect(fx + 3, fy + 3, fw - 6, fh - 6, 10);
    this.frameLightStrip.stroke({ color: 0xF5D060, width: 2, alpha: 0 });
    this.frameContainer.addChild(this.frameLightStrip);
  }

  /** Pulse the frame light strip (call on wins) */
  pulseFrame(): void {
    if (!this.frameLightStrip) return;
    gsap.fromTo(this.frameLightStrip, { alpha: 0.8 }, { alpha: 0, duration: 0.6, ease: 'power2.out' });
  }

  private startIdleAnimations(offsetX: number, offsetY: number, totalW: number, totalH: number): void {
    // Breathing pulse on cells
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < (this.cells[r]?.length || 0); c++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          const dur = 2.5 + Math.random() * 1.5;
          const del = Math.random() * 3;
          gsap.to(sprite.scale, {
            x: 1.02, y: 1.02,
            duration: dur,
            delay: del,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          });
        }
      }
    }

    // Shimmer sweep
    if (this.shimmerTween) this.shimmerTween.kill();
    if (this.shimmerGraphic) {
      this.shimmerGraphic.destroy();
      this.shimmerGraphic = null;
    }

    const shimmer = new Graphics();
    // Diagonal white stripe
    const sw = 40;
    shimmer.moveTo(0, -totalH);
    shimmer.lineTo(sw, -totalH);
    shimmer.lineTo(sw, totalH + 40);
    shimmer.lineTo(0, totalH + 40);
    shimmer.closePath();
    shimmer.fill({ color: 0xffffff, alpha: 0.06 });
    shimmer.rotation = 0.3;
    shimmer.x = offsetX - 60;
    shimmer.y = offsetY;
    this.addChildAt(shimmer, 2);
    this.shimmerGraphic = shimmer;

    // Mask shimmer to grid area
    const mask = new Graphics();
    mask.roundRect(offsetX - 2, offsetY - 2, totalW + 4, totalH + 4, 8);
    mask.fill({ color: 0xffffff });
    this.addChild(mask);
    shimmer.mask = mask;

    this.shimmerTween = gsap.fromTo(shimmer, { x: offsetX - 80 }, {
      x: offsetX + totalW + 80,
      duration: 3,
      delay: 2,
      repeat: -1,
      repeatDelay: 5,
      ease: 'none',
    });
  }

  /** Pulse power-up cells to invite tapping */
  startPowerUpGlow(): void {
    this.stopPowerUpGlow();
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < (this.cells[r]?.length || 0); c++) {
        const sprite = this.cells[r]?.[c];
        if (sprite?.data.powerUp) {
          const tw = gsap.to(sprite, {
            alpha: 0.6,
            duration: 0.5,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          });
          this.powerUpGlowTweens.push(tw);
        }
      }
    }
  }

  /** Stop power-up pulsing */
  stopPowerUpGlow(): void {
    for (const tw of this.powerUpGlowTweens) tw.kill();
    this.powerUpGlowTweens = [];
    // Reset alpha
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < (this.cells[r]?.length || 0); c++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) sprite.alpha = 1;
      }
    }
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
        worldPositions.push({ x: sprite.x + CELL / 2, y: sprite.y + CELL / 2 });
        color = sprite.data.symbol.color;
        tl.to(sprite.scale, { x: 0, y: 0, duration: 0.25, ease: 'back.in' }, 0);
        tl.to(sprite, { alpha: 0, duration: 0.25 }, 0);
      }
    }

    // Confetti and floating score
    if (worldPositions.length > 0) {
      this.matchEffects.spawnConfetti(worldPositions, color);
      this.pulseFrame();
      if (score && score > 0) {
        const cx = worldPositions.reduce((s, p) => s + p.x, 0) / worldPositions.length;
        const cy = worldPositions.reduce((s, p) => s + p.y, 0) / worldPositions.length;
        this.matchEffects.showFloatingScore(cx, cy, score, color);
      }
      // Screen flash on big matches
      if (positions.length >= 5) {
        this.matchEffects.screenFlash();
      }
    }

    await tl.then();
  }

  /**
   * Slot-style reel spin: current symbols scroll downward off-screen per column,
   * then new grid is rendered and new symbols scroll down from above with bounce.
   * Each column stops at a different time (left first, right last).
   */
  async animateReelSpin(generateNewGrid: () => void): Promise<void> {
    const rows = GameConfig.rows;
    const cols = GameConfig.cols;
    const totalH = rows * (CELL + GAP) - GAP;

    // Phase 1: Scroll current symbols downward off-screen
    const scrollOut = gsap.timeline();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          scrollOut.to(sprite, {
            y: sprite.y + 500 + r * 40,
            alpha: 0,
            duration: 0.35,
            ease: 'power2.in',
          }, c * 0.1 + r * 0.02);
        }
      }
    }
    await scrollOut.then();

    // Phase 2: Generate new grid data and render
    generateNewGrid();

    // Phase 3: New symbols enter from above and scroll into place
    const scrollIn = gsap.timeline();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          const targetY = sprite.y;
          // Start above the grid, staggered per column
          sprite.y = targetY - 600 - r * 50;
          sprite.alpha = 1;

          const colDelay = c * 0.2;
          const rowDelay = r * 0.04;

          scrollIn.to(sprite, {
            y: targetY,
            duration: 0.5,
            ease: 'bounce.out',
          }, colDelay + rowDelay);
        }
      }
    }
    await scrollIn.then();
  }

  // Animate gravity drop for cells that moved down
  async animateGravityDrop(newData: (CellData | null)[][]): Promise<void> {
    const oldPositions = new Map<string, { x: number; y: number }>();

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
    const totalH = GameConfig.rows * (CELL + GAP) - GAP;
    const offsetY = -totalH / 2;

    for (let c = 0; c < GameConfig.cols; c++) {
      for (let r = 0; r < GameConfig.rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (!sprite) continue;
        const data = newData[r]?.[c];
        if (!data) continue;

        const targetY = sprite.y;

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

  // --- Hint system ---

  /** Show a subtle bounce on two cells to hint a valid swap */
  showHint(r1: number, c1: number, r2: number, c2: number): void {
    this.clearHint();
    for (const [r, c] of [[r1, c1], [r2, c2]]) {
      const sprite = this.cells[r]?.[c];
      if (!sprite) continue;

      // Gentle repeating bounce on the actual cell sprite
      const tween = gsap.to(sprite.scale, {
        x: 1.1, y: 1.1,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
      this.hintTweens.push(tween);
    }
  }

  /** Remove hint animations and reset cell scales */
  clearHint(): void {
    for (const tween of this.hintTweens) tween.kill();
    // Reset any hinted cell scales back to 1
    for (const row of this.cells) {
      for (const sprite of row) {
        if (sprite) {
          gsap.set(sprite.scale, { x: 1, y: 1 });
        }
      }
    }
    this.hintTweens = [];
    this.hintGraphics = [];
  }

  // --- Drag-to-swap ---

  private onDragStart(row: number, col: number, e: FederatedPointerEvent): void {
    if (!this._interactive) return;
    const local = e.getLocalPosition(this);
    this.dragStart = { row, col, px: local.x, py: local.y };
    this.isDragging = true;

    this.cells[row]?.[col]?.setSelected(true);
  }

  private onDragMove(_row: number, _col: number, e: FederatedPointerEvent): void {
    if (!this._interactive || !this.isDragging || !this.dragStart) return;

    const local = e.getLocalPosition(this);
    const dx = local.x - this.dragStart.px;
    const dy = local.y - this.dragStart.py;
    const threshold = CELL * 0.4;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let dr = 0, dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        dc = dx > 0 ? 1 : -1;
      } else {
        dr = dy > 0 ? 1 : -1;
      }

      const tr = this.dragStart.row + dr;
      const tc = this.dragStart.col + dc;

      if (tr >= 0 && tr < GameConfig.rows && tc >= 0 && tc < GameConfig.cols) {
        this.cells[this.dragStart.row]?.[this.dragStart.col]?.setSelected(false);

        const { row: sr, col: sc } = this.dragStart;
        this.dragStart = null;
        this.isDragging = false;
        this.onSwapAttempt?.(sr, sc, tr, tc);
      }
    }
  }

  private onDragEnd(e?: FederatedPointerEvent): void {
    if (this.dragStart) {
      const { row, col } = this.dragStart;
      this.cells[row]?.[col]?.setSelected(false);

      // Detect tap (no significant movement): activate power-up if present
      if (e && this._interactive) {
        const local = e.getLocalPosition(this);
        const dx = local.x - this.dragStart.px;
        const dy = local.y - this.dragStart.py;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          const cellData = this.gridData[row]?.[col];
          if (cellData?.powerUp) {
            this.dragStart = null;
            this.isDragging = false;
            this.onPowerUpTap?.(row, col);
            return;
          }
        }
      }
    }
    this.dragStart = null;
    this.isDragging = false;
  }
}

// Gem-like cell visual with gradient, shadow, shine, bevel
class CellSprite extends Container {
  private bg: Graphics;
  private icon: Graphics;
  private selectHighlight: Graphics;

  constructor(public data: CellData) {
    super();
    const size = CELL;

    // Background tile with subtle gradient center
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, size, size, 8);
    this.bg.fill({ color: 0x1e0a3a, alpha: 0.8 });
    this.addChild(this.bg);

    // Symbol shape with gem treatment
    this.icon = new Graphics();
    this.drawGemShape(this.icon, data.symbol.shape, data.symbol.color, size);
    this.addChild(this.icon);

    // Power-up indicator
    if (data.powerUp) {
      const puIcon = this.createPowerUpIndicator(data.powerUp);
      this.addChild(puIcon);
    }

    // Blocker overlay
    if (data.isBlocker) {
      const blockerOverlay = this.createBlockerOverlay(data.blockerHealth, size);
      this.addChild(blockerOverlay);
    }

    // Selection highlight
    this.selectHighlight = new Graphics();
    this.selectHighlight.roundRect(-3, -3, size + 6, size + 6, 10);
    this.selectHighlight.stroke({ color: 0xF5D060, width: 3, alpha: 0.9 });
    this.selectHighlight.visible = false;
    this.addChild(this.selectHighlight);
  }

  setSelected(selected: boolean): void {
    this.selectHighlight.visible = selected;
    if (selected) {
      gsap.fromTo(this.scale, { x: 1, y: 1 }, { x: 1.08, y: 1.08, duration: 0.15, ease: 'back.out' });
    } else {
      gsap.to(this.scale, { x: 1, y: 1, duration: 0.1 });
    }
  }

  private drawGemShape(g: Graphics, shape: string, color: number, size: number): void {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.3;
    const gradient = getSymbolGradient(color);
    const darkColor = darkenColor(color, 0.5);
    const lightColor = lightenColor(color, 0.4);

    // 1. Drop shadow (same shape, offset, darker)
    this.drawShapePath(g, shape, cx + 2, cy + 2, r);
    g.fill({ color: darkColor, alpha: 0.4 });

    // 2. Main gradient body
    this.drawShapePath(g, shape, cx, cy, r);
    g.fill(gradient);

    // 3. Bevel stroke (light outer edge)
    this.drawShapePath(g, shape, cx, cy, r);
    g.stroke({ color: lightColor, width: 2, alpha: 0.4 });

    // 4. Inner shine (adjusted per shape to stay within bounds)
    let shineX = cx - r * 0.15;
    let shineY = cy - r * 0.2;
    let shineRx = r * 0.25;
    let shineRy = r * 0.15;
    if (shape === 'triangle') {
      shineX = cx;
      shineY = cy - r * 0.05;
      shineRx = r * 0.2;
      shineRy = r * 0.12;
    } else if (shape === 'diamond') {
      shineX = cx;
      shineY = cy - r * 0.15;
      shineRx = r * 0.2;
      shineRy = r * 0.12;
    } else if (shape === 'star') {
      shineX = cx - r * 0.1;
      shineY = cy - r * 0.15;
      shineRx = r * 0.18;
      shineRy = r * 0.1;
    }
    g.ellipse(shineX, shineY, shineRx, shineRy);
    g.fill({ color: 0xffffff, alpha: 0.3 });
  }

  private drawShapePath(g: Graphics, shape: string, cx: number, cy: number, r: number): void {
    switch (shape) {
      case 'circle':
        g.circle(cx, cy, r);
        break;
      case 'diamond':
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy);
        g.lineTo(cx, cy + r);
        g.lineTo(cx - r, cy);
        g.closePath();
        break;
      case 'square':
        g.roundRect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6, 4);
        break;
      case 'triangle':
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy + r * 0.7);
        g.lineTo(cx - r, cy + r * 0.7);
        g.closePath();
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
        break;
      }
    }
  }

  private createPowerUpIndicator(type: PowerUpType): Graphics {
    const g = new Graphics();
    const size = CELL;
    const color = type === 'blast' ? 0x00e5ff : type === 'bomb' ? 0xff5722 : 0xffd700;
    // Glowing ring
    g.circle(size - 12, 12, 10);
    g.fill({ color, alpha: 0.3 });
    g.circle(size - 12, 12, 7);
    g.fill({ color });
    g.stroke({ color: 0xffffff, width: 1.5 });
    return g;
  }

  private createBlockerOverlay(health: number, size: number): Graphics {
    const g = new Graphics();
    if (health >= 2) {
      // Stone: gray overlay with cross-hatch
      g.roundRect(2, 2, size - 4, size - 4, 6);
      g.fill({ color: 0x888888, alpha: 0.55 });
      g.stroke({ color: 0x666666, width: 2 });
      // Cross-hatch pattern
      g.moveTo(size * 0.2, size * 0.2);
      g.lineTo(size * 0.8, size * 0.8);
      g.stroke({ color: 0x555555, width: 1.5, alpha: 0.5 });
      g.moveTo(size * 0.8, size * 0.2);
      g.lineTo(size * 0.2, size * 0.8);
      g.stroke({ color: 0x555555, width: 1.5, alpha: 0.5 });
      // "2" indicator
      g.circle(size / 2, size / 2, 12);
      g.fill({ color: 0x444444, alpha: 0.7 });
      g.stroke({ color: 0xaaaaaa, width: 1 });
    } else {
      // Ice: blue-white translucent overlay with diagonal cracks
      g.roundRect(2, 2, size - 4, size - 4, 6);
      g.fill({ color: 0xaaddff, alpha: 0.45 });
      g.stroke({ color: 0x88ccff, width: 2, alpha: 0.7 });
      // Diagonal crack lines
      g.moveTo(size * 0.15, size * 0.3);
      g.lineTo(size * 0.45, size * 0.55);
      g.lineTo(size * 0.35, size * 0.75);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
      g.moveTo(size * 0.6, size * 0.15);
      g.lineTo(size * 0.7, size * 0.45);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
    }
    return g;
  }
}
