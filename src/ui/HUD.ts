import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import gsap from 'gsap';

export class HUD extends Container {
  private scoreText: Text;
  private movesText: Text;
  private levelText: Text;
  private multiplierText: Text;
  private coinsText: Text;
  private messageText: Text;
  private messageTimeout: ReturnType<typeof setTimeout> | null = null;
  private movesGlow: Graphics;
  private musicBtnIcon: Graphics;
  private sfxBtnIcon: Graphics;
  private _musicMuted = false;
  private _sfxMuted = false;

  // Layout references for portrait repositioning
  private bg: Graphics;
  private accentLine: Graphics;
  private lvlLabel: Text;
  private scoreLabel: Text;
  private movesLabel: Text;
  private multLabel: Text;
  private coinsLabel: Text;
  private coinIcon: Graphics;
  private coinC: Text;
  private musicBtn: Container;
  private sfxBtn: Container;

  onMusicToggle: ((muted: boolean) => void) | null = null;
  onSfxToggle: ((muted: boolean) => void) | null = null;

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

    const bigValueStyle = new TextStyle({
      fontSize: 28,
      fill: 0xf1c40f,
      fontWeight: 'bold',
      fontFamily: 'monospace',
    });

    // Background bar
    this.bg = new Graphics();
    this.bg.rect(0, 0, GameConfig.width, 60);
    this.bg.fill({ color: 0x0d0520, alpha: 0.9 });
    this.addChild(this.bg);

    // Gold accent line at bottom
    this.accentLine = new Graphics();
    this.accentLine.rect(0, 58, GameConfig.width, 2);
    this.accentLine.fill({ color: 0xD4AF37, alpha: 0.6 });
    this.addChild(this.accentLine);

    // Level
    this.lvlLabel = new Text({ text: 'LEVEL', style: labelStyle });
    this.lvlLabel.x = 20;
    this.lvlLabel.y = 6;
    this.addChild(this.lvlLabel);
    this.levelText = new Text({ text: '1', style: valueStyle });
    this.levelText.x = 20;
    this.levelText.y = 24;
    this.addChild(this.levelText);

    // Score
    this.scoreLabel = new Text({ text: 'SCORE', style: labelStyle });
    this.scoreLabel.x = 120;
    this.scoreLabel.y = 6;
    this.addChild(this.scoreLabel);
    this.scoreText = new Text({ text: '0', style: bigValueStyle });
    this.scoreText.x = 120;
    this.scoreText.y = 22;
    this.addChild(this.scoreText);

    // Moves
    this.movesLabel = new Text({ text: 'MOVES', style: labelStyle });
    this.movesLabel.x = 350;
    this.movesLabel.y = 6;
    this.addChild(this.movesLabel);
    this.movesText = new Text({ text: '5', style: valueStyle });
    this.movesText.x = 350;
    this.movesText.y = 24;
    this.addChild(this.movesText);

    // Moves glow (for low-moves warning)
    this.movesGlow = new Graphics();
    this.movesGlow.circle(370, 35, 22);
    this.movesGlow.fill({ color: 0xe74c3c, alpha: 0 });
    this.addChild(this.movesGlow);

    // Multiplier
    this.multLabel = new Text({ text: 'MULTI', style: labelStyle });
    this.multLabel.x = 480;
    this.multLabel.y = 6;
    this.addChild(this.multLabel);
    this.multiplierText = new Text({ text: 'x1', style: new TextStyle({
      fontSize: 24,
      fill: 0xff6b6b,
      fontWeight: 'bold',
      fontFamily: 'monospace',
    })});
    this.multiplierText.x = 480;
    this.multiplierText.y = 22;
    this.addChild(this.multiplierText);

    // Coins with icon
    this.coinsLabel = new Text({ text: 'COINS', style: labelStyle });
    this.coinsLabel.x = 640;
    this.coinsLabel.y = 6;
    this.addChild(this.coinsLabel);

    this.coinIcon = new Graphics();
    this.coinIcon.circle(630, 36, 10);
    this.coinIcon.fill({ color: 0xD4AF37 });
    this.coinIcon.stroke({ color: 0xF5D060, width: 1.5 });
    this.addChild(this.coinIcon);
    this.coinC = new Text({ text: 'C', style: new TextStyle({ fontSize: 11, fill: 0x8B7332, fontWeight: 'bold', fontFamily: 'monospace' }) });
    this.coinC.anchor.set(0.5);
    this.coinC.x = 630;
    this.coinC.y = 36;
    this.addChild(this.coinC);

    this.coinsText = new Text({ text: '1000', style: new TextStyle({
      fontSize: 20,
      fill: 0xf39c12,
      fontWeight: 'bold',
      fontFamily: 'monospace',
    })});
    this.coinsText.x = 650;
    this.coinsText.y = 24;
    this.addChild(this.coinsText);

    // Music mute button (top-right corner)
    this.musicBtn = new Container();
    this.musicBtn.x = GameConfig.width - 30;
    this.musicBtn.y = 30;
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

    // SFX mute button (next to music button)
    this.sfxBtn = new Container();
    this.sfxBtn.x = GameConfig.width - 70;
    this.sfxBtn.y = 30;
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

    // Message (centered on slot grid)
    this.messageText = new Text({ text: '', style: new TextStyle({
      fontSize: 20,
      fill: 0xf1c40f,
      fontWeight: 'bold',
      fontFamily: 'Segoe UI, sans-serif',
      dropShadow: {
        color: 0x000000,
        distance: 2,
        alpha: 1,
      },
    })});
    this.messageText.anchor.set(0.5);
    this.messageText.x = GameConfig.width / 2;
    this.messageText.y = GameConfig.height / 2 - 20;
    this.messageText.visible = false;
    this.addChild(this.messageText);
  }

  /** Reposition elements for portrait (narrow) or landscape (wide) */
  setPortrait(isPortrait: boolean): void {
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;

    // Redraw background
    this.bg.clear();
    this.bg.rect(0, 0, w, 60);
    this.bg.fill({ color: 0x0d0520, alpha: 0.9 });

    this.accentLine.clear();
    this.accentLine.rect(0, 58, w, 2);
    this.accentLine.fill({ color: 0xD4AF37, alpha: 0.6 });

    if (isPortrait) {
      // Compact layout for ~500px width
      // Row: LVL | SCORE (centered) | MOVES | music
      this.lvlLabel.x = 12;
      this.levelText.x = 12;

      this.scoreLabel.x = 80;
      this.scoreText.x = 80;

      this.movesLabel.x = 240;
      this.movesText.x = 240;

      // Rebuild moves glow position
      this.movesGlow.clear();
      this.movesGlow.circle(260, 35, 22);
      this.movesGlow.fill({ color: 0xe74c3c, alpha: 0 });

      // Hide multiplier + coins in portrait (too cramped)
      this.multLabel.visible = false;
      this.multiplierText.visible = false;
      this.coinsLabel.visible = false;
      this.coinIcon.visible = false;
      this.coinC.visible = false;
      this.coinsText.visible = false;

      this.musicBtn.x = w - 30;
      this.sfxBtn.x = w - 70;
    } else {
      // Standard landscape layout
      this.lvlLabel.x = 20;
      this.levelText.x = 20;

      this.scoreLabel.x = 120;
      this.scoreText.x = 120;

      this.movesLabel.x = 350;
      this.movesText.x = 350;

      this.movesGlow.clear();
      this.movesGlow.circle(370, 35, 22);
      this.movesGlow.fill({ color: 0xe74c3c, alpha: 0 });

      this.multLabel.visible = true;
      this.multiplierText.visible = true;
      this.coinsLabel.visible = true;
      this.coinIcon.visible = true;
      this.coinC.visible = true;
      this.coinsText.visible = true;

      this.musicBtn.x = GameConfig.width - 30;
      this.sfxBtn.x = GameConfig.width - 70;
    }

    // Message always centered on active canvas
    this.messageText.x = w / 2;
    this.messageText.y = h / 2 - 20;
  }

  setScore(score: number): void {
    this.scoreText.text = score.toLocaleString();
  }

  setMoves(moves: number): void {
    this.movesText.text = String(moves);

    if (moves <= 2) {
      this.movesText.style.fill = 0xe74c3c;
      gsap.to(this.movesGlow, {
        pixi: { alpha: 0.3 },
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        overwrite: true,
      });
    } else {
      this.movesText.style.fill = 0xffffff;
      gsap.killTweensOf(this.movesGlow);
      this.movesGlow.alpha = 0;
    }
  }

  setLevel(level: number): void {
    this.levelText.text = String(level);
  }

  setMultiplier(mult: number): void {
    this.multiplierText.text = `x${mult}`;
    if (mult > 1) {
      gsap.fromTo(this.multiplierText.scale,
        { x: 1, y: 1 },
        { x: 1.3, y: 1.3, duration: 0.15, yoyo: true, repeat: 1, ease: 'back.out' }
      );
    }
  }

  setCoins(coins: number): void {
    this.coinsText.text = coins.toLocaleString();
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

  private drawSfxIcon(muted: boolean): void {
    const g = this.sfxBtnIcon;
    g.clear();

    // FX text icon
    const color = muted ? 0x666666 : 0xb0a0c0;
    // Draw "FX" as small graphics lines
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
      // Red slash through
      g.moveTo(-10, 8);
      g.lineTo(11, -8);
      g.stroke({ color: 0xe74c3c, width: 2 });
    }
  }

  private drawMusicIcon(muted: boolean): void {
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
