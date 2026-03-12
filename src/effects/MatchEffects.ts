import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';

/**
 * Enhanced confetti, floating scores, win lines, screen flash, power-up effects.
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

  /** Screen shake — temporarily jolts the parent container */
  screenShake(intensity = 6, duration = 0.35): void {
    const target = this.parent;
    if (!target) return;
    const origX = target.x;
    const origY = target.y;
    const tl = gsap.timeline();
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const decay = 1 - i / steps;
      const dx = (Math.random() - 0.5) * 2 * intensity * decay;
      const dy = (Math.random() - 0.5) * 2 * intensity * decay;
      tl.to(target, { x: origX + dx, y: origY + dy, duration: duration / steps, ease: 'none' });
    }
    tl.to(target, { x: origX, y: origY, duration: 0.05 });
  }

  /** Spawn directional particles along a line */
  private spawnLineParticles(
    positions: { x: number; y: number }[],
    color: number,
    count: number,
    spread: number,
  ): void {
    for (const pos of positions) {
      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        const size = 2 + Math.random() * 4;
        p.circle(0, 0, size);
        p.fill({ color, alpha: 0.9 });
        p.x = pos.x;
        p.y = pos.y;
        this.addChild(p);

        const angle = Math.random() * Math.PI * 2;
        const dist = spread * (0.5 + Math.random() * 0.5);
        gsap.to(p, {
          x: pos.x + Math.cos(angle) * dist,
          y: pos.y + Math.sin(angle) * dist,
          alpha: 0,
          duration: 0.4 + Math.random() * 0.3,
          ease: 'power2.out',
          onComplete: () => p.destroy(),
        });
        gsap.to(p.scale, {
          x: 0, y: 0,
          duration: 0.3 + Math.random() * 0.2,
          delay: 0.15,
          ease: 'power2.in',
        });
      }
    }
  }

  /** Blast power-up activation: bright line sweep + particle trail + screen shake */
  showBlastEffect(positions: { x: number; y: number }[], isRow: boolean): void {
    if (positions.length === 0) return;
    const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;

    // Bright sweep line
    const line = new Graphics();
    if (isRow) {
      line.rect(-400, -4, 800, 8);
    } else {
      line.rect(-4, -350, 8, 700);
    }
    line.fill({ color: 0x00e5ff, alpha: 0.9 });
    line.x = cx;
    line.y = cy;
    line.scale.set(0, 1);
    this.addChild(line);

    const tl = gsap.timeline();
    tl.to(line.scale, { x: 1, duration: 0.2, ease: 'power3.out' }, 0);
    tl.to(line, { alpha: 0, duration: 0.35, delay: 0.1, onComplete: () => line.destroy() }, 0);

    // Secondary glow line (wider, softer)
    const glow = new Graphics();
    if (isRow) {
      glow.rect(-400, -12, 800, 24);
    } else {
      glow.rect(-12, -350, 24, 700);
    }
    glow.fill({ color: 0x00e5ff, alpha: 0.3 });
    glow.x = cx;
    glow.y = cy;
    glow.scale.set(0, 1);
    this.addChild(glow);
    gsap.to(glow.scale, { x: 1, duration: 0.25, ease: 'power3.out' });
    gsap.to(glow, { alpha: 0, duration: 0.4, delay: 0.1, onComplete: () => glow.destroy() });

    // Particle trail at each cleared position
    this.spawnLineParticles(positions, 0x00e5ff, 4, 60);

    // Impact flash at each end
    const first = positions[0];
    const last = positions[positions.length - 1];
    for (const pt of [first, last]) {
      const flash = new Graphics();
      flash.circle(0, 0, 20);
      flash.fill({ color: 0xffffff, alpha: 0.8 });
      flash.x = pt.x;
      flash.y = pt.y;
      flash.scale.set(0.3);
      this.addChild(flash);
      gsap.to(flash.scale, { x: 2, y: 2, duration: 0.2, ease: 'power2.out' });
      gsap.to(flash, { alpha: 0, duration: 0.3, onComplete: () => flash.destroy() });
    }

    // Screen shake
    this.screenShake(5, 0.3);
  }

  /** Bomb power-up activation: expanding rings + shrapnel + screen shake */
  showBombEffect(x: number, y: number): void {
    // Multiple expanding rings with stagger
    for (let i = 0; i < 4; i++) {
      const ring = new Graphics();
      ring.circle(0, 0, 25 + i * 5);
      ring.stroke({ color: i < 2 ? 0xff5722 : 0xffab40, width: 4 - i, alpha: 0.9 });
      ring.x = x;
      ring.y = y;
      ring.scale.set(0.2);
      this.addChild(ring);

      gsap.to(ring.scale, { x: 3.5, y: 3.5, duration: 0.45, delay: i * 0.06, ease: 'power2.out' });
      gsap.to(ring, { alpha: 0, duration: 0.45, delay: i * 0.06 + 0.1, onComplete: () => ring.destroy() });
    }

    // Central bright flash
    const flash = new Graphics();
    flash.circle(0, 0, 40);
    flash.fill({ color: 0xffffff, alpha: 0.7 });
    flash.x = x;
    flash.y = y;
    flash.scale.set(0.5);
    this.addChild(flash);
    gsap.to(flash.scale, { x: 2.5, y: 2.5, duration: 0.15, ease: 'power2.out' });
    gsap.to(flash, { alpha: 0, duration: 0.3, onComplete: () => flash.destroy() });

    // Secondary orange flash
    const flash2 = new Graphics();
    flash2.circle(0, 0, 60);
    flash2.fill({ color: 0xff5722, alpha: 0.4 });
    flash2.x = x;
    flash2.y = y;
    this.addChild(flash2);
    gsap.to(flash2, { alpha: 0, duration: 0.4, onComplete: () => flash2.destroy() });

    // Shrapnel particles flying outward
    const shrapnelColors = [0xff5722, 0xffab40, 0xffd700, 0xff8a65];
    for (let i = 0; i < 20; i++) {
      const p = new Graphics();
      const size = 3 + Math.random() * 5;
      const color = shrapnelColors[Math.floor(Math.random() * shrapnelColors.length)];
      if (Math.random() < 0.5) {
        p.rect(-size / 2, -size / 2, size, size);
      } else {
        p.circle(0, 0, size / 2);
      }
      p.fill({ color });
      p.x = x;
      p.y = y;
      p.rotation = Math.random() * Math.PI * 2;
      this.addChild(p);

      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      gsap.to(p, {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 20, // slight gravity
        alpha: 0,
        rotation: p.rotation + (Math.random() - 0.5) * 10,
        duration: 0.5 + Math.random() * 0.3,
        ease: 'power2.out',
        onComplete: () => p.destroy(),
      });
      gsap.to(p.scale, {
        x: 0, y: 0,
        duration: 0.4 + Math.random() * 0.2,
        delay: 0.2,
        ease: 'power2.in',
      });
    }

    // Screen shake (stronger for bomb)
    this.screenShake(8, 0.4);
  }

  /** Rainbow power-up activation: rainbow-colored stars + sparkle connections */
  showRainbowEffect(positions: { x: number; y: number }[]): void {
    const rainbowColors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff, 0xff00ff];

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const color = rainbowColors[i % rainbowColors.length];

      // Central star burst
      const star = new Graphics();
      star.circle(0, 0, 18);
      star.fill({ color, alpha: 0.9 });
      star.x = pos.x;
      star.y = pos.y;
      star.scale.set(0);
      this.addChild(star);

      gsap.to(star.scale, { x: 2.5, y: 2.5, duration: 0.3, delay: i * 0.04, ease: 'back.out' });
      gsap.to(star, { alpha: 0, duration: 0.4, delay: i * 0.04 + 0.2, onComplete: () => star.destroy() });

      // White inner flash
      const inner = new Graphics();
      inner.circle(0, 0, 10);
      inner.fill({ color: 0xffffff, alpha: 0.7 });
      inner.x = pos.x;
      inner.y = pos.y;
      inner.scale.set(0);
      this.addChild(inner);
      gsap.to(inner.scale, { x: 1.5, y: 1.5, duration: 0.2, delay: i * 0.04, ease: 'power2.out' });
      gsap.to(inner, { alpha: 0, duration: 0.3, delay: i * 0.04 + 0.1, onComplete: () => inner.destroy() });

      // Rainbow sparkle particles around each position
      for (let j = 0; j < 6; j++) {
        const sparkle = new Graphics();
        const sColor = rainbowColors[(i + j) % rainbowColors.length];
        const sSize = 2 + Math.random() * 3;
        sparkle.circle(0, 0, sSize);
        sparkle.fill({ color: sColor });
        sparkle.x = pos.x;
        sparkle.y = pos.y;
        this.addChild(sparkle);

        const angle = (j / 6) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 30 + Math.random() * 50;
        gsap.to(sparkle, {
          x: pos.x + Math.cos(angle) * dist,
          y: pos.y + Math.sin(angle) * dist,
          alpha: 0,
          duration: 0.5 + Math.random() * 0.2,
          delay: i * 0.04,
          ease: 'power2.out',
          onComplete: () => sparkle.destroy(),
        });
      }
    }

    // Connecting sparkle trail between positions
    if (positions.length > 1) {
      for (let i = 0; i < positions.length - 1; i++) {
        const from = positions[i];
        const to = positions[i + 1];
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        const trail = new Graphics();
        trail.circle(0, 0, 4);
        trail.fill({ color: 0xffd700, alpha: 0.8 });
        trail.x = midX;
        trail.y = midY;
        trail.scale.set(0);
        this.addChild(trail);

        gsap.to(trail.scale, { x: 2, y: 2, duration: 0.2, delay: i * 0.05 + 0.1, ease: 'back.out' });
        gsap.to(trail, { alpha: 0, duration: 0.3, delay: i * 0.05 + 0.2, onComplete: () => trail.destroy() });
      }
    }

    // Screen shake (lighter for rainbow)
    this.screenShake(4, 0.25);
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
