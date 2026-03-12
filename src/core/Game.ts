import { Application, Container, Graphics, Text, TextStyle, FillGradient } from 'pixi.js';
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
import { delay, weightedRandom } from '@/utils/MathUtils';
import { getSymbolsForLevel } from '@/config/SymbolConfig';
import { CellData, createCell } from '@/models/Symbol';
import gsap from 'gsap';

export class Game {
  private app: Application;
  private fsm = new StateMachine();
  private player = new PlayerState();

  // Engines
  private cascade = new CascadeEngine();
  private match3 = new Match3Engine();

  // Scenes
  private menuScene = new Container();
  private levelSelectScene!: LevelSelect;
  private gameScene = new Container();

  // Game UI
  private slotGrid!: SlotGrid;
  private hud!: HUD;
  private spinButton!: SpinButton;
  private levelComplete!: LevelComplete;
  private goalDisplay!: Container;

  // Game state
  private currentLevelDef: LevelDef | null = null;
  private spinsRemaining = 0;
  private movesRemaining = 0;
  private totalScore = 0;
  private cascadeCount = 0;
  private powerUpCount = 0;
  private goals: LevelGoal[] = [];
  private collectCounts: Record<string, number> = {};
  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(app: Application) {
    this.app = app;
    this.init();
  }

  private init(): void {
    this.buildMenuScene();
    this.buildLevelSelectScene();
    this.buildGameScene();

    this.fsm.onChange((from, to) => this.onStateChange(from, to));

    // Start at menu
    this.showScene('menu');
  }

  private buildMenuScene(): void {
    // Gradient background
    const bg = new Graphics();
    bg.rect(0, 0, GameConfig.width, GameConfig.height);
    bg.fill({ color: 0x1a0a2e });
    this.menuScene.addChild(bg);

    // Ambient glow behind center
    const glow = new Graphics();
    glow.circle(GameConfig.width / 2, 350, 250);
    glow.fill({ color: 0x9b59b6, alpha: 0.1 });
    this.menuScene.addChild(glow);

    // Title
    const title = new Text({
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
    title.anchor.set(0.5);
    title.x = GameConfig.width / 2;
    title.y = 180;
    this.menuScene.addChild(title);

    // Subtitle
    const sub = new Text({
      text: 'A Slot + Match-3 Adventure',
      style: new TextStyle({ fontSize: 18, fill: 0xb0a0c0, fontFamily: 'Segoe UI, sans-serif' }),
    });
    sub.anchor.set(0.5);
    sub.x = GameConfig.width / 2;
    sub.y = 260;
    this.menuScene.addChild(sub);

    // Roxy placeholder (simple character)
    const roxy = new Graphics();
    // Body
    roxy.circle(GameConfig.width / 2, 360, 30);
    roxy.fill({ color: 0xf39c12 });
    // Hat
    roxy.moveTo(GameConfig.width / 2 - 25, 335);
    roxy.lineTo(GameConfig.width / 2, 295);
    roxy.lineTo(GameConfig.width / 2 + 25, 335);
    roxy.closePath();
    roxy.fill({ color: 0x9b59b6 });
    // Eyes
    roxy.circle(GameConfig.width / 2 - 10, 355, 4);
    roxy.circle(GameConfig.width / 2 + 10, 355, 4);
    roxy.fill({ color: 0x000000 });
    // Smile
    roxy.arc(GameConfig.width / 2, 365, 10, 0, Math.PI);
    roxy.stroke({ color: 0x000000, width: 2 });
    this.menuScene.addChild(roxy);

    // Play button
    const playBtn = new Container();
    playBtn.x = GameConfig.width / 2;
    playBtn.y = 460;
    const playBg = new Graphics();
    playBg.roundRect(-90, -30, 180, 60, 30);
    playBg.fill({ color: 0x9b59b6 });
    playBg.stroke({ color: 0xf1c40f, width: 3 });
    playBtn.addChild(playBg);

    const playText = new Text({
      text: 'PLAY',
      style: new TextStyle({ fontSize: 26, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'Segoe UI, sans-serif', letterSpacing: 6 }),
    });
    playText.anchor.set(0.5);
    playBtn.addChild(playText);

    playBtn.eventMode = 'static';
    playBtn.cursor = 'pointer';
    playBtn.on('pointerdown', () => {
      this.fsm.transition('LEVEL_SELECT');
    });
    this.menuScene.addChild(playBtn);

    // Starfield on menu
    this.addStarfield(this.menuScene);

    this.app.stage.addChild(this.menuScene);
  }

  private buildLevelSelectScene(): void {
    this.levelSelectScene = new LevelSelect(this.player);
    this.levelSelectScene.visible = false;
    this.levelSelectScene.onLevelChosen = (levelId) => {
      this.startLevel(levelId);
    };
    this.app.stage.addChild(this.levelSelectScene);
  }

  private buildGameScene(): void {
    // Gradient background (dark purple → near-black)
    const bg = new Graphics();
    bg.rect(0, 0, GameConfig.width, GameConfig.height);
    bg.fill({ color: 0x0d0520 });
    this.gameScene.addChild(bg);

    // Upper gradient overlay (lighter purple fade)
    const topGrad = new Graphics();
    topGrad.rect(0, 0, GameConfig.width, 200);
    topGrad.fill({ color: 0x2a1050, alpha: 0.4 });
    this.gameScene.addChild(topGrad);

    // Ambient glow behind slot machine
    const ambientGlow = new Graphics();
    ambientGlow.circle(GameConfig.width / 2, GameConfig.height / 2 - 20, 280);
    ambientGlow.fill({ color: 0x9b59b6, alpha: 0.12 });
    this.gameScene.addChild(ambientGlow);

    // Starfield
    this.addStarfield(this.gameScene);

    // Header plate: "ROXY'S MAGIC REELS"
    const header = new Text({
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
    header.anchor.set(0.5);
    header.x = GameConfig.width / 2;
    header.y = 78;
    this.gameScene.addChild(header);

    // HUD
    this.hud = new HUD();
    this.gameScene.addChild(this.hud);

    // Slot Grid
    this.slotGrid = new SlotGrid();
    this.slotGrid.x = GameConfig.width / 2;
    this.slotGrid.y = GameConfig.height / 2 - 20;
    this.slotGrid.onSwapAttempt = (r1, c1, r2, c2) => this.handleSwap(r1, c1, r2, c2);
    this.gameScene.addChild(this.slotGrid);

    // Spin Button
    this.spinButton = new SpinButton();
    this.spinButton.x = GameConfig.width / 2;
    this.spinButton.y = GameConfig.height - 45;
    this.spinButton.onSpin = () => this.handleSpin();
    this.gameScene.addChild(this.spinButton);

    // Goal display
    this.goalDisplay = new Container();
    this.goalDisplay.x = GameConfig.width / 2;
    this.goalDisplay.y = GameConfig.height - 90;
    this.gameScene.addChild(this.goalDisplay);

    // Level Complete overlay
    this.levelComplete = new LevelComplete();
    this.gameScene.addChild(this.levelComplete);

    this.gameScene.visible = false;
    this.app.stage.addChild(this.gameScene);
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
        this.spinButton.setEnabled(false);
        this.spinButton.setText(`MOVES: ${this.movesRemaining}`);
        this.hud.showMessage('Drag to swap symbols!', 2000);
        this.startHintTimer();
        break;
    }
  }

  private startLevel(levelId: number): void {
    const def = getLevelConfig(levelId);
    if (!def) return;

    this.currentLevelDef = def;
    this.spinsRemaining = def.spins;
    this.movesRemaining = def.movesPerSpin;
    this.totalScore = 0;
    this.cascadeCount = 0;
    this.powerUpCount = 0;
    this.collectCounts = {};
    this.goals = def.goals.map(g => ({ ...g, current: 0 }));

    this.hud.setLevel(def.id);
    this.hud.setScore(0);
    this.hud.setMoves(def.movesPerSpin);
    this.hud.setCoins(this.player.coins);
    this.hud.setMultiplier(1);
    this.updateGoalDisplay();

    // Generate initial grid
    this.match3.setLevel(levelId);
    const gridData = this.slotGrid.generateGrid(levelId);
    this.match3.setGrid(gridData);

    // Transition to game
    if (this.fsm.state === 'LEVEL_SELECT') {
      this.fsm.transition('IDLE');
    } else if (this.fsm.state === 'LEVEL_CHECK') {
      this.fsm.transition('IDLE');
    }
  }

  private async handleSpin(): Promise<void> {
    if (this.fsm.state !== 'IDLE' || this.spinsRemaining <= 0) return;

    this.spinsRemaining--;
    this.movesRemaining = this.currentLevelDef!.movesPerSpin;
    this.hud.setMoves(this.movesRemaining);

    this.fsm.transition('SPINNING');
    this.spinButton.setEnabled(false);

    try {
      // Unified reel spin: scroll down old, generate new, scroll in new
      await this.slotGrid.animateReelSpin(() => {
        const gridData = this.slotGrid.generateGrid(this.currentLevelDef!.id);
        this.match3.setGrid(gridData);
      });
    } catch (err) {
      console.error('Spin error:', err);
      const gridData = this.slotGrid.generateGrid(this.currentLevelDef!.id);
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

      // Animate clearing with confetti and floating score
      const allCells = matches.flatMap(m => m.cells);
      await this.slotGrid.animateClear(allCells, roundScore);

      // Remove from data
      for (const pos of allCells) {
        grid[pos.row][pos.col] = null;
      }

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
      await this.slotGrid.animateInvalidSwap(r1, c1, r2, c2);
      this.hud.showMessage('No match!', 800);
      this.slotGrid.setInteractive(true);
      return;
    }

    // Animate the swap visually
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

    // Track collections from match-3 phase
    for (const match of result.matches) {
      for (const cell of match.cells) {
        this.collectCounts[match.symbolId] = (this.collectCounts[match.symbolId] || 0) + 1;
      }
    }

    this.updateGoalProgress();

    // Show confetti and score for match-3 swap results
    const grid = this.match3.getGrid();
    if (result.score > 0) {
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

    // Check if moves depleted
    if (this.movesRemaining <= 0) {
      await delay(500);
      this.endMatchPhase();
    }
  }

  private endMatchPhase(): void {
    this.clearHintTimer();
    this.slotGrid.clearHint();
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
      }

      this.levelComplete.show({
        levelId: def.id,
        score: this.totalScore,
        stars,
        coinsEarned,
        passed,
      });

      this.levelComplete.onContinue = () => {
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
          break;
      }
    }
    this.updateGoalDisplay();
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
        if (grid[r][c]) {
          if (r !== writeRow) {
            grid[writeRow][c] = grid[r][c];
            grid[writeRow][c]!.row = writeRow;
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
