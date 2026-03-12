import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameConfig } from '@/config/GameConfig';

export class HUD extends Container {
  private scoreText: Text;
  private movesText: Text;
  private levelText: Text;
  private multiplierText: Text;
  private coinsText: Text;
  private messageText: Text;
  private messageTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();

    const labelStyle = new TextStyle({
      fontSize: 14,
      fill: 0xb0a0c0,
      fontFamily: 'Segoe UI, sans-serif',
    });

    const valueStyle = new TextStyle({
      fontSize: 22,
      fill: 0xffffff,
      fontWeight: 'bold',
      fontFamily: 'Segoe UI, sans-serif',
    });

    const bigValueStyle = new TextStyle({
      fontSize: 28,
      fill: 0xf1c40f,
      fontWeight: 'bold',
      fontFamily: 'Segoe UI, sans-serif',
    });

    // Background bar
    const bg = new Graphics();
    bg.rect(0, 0, GameConfig.width, 60);
    bg.fill({ color: 0x0d0520, alpha: 0.85 });
    this.addChild(bg);

    // Level
    const lvlLabel = new Text({ text: 'LEVEL', style: labelStyle });
    lvlLabel.x = 20;
    lvlLabel.y = 5;
    this.addChild(lvlLabel);
    this.levelText = new Text({ text: '1', style: valueStyle });
    this.levelText.x = 20;
    this.levelText.y = 24;
    this.addChild(this.levelText);

    // Score
    const scoreLabel = new Text({ text: 'SCORE', style: labelStyle });
    scoreLabel.x = 120;
    scoreLabel.y = 5;
    this.addChild(scoreLabel);
    this.scoreText = new Text({ text: '0', style: bigValueStyle });
    this.scoreText.x = 120;
    this.scoreText.y = 22;
    this.addChild(this.scoreText);

    // Moves
    const movesLabel = new Text({ text: 'MOVES', style: labelStyle });
    movesLabel.x = 350;
    movesLabel.y = 5;
    this.addChild(movesLabel);
    this.movesText = new Text({ text: '5', style: valueStyle });
    this.movesText.x = 350;
    this.movesText.y = 24;
    this.addChild(this.movesText);

    // Multiplier
    const multLabel = new Text({ text: 'MULTI', style: labelStyle });
    multLabel.x = 480;
    multLabel.y = 5;
    this.addChild(multLabel);
    this.multiplierText = new Text({ text: 'x1', style: new TextStyle({
      fontSize: 24,
      fill: 0xff6b6b,
      fontWeight: 'bold',
      fontFamily: 'Segoe UI, sans-serif',
    })});
    this.multiplierText.x = 480;
    this.multiplierText.y = 22;
    this.addChild(this.multiplierText);

    // Coins
    const coinsLabel = new Text({ text: 'COINS', style: labelStyle });
    coinsLabel.x = 620;
    coinsLabel.y = 5;
    this.addChild(coinsLabel);
    this.coinsText = new Text({ text: '1000', style: new TextStyle({
      fontSize: 20,
      fill: 0xf39c12,
      fontWeight: 'bold',
      fontFamily: 'Segoe UI, sans-serif',
    })});
    this.coinsText.x = 620;
    this.coinsText.y = 24;
    this.addChild(this.coinsText);

    // Message (center bottom-ish)
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
    this.movesText.style.fill = moves <= 1 ? 0xe74c3c : 0xffffff;
  }

  setLevel(level: number): void {
    this.levelText.text = String(level);
  }

  setMultiplier(mult: number): void {
    this.multiplierText.text = `x${mult}`;
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
