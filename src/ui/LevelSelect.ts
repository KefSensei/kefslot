import { Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { LevelConfigs } from '@/config/LevelConfig';
import { PlayerState } from '@/models/PlayerState';

/**
 * Road-center waypoints traced from the golden road in the world-map art.
 * Each entry is the road's center at that level's progress point.
 * Odd levels (1,3,5…) are offset to the LEFT of the road direction.
 * Even levels (2,4,6…) are offset to the RIGHT.
 * Boss levels (10, 20) sit ON the road center.
 */

/** Perpendicular offset (normalized) from road center to node edge */
const ROAD_OFFSET = 0.045;

/**
 * Given a list of road-center waypoints, offset odd levels left and even
 * levels right (relative to the road's forward direction).
 * Boss levels (index 9 and 19 → ids 10 and 20) stay centered on the road.
 */
function offsetFromRoad(
  centers: [number, number][],
): [number, number][] {
  return centers.map(([cx, cy], i) => {
    const levelId = i + 1;
    const isBoss = levelId === 10 || levelId === 20;
    if (isBoss) return [cx, cy];

    // Compute road direction vector from prev→next (or neighbors)
    const prev = i > 0 ? centers[i - 1] : centers[i];
    const next = i < centers.length - 1 ? centers[i + 1] : centers[i];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Perpendicular: rotate direction 90° left = (-dy, dx)
    const px = -dy / len;
    const py = dx / len;

    // Odd levels → left side (negative perp), even → right side (positive perp)
    const sign = levelId % 2 === 1 ? -1 : 1;
    return [cx + px * ROAD_OFFSET * sign, cy + py * ROAD_OFFSET * sign] as [number, number];
  });
}

// Road centerline traced from the portrait world-map art (500×900 canvas).
// The golden road starts upper-left, sweeps right across the meadow,
// S-curves down through a stone bridge into the crystal caverns.
const ROAD_CENTER_PORTRAIT: [number, number][] = [
  // World 1: Enchanted Meadow — road sweeps right then loops back left
  [0.33, 0.09], // L1  — road start, upper-left meadow
  [0.44, 0.11], // L2  — road heading right
  [0.56, 0.13], // L3  — continuing right
  [0.63, 0.17], // L4  — road curving down-right
  [0.55, 0.22], // L5  — road curving back left
  [0.44, 0.26], // L6  — center of road sweep left
  [0.37, 0.31], // L7  — road bends, heading down-right
  [0.42, 0.35], // L8  — on the road heading right
  [0.50, 0.38], // L9  — approaching the bridge
  [0.47, 0.42], // L10 — BOSS: on the stone bridge

  // World 2: Crystal Caverns — road through bridge into winding caves
  [0.47, 0.49], // L11 — just past bridge, entering cavern
  [0.54, 0.53], // L12 — road in upper cave (curves right)
  [0.56, 0.57], // L13 — road heading right
  [0.58, 0.61], // L14 — right side of cave road
  [0.58, 0.65], // L15 — near second bridge
  [0.54, 0.69], // L16 — road curves back left
  [0.50, 0.73], // L17 — past second bridge
  [0.52, 0.78], // L18 — center of lower cave road
  [0.52, 0.83], // L19 — heading toward cave entrance
  [0.48, 0.88], // L20 — BOSS: deep in cavern
];

const PATH_PORTRAIT = offsetFromRoad(ROAD_CENTER_PORTRAIT);

// Road centerline for landscape (800×700 canvas) — tapped via debug overlay.
const ROAD_CENTER_LANDSCAPE: [number, number][] = [
  [0.49, 0.04], // L1
  [0.48, 0.09], // L2
  [0.60, 0.08], // L3
  [0.58, 0.13], // L4
  [0.69, 0.14], // L5
  [0.59, 0.19], // L6
  [0.65, 0.24], // L7
  [0.51, 0.21], // L8
  [0.58, 0.29], // L9
  [0.45, 0.24], // L10
  [0.47, 0.32], // L11
  [0.33, 0.28], // L12
  [0.41, 0.33], // L13
  [0.29, 0.33], // L14
  [0.37, 0.38], // L15
  [0.27, 0.42], // L16
  [0.43, 0.44], // L17
  [0.37, 0.49], // L18
  [0.49, 0.46], // L19
  [0.45, 0.52], // L20
];

const PATH_LANDSCAPE = offsetFromRoad(ROAD_CENTER_LANDSCAPE);

/** Check URL for ?debug=1 to enable coordinate picker mode */
const DEBUG_MODE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export class LevelSelect extends Container {
  onLevelChosen: ((levelId: number) => void) | null = null;
  private bgTextures: { landscape: Texture; portrait: Texture } | null = null;
  private debugPoints: [number, number][] = [];
  private debugLayer: Container | null = null;

  constructor(private player: PlayerState) {
    super();
    this.build();
  }

  /** Set background textures (call before first build or refresh) */
  setBgTextures(textures: { landscape: Texture; portrait: Texture }): void {
    this.bgTextures = textures;
    this.removeChildren();
    this.build();
  }

  refresh(): void {
    this.removeChildren();
    this.build();
  }

  private build(): void {
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;
    const isPortrait = GameConfig.isPortrait;

    // Background — use art if available, fallback to flat color
    if (this.bgTextures) {
      const bg = new Sprite(isPortrait ? this.bgTextures.portrait : this.bgTextures.landscape);
      bg.width = w;
      bg.height = h;
      this.addChild(bg);

      // Lighter overlay — just enough for readability, let art shine
      const overlay = new Graphics();
      overlay.rect(0, 0, w, h);
      overlay.fill({ color: 0x0a0018, alpha: 0.2 });
      this.addChild(overlay);
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, w, h);
      bg.fill({ color: 0x1a0a2e });
      this.addChild(bg);
    }

    // Pick path coordinates for current orientation
    const path = isPortrait ? PATH_PORTRAIT : PATH_LANDSCAPE;

    // Draw connecting path line between nodes
    this.drawPathLine(path, w, h);

    // World labels — positioned between worlds as section dividers
    const worldLabelPos: { name: string; x: number; y: number }[] = isPortrait
      ? [
          { name: 'Enchanted Meadow', x: 0.50, y: 0.04 },
          { name: 'Crystal Caverns', x: 0.72, y: 0.47 },
        ]
      : [
          { name: 'Enchanted Meadow', x: 0.50, y: 0.00 },
          { name: 'Crystal Caverns', x: 0.18, y: 0.28 },
        ];

    for (const lbl of worldLabelPos) {
      const label = new Text({
        text: lbl.name,
        style: new TextStyle({
          fontSize: isPortrait ? 16 : 18,
          fill: 0xF5D060,
          fontWeight: 'bold',
          fontFamily: 'Segoe UI, sans-serif',
          letterSpacing: 2,
          dropShadow: { color: 0x000000, distance: 2, alpha: 0.9 },
        }),
      });
      label.anchor.set(0.5, 0);
      label.x = lbl.x * w;
      label.y = lbl.y * h;
      this.addChild(label);
    }

    // Place level nodes along the path — kept compact so they hug the road
    const nodeSize = isPortrait ? 40 : 44;
    const bossSize = isPortrait ? 50 : 54;

    for (let i = 0; i < LevelConfigs.length && i < path.length; i++) {
      const level = LevelConfigs[i];
      const [nx, ny] = path[i];
      const isBoss = level.id === 10 || level.id === 20; // boss levels
      const size = isBoss ? bossSize : nodeSize;

      const unlocked = this.player.isLevelUnlocked(level.id);
      const stars = this.player.getStars(level.id);

      const btn = new Container();
      btn.x = nx * w;
      btn.y = ny * h;

      // Node circle
      const circle = new Graphics();
      const radius = size / 2;

      if (unlocked) {
        // Outer glow for unlocked
        circle.circle(0, 0, radius + 4);
        circle.fill({ color: stars > 0 ? 0x9b59b6 : 0x5b3a8a, alpha: 0.4 });

        // Main circle
        circle.circle(0, 0, radius);
        circle.fill({ color: stars > 0 ? 0x2d1b69 : 0x1e0a3a, alpha: 0.92 });
        circle.stroke({ color: isBoss ? 0xf1c40f : 0x9b59b6, width: isBoss ? 3 : 2 });
      } else {
        circle.circle(0, 0, radius);
        circle.fill({ color: 0x111111, alpha: 0.7 });
        circle.stroke({ color: 0x333333, width: 1.5 });
      }
      btn.addChild(circle);

      // Level number
      const numText = new Text({
        text: String(level.id),
        style: new TextStyle({
          fontSize: isBoss ? 22 : 18,
          fill: unlocked ? 0xffffff : 0x555555,
          fontWeight: 'bold',
          fontFamily: 'Segoe UI, sans-serif',
          dropShadow: unlocked ? { color: 0x000000, distance: 1, alpha: 0.5 } : undefined,
        }),
      });
      numText.anchor.set(0.5);
      numText.y = stars > 0 ? -4 : 0;
      btn.addChild(numText);

      // Stars below number
      if (stars > 0) {
        const starsText = new Text({
          text: '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars),
          style: new TextStyle({ fontSize: 10, fill: 0xf1c40f, fontFamily: 'Segoe UI, sans-serif' }),
        });
        starsText.anchor.set(0.5);
        starsText.y = 10;
        btn.addChild(starsText);
      }

      if (unlocked) {
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', () => {
          this.onLevelChosen?.(level.id);
        });
      }

      this.addChild(btn);
    }

    // Debug overlay — click anywhere to log normalized coordinates
    if (DEBUG_MODE) {
      this.buildDebugOverlay(w, h);
    }
  }

  private buildDebugOverlay(w: number, h: number): void {
    // Transparent hit area covering the whole map
    const hitArea = new Graphics();
    hitArea.rect(0, 0, w, h);
    hitArea.fill({ color: 0x000000, alpha: 0.001 }); // nearly invisible
    hitArea.eventMode = 'static';
    hitArea.cursor = 'crosshair';
    this.addChild(hitArea);

    // Layer for debug markers
    this.debugLayer = new Container();
    this.addChild(this.debugLayer);

    // Info text at top
    const info = new Text({
      text: `🔧 DEBUG MODE — tap road to place points (${GameConfig.isPortrait ? 'portrait' : 'landscape'})`,
      style: new TextStyle({ fontSize: 12, fill: 0x00ff00, fontFamily: 'monospace' }),
    });
    info.x = 10;
    info.y = 10;
    this.debugLayer.addChild(info);

    // Counter text
    const counter = new Text({
      text: `Points: ${this.debugPoints.length}/20`,
      style: new TextStyle({ fontSize: 12, fill: 0x00ff00, fontFamily: 'monospace' }),
    });
    counter.x = 10;
    counter.y = 26;
    this.debugLayer.addChild(counter);

    hitArea.on('pointerdown', (e) => {
      const localPos = e.getLocalPosition(this);
      const nx = Math.round((localPos.x / w) * 100) / 100;
      const ny = Math.round((localPos.y / h) * 100) / 100;

      this.debugPoints.push([nx, ny]);
      const idx = this.debugPoints.length;

      // Draw marker dot
      const dot = new Graphics();
      dot.circle(0, 0, 5);
      dot.fill({ color: 0x00ff00 });
      dot.stroke({ color: 0x000000, width: 1 });
      dot.x = localPos.x;
      dot.y = localPos.y;
      this.debugLayer!.addChild(dot);

      // Label
      const label = new Text({
        text: String(idx),
        style: new TextStyle({ fontSize: 10, fill: 0x00ff00, fontFamily: 'monospace' }),
      });
      label.anchor.set(0.5);
      label.x = localPos.x;
      label.y = localPos.y - 12;
      this.debugLayer!.addChild(label);

      // Update counter
      counter.text = `Points: ${this.debugPoints.length}/20`;

      // Log to console
      console.log(`[DEBUG] Point ${idx}: [${nx}, ${ny}]`);

      // When we have 20 points, dump the full array
      if (this.debugPoints.length === 20) {
        const orientation = GameConfig.isPortrait ? 'PORTRAIT' : 'LANDSCAPE';
        const arr = this.debugPoints
          .map(([x, y], i) => `  [${x}, ${y}], // L${i + 1}`)
          .join('\n');
        console.log(`\n=== ROAD_CENTER_${orientation} ===\n[\n${arr}\n]`);
      }
    });

    // Undo last point on right-click or double-tap
    hitArea.on('rightclick', (e) => {
      e.preventDefault?.();
      if (this.debugPoints.length > 0) {
        this.debugPoints.pop();
        // Remove last 2 children (dot + label)
        if (this.debugLayer!.children.length > 2) {
          this.debugLayer!.removeChildAt(this.debugLayer!.children.length - 1);
          this.debugLayer!.removeChildAt(this.debugLayer!.children.length - 1);
        }
        counter.text = `Points: ${this.debugPoints.length}/20`;
        console.log(`[DEBUG] Undo — ${this.debugPoints.length} points remaining`);
      }
    });
  }

  /** Draw a dotted path connecting level nodes */
  private drawPathLine(path: [number, number][], w: number, h: number): void {
    if (path.length < 2) return;

    const line = new Graphics();
    const points = path.map(([nx, ny]) => ({ x: nx * w, y: ny * h }));

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];

      // Draw dashed line between consecutive nodes
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dashLen = 6;
      const gapLen = 6;
      const steps = Math.floor(dist / (dashLen + gapLen));

      for (let s = 0; s < steps; s++) {
        const t0 = (s * (dashLen + gapLen)) / dist;
        const t1 = Math.min((s * (dashLen + gapLen) + dashLen) / dist, 1);
        const x0 = from.x + dx * t0;
        const y0 = from.y + dy * t0;
        const x1 = from.x + dx * t1;
        const y1 = from.y + dy * t1;

        line.moveTo(x0, y0);
        line.lineTo(x1, y1);
      }
    }

    line.stroke({ color: 0xF5D060, width: 2, alpha: 0.5 });
    this.addChild(line);
  }
}
