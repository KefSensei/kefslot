import { Application, Container, Graphics, Text, TextStyle, FillGradient, Sprite, Texture, Assets } from 'pixi.js';
import menuBgLandscapeUrl from '@/assets/sprites/menu-bg-landscape.png';
import menuBgPortraitUrl from '@/assets/sprites/menu-bg-portrait.png';
import levelSelectBgLandscapeUrl from '@/assets/sprites/levelselect-bg-landscape.png';
import levelSelectBgPortraitUrl from '@/assets/sprites/levelselect-bg-portrait.png';

// Per-world map backgrounds
import world1L from '@/assets/sprites/world1-meadow-landscape.png';
import world1P from '@/assets/sprites/world1-meadow-portrait.png';
import world2L from '@/assets/sprites/world2-caverns-landscape.png';
import world2P from '@/assets/sprites/world2-caverns-portrait.png';
import world3L from '@/assets/sprites/world3-volcanic-landscape.png';
import world3P from '@/assets/sprites/world3-volcanic-portrait.png';
import world4L from '@/assets/sprites/world4-sunken-landscape.png';
import world4P from '@/assets/sprites/world4-sunken-portrait.png';
import world5L from '@/assets/sprites/world5-skyward-landscape.png';
import world5P from '@/assets/sprites/world5-skyward-portrait.png';
import world6L from '@/assets/sprites/world6-shadow-landscape.png';
import world6P from '@/assets/sprites/world6-shadow-portrait.png';
import world7L from '@/assets/sprites/world7-frozen-landscape.png';
import world7P from '@/assets/sprites/world7-frozen-portrait.png';
import world8L from '@/assets/sprites/world8-dragon-landscape.png';
import world8P from '@/assets/sprites/world8-dragon-portrait.png';
import world9L from '@/assets/sprites/world9-astral-landscape.png';
import world9P from '@/assets/sprites/world9-astral-portrait.png';
import world10L from '@/assets/sprites/world10-tower-landscape.png';
import world10P from '@/assets/sprites/world10-tower-portrait.png';

const WORLD_MAP_URLS: [string, string][] = [
  [world1L, world1P],
  [world2L, world2P],
  [world3L, world3P],
  [world4L, world4P],
  [world5L, world5P],
  [world6L, world6P],
  [world7L, world7P],
  [world8L, world8P],
  [world9L, world9P],
  [world10L, world10P],
];
import gameBgLandscapeUrl from '@/assets/sprites/game-bg-landscape.png';
import gameBgPortraitUrl from '@/assets/sprites/game-bg-portrait.png';
import { GameConfig } from '@/config/GameConfig';
import { loadSymbolTextures } from '@/config/SymbolTextures';
import { getLevelConfig } from '@/config/LevelConfig';
import { StateMachine, GameState } from '@/core/StateMachine';
import { events } from '@/core/EventBus';
import { SlotGrid } from '@/slots/SlotGrid';
import { CascadeEngine } from '@/slots/CascadeEngine';
import { Match3Engine } from '@/match3/Match3Engine';
import { MechanicEvent } from '@/mechanics/MechanicsEngine';
import { PlayerState } from '@/models/PlayerState';
import { LevelGoal, LevelDef } from '@/models/Level';
import { HUD, GoalStatus } from '@/ui/HUD';
import { SpinButton } from '@/ui/SpinButton';
import { LevelSelect } from '@/ui/LevelSelect';
import { LevelComplete } from '@/ui/LevelComplete';
import { LevelIntro } from '@/ui/LevelIntro';
import { MenuScreen } from '@/ui/MenuScreen';
import { delay, weightedRandom } from '@/utils/MathUtils';
import { getSymbolsForLevel } from '@/config/SymbolConfig';
import { CellData, createCell, PowerUpType } from '@/models/Symbol';
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
  private menuScreen!: MenuScreen;
  private levelSelectScene!: LevelSelect;
  private gameScene = new Container();

  // Game UI
  private slotGrid!: SlotGrid;
  private hud!: HUD;
  private spinButton!: SpinButton;
  private levelComplete!: LevelComplete;
  private levelIntro!: LevelIntro;

  // Layout references for relayout
  private gameBg!: Sprite;
  private gameTopGrad!: Graphics;
  private gameAmbientGlow!: Graphics;
  private _isPortrait: boolean | null = null; // null = not yet laid out

  // Background textures
  private menuBgTextures!: { landscape: Texture; portrait: Texture };
  private levelSelectBgTextures!: { landscape: Texture; portrait: Texture };
  private worldMapTextures: { landscape: Texture; portrait: Texture }[] = [];
  private gameBgTextures!: { landscape: Texture; portrait: Texture };

  // (Menu UI is now handled by MenuScreen class)

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
    const urls = [
      menuBgLandscapeUrl,
      menuBgPortraitUrl,
      levelSelectBgLandscapeUrl,
      levelSelectBgPortraitUrl,
      gameBgLandscapeUrl,
      gameBgPortraitUrl,
    ];
    const results: Texture[] = [];
    for (const url of urls) {
      try {
        results.push(await Assets.load<Texture>(url));
      } catch (e) {
        throw new Error(`Failed to load texture: ${url} — ${e}`, { cause: e });
      }
    }
    const [menuL, menuP, lsL, lsP, gameL, gameP] = results;
    this.menuBgTextures = { landscape: menuL, portrait: menuP };
    this.levelSelectBgTextures = { landscape: lsL, portrait: lsP };
    this.gameBgTextures = { landscape: gameL, portrait: gameP };

    // Load per-world map textures
    const worldTexPairs = await Promise.all(
      WORLD_MAP_URLS.map(([lUrl, pUrl]) => Promise.all([Assets.load<Texture>(lUrl), Assets.load<Texture>(pUrl)])),
    );
    this.worldMapTextures = worldTexPairs.map(([l, p]) => ({ landscape: l, portrait: p }));

    // Load symbol sprite textures
    await loadSymbolTextures();

    // Load blocker, mechanic, and power-up textures
    const { loadIceTextures, loadBlockerTextures, loadMechanicTextures, loadPowerUpTextures } =
      await import('@/slots/SlotGrid');
    const { loadEffectTextures } = await import('@/effects/MatchEffects');
    await Promise.all([
      loadIceTextures(),
      loadBlockerTextures(),
      loadMechanicTextures(),
      loadPowerUpTextures(),
      loadEffectTextures(),
      LevelComplete.preload(),
      LevelIntro.preload(),
    ]);
  }

  private buildMenuScene(): void {
    this.menuScreen = new MenuScreen(this.menuBgTextures);
    this.menuScreen.onPlay = () => {
      this.sfx.play('buttonPress');
      this.music.load();
      this.fsm.transition('LEVEL_SELECT');
    };
    this.app.stage.addChild(this.menuScreen);
  }

  private buildLevelSelectScene(): void {
    this.levelSelectScene = new LevelSelect(this.player);
    this.levelSelectScene.setBgTextures(this.levelSelectBgTextures);
    this.levelSelectScene.setWorldMapTextures(this.worldMapTextures);
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

    // Background image (slot cabinet art)
    this.gameBg = new Sprite(isPortrait ? this.gameBgTextures.portrait : this.gameBgTextures.landscape);
    this.gameBg.width = w;
    this.gameBg.height = h;
    this.gameScene.addChild(this.gameBg);

    // Keep these for compatibility but make them invisible (art provides the atmosphere now)
    this.gameTopGrad = new Graphics();
    this.gameAmbientGlow = new Graphics();

    // gameHeader removed — title shown on menu screen, not in-game HUD

    // HUD
    this.hud = new HUD();
    this.hud.setMusicMuted(this.player.musicMuted);
    this.music.setMuted(this.player.musicMuted);
    this.hud.setSfxMuted(this.sfx.muted);
    if (isPortrait) this.hud.setPortrait(true);
    this.hud.onMusicToggle = (muted) => {
      this.player.setMusicMuted(muted);
      this.music.setMuted(muted);
    };
    this.hud.onSfxToggle = (muted) => {
      this.sfx.setMuted(muted);
    };

    // Slot Grid — position to match cabinet screen area
    const gridCenter = isPortrait ? GameConfig.gridCenterPortrait : GameConfig.gridCenterLandscape;
    this.slotGrid = new SlotGrid();
    this.slotGrid.x = gridCenter.x;
    this.slotGrid.y = gridCenter.y;
    this.slotGrid.onSwapAttempt = (r1, c1, r2, c2) => this.handleSwap(r1, c1, r2, c2);
    this.slotGrid.onPowerUpTap = (r, c) => this.handlePowerUpActivation(r, c);
    this.gameScene.addChild(this.slotGrid);

    // Spin Button — sits on the wooden shelf below the screen
    this.spinButton = new SpinButton();
    this.spinButton.x = w / 2;
    this.spinButton.y = isPortrait ? h * 0.72 : h * 0.96;
    if (isPortrait) this.spinButton.setPortrait(true);
    this.spinButton.onSpin = () => this.handleSpin();
    this.gameScene.addChild(this.spinButton);

    // HUD added after slotGrid/spinButton so its messageText renders on top
    this.gameScene.addChild(this.hud);

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

    // Swap game background texture for orientation
    this.gameBg.texture = isPortrait ? this.gameBgTextures.portrait : this.gameBgTextures.landscape;
    this.gameBg.width = w;
    this.gameBg.height = h;

    // Grid — position to match cabinet screen area
    const gridCenter = isPortrait ? GameConfig.gridCenterPortrait : GameConfig.gridCenterLandscape;
    this.slotGrid.x = gridCenter.x;
    this.slotGrid.y = gridCenter.y;
    // Re-render grid with new cell size
    this.slotGrid.renderGrid();

    // Spin button — sits on the wooden shelf
    this.spinButton.x = w / 2;
    this.spinButton.y = isPortrait ? h * 0.72 : h * 0.96;
    this.spinButton.setPortrait(isPortrait);

    // HUD
    this.hud.setPortrait(isPortrait);

    // Overlays — reposition panel centers
    this.levelIntro.relayout(w, h);
    this.levelComplete.relayout(w, h);

    // Menu screen
    this.menuScreen.relayout(isPortrait);

    // Level select uses activeWidth/activeHeight in build(), so refresh it
    this.levelSelectScene?.refresh();
  }

  // (Starfield is now part of MenuScreen)

  private showScene(scene: 'menu' | 'levelSelect' | 'game'): void {
    this.menuScreen.visible = scene === 'menu';
    this.levelSelectScene.visible = scene === 'levelSelect';
    this.gameScene.visible = scene === 'game';

    if (scene === 'menu') {
      this.menuScreen.playEntrance();
    }
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
      case 'MATCH3_PHASE': {
        this.slotGrid.setInteractive(true);
        this.spinButton.setEnabled(this.spinsRemaining > 0);
        this.spinButton.setText(`MOVES: ${this.movesRemaining}`);
        this.hud.showMessage('Drag to swap symbols!', 2000);
        this.startHintTimer();
        this.slotGrid.startPowerUpGlow();
        // Show mechanic info if applicable
        this.updateMechanicInfo();
        // Check for dead board (no valid swaps)
        this.checkForDeadBoard();
        break;
      }
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
    this.goals = def.goals.map((g) => ({ ...g, current: 0 }));

    this.hud.setLevel(def.id);
    this.hud.setScore(0);
    this.hud.setMoves(def.movesPerSpin);
    this.hud.setCoins(this.player.coins);
    this.hud.setMultiplier(1);
    this.updateGoalDisplay();

    // Start music (lead vocals only, stems layer in as score grows)
    this.music.start();

    // Configure mechanics engine with full level definition
    this.match3.setLevelDef(def);

    // Update grid dimensions if level defines custom size
    if (def.gridSize) {
      GameConfig.rows = def.gridSize.rows;
      GameConfig.cols = def.gridSize.cols;
    } else {
      GameConfig.rows = 5;
      GameConfig.cols = 5;
    }

    // Generate a placeholder grid (will be replaced by auto-spin)
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

    // Mechanics: pre-spin hooks (gravity flip, blizzard, conveyors, lava, etc.)
    const mechanics = this.match3.getMechanics();
    const preSpinEvents = mechanics.onSpinStart();
    this.handleMechanicEvents(preSpinEvents);

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

    // Mechanics: post-spin setup (place lava, fog, portals, transformers, etc.)
    const postSpinEvents = mechanics.onSpinEnd();
    this.handleMechanicEvents(postSpinEvents);

    // Re-render grid to show mechanic overlays (fog, lava, portals, etc.)
    this.slotGrid.updateGrid(this.match3.getGrid());

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

    // Mechanics: pre-spin hooks
    const mechanics = this.match3.getMechanics();
    const preSpinEvents = mechanics.onSpinStart();
    this.handleMechanicEvents(preSpinEvents);

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

    // Mechanics: post-spin setup
    const postSpinEvents = mechanics.onSpinEnd();
    this.handleMechanicEvents(postSpinEvents);
    this.slotGrid.updateGrid(this.match3.getGrid());

    // Cascade resolve phase - auto-resolve pre-existing matches
    this.fsm.transition('CASCADE_RESOLVE');
    await this.resolveCascades();

    // Transition to match-3 phase
    this.fsm.transition('MATCH3_PHASE');
  }

  private async resolveCascades(): Promise<void> {
    let cascadeLevel = 0;
    const grid = this.match3.getGrid();
    let matches = this.cascade.findMatches(grid);

    if (matches.length > 0) {
      this.hud.showMessage('Auto-match bonus!', 1500);
      await delay(200);
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
        const baseScore =
          match.cells.length >= 5
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

      const allCells = matches.flatMap((m) => m.cells);

      // Determine power-ups for 4+ matches (before clearing so positions are valid)
      const powerUpsToPlace: { row: number; col: number; type: PowerUpType }[] = [];
      for (const match of matches) {
        const pu = this.match3.determinePowerUp(match);
        if (pu) powerUpsToPlace.push(pu);
      }

      // Update data FIRST so animateClear can check which cells crack vs disappear
      for (const pos of allCells) {
        const cell = grid[pos.row][pos.col];
        if (cell?.isBlocker) {
          cell.blockerHealth--;
          if (cell.blockerHealth <= 0) {
            cell.isBlocker = false;
            cell.blockerHealth = 0;
            cell.blockerType = null;
            grid[pos.row][pos.col] = null;
          }
          // else: ice cracked, cell stays with symbol intact
        } else {
          grid[pos.row][pos.col] = null;
        }
      }

      // Place power-ups into the now-empty cells (before gravity)
      const symbols = getSymbolsForLevel(this.currentLevelDef!.id);
      for (const pu of powerUpsToPlace) {
        if (!grid[pu.row][pu.col]) {
          const cell = createCell(symbols[0], pu.row, pu.col);
          cell.powerUp = pu.type;
          grid[pu.row][pu.col] = cell;
        }
      }
      if (powerUpsToPlace.length > 0) {
        this.sfx.play('powerUpCreate');
      }

      this.slotGrid.setGridData(grid);

      // Animate clearing with confetti and floating score
      await this.slotGrid.animateClear(allCells, roundScore);

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
        await delay(150);
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

    // Perform the swap in the data grid (without running cascades in the engine)
    const grid = this.match3.getGrid();
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
    if (grid[r1][c1]) {
      grid[r1][c1]!.row = r1;
      grid[r1][c1]!.col = c1;
    }
    if (grid[r2][c2]) {
      grid[r2][c2]!.row = r2;
      grid[r2][c2]!.col = c2;
    }
    this.match3.setGrid(grid);

    // Update the visual grid to reflect the swapped positions
    this.slotGrid.setGridData(grid);

    this.movesRemaining--;
    this.hud.setMoves(this.movesRemaining);
    this.spinButton.setText(`MOVES: ${this.movesRemaining}`);

    // Use the same visual cascade resolution as auto-resolve (clear → gravity → fill per round)
    await this.resolveCascades();

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
    } else if (this.hasPowerUpsOnBoard()) {
      // No valid swaps but power-ups remain — re-enable interaction so they can be tapped
      this.slotGrid.setInteractive(true);
      this.hud.showMessage('Tap power-ups to activate!', 2500);
      this.sfx.play('invalidSwap');
      this.spinButton.setText('TAP POWER-UPS!');
      this.slotGrid.startPowerUpGlow();
    } else {
      // No swaps, no spins, no power-ups — end the match phase
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
      .map((p) => this.slotGrid.getCellPosition(p.row, p.col))
      .filter((p): p is { x: number; y: number } => p !== null);
    const originPos = this.slotGrid.getCellPosition(row, col);

    if (powerUpType === 'blast' && originPos) {
      const isRow = result.cleared.every((c) => c.row === row);
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
    const batches: { count: number; health: number; type: import('@/models/Symbol').BlockerType }[] = [];
    const primaryCount = def.blockerCount ?? 0;
    const primaryType = def.blockerType ?? 'ice';
    if (primaryCount > 0) {
      batches.push({
        count: primaryCount,
        health: primaryType === 'ice' ? 1 : primaryType === 'stone' ? 2 : 1,
        type: primaryType as import('@/models/Symbol').BlockerType,
      });
    }
    const secondaryCount = def.blockerCountSecondary ?? 0;
    const secondaryType = def.blockerTypeSecondary ?? 'ice';
    if (secondaryCount > 0) {
      batches.push({
        count: secondaryCount,
        health: secondaryType === 'ice' ? 1 : secondaryType === 'stone' ? 2 : 1,
        type: secondaryType as import('@/models/Symbol').BlockerType,
      });
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
          cell.blockerType = batch.type;
        }
        idx++;
      }
    }

    // Place treasure chests
    if (def.treasureChests) {
      for (const chest of def.treasureChests) {
        const cell = grid[chest.row]?.[chest.col];
        if (cell) {
          cell.isChest = true;
          cell.chestHitsNeeded = chest.hitsNeeded;
          cell.chestHitsReceived = 0;
        }
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
    const allGoalsMet = this.goals.every((g) => g.current >= g.target);

    if (allGoalsMet || this.spinsRemaining <= 0) {
      const passed = allGoalsMet;
      const def = this.currentLevelDef!;
      const stars = passed ? def.starThresholds.filter((t) => this.totalScore >= t).length : 0;
      const coinsEarned = passed ? 100 + stars * 50 : 0;

      if (passed) {
        this.player.completeLevel(def.id, this.totalScore, stars);
        this.player.addCoins(coinsEarned);
      } else {
        this.sfx.play('levelFailed');
      }

      const goalStatuses = this.goals.map((g) => {
        let label = '';
        switch (g.type) {
          case 'score':
            label = `SCORE ${g.current.toLocaleString()}/${g.target.toLocaleString()}`;
            break;
          case 'collect':
            label = `${(g.symbolId ?? 'collect').toUpperCase()} ${g.current}/${g.target}`;
            break;
          case 'cascades':
            label = `CASCADES ${g.current}/${g.target}`;
            break;
          case 'power_ups':
            label = `POWER-UPS ${g.current}/${g.target}`;
            break;
          case 'clear_blockers':
            label = `BLOCKERS ${g.current}/${g.target}`;
            break;
          case 'dual_collect':
            label = `${(g.symbolId ?? '').toUpperCase()} ${g.current}/${g.target}  ${(g.symbolId2 ?? '').toUpperCase()} ${g.current2 || 0}/${g.target2 || 0}`;
            break;
          case 'chain_cascade':
            label = `CHAIN ${g.current}/${g.target}`;
            break;
          case 'protect_egg':
            label = `EGG ${g.current}/${g.target}`;
            break;
          case 'assemble_relic':
            label = `RELIC ${g.current}/${g.target}`;
            break;
        }
        const done =
          g.type === 'dual_collect'
            ? g.current >= g.target && (g.current2 || 0) >= (g.target2 || 0)
            : g.current >= g.target;
        return { label, done };
      });

      this.levelComplete.show({
        levelId: def.id,
        score: this.totalScore,
        stars,
        coinsEarned,
        passed,
        goals: goalStatuses,
        sfx: this.sfx,
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
    const mechanics = this.match3.getMechanics();
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
        case 'dual_collect':
          goal.current = this.collectCounts[goal.symbolId!] || 0;
          goal.current2 = this.collectCounts[goal.symbolId2!] || 0;
          break;
        case 'chain_cascade':
          goal.current = this.cascadeCount;
          break;
        case 'protect_egg':
          // Egg is protected as long as it's still on the board — tracked externally
          break;
        case 'assemble_relic':
          goal.current = mechanics.getRelicPiecesCollected();
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
    const goals: GoalStatus[] = this.goals.map((g) => {
      let label = '';
      switch (g.type) {
        case 'score':
          label = `SCORE ${g.current.toLocaleString()}/${g.target.toLocaleString()}`;
          break;
        case 'collect':
          label = `${(g.symbolId ?? 'collect').toUpperCase()} ${g.current}/${g.target}`;
          break;
        case 'cascades':
          label = `CASCADES ${g.current}/${g.target}`;
          break;
        case 'power_ups':
          label = `POWER-UPS ${g.current}/${g.target}`;
          break;
        case 'clear_blockers':
          label = `BLOCKERS ${g.current}/${g.target}`;
          break;
        case 'dual_collect':
          label = `${(g.symbolId ?? '').toUpperCase()} ${g.current}/${g.target}  ${(g.symbolId2 ?? '').toUpperCase()} ${g.current2 || 0}/${g.target2 || 0}`;
          break;
        case 'chain_cascade':
          label = `CHAIN ${g.current}/${g.target}`;
          break;
        case 'protect_egg':
          label = `EGG ${g.current}/${g.target}`;
          break;
        case 'assemble_relic':
          label = `RELIC ${g.current}/${g.target}`;
          break;
      }
      const done =
        g.type === 'dual_collect'
          ? g.current >= g.target && (g.current2 || 0) >= (g.target2 || 0)
          : g.current >= g.target;
      return { label, done };
    });
    this.hud.setGoals(goals);
  }

  /** Update HUD mechanic info bar with active mechanic statuses */
  private updateMechanicInfo(): void {
    if (!this.currentLevelDef) {
      this.hud.setMechanicInfo(null);
      return;
    }
    const def = this.currentLevelDef;
    const mechanics = this.match3.getMechanics();
    const parts: string[] = [];

    if (def.comboStreak) {
      const streak = mechanics.getComboStreak();
      if (streak > 0) parts.push(`Combo:${streak}`);
    }
    if (def.gravityFlip) {
      parts.push(`Gravity:${mechanics.getGravityDirection() === 'up' ? 'UP' : 'DOWN'}`);
    }
    if (def.totalSwapBudget) {
      const remaining = def.totalSwapBudget - mechanics.getTotalSwapsUsed();
      parts.push(`Swaps:${remaining}`);
    }
    if (def.relicPieces) {
      parts.push(`Relics:${mechanics.getRelicPiecesCollected()}/4`);
    }
    if (def.phaseShifts) {
      parts.push(`Phase:${mechanics.getCurrentPhase() + 1}`);
    }

    this.hud.setMechanicInfo(parts.length > 0 ? parts.join(' | ') : null);
  }

  /** Process mechanic events — show visual feedback, play SFX */
  private handleMechanicEvents(mechanicEvents: MechanicEvent[]): void {
    for (const evt of mechanicEvents) {
      switch (evt.type) {
        case 'gravityFlip':
          this.hud.showMessage(
            `Gravity ${(evt.data as { direction: string }).direction === 'up' ? 'flipped UP!' : 'restored DOWN!'}`,
            2000,
          );
          this.sfx.play('cascade', { cascadeLevel: 2 });
          break;
        case 'blizzard':
          this.hud.showMessage('Blizzard! Cells frozen!', 2000);
          this.sfx.play('blockerCrack');
          break;
        case 'conveyorShift':
          this.sfx.play('swap');
          break;
        case 'lavaSpread':
          this.hud.showMessage('Lava spreads!', 1500);
          this.sfx.play('cascade', { cascadeLevel: 1 });
          break;
        case 'curseSpread':
          this.hud.showMessage('Curse spreads!', 1500);
          this.sfx.play('invalidSwap');
          break;
        case 'vineGrowth':
          this.hud.showMessage('Vines grow!', 1500);
          break;
        case 'dragonEggHatch': {
          const hatched = (evt.data as { hatched: { bonus: number }[] }).hatched;
          const totalBonus = hatched.reduce((s, h) => s + h.bonus, 0);
          this.totalScore += totalBonus;
          this.hud.setScore(this.totalScore);
          this.hud.showMessage(`Dragon Egg hatched! +${totalBonus}`, 2500);
          this.sfx.play('levelComplete');
          break;
        }
        case 'phaseShift':
          this.hud.showMessage(`Phase shift!`, 1500);
          this.sfx.play('cascade', { cascadeLevel: 3 });
          break;
        case 'comboStreak': {
          const streak = (evt.data as { streak: number }).streak;
          if (streak >= 3) {
            this.hud.showMessage(`Combo x${streak}!`, 1000);
            this.sfx.play('multiplier');
          }
          break;
        }
        case 'chestOpened':
          this.hud.showMessage('Treasure Chest opened! +500', 2000);
          this.totalScore += 500;
          this.hud.setScore(this.totalScore);
          this.sfx.play('coinEarned');
          break;
        case 'fireMelt':
          this.sfx.play('blockerBreak');
          break;
        case 'fogReveal':
          this.sfx.play('scorePop');
          break;
        case 'vineCut':
          this.sfx.play('blockerBreak');
          break;
        case 'relicCollected':
          this.sfx.play('starEarned', { starIndex: 0 });
          this.hud.showMessage(`Relic piece collected!`, 1500);
          break;
        case 'relicAssembled':
          this.hud.showMessage('Relic Assembled! +5000', 3000);
          this.sfx.play('levelComplete');
          break;
        case 'mirrorMatch':
          this.hud.showMessage('Mirror match!', 1000);
          this.sfx.play('match4');
          break;
        case 'scatterBonus':
          this.hud.showMessage('Scatter bonus!', 1500);
          this.sfx.play('powerUpCreate');
          break;
        case 'columnLock':
          this.hud.showMessage('Columns locked!', 1500);
          break;
      }
    }
  }

  private applyGravityToGrid(grid: (CellData | null)[][]): void {
    const direction = this.match3.getMechanics().getGravityDirection();

    for (let c = 0; c < GameConfig.cols; c++) {
      if (direction === 'down') {
        let writeRow = GameConfig.rows - 1;
        for (let r = GameConfig.rows - 1; r >= 0; r--) {
          const cell = grid[r][c];
          if (cell?.isBlocker || cell?.isDragonEgg || cell?.isChest) {
            writeRow = r - 1;
            continue;
          }
          if (cell?.isActive === false) {
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
      } else {
        // Gravity up
        let writeRow = 0;
        for (let r = 0; r < GameConfig.rows; r++) {
          const cell = grid[r][c];
          if (cell?.isBlocker || cell?.isDragonEgg || cell?.isChest) {
            writeRow = r + 1;
            continue;
          }
          if (cell?.isActive === false) {
            writeRow = r + 1;
            continue;
          }
          if (cell) {
            if (r !== writeRow) {
              grid[writeRow][c] = cell;
              cell.row = writeRow;
              grid[r][c] = null;
            }
            writeRow++;
          }
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
