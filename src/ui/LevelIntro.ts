import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { LevelIntroDef } from '@/models/Level';
import gsap from 'gsap';

export class LevelIntro extends Container {
  private panel = new Container();

  private overlay: Graphics | null = null;

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
    this.panel.x = w / 2;
    this.panel.y = h / 2;
  }

  /** Show the intro overlay. Returns a promise that resolves when the player clicks "Let's Go!" */
  show(intro: LevelIntroDef): Promise<void> {
    return new Promise((resolve) => {
      this.removeChildren();
      this.visible = true;

      // Overlay backdrop
      this.overlay = new Graphics();
      this.overlay.rect(0, 0, GameConfig.activeWidth, GameConfig.activeHeight);
      this.overlay.fill({ color: 0x000000, alpha: 0.7 });
      this.overlay.eventMode = 'static'; // block clicks behind
      this.addChild(this.overlay);

      // Panel
      this.panel = new Container();
      this.panel.x = GameConfig.activeWidth / 2;
      this.panel.y = GameConfig.activeHeight / 2;
      this.addChild(this.panel);

      const panelBg = new Graphics();
      panelBg.roundRect(-200, -120, 400, 240, 20);
      panelBg.fill({ color: 0x1e0a3a });
      panelBg.stroke({ color: 0xf1c40f, width: 3 });
      this.panel.addChild(panelBg);

      // Title
      const title = new Text({
        text: intro.title,
        style: new TextStyle({
          fontSize: 26,
          fill: 0xf1c40f,
          fontWeight: 'bold',
          fontFamily: 'Segoe UI, sans-serif',
        }),
      });
      title.anchor.set(0.5);
      title.y = -70;
      this.panel.addChild(title);

      // Description (word-wrapped)
      const desc = new Text({
        text: intro.description,
        style: new TextStyle({
          fontSize: 16,
          fill: 0xd0c0e8,
          fontFamily: 'Segoe UI, sans-serif',
          wordWrap: true,
          wordWrapWidth: 320,
          align: 'center',
          lineHeight: 22,
        }),
      });
      desc.anchor.set(0.5);
      desc.y = -5;
      this.panel.addChild(desc);

      // "Let's Go!" button
      const btnContainer = new Container();
      btnContainer.y = 75;
      const btnBg = new Graphics();
      btnBg.roundRect(-80, -22, 160, 44, 22);
      btnBg.fill({ color: 0x9b59b6 });
      btnBg.stroke({ color: 0xf1c40f, width: 2 });
      btnContainer.addChild(btnBg);

      const btnText = new Text({
        text: "Let's Go!",
        style: new TextStyle({
          fontSize: 20,
          fill: 0xffffff,
          fontWeight: 'bold',
          fontFamily: 'Segoe UI, sans-serif',
        }),
      });
      btnText.anchor.set(0.5);
      btnContainer.addChild(btnText);

      btnContainer.eventMode = 'static';
      btnContainer.cursor = 'pointer';
      btnContainer.on('pointerdown', () => {
        // Animate out
        const tl = gsap.timeline();
        tl.to(this.panel.scale, { x: 0, y: 0, duration: 0.25, ease: 'back.in' }, 0);
        tl.to(this.overlay!, { alpha: 0, duration: 0.25 }, 0);
        tl.then().then(() => {
          this.visible = false;
          resolve();
        });
      });
      this.panel.addChild(btnContainer);

      // Animate in
      this.panel.scale.set(0);
      gsap.to(this.panel.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out' });
    });
  }
}
