import { Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { LevelConfigs } from '@/config/LevelConfig';
import { PlayerState } from '@/models/PlayerState';

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

      // Dark overlay for button readability
      const overlay = new Graphics();
      overlay.rect(0, 0, w, h);
      overlay.fill({ color: 0x0a0018, alpha: 0.35 });
      this.addChild(overlay);
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, w, h);
      bg.fill({ color: 0x1a0a2e });
      this.addChild(bg);
    }

    // Title
    const title = new Text({
      text: "Roxy's Adventures",
      style: new TextStyle({
        fontSize: 32,
        fill: 0xf1c40f,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 },
      }),
    });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = 16;
    this.addChild(title);

    // Group levels by world
    const worldNames: Record<number, string> = { 1: 'Enchanted Meadow', 2: 'Crystal Caverns' };
    const worlds = new Map<number, typeof LevelConfigs>();
    for (const level of LevelConfigs) {
      if (!worlds.has(level.world)) worlds.set(level.world, []);
      worlds.get(level.world)!.push(level);
    }

    const cols = 5;
    const btnSize = 72;
    const gap = 14;
    const gridWidth = cols * (btnSize + gap) - gap;
    const startX = (w - gridWidth) / 2;
    let cursorY = 62; // vertical cursor for layout

    for (const [worldId, levels] of worlds) {
      // World header with shadow for readability over background art
      const worldLabel = new Text({
        text: `World ${worldId}: ${worldNames[worldId] ?? ''}`,
        style: new TextStyle({
          fontSize: 18,
          fill: 0xF5D060,
          fontWeight: 'bold',
          fontFamily: 'Segoe UI, sans-serif',
          letterSpacing: 2,
          dropShadow: { color: 0x000000, distance: 1, alpha: 0.8 },
        }),
      });
      worldLabel.x = startX;
      worldLabel.y = cursorY;
      this.addChild(worldLabel);

      // Subtle divider line under header
      const divider = new Graphics();
      divider.moveTo(startX, cursorY + 24);
      divider.lineTo(startX + gridWidth, cursorY + 24);
      divider.stroke({ color: 0xF5D060, width: 1, alpha: 0.3 });
      this.addChild(divider);

      cursorY += 32; // space after header

      // Layout level buttons in rows of 5
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * (btnSize + gap);
        const y = cursorY + row * (btnSize + gap);

        const unlocked = this.player.isLevelUnlocked(level.id);
        const stars = this.player.getStars(level.id);

        const btn = new Container();
        btn.x = x;
        btn.y = y;

        // Button background — semi-transparent so map shows through
        const btnBg = new Graphics();
        btnBg.roundRect(0, 0, btnSize, btnSize, 10);
        if (unlocked) {
          btnBg.fill({ color: stars > 0 ? 0x2d1b69 : 0x1e0a3a, alpha: 0.85 });
          btnBg.stroke({ color: 0x9b59b6, width: 2 });
        } else {
          btnBg.fill({ color: 0x111111, alpha: 0.6 });
          btnBg.stroke({ color: 0x333333, width: 1 });
        }
        btn.addChild(btnBg);

        // Level number
        const numText = new Text({
          text: String(level.id),
          style: new TextStyle({
            fontSize: 20,
            fill: unlocked ? 0xffffff : 0x555555,
            fontWeight: 'bold',
            fontFamily: 'Segoe UI, sans-serif',
          }),
        });
        numText.anchor.set(0.5);
        numText.x = btnSize / 2;
        numText.y = btnSize / 2 - 6;
        btn.addChild(numText);

        // Stars
        if (stars > 0) {
          const starsText = new Text({
            text: '★'.repeat(stars) + '☆'.repeat(3 - stars),
            style: new TextStyle({ fontSize: 11, fill: 0xf1c40f, fontFamily: 'Segoe UI, sans-serif' }),
          });
          starsText.anchor.set(0.5);
          starsText.x = btnSize / 2;
          starsText.y = btnSize - 12;
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

      // Advance cursor past this world's rows + spacing before next world
      const rowCount = Math.ceil(levels.length / cols);
      cursorY += rowCount * (btnSize + gap) + 16;
    }
  }
}
