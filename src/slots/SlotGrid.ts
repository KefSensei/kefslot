import {
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  Assets,
  FederatedPointerEvent,
  FillGradient,
} from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { CellData, PowerUpType } from '@/models/Symbol';
import { SymbolDef, getSymbolsForLevel } from '@/config/SymbolConfig';
import { weightedRandom } from '@/utils/MathUtils';
import { createCell } from '@/models/Symbol';
import { MatchEffects } from '@/effects/MatchEffects';
import { lightenColor, darkenColor, colorToHex } from '@/utils/ColorUtils';
import { getSymbolTexture } from '@/config/SymbolTextures';
import gsap from 'gsap';

// Ice blocker sprite assets
import iceIntactUrl from '@/assets/sprites/ice-overlay-intact.png';
import iceCrackedUrl from '@/assets/sprites/ice-overlay-cracked.png';
import iceShard1Url from '@/assets/sprites/ice-shard-1.png';
import iceShard2Url from '@/assets/sprites/ice-shard-2.png';
import iceShard3Url from '@/assets/sprites/ice-shard-3.png';
import iceShard4Url from '@/assets/sprites/ice-shard-4.png';

// Stone blocker sprite assets
import stoneIntactUrl from '@/assets/sprites/blocker-stone-intact.png';
import stoneCrackedUrl from '@/assets/sprites/blocker-stone-cracked.png';
import stoneShard1Url from '@/assets/sprites/blocker-stone-shard-1.png';
import stoneShard2Url from '@/assets/sprites/blocker-stone-shard-2.png';
import stoneShard3Url from '@/assets/sprites/blocker-stone-shard-3.png';
import stoneShard4Url from '@/assets/sprites/blocker-stone-shard-4.png';

// Chain blocker sprite assets
import chainIntactUrl from '@/assets/sprites/blocker-chain-intact.png';
import chainCrackedUrl from '@/assets/sprites/blocker-chain-cracked.png';
import chainShard1Url from '@/assets/sprites/blocker-chain-shard-1.png';
import chainShard2Url from '@/assets/sprites/blocker-chain-shard-2.png';
import chainShard3Url from '@/assets/sprites/blocker-chain-shard-3.png';
import chainShard4Url from '@/assets/sprites/blocker-chain-shard-4.png';

// Thorn blocker sprite assets
import thornIntactUrl from '@/assets/sprites/blocker-thorn-intact.png';
import thornCrackedUrl from '@/assets/sprites/blocker-thorn-cracked.png';
import thornShard1Url from '@/assets/sprites/blocker-thorn-shard-1.png';
import thornShard2Url from '@/assets/sprites/blocker-thorn-shard-2.png';
import thornShard3Url from '@/assets/sprites/blocker-thorn-shard-3.png';
import thornShard4Url from '@/assets/sprites/blocker-thorn-shard-4.png';

// Vine blocker sprite assets
import vineIntactUrl from '@/assets/sprites/blocker-vine-intact.png';
import vineCrackedUrl from '@/assets/sprites/blocker-vine-cracked.png';
import vineShard1Url from '@/assets/sprites/blocker-vine-shard-1.png';
import vineShard2Url from '@/assets/sprites/blocker-vine-shard-2.png';
import vineShard3Url from '@/assets/sprites/blocker-vine-shard-3.png';
import vineShard4Url from '@/assets/sprites/blocker-vine-shard-4.png';

// Frozen column blocker sprite assets
import frozenIntactUrl from '@/assets/sprites/blocker-frozen_column-intact.png';
import frozenCrackedUrl from '@/assets/sprites/blocker-frozen_column-cracked.png';
import frozenShard1Url from '@/assets/sprites/blocker-frozen_column-shard-1.png';
import frozenShard2Url from '@/assets/sprites/blocker-frozen_column-shard-2.png';
import frozenShard3Url from '@/assets/sprites/blocker-frozen_column-shard-3.png';
import frozenShard4Url from '@/assets/sprites/blocker-frozen_column-shard-4.png';

interface BlockerTextures {
  intact: Texture | null;
  cracked: Texture | null;
  shards: Texture[];
}

/** Loaded blocker textures — call loadBlockerTextures() once at startup */
let iceIntactTex: Texture | null = null;
let iceCrackedTex: Texture | null = null;
let iceShardTextures: Texture[] = [];

const blockerTextures: Record<string, BlockerTextures> = {
  stone: { intact: null, cracked: null, shards: [] },
  chain: { intact: null, cracked: null, shards: [] },
  thorn: { intact: null, cracked: null, shards: [] },
  vine: { intact: null, cracked: null, shards: [] },
  frozen_column: { intact: null, cracked: null, shards: [] },
};

export async function loadIceTextures(): Promise<void> {
  const [intact, cracked, s1, s2, s3, s4] = await Promise.all([
    Assets.load<Texture>(iceIntactUrl),
    Assets.load<Texture>(iceCrackedUrl),
    Assets.load<Texture>(iceShard1Url),
    Assets.load<Texture>(iceShard2Url),
    Assets.load<Texture>(iceShard3Url),
    Assets.load<Texture>(iceShard4Url),
  ]);
  iceIntactTex = intact;
  iceCrackedTex = cracked;
  iceShardTextures = [s1, s2, s3, s4];
}

export async function loadBlockerTextures(): Promise<void> {
  const [
    stoneIntact,
    stoneCracked,
    stoneSh1,
    stoneSh2,
    stoneSh3,
    stoneSh4,
    chainIntact,
    chainCracked,
    chainSh1,
    chainSh2,
    chainSh3,
    chainSh4,
    thornIntact,
    thornCracked,
    thornSh1,
    thornSh2,
    thornSh3,
    thornSh4,
    vineIntact,
    vineCracked,
    vineSh1,
    vineSh2,
    vineSh3,
    vineSh4,
    frozenIntact,
    frozenCracked,
    frozenSh1,
    frozenSh2,
    frozenSh3,
    frozenSh4,
  ] = await Promise.all([
    Assets.load<Texture>(stoneIntactUrl),
    Assets.load<Texture>(stoneCrackedUrl),
    Assets.load<Texture>(stoneShard1Url),
    Assets.load<Texture>(stoneShard2Url),
    Assets.load<Texture>(stoneShard3Url),
    Assets.load<Texture>(stoneShard4Url),
    Assets.load<Texture>(chainIntactUrl),
    Assets.load<Texture>(chainCrackedUrl),
    Assets.load<Texture>(chainShard1Url),
    Assets.load<Texture>(chainShard2Url),
    Assets.load<Texture>(chainShard3Url),
    Assets.load<Texture>(chainShard4Url),
    Assets.load<Texture>(thornIntactUrl),
    Assets.load<Texture>(thornCrackedUrl),
    Assets.load<Texture>(thornShard1Url),
    Assets.load<Texture>(thornShard2Url),
    Assets.load<Texture>(thornShard3Url),
    Assets.load<Texture>(thornShard4Url),
    Assets.load<Texture>(vineIntactUrl),
    Assets.load<Texture>(vineCrackedUrl),
    Assets.load<Texture>(vineShard1Url),
    Assets.load<Texture>(vineShard2Url),
    Assets.load<Texture>(vineShard3Url),
    Assets.load<Texture>(vineShard4Url),
    Assets.load<Texture>(frozenIntactUrl),
    Assets.load<Texture>(frozenCrackedUrl),
    Assets.load<Texture>(frozenShard1Url),
    Assets.load<Texture>(frozenShard2Url),
    Assets.load<Texture>(frozenShard3Url),
    Assets.load<Texture>(frozenShard4Url),
  ]);
  blockerTextures.stone = {
    intact: stoneIntact,
    cracked: stoneCracked,
    shards: [stoneSh1, stoneSh2, stoneSh3, stoneSh4],
  };
  blockerTextures.chain = {
    intact: chainIntact,
    cracked: chainCracked,
    shards: [chainSh1, chainSh2, chainSh3, chainSh4],
  };
  blockerTextures.thorn = {
    intact: thornIntact,
    cracked: thornCracked,
    shards: [thornSh1, thornSh2, thornSh3, thornSh4],
  };
  blockerTextures.vine = { intact: vineIntact, cracked: vineCracked, shards: [vineSh1, vineSh2, vineSh3, vineSh4] };
  blockerTextures.frozen_column = {
    intact: frozenIntact,
    cracked: frozenCracked,
    shards: [frozenSh1, frozenSh2, frozenSh3, frozenSh4],
  };
}

/** Get shards for a given blocker type (falls back to ice shards) */
export function getBlockerShards(type: string): Texture[] {
  return blockerTextures[type]?.shards.length ? blockerTextures[type].shards : iceShardTextures;
}

// Mechanic overlay sprite assets
import mechanicLavaUrl from '@/assets/sprites/mechanic-lava.png';
import mechanicFogUrl from '@/assets/sprites/mechanic-fog.png';
import mechanicShadowUrl from '@/assets/sprites/mechanic-shadow.png';
import mechanicLockedUrl from '@/assets/sprites/mechanic-locked.png';
import mechanicCursedUrl from '@/assets/sprites/mechanic-cursed.png';
import mechanicChestUrl from '@/assets/sprites/mechanic-chest.png';
import mechanicEggStage1Url from '@/assets/sprites/mechanic-egg-stage1.png';
import mechanicEggStage2Url from '@/assets/sprites/mechanic-egg-stage2.png';
import mechanicEggStage3Url from '@/assets/sprites/mechanic-egg-stage3.png';
import mechanicRelicUrl from '@/assets/sprites/mechanic-relic.png';
import mechanicPortalUrl from '@/assets/sprites/mechanic-portal.png';
import mechanicTransformerUrl from '@/assets/sprites/mechanic-transformer.png';
import mechanicMultiplierX2Url from '@/assets/sprites/mechanic-multiplier-x2.png';
import mechanicMultiplierX3Url from '@/assets/sprites/mechanic-multiplier-x3.png';
import mechanicInactiveUrl from '@/assets/sprites/mechanic-inactive.png';

/** Loaded mechanic overlay textures */
const mechanicTextures: Record<string, Texture | null> = {
  lava: null,
  fog: null,
  shadow: null,
  locked: null,
  cursed: null,
  chest: null,
  'egg-stage1': null,
  'egg-stage2': null,
  'egg-stage3': null,
  relic: null,
  portal: null,
  transformer: null,
  'multiplier-x2': null,
  'multiplier-x3': null,
  inactive: null,
};

export async function loadMechanicTextures(): Promise<void> {
  const urls: [string, string][] = [
    ['lava', mechanicLavaUrl],
    ['fog', mechanicFogUrl],
    ['shadow', mechanicShadowUrl],
    ['locked', mechanicLockedUrl],
    ['cursed', mechanicCursedUrl],
    ['chest', mechanicChestUrl],
    ['egg-stage1', mechanicEggStage1Url],
    ['egg-stage2', mechanicEggStage2Url],
    ['egg-stage3', mechanicEggStage3Url],
    ['relic', mechanicRelicUrl],
    ['portal', mechanicPortalUrl],
    ['transformer', mechanicTransformerUrl],
    ['multiplier-x2', mechanicMultiplierX2Url],
    ['multiplier-x3', mechanicMultiplierX3Url],
    ['inactive', mechanicInactiveUrl],
  ];
  const textures = await Promise.all(urls.map(([, url]) => Assets.load<Texture>(url)));
  urls.forEach(([key], i) => (mechanicTextures[key] = textures[i]));
}

/** Attach a mechanic sprite overlay to a container, centered and sized to the cell */
function attachMechanicSprite(parent: Container, tex: Texture, size: number, alpha = 0.9): Sprite {
  const spr = new Sprite(tex);
  spr.width = size + 10;
  spr.height = size + 10;
  spr.x = -5;
  spr.y = -5;
  spr.alpha = alpha;
  parent.addChild(spr);
  return spr;
}

// Power-up sprite assets
import powerupBlastIndicatorUrl from '@/assets/sprites/powerup-blast-indicator.png';
import powerupBombIndicatorUrl from '@/assets/sprites/powerup-bomb-indicator.png';
import powerupRainbowIndicatorUrl from '@/assets/sprites/powerup-rainbow-indicator.png';
import powerupBlastActivateUrl from '@/assets/sprites/powerup-blast-activate.png';
import powerupBombActivateUrl from '@/assets/sprites/powerup-bomb-activate.png';
import powerupRainbowActivateUrl from '@/assets/sprites/powerup-rainbow-activate.png';
import powerupBlastGlowUrl from '@/assets/sprites/powerup-blast-glow.png';
import powerupBombGlowUrl from '@/assets/sprites/powerup-bomb-glow.png';
import powerupRainbowGlowUrl from '@/assets/sprites/powerup-rainbow-glow.png';

interface PowerUpTextures {
  indicator: Texture | null;
  activate: Texture | null;
  glow: Texture | null;
}

const powerUpTextures: Record<string, PowerUpTextures> = {
  blast: { indicator: null, activate: null, glow: null },
  bomb: { indicator: null, activate: null, glow: null },
  rainbow: { indicator: null, activate: null, glow: null },
};

export async function loadPowerUpTextures(): Promise<void> {
  const [blastInd, bombInd, rainbowInd, blastAct, bombAct, rainbowAct, blastGlow, bombGlow, rainbowGlow] =
    await Promise.all([
      Assets.load<Texture>(powerupBlastIndicatorUrl),
      Assets.load<Texture>(powerupBombIndicatorUrl),
      Assets.load<Texture>(powerupRainbowIndicatorUrl),
      Assets.load<Texture>(powerupBlastActivateUrl),
      Assets.load<Texture>(powerupBombActivateUrl),
      Assets.load<Texture>(powerupRainbowActivateUrl),
      Assets.load<Texture>(powerupBlastGlowUrl),
      Assets.load<Texture>(powerupBombGlowUrl),
      Assets.load<Texture>(powerupRainbowGlowUrl),
    ]);
  powerUpTextures.blast = { indicator: blastInd, activate: blastAct, glow: blastGlow };
  powerUpTextures.bomb = { indicator: bombInd, activate: bombAct, glow: bombGlow };
  powerUpTextures.rainbow = { indicator: rainbowInd, activate: rainbowAct, glow: rainbowGlow };
}

/** Get the activation texture for a power-up type (used by MatchEffects) */
export function getPowerUpActivateTexture(type: string): Texture | null {
  return powerUpTextures[type]?.activate ?? null;
}

/** Cell size — read dynamically so it updates when orientation changes */
const getCellSize = () => GameConfig.cellSize;
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
  private idleTweens: gsap.core.Tween[] = [];
  private sparkleInterval: ReturnType<typeof setInterval> | null = null;

  // Hint overlay
  private hintGraphics: Graphics[] = [];
  private hintTweens: gsap.core.Tween[] = [];

  // Power-up glow
  private powerUpGlowTweens: gsap.core.Tween[] = [];

  // Spin clipping mask
  private spinMask: Graphics | null = null;

  // Drag state
  private dragStart: { row: number; col: number; px: number; py: number } | null = null;
  private isDragging = false;

  // Tap-to-swap state: first tap selects a cell, second tap on adjacent cell triggers swap
  private tapSelected: { row: number; col: number } | null = null;

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

  /** Update grid data without re-rendering (used after data-only swaps) */
  setGridData(newData: (CellData | null)[][]): void {
    this.gridData = newData;
  }

  // Sync visual to data
  renderGrid(): void {
    // Stop old idle animations before rebuilding
    this.stopIdleAnimations();

    const effectsRef = this.matchEffects;
    const frameRef = this.frameContainer;

    // Remove everything except frame and effects
    this.removeChildren();
    this.addChild(frameRef);
    this.addChild(effectsRef);
    this.cells = [];

    const rows = GameConfig.rows;
    const cols = GameConfig.cols;
    const CELL = getCellSize();
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
          sprite.x = offsetX + c * (getCellSize() + GAP);
          sprite.y = offsetY + r * (getCellSize() + GAP);
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
    const pad = 8;
    const fx = offsetX - pad;
    const fy = offsetY - pad;
    const fw = totalW + pad * 2;
    const fh = totalH + pad * 2;

    // Subtle dark backing behind cells (complements the art frame)
    const panel = new Graphics();
    panel.roundRect(fx, fy, fw, fh, 8);
    panel.fill({ color: 0x050510, alpha: 0.6 });
    this.frameContainer.addChild(panel);

    // Light strip (pulses on wins) — thin glow inside grid area
    this.frameLightStrip = new Graphics();
    this.frameLightStrip.roundRect(fx + 2, fy + 2, fw - 4, fh - 4, 6);
    this.frameLightStrip.stroke({ color: 0xf5d060, width: 2, alpha: 0 });
    this.frameContainer.addChild(this.frameLightStrip);
  }

  /** Pulse the frame light strip (call on wins) */
  pulseFrame(): void {
    if (!this.frameLightStrip) return;
    gsap.fromTo(this.frameLightStrip, { alpha: 0.8 }, { alpha: 0, duration: 0.6, ease: 'power2.out' });
  }

  /** Stop all idle animations (call before re-render or destroy) */
  private stopIdleAnimations(): void {
    for (const tw of this.idleTweens) tw.kill();
    this.idleTweens = [];
    if (this.sparkleInterval) {
      clearInterval(this.sparkleInterval);
      this.sparkleInterval = null;
    }
    if (this.shimmerTween) {
      this.shimmerTween.kill();
      this.shimmerTween = null;
    }
    if (this.shimmerGraphic) {
      this.shimmerGraphic.destroy();
      this.shimmerGraphic = null;
    }
  }

  private startIdleAnimations(offsetX: number, offsetY: number, totalW: number, totalH: number): void {
    this.stopIdleAnimations();

    const rows = this.cells.length;
    const cols = this.cells[0]?.length || 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sprite = this.cells[r]?.[c];
        if (!sprite) continue;

        // Each cell gets a unique phase so the grid ripples organically
        const phase = r * 0.7 + c * 0.5 + Math.random() * 1.5;

        // 1. Subtle scale breathing — safe, doesn't affect x/y position
        const breathDur = 2.5 + Math.random() * 1.0;
        const breathTw = gsap.to(sprite.scale, {
          x: 1.04,
          y: 1.04,
          duration: breathDur,
          delay: phase * 0.25,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        this.idleTweens.push(breathTw);

        // 2. Shadow glow underneath each gem
        const CELL = getCellSize();
        const shadow = new Graphics();
        shadow.ellipse(CELL / 2, CELL + 2, CELL * 0.3, 4);
        shadow.fill({ color: sprite.data.symbol.color, alpha: 0.15 });
        sprite.addChildAt(shadow, 0);

        const shadowTw = gsap.to(shadow, {
          alpha: 0.3,
          duration: breathDur,
          delay: phase * 0.25,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        this.idleTweens.push(shadowTw);
      }
    }

    // 5. Random sparkle particles — periodically spawn on random gems
    this.sparkleInterval = setInterval(() => {
      this.spawnRandomSparkle(offsetX, offsetY, rows, cols);
    }, 400);

    // 6. Shimmer sweep across the grid
    const shimmer = new Graphics();
    const sw = 50;
    shimmer.moveTo(0, -totalH * 1.5);
    shimmer.lineTo(sw, -totalH * 1.5);
    shimmer.lineTo(sw, totalH * 1.5);
    shimmer.lineTo(0, totalH * 1.5);
    shimmer.closePath();
    shimmer.fill({ color: 0xffffff, alpha: 0.08 });
    shimmer.rotation = 0.3;
    shimmer.x = offsetX - 80;
    shimmer.y = offsetY;
    this.addChildAt(shimmer, 2);
    this.shimmerGraphic = shimmer;

    // Mask shimmer to grid area
    const mask = new Graphics();
    mask.roundRect(offsetX - 2, offsetY - 2, totalW + 4, totalH + 4, 8);
    mask.fill({ color: 0xffffff });
    this.addChild(mask);
    shimmer.mask = mask;

    this.shimmerTween = gsap.fromTo(
      shimmer,
      { x: offsetX - 80 },
      {
        x: offsetX + totalW + 80,
        duration: 2.5,
        delay: 1.5,
        repeat: -1,
        repeatDelay: 4,
        ease: 'power1.inOut',
      },
    );
  }

  /** Spawn a sparkle particle on a random gem surface */
  private spawnRandomSparkle(offsetX: number, offsetY: number, rows: number, cols: number): void {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const sprite = this.cells[r]?.[c];
    if (!sprite) return;

    const CELL = getCellSize();
    const sparkle = new Graphics();

    // Star-shaped sparkle
    const size = 2 + Math.random() * 3;
    sparkle.moveTo(0, -size);
    sparkle.lineTo(size * 0.3, -size * 0.3);
    sparkle.lineTo(size, 0);
    sparkle.lineTo(size * 0.3, size * 0.3);
    sparkle.lineTo(0, size);
    sparkle.lineTo(-size * 0.3, size * 0.3);
    sparkle.lineTo(-size, 0);
    sparkle.lineTo(-size * 0.3, -size * 0.3);
    sparkle.closePath();
    sparkle.fill({ color: 0xffffff, alpha: 0.9 });

    // Position on a random spot within the gem area
    sparkle.x = sprite.x + CELL * 0.2 + Math.random() * CELL * 0.6;
    sparkle.y = sprite.y + CELL * 0.15 + Math.random() * CELL * 0.5;
    sparkle.scale.set(0);

    // Insert above cells but below effects
    const effectsIndex = this.getChildIndex(this.matchEffects);
    this.addChildAt(sparkle, effectsIndex);

    // Animate: pop in, twinkle, fade out
    const tl = gsap.timeline();
    tl.to(sparkle.scale, { x: 1.2, y: 1.2, duration: 0.15, ease: 'back.out' }, 0);
    tl.to(sparkle, { rotation: Math.PI * 0.5, duration: 0.4, ease: 'none' }, 0);
    tl.to(sparkle.scale, { x: 0, y: 0, duration: 0.25, ease: 'power2.in' }, 0.25);
    tl.then(() => sparkle.destroy());
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
    if (!enabled) this.clearTapSelection();
  }

  private clearTapSelection(): void {
    if (this.tapSelected) {
      const { row, col } = this.tapSelected;
      this.cells[row]?.[col]?.setTapSelected(false);
      this.tapSelected = null;
    }
  }

  // Update grid data and re-render
  async updateGrid(newData: (CellData | null)[][]): Promise<void> {
    this.gridData = newData;
    this.renderGrid();
  }

  /**
   * Fluid match-clear animation: highlight → burst → gravity slide → new cells appear.
   * All steps overlap for a "dance" feel instead of discrete sequential phases.
   */
  async animateClear(positions: { row: number; col: number }[], score?: number): Promise<void> {
    const CELL = getCellSize();
    const worldPositions: { x: number; y: number }[] = [];
    let color = 0xffffff;
    const matchedSprites: CellSprite[] = [];

    for (const pos of positions) {
      const sprite = this.cells[pos.row]?.[pos.col];
      if (sprite) {
        worldPositions.push({ x: sprite.x + CELL / 2, y: sprite.y + CELL / 2 });
        color = sprite.data.symbol.color;
        matchedSprites.push(sprite);
      }
    }

    // Single timeline: quick pop-up highlight then burst shrink — no gap between phases
    const tl = gsap.timeline();
    for (const sprite of matchedSprites) {
      // Pop up (0.06s) then immediately burst inward (0.12s)
      tl.to(sprite.scale, { x: 1.15, y: 1.15, duration: 0.06, ease: 'power2.out' }, 0);
      tl.to(sprite.scale, { x: 0, y: 0, duration: 0.12, ease: 'back.in(2)' }, 0.06);
      tl.to(sprite, { alpha: 0, duration: 0.12 }, 0.06);
    }

    // Confetti and floating score — fire when burst starts (0.06s in)
    if (worldPositions.length > 0) {
      tl.call(
        () => {
          this.matchEffects.spawnConfetti(worldPositions, color);
          this.pulseFrame();
          if (score && score > 0) {
            const cx = worldPositions.reduce((s, p) => s + p.x, 0) / worldPositions.length;
            const cy = worldPositions.reduce((s, p) => s + p.y, 0) / worldPositions.length;
            this.matchEffects.showFloatingScore(cx, cy, score, color);
          }
          if (positions.length >= 5) {
            this.matchEffects.screenFlash();
          }
        },
        undefined,
        0.06,
      );
    }

    await tl.then();

    // Remove cleared sprites from the display.
    // Blocker cells that cracked (still in gridData after clear) get rebuilt instead of destroyed.
    for (const pos of positions) {
      const sprite = this.cells[pos.row]?.[pos.col];
      if (!sprite) continue;

      const dataAfterClear = this.gridData[pos.row]?.[pos.col];
      if (dataAfterClear && dataAfterClear.isBlocker) {
        // Ice cracked but not broken — rebuild sprite with cracked texture
        const cx = sprite.x + getCellSize() / 2;
        const cy = sprite.y + getCellSize() / 2;
        sprite.destroy();

        const CELL = getCellSize();
        const totalW = GameConfig.cols * (CELL + GAP) - GAP;
        const totalH = GameConfig.rows * (CELL + GAP) - GAP;
        const newSprite = new CellSprite(dataAfterClear);
        newSprite.x = -totalW / 2 + pos.col * (CELL + GAP);
        newSprite.y = -totalH / 2 + pos.row * (CELL + GAP);
        newSprite.eventMode = 'static';
        newSprite.cursor = 'pointer';
        const r = pos.row,
          c = pos.col;
        newSprite.on('pointerdown', (e: FederatedPointerEvent) => this.onDragStart(r, c, e));
        newSprite.on('pointermove', (e: FederatedPointerEvent) => this.onDragMove(r, c, e));
        newSprite.on('pointerup', (e: FederatedPointerEvent) => this.onDragEnd(e));
        newSprite.on('pointerupoutside', () => this.onDragEnd());
        this.addChild(newSprite);
        this.cells[pos.row][pos.col] = newSprite;

        // Crack animation: bright flash + shake + small shard spray
        const origX = newSprite.x;
        gsap
          .timeline()
          .fromTo(newSprite, { alpha: 2 }, { alpha: 1, duration: 0.12 }) // bright flash
          .to(newSprite, { x: origX + 4, duration: 0.03 }, 0)
          .to(newSprite, { x: origX - 4, duration: 0.03 }, 0.03)
          .to(newSprite, { x: origX + 2, duration: 0.03 }, 0.06)
          .to(newSprite, { x: origX, duration: 0.03 }, 0.09);

        // Spawn a few small shards to sell the crack
        this.spawnBlockerShatter(cx, cy, dataAfterClear.blockerType ?? 'ice', 3, 25);
      } else {
        // Fully broken — big shatter
        const blockerType = sprite.data.blockerType ?? 'ice';
        this.spawnBlockerShatter(sprite.x + getCellSize() / 2, sprite.y + getCellSize() / 2, blockerType, 8, 60);
        sprite.destroy();
        this.cells[pos.row][pos.col] = null;
      }
    }
  }

  /** Spawn blocker shard particles flying outward from a position */
  private spawnBlockerShatter(cx: number, cy: number, blockerType: string, count = 6, maxDist = 60): void {
    const shards = blockerType === 'ice' ? iceShardTextures : getBlockerShards(blockerType);
    if (shards.length === 0) return;

    for (let i = 0; i < count; i++) {
      const tex = shards[i % shards.length];
      const shard = new Sprite(tex);
      const shardSize = 10 + Math.random() * 18;
      shard.width = shardSize;
      shard.height = shardSize;
      shard.anchor.set(0.5);
      shard.x = cx + (Math.random() - 0.5) * 10;
      shard.y = cy + (Math.random() - 0.5) * 10;
      shard.alpha = 0.9;
      shard.rotation = Math.random() * Math.PI * 2;
      this.matchEffects.addChild(shard);

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = maxDist * 0.5 + Math.random() * maxDist * 0.5;
      const targetX = cx + Math.cos(angle) * dist;
      const targetY = cy + Math.sin(angle) * dist;

      gsap.to(shard, {
        x: targetX,
        y: targetY,
        alpha: 0,
        rotation: shard.rotation + (Math.random() - 0.5) * 4,
        duration: 0.3 + Math.random() * 0.2,
        ease: 'power2.out',
        onComplete: () => shard.destroy(),
      });
    }
  }

  /** Apply a clipping mask to hide symbols outside the grid frame during spin */
  private applySpinMask(): void {
    this.removeSpinMask();
    const rows = GameConfig.rows;
    const cols = GameConfig.cols;
    const totalW = cols * (getCellSize() + GAP) - GAP;
    const totalH = rows * (getCellSize() + GAP) - GAP;
    const offsetX = -totalW / 2;
    const offsetY = -totalH / 2;
    const pad = 8; // small padding so symbols aren't clipped at the frame edge

    this.spinMask = new Graphics();
    this.spinMask.roundRect(offsetX - pad, offsetY - pad, totalW + pad * 2, totalH + pad * 2, 10);
    this.spinMask.fill({ color: 0xffffff });
    this.addChild(this.spinMask);
    this.mask = this.spinMask;
  }

  /** Remove the spin clipping mask */
  private removeSpinMask(): void {
    this.mask = null;
    if (this.spinMask) {
      this.spinMask.destroy();
      this.spinMask = null;
    }
  }

  /**
   * Slot-style reel spin: current symbols scroll downward off-screen per column,
   * then new grid is rendered and new symbols scroll down from above with bounce.
   * Each column stops at a different time (left first, right last).
   * A mask clips symbols to the grid frame so nothing leaks outside.
   */
  async animateReelSpin(generateNewGrid: () => void): Promise<void> {
    const rows = GameConfig.rows;
    const cols = GameConfig.cols;

    // Apply mask so symbols don't show outside the grid frame
    this.applySpinMask();

    // Generate per-column random speeds: left columns tend to be faster,
    // right columns slower, with random variance — like a real slot machine.
    const colSpeeds: number[] = [];
    for (let c = 0; c < cols; c++) {
      // Base duration increases left-to-right: 0.25s to 0.45s
      const base = 0.25 + (c / (cols - 1)) * 0.2;
      // Random variance ±0.08s
      const variance = (Math.random() - 0.5) * 0.16;
      colSpeeds.push(Math.max(0.2, base + variance));
    }

    // Per-column stagger delay: each column starts slightly after the previous
    const colDelays: number[] = [];
    for (let c = 0; c < cols; c++) {
      colDelays.push(c * (0.08 + Math.random() * 0.06));
    }

    // Phase 1: Scroll current symbols downward off-screen
    const scrollOut = gsap.timeline();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          scrollOut.to(
            sprite,
            {
              y: sprite.y + 500 + r * 40,
              alpha: 0,
              duration: colSpeeds[c],
              ease: 'power2.in',
            },
            colDelays[c] + r * 0.02,
          );
        }
      }
    }
    await scrollOut.then();

    // Phase 2: Generate new grid data and render
    generateNewGrid();

    // Phase 3: New symbols enter from above and scroll into place.
    // Per-column landing delay — left columns land first, right last, with variance.
    const landDelays: number[] = [];
    for (let c = 0; c < cols; c++) {
      const base = c * 0.18;
      const variance = (Math.random() - 0.3) * 0.1;
      landDelays.push(Math.max(0, base + variance));
    }
    const landDurations: number[] = [];
    for (let c = 0; c < cols; c++) {
      landDurations.push(0.4 + Math.random() * 0.15);
    }

    const scrollIn = gsap.timeline();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          const targetY = sprite.y;
          sprite.y = targetY - 600 - r * 50;
          sprite.alpha = 1;

          scrollIn.to(
            sprite,
            {
              y: targetY,
              duration: landDurations[c],
              ease: 'bounce.out',
            },
            landDelays[c] + r * 0.04,
          );
        }
      }
    }
    await scrollIn.then();

    // Remove mask so effects/hints aren't clipped during gameplay
    this.removeSpinMask();
  }

  /**
   * Fluid gravity + fill animation. Does NOT rebuild the grid.
   * - Existing sprites slide from their current visual position to the target row.
   * - New cells get fresh sprites that drop in from just above the gap.
   * - Gravity slide and new-cell entry overlap for a fluid feel.
   */
  async animateGravityDrop(newData: (CellData | null)[][]): Promise<void> {
    const CELL = getCellSize();
    const totalW = GameConfig.cols * (CELL + GAP) - GAP;
    const totalH = GameConfig.rows * (CELL + GAP) - GAP;
    const gridOffsetX = -totalW / 2;
    const gridOffsetY = -totalH / 2;

    // Build a map of existing sprites by CellData identity
    const spriteForData = new Map<CellData, { sprite: CellSprite; oldRow: number; oldCol: number }>();
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < (this.cells[r]?.length || 0); c++) {
        const sprite = this.cells[r]?.[c];
        if (sprite) {
          spriteForData.set(sprite.data, { sprite, oldRow: r, oldCol: c });
        }
      }
    }

    // Update grid data reference
    this.gridData = newData;

    // Build new cells array and animation timeline
    const newCells: (CellSprite | null)[][] = [];
    const tl = gsap.timeline();

    for (let r = 0; r < GameConfig.rows; r++) {
      newCells[r] = [];
      for (let c = 0; c < GameConfig.cols; c++) {
        newCells[r][c] = null;
      }
    }

    for (let c = 0; c < GameConfig.cols; c++) {
      let highestNewRow = -1;

      for (let r = 0; r < GameConfig.rows; r++) {
        const data = newData[r]?.[c];
        if (!data) {
          newCells[r][c] = null;
          continue;
        }

        const targetX = gridOffsetX + c * (CELL + GAP);
        const targetY = gridOffsetY + r * (CELL + GAP);

        const existing = spriteForData.get(data);
        if (existing) {
          // Reuse existing sprite — slide it to new position
          const { sprite, oldRow } = existing;
          newCells[r][c] = sprite;
          spriteForData.delete(data); // mark as claimed

          // Rebind drag handlers to new row/col
          sprite.removeAllListeners();
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerdown', (e: FederatedPointerEvent) => this.onDragStart(r, c, e));
          sprite.on('pointermove', (e: FederatedPointerEvent) => this.onDragMove(r, c, e));
          sprite.on('pointerup', (e: FederatedPointerEvent) => this.onDragEnd(e));
          sprite.on('pointerupoutside', () => this.onDragEnd());

          if (oldRow !== r || sprite.x !== targetX) {
            // Animate slide — starts immediately per column stagger
            tl.to(sprite, { x: targetX, y: targetY, duration: 0.18, ease: 'power2.out' }, c * 0.015);
          }
        } else {
          // New cell — create sprite and animate entry
          if (highestNewRow < 0) highestNewRow = r;
          const sprite = new CellSprite(data);
          sprite.x = targetX;
          sprite.y = gridOffsetY + (highestNewRow - 1) * (CELL + GAP); // start above gap
          sprite.alpha = 0;
          this.addChild(sprite);

          // Drag handlers
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerdown', (e: FederatedPointerEvent) => this.onDragStart(r, c, e));
          sprite.on('pointermove', (e: FederatedPointerEvent) => this.onDragMove(r, c, e));
          sprite.on('pointerup', (e: FederatedPointerEvent) => this.onDragEnd(e));
          sprite.on('pointerupoutside', () => this.onDragEnd());

          newCells[r][c] = sprite;

          // Animate: fade in + slide down, staggered slightly after gravity
          tl.to(
            sprite,
            { y: targetY, alpha: 1, duration: 0.2, ease: 'back.out(1.2)' },
            c * 0.015 + (r - highestNewRow) * 0.03 + 0.05, // overlaps with gravity slide
          );
        }
      }
    }

    // Destroy any unclaimed leftover sprites (cleared cells that animateClear already faded)
    for (const { sprite } of spriteForData.values()) {
      sprite.destroy();
    }

    this.cells = newCells;

    // Ensure effects layer stays on top
    this.setChildIndex(this.matchEffects, this.children.length - 1);

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

    // Swap entries in the cells array so they match grid data positions
    this.cells[r1][c1] = s2;
    this.cells[r2][c2] = s1;
  }

  // Animate invalid swap (bounce back)
  async animateInvalidSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    const s1 = this.cells[r1]?.[c1];
    const s2 = this.cells[r2]?.[c2];
    if (!s1 || !s2) return;

    const s1x = s1.x,
      s1y = s1.y;
    const s2x = s2.x,
      s2y = s2.y;

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
    if (sprite) return { x: sprite.x + getCellSize() / 2, y: sprite.y + getCellSize() / 2 };
    return null;
  }

  // --- Hint system ---

  /** Show a subtle bounce on two cells to hint a valid swap */
  showHint(r1: number, c1: number, r2: number, c2: number): void {
    this.clearHint();
    for (const [r, c] of [
      [r1, c1],
      [r2, c2],
    ]) {
      const sprite = this.cells[r]?.[c];
      if (!sprite) continue;

      // Gentle repeating bounce on the actual cell sprite
      const tween = gsap.to(sprite.scale, {
        x: 1.1,
        y: 1.1,
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

    // Ice/blocker cells cannot be dragged at all — show a quick shake instead
    const cellData = this.gridData[row]?.[col];
    if (cellData?.isBlocker) {
      const sprite = this.cells[row]?.[col];
      if (sprite) {
        // Quick horizontal shake to indicate "frozen in place"
        const origX = sprite.x;
        gsap
          .timeline()
          .to(sprite, { x: origX + 3, duration: 0.04 })
          .to(sprite, { x: origX - 3, duration: 0.04 })
          .to(sprite, { x: origX + 2, duration: 0.04 })
          .to(sprite, { x: origX, duration: 0.04 });
      }
      return;
    }

    const local = e.getLocalPosition(this);
    this.dragStart = { row, col, px: local.x, py: local.y };
    this.isDragging = true;

    // Don't clear tap selection here — onDragEnd will handle it after determining tap vs drag
    this.cells[row]?.[col]?.setSelected(true);
  }

  private onDragMove(_row: number, _col: number, e: FederatedPointerEvent): void {
    if (!this._interactive || !this.isDragging || !this.dragStart) return;

    const local = e.getLocalPosition(this);
    const dx = local.x - this.dragStart.px;
    const dy = local.y - this.dragStart.py;
    // Lower threshold on touch devices for easier finger swiping
    const threshold = GameConfig.isTouch ? getCellSize() * 0.25 : getCellSize() * 0.4;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let dr = 0,
        dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        dc = dx > 0 ? 1 : -1;
      } else {
        dr = dy > 0 ? 1 : -1;
      }

      const tr = this.dragStart.row + dr;
      const tc = this.dragStart.col + dc;

      if (tr >= 0 && tr < GameConfig.rows && tc >= 0 && tc < GameConfig.cols) {
        // Don't allow swapping onto a blocker cell either
        const targetData = this.gridData[tr]?.[tc];
        if (targetData?.isBlocker) {
          // Shake the target to show it's frozen
          const targetSprite = this.cells[tr]?.[tc];
          if (targetSprite) {
            const origX = targetSprite.x;
            gsap
              .timeline()
              .to(targetSprite, { x: origX + 3, duration: 0.04 })
              .to(targetSprite, { x: origX - 3, duration: 0.04 })
              .to(targetSprite, { x: origX + 2, duration: 0.04 })
              .to(targetSprite, { x: origX, duration: 0.04 });
          }
          this.cells[this.dragStart.row]?.[this.dragStart.col]?.setSelected(false);
          this.clearTapSelection(); // drag took over — cancel any tap-selection
          this.dragStart = null;
          this.isDragging = false;
          return;
        }

        this.cells[this.dragStart.row]?.[this.dragStart.col]?.setSelected(false);
        this.clearTapSelection(); // drag took over — cancel any tap-selection — cancel any tap-selection

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

      // Detect tap (no significant movement)
      if (e && this._interactive) {
        const local = e.getLocalPosition(this);
        const dx = local.x - this.dragStart.px;
        const dy = local.y - this.dragStart.py;
        const tapRadius = GameConfig.isTouch ? 15 : 8;
        if (Math.abs(dx) < tapRadius && Math.abs(dy) < tapRadius) {
          const cellData = this.gridData[row]?.[col];

          // Power-up tap takes priority over tap-to-swap
          if (cellData?.powerUp) {
            this.clearTapSelection();
            this.dragStart = null;
            this.isDragging = false;
            this.onPowerUpTap?.(row, col);
            return;
          }

          // Tap-to-swap logic
          if (this.tapSelected) {
            const { row: sr, col: sc } = this.tapSelected;
            if (sr === row && sc === col) {
              // Tapped same cell again — deselect it
              this.clearTapSelection();
            } else {
              const isAdjacent = Math.abs(sr - row) + Math.abs(sc - col) === 1;
              if (isAdjacent) {
                // Adjacent tap — trigger swap!
                this.clearTapSelection();
                this.dragStart = null;
                this.isDragging = false;
                this.onSwapAttempt?.(sr, sc, row, col);
                return;
              } else {
                // Non-adjacent — move selection to new cell
                this.clearTapSelection();
                if (!cellData?.isBlocker) {
                  this.tapSelected = { row, col };
                  this.cells[row]?.[col]?.setTapSelected(true);
                }
              }
            }
          } else {
            // First tap — select this cell (blockers cannot be selected)
            if (!cellData?.isBlocker) {
              this.tapSelected = { row, col };
              this.cells[row]?.[col]?.setTapSelected(true);
            }
          }
          this.dragStart = null;
          this.isDragging = false;
          return;
        }
      }
    }
    this.dragStart = null;
    this.isDragging = false;
  }
}

// Gem-like cell visual with AI-generated sprite or fallback gradient shape
class CellSprite extends Container {
  private bg: Graphics;
  private icon: Container;
  private selectHighlight: Graphics;
  private tapSelectHighlight: Graphics;
  private tapSelectTween: gsap.core.Tween | null = null;

  constructor(public data: CellData) {
    super();
    const size = getCellSize();

    // Subtle cell background — nearly invisible, just enough to define the slot
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, size, size, 8);
    this.bg.fill({ color: 0x1e0a3a, alpha: 0.35 });
    this.addChild(this.bg);

    // Symbol: use AI sprite if available, fallback to geometric shape
    const texture = getSymbolTexture(data.symbol.id);
    if (texture) {
      const sprite = new Sprite(texture);
      // Fill the cell more — gems should be prominent
      sprite.width = size * 0.95;
      sprite.height = size * 0.95;
      sprite.x = size * 0.025;
      sprite.y = size * 0.025;
      this.icon = sprite;
    } else {
      const g = new Graphics();
      this.drawGemShape(g, data.symbol.shape, data.symbol.color, size);
      this.icon = g;
    }
    this.addChild(this.icon);

    // Power-up indicator
    if (data.powerUp) {
      const puIcon = this.createPowerUpIndicator(data.powerUp);
      this.addChild(puIcon);
    }

    // Blocker overlay (ice, stone, chain, thorn, vine, frozen_column)
    if (data.isBlocker) {
      const blockerOverlay = this.createBlockerOverlay(data.blockerHealth, size, data.blockerType);
      this.addChild(blockerOverlay);
    }

    // Lava overlay
    if (data.isLava) {
      if (mechanicTextures.lava) {
        attachMechanicSprite(this, mechanicTextures.lava, size, 0.75);
      } else {
        const lava = new Graphics();
        lava.roundRect(2, 2, size - 4, size - 4, 6);
        lava.fill({ color: 0xff4500, alpha: 0.35 });
        lava.stroke({ color: 0xff6348, width: 2, alpha: 0.6 });
        lava.circle(size * 0.3, size * 0.4, 3);
        lava.fill({ color: 0xffaa00, alpha: 0.6 });
        lava.circle(size * 0.7, size * 0.6, 2.5);
        lava.fill({ color: 0xff6600, alpha: 0.5 });
        this.addChild(lava);
      }
    }

    // Fog overlay
    if (data.isFogged) {
      if (mechanicTextures.fog) {
        attachMechanicSprite(this, mechanicTextures.fog, size, 0.85);
      } else {
        const fog = new Graphics();
        fog.roundRect(0, 0, size, size, 8);
        fog.fill({ color: 0x888899, alpha: 0.75 });
        const qm = new Text({
          text: '?',
          style: new TextStyle({ fontSize: size * 0.5, fill: 0xccccdd, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        qm.anchor.set(0.5);
        qm.x = size / 2;
        qm.y = size / 2;
        fog.addChild(qm);
        this.addChild(fog);
      }
    }

    // Shadow overlay (identity hidden)
    if (data.isShadow) {
      if (mechanicTextures.shadow) {
        attachMechanicSprite(this, mechanicTextures.shadow, size, 0.8);
      } else {
        const shadow = new Graphics();
        shadow.roundRect(1, 1, size - 2, size - 2, 7);
        shadow.fill({ color: 0x111122, alpha: 0.7 });
        shadow.circle(size / 2, size / 2, size * 0.2);
        shadow.fill({ color: 0x222244, alpha: 0.5 });
        this.addChild(shadow);
      }
    }

    // Locked symbol overlay
    if (data.isLocked) {
      if (mechanicTextures.locked) {
        attachMechanicSprite(this, mechanicTextures.locked, size, 0.9);
      } else {
        const lock = new Graphics();
        lock.roundRect(2, 2, size - 4, size - 4, 6);
        lock.stroke({ color: 0xaaaaaa, width: 2, alpha: 0.8 });
        const lx = size / 2;
        const ly = size * 0.75;
        lock.roundRect(lx - 6, ly - 4, 12, 10, 2);
        lock.fill({ color: 0x888888, alpha: 0.9 });
        lock.arc(lx, ly - 4, 5, Math.PI, 0);
        lock.stroke({ color: 0xaaaaaa, width: 2 });
        this.addChild(lock);
      }
    }

    // Cursed symbol overlay
    if (data.isCursed) {
      if (mechanicTextures.cursed) {
        attachMechanicSprite(this, mechanicTextures.cursed, size, 0.85);
      } else {
        const curse = new Graphics();
        curse.roundRect(1, 1, size - 2, size - 2, 7);
        curse.fill({ color: 0x6b0080, alpha: 0.3 });
        curse.stroke({ color: 0x9b59b6, width: 2, alpha: 0.7 });
        curse.circle(size * 0.5, size * 0.2, 6);
        curse.fill({ color: 0xbb66dd, alpha: 0.6 });
        this.addChild(curse);
      }
    }

    // Treasure chest overlay
    if (data.isChest) {
      const hits = data.chestHitsReceived || 0;
      const needed = data.chestHitsNeeded || 3;
      if (mechanicTextures.chest) {
        const c = new Container();
        attachMechanicSprite(c, mechanicTextures.chest, size, 0.95);
        const hitText = new Text({
          text: `${hits}/${needed}`,
          style: new TextStyle({ fontSize: 11, fill: 0xf5d060, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        hitText.anchor.set(0.5);
        hitText.x = size / 2;
        hitText.y = size * 0.85;
        c.addChild(hitText);
        this.addChild(c);
      } else {
        const chest = new Graphics();
        chest.roundRect(size * 0.15, size * 0.3, size * 0.7, size * 0.5, 4);
        chest.fill({ color: 0x8b4513, alpha: 0.9 });
        chest.stroke({ color: 0xd4af37, width: 2 });
        chest.roundRect(size * 0.12, size * 0.2, size * 0.76, size * 0.15, 3);
        chest.fill({ color: 0x6b3410, alpha: 0.9 });
        chest.stroke({ color: 0xd4af37, width: 1.5 });
        chest.circle(size * 0.5, size * 0.55, 4);
        chest.fill({ color: 0xd4af37 });
        const hitText = new Text({
          text: `${hits}/${needed}`,
          style: new TextStyle({ fontSize: 10, fill: 0xf5d060, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        hitText.anchor.set(0.5);
        hitText.x = size / 2;
        hitText.y = size * 0.85;
        chest.addChild(hitText);
        this.addChild(chest);
      }
    }

    // Dragon egg overlay
    if (data.isDragonEgg) {
      const stage = data.eggStage || 0;
      const spinsLeft = data.eggSpinsLeft || 0;
      const eggTexKey = `egg-stage${Math.min(stage + 1, 3)}` as keyof typeof mechanicTextures;
      if (mechanicTextures[eggTexKey]) {
        const c = new Container();
        attachMechanicSprite(c, mechanicTextures[eggTexKey]!, size, 0.95);
        const eggText = new Text({
          text: `${spinsLeft}`,
          style: new TextStyle({ fontSize: 12, fill: 0x333333, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        eggText.anchor.set(0.5);
        eggText.x = size / 2;
        eggText.y = size * 0.82;
        c.addChild(eggText);
        this.addChild(c);
      } else {
        const egg = new Graphics();
        const eggColor = stage === 0 ? 0xffeaa7 : stage === 1 ? 0xfdcb6e : 0xff6b6b;
        egg.ellipse(size / 2, size * 0.45, size * 0.28, size * 0.35);
        egg.fill({ color: eggColor, alpha: 0.9 });
        egg.stroke({ color: darkenColor(eggColor, 0.3), width: 2 });
        if (stage >= 1) {
          egg.moveTo(size * 0.35, size * 0.4);
          egg.lineTo(size * 0.5, size * 0.5);
          egg.lineTo(size * 0.4, size * 0.6);
          egg.stroke({ color: 0x333333, width: 1.5 });
        }
        if (stage >= 2) {
          egg.moveTo(size * 0.6, size * 0.35);
          egg.lineTo(size * 0.55, size * 0.55);
          egg.stroke({ color: 0xff4444, width: 1.5 });
        }
        const eggText = new Text({
          text: `${spinsLeft}`,
          style: new TextStyle({ fontSize: 12, fill: 0x333333, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        eggText.anchor.set(0.5);
        eggText.x = size / 2;
        eggText.y = size * 0.45;
        egg.addChild(eggText);
        this.addChild(egg);
      }
    }

    // Relic piece overlay
    if (data.isRelic) {
      if (mechanicTextures.relic) {
        const c = new Container();
        attachMechanicSprite(c, mechanicTextures.relic, size, 0.9);
        const relicText = new Text({
          text: `R${data.relicPiece || '?'}`,
          style: new TextStyle({ fontSize: 9, fill: 0x000000, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        relicText.anchor.set(0.5);
        relicText.x = size / 2;
        relicText.y = size / 2;
        c.addChild(relicText);
        this.addChild(c);
      } else {
        const relic = new Graphics();
        relic.star(size / 2, size / 2, 4, size * 0.15, size * 0.3);
        relic.fill({ color: 0xf1c40f, alpha: 0.8 });
        relic.stroke({ color: 0xd4af37, width: 2 });
        const relicText = new Text({
          text: `R${data.relicPiece || '?'}`,
          style: new TextStyle({ fontSize: 9, fill: 0x000000, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        relicText.anchor.set(0.5);
        relicText.x = size / 2;
        relicText.y = size / 2;
        relic.addChild(relicText);
        this.addChild(relic);
      }
    }

    // Portal indicator
    if (data.portalId) {
      if (mechanicTextures.portal) {
        const c = new Container();
        attachMechanicSprite(c, mechanicTextures.portal, size, 0.7);
        const pText = new Text({
          text: data.portalId,
          style: new TextStyle({ fontSize: 10, fill: 0x00e5ff, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        pText.anchor.set(0.5);
        pText.x = size * 0.85;
        pText.y = size * 0.15;
        c.addChild(pText);
        this.addChild(c);
      } else {
        const portal = new Graphics();
        portal.circle(size / 2, size / 2, size * 0.4);
        portal.stroke({ color: 0x00e5ff, width: 2, alpha: 0.5 });
        portal.circle(size / 2, size / 2, size * 0.35);
        portal.stroke({ color: 0x00e5ff, width: 1, alpha: 0.3 });
        const pText = new Text({
          text: data.portalId,
          style: new TextStyle({ fontSize: 10, fill: 0x00e5ff, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        pText.anchor.set(0.5);
        pText.x = size * 0.85;
        pText.y = size * 0.15;
        portal.addChild(pText);
        this.addChild(portal);
      }
    }

    // Transformer tile indicator
    if (data.transformsTo) {
      if (mechanicTextures.transformer) {
        attachMechanicSprite(this, mechanicTextures.transformer, size, 0.8);
      } else {
        const tf = new Graphics();
        tf.circle(size * 0.85, size * 0.15, 8);
        tf.fill({ color: 0x00aa00, alpha: 0.7 });
        tf.stroke({ color: 0x00ff00, width: 1.5 });
        this.addChild(tf);
      }
    }

    // Multiplier tile indicator
    if (data.tileMultiplier) {
      const multKey = `multiplier-x${data.tileMultiplier}` as keyof typeof mechanicTextures;
      if (mechanicTextures[multKey]) {
        attachMechanicSprite(this, mechanicTextures[multKey]!, size, 0.9);
      } else {
        const mt = new Graphics();
        mt.roundRect(size * 0.6, 0, size * 0.4, 18, 4);
        mt.fill({ color: 0xff6b6b, alpha: 0.8 });
        const mtText = new Text({
          text: `x${data.tileMultiplier}`,
          style: new TextStyle({ fontSize: 11, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'monospace' }),
        });
        mtText.anchor.set(0.5);
        mtText.x = size * 0.8;
        mtText.y = 9;
        mt.addChild(mtText);
        this.addChild(mt);
      }
    }

    // Inactive cell overlay (phase shift)
    if (data.isActive === false) {
      if (mechanicTextures.inactive) {
        attachMechanicSprite(this, mechanicTextures.inactive, size, 0.85);
      } else {
        const inactive = new Graphics();
        inactive.roundRect(0, 0, size, size, 8);
        inactive.fill({ color: 0x000000, alpha: 0.6 });
        inactive.moveTo(size * 0.2, size * 0.2);
        inactive.lineTo(size * 0.8, size * 0.8);
        inactive.stroke({ color: 0x444444, width: 2 });
        inactive.moveTo(size * 0.8, size * 0.2);
        inactive.lineTo(size * 0.2, size * 0.8);
        inactive.stroke({ color: 0x444444, width: 2 });
        this.addChild(inactive);
      }
    }

    // Selection highlight (drag-hover: yellow outline)
    this.selectHighlight = new Graphics();
    this.selectHighlight.roundRect(-3, -3, size + 6, size + 6, 10);
    this.selectHighlight.stroke({ color: 0xf5d060, width: 3, alpha: 0.9 });
    this.selectHighlight.visible = false;
    this.addChild(this.selectHighlight);

    // Tap-selection highlight (persistent cyan glow ring — first tap in tap-to-swap)
    this.tapSelectHighlight = new Graphics();
    // Outer soft glow ring
    this.tapSelectHighlight.roundRect(-7, -7, size + 14, size + 14, 14);
    this.tapSelectHighlight.stroke({ color: 0x00e8ff, width: 3, alpha: 0.35 });
    // Inner bright border
    this.tapSelectHighlight.roundRect(-3, -3, size + 6, size + 6, 10);
    this.tapSelectHighlight.stroke({ color: 0x00e8ff, width: 3, alpha: 1.0 });
    // Corner sparkle dots
    const dotR = 3;
    this.tapSelectHighlight.circle(-3, -3, dotR);
    this.tapSelectHighlight.fill({ color: 0x00e8ff, alpha: 0.9 });
    this.tapSelectHighlight.circle(size + 3, -3, dotR);
    this.tapSelectHighlight.fill({ color: 0x00e8ff, alpha: 0.9 });
    this.tapSelectHighlight.circle(-3, size + 3, dotR);
    this.tapSelectHighlight.fill({ color: 0x00e8ff, alpha: 0.9 });
    this.tapSelectHighlight.circle(size + 3, size + 3, dotR);
    this.tapSelectHighlight.fill({ color: 0x00e8ff, alpha: 0.9 });
    this.tapSelectHighlight.visible = false;
    this.addChild(this.tapSelectHighlight);
  }

  setSelected(selected: boolean): void {
    this.selectHighlight.visible = selected;
    if (selected) {
      gsap.fromTo(this.scale, { x: 1, y: 1 }, { x: 1.08, y: 1.08, duration: 0.15, ease: 'back.out' });
    } else {
      gsap.to(this.scale, { x: 1, y: 1, duration: 0.1 });
    }
  }

  setTapSelected(selected: boolean): void {
    // Kill any running pulse tween
    if (this.tapSelectTween) {
      this.tapSelectTween.kill();
      this.tapSelectTween = null;
    }
    this.tapSelectHighlight.visible = selected;
    this.tapSelectHighlight.alpha = 1;
    if (selected) {
      // Pop up slightly with a bounce, then pulse the glow
      gsap.fromTo(this.scale, { x: 1, y: 1 }, { x: 1.12, y: 1.12, duration: 0.18, ease: 'back.out(2.5)' });
      this.tapSelectTween = gsap.to(this.tapSelectHighlight, {
        alpha: 0.45,
        duration: 0.55,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    } else {
      gsap.to(this.scale, { x: 1, y: 1, duration: 0.12 });
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

  private createPowerUpIndicator(type: PowerUpType): Container {
    const container = new Container();
    const size = getCellSize();
    const texSet = type ? powerUpTextures[type] : null;

    if (texSet?.glow) {
      // Background idle glow (slightly larger than cell, sits behind)
      const glow = new Sprite(texSet.glow);
      glow.width = size + 16;
      glow.height = size + 16;
      glow.x = -8;
      glow.y = -8;
      glow.alpha = 0.55;
      container.addChild(glow);
      // Pulse the glow
      gsap.to(glow, { alpha: 0.85, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }

    if (texSet?.indicator) {
      // Indicator icon in bottom-right corner
      const ind = new Sprite(texSet.indicator);
      const indSize = size * 0.42;
      ind.width = indSize;
      ind.height = indSize;
      ind.x = size - indSize + 2;
      ind.y = size - indSize + 2;
      ind.alpha = 0.95;
      container.addChild(ind);
    } else {
      // Fallback: text banner
      const color = type === 'blast' ? 0x00e5ff : type === 'bomb' ? 0xff5722 : 0xffd700;
      const label = type === 'blast' ? 'BLAST' : type === 'bomb' ? 'BOMB' : 'RAINBOW';
      const bg = new Graphics();
      bg.roundRect(2, size - 22, size - 4, 20, 4);
      bg.fill({ color: 0x000000, alpha: 0.7 });
      bg.stroke({ color, width: 1.5, alpha: 0.9 });
      container.addChild(bg);
      const text = new Text({
        text: label,
        style: new TextStyle({
          fontSize: 11,
          fontWeight: 'bold',
          fontFamily: 'Segoe UI, sans-serif',
          fill: color,
          letterSpacing: 1,
        }),
      });
      text.anchor.set(0.5);
      text.x = size / 2;
      text.y = size - 12;
      container.addChild(text);
    }

    return container;
  }

  private createBlockerOverlay(
    health: number,
    size: number,
    blockerType?: import('@/models/Symbol').BlockerType,
  ): Graphics {
    const g = new Graphics();
    const type = blockerType || (health >= 2 ? 'stone' : 'ice');

    // Helper to attach a sprite overlay to the Graphics container
    const attachBlockerSprite = (tex: Texture) => {
      const spr = new Sprite(tex);
      spr.width = size + 14;
      spr.height = size + 14;
      spr.x = -7;
      spr.y = -7;
      spr.alpha = 0.9;
      (g as unknown as Container).addChild(spr);
    };

    switch (type) {
      case 'stone': {
        const texSet = blockerTextures.stone;
        const tex = health >= 2 ? texSet.intact : texSet.cracked;
        if (tex) {
          attachBlockerSprite(tex);
        } else {
          g.roundRect(2, 2, size - 4, size - 4, 6);
          g.fill({ color: 0x888888, alpha: 0.55 });
          g.stroke({ color: 0x666666, width: 2 });
          g.moveTo(size * 0.2, size * 0.2);
          g.lineTo(size * 0.8, size * 0.8);
          g.stroke({ color: 0x555555, width: 1.5, alpha: 0.5 });
          g.moveTo(size * 0.8, size * 0.2);
          g.lineTo(size * 0.2, size * 0.8);
          g.stroke({ color: 0x555555, width: 1.5, alpha: 0.5 });
        }
        break;
      }

      case 'chain': {
        const texSet = blockerTextures.chain;
        const tex = health >= 2 ? texSet.intact : texSet.cracked;
        if (tex) {
          attachBlockerSprite(tex);
        } else {
          g.roundRect(2, 2, size - 4, size - 4, 6);
          g.fill({ color: 0x777788, alpha: 0.4 });
          for (let i = 0; i < 3; i++) {
            const cy = size * 0.25 + i * size * 0.25;
            g.ellipse(size / 2, cy, size * 0.18, size * 0.1);
            g.stroke({ color: 0xaaaacc, width: 2, alpha: 0.7 });
          }
        }
        break;
      }

      case 'thorn': {
        const texSet = blockerTextures.thorn;
        const tex = health >= 2 ? texSet.intact : texSet.cracked;
        if (tex) {
          attachBlockerSprite(tex);
        } else {
          g.roundRect(2, 2, size - 4, size - 4, 6);
          g.fill({ color: 0x2d5016, alpha: 0.4 });
          g.stroke({ color: 0x44aa22, width: 2, alpha: 0.6 });
          const spikes = [
            [0.2, 0.1],
            [0.8, 0.15],
            [0.15, 0.8],
            [0.85, 0.85],
            [0.5, 0.05],
          ];
          for (const [sx, sy] of spikes) {
            g.moveTo(size * sx, size * sy);
            g.lineTo(size * sx - 3, size * sy + 8);
            g.lineTo(size * sx + 3, size * sy + 8);
            g.closePath();
            g.fill({ color: 0x44aa22, alpha: 0.7 });
          }
        }
        break;
      }

      case 'vine': {
        const texSet = blockerTextures.vine;
        const tex = health >= 2 ? texSet.intact : texSet.cracked;
        if (tex) {
          attachBlockerSprite(tex);
        } else {
          g.roundRect(2, 2, size - 4, size - 4, 6);
          g.fill({ color: 0x1a4d1a, alpha: 0.35 });
          g.moveTo(size * 0.1, size * 0.3);
          g.bezierCurveTo(size * 0.3, size * 0.1, size * 0.5, size * 0.4, size * 0.7, size * 0.2);
          g.stroke({ color: 0x2ecc71, width: 2.5, alpha: 0.6 });
          g.moveTo(size * 0.3, size * 0.7);
          g.bezierCurveTo(size * 0.5, size * 0.5, size * 0.7, size * 0.8, size * 0.9, size * 0.6);
          g.stroke({ color: 0x27ae60, width: 2, alpha: 0.5 });
          g.ellipse(size * 0.4, size * 0.25, 4, 7);
          g.fill({ color: 0x2ecc71, alpha: 0.5 });
        }
        break;
      }

      case 'frozen_column': {
        const texSet = blockerTextures.frozen_column;
        const tex = health >= 2 ? texSet.intact : texSet.cracked;
        if (tex) {
          attachBlockerSprite(tex);
        } else {
          g.roundRect(1, 1, size - 2, size - 2, 6);
          g.fill({ color: 0x88ddff, alpha: 0.5 });
          g.stroke({ color: 0x55bbff, width: 3, alpha: 0.7 });
          g.moveTo(size / 2, size * 0.2);
          g.lineTo(size / 2, size * 0.8);
          g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
          g.moveTo(size * 0.25, size * 0.35);
          g.lineTo(size * 0.75, size * 0.65);
          g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
          g.moveTo(size * 0.75, size * 0.35);
          g.lineTo(size * 0.25, size * 0.65);
          g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
        }
        break;
      }

      case 'ice':
      default:
        // Use real sprite textures if loaded, otherwise fallback to code-drawn
        if ((health >= 2 && iceIntactTex) || (health < 2 && iceCrackedTex)) {
          const tex = health >= 2 ? iceIntactTex! : iceCrackedTex!;
          const iceSprite = new Sprite(tex);
          iceSprite.width = size + 14; // larger than cell so ice edges frame the gem
          iceSprite.height = size + 14;
          iceSprite.x = -7;
          iceSprite.y = -7;
          iceSprite.alpha = 0.85;
          // Graphics container can't hold Sprite — return early via parent
          // We'll handle this in the caller instead
          g.roundRect(0, 0, 0, 0, 0); // noop placeholder
          (g as unknown as Container).addChild(iceSprite);
        } else {
          g.roundRect(2, 2, size - 4, size - 4, 6);
          g.fill({ color: 0xaaddff, alpha: 0.45 });
          g.stroke({ color: 0x88ccff, width: 2, alpha: 0.7 });
          g.moveTo(size * 0.15, size * 0.3);
          g.lineTo(size * 0.45, size * 0.55);
          g.lineTo(size * 0.35, size * 0.75);
          g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
          g.moveTo(size * 0.6, size * 0.15);
          g.lineTo(size * 0.7, size * 0.45);
          g.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
        }
        break;
    }
    return g;
  }
}
