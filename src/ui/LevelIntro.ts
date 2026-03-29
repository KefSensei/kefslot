import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import { LevelIntroDef } from '@/models/Level';
import gsap from 'gsap';
import scrollPanelUrl from '@/assets/sprites/ui-panel-scroll.png';

let texScroll: Texture | null = null;

// Panel display size — matches new 420x560 scroll asset (3:4 ratio)
const PW = 400;
const PH = 533; // 400 * (560/420)

// Inner parchment safe zone within the gold roller frame
// Top roller ~22% of PH, bottom roller+candle ~18%  → parchment from ~117 to 436
const INNER_W = 230;
const TITLE_Y = -128; // just below top roller
const DESC_Y = 10; // centre of parchment
const BTN_Y = 155; // bottom of parchment, above candle

export class LevelIntro extends Container {
  private panel = new Container();

  static async preload(): Promise<void> {
    texScroll = await Assets.load<Texture>(scrollPanelUrl);
  }

  constructor() {
    super();
    this.visible = false;
  }

  relayout(w: number, h: number): void {
    this.panel.x = w / 2;
    this.panel.y = h / 2;
  }

  show(intro: LevelIntroDef): Promise<void> {
    return new Promise((resolve) => {
      this.removeChildren();
      this.visible = true;

      const w = GameConfig.activeWidth;
      const h = GameConfig.activeHeight;

      // No overlay — the game scene shows through transparently
      this.panel = new Container();
      this.panel.x = w / 2;
      this.panel.y = h / 2;
      this.addChild(this.panel);

      // Scroll art — transparent outside the scroll shape
      if (texScroll) {
        const bg = new Sprite(texScroll);
        bg.width = PW;
        bg.height = PH;
        bg.anchor.set(0.5);
        this.panel.addChild(bg);
      } else {
        // Fallback — parchment-coloured rect
        const bg = new Graphics();
        bg.roundRect(-PW / 2, -PH / 2, PW, PH, 20);
        bg.fill({ color: 0xf2e4c4 });
        bg.stroke({ color: 0x8b6914, width: 3 });
        this.panel.addChild(bg);
      }

      // ── Title ──────────────────────────────────────────────
      const title = new Text({
        text: intro.title,
        style: new TextStyle({
          fontSize: 22,
          fill: 0x2a1005,
          fontWeight: 'bold',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          align: 'center',
          wordWrap: true,
          wordWrapWidth: INNER_W,
          dropShadow: {
            color: 0xfdf0c0,
            distance: 0,
            blur: 4,
            alpha: 0.5,
          },
        }),
      });
      title.anchor.set(0.5);
      title.y = TITLE_Y;
      this.panel.addChild(title);

      // Thin ink divider under title
      const divider = new Graphics();
      divider.moveTo(-INNER_W / 2, 0);
      divider.lineTo(INNER_W / 2, 0);
      divider.stroke({ color: 0x5a3010, width: 1, alpha: 0.35 });
      divider.y = TITLE_Y + 18;
      this.panel.addChild(divider);

      // ── Description ───────────────────────────────────────
      const desc = new Text({
        text: intro.description,
        style: new TextStyle({
          fontSize: 15,
          fill: 0x3a2008,
          fontFamily: 'Georgia, "Times New Roman", serif',
          wordWrap: true,
          wordWrapWidth: INNER_W,
          align: 'center',
          lineHeight: 22,
        }),
      });
      desc.anchor.set(0.5);
      desc.y = DESC_Y;
      this.panel.addChild(desc);

      // ── "Let's Go!" — carved wood / inkwell button ────────
      const btnContainer = new Container();
      btnContainer.y = BTN_Y;

      const btnW = 148,
        btnH = 40;

      const btnBg = new Graphics();
      btnBg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      btnBg.fill({ color: 0x5c2800 }); // deep sienna — matches scroll wood
      btnBg.stroke({ color: 0xd4a520, width: 2 }); // antique gold border
      btnContainer.addChild(btnBg);

      // Warm inner highlight
      const sheen = new Graphics();
      sheen.roundRect(-btnW / 2 + 3, -btnH / 2 + 3, btnW - 6, btnH / 2 - 3, 5);
      sheen.fill({ color: 0xffffff, alpha: 0.08 });
      btnContainer.addChild(sheen);

      const btnText = new Text({
        text: "Let's Go!",
        style: new TextStyle({
          fontSize: 17,
          fill: 0xfdf0c0, // warm cream
          fontWeight: 'bold',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          letterSpacing: 1,
        }),
      });
      btnText.anchor.set(0.5);
      btnContainer.addChild(btnText);

      btnContainer.eventMode = 'static';
      btnContainer.cursor = 'pointer';
      btnContainer.on('pointerover', () => gsap.to(btnContainer.scale, { x: 1.07, y: 1.07, duration: 0.15 }));
      btnContainer.on('pointerout', () => gsap.to(btnContainer.scale, { x: 1, y: 1, duration: 0.15 }));
      btnContainer.on('pointerdown', () => {
        const tl = gsap.timeline();
        tl.to(this.panel.scale, { x: 0, y: 0, duration: 0.25, ease: 'back.in' }, 0);
        tl.then().then(() => {
          this.visible = false;
          resolve();
        });
      });
      this.panel.addChild(btnContainer);

      // ── Animate in ────────────────────────────────────────
      this.panel.scale.set(0);
      gsap.to(this.panel.scale, { x: 1, y: 1, duration: 0.45, ease: 'back.out(1.4)' });
    });
  }
}
