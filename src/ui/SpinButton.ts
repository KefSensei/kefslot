import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import gsap from 'gsap';

export class SpinButton extends Container {
  private bg: Graphics;
  private btnLabel: Text;
  private _enabled = true;

  onSpin: (() => void) | null = null;

  constructor() {
    super();

    this.bg = new Graphics();
    this.drawButton(0x9b59b6);
    this.addChild(this.bg);

    this.btnLabel = new Text({
      text: 'SPIN',
      style: new TextStyle({
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        letterSpacing: 4,
      }),
    });
    this.btnLabel.anchor.set(0.5);
    this.addChild(this.btnLabel);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-80, -28, 160, 56);

    this.on('pointerdown', () => {
      // console.log('SpinButton pointerdown');
      if (this._enabled && this.onSpin) {
        gsap.to(this.scale, { x: 0.9, y: 0.9, duration: 0.1, yoyo: true, repeat: 1 });
        this.onSpin();
      }
    });

    this.on('pointerover', () => {
      if (this._enabled) {
        this.drawButton(0xb06fd0);
      }
    });

    this.on('pointerout', () => {
      this.drawButton(this._enabled ? 0x9b59b6 : 0x555555);
    });
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.cursor = enabled ? 'pointer' : 'default';
    this.drawButton(enabled ? 0x9b59b6 : 0x555555);
    this.btnLabel.alpha = enabled ? 1 : 0.5;
  }

  setText(text: string): void {
    this.btnLabel.text = text;
  }

  private drawButton(color: number): void {
    this.bg.clear();
    this.bg.roundRect(-80, -28, 160, 56, 28);
    this.bg.fill({ color });
    this.bg.stroke({ color: 0xf1c40f, width: 3 });
  }
}
