import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import gsap from 'gsap';

export class LevelComplete extends Container {
  onContinue: (() => void) | null = null;
  private overlay: Graphics | null = null;
  private panel: Container | null = null;

  constructor() {
    super();
    this.visible = false;
  }

  /** Reposition overlay and panel for new active canvas dimensions */
  relayout(w: number, h: number): void {
    if (this.overlay) {
      this.overlay.clear();
      this.overlay.rect(0, 0, w, h);
      this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    }
    if (this.panel) {
      this.panel.x = w / 2;
      this.panel.y = h / 2;
    }
  }

  show(data: { levelId: number; score: number; stars: number; coinsEarned: number; passed: boolean }): void {
    this.removeChildren();
    this.visible = true;

    // Overlay
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, GameConfig.activeWidth, GameConfig.activeHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.overlay.eventMode = 'static'; // block clicks behind
    this.addChild(this.overlay);

    // Panel
    const panel = new Container();
    this.panel = panel;
    panel.x = GameConfig.activeWidth / 2;
    panel.y = GameConfig.activeHeight / 2;
    this.addChild(panel);

    const panelBg = new Graphics();
    panelBg.roundRect(-180, -140, 360, 280, 20);
    panelBg.fill({ color: 0x1e0a3a });
    panelBg.stroke({ color: data.passed ? 0xf1c40f : 0xe74c3c, width: 3 });
    panel.addChild(panelBg);

    // Title
    const title = new Text({
      text: data.passed ? 'Level Complete!' : 'Try Again!',
      style: new TextStyle({
        fontSize: 28,
        fill: data.passed ? 0xf1c40f : 0xe74c3c,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
      }),
    });
    title.anchor.set(0.5);
    title.y = -100;
    panel.addChild(title);

    // Stars
    if (data.passed) {
      const starsText = new Text({
        text: '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars),
        style: new TextStyle({ fontSize: 36, fill: 0xf1c40f }),
      });
      starsText.anchor.set(0.5);
      starsText.y = -55;
      panel.addChild(starsText);
    }

    // Score
    const scoreText = new Text({
      text: `Score: ${data.score.toLocaleString()}`,
      style: new TextStyle({ fontSize: 22, fill: 0xffffff, fontFamily: 'Segoe UI, sans-serif' }),
    });
    scoreText.anchor.set(0.5);
    scoreText.y = -10;
    panel.addChild(scoreText);

    // Coins
    if (data.coinsEarned > 0) {
      const coinsText = new Text({
        text: `+${data.coinsEarned} coins`,
        style: new TextStyle({ fontSize: 18, fill: 0xf39c12, fontFamily: 'Segoe UI, sans-serif' }),
      });
      coinsText.anchor.set(0.5);
      coinsText.y = 25;
      panel.addChild(coinsText);
    }

    // Continue button
    const btnContainer = new Container();
    btnContainer.y = 85;
    const btnBg = new Graphics();
    btnBg.roundRect(-70, -20, 140, 40, 20);
    btnBg.fill({ color: 0x9b59b6 });
    btnBg.stroke({ color: 0xf1c40f, width: 2 });
    btnContainer.addChild(btnBg);

    const btnText = new Text({
      text: data.passed ? 'Continue' : 'Retry',
      style: new TextStyle({ fontSize: 18, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'Segoe UI, sans-serif' }),
    });
    btnText.anchor.set(0.5);
    btnContainer.addChild(btnText);

    btnContainer.eventMode = 'static';
    btnContainer.cursor = 'pointer';
    btnContainer.on('pointerdown', () => {
      this.visible = false;
      this.onContinue?.();
    });
    panel.addChild(btnContainer);

    // Animate in
    panel.scale.set(0);
    gsap.to(panel.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out' });
  }
}
