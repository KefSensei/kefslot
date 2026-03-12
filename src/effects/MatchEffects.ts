import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';

/**
 * Confetti + floating score numbers when matches happen.
 */
export class MatchEffects extends Container {
  /** Spawn confetti particles at the given world positions */
  spawnConfetti(positions: { x: number; y: number }[], color: number): void {
    const colors = [color, 0xf1c40f, 0xe74c3c, 0x2ecc71, 0x3498db, 0xff69b4];
    for (const pos of positions) {
      const count = 6;
      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        const c = colors[Math.floor(Math.random() * colors.length)];
        const size = 3 + Math.random() * 5;
        if (Math.random() < 0.5) {
          p.rect(-size / 2, -size / 2, size, size);
        } else {
          p.circle(0, 0, size / 2);
        }
        p.fill({ color: c });
        p.x = pos.x;
        p.y = pos.y;
        p.rotation = Math.random() * Math.PI * 2;
        this.addChild(p);

        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 80;
        const tx = pos.x + Math.cos(angle) * dist;
        const ty = pos.y + Math.sin(angle) * dist - 30;

        gsap.to(p, {
          x: tx,
          y: ty,
          alpha: 0,
          rotation: p.rotation + (Math.random() - 0.5) * 6,
          duration: 0.6 + Math.random() * 0.4,
          ease: 'power2.out',
          onComplete: () => {
            p.destroy();
          },
        });
        gsap.to(p.scale, {
          x: 0,
          y: 0,
          duration: 0.5 + Math.random() * 0.3,
          delay: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }

  /** Show a floating score number rising from a position */
  showFloatingScore(x: number, y: number, score: number, color = 0xf1c40f): void {
    const text = new Text({
      text: `+${score}`,
      style: new TextStyle({
        fontSize: 28,
        fill: color,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        stroke: { color: 0x000000, width: 3 },
        dropShadow: {
          color: 0x000000,
          distance: 2,
          alpha: 0.5,
        },
      }),
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y;
    text.alpha = 0;
    this.addChild(text);

    gsap.to(text, {
      y: y - 60,
      alpha: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
    gsap.to(text.scale, {
      x: 1.3,
      y: 1.3,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
    });
    gsap.to(text, {
      y: y - 120,
      alpha: 0,
      duration: 0.5,
      delay: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  /** Show cascade multiplier burst */
  showCascadeBurst(x: number, y: number, multiplier: number): void {
    const text = new Text({
      text: `x${multiplier}`,
      style: new TextStyle({
        fontSize: 36,
        fill: 0xff5722,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        stroke: { color: 0xffffff, width: 4 },
      }),
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y;
    text.scale.set(0);
    this.addChild(text);

    gsap.to(text.scale, {
      x: 1.5,
      y: 1.5,
      duration: 0.3,
      ease: 'back.out',
    });
    gsap.to(text, {
      alpha: 0,
      y: y - 40,
      duration: 0.4,
      delay: 0.6,
      ease: 'power2.in',
      onComplete: () => {
        text.destroy();
      },
    });
  }
}
