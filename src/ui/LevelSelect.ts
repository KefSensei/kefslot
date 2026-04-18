import { Container, Graphics, Text, TextStyle, Sprite, Texture, FederatedPointerEvent } from 'pixi.js';
import { tsWorldTitle, tsLevelNumber, tsLevelNumberBoss, tsMapStars, tsWorldNav } from '@/config/Typography';
import { GameConfig } from '@/config/GameConfig';
import { coverSprite } from '@/utils/MathUtils';
import { LevelConfigs } from '@/config/LevelConfig';
import { PlayerState } from '@/models/PlayerState';

/** World definitions — 10 worlds × 10 levels each */
const WORLDS = [
  { id: 1, name: 'Enchanted Meadow', levels: [1, 10], color: 0x2ecc71 },
  { id: 2, name: 'Crystal Caverns', levels: [11, 20], color: 0x3498db },
  { id: 3, name: 'Volcanic Forge', levels: [21, 30], color: 0xff6348 },
  { id: 4, name: 'Sunken Ruins', levels: [31, 40], color: 0x0984e3 },
  { id: 5, name: 'Skyward Spire', levels: [41, 50], color: 0x74b9ff },
  { id: 6, name: 'Shadow Forest', levels: [51, 60], color: 0xa55eea },
  { id: 7, name: 'Frozen Wastes', levels: [61, 70], color: 0x48dbfb },
  { id: 8, name: "Dragon's Lair", levels: [71, 80], color: 0xff4757 },
  { id: 9, name: 'Astral Realm', levels: [81, 90], color: 0x7d5fff },
  { id: 10, name: "Roxy's Tower", levels: [91, 100], color: 0xf9ca24 },
];

/** Perpendicular offset (normalized) from road center to node edge */
const ROAD_OFFSET = 0.02;

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
// Path follows the stone road: bottom-center → bridge → waterfall → golden summit.
const ROAD_CENTER_PORTRAIT: [number, number][] = [
  [0.5, 0.91], // L1  — bottom centre, path start
  [0.58, 0.8], // L2  — first curve right past daisies
  [0.62, 0.7], // L3  — right side mushroom cluster
  [0.5, 0.62], // L4  — approaching the stone bridge
  [0.38, 0.55], // L5  — bridge crossing, left bank
  [0.42, 0.46], // L6  — past bridge, heading upward
  [0.55, 0.38], // L7  — right of waterfall
  [0.52, 0.29], // L8  — through the mist, upper path
  [0.44, 0.2], // L9  — entering forest canopy
  [0.5, 0.1], // L10 — BOSS: golden summit glow
  [0.46, 0.49], // L11 (World 2 — unused for W1)
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

// Road centerline for landscape (800×700 canvas).
// Path follows the stone road: bottom-right stepping stones → bridge → forest → golden summit.
const ROAD_CENTER_LANDSCAPE: [number, number][] = [
  [0.74, 0.88], // L1  — bottom-right stepping stones
  [0.6, 0.8], // L2  — first curve left, big mushroom area
  [0.46, 0.74], // L3  — lower mushrooms & wildflowers
  [0.34, 0.63], // L4  — approaching the stone bridge
  [0.42, 0.53], // L5  — bridge, centre crossing
  [0.54, 0.44], // L6  — past bridge, curving right
  [0.64, 0.34], // L7  — upper-right, through tall trees
  [0.54, 0.24], // L8  — curving back left, lantern trees
  [0.4, 0.16], // L9  — upper-left, into forest glow
  [0.52, 0.07], // L10 — BOSS: golden summit
  [0.45, 0.48], // L11 (World 2 — unused for W1)
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

/** Check URL for ?debug=1 to enable WYSIWYG coordinate editor */
const DEBUG_MODE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export class LevelSelect extends Container {
  onLevelChosen: ((levelId: number) => void) | null = null;
  private bgTextures: { landscape: Texture; portrait: Texture } | null = null;
  private worldMapTextures: { landscape: Texture; portrait: Texture }[] = [];
  private currentWorld = 0; // index into WORLDS array

  constructor(private player: PlayerState) {
    super();
    // Start on the highest unlocked world
    this.currentWorld = this.getHighestUnlockedWorld();
    this.build();
  }

  setBgTextures(textures: { landscape: Texture; portrait: Texture }): void {
    this.bgTextures = textures;
    this.removeChildren();
    this.build();
  }

  setWorldMapTextures(textures: { landscape: Texture; portrait: Texture }[]): void {
    this.worldMapTextures = textures;
    this.removeChildren();
    this.build();
  }

  refresh(): void {
    this.removeChildren();
    this.currentWorld = this.getHighestUnlockedWorld();
    this.build();
  }

  private getHighestUnlockedWorld(): number {
    for (let w = WORLDS.length - 1; w >= 0; w--) {
      if (this.player.isLevelUnlocked(WORLDS[w].levels[0])) return w;
    }
    return 0;
  }

  private build(): void {
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;
    const isPortrait = GameConfig.isPortrait;

    // Background — use per-world texture if available, else fallback
    const worldTex = this.worldMapTextures[this.currentWorld];
    const bgTex = worldTex
      ? isPortrait
        ? worldTex.portrait
        : worldTex.landscape
      : this.bgTextures
        ? isPortrait
          ? this.bgTextures.portrait
          : this.bgTextures.landscape
        : null;

    if (bgTex) {
      const bg = new Sprite(bgTex);
      const { x: bgX, y: bgY, w: bgW, h: bgH } = GameConfig.bgBounds;
      coverSprite(bg, bgX, bgY, bgW, bgH);
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
    const world = WORLDS[this.currentWorld];
    const worldColor = world.color;

    // For worlds 1-2 we have path coordinates; for worlds 3+ generate a grid layout
    const firstLevelId = world.levels[0];
    const lastLevelId = world.levels[1];
    const worldLevels = LevelConfigs.filter((l) => l.id >= firstLevelId && l.id <= lastLevelId);

    // Use hand-tuned path for world 1, generate zigzag for all others
    let path: [number, number][];
    if (this.currentWorld === 0) {
      const raw = isPortrait ? ROAD_CENTER_PORTRAIT : ROAD_CENTER_LANDSCAPE;
      path = offsetFromRoad(raw);
    } else {
      path = this.generateWorldPath(worldLevels.length, isPortrait);
    }

    this.drawPathLine(path, w, h);

    // World title
    const worldTitleStyle = tsWorldTitle.clone();
    worldTitleStyle.fill = worldColor;
    worldTitleStyle.fontSize = isPortrait ? 18 : 22;
    const titleLabel = new Text({ text: `World ${world.id}: ${world.name}`, style: worldTitleStyle });
    titleLabel.anchor.set(0.5, 0);
    titleLabel.x = w / 2;
    titleLabel.y = isPortrait ? h * 0.02 : h * 0.01;
    this.addChild(titleLabel);

    // Level nodes
    const nodeSize = isPortrait ? 40 : 44;
    const bossSize = isPortrait ? 50 : 54;

    for (let i = 0; i < worldLevels.length && i < path.length; i++) {
      const level = worldLevels[i];
      const [nx, ny] = path[i];
      const isBoss = (i + 1) % 10 === 0; // Last level of each world is boss
      const size = isBoss ? bossSize : nodeSize;
      const unlocked = this.player.isLevelUnlocked(level.id);
      const stars = this.player.getStars(level.id);

      const btn = new Container();
      btn.x = nx * w;
      btn.y = ny * h;

      const circle = new Graphics();
      const radius = size / 2;

      if (unlocked) {
        // Outer glow ring
        circle.circle(0, 0, radius + 7);
        circle.fill({ color: isBoss ? 0xf1c40f : worldColor, alpha: 0.18 });
        // Mid ring
        circle.circle(0, 0, radius + 3);
        circle.fill({ color: isBoss ? 0xf1c40f : worldColor, alpha: 0.3 });
        // Main fill
        circle.circle(0, 0, radius);
        circle.fill({ color: stars > 0 ? 0x1a0a40 : 0x0d0520, alpha: 0.92 });
        // Border
        circle.circle(0, 0, radius);
        circle.stroke({ color: isBoss ? 0xf1c40f : worldColor, width: isBoss ? 3.5 : 2.5, alpha: 1 });
      } else {
        // Locked — faded dark with subtle border
        circle.circle(0, 0, radius + 2);
        circle.fill({ color: 0x000000, alpha: 0.25 });
        circle.circle(0, 0, radius);
        circle.fill({ color: 0x111111, alpha: 0.75 });
        circle.stroke({ color: 0x444444, width: 1.5 });
      }
      btn.addChild(circle);

      if (unlocked) {
        const numText = new Text({
          text: String(level.id),
          style: isBoss ? tsLevelNumberBoss : tsLevelNumber,
        });
        numText.anchor.set(0.5);
        numText.y = stars > 0 ? -5 : 0;
        btn.addChild(numText);

        if (stars > 0) {
          const starsText = new Text({
            text: '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars),
            style: tsMapStars,
          });
          starsText.anchor.set(0.5);
          starsText.y = 9;
          btn.addChild(starsText);
        }
      } else {
        // Lock icon for locked levels
        const lockG = new Graphics();
        lockG.roundRect(-5, -2, 10, 8, 2);
        lockG.fill({ color: 0x444444, alpha: 0.9 });
        lockG.arc(0, -2, 4, Math.PI, 0);
        lockG.stroke({ color: 0x555555, width: 1.5 });
        btn.addChild(lockG);
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

    // World navigation arrows
    this.buildWorldNav(w, h, isPortrait);
  }

  /** Build prev/next world navigation buttons */
  private buildWorldNav(w: number, h: number, isPortrait: boolean): void {
    const btnSize = isPortrait ? 36 : 40;
    const y = isPortrait ? h * 0.95 : h * 0.96;

    // Previous world
    if (this.currentWorld > 0) {
      const prevBtn = new Container();
      prevBtn.x = w * 0.15;
      prevBtn.y = y;
      const bg = new Graphics();
      bg.roundRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 8);
      bg.fill({ color: 0x2d1b69, alpha: 0.85 });
      bg.stroke({ color: 0x9b59b6, width: 2 });
      prevBtn.addChild(bg);
      // Arrow left
      const arrow = new Graphics();
      arrow.moveTo(6, 0);
      arrow.lineTo(-6, 0);
      arrow.moveTo(-3, -5);
      arrow.lineTo(-8, 0);
      arrow.lineTo(-3, 5);
      arrow.stroke({ color: 0xffffff, width: 2.5 });
      prevBtn.addChild(arrow);
      prevBtn.eventMode = 'static';
      prevBtn.cursor = 'pointer';
      prevBtn.on('pointerdown', () => {
        this.currentWorld--;
        this.removeChildren();
        this.build();
      });
      this.addChild(prevBtn);

      // Previous world name
      const prevName = new Text({ text: WORLDS[this.currentWorld - 1].name, style: tsWorldNav });
      prevName.anchor.set(0.5);
      prevName.x = prevBtn.x;
      prevName.y = y - btnSize / 2 - 8;
      this.addChild(prevName);
    }

    // Next world (only if first level is unlocked or any level in that world is)
    if (this.currentWorld < WORLDS.length - 1) {
      const nextWorldFirst = WORLDS[this.currentWorld + 1].levels[0];
      const nextUnlocked = this.player.isLevelUnlocked(nextWorldFirst);

      const nextBtn = new Container();
      nextBtn.x = w * 0.85;
      nextBtn.y = y;
      const bg = new Graphics();
      bg.roundRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 8);
      bg.fill({ color: nextUnlocked ? 0x2d1b69 : 0x111111, alpha: 0.85 });
      bg.stroke({ color: nextUnlocked ? 0x9b59b6 : 0x333333, width: 2 });
      nextBtn.addChild(bg);
      // Arrow right
      const arrow = new Graphics();
      arrow.moveTo(-6, 0);
      arrow.lineTo(6, 0);
      arrow.moveTo(3, -5);
      arrow.lineTo(8, 0);
      arrow.lineTo(3, 5);
      arrow.stroke({ color: nextUnlocked ? 0xffffff : 0x555555, width: 2.5 });
      nextBtn.addChild(arrow);

      if (nextUnlocked) {
        nextBtn.eventMode = 'static';
        nextBtn.cursor = 'pointer';
        nextBtn.on('pointerdown', () => {
          this.currentWorld++;
          this.removeChildren();
          this.build();
        });
      }
      this.addChild(nextBtn);

      // Next world name
      const nextNameStyle = tsWorldNav.clone();
      nextNameStyle.fill = nextUnlocked ? 0xb0a0c0 : 0x555555;
      const nextName = new Text({ text: WORLDS[this.currentWorld + 1].name, style: nextNameStyle });
      nextName.anchor.set(0.5);
      nextName.x = nextBtn.x;
      nextName.y = y - btnSize / 2 - 8;
      this.addChild(nextName);
    }

    // World indicator dots
    const dotY = y + (isPortrait ? 0 : -4);
    const totalDotsW = WORLDS.length * 14;
    const dotStartX = (w - totalDotsW) / 2;
    for (let i = 0; i < WORLDS.length; i++) {
      const dot = new Graphics();
      const isCurrent = i === this.currentWorld;
      const isUnlocked = this.player.isLevelUnlocked(WORLDS[i].levels[0]);
      dot.circle(dotStartX + i * 14 + 4, dotY, isCurrent ? 5 : 3);
      dot.fill({ color: isCurrent ? WORLDS[i].color : isUnlocked ? 0x888888 : 0x333333, alpha: isCurrent ? 1 : 0.6 });
      this.addChild(dot);
    }
  }

  /**
   * Generate a zigzag path for worlds that don't have hand-tuned coordinates.
   * Pattern: left, right, left, right... descending vertically.
   * Uses deterministic offsets (seeded from level index) for subtle variation.
   */
  private generateWorldPath(count: number, isPortrait: boolean): [number, number][] {
    const path: [number, number][] = [];
    const xLeft = isPortrait ? 0.28 : 0.3;
    const xRight = isPortrait ? 0.72 : 0.7;
    const yStart = isPortrait ? 0.08 : 0.08;
    const yEnd = isPortrait ? 0.86 : 0.86;

    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      // Small deterministic x wobble so it doesn't look perfectly aligned
      const wobble = ((i * 7 + 3) % 11) / 110 - 0.05; // range ~[-0.05, +0.05]
      const x = (isLeft ? xLeft : xRight) + wobble;
      const y = yStart + (i / Math.max(count - 1, 1)) * (yEnd - yStart);
      path.push([x, y]);
    }
    return path;
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

    const points = path.map(([nx, ny]) => ({ x: nx * w, y: ny * h }));

    // Shadow layer — thick soft glow under the path
    const shadow = new Graphics();
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      shadow.moveTo(from.x, from.y);
      shadow.lineTo(to.x, to.y);
    }
    shadow.stroke({ color: 0x000000, width: 8, alpha: 0.25 });
    this.addChild(shadow);

    // Main solid path line
    const solid = new Graphics();
    for (let i = 0; i < points.length - 1; i++) {
      solid.moveTo(points[i].x, points[i].y);
      solid.lineTo(points[i + 1].x, points[i + 1].y);
    }
    solid.stroke({ color: 0x8b6914, width: 4, alpha: 0.5 });
    this.addChild(solid);

    // Bright dotted highlight on top
    const dots = new Graphics();
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = 10;
      const count = Math.floor(dist / step);
      for (let s = 0; s <= count; s++) {
        const t = s / count;
        dots.circle(from.x + dx * t, from.y + dy * t, 2.5);
      }
    }
    dots.fill({ color: 0xf5d060, alpha: 0.8 });
    this.addChild(dots);
  }
}
