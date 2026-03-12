import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import gsap from 'gsap';

export class SpinButton extends Container {
  private bg: Graphics;
  private shadow: Graphics;
  private glowRing: Graphics;
  private gloss: Graphics;
  private btnLabel: Text;
  private _enabled = true;

  onSpin: (() => void) | null = null;

  constructor() {
    super();

    // Drop shadow
    this.shadow = new Graphics();
    this.shadow.roundRect(-80, -25, 160, 56, 28);
    this.shadow.fill({ color: 0x000000, alpha: 0.35 });
    this.addChild(this.shadow);

    // Glow ring (behind button, visible when enabled)
    this.glowRing = new Graphics();
    this.glowRing.roundRect(-88, -33, 176, 66, 33);
    this.glowRing.fill({ color: 0xF5D060, alpha: 0.25 });
    this.addChildAt(this.glowRing, 0);

    // Main body
    this.bg = new Graphics();
    this.drawButton(0x9b59b6);
    this.addChild(this.bg);

    // Gloss highlight (top half)
    this.gloss = new Graphics();
    this.gloss.roundRect(-76, -26, 152, 24, 14);
    this.gloss.fill({ color: 0xffffff, alpha: 0.12 });
    this.addChild(this.gloss);

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
      if (this._enabled && this.onSpin) {
        // 3-step press: shrink → overshoot → settle
        const tl = gsap.timeline();
        tl.to(this.scale, { x: 0.88, y: 0.88, duration: 0.08, ease: 'power2.in' });
        tl.to(this.scale, { x: 1.06, y: 1.06, duration: 0.12, ease: 'back.out' });
        tl.to(this.scale, { x: 1, y: 1, duration: 0.1 });
        this.onSpin();
      }
    });

    this.on('pointerover', () => {
      if (this._enabled) {
        this.drawButton(0xb06fd0);
        gsap.to(this.glowRing, { alpha: 0.4, duration: 0.2 });
      }
    });

    this.on('pointerout', () => {
      this.drawButton(this._enabled ? 0x9b59b6 : 0x555555);
      gsap.to(this.glowRing, { alpha: this._enabled ? 0.25 : 0, duration: 0.2 });
    });

    // Idle glow pulse
    gsap.to(this.glowRing, {
      alpha: 0.35,
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.cursor = enabled ? 'pointer' : 'default';
    this.drawButton(enabled ? 0x9b59b6 : 0x555555);
    this.btnLabel.alpha = enabled ? 1 : 0.5;
    this.glowRing.visible = enabled;
    this.gloss.alpha = enabled ? 0.12 : 0.04;
  }

  setText(text: string): void {
    this.btnLabel.text = text;
  }

  /** Attention-grabbing animation to prompt the player to press SPIN */
  playAttention(): void {
    const tl = gsap.timeline();
    tl.to(this.scale, { x: 1.15, y: 1.15, duration: 0.25, ease: 'back.out' });
    tl.to(this.scale, { x: 1.0, y: 1.0, duration: 0.2, ease: 'power2.inOut' });
    tl.to(this.scale, { x: 1.1, y: 1.1, duration: 0.2, ease: 'back.out' });
    tl.to(this.scale, { x: 1.0, y: 1.0, duration: 0.15 });
    // Bright glow flash
    gsap.to(this.glowRing, { alpha: 0.7, duration: 0.3, yoyo: true, repeat: 2, ease: 'sine.inOut' });
  }

  private drawButton(color: number): void {
    this.bg.clear();
    this.bg.roundRect(-80, -28, 160, 56, 28);
    this.bg.fill({ color });
    this.bg.stroke({ color: 0xF5D060, width: 3 });
  }
}
