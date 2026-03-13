import { Application, Container, Graphics, Text, TextStyle, FillGradient, Sprite, Texture, Assets } from 'pixi.js';
import menuBgLandscapeUrl from '@/assets/sprites/menu-bg-landscape.png';
import menuBgPortraitUrl from '@/assets/sprites/menu-bg-portrait.png';
import { GameConfig } from '@/config/GameConfig';
import { getLevelConfig } from '@/config/LevelConfig';
import { StateMachine, GameState } from '@/core/StateMachine';
import { events } from '@/core/EventBus';
import { SlotGrid } from '@/slots/SlotGrid';
import { CascadeEngine } from '@/slots/CascadeEngine';
import { Match3Engine } from '@/match3/Match3Engine';
import { PlayerState } from '@/models/PlayerState';
import { LevelGoal, LevelDef } from '@/models/Level';
import { HUD } from '@/ui/HUD';
import { SpinButton } from '@/ui/SpinButton';
import { LevelSelect } from '@/ui/LevelSelect';
import { LevelComplete } from '@/ui/LevelComplete';
import { LevelIntro } from '@/ui/LevelIntro';
import { delay, weightedRandom } from '@/utils/MathUtils';
import { getSymbolsForLevel } from '@/config/SymbolConfig';
import { CellData, createCell } from '@/models/Symbol';
import { Howler } from 'howler';
import gsap from 'gsap';
import { MusicManager } from '@/audio/MusicManager';
import { SFXManager } from '@/audio/SFXManager';

export class Game {
  private app: Application;
  private fsm = new StateMachine();
  private player = new PlayerState();

  // Engines
  private cascade = new CascadeEngine();
  private match3 = new Match3Engine();
  private music = new MusicManager();
  private sfx = new SFXManager();

  // Scenes
  private menuScene = new Container();
  private levelSelectScene!: LevelSelect;
  private gameScene = new Container();

  // Game UI
  private slotGrid!: SlotGrid;
  private hud!: HUD;
  private spinButton!: SpinButton;
  private levelComplete!: LevelComplete;
  private levelIntro!: LevelIntro;
  private goalDisplay!: Container;

  // Layout references for relayout
  private gameBg!: Graphics;
  private gameTopGrad!: Graphics;
  private gameAmbientGlow!: Graphics;
  private gameHeader!: Text;
  private _isPortrait: boolean | null = null; // null = not yet laid out

  // Menu scene layout references
  private menuBg!: Sprite;
  private menuBgTextures!: { landscape: Texture; portrait: Texture };
  private menuGlow!: Graphics;
  private menuTitle!: Text;
  private menuSub!: Text;
  private menuRoxyContainer!: Container;
  private menuPlayBtn!: Container;

  // Game state
  private currentLevelDef: LevelDef | null = null;
  private spinsRemaining = 0;
  private movesRemaining = 0;
  private totalScore = 0;
  private cascadeCount = 0;
  private powerUpCount = 0;
  private goals: LevelGoal[] = [];
  private collectCounts: Record<string, number> = {};
  private blockersCleared = 0;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(app: Application) {
    this.app = app;
  }

  /** Must be called after construction and before first resize */
  async init(): Promise<void> {
    // Preload image assets
    await this.loadAssets();

    this.buildMenuScene();
    this.buildLevelSelectScene();
    this.buildGameScene();

    this.fsm.onChange((from, to) => this.onStateChange(from, to));

    // Start at menu
    this.showScene('menu');
  }

  private async loadAssets(): Promise<void> {
    const [landscapeTex, portraitTex] = await Promise.all([
      Assets.load<Texture>(menuBgLandscapeUrl),
      Assets.load<Texture>(menuBgPortraitUrl),
    ]);
    this.menuBgTextures = { landscape: landscapeTex, portrait: portraitTex };
  }

  private buildMenuScene(): void {
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;

    // Background image (switches between landscape/portrait textures)
    const isPortrait = GameConfig.isPortrait;
    this.menuBg = new Sprite(isPortrait ? this.menuBgTextures.portrait : this.menuBgTextures.landscape);
    this.menuBg.width = w;
    this.menuBg.height = h;
    this.menuScene.addChild(this.menuBg);

    // Soft dark vignette behind title/UI area for text readability
    this.menuGlow = new Graphics();
    this.menuGlow.ellipse(w / 2, h * 0.4, w * 0.45, h * 0.35);
    this.menuGlow.fill({ color: 0x0a0018, alpha: 0.45 });
    this.menuScene.addChild(this.menuGlow);

    // Title
    this.menuTitle = new Text({
      text: "Roxy's\nMagic Reels",
      style: new TextStyle({
        fontSize: 48,
        fill: 0xf1c40f,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        align: 'center',
        lineHeight: 56,
        dropShadow: {
          color: 0x9b59b6,
          distance: 3,
          alpha: 1,
        },
      }),
    });
    this.menuTitle.anchor.set(0.5);
    this.menuTitle.x = w / 2;
    this.menuTitle.y = h * 0.22;
    this.menuScene.addChild(this.menuTitle);

    // Subtitle
    this.menuSub = new Text({
      text: 'A Slot + Match-3 Adventure',
      style: new TextStyle({ fontSize: 18, fill: 0xb0a0c0, fontFamily: 'Segoe UI, sans-serif' }),
    });
    this.menuSub.anchor.set(0.5);
    this.menuSub.x = w / 2;
    this.menuSub.y = h * 0.34;
    this.menuScene.addChild(this.menuSub);

    // Roxy placeholder (simple character) — drawn at origin, positioned via container
    this.menuRoxyContainer = new Container();
    this.menuRoxyContainer.x = w / 2;
    this.menuRoxyContainer.y = h * 0.48;
    const roxy = new Graphics();
    // Body
    roxy.circle(0, 0, 30);
    roxy.fill({ color: 0xf39c12 });
    // Hat
    roxy.moveTo(-25, -25);
    roxy.lineTo(0, -65);
    roxy.lineTo(25, -25);
    roxy.closePath();
    roxy.fill({ color: 0x9b59b6 });
    // Eyes
    roxy.circle(-10, -5, 4);
    roxy.circle(10, -5, 4);
    roxy.fill({ color: 0x000000 });
    // Smile
    roxy.arc(0, 5, 10, 0, Math.PI);
    roxy.stroke({ color: 0x000000, width: 2 });
    this.menuRoxyContainer.addChild(roxy);
    this.menuScene.addChild(this.menuRoxyContainer);

    // Play button
    this.menuPlayBtn = new Container();
    this.menuPlayBtn.x = w / 2;
    this.menuPlayBtn.y = h * 0.64;
    const playBg = new Graphics();
    playBg.roundRect(-90, -30, 180, 60, 30);
    playBg.fill({ color: 0x9b59b6 });
    playBg.stroke({ color: 0xf1c40f, width: 3 });
    this.menuPlayBtn.addChild(playBg);

    const playText = new Text({
      text: 'PLAY',
      style: new TextStyle({ fontSize: 26, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'Segoe UI, sans-serif', letterSpacing: 6 }),
    });
    playText.anchor.set(0.5);
    this.menuPlayBtn.addChild(playText);

    this.menuPlayBtn.eventMode = 'static';
    this.menuPlayBtn.cursor = 'pointer';
    this.menuPlayBtn.on('pointerdown', () => {
      this.sfx.play('buttonPress');
      this.music.load();
      this.fsm.transition('LEVEL_SELECT');
    });
    this.menuScene.addChild(this.menuPlayBtn);

    // Starfield on menu
    this.addStarfield(this.menuScene);

    this.app.stage.addChild(this.menuScene);
  }

  private buildLevelSelectScene(): void {
    this.levelSelectScene = new LevelSelect(this.player);
    this.levelSelectScene.visible = false;
    this.levelSelectScene.onLevelChosen = (levelId) => {
      this.sfx.play('buttonPress');
      this.startLevel(levelId);
    };
    this.app.stage.addChild(this.levelSelectScene);
  }

  private buildGameScene(): void {
    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;
    const isPortrait = GameConfig.isPortrait;

    // Gradient background (dark purple → near-black)
    this.gameBg = new Graphics();
    this.gameBg.rect(0, 0, w, h);
    this.gameBg.fill({ color: 0x0d0520 });
    this.gameScene.addChild(this.gameBg);

    // Upper gradient overlay (lighter purple fade)
    this.gameTopGrad = new Graphics();
    this.gameTopGrad.rect(0, 0, w, 200);
    this.gameTopGrad.fill({ color: 0x2a1050, alpha: 0.4 });
    this.gameScene.addChild(this.gameTopGrad);

    // Ambient glow behind slot machine
    this.gameAmbientGlow = new Graphics();
    this.gameAmbientGlow.circle(w / 2, h / 2 - 20, 280);
    this.gameAmbientGlow.fill({ color: 0x9b59b6, alpha: 0.12 });
    this.gameScene.addChild(this.gameAmbientGlow);

    // Starfield
    this.addStarfield(this.gameScene);

    // Header plate: "ROXY'S MAGIC REELS"
    this.gameHeader = new Text({
      text: "ROXY'S MAGIC REELS",
      style: new TextStyle({
        fontSize: 20,
        fill: 0xF5D060,
        fontWeight: 'bold',
        fontFamily: 'Segoe UI, sans-serif',
        letterSpacing: 4,
        dropShadow: { color: 0x000000, distance: 2, alpha: 0.5 },
      }),
    });
    this.gameHeader.anchor.set(0.5);
    this.gameHeader.x = w / 2;
    this.gameHeader.y = 78;
    this.gameHeader.visible = !isPortrait;
    this.gameScene.addChild(this.gameHeader);

    // HUD
    this.hud = new HUD();
    this.hud.setMusicMuted(this.player.musicMuted);
    Howler.mute(this.player.musicMuted);
    if (isPortrait) this.hud.setPortrait(true);
    this.hud.onMusicToggle = (muted) => {
      this.player.setMusicMuted(muted);
      Howler.mute(muted);
    };
    this.gameScene.addChild(this.hud);

    // Slot Grid
    this.slotGrid = new SlotGrid();
    this.slotGrid.x = w / 2;
    this.slotGrid.y = isPortrait ? h / 2 - 60 : h / 2 - 20;
    this.slotGrid.onSwapAttempt = (r1, c1, r2, c2) => this.handleSwap(r1, c1, r2, c2);
    this.slotGrid.onPowerUpTap = (r, c) => this.handlePowerUpActivation(r, c);
    this.gameScene.addChild(this.slotGrid);

    // Spin Button
    this.spinButton = new SpinButton();
    this.spinButton.x = w / 2;
    this.spinButton.y = isPortrait ? h - 55 : h - 45;
    if (isPortrait) this.spinButton.setPortrait(true);
    this.spinButton.onSpin = () => this.handleSpin();
    this.gameScene.addChild(this.spinButton);

    // Goal display
    this.goalDisplay = new Container();
    this.goalDisplay.x = w / 2;
    this.goalDisplay.y = isPortrait ? h - 110 : h - 90;
    this.gameScene.addChild(this.goalDisplay);

    // Level Intro overlay
    this.levelIntro = new LevelIntro();
    this.gameScene.addChild(this.levelIntro);

    // Level Complete overlay
    this.levelComplete = new LevelComplete();
    this.gameScene.addChild(this.levelComplete);

    this.gameScene.visible = false;
    this.app.stage.addChild(this.gameScene);
  }

  /** Reposition all game elements for portrait or landscape layout */
  relayout(isPortrait: boolean): void {
    if (this._isPortrait === isPortrait) return;
    this._isPortrait = isPortrait;

    const w = GameConfig.activeWidth;
    const h = GameConfig.activeHeight;

    // Redraw backgrounds to fit active canvas
    this.gameBg.clear();
    this.gameBg.rect(0, 0, w, h);
    this.gameBg.fill({ color: 0x0d0520 });

    this.gameTopGrad.clear();
    this.gameTopGrad.rect(0, 0, w, 200);
    this.gameTopGrad.fill({ color: 0x2a1050, alpha: 0.4 });

    this.gameAmbientGlow.clear();
    this.gameAmbientGlow.circle(w / 2, h / 2 - 20, 280);
    this.gameAmbientGlow.fill({ color: 0x9b59b6, alpha: 0.12 });

    // Header
    if (isPortrait) {
      this.gameHeader.visible = false; // hide in portrait to save space
    } else {
      this.gameHeader.visible = true;
      this.gameHeader.x = w / 2;
      this.gameHeader.y = 78;
    }

    // Grid — center in the available space
    this.slotGrid.x = w / 2;
    this.slotGrid.y = isPortrait ? h / 2 - 60 : h / 2 - 20;

    // Spin button
    this.spinButton.x = w / 2;
    this.spinButton.y = isPortrait ? h - 55 : h - 45;
    this.spinButton.setPortrait(isPortrait);

    // Goal display
    this.goalDisplay.x = w / 2;
    this.goalDisplay.y = isPortrait ? h - 110 : h - 90;

    // HUD
    this.hud.setPortrait(isPortrait);

    // Overlays — reposition panel centers
    this.levelIntro.relayout(w, h);
    this.levelComplete.relayout(w, h);

    // Menu scene — swap background texture for orientation
    this.menuBg.texture = isPortrait ? this.menuBgTextures.portrait : this.menuBgTextures.landscape;
    this.menuBg.width = w;
    this.menuBg.height = h;

    this.menuGlow.clear();
    this.menuGlow.ellipse(w / 2, h * 0.4, w * 0.45, h * 0.35);
    this.menuGlow.fill({ color: 0x0a0018, alpha: 0.45 });

    this.menuTitle.x = w / 2;
    this.menuTitle.y = h * 0.22;
    this.menuSub.x = w / 2;
    this.menuSub.y = h * 0.34;
    this.menuRoxyContainer.x = w / 2;
    this.menuRoxyContainer.y = h * 0.48;
    this.menuPlayBtn.x = w / 2;
    this.menuPlayBtn.y = h * 0.64;

    // Level select uses activeWidth/activeHeight in build(), so refresh it
    this.levelSelectScene?.refresh();
  }

  /** Add floating starfield particles to a scene */
  private addStarfield(scene: Container): void {
    for (let i = 0; i < 30; i++) {
      const star = new Graphics();
      const size = 1 + Math.random() * 2;
      star.circle(0, 0, size);
      star.fill({ color: 0xffffff, alpha: 0.1 + Math.random() * 0.3 });
      star.x = Math.random() * GameConfig.width;
      star.y = Math.random() * GameConfig.height;
      scene.addChildAt(star, Math.min(scene.children.length, 3));

      // Twinkle
      gsap.to(star, {
        alpha: 0.1 + Math.random() * 0.5,
        duration: 2 + Math.random() * 3,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: Math.random() * 4,
      });

      // Slow drift
      gsap.to(star, {
        y: star.y + 20 + Math.random() * 30,
        duration: 8 + Math.random() * 6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }
  }

  private showScene(scene: 'menu' | 'levelSelect' | 'game'): void {
    this.menuScene.visible = scene === 'menu';
    this.levelSelectScene.visible = scene === 'levelSelect';
    this.gameScene.visible = scene === 'game';

    if (scene === 'levelSelect') {
      this.levelSelectScene.refresh();
    }
  }

  private onStateChange(from: GameState, to: GameState): void {
    switch (to) {
      case 'LEVEL_SELECT':
        this.showScene('levelSelect');
        break;
      case 'IDLE':
        this.showScene('game');
        this.clearHintTimer();
        this.slotGrid.clearHint();
        this.spinButton.setEnabled(this.spinsRemaining > 0);
        this.spinButton.setText(this.spinsRemaining > 0 ? 'SPIN' : 'DONE');
        this.slotGrid.setInteractive(false);
        if (this.spinsRemaining > 0) {
          this.spinButton.playAttention();
          this.hud.showMessage('Press SPIN to start!', 2500);
        }
        break;
      case 'MATCH3_PHASE':
        this.slotGrid.setInteractive(true);
        this.spinButton.setEnabled(this.spinsRemaining > 0);
        this.spinButton.setText(`MOVES: ${this.movesRemaining}`);
        this.hud.showMessage('Drag to swap symbols!', 2000);
        this.startHintTimer();
        this.slotGrid.startPowerUpGlow();
        // Check for dead board (no valid swaps)
        this.checkForDeadBoard();
        break;
    }
  }

  private async startLevel(levelId: number): Promise<void> {
    const def = getLevelConfig(levelId);
    if (!def) return;

    this.currentLevelDef = def;
    this.spinsRemaining = def.spins;
    this.movesRemaining = def.movesPerSpin;
    this.totalScore = 0;
    this.cascadeCount = 0;
    this.powerUpCount = 0;
    this.blockersCleared = 0;
    this.collectCounts = {};
    this.goals = def.goals.map(g => ({ ...g, current: 0 }));

    this.hud.setLevel(def.id);
    this.hud.setScore(0);
    this.hud.setMoves(def.movesPerSpin);
    this.hud.setCoins(this.player.coins);
    this.hud.setMultiplier(1);
    this.updateGoalDisplay();

    // Start music (lead vocals only, stems layer in as score grows)
    this.music.start();

    // Generate a placeholder grid (will be replaced by auto-spin)
    this.match3.setLevel(levelId);
    const gridData = this.slotGrid.generateGrid(levelId);
    this.match3.setGrid(gridData);

    // Show game scene before intro so it's visible behind the overlay
    this.showScene('game');

    // Show level intro overlay if configured
    if (def.intro) {
      this.sfx.play('levelIntro');
      await this.levelIntro.show(def.intro);
    }

    // Auto-spin the first reel immediately — player gets right into the action
    this.autoSpin();
  }

  /** Perform an automatic spin (used for first spin on level start) */
  private async autoSpin(): Promise<void> {
    if (this.spinsRemaining <= 0) return;

    this.spinsRemaining--;
    this.movesRemaining = this.currentLevelDef!.movesPerSpin;
    this.hud.setMoves(this.movesRemaining);

    this.fsm.transition('SPINNING');
    this.spinButton.setEnabled(false);
    this.spinButton.setText('SPINNING...');
    this.sfx.play('reelSpin');

    // Schedule per-column reel-stop thuds
    for (let c = 0; c < GameConfig.cols; c++) {
      setTimeout(() => this.sfx.play('reelStop', { pitch: -c }), 500 + c * 200);
    }

    try {
      await this.slotGrid.animateReelSpin(() => {
        const gridData = this.slotGrid.generateGrid(this.currentLevelDef!.id);
        if (this.currentLevelDef!.hasBlockers) {
          this.placeBlockers(gridData, this.currentLevelDef!);
        }
        this.match3.setGrid(gridData);
      });
    } catch (err) {
      console.error('Auto-spin error:', err);
      const gridData = this.slotGrid.generateGrid(this.currentLevelDef!.id);
      if (this.currentLevelDef!.hasBlockers) {
        this.placeBlockers(gridData, this.currentLevelDef!);
      }
      this.match3.setGrid(gridData);
    }

    // Cascade resolve phase
    this.fsm.transition('CASCADE_RESOLVE');
    await this.resolveCascades();

    // Into match-3 phase
    this.fsm.transition('MATCH3_PHASE');
  }

  private async handleSpin(): Promise<void> {
    if (this.spinsRemaining <= 0) return;
    if (this.fsm.state !== 'IDLE' && this.fsm.state !== 'MATCH3_PHASE') return;

    // If re-spinning from MATCH3_PHASE, clean up match phase state
    if (this.fsm.state === 'MATCH3_PHASE') {
      this.clearHintTimer();
      this.slotGrid.clearHint();
      this.slotGrid.stopPowerUpGlow();
      this.slotGrid.setInteractive(false);
    }

    this.spinsRemaining--;
    this.movesRemaining = this.currentLevelDef!.movesPerSpin;
    this.hud.setMoves(this.movesRemaining);

    this.fsm.transition('SPINNING');
    this.spinButton.setEnabled(false);
    this.sfx.play('reelSpin');

    // Schedule per-column reel-stop thuds to align with bounce-in timing
    for (let c = 0; c < GameConfig.cols; c++) {
      setTimeout(() => this.sfx.play('reelStop', { pitch: -c }), 500 + c * 200);
    }

    try {
      // Unified reel spin: scroll down old, generate new, scroll in new
      await this.slotGrid.animateReelSpin(() => {
        const gridData = this.slotGrid.generateGrid(this.currentLevelDef!.id);
        // Place blockers on every spin so the mechanic persists
        if (this.currentLevelDef!.hasBlockers) {
          this.placeBlockers(gridData, this.currentLevelDef!);
        }
        this.match3.setGrid(gridData);
      });
    } catch (err) {
      console.error('Spin error:', err);
      const gridData = this.slotGrid.generateGrid(this.currentLevelDef!.id);
      if (this.currentLevelDef!.hasBlockers) {
        this.placeBlockers(gridData, this.currentLevelDef!);
      }
      this.match3.setGrid(gridData);
    }

    // Cascade resolve phase - auto-resolve pre-existing matches
    this.fsm.transition('CASCADE_RESOLVE');
    await this.resolveCascades();

    // Transition to match-3 phase
    this.fsm.transition('MATCH3_PHASE');
  }

  private async resolveCascades(): Promise<void> {
    let cascadeLevel = 0;
    let grid = this.match3.getGrid();
    let matches = this.cascade.findMatches(grid);

    if (matches.length > 0) {
      this.hud.showMessage('Auto-match bonus!', 1500);
      await delay(400);
    }

    while (matches.length > 0) {
      const multiplier = this.cascade.getMultiplier(cascadeLevel);
      this.hud.setMultiplier(multiplier);
      if (cascadeLevel > 0) {
        this.sfx.play('multiplier');
      }

      // Score matches
      let roundScore = 0;
      for (const match of matches) {
        const baseScore = match.cells.length >= 5
          ? GameConfig.match5Score
          : match.cells.length >= 4
            ? GameConfig.match4Score
            : GameConfig.match3Score;
        const score = baseScore * multiplier;
        roundScore += score;
        this.totalScore += score;
        this.cascadeCount++;

        // Track collections
        for (const cell of match.cells) {
          const sym = grid[cell.row]?.[cell.col]?.symbol;
          if (sym) {
            this.collectCounts[sym.id] = (this.collectCounts[sym.id] || 0) + 1;
          }
        }
      }
      this.hud.setScore(this.totalScore);
      this.updateGoalProgress();

      // Play match SFX based on biggest match size
      for (const match of matches) {
        const len = match.cells.length;
        if (len >= 5) this.sfx.play('match5');
        else if (len >= 4) this.sfx.play('match4');
        else this.sfx.play('match3');
      }
      this.sfx.play('confetti');

      // Animate clearing with confetti and floating score
      const allCells = matches.flatMap(m => m.cells);
      await this.slotGrid.animateClear(allCells, roundScore);

      // Remove from data
      for (const pos of allCells) {
        grid[pos.row][pos.col] = null;
      }

      // Damage adjacent blockers
      const blockerResult = this.match3.damageAdjacentBlockers(allCells);
      this.blockersCleared += blockerResult.destroyed.length;
      for (const _pos of blockerResult.destroyed) {
        this.sfx.play('blockerBreak');
      }
      for (const _pos of blockerResult.damaged) {
        this.sfx.play('blockerCrack');
      }
      // Remove destroyed blockers from grid
      for (const pos of blockerResult.destroyed) {
        grid[pos.row][pos.col] = null;
      }
      this.updateGoalProgress();

      // Gravity
      this.applyGravityToGrid(grid);

      // Fill empty
      this.fillGridEmpty(grid);

      this.match3.setGrid(grid);

      // Animate the gravity drop (new cells fall in)
      await this.slotGrid.animateGravityDrop(grid);

      cascadeLevel++;
      matches = this.cascade.findMatches(grid);

      if (matches.length > 0) {
        const effects = this.slotGrid.getEffects();
        effects.showCascadeBurst(0, 0, this.cascade.getMultiplier(cascadeLevel));
        this.sfx.play('cascade', { cascadeLevel });
        this.hud.showMessage(`Cascade x${cascadeLevel + 1}!`, 1000);
        await delay(300);
      }
    }

    this.hud.setMultiplier(1);
  }

  private async handleSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    if (this.fsm.state !== 'MATCH3_PHASE' || this.movesRemaining <= 0) return;

    // Clear hint on any swap attempt and restart timer
    this.slotGrid.clearHint();
    this.clearHintTimer();

    // Disable interaction during swap animation
    this.slotGrid.setInteractive(false);

    const isValid = this.match3.isValidSwap(r1, c1, r2, c2);

    if (!isValid) {
      // Animate invalid swap (bounce back)
      this.sfx.play('invalidSwap');
      await this.slotGrid.animateInvalidSwap(r1, c1, r2, c2);
      this.hud.showMessage('No match!', 800);
      this.slotGrid.setInteractive(true);
      return;
    }

    // Animate the swap visually
    this.sfx.play('swap');
    await this.slotGrid.animateSwap(r1, c1, r2, c2);

    // Execute the swap in the engine
    const result = await this.match3.executeSwap(r1, c1, r2, c2);

    this.movesRemaining--;
    this.hud.setMoves(this.movesRemaining);
    this.spinButton.setText(`MOVES: ${this.movesRemaining}`);

    // Add score
    this.totalScore += result.score;
    this.hud.setScore(this.totalScore);
    this.cascadeCount += result.cascades;
    this.powerUpCount += result.powerUpsCreated.length;
    this.blockersCleared += result.blockersDestroyed;

    // Track collections from match-3 phase
    for (const match of result.matches) {
      for (const cell of match.cells) {
        this.collectCounts[match.symbolId] = (this.collectCounts[match.symbolId] || 0) + 1;
      }
    }

    this.updateGoalProgress();

    // Play match SFX for swap results
    for (const match of result.matches) {
      const len = match.cells.length;
      if (len >= 5) this.sfx.play('match5');
      else if (len >= 4) this.sfx.play('match4');
      else this.sfx.play('match3');
    }
    if (result.powerUpsCreated.length > 0) {
      this.sfx.play('powerUpCreate');
    }

    // Show confetti and score for match-3 swap results
    const grid = this.match3.getGrid();
    if (result.score > 0) {
      this.sfx.play('scorePop');
      this.sfx.play('confetti');
      const effects = this.slotGrid.getEffects();
      const pos = this.slotGrid.getCellPosition(r1, c1);
      if (pos) {
        effects.showFloatingScore(pos.x, pos.y, result.score);
        effects.spawnConfetti([pos], 0xf1c40f);
      }
    }

    // Update grid visual with gravity animation
    await this.slotGrid.animateGravityDrop(this.match3.getGrid());

    if (result.cascades > 1) {
      this.hud.showMessage(`${result.cascades}x Cascade! +${result.score}`, 1500);
    }

    // Re-enable interaction
    this.slotGrid.setInteractive(true);
    this.startHintTimer();

    // Update spin button to reflect remaining moves
    this.spinButton.setText(`MOVES: ${this.movesRemaining}`);

    // Check if moves depleted
    if (this.movesRemaining <= 0) {
      // If power-ups remain, let the player activate them for free
      if (this.hasPowerUpsOnBoard()) {
        this.hud.showMessage('Tap power-ups to activate!', 2500);
        this.spinButton.setText('TAP POWER-UPS!');
        this.slotGrid.startPowerUpGlow();
        // Keep grid interactive for power-up taps (swaps still blocked by movesRemaining check)
      } else {
        await delay(500);
        this.endMatchPhase();
      }
    } else {
      // Check for dead board after swap resolves
      this.checkForDeadBoard();
    }
  }

  private checkForDeadBoard(): void {
    if (this.fsm.state !== 'MATCH3_PHASE') return;
    const hint = this.match3.findHint();
    if (hint) return; // Valid moves exist, all good

    // No valid swaps on the board
    this.slotGrid.setInteractive(false);
    this.clearHintTimer();
    this.slotGrid.clearHint();

    if (this.spinsRemaining > 0) {
      // Player can re-spin to get a new board
      this.hud.showMessage('No moves available! Press SPIN', 3000);
      this.sfx.play('invalidSwap');
      this.spinButton.setEnabled(true);
      this.spinButton.setText('SPIN');
      this.spinButton.playAttention();
    } else {
      // No spins and no moves — end the match phase
      this.hud.showMessage('No moves left!', 1500);
      this.sfx.play('invalidSwap');
      setTimeout(() => this.endMatchPhase(), 1500);
    }
  }

  /** Check if any power-ups exist on the current board */
  private hasPowerUpsOnBoard(): boolean {
    const grid = this.match3.getGrid();
    for (let r = 0; r < GameConfig.rows; r++) {
      for (let c = 0; c < GameConfig.cols; c++) {
        if (grid[r]?.[c]?.powerUp) return true;
      }
    }
    return false;
  }

  private async handlePowerUpActivation(row: number, col: number): Promise<void> {
    if (this.fsm.state !== 'MATCH3_PHASE') return;

    const grid = this.match3.getGrid();
    const cell = grid[row]?.[col];
    if (!cell?.powerUp) return;

    const powerUpType = cell.powerUp;

    // Disable interaction during activation
    this.slotGrid.setInteractive(false);
    this.clearHintTimer();
    this.slotGrid.clearHint();

    this.sfx.play('powerUpActivate');

    // Activate the power-up in the engine
    const result = this.match3.activatePowerUp(row, col);
    if (result.cleared.length === 0) {
      this.slotGrid.setInteractive(true);
      return;
    }

    // Show power-up activation effect
    const effects = this.slotGrid.getEffects();
    const clearedPositions = result.cleared
      .map(p => this.slotGrid.getCellPosition(p.row, p.col))
      .filter((p): p is { x: number; y: number } => p !== null);
    const originPos = this.slotGrid.getCellPosition(row, col);

    if (powerUpType === 'blast' && originPos) {
      const isRow = result.cleared.every(c => c.row === row);
      effects.showBlastEffect(clearedPositions, isRow);
    } else if (powerUpType === 'bomb' && originPos) {
      effects.showBombEffect(originPos.x, originPos.y);
    } else if (powerUpType === 'rainbow') {
      effects.showRainbowEffect(clearedPositions);
    }

    // Costs 1 move only if player still has moves; free when moves are depleted
    if (this.movesRemaining > 0) {
      this.movesRemaining--;
      this.hud.setMoves(this.movesRemaining);
      this.spinButton.setText(`MOVES: ${this.movesRemaining}`);
    }

    // Track collections from cleared cells
    for (const pos of result.cleared) {
      const clearedCell = grid[pos.row]?.[pos.col]; // already null, but we tracked before
    }

    // Score
    this.totalScore += result.score;
    this.hud.setScore(this.totalScore);
    this.powerUpCount++;

    // Damage adjacent blockers
    const blockerResult = this.match3.damageAdjacentBlockers(result.cleared);
    this.blockersCleared += blockerResult.destroyed.length;
    for (const pos of blockerResult.destroyed) {
      this.sfx.play('blockerBreak');
    }
    for (const pos of blockerResult.damaged) {
      this.sfx.play('blockerCrack');
    }

    this.updateGoalProgress();

    // Animate clear
    this.sfx.play('confetti');
    await this.slotGrid.animateClear(result.cleared, result.score);

    // Apply gravity and fill
    const updatedGrid = this.match3.getGrid();
    this.applyGravityToGrid(updatedGrid);
    this.fillGridEmpty(updatedGrid);
    this.match3.setGrid(updatedGrid);
    await this.slotGrid.animateGravityDrop(updatedGrid);

    // Resolve any cascades that form after gravity
    await this.resolveCascades();

    // Re-enable interaction
    this.slotGrid.setInteractive(true);
    this.startHintTimer();

    this.spinButton.setText(this.movesRemaining > 0 ? `MOVES: ${this.movesRemaining}` : 'TAP POWER-UPS!');

    // Check if moves depleted
    if (this.movesRemaining <= 0) {
      // If more power-ups remain on the board, let the player keep tapping
      if (this.hasPowerUpsOnBoard()) {
        this.hud.showMessage('Tap power-ups to activate!', 2000);
        this.slotGrid.startPowerUpGlow();
      } else {
        await delay(500);
        this.endMatchPhase();
      }
    } else {
      this.checkForDeadBoard();
    }
  }

  private placeBlockers(grid: (CellData | null)[][], def: import('@/models/Level').LevelDef): void {
    // Build a list of blocker batches (primary + optional secondary type)
    const batches: { count: number; health: number }[] = [];
    const primaryCount = def.blockerCount ?? 0;
    const primaryType = def.blockerType ?? 'ice';
    if (primaryCount > 0) {
      batches.push({ count: primaryCount, health: primaryType === 'ice' ? 1 : 2 });
    }
    const secondaryCount = def.blockerCountSecondary ?? 0;
    const secondaryType = def.blockerTypeSecondary ?? 'ice';
    if (secondaryCount > 0) {
      batches.push({ count: secondaryCount, health: secondaryType === 'ice' ? 1 : 2 });
    }

    const totalCount = batches.reduce((s, b) => s + b.count, 0);
    if (totalCount === 0) return;

    // Collect valid positions (avoid corners for better gameplay)
    const positions: { r: number; c: number }[] = [];
    for (let r = 0; r < GameConfig.rows; r++) {
      for (let c = 0; c < GameConfig.cols; c++) {
        const isCorner = (r === 0 || r === GameConfig.rows - 1) && (c === 0 || c === GameConfig.cols - 1);
        if (!isCorner && grid[r][c]) {
          positions.push({ r, c });
        }
      }
    }

    // Shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Place blockers from each batch sequentially
    let idx = 0;
    for (const batch of batches) {
      const toPlace = Math.min(batch.count, positions.length - idx);
      for (let i = 0; i < toPlace; i++) {
        const { r, c } = positions[idx];
        const cell = grid[r][c];
        if (cell) {
          cell.isBlocker = true;
          cell.blockerHealth = batch.health;
        }
        idx++;
      }
    }
  }

  private endMatchPhase(): void {
    this.clearHintTimer();
    this.slotGrid.clearHint();
    this.slotGrid.stopPowerUpGlow();
    this.slotGrid.setInteractive(false);
    this.fsm.transition('SCORING');

    this.hud.showMessage(`Spin complete! Score: ${this.totalScore}`, 1500);

    setTimeout(() => {
      this.fsm.transition('LEVEL_CHECK');
      this.checkLevelCompletion();
    }, 1500);
  }

  private checkLevelCompletion(): void {
    const allGoalsMet = this.goals.every(g => g.current >= g.target);

    if (allGoalsMet || this.spinsRemaining <= 0) {
      const passed = allGoalsMet;
      const def = this.currentLevelDef!;
      const stars = passed
        ? def.starThresholds.filter(t => this.totalScore >= t).length
        : 0;
      const coinsEarned = passed ? 100 + stars * 50 : 0;

      if (passed) {
        this.player.completeLevel(def.id, this.totalScore, stars);
        this.player.addCoins(coinsEarned);
        this.sfx.play('levelComplete');
        this.sfx.play('coinEarned');
        // Stagger star sounds
        for (let s = 0; s < stars; s++) {
          setTimeout(() => this.sfx.play('starEarned', { starIndex: s }), 400 + s * 300);
        }
      } else {
        this.sfx.play('levelFailed');
      }

      this.levelComplete.show({
        levelId: def.id,
        score: this.totalScore,
        stars,
        coinsEarned,
        passed,
      });

      this.levelComplete.onContinue = () => {
        this.sfx.play('buttonPress');
        this.music.stop();
        if (passed) {
          this.fsm.transition('LEVEL_SELECT');
        } else {
          this.startLevel(def.id);
        }
      };
    } else {
      // More spins available
      this.fsm.transition('IDLE');
    }
  }

  private updateGoalProgress(): void {
    for (const goal of this.goals) {
      switch (goal.type) {
        case 'score':
          goal.current = this.totalScore;
          break;
        case 'collect':
          goal.current = this.collectCounts[goal.symbolId!] || 0;
          break;
        case 'cascades':
          goal.current = this.cascadeCount;
          break;
        case 'power_ups':
          goal.current = this.powerUpCount;
          break;
        case 'clear_blockers':
          goal.current = this.blockersCleared;
          break;
      }
    }
    this.updateGoalDisplay();

    // Update music stems based on score progress toward 3-star threshold
    if (this.currentLevelDef) {
      const maxScore = this.currentLevelDef.starThresholds[2];
      this.music.setProgress(Math.min(1, this.totalScore / maxScore));
    }
  }

  private updateGoalDisplay(): void {
    this.goalDisplay.removeChildren();

    const goalTexts = this.goals.map((g, i) => {
      let text = '';
      switch (g.type) {
        case 'score': text = `Score: ${g.current}/${g.target}`; break;
        case 'collect': text = `${g.symbolId}: ${g.current}/${g.target}`; break;
        case 'cascades': text = `Cascades: ${g.current}/${g.target}`; break;
        case 'power_ups': text = `Power-ups: ${g.current}/${g.target}`; break;
        case 'clear_blockers': text = `Blockers: ${g.current}/${g.target}`; break;
      }
      const done = g.current >= g.target;
      const t = new Text({
        text,
        style: new TextStyle({
          fontSize: 13,
          fill: done ? 0x2ecc71 : 0xb0a0c0,
          fontFamily: 'Segoe UI, sans-serif',
        }),
      });
      t.anchor.set(0.5);
      t.y = i * 18;
      return t;
    });

    goalTexts.forEach(t => this.goalDisplay.addChild(t));
  }

  private applyGravityToGrid(grid: (CellData | null)[][]): void {
    for (let c = 0; c < GameConfig.cols; c++) {
      let writeRow = GameConfig.rows - 1;
      for (let r = GameConfig.rows - 1; r >= 0; r--) {
        const cell = grid[r][c];
        if (cell?.isBlocker) {
          // Blocker stays fixed — restart write pointer above it
          writeRow = r - 1;
          continue;
        }
        if (cell) {
          if (r !== writeRow) {
            grid[writeRow][c] = cell;
            cell.row = writeRow;
            grid[r][c] = null;
          }
          writeRow--;
        }
      }
    }
  }

  private fillGridEmpty(grid: (CellData | null)[][]): void {
    const symbols = getSymbolsForLevel(this.currentLevelDef!.id);
    for (let r = 0; r < GameConfig.rows; r++) {
      for (let c = 0; c < GameConfig.cols; c++) {
        if (!grid[r][c]) {
          grid[r][c] = createCell(weightedRandom(symbols), r, c);
        }
      }
    }
  }

  private startHintTimer(): void {
    this.clearHintTimer();
    this.hintTimer = setTimeout(() => {
      if (this.fsm.state !== 'MATCH3_PHASE') return;
      const hint = this.match3.findHint();
      if (hint) {
        this.slotGrid.showHint(hint.r1, hint.c1, hint.r2, hint.c2);
      }
    }, 5000);
  }

  private clearHintTimer(): void {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
  }
}
