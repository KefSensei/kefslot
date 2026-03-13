import { Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { LevelConfigs } from '@/config/LevelConfig';
import { PlayerState } from '@/models/PlayerState';

/**
 * Path waypoints for level nodes — normalized [0..1] coordinates.
 * These trace the golden winding path visible in the world map art.
 * The path snakes from upper-left meadow down to lower caverns.
 */
const PATH_PORTRAIT: [number, number][] = [
  // World 1: Enchanted Meadow (upper meadow area, path winds right then left)
  [0.28, 0.08], // L1  — top-left meadow
  [0.52, 0.10], // L2  — slight right
  [0.72, 0.13], // L3  — right side
  [0.68, 0.19], // L4  — curving down-left
  [0.45, 0.22], // L5  — center
  [0.25, 0.26], // L6  — left side
  [0.30, 0.32], // L7  — path curves right
  [0.52, 0.35], // L8  — center-right
  [0.70, 0.38], // L9  — right
  [0.55, 0.42], // L10 — center (boss, slightly larger later)

  // World 2: Crystal Caverns (lower rocky area, path descends into caves)
  [0.38, 0.50], // L11 — entering cavern zone
  [0.22, 0.54], // L12 — left cave wall
  [0.40, 0.58], // L13 — center path
  [0.62, 0.55], // L14 — right side
  [0.72, 0.60], // L15 — right cave
  [0.58, 0.65], // L16 — curving left
  [0.35, 0.68], // L17 — left
  [0.25, 0.73], // L18 — deeper left
  [0.45, 0.78], // L19 — center-right
  [0.50, 0.84], // L20 — boss, deep in cavern
];

const PATH_LANDSCAPE: [number, number][] = [
  // World 1: same path but adjusted for wider/shorter aspect ratio
  [0.20, 0.07], // L1
  [0.38, 0.09], // L2
  [0.55, 0.12], // L3
  [0.58, 0.20], // L4
  [0.42, 0.24], // L5
  [0.25, 0.28], // L6
  [0.28, 0.36], // L7
  [0.45, 0.38], // L8
  [0.60, 0.42], // L9
  [0.48, 0.48], // L10

  // World 2
  [0.35, 0.55], // L11
  [0.22, 0.60], // L12
  [0.38, 0.64], // L13
  [0.55, 0.60], // L14
  [0.65, 0.66], // L15
  [0.55, 0.72], // L16
  [0.38, 0.75], // L17
  [0.25, 0.80], // L18
  [0.42, 0.85], // L19
  [0.48, 0.92], // L20
];

export class LevelSelect extends Container {
  onLevelChosen: ((levelId: number) => void) | null = null;
  private bgTextures: { landscape: Texture; portrait: Texture } | null = null;

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
          { name: 'Crystal Caverns', x: 0.50, y: 0.47 },
        ]
      : [
          { name: 'Enchanted Meadow', x: 0.50, y: 0.02 },
          { name: 'Crystal Caverns', x: 0.50, y: 0.52 },
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

    // Place level nodes along the path
    const nodeSize = isPortrait ? 48 : 52;
    const bossSize = isPortrait ? 56 : 60;

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
