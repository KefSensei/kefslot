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

    // Background bar with gradient feel
    const bg = new Graphics();
    bg.rect(0, 0, GameConfig.width, 60);
    bg.fill({ color: 0x0d0520, alpha: 0.9 });
    this.addChild(bg);

    // Gold accent line at bottom
    const accentLine = new Graphics();
    accentLine.rect(0, 58, GameConfig.width, 2);
    accentLine.fill({ color: 0xD4AF37, alpha: 0.6 });
    this.addChild(accentLine);

    // Level
    const lvlLabel = new Text({ text: 'LEVEL', style: labelStyle });
    lvlLabel.x = 20;
    lvlLabel.y = 6;
    this.addChild(lvlLabel);
    this.levelText = new Text({ text: '1', style: valueStyle });
    this.levelText.x = 20;
    this.levelText.y = 24;
    this.addChild(this.levelText);

    // Score
    const scoreLabel = new Text({ text: 'SCORE', style: labelStyle });
    scoreLabel.x = 120;
    scoreLabel.y = 6;
    this.addChild(scoreLabel);
    this.scoreText = new Text({ text: '0', style: bigValueStyle });
    this.scoreText.x = 120;
    this.scoreText.y = 22;
    this.addChild(this.scoreText);

    // Moves
    const movesLabel = new Text({ text: 'MOVES', style: labelStyle });
    movesLabel.x = 350;
    movesLabel.y = 6;
    this.addChild(movesLabel);
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
    const multLabel = new Text({ text: 'MULTI', style: labelStyle });
    multLabel.x = 480;
    multLabel.y = 6;
    this.addChild(multLabel);
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
    const coinsLabel = new Text({ text: 'COINS', style: labelStyle });
    coinsLabel.x = 640;
    coinsLabel.y = 6;
    this.addChild(coinsLabel);

    // Coin icon (small gold circle with C)
    const coinIcon = new Graphics();
    coinIcon.circle(630, 36, 10);
    coinIcon.fill({ color: 0xD4AF37 });
    coinIcon.stroke({ color: 0xF5D060, width: 1.5 });
    this.addChild(coinIcon);
    const coinC = new Text({ text: 'C', style: new TextStyle({ fontSize: 11, fill: 0x8B7332, fontWeight: 'bold', fontFamily: 'monospace' }) });
    coinC.anchor.set(0.5);
    coinC.x = 630;
    coinC.y = 36;
    this.addChild(coinC);

    this.coinsText = new Text({ text: '1000', style: new TextStyle({
      fontSize: 20,
      fill: 0xf39c12,
      fontWeight: 'bold',
      fontFamily: 'monospace',
    })});
    this.coinsText.x = 650;
    this.coinsText.y = 24;
    this.addChild(this.coinsText);

    // Message (center below HUD)
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
    this.messageText.y = 80;
    this.messageText.visible = false;
    this.addChild(this.messageText);
  }

  setScore(score: number): void {
    this.scoreText.text = score.toLocaleString();
  }

  setMoves(moves: number): void {
    this.movesText.text = String(moves);

    if (moves <= 2) {
      this.movesText.style.fill = 0xe74c3c;
      // Pulsing red glow
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
      // Bounce pulse
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
}
