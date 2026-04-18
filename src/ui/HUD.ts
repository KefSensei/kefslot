import { Container, Graphics, Text } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';
import gsap from 'gsap';
import {
  tsLabel,
  tsHudValue,
  tsHudValueBig,
  tsMultiplier,
  tsCoins,
  tsMechanicBar,
  tsHudMessage,
} from '@/config/Typography';

export interface GoalStatus {
  label: string;
  done: boolean;
}

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
  private mechanicBar: Container;
  private mechanicText: Text;
  private goalsBar: Container;
  private _lastGoals: GoalStatus[] = [];

  onMusicToggle: ((muted: boolean) => void) | null = null;
  onSfxToggle: ((muted: boolean) => void) | null = null;

  constructor() {
    super();


    // Background bar
    this.bg = new Graphics();
    this.bg.rect(0, 0, GameConfig.width, 60);
    this.bg.fill({ color: 0x0d0520, alpha: 0.9 });
    this.addChild(this.bg);

    // Gold accent line at bottom
    this.accentLine = new Graphics();
    this.accentLine.rect(0, 58, GameConfig.width, 2);
    this.accentLine.fill({ color: 0xd4af37, alpha: 0.6 });
    this.addChild(this.accentLine);

    // Level
    this.lvlLabel = new Text({ text: 'LEVEL', style: tsLabel });
    this.lvlLabel.x = 20;
    this.lvlLabel.y = 6;
    this.addChild(this.lvlLabel);
    this.levelText = new Text({ text: '1', style: tsHudValue });
    this.levelText.x = 20;
    this.levelText.y = 24;
    this.addChild(this.levelText);

    // Score
    this.scoreLabel = new Text({ text: 'SCORE', style: tsLabel });
    this.scoreLabel.x = 120;
    this.scoreLabel.y = 6;
    this.addChild(this.scoreLabel);
    this.scoreText = new Text({ text: '0', style: tsHudValueBig });
    this.scoreText.x = 120;
    this.scoreText.y = 22;
    this.addChild(this.scoreText);

    // Moves
    this.movesLabel = new Text({ text: 'MOVES', style: tsLabel });
    this.movesLabel.x = 350;
    this.movesLabel.y = 6;
    this.addChild(this.movesLabel);
    this.movesText = new Text({ text: '5', style: tsHudValue });
    this.movesText.x = 350;
    this.movesText.y = 24;
    this.addChild(this.movesText);

    // Moves glow (for low-moves warning)
    this.movesGlow = new Graphics();
    this.movesGlow.circle(370, 35, 22);
    this.movesGlow.fill({ color: 0xe74c3c, alpha: 0 });
    this.addChild(this.movesGlow);

    // Multiplier
    this.multLabel = new Text({ text: 'MULTI', style: tsLabel });
    this.multLabel.x = 480;
    this.multLabel.y = 6;
    this.addChild(this.multLabel);
    this.multiplierText = new Text({ text: 'x1', style: tsMultiplier });
    this.multiplierText.x = 480;
    this.multiplierText.y = 22;
    this.addChild(this.multiplierText);

    // Coins with icon
    this.coinsLabel = new Text({ text: 'COINS', style: tsLabel });
    this.coinsLabel.x = 640;
    this.coinsLabel.y = 6;
    this.addChild(this.coinsLabel);

    this.coinIcon = new Graphics();
    this.coinIcon.circle(630, 36, 10);
    this.coinIcon.fill({ color: 0xd4af37 });
    this.coinIcon.stroke({ color: 0xf5d060, width: 1.5 });
    this.addChild(this.coinIcon);
    this.coinC = new Text({ text: '✦', style: tsMechanicBar });
    this.coinC.anchor.set(0.5);
    this.coinC.x = 630;
    this.coinC.y = 36;
    this.addChild(this.coinC);

    this.coinsText = new Text({ text: '1000', style: tsCoins });
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

    // Mechanic status bar (below HUD bar, shows active mechanic info)
    this.mechanicBar = new Container();
    this.mechanicBar.y = 62;
    this.mechanicBar.visible = false;
    this.addChild(this.mechanicBar);

    this.mechanicText = new Text({ text: '', style: tsMechanicBar });
    this.mechanicText.x = 10;
    this.mechanicText.y = 2;
    this.mechanicBar.addChild(this.mechanicText);

    // Goals bar (below HUD bar, always visible during gameplay)
    this.goalsBar = new Container();
    this.goalsBar.y = 60;
    this.addChild(this.goalsBar);

    // Message (centered on slot grid)
    this.messageText = new Text({ text: '', style: tsHudMessage });
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
    this.accentLine.fill({ color: 0xd4af37, alpha: 0.6 });

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

    // Re-render goals bar with updated width
    if (this._lastGoals.length) this.setGoals(this._lastGoals);
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
      gsap.fromTo(
        this.multiplierText.scale,
        { x: 1, y: 1 },
        { x: 1.3, y: 1.3, duration: 0.15, yoyo: true, repeat: 1, ease: 'back.out' },
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

  /** Show level goals with live progress as compact chips below the HUD bar */
  setGoals(goals: GoalStatus[]): void {
    this._lastGoals = goals;
    this.goalsBar.removeChildren();
    if (!goals.length) return;

    const w = GameConfig.activeWidth;

    // Background strip
    const stripH = 28;
    const bg = new Graphics();
    bg.rect(0, 0, w, stripH);
    bg.fill({ color: 0x120830, alpha: 0.95 });
    this.goalsBar.addChild(bg);

    // Subtle top highlight and bottom border
    const topLine = new Graphics();
    topLine.rect(0, 0, w, 1);
    topLine.fill({ color: 0xd4af37, alpha: 0.25 });
    this.goalsBar.addChild(topLine);

    const botLine = new Graphics();
    botLine.rect(0, stripH - 1, w, 1);
    botLine.fill({ color: 0x6a4a9a, alpha: 0.6 });
    this.goalsBar.addChild(botLine);

    // Center goals horizontally when there's only one
    const allGoals = goals;
    const centerX = w / 2;

    // First pass: build texts to measure total width
    const texts = allGoals.map((g) => {
      const style = tsLabel.clone();
      style.fill = g.done ? 0x4ade80 : 0xf0e0ff;
      style.fontSize = 13;
      return new Text({ text: (g.done ? '✓  ' : '') + g.label, style });
    });

    const gapW = 28;
    const totalW = texts.reduce((s, t, i) => s + t.width + (i < texts.length - 1 ? gapW : 0), 0);
    let x = Math.max(14, centerX - totalW / 2);

    texts.forEach((chipText, i) => {
      chipText.y = (stripH - chipText.height) / 2;
      chipText.x = x;
      this.goalsBar.addChild(chipText);
      x += chipText.width;

      if (i < texts.length - 1) {
        const divider = new Graphics();
        divider.rect(x + gapW / 2 - 1, 6, 1, stripH - 12);
        divider.fill({ color: 0x6a4a9a, alpha: 0.6 });
        this.goalsBar.addChild(divider);
        x += gapW;
      }
    });
  }

  /** Show active mechanic status info (combo streak, blizzard, swap budget, etc.) */
  setMechanicInfo(info: string | null): void {
    if (info) {
      this.mechanicText.text = info;
      this.mechanicBar.visible = true;
    } else {
      this.mechanicBar.visible = false;
    }
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
