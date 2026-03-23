import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import gsap from 'gsap';

export class HUD extends Container {
  private scoreText: Text;
  private starGoalText: Text;
  private levelText: Text;
  private coinsText: Text;
  private messageText: Text;
  private messageTimeout: ReturnType<typeof setTimeout> | null = null;
  private musicBtnIcon: Graphics;
  private sfxBtnIcon: Graphics;
  private _musicMuted = false;
  private _sfxMuted = false;

  // Scatter progress indicator (World 2)
  private scatterContainer: Container;
  private scatterDots: Graphics[] = [];
  private scatterLabel: Text;

  // Layout references for portrait repositioning
  private bg: Graphics;
  private accentLine: Graphics;
  private lvlLabel: Text;
  private coinIcon: Graphics;
  private coinC: Text;
  private musicBtn: Container;
  private sfxBtn: Container;
  private exitBtn: Container;

  // Progress bar
  private progressBarWrapper: Container;
  private progressBarFill: Graphics;
  private progressBarTrack: Graphics;
  private scoreGoal = 0;
  private currentScore = 0;
  private currentMult = 1;

  // Multiplier pill
  private multPill: Graphics;
  private multPillText: Text;

  // Bottom panel
  private bottomMovesLabel: Text;
  private bottomMovesText: Text;
  private bottomMovesGlow: Graphics;
  private powerUpIcon: Graphics;
  private powerUpCountText: Text;

  // Portrait layout state
  private _isPortrait = false;
  // bar geometry (changes per orientation)
  private _barX = 175;
  private _barWidth = 400;
  private _barCenterX = 375;

  onMusicToggle: ((muted: boolean) => void) | null = null;
  onSfxToggle: ((muted: boolean) => void) | null = null;
  onExitLevel: (() => void) | null = null;

  constructor() {
    super();

    const labelStyle = new TextStyle({
      fontSize: 12,
      fill: 0xb0a0c0,
      fontFamily: 'monospace',
      letterSpacing: 1,
    });

    const valueStyle = new TextStyle({
      fontSize: 22,
      fill: 0xffffff,
      fontWeight: 'bold',
      fontFamily: 'monospace',
    });

    // Background bar (68px tall)
    this.bg = new Graphics();
    this.bg.rect(0, 0, GameConfig.width, 68);
    this.bg.fill({ color: 0x0d0520, alpha: 0.9 });
    this.addChild(this.bg);

    // Gold accent line at bottom
    this.accentLine = new Graphics();
    this.accentLine.rect(0, 66, GameConfig.width, 2);
    this.accentLine.fill({ color: 0xd4af37, alpha: 0.6 });
    this.addChild(this.accentLine);

    // Level badge — far left
    this.lvlLabel = new Text({ text: 'LEVEL', style: labelStyle });
    this.lvlLabel.x = 20;
    this.lvlLabel.y = 6;
    this.addChild(this.lvlLabel);
    this.levelText = new Text({ text: '1', style: valueStyle });
    this.levelText.x = 20;
    this.levelText.y = 24;
    this.addChild(this.levelText);

    // Coin icon at x=88,y=35
    this.coinIcon = new Graphics();
    this.coinIcon.circle(88, 35, 10);
    this.coinIcon.fill({ color: 0xd4af37 });
    this.coinIcon.stroke({ color: 0xf5d060, width: 1.5 });
    this.addChild(this.coinIcon);
    this.coinC = new Text({
      text: 'C',
      style: new TextStyle({ fontSize: 11, fill: 0x8b7332, fontWeight: 'bold', fontFamily: 'monospace' }),
    });
    this.coinC.anchor.set(0.5);
    this.coinC.x = 88;
    this.coinC.y = 35;
    this.addChild(this.coinC);

    this.coinsText = new Text({
      text: '1000',
      style: new TextStyle({
        fontSize: 16,
        fill: 0xf39c12,
        fontWeight: 'bold',
        fontFamily: 'monospace',
      }),
    });
    this.coinsText.anchor.set(0, 0.5);
    this.coinsText.x = 104;
    this.coinsText.y = 35;
    this.addChild(this.coinsText);

    // Progress bar track
    this.progressBarTrack = new Graphics();
    this._drawBarTrack(175, 22, 400, 26);
    this.addChild(this.progressBarTrack);

    // Progress bar fill wrapper (allows left-anchored scale.x)
    this.progressBarWrapper = new Container();
    this.progressBarWrapper.x = 175;
    this.progressBarWrapper.y = 22;
    this.progressBarWrapper.pivot.x = 0;
    this.progressBarWrapper.scale.x = 0;
    this.addChild(this.progressBarWrapper);

    this.progressBarFill = new Graphics();
    this._drawBarFill(400, 26, this.multToColor(1));
    this.progressBarWrapper.addChild(this.progressBarFill);

    // Score text centered on bar
    this.scoreText = new Text({
      text: '0',
      style: new TextStyle({
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold',
        fontFamily: 'monospace',
      }),
    });
    this.scoreText.anchor.set(0.5, 0.5);
    this.scoreText.x = 375; // bar center
    this.scoreText.y = 32;
    this.addChild(this.scoreText);

    // Star goal text below score
    this.starGoalText = new Text({
      text: '★ 0',
      style: new TextStyle({
        fontSize: 11,
        fill: 0xb0a0c0,
        fontFamily: 'monospace',
      }),
    });
    this.starGoalText.anchor.set(0.5, 0);
    this.starGoalText.x = 375;
    this.starGoalText.y = 44;
    this.addChild(this.starGoalText);

    // Multiplier pill at x=582,y=28
    this.multPill = new Graphics();
    this._drawMultPill(582, 28, 28, 18, this.multToColor(1));
    this.addChild(this.multPill);

    this.multPillText = new Text({
      text: '×1',
      style: new TextStyle({
        fontSize: 11,
        fill: 0xffffff,
        fontWeight: 'bold',
        fontFamily: 'monospace',
      }),
    });
    this.multPillText.anchor.set(0.5, 0.5);
    this.multPillText.x = 582 + 14; // center of pill
    this.multPillText.y = 28 + 9;
    this.addChild(this.multPillText);

    // Music mute button
    this.musicBtn = new Container();
    this.musicBtn.x = GameConfig.width - 75;
    this.musicBtn.y = 35;
    this.musicBtn.eventMode = 'static';
    this.musicBtn.cursor = 'pointer';
    this.musicBtn.hitArea = { contains: (x: number, y: number) => x >= -16 && x <= 16 && y >= -16 && y <= 16 };

    this.musicBtnIcon = new Graphics();
    this.musicBtn.addChild(this.musicBtnIcon);
    this.drawMusicIcon(false);
    this.musicBtn.on('pointerdown', () => {
      this._musicMuted = !this._musicMuted;
      this.drawMusicIcon(this._musicMuted);
      this.onMusicToggle?.(this._musicMuted);
    });
    this.addChild(this.musicBtn);

    // SFX mute button
    this.sfxBtn = new Container();
    this.sfxBtn.x = GameConfig.width - 43;
    this.sfxBtn.y = 35;
    this.sfxBtn.eventMode = 'static';
    this.sfxBtn.cursor = 'pointer';
    this.sfxBtn.hitArea = { contains: (x: number, y: number) => x >= -16 && x <= 16 && y >= -16 && y <= 16 };

    this.sfxBtnIcon = new Graphics();
    this.sfxBtn.addChild(this.sfxBtnIcon);
    this.drawSfxIcon(false);
    this.sfxBtn.on('pointerdown', () => {
      this._sfxMuted = !this._sfxMuted;
      this.drawSfxIcon(this._sfxMuted);
      this.onSfxToggle?.(this._sfxMuted);
    });
    this.addChild(this.sfxBtn);

    // Exit button (X icon)
    this.exitBtn = new Container();
    this.exitBtn.x = GameConfig.width - 15;
    this.exitBtn.y = 35;
    this.exitBtn.eventMode = 'static';
    this.exitBtn.cursor = 'pointer';
    this.exitBtn.hitArea = { contains: (x: number, y: number) => x >= -14 && x <= 14 && y >= -14 && y <= 14 };
    const exitIcon = new Graphics();
    exitIcon.circle(0, 0, 12);
    exitIcon.fill({ color: 0x3a1a4e });
    exitIcon.stroke({ color: 0x9b59b6, width: 1.5 });
    // × diagonal lines
    exitIcon.moveTo(-5, -5);
    exitIcon.lineTo(5, 5);
    exitIcon.stroke({ color: 0xffffff, width: 2 });
    exitIcon.moveTo(5, -5);
    exitIcon.lineTo(-5, 5);
    exitIcon.stroke({ color: 0xffffff, width: 2 });
    this.exitBtn.addChild(exitIcon);
    this.exitBtn.on('pointerdown', () => {
      this.onExitLevel?.();
    });
    this.addChild(this.exitBtn);

    // Message text (centered on slot grid area)
    this.messageText = new Text({
      text: '',
      style: new TextStyle({
        fontSize: 20,
        fill: 0xf1c40f,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        dropShadow: {
          color: 0x000000,
          distance: 2,
          alpha: 1,
        },
      }),
    });
    this.messageText.anchor.set(0.5);
    this.messageText.x = GameConfig.width / 2;
    this.messageText.y = GameConfig.height / 2 - 20;
    this.messageText.visible = false;
    this.addChild(this.messageText);

    // Scatter progress indicator
    this.scatterContainer = new Container();
    this.scatterContainer.x = GameConfig.width - 120;
    this.scatterContainer.y = 14;
    this.scatterContainer.visible = false;
    this.scatterLabel = new Text({
      text: '✦',
      style: new TextStyle({ fontSize: 11, fill: 0x1abc9c, fontFamily: 'monospace' }),
    });
    this.scatterContainer.addChild(this.scatterLabel);
    this.addChild(this.scatterContainer);

    // ---- BOTTOM PANEL ----

    // Moves cluster at x=530, y=558 (landscape)
    this.bottomMovesLabel = new Text({
      text: 'MOVES',
      style: new TextStyle({ fontSize: 11, fill: 0xb0a0c0, fontFamily: 'monospace' }),
    });
    this.bottomMovesLabel.anchor.set(0.5, 1);
    this.bottomMovesLabel.x = 530;
    this.bottomMovesLabel.y = 552;
    this.addChild(this.bottomMovesLabel);

    this.bottomMovesText = new Text({
      text: '5',
      style: new TextStyle({ fontSize: 28, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'monospace' }),
    });
    this.bottomMovesText.anchor.set(0.5, 0);
    this.bottomMovesText.x = 530;
    this.bottomMovesText.y = 554;
    this.addChild(this.bottomMovesText);

    // Low-moves glow circle
    this.bottomMovesGlow = new Graphics();
    this.bottomMovesGlow.circle(530, 568, 20);
    this.bottomMovesGlow.fill({ color: 0xe74c3c, alpha: 0 });
    this.addChild(this.bottomMovesGlow);

    // Power-up lightning bolt icon at x=628,y=558
    this.powerUpIcon = new Graphics();
    this._drawLightningBolt(628, 558);
    this.addChild(this.powerUpIcon);

    // Power-up count text
    this.powerUpCountText = new Text({
      text: '0',
      style: new TextStyle({ fontSize: 22, fill: 0xf39c12, fontWeight: 'bold', fontFamily: 'monospace' }),
    });
    this.powerUpCountText.anchor.set(0, 0.5);
    this.powerUpCountText.x = 638;
    this.powerUpCountText.y = 558;
    this.addChild(this.powerUpCountText);
  }

  // ---- Private helpers ----

  private multToColor(m: number): number {
    if (m >= 8) return 0xe74c3c;
    if (m >= 5) return 0xe05a20;
    if (m >= 3) return 0xe67e22;
    if (m >= 2) return 0xf39c12;
    return 0xf1c40f;
  }

  private _drawBarTrack(x: number, y: number, w: number, h: number): void {
    this.progressBarTrack.clear();
    this.progressBarTrack.roundRect(x, y, w, h, 13);
    this.progressBarTrack.fill({ color: 0x1a0a2e });
    this.progressBarTrack.stroke({ color: 0x4a3a6a, width: 1.5 });
  }

  private _drawBarFill(w: number, h: number, color: number): void {
    this.progressBarFill.clear();
    this.progressBarFill.roundRect(0, 0, w, h, 13);
    this.progressBarFill.fill({ color });
  }

  private _drawMultPill(x: number, y: number, w: number, h: number, color: number): void {
    this.multPill.clear();
    this.multPill.roundRect(x, y, w, h, 5);
    this.multPill.fill({ color });
  }

  private _drawLightningBolt(x: number, y: number): void {
    const g = this.powerUpIcon;
    g.clear();
    // Simple zigzag lightning bolt, 14px tall, color 0xf5d060
    g.moveTo(x + 4, y - 7);
    g.lineTo(x, y);
    g.lineTo(x + 3, y);
    g.lineTo(x - 1, y + 7);
    g.stroke({ color: 0xf5d060, width: 2 });
  }

  private _updateBarFill(): void {
    const color = this.multToColor(this.currentMult);
    this._drawBarFill(this._barWidth, 26, color);
    const ratio = this.scoreGoal > 0 ? Math.min(1, this.currentScore / this.scoreGoal) : 0;
    gsap.to(this.progressBarWrapper.scale, { x: ratio, duration: 0.5, ease: 'power2.out' });
  }

  // ---- Public API ----

  setScore(score: number): void {
    this.currentScore = score;
    this.scoreText.text = score.toLocaleString();
    this._updateBarFill();
  }

  setMoves(moves: number): void {
    this.bottomMovesText.text = String(moves);

    if (moves <= 2) {
      this.bottomMovesText.style.fill = 0xe74c3c;
      gsap.to(this.bottomMovesGlow, {
        alpha: 0.3,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        overwrite: true,
      });
    } else {
      this.bottomMovesText.style.fill = 0xffffff;
      gsap.killTweensOf(this.bottomMovesGlow);
      this.bottomMovesGlow.alpha = 0;
    }
  }

  setLevel(level: number): void {
    this.levelText.text = String(level);
  }

  setMultiplier(mult: number): void {
    this.currentMult = mult;
    const color = this.multToColor(mult);
    this.multPillText.text = `×${mult}`;
    this._drawMultPill(
      this._isPortrait ? this._barX + this._barWidth + 7 : 582,
      28,
      28,
      18,
      color,
    );
    this._drawBarFill(this._barWidth, 26, color);
    if (mult > 1) {
      gsap.fromTo(
        this.multPill.scale,
        { x: 1, y: 1 },
        { x: 1.3, y: 1.3, duration: 0.15, yoyo: true, repeat: 1, ease: 'back.out' },
      );
      gsap.fromTo(
        this.multPillText.scale,
        { x: 1, y: 1 },
        { x: 1.3, y: 1.3, duration: 0.15, yoyo: true, repeat: 1, ease: 'back.out' },
      );
    }
  }

  setCoins(coins: number): void {
    this.coinsText.text = coins.toLocaleString();
  }

  setScoreGoal(goal: number): void {
    this.scoreGoal = goal;
    this.starGoalText.text = `★ ${goal.toLocaleString()}`;
    this._updateBarFill();
  }

  setPowerUpCount(count: number): void {
    this.powerUpCountText.text = String(count);
    if (count > 0) {
      gsap.fromTo(
        this.powerUpCountText.scale,
        { x: 1, y: 1 },
        { x: 1.4, y: 1.4, duration: 0.15, yoyo: true, repeat: 1, ease: 'back.out' },
      );
    }
  }

  showMessage(text: string, duration = 2000): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageText.text = text;
    this.messageText.visible = true;
    this.messageText.alpha = 1;
    this.messageTimeout = setTimeout(() => {
      this.messageText.visible = false;
    }, duration);
  }

  setMusicMuted(muted: boolean): void {
    this._musicMuted = muted;
    this.drawMusicIcon(muted);
  }

  setSfxMuted(muted: boolean): void {
    this._sfxMuted = muted;
    this.drawSfxIcon(muted);
  }

  /** Show scatter progress dots (e.g. 1/3). Pass count=0 to hide. */
  setScatterProgress(count: number, threshold: number): void {
    this.scatterContainer.removeChildren();
    this.scatterDots = [];
    if (threshold <= 0) {
      this.scatterContainer.visible = false;
      return;
    }
    this.scatterContainer.visible = true;

    this.scatterLabel.text = '✦';
    this.scatterLabel.x = 0;
    this.scatterLabel.y = -8;
    this.scatterContainer.addChild(this.scatterLabel);

    for (let i = 0; i < threshold; i++) {
      const dot = new Graphics();
      const filled = i < count;
      dot.circle(0, 0, 5);
      dot.fill({ color: filled ? 0x1abc9c : 0x2c3e50 });
      dot.stroke({ color: 0x1abc9c, width: 1.5 });
      dot.x = i * 14;
      dot.y = 6;
      this.scatterContainer.addChild(dot);
      this.scatterDots.push(dot);

      if (filled) {
        gsap.fromTo(
          dot.scale,
          { x: 1, y: 1 },
          { x: 1.4, y: 1.4, duration: 0.2, yoyo: true, repeat: 1, ease: 'back.out' },
        );
      }
    }
  }

  /** Hide the scatter counter (call on level start) */
  hideScatterProgress(): void {
    this.scatterContainer.visible = false;
  }

  /** Reposition elements for portrait (narrow) or landscape (wide) */
  setPortrait(isPortrait: boolean): void {
    this._isPortrait = isPortrait;
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;

    // Redraw background
    this.bg.clear();
    this.bg.rect(0, 0, w, 68);
    this.bg.fill({ color: 0x0d0520, alpha: 0.9 });

    this.accentLine.clear();
    this.accentLine.rect(0, 66, w, 2);
    this.accentLine.fill({ color: 0xd4af37, alpha: 0.6 });

    if (isPortrait) {
      // Portrait bar: x=110, width=240, center=230
      this._barX = 110;
      this._barWidth = 240;
      this._barCenterX = 230;

      this._drawBarTrack(110, 22, 240, 26);

      this.progressBarWrapper.x = 110;
      this.progressBarWrapper.y = 22;
      this._drawBarFill(240, 26, this.multToColor(this.currentMult));
      this._updateBarFill();

      this.scoreText.x = 230;
      this.starGoalText.x = 230;

      // Multiplier pill just right of bar
      const pillX = 357;
      this._drawMultPill(pillX, 28, 28, 18, this.multToColor(this.currentMult));
      this.multPillText.x = pillX + 14;
      this.multPillText.y = 28 + 9;

      // Bottom clusters — portrait positions
      this.bottomMovesLabel.x = 370;
      this.bottomMovesText.x = 370;
      this.bottomMovesGlow.clear();
      this.bottomMovesGlow.circle(370, 568, 20);
      this.bottomMovesGlow.fill({ color: 0xe74c3c, alpha: 0 });

      this._drawLightningBolt(448, 558);
      this.powerUpCountText.x = 458;
      this.powerUpCountText.y = 558;
      this.powerUpIcon.x = 0; // already drawn at absolute coords

      this.musicBtn.x = w - 75;
      this.sfxBtn.x = w - 43;
      this.exitBtn.x = w - 15;
    } else {
      // Standard landscape layout
      this._barX = 175;
      this._barWidth = 400;
      this._barCenterX = 375;

      this._drawBarTrack(175, 22, 400, 26);

      this.progressBarWrapper.x = 175;
      this.progressBarWrapper.y = 22;
      this._drawBarFill(400, 26, this.multToColor(this.currentMult));
      this._updateBarFill();

      this.scoreText.x = 375;
      this.starGoalText.x = 375;

      this._drawMultPill(582, 28, 28, 18, this.multToColor(this.currentMult));
      this.multPillText.x = 582 + 14;
      this.multPillText.y = 28 + 9;

      // Bottom clusters — landscape positions
      this.bottomMovesLabel.x = 530;
      this.bottomMovesText.x = 530;
      this.bottomMovesGlow.clear();
      this.bottomMovesGlow.circle(530, 568, 20);
      this.bottomMovesGlow.fill({ color: 0xe74c3c, alpha: 0 });

      this._drawLightningBolt(628, 558);
      this.powerUpCountText.x = 638;
      this.powerUpCountText.y = 558;

      this.musicBtn.x = GameConfig.width - 75;
      this.sfxBtn.x = GameConfig.width - 43;
      this.exitBtn.x = GameConfig.width - 15;
    }

    // Message always centered on active canvas
    this.messageText.x = w / 2;
    this.messageText.y = h / 2 - 20;
  }

  drawSfxIcon(muted: boolean): void {
    const g = this.sfxBtnIcon;
    g.clear();

    const color = muted ? 0x666666 : 0xb0a0c0;
    // F shape
    g.moveTo(-8, -6);
    g.lineTo(-8, 6);
    g.stroke({ color, width: 2 });
    g.moveTo(-8, -6);
    g.lineTo(-2, -6);
    g.stroke({ color, width: 2 });
    g.moveTo(-8, 0);
    g.lineTo(-3, 0);
    g.stroke({ color, width: 2 });

    // X shape
    g.moveTo(1, -6);
    g.lineTo(9, 6);
    g.stroke({ color, width: 2 });
    g.moveTo(9, -6);
    g.lineTo(1, 6);
    g.stroke({ color, width: 2 });

    if (muted) {
      g.moveTo(-10, 8);
      g.lineTo(11, -8);
      g.stroke({ color: 0xe74c3c, width: 2 });
    }
  }

  drawMusicIcon(muted: boolean): void {
    const g = this.musicBtnIcon;
    g.clear();

    g.moveTo(-6, -4);
    g.lineTo(-2, -4);
    g.lineTo(4, -9);
    g.lineTo(4, 9);
    g.lineTo(-2, 4);
    g.lineTo(-6, 4);
    g.closePath();
    g.fill({ color: 0xb0a0c0 });

    if (muted) {
      g.moveTo(7, -5);
      g.lineTo(13, 5);
      g.stroke({ color: 0xe74c3c, width: 2 });
      g.moveTo(13, -5);
      g.lineTo(7, 5);
      g.stroke({ color: 0xe74c3c, width: 2 });
    } else {
      g.arc(4, 0, 7, -Math.PI / 3, Math.PI / 3);
      g.stroke({ color: 0xb0a0c0, width: 1.5 });
      g.arc(4, 0, 11, -Math.PI / 3, Math.PI / 3);
      g.stroke({ color: 0xb0a0c0, width: 1.5 });
    }
  }
}
