import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';

/**
 * Enhanced confetti, floating scores, win lines, screen flash.
 */
export class MatchEffects extends Container {
  /** Spawn confetti particles at the given world positions */
  spawnConfetti(positions: { x: number; y: number }[], color: number): void {
    const colors = [color, 0xf1c40f, 0xe74c3c, 0x2ecc71, 0x3498db, 0xff69b4, 0xF5D060];
    for (const pos of positions) {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        const c = colors[Math.floor(Math.random() * colors.length)];
        const size = 3 + Math.random() * 6;
        const shapeRoll = Math.random();
        if (shapeRoll < 0.33) {
          p.rect(-size / 2, -size / 2, size, size);
        } else if (shapeRoll < 0.66) {
          p.circle(0, 0, size / 2);
        } else {
          // Triangle confetti
          p.moveTo(0, -size / 2);
          p.lineTo(size / 2, size / 2);
          p.lineTo(-size / 2, size / 2);
          p.closePath();
        }
        p.fill({ color: c });
        p.x = pos.x;
        p.y = pos.y;
        p.rotation = Math.random() * Math.PI * 2;
        this.addChild(p);

        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 100;
        const tx = pos.x + Math.cos(angle) * dist;
        const ty = pos.y + Math.sin(angle) * dist - 40;

        gsap.to(p, {
          x: tx,
          y: ty,
          alpha: 0,
          rotation: p.rotation + (Math.random() - 0.5) * 8,
          duration: 0.7 + Math.random() * 0.5,
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
        fontSize: 34,
        fill: color,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        stroke: { color: 0x000000, width: 4 },
        dropShadow: {
          color: 0x000000,
          distance: 2,
          alpha: 0.6,
        },
      }),
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y;
    text.alpha = 0;
    text.scale.set(0.5);
    this.addChild(text);

    // Pop in: scale 0.5 → 1.4 → 1.0
    const tl = gsap.timeline();
    tl.to(text, { alpha: 1, duration: 0.15 }, 0);
    tl.to(text.scale, { x: 1.4, y: 1.4, duration: 0.2, ease: 'back.out' }, 0);
    tl.to(text.scale, { x: 1.0, y: 1.0, duration: 0.15 }, 0.2);
    tl.to(text, { y: y - 80, duration: 0.8, ease: 'power2.out' }, 0);
    tl.to(text, { alpha: 0, duration: 0.4, ease: 'power2.in', onComplete: () => text.destroy() }, 0.6);
  }

  /** Show cascade multiplier burst with expanding ring */
  showCascadeBurst(x: number, y: number, multiplier: number): void {
    // Expanding ring
    const ring = new Graphics();
    ring.circle(0, 0, 20);
    ring.stroke({ color: 0xff5722, width: 3, alpha: 0.8 });
    ring.x = x;
    ring.y = y;
    this.addChild(ring);

    gsap.to(ring.scale, { x: 5, y: 5, duration: 0.5, ease: 'power2.out' });
    gsap.to(ring, { alpha: 0, duration: 0.5, ease: 'power2.out', onComplete: () => ring.destroy() });

    // Multiplier text
    const text = new Text({
      text: `x${multiplier}`,
      style: new TextStyle({
        fontSize: 40,
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

  /** Full-screen white flash on big wins */
  screenFlash(): void {
    const flash = new Graphics();
    flash.rect(-400, -400, 800, 800);
    flash.fill({ color: 0xffffff, alpha: 0.3 });
    this.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.4, ease: 'power2.out', onComplete: () => flash.destroy() });
  }

  /** Blast power-up activation: bright line sweep across row or column */
  showBlastEffect(positions: { x: number; y: number }[], isRow: boolean): void {
    if (positions.length === 0) return;
    const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;

    const line = new Graphics();
    if (isRow) {
      line.rect(-400, -3, 800, 6);
    } else {
      line.rect(-3, -350, 6, 700);
    }
    line.fill({ color: 0x00e5ff, alpha: 0.8 });
    line.x = cx;
    line.y = cy;
    line.scale.set(0, 1);
    this.addChild(line);

    const tl = gsap.timeline();
    tl.to(line.scale, { x: 1, duration: 0.25, ease: 'power3.out' }, 0);
    tl.to(line, { alpha: 0, duration: 0.3, delay: 0.15, onComplete: () => line.destroy() }, 0);
  }

  /** Bomb power-up activation: expanding ring from center */
  showBombEffect(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics();
      ring.circle(0, 0, 30);
      ring.stroke({ color: 0xff5722, width: 4, alpha: 0.8 });
      ring.x = x;
      ring.y = y;
      ring.scale.set(0.2);
      this.addChild(ring);

      gsap.to(ring.scale, { x: 3, y: 3, duration: 0.4, delay: i * 0.08, ease: 'power2.out' });
      gsap.to(ring, { alpha: 0, duration: 0.4, delay: i * 0.08 + 0.1, onComplete: () => ring.destroy() });
    }
    // Flash
    const flash = new Graphics();
    flash.circle(x, y, 60);
    flash.fill({ color: 0xff5722, alpha: 0.4 });
    this.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.3, onComplete: () => flash.destroy() });
  }

  /** Rainbow power-up activation: all matching symbols pulse before clearing */
  showRainbowEffect(positions: { x: number; y: number }[]): void {
    for (const pos of positions) {
      const star = new Graphics();
      star.circle(0, 0, 15);
      star.fill({ color: 0xffd700, alpha: 0.9 });
      star.x = pos.x;
      star.y = pos.y;
      star.scale.set(0);
      this.addChild(star);

      gsap.to(star.scale, { x: 2.5, y: 2.5, duration: 0.3, ease: 'back.out' });
      gsap.to(star, { alpha: 0, duration: 0.4, delay: 0.2, onComplete: () => star.destroy() });
    }
  }

  /** Draw a glowing win line through matched cell centers */
  drawWinLine(positions: { x: number; y: number }[], color: number): void {
    if (positions.length < 2) return;

    // Glow layer (thick line)
    const glow = new Graphics();
    glow.moveTo(positions[0].x, positions[0].y);
    for (let i = 1; i < positions.length; i++) {
      glow.lineTo(positions[i].x, positions[i].y);
    }
    glow.stroke({ color, width: 8, alpha: 0.4 });
    this.addChild(glow);

    // Bright core line
    const line = new Graphics();
    line.moveTo(positions[0].x, positions[0].y);
    for (let i = 1; i < positions.length; i++) {
      line.lineTo(positions[i].x, positions[i].y);
    }
    line.stroke({ color: 0xffffff, width: 3, alpha: 0.9 });
    this.addChild(line);

    // Fade and remove
    gsap.to(glow, { alpha: 0, duration: 0.8, delay: 0.3, onComplete: () => glow.destroy() });
    gsap.to(line, { alpha: 0, duration: 0.8, delay: 0.3, onComplete: () => line.destroy() });
  }
}
