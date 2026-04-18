import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { tsVictoryHeadline, tsFailureHeadline, tsLabel, tsScoreDisplay, tsScoreLabel, tsCoinEarned, tsResultButton, tsGoalLabel } from '@/config/Typography';
import { GameConfig } from '@/config/GameConfig';
import gsap from 'gsap';
import victoryPanelUrl from '@/assets/sprites/ui-panel-victory.png';
import failedPanelUrl from '@/assets/sprites/ui-panel-failed.png';
import starFilledUrl from '@/assets/sprites/ui-star-filled.png';
import roxyVictoryUrl from '@/assets/sprites/roxy-victory.png';
import { SFXManager } from '@/audio/SFXManager';
import { GoalStatus } from '@/ui/HUD';

let texVictory: Texture | null = null;
let texFailed: Texture | null = null;
let texStar: Texture | null = null;
let texRoxy: Texture | null = null;

const HEADLINES_3 = ['LEGENDARY!', 'UNSTOPPABLE!', 'FLAWLESS!', 'MAGNIFICENT!'];
const HEADLINES_2 = ['SPECTACULAR!', 'BRILLIANT!', 'IMPRESSIVE!', 'FANTASTIC!'];
const HEADLINES_1 = ['WELL DONE!', 'GREAT JOB!', 'NICELY DONE!', 'KEEP IT UP!'];
const HEADLINES_0 = ['SO CLOSE...', 'ALMOST THERE!', 'TRY AGAIN!', 'YOU GOT THIS!'];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface LevelCompleteData {
  levelId: number;
  score: number;
  stars: number;
  coinsEarned: number;
  passed: boolean;
  goals: GoalStatus[];
  sfx: SFXManager;
}

export class LevelComplete extends Container {
  onContinue: (() => void) | null = null;
  private overlay: Graphics | null = null;
  private panel: Container | null = null;

  static async preload(): Promise<void> {
    [texVictory, texFailed, texStar, texRoxy] = await Promise.all([
      Assets.load<Texture>(victoryPanelUrl),
      Assets.load<Texture>(failedPanelUrl),
      Assets.load<Texture>(starFilledUrl),
      Assets.load<Texture>(roxyVictoryUrl),
    ]);
  }

  constructor() {
    super();
    this.visible = false;
  }

  relayout(w: number, h: number): void {
    if (this.overlay) {
      this.overlay.clear();
      this.overlay.rect(0, 0, w, h);
      this.overlay.fill({ color: 0x000000, alpha: 0.65 });
    }
    if (this.panel) {
      this.panel.x = w / 2;
      this.panel.y = h / 2 + 10;
    }
  }

  show(data: LevelCompleteData): void {
    this.removeChildren();
    this.visible = true;
    gsap.killTweensOf(this); // clear any leftover tweens

    const { score, stars, coinsEarned, passed, goals, sfx } = data;
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;

    // ── Dim overlay ──────────────────────────────────────────────
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, w, h);
    this.overlay.fill({ color: 0x000000, alpha: 0 });
    this.overlay.eventMode = 'static';
    this.addChild(this.overlay);
    gsap.to(this.overlay, { alpha: 1, duration: 0.4, ease: 'power1.out' });

    // ── Panel ─────────────────────────────────────────────────────
    const panel = new Container();
    this.panel = panel;
    panel.x = w / 2;
    panel.y = h / 2 + 10;
    this.addChild(panel);

    const PW = 420,
      PH = 560;

    const tex = passed ? texVictory : texFailed;
    if (tex) {
      const bg = new Sprite(tex);
      bg.width = PW;
      bg.height = PH;
      bg.anchor.set(0.5);
      panel.addChild(bg);
    } else {
      const bg = new Graphics();
      bg.roundRect(-PW / 2, -PH / 2, PW, PH, 20);
      bg.fill({ color: passed ? 0x1e0a3a : 0x0a1020 });
      bg.stroke({ color: passed ? 0xf1c40f : 0xe74c3c, width: 3 });
      panel.addChild(bg);
    }

    // ── Roxy (bottom-right, peeking up) ───────────────────────────
    let roxy: Sprite | null = null;
    if (passed && texRoxy) {
      roxy = new Sprite(texRoxy);
      roxy.width = 220;
      roxy.height = 220;
      roxy.anchor.set(0.5);
      roxy.x = 130;
      roxy.y = 75;
      roxy.alpha = 0;
      panel.addChild(roxy);
    }

    // ── Dynamic headline ──────────────────────────────────────────
    let headline: string;
    if (!passed) headline = pick(HEADLINES_0);
    else if (stars >= 3) headline = pick(HEADLINES_3);
    else if (stars >= 2) headline = pick(HEADLINES_2);
    else headline = pick(HEADLINES_1);

    const titleText = new Text({ text: headline, style: passed ? tsVictoryHeadline : tsFailureHeadline });
    titleText.anchor.set(0.5);
    titleText.y = -238;
    titleText.scale.set(0);
    panel.addChild(titleText);

    // ── Stars ─────────────────────────────────────────────────────
    const starSpacing = 86;
    const earnedStars: Sprite[] = [];

    if (texStar) {
      for (let i = 0; i < 3; i++) {
        const star = new Sprite(texStar);
        const earned = i < stars;
        star.width = star.height = earned ? 84 : 64;
        star.anchor.set(0.5);
        star.x = (i - 1) * starSpacing;
        star.y = -162;
        star.alpha = 0;
        star.tint = earned ? 0xffffff : 0x555555;
        star.scale.set(earned ? 0 : 0.7);
        panel.addChild(star);
        if (earned) earnedStars.push(star);
      }
    }

    // ── Goals list ────────────────────────────────────────────────
    const goalRows: Container[] = [];
    const goalsTopY = -90;

    goals.forEach((g, i) => {
      const row = new Container();
      row.y = goalsTopY + i * 27;
      row.alpha = 0;
      panel.addChild(row);
      goalRows.push(row);

      const iconStyle = tsGoalLabel.clone();
      iconStyle.fill = g.done ? 0x4ade80 : 0x777777;
      const icon = new Text({ text: g.done ? '✓' : '–', style: iconStyle });
      icon.anchor.set(0.5, 0.5);
      row.addChild(icon);

      const lblStyle = tsGoalLabel.clone();
      lblStyle.fill = g.done ? 0xffffff : 0x999999;
      const lbl = new Text({ text: g.label, style: lblStyle });
      lbl.anchor.set(0, 0.5);
      lbl.x = 14;
      row.addChild(lbl);

      // Center the whole row in the left column
      const totalW = icon.width + 14 + lbl.width;
      row.x = -totalW / 2 - 30;
    });

    // ── Score ─────────────────────────────────────────────────────
    const scoreBaseY = goalsTopY + Math.max(goals.length, 1) * 27 + 8;

    const scoreLabel = new Text({ text: 'SCORE', style: tsScoreLabel });
    scoreLabel.anchor.set(0.5);
    scoreLabel.y = scoreBaseY;
    scoreLabel.alpha = 0;
    panel.addChild(scoreLabel);

    const scoreValue = new Text({ text: '0', style: tsScoreDisplay });
    scoreValue.anchor.set(0.5);
    scoreValue.y = scoreBaseY + 32;
    scoreValue.alpha = 0;
    panel.addChild(scoreValue);

    // ── Coins ─────────────────────────────────────────────────────
    const coinsRow = new Container();
    coinsRow.y = scoreValue.y + 42;
    coinsRow.alpha = 0;
    panel.addChild(coinsRow);

    if (coinsEarned > 0) {
      const coinCircle = new Graphics();
      coinCircle.circle(0, 0, 10);
      coinCircle.fill({ color: 0xf5c842 });
      coinCircle.x = -50;
      coinsRow.addChild(coinCircle);

      const coinText = new Text({ text: `+${coinsEarned} coins`, style: tsCoinEarned });
      coinText.anchor.set(0, 0.5);
      coinText.x = -35;
      coinsRow.addChild(coinText);
    }

    // ── Continue / Retry button ───────────────────────────────────
    const btn = new Container();
    btn.y = 210;
    btn.alpha = 0;
    btn.scale.set(0.7);

    const btnW = 210,
      btnH = 54;
    const btnBg = new Graphics();
    btnBg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 27);
    btnBg.fill({ color: passed ? 0x7c3aed : 0x991b1b });
    btnBg.stroke({ color: passed ? 0xf5d060 : 0xff6b6b, width: 2.5 });
    btn.addChild(btnBg);

    const btnSheen = new Graphics();
    btnSheen.roundRect(-btnW / 2 + 5, -btnH / 2 + 5, btnW - 10, btnH / 2 - 5, 22);
    btnSheen.fill({ color: 0xffffff, alpha: 0.15 });
    btn.addChild(btnSheen);

    const btnLabel = new Text({ text: passed ? 'CONTINUE' : 'TRY AGAIN', style: tsResultButton });
    btnLabel.anchor.set(0.5);
    btn.addChild(btnLabel);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerover', () => gsap.to(btn.scale, { x: 1.07, y: 1.07, duration: 0.12 }));
    btn.on('pointerout', () => gsap.to(btn.scale, { x: 1, y: 1, duration: 0.15 }));
    btn.on('pointerdown', () => {
      sfx.play('buttonPress');
      gsap.killTweensOf(btn.scale);
      this.visible = false;
      this.onContinue?.();
    });
    panel.addChild(btn);

    // ─────────────────────────────────────────────────────────────
    // CHOREOGRAPHY
    // ─────────────────────────────────────────────────────────────
    const tl = gsap.timeline();

    // 0.0 — panel spring in
    panel.scale.set(0.25);
    panel.y += 60;
    tl.to(panel.scale, { x: 1, y: 1, duration: 0.55, ease: 'back.out(2.2)' }, 0);
    tl.to(panel, { y: panel.y - 60, duration: 0.55, ease: 'back.out(2.2)' }, 0);

    // 0.4 — headline pops in with overshoot
    tl.to(titleText.scale, { x: 1, y: 1, duration: 0.38, ease: 'back.out(3.5)' }, 0.4);
    tl.call(() => sfx.play('cascade', { cascadeLevel: 2 }), [], 0.4);

    // 0.65 — unearned stars fade in quietly
    panel.children
      .filter((c): c is Sprite => c instanceof Sprite && c.texture === texStar && !earnedStars.includes(c))
      .forEach((s) => {
        tl.to(s, { alpha: 0.2, duration: 0.25 }, 0.65);
      });

    // 0.7 → 1.1 — earned stars slam in one by one
    earnedStars.forEach((star, i) => {
      const t = 0.7 + i * 0.22;
      tl.to(star, { alpha: 1, duration: 0.01 }, t);
      tl.to(star.scale, { x: 1.5, y: 1.5, duration: 0.14, ease: 'power3.out' }, t);
      tl.to(star.scale, { x: 1, y: 1, duration: 0.22, ease: 'back.out(4)' }, t + 0.14);
      tl.call(() => sfx.play('starEarned', { starIndex: i }), [], t);
    });

    // 1.0 — goals pop in left-to-right
    goalRows.forEach((row, i) => {
      const t = 1.0 + i * 0.1;
      tl.fromTo(row, { alpha: 0, x: row.x - 20 }, { alpha: 1, x: row.x, duration: 0.22, ease: 'power2.out' }, t);
      tl.call(() => sfx.play('scorePop'), [], t);
    });

    // 1.2 — score label + animated counter
    tl.to(scoreLabel, { alpha: 1, duration: 0.2 }, 1.2);
    tl.to(scoreValue, { alpha: 1, duration: 0.2 }, 1.2);
    const counter = { val: 0 };
    tl.to(
      counter,
      {
        val: score,
        duration: Math.min(1.8, 0.8 + score / 20000),
        ease: 'power2.out',
        onUpdate() {
          scoreValue.text = Math.round(counter.val).toLocaleString();
        },
        onComplete() {
          scoreValue.text = score.toLocaleString();
          sfx.play('coinEarned');
        },
      },
      1.3,
    );

    // 1.6 — Roxy flies in from the right
    if (roxy) {
      tl.fromTo(roxy, { x: 220, alpha: 0 }, { x: 130, alpha: 1, duration: 0.45, ease: 'back.out(2)' }, 1.6);
      // Idle float after arrival
      tl.call(
        () => {
          gsap.to(roxy!, {
            y: roxy!.y - 9,
            duration: 1.4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
          gsap.to(roxy!, {
            rotation: 0.04,
            duration: 2.1,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        },
        [],
        2.1,
      );
    }

    // 1.85 — coins pop in
    if (coinsEarned > 0) {
      tl.fromTo(coinsRow.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.3, ease: 'back.out(3)' }, 1.85);
      tl.to(coinsRow, { alpha: 1, duration: 0.2 }, 1.85);
    }

    // 2.0 — confetti burst
    if (passed) {
      tl.call(
        () => {
          this._spawnConfetti(panel);
          sfx.play('confetti');
        },
        [],
        2.0,
      );
    }

    // 2.2 — continue button bounces in
    tl.to(btn, { alpha: 1, duration: 0.25 }, 2.2);
    tl.to(btn.scale, { x: 1, y: 1, duration: 0.38, ease: 'back.out(2.5)' }, 2.2);

    // 2.6 — button attention pulse
    tl.call(
      () => {
        gsap.to(btn.scale, {
          x: 1.05,
          y: 1.05,
          duration: 0.75,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      },
      [],
      2.65,
    );
  }

  private _spawnConfetti(panel: Container): void {
    const colors = [0xf5d060, 0x4ade80, 0xa78bfa, 0xfb923c, 0x60a5fa, 0xf472b6, 0xffffff];
    for (let i = 0; i < 36; i++) {
      const piece = new Graphics();
      const color = colors[i % colors.length];
      const w = 5 + Math.random() * 7;
      const h = Math.random() < 0.5 ? w : w * 2.5;
      piece.rect(-w / 2, -h / 2, w, h);
      piece.fill({ color });
      piece.x = (Math.random() - 0.5) * 320;
      piece.y = -80 + (Math.random() - 0.5) * 80;
      piece.rotation = Math.random() * Math.PI * 2;
      panel.addChild(piece);

      gsap.to(piece, {
        y: piece.y + 320 + Math.random() * 180,
        x: piece.x + (Math.random() - 0.5) * 200,
        rotation: piece.rotation + (Math.random() - 0.5) * Math.PI * 6,
        alpha: 0,
        duration: 1.1 + Math.random() * 0.9,
        ease: 'power1.out',
        delay: Math.random() * 0.5,
        onComplete() {
          panel.removeChild(piece);
        },
      });
    }
  }
}
