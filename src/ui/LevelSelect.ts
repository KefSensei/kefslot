import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { LevelConfigs } from '@/config/LevelConfig';
import { PlayerState } from '@/models/PlayerState';

export class LevelSelect extends Container {
  onLevelChosen: ((levelId: number) => void) | null = null;

  constructor(private player: PlayerState) {
    super();
    this.build();
  }

  refresh(): void {
    this.removeChildren();
    this.build();
  }

  private build(): void {
    // Background
    const bg = new Graphics();
    bg.rect(0, 0, GameConfig.width, GameConfig.height);
    bg.fill({ color: 0x1a0a2e });
    this.addChild(bg);

    // Title
    const title = new Text({
      text: "Roxy's Adventures",
      style: new TextStyle({
        fontSize: 32,
        fill: 0xf1c40f,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
      }),
    });
    title.anchor.set(0.5, 0);
    title.x = GameConfig.width / 2;
    title.y = 20;
    this.addChild(title);

    // Level buttons in a grid
    const cols = 5;
    const btnSize = 80;
    const gap = 16;
    const startX = (GameConfig.width - cols * (btnSize + gap) + gap) / 2;
    const startY = 80;

    let currentWorld = 0;

    for (let i = 0; i < LevelConfigs.length; i++) {
      const level = LevelConfigs[i];

      // World header
      if (level.world !== currentWorld) {
        currentWorld = level.world;
        const worldNames = ['', 'Enchanted Meadow', 'Crystal Caverns'];
        const worldLabel = new Text({
          text: `World ${level.world}: ${worldNames[level.world]}`,
          style: new TextStyle({ fontSize: 16, fill: 0xb0a0c0, fontFamily: 'Segoe UI, sans-serif' }),
        });
        worldLabel.x = startX;
        worldLabel.y = startY + Math.floor(i / cols) * (btnSize + gap) - 22;
        this.addChild(worldLabel);
      }

      const row = Math.floor(i / cols) + (level.world - 1); // offset for world headers
      const col = i % cols;
      const x = startX + col * (btnSize + gap);
      const y = startY + row * (btnSize + gap) + (level.world - 1) * 20;

      const unlocked = this.player.isLevelUnlocked(level.id);
      const stars = this.player.getStars(level.id);

      const btn = new Container();
      btn.x = x;
      btn.y = y;

      // Button background
      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, btnSize, btnSize, 10);
      if (unlocked) {
        btnBg.fill({ color: stars > 0 ? 0x2d1b69 : 0x1e0a3a });
        btnBg.stroke({ color: 0x9b59b6, width: 2 });
      } else {
        btnBg.fill({ color: 0x111111, alpha: 0.5 });
        btnBg.stroke({ color: 0x333333, width: 1 });
      }
      btn.addChild(btnBg);

      // Level number
      const numText = new Text({
        text: String(level.id),
        style: new TextStyle({
          fontSize: 22,
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
          style: new TextStyle({ fontSize: 12, fill: 0xf1c40f, fontFamily: 'Segoe UI, sans-serif' }),
        });
        starsText.anchor.set(0.5);
        starsText.x = btnSize / 2;
        starsText.y = btnSize - 14;
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
}
