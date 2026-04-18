import { Container, Graphics, Text, FillGradient, Sprite, Texture, Rectangle } from 'pixi.js';
import { tsButton } from '@/config/Typography';
import { GameConfig } from '@/config/GameConfig';
import { coverSprite } from '@/utils/MathUtils';
import gsap from 'gsap';

/** Menu screen — AI-generated background + interactive PLAY button */
export class MenuScreen extends Container {
  // Background
  private bg!: Sprite;
  private bgTextures: { landscape: Texture; portrait: Texture };

  // Play button
  private playBtn = new Container();
  private playBtnGlow!: Graphics;
  private playBtnShadow!: Graphics;
  private playBtnBody!: Graphics;
  private playBtnGloss!: Graphics;
  private playBtnShimmer!: Graphics;
  private playBtnText!: Text;

  // Audio toggles
  private audioControls!: Container;
  private musicBtn!: Container;
  private musicBtnIcon!: Graphics;
  private sfxBtn!: Container;
  private sfxBtnIcon!: Graphics;
  private _musicMuted = false;
  private _sfxMuted = false;

  // State
  private entrancePlayed = false;
  private idleAnimationsStarted = false;

  // Callbacks
  onPlay: (() => void) | null = null;
  onMusicToggle: ((muted: boolean) => void) | null = null;
  onSfxToggle: ((muted: boolean) => void) | null = null;

  constructor(bgTextures: { landscape: Texture; portrait: Texture }) {
    super();
    this.bgTextures = bgTextures;

    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;
    const isPortrait = GameConfig.isPortrait;

    // Background image — cover-scaled to fill full physical screen
    this.bg = new Sprite(isPortrait ? bgTextures.portrait : bgTextures.landscape);
    const { x: bgX, y: bgY, w: bgW, h: bgH } = GameConfig.bgBounds;
    coverSprite(this.bg, bgX, bgY, bgW, bgH);
    this.addChild(this.bg);

    // Play button
    this.buildPlayButton(w, h, isPortrait);

    // Audio toggle buttons
    this.buildAudioControls(w);
  }

  // --- Build methods ---

  private buildPlayButton(w: number, h: number, isPortrait: boolean): void {
    if (this.playBtn.parent) this.removeChild(this.playBtn);
    this.playBtn = new Container();

    const btnW = 220;
    const btnH = 64;
    const btnR = 32;

    // Outer glow ring
    this.playBtnGlow = new Graphics();
    this.playBtnGlow.roundRect(-btnW / 2 - 8, -btnH / 2 - 8, btnW + 16, btnH + 16, btnR + 4);
    this.playBtnGlow.fill({ color: 0x2ecc71, alpha: 0.25 });
    this.playBtn.addChild(this.playBtnGlow);

    // Drop shadow
    this.playBtnShadow = new Graphics();
    this.playBtnShadow.roundRect(-btnW / 2, -btnH / 2 + 3, btnW, btnH, btnR);
    this.playBtnShadow.fill({ color: 0x000000, alpha: 0.35 });
    this.playBtn.addChild(this.playBtnShadow);

    // Emerald-to-teal gradient body
    const emeraldGradient = new FillGradient({
      type: 'linear',
      colorStops: [
        { offset: 0, color: '#5BD28C' },
        { offset: 0.5, color: '#27AE60' },
        { offset: 1, color: '#1A7A42' },
      ],
      textureSpace: 'local',
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
    });

    this.playBtnBody = new Graphics();
    this.playBtnBody.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnR);
    this.playBtnBody.fill(emeraldGradient);
    // Gold stroke border
    this.playBtnBody.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnR);
    this.playBtnBody.stroke({ color: 0xd4af37, width: 3 });
    this.playBtn.addChild(this.playBtnBody);

    // Glass-like gloss highlight (upper half)
    this.playBtnGloss = new Graphics();
    this.playBtnGloss.roundRect(-btnW / 2 + 4, -btnH / 2 + 2, btnW - 8, btnH * 0.4, btnR - 4);
    this.playBtnGloss.fill({ color: 0xffffff, alpha: 0.15 });
    this.playBtn.addChild(this.playBtnGloss);

    // Gem accents (left and right diamonds)
    for (const side of [-1, 1]) {
      const gem = new Graphics();
      const gx = side * (btnW / 2 - 16);
      const gs = 6;
      gem.moveTo(gx, -gs);
      gem.lineTo(gx + gs, 0);
      gem.lineTo(gx, gs);
      gem.lineTo(gx - gs, 0);
      gem.closePath();
      gem.fill({ color: 0xf5d060 });
      gem.stroke({ color: 0x8b7332, width: 1 });
      this.playBtn.addChild(gem);
    }

    // Shimmer bar (masked to button shape)
    this.playBtnShimmer = new Graphics();
    this.playBtnShimmer.rect(-8, -btnH / 2, 16, btnH);
    this.playBtnShimmer.fill({ color: 0xffffff, alpha: 0.18 });
    this.playBtnShimmer.x = -btnW / 2 - 20;
    this.playBtn.addChild(this.playBtnShimmer);

    // Mask for shimmer
    const shimmerMask = new Graphics();
    shimmerMask.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnR);
    shimmerMask.fill({ color: 0xffffff });
    this.playBtn.addChild(shimmerMask);
    this.playBtnShimmer.mask = shimmerMask;

    // Button text
    this.playBtnText = new Text({ text: 'PLAY', style: tsButton });
    this.playBtnText.anchor.set(0.5);
    this.playBtn.addChild(this.playBtnText);

    // Position — lower area where the dark ground is
    this.playBtn.x = w / 2;
    this.playBtn.y = isPortrait ? h * 0.88 : h * 0.85;

    // Interactivity
    this.playBtn.eventMode = 'static';
    this.playBtn.cursor = 'pointer';
    this.playBtn.hitArea = new Rectangle(-btnW / 2, -btnH / 2, btnW, btnH);

    this.playBtn.on('pointerdown', () => {
      if (this.onPlay) {
        const tl = gsap.timeline();
        tl.to(this.playBtn.scale, { x: 0.92, y: 0.92, duration: 0.08, ease: 'power2.in' });
        tl.to(this.playBtn.scale, { x: 1.08, y: 1.08, duration: 0.12, ease: 'back.out' });
        tl.to(this.playBtn.scale, { x: 1, y: 1, duration: 0.1 });
        this.onPlay();
      }
    });

    this.playBtn.on('pointerover', () => {
      gsap.to(this.playBtn.scale, { x: 1.05, y: 1.05, duration: 0.2, ease: 'back.out' });
      gsap.to(this.playBtnGlow, { alpha: 0.5, duration: 0.2 });
    });

    this.playBtn.on('pointerout', () => {
      gsap.to(this.playBtn.scale, { x: 1, y: 1, duration: 0.2 });
      gsap.to(this.playBtnGlow, { alpha: 0.25, duration: 0.2 });
    });

    this.addChild(this.playBtn);
  }

  private buildAudioControls(w: number): void {
    this.audioControls = new Container();

    // Music button (top-right)
    this.musicBtn = new Container();
    this.musicBtn.x = w - 30;
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
    this.audioControls.addChild(this.musicBtn);

    // SFX button (left of music)
    this.sfxBtn = new Container();
    this.sfxBtn.x = w - 70;
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
    this.audioControls.addChild(this.sfxBtn);

    this.addChild(this.audioControls);
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

  private drawSfxIcon(muted: boolean): void {
    const g = this.sfxBtnIcon;
    g.clear();
    const color = muted ? 0x666666 : 0xb0a0c0;
    g.moveTo(-8, -6); g.lineTo(-8, 6);   g.stroke({ color, width: 2 });
    g.moveTo(-8, -6); g.lineTo(-2, -6);  g.stroke({ color, width: 2 });
    g.moveTo(-8, 0);  g.lineTo(-3, 0);   g.stroke({ color, width: 2 });
    g.moveTo(1, -6);  g.lineTo(9, 6);    g.stroke({ color, width: 2 });
    g.moveTo(9, -6);  g.lineTo(1, 6);    g.stroke({ color, width: 2 });
    if (muted) {
      g.moveTo(-10, 8); g.lineTo(11, -8); g.stroke({ color: 0xe74c3c, width: 2 });
    }
  }

  setMusicMuted(muted: boolean): void {
    this._musicMuted = muted;
    this.drawMusicIcon(muted);
  }

  setSfxMuted(muted: boolean): void {
    this._sfxMuted = muted;
    this.drawSfxIcon(muted);
  }

  // --- Entrance animation ---

  async playEntrance(): Promise<void> {
    const isFirstTime = !this.entrancePlayed;
    this.entrancePlayed = true;

    // Background fades in
    this.bg.alpha = 0;

    // Audio controls fade in with background
    this.audioControls.alpha = 0;

    // Button starts hidden below
    this.playBtn.alpha = 0;
    this.playBtn.y += isFirstTime ? 60 : 20;
    this.playBtn.scale.set(isFirstTime ? 0.5 : 0.8);

    const targetBtnY = this.playBtn.y - (isFirstTime ? 60 : 20);

    const tl = gsap.timeline();

    // Background + audio controls fade in
    tl.to(this.bg, { alpha: 1, duration: isFirstTime ? 0.6 : 0.3 }, 0);
    tl.to(this.audioControls, { alpha: 1, duration: isFirstTime ? 0.6 : 0.3 }, 0);

    // Play button bounces in
    tl.to(
      this.playBtn,
      {
        y: targetBtnY,
        alpha: 1,
        duration: isFirstTime ? 0.5 : 0.25,
        ease: 'back.out(1.7)',
      },
      isFirstTime ? 0.4 : 0.15,
    );
    tl.to(
      this.playBtn.scale,
      {
        x: 1,
        y: 1,
        duration: isFirstTime ? 0.5 : 0.25,
        ease: 'back.out(1.7)',
      },
      isFirstTime ? 0.4 : 0.15,
    );

    await tl.then();

    // Start idle animations after entrance
    if (!this.idleAnimationsStarted) {
      this.startIdleAnimations();
      this.idleAnimationsStarted = true;
    }
  }

  private startIdleAnimations(): void {
    // Button glow ring pulse
    gsap.to(this.playBtnGlow, {
      alpha: 0.45,
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });

    // Button shimmer sweep
    gsap.fromTo(
      this.playBtnShimmer,
      { x: -130 },
      {
        x: 130,
        duration: 1.5,
        repeat: -1,
        repeatDelay: 4,
        ease: 'power1.inOut',
      },
    );
  }

  // --- Layout ---

  relayout(isPortrait: boolean): void {
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;

    // Background — re-cover-scale for new orientation
    this.bg.texture = isPortrait ? this.bgTextures.portrait : this.bgTextures.landscape;
    const { x: bgX, y: bgY, w: bgW, h: bgH } = GameConfig.bgBounds;
    coverSprite(this.bg, bgX, bgY, bgW, bgH);

    // Play button
    this.playBtn.x = w / 2;
    this.playBtn.y = isPortrait ? h * 0.88 : h * 0.85;

    // Audio controls — anchor to top-right
    this.musicBtn.x = w - 30;
    this.sfxBtn.x = w - 70;
  }
}
