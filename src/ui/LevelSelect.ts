import { Container, Graphics, Text, TextStyle, Sprite, Texture, FederatedPointerEvent } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { LevelConfigs } from '@/config/LevelConfig';
import { PlayerState } from '@/models/PlayerState';

/** Perpendicular offset (normalized) from road center to node edge */
const ROAD_OFFSET = 0.045;

/**
 * Given a list of road-center waypoints, offset odd levels left and even
 * levels right (relative to the road's forward direction).
 * Boss levels (index 9 and 19 → ids 10 and 20) stay centered on the road.
 */
function offsetFromRoad(centers: [number, number][]): [number, number][] {
  return centers.map(([cx, cy], i) => {
    const levelId = i + 1;
    const isBoss = levelId === 10 || levelId === 20;
    if (isBoss) return [cx, cy];

    const prev = i > 0 ? centers[i - 1] : centers[i];
    const next = i < centers.length - 1 ? centers[i + 1] : centers[i];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const px = -dy / len;
    const py = dx / len;

    const sign = levelId % 2 === 1 ? -1 : 1;
    return [cx + px * ROAD_OFFSET * sign, cy + py * ROAD_OFFSET * sign] as [number, number];
  });
}

// Road centerline traced from the portrait world-map art (500×900 canvas).
const ROAD_CENTER_PORTRAIT: [number, number][] = [
  [0.26, 0.19], // L1
  [0.47, 0.28], // L2
  [0.61, 0.27], // L3
  [0.54, 0.32], // L4
  [0.71, 0.34], // L5
  [0.61, 0.39], // L6
  [0.43, 0.37], // L7
  [0.29, 0.4], // L8
  [0.43, 0.43], // L9
  [0.28, 0.48], // L10
  [0.46, 0.49], // L11
  [0.64, 0.51], // L12
  [0.54, 0.55], // L13
  [0.47, 0.61], // L14
  [0.38, 0.65], // L15
  [0.53, 0.67], // L16
  [0.5, 0.73], // L17
  [0.59, 0.77], // L18
  [0.42, 0.8], // L19
  [0.31, 0.91], // L20
];

const PATH_PORTRAIT = offsetFromRoad(ROAD_CENTER_PORTRAIT);

// Road centerline for landscape (800×700 canvas) — tapped via debug overlay.
const ROAD_CENTER_LANDSCAPE: [number, number][] = [
  [0.42, 0.07], // L1
  [0.55, 0.05], // L2
  [0.56, 0.13], // L3
  [0.67, 0.21], // L4
  [0.55, 0.27], // L5
  [0.43, 0.23], // L6
  [0.44, 0.34], // L7
  [0.32, 0.3], // L8
  [0.32, 0.39], // L9
  [0.36, 0.47], // L10
  [0.45, 0.48], // L11
  [0.56, 0.48], // L12
  [0.64, 0.55], // L13
  [0.57, 0.6], // L14
  [0.62, 0.67], // L15
  [0.43, 0.7], // L16
  [0.46, 0.79], // L17
  [0.5, 0.86], // L18
  [0.59, 0.88], // L19
  [0.58, 0.96], // L20
];

const PATH_LANDSCAPE = offsetFromRoad(ROAD_CENTER_LANDSCAPE);

/** Check URL for ?debug=1 to enable WYSIWYG coordinate editor */
const DEBUG_MODE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export class LevelSelect extends Container {
  onLevelChosen: ((levelId: number) => void) | null = null;
  private bgTextures: { landscape: Texture; portrait: Texture } | null = null;

  constructor(private player: PlayerState) {
    super();
    this.build();
  }

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

    // Background
    if (this.bgTextures) {
      const bg = new Sprite(isPortrait ? this.bgTextures.portrait : this.bgTextures.landscape);
      bg.width = w;
      bg.height = h;
      this.addChild(bg);

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

    if (DEBUG_MODE) {
      // WYSIWYG debug mode — draggable level circles, no offsetFromRoad
      this.buildDebugEditor(w, h, isPortrait);
    } else {
      // Normal game mode
      this.buildNormalMap(w, h, isPortrait);
    }
  }

  // ─── Normal (non-debug) map ───────────────────────────────────────

  private buildNormalMap(w: number, h: number, isPortrait: boolean): void {
    const path = isPortrait ? PATH_PORTRAIT : PATH_LANDSCAPE;

    this.drawPathLine(path, w, h);

    // World labels
    const worldLabelPos: { name: string; x: number; y: number }[] = isPortrait
      ? [
          { name: 'Enchanted Meadow', x: 0.5, y: 0.04 },
          { name: 'Crystal Caverns', x: 0.72, y: 0.47 },
        ]
      : [
          { name: 'Enchanted Meadow', x: 0.5, y: 0.0 },
          { name: 'Crystal Caverns', x: 0.18, y: 0.28 },
        ];

    for (const lbl of worldLabelPos) {
      const label = new Text({
        text: lbl.name,
        style: new TextStyle({
          fontSize: isPortrait ? 16 : 18,
          fill: 0xf5d060,
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

    // Level nodes
    const nodeSize = isPortrait ? 40 : 44;
    const bossSize = isPortrait ? 50 : 54;

    for (let i = 0; i < LevelConfigs.length && i < path.length; i++) {
      const level = LevelConfigs[i];
      const [nx, ny] = path[i];
      const isBoss = level.id === 10 || level.id === 20;
      const size = isBoss ? bossSize : nodeSize;
      const unlocked = this.player.isLevelUnlocked(level.id);
      const stars = this.player.getStars(level.id);

      const btn = new Container();
      btn.x = nx * w;
      btn.y = ny * h;

      const circle = new Graphics();
      const radius = size / 2;

      if (unlocked) {
        circle.circle(0, 0, radius + 4);
        circle.fill({ color: stars > 0 ? 0x9b59b6 : 0x5b3a8a, alpha: 0.4 });
        circle.circle(0, 0, radius);
        circle.fill({ color: stars > 0 ? 0x2d1b69 : 0x1e0a3a, alpha: 0.92 });
        circle.stroke({ color: isBoss ? 0xf1c40f : 0x9b59b6, width: isBoss ? 3 : 2 });
      } else {
        circle.circle(0, 0, radius);
        circle.fill({ color: 0x111111, alpha: 0.7 });
        circle.stroke({ color: 0x333333, width: 1.5 });
      }
      btn.addChild(circle);

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

  // ─── WYSIWYG Debug Editor ─────────────────────────────────────────

  private buildDebugEditor(w: number, h: number, isPortrait: boolean): void {
    // Use the RAW road center coords (no offset) as starting positions
    const rawCoords = isPortrait
      ? ROAD_CENTER_PORTRAIT.map(([x, y]) => [x, y] as [number, number])
      : ROAD_CENTER_LANDSCAPE.map(([x, y]) => [x, y] as [number, number]);

    // Mutable positions array — this is what we'll export
    const positions: [number, number][] = rawCoords.map(([x, y]) => [x, y]);

    // Path line layer (redrawn on drag)
    const pathLine = new Graphics();
    this.addChild(pathLine);

    // Node layer on top
    const nodeLayer = new Container();
    this.addChild(nodeLayer);

    const nodeSize = isPortrait ? 40 : 44;
    const bossSize = isPortrait ? 50 : 54;

    const redrawPathLine = () => {
      pathLine.clear();
      if (positions.length < 2) return;
      const points = positions.map(([nx, ny]) => ({ x: nx * w, y: ny * h }));
      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dashLen = 6;
        const gapLen = 6;
        const steps = Math.floor(dist / (dashLen + gapLen));
        for (let s = 0; s < steps; s++) {
          const t0 = (s * (dashLen + gapLen)) / dist;
          const t1 = Math.min((s * (dashLen + gapLen) + dashLen) / dist, 1);
          pathLine.moveTo(from.x + dx * t0, from.y + dy * t0);
          pathLine.lineTo(from.x + dx * t1, from.y + dy * t1);
        }
      }
      pathLine.stroke({ color: 0xf5d060, width: 2, alpha: 0.5 });
    };

    // Draw initial path
    redrawPathLine();

    // Create draggable nodes
    for (let i = 0; i < 20 && i < positions.length; i++) {
      const levelId = i + 1;
      const isBoss = levelId === 10 || levelId === 20;
      const size = isBoss ? bossSize : nodeSize;
      const radius = size / 2;

      const node = new Container();
      node.x = positions[i][0] * w;
      node.y = positions[i][1] * h;

      // Draw the circle exactly like the real game nodes
      const circle = new Graphics();
      circle.circle(0, 0, radius + 4);
      circle.fill({ color: 0x5b3a8a, alpha: 0.4 });
      circle.circle(0, 0, radius);
      circle.fill({ color: 0x2d1b69, alpha: 0.92 });
      circle.stroke({ color: isBoss ? 0xf1c40f : 0x9b59b6, width: isBoss ? 3 : 2 });
      node.addChild(circle);

      // Level number
      const numText = new Text({
        text: String(levelId),
        style: new TextStyle({
          fontSize: isBoss ? 22 : 18,
          fill: 0xffffff,
          fontWeight: 'bold',
          fontFamily: 'Segoe UI, sans-serif',
          dropShadow: { color: 0x000000, distance: 1, alpha: 0.5 },
        }),
      });
      numText.anchor.set(0.5);
      node.addChild(numText);

      // Make draggable
      node.eventMode = 'static';
      node.cursor = 'grab';

      let dragging = false;

      node.on('pointerdown', (e: FederatedPointerEvent) => {
        dragging = true;
        node.cursor = 'grabbing';
        node.alpha = 0.8;
        // Bring to front
        nodeLayer.setChildIndex(node, nodeLayer.children.length - 1);
        e.stopPropagation();
      });

      node.on('globalpointermove', (e: FederatedPointerEvent) => {
        if (!dragging) return;
        const local = e.getLocalPosition(this);
        node.x = local.x;
        node.y = local.y;
        // Update positions array
        positions[i][0] = Math.round((local.x / w) * 100) / 100;
        positions[i][1] = Math.round((local.y / h) * 100) / 100;
        // Redraw path line
        redrawPathLine();
      });

      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        node.cursor = 'grab';
        node.alpha = 1;
        // Snap to 2 decimal places
        node.x = positions[i][0] * w;
        node.y = positions[i][1] * h;
        // Log current position
        console.log(`[DEBUG] L${levelId}: [${positions[i][0]}, ${positions[i][1]}]`);
      };

      node.on('pointerup', endDrag);
      node.on('pointerupoutside', endDrag);

      nodeLayer.addChild(node);
    }

    // Info bar at top
    const infoBar = new Container();
    this.addChild(infoBar);

    const infoBg = new Graphics();
    infoBg.rect(0, 0, w, 32);
    infoBg.fill({ color: 0x000000, alpha: 0.7 });
    infoBar.addChild(infoBg);

    const orientation = isPortrait ? 'PORTRAIT' : 'LANDSCAPE';
    const infoText = new Text({
      text: `WYSIWYG Editor (${orientation}) — Drag nodes · Press EXPORT to copy`,
      style: new TextStyle({ fontSize: 12, fill: 0x00ff00, fontFamily: 'monospace' }),
    });
    infoText.x = 10;
    infoText.y = 8;
    infoBar.addChild(infoText);

    // Export button
    const exportBtn = new Container();
    const exportBg = new Graphics();
    exportBg.roundRect(0, 0, 80, 24, 4);
    exportBg.fill({ color: 0x00aa00 });
    exportBg.stroke({ color: 0x00ff00, width: 1 });
    exportBtn.addChild(exportBg);

    const exportText = new Text({
      text: 'EXPORT',
      style: new TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'monospace' }),
    });
    exportText.anchor.set(0.5);
    exportText.x = 40;
    exportText.y = 12;
    exportBtn.addChild(exportText);

    exportBtn.x = w - 90;
    exportBtn.y = 4;
    exportBtn.eventMode = 'static';
    exportBtn.cursor = 'pointer';

    exportBtn.on('pointerdown', () => {
      const arr = positions.map(([x, y], idx) => `  [${x}, ${y}], // L${idx + 1}`).join('\n');
      const output = `=== ROAD_CENTER_${orientation} ===\n[\n${arr}\n]`;
      console.log('\n' + output);

      // Also copy to clipboard
      if (navigator.clipboard) {
        const clipText = `[\n${arr}\n]`;
        navigator.clipboard.writeText(clipText).then(
          () => {
            exportText.text = 'COPIED!';
            exportBg.clear();
            exportBg.roundRect(0, 0, 80, 24, 4);
            exportBg.fill({ color: 0x006600 });
            exportBg.stroke({ color: 0x00ff00, width: 1 });
            setTimeout(() => {
              exportText.text = 'EXPORT';
              exportBg.clear();
              exportBg.roundRect(0, 0, 80, 24, 4);
              exportBg.fill({ color: 0x00aa00 });
              exportBg.stroke({ color: 0x00ff00, width: 1 });
            }, 1500);
          },
          () => console.warn('Clipboard write failed — check console for output'),
        );
      }
    });

    infoBar.addChild(exportBtn);
  }

  // ─── Path line drawing ────────────────────────────────────────────

  private drawPathLine(path: [number, number][], w: number, h: number): void {
    if (path.length < 2) return;

    const line = new Graphics();
    const points = path.map(([nx, ny]) => ({ x: nx * w, y: ny * h }));

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dashLen = 6;
      const gapLen = 6;
      const steps = Math.floor(dist / (dashLen + gapLen));

      for (let s = 0; s < steps; s++) {
        const t0 = (s * (dashLen + gapLen)) / dist;
        const t1 = Math.min((s * (dashLen + gapLen) + dashLen) / dist, 1);
        line.moveTo(from.x + dx * t0, from.y + dy * t0);
        line.lineTo(from.x + dx * t1, from.y + dy * t1);
      }
    }

    line.stroke({ color: 0xf5d060, width: 2, alpha: 0.5 });
    this.addChild(line);
  }
}
