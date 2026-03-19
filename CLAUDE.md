# KefSlot - Roxy's Magic Reels

## What This Is

A hybrid **Slot + Match-3** browser game built with PixiJS 8, TypeScript, GSAP, and Vite. Features a fantasy character "Roxy" (halfling adventurer) with 20 levels across 2 worlds.

## Tech Stack

- **Renderer:** PixiJS 8.x (WebGL)
- **Language:** TypeScript (strict mode)
- **Animations:** GSAP 3.x
- **Audio:** Howler.js (music stems) + Web Audio API (procedural SFX via SFXManager)
- **Build:** Vite 8.x with `@` path alias → `src/`
- **Dev server:** `node node_modules/.bin/vite --port 3005` (configured in `.claude/launch.json`)

## Dev Commands

```bash
npm run dev          # Vite dev server (default port 3000)
npm run build        # tsc + vite build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format all src/
npm run format:check # Prettier check (CI)
```

The `.claude/launch.json` runs dev on port **3005**. Note: `preview_start` has an EPERM bug — use `Bash` to run `cd /Users/eb/Documents/Projects/KefSlot && node node_modules/.bin/vite --port 3005` in background instead.

## Tooling

- **ESLint** — TypeScript ESLint + Prettier compat (`eslint.config.js`)
- **Prettier** — Single quotes, 120 col, trailing commas (`.prettierrc`)
- **Husky** — Pre-commit hook runs lint-staged (ESLint fix + Prettier)
- **CI** — GitHub Actions: lint → type-check → build → bundle size (`.github/workflows/ci.yml`)

## Claude Code Automations

- **Hooks** — PostToolUse: auto type-check on Edit/Write. PreToolUse: block edits to `package-lock.json`, `dist/`, `node_modules/`.
- **Skills** — `/build` (type-check + build), `/test-setup` (scaffold vitest), `/art-asset` (AI art pipeline)
- **Subagent** — `game-reviewer` (performance, memory leaks, PixiJS gotchas)
- **MCP** — `context7` for live PixiJS/GSAP/Howler docs lookup

## Architecture

```
src/
├── main.ts                 # Entry point, Pixi app init, HMR cleanup
├── config/
│   ├── GameConfig.ts       # Constants: 800x700 canvas, 5x5 grid, 80px cells, scoring
│   ├── SymbolConfig.ts     # 12 symbols (ruby, emerald, sapphire, amethyst, topaz, potion, roxy/wild, scatter, multiplier, crystal, mushroom, bat)
│   └── LevelConfig.ts      # 20 levels across 2 worlds with goals & star thresholds
├── audio/
│   ├── MusicManager.ts     # Howler.js music with 10-stem progressive layering
│   └── SFXManager.ts       # Web Audio API procedural SFX (18 sounds, lazy AudioContext)
├── core/
│   ├── Game.ts             # Main controller (~780 lines). Manages scenes, state, spin/swap flow
│   ├── StateMachine.ts     # FSM: MENU→LEVEL_SELECT→IDLE→SPINNING→CASCADE_RESOLVE→MATCH3_PHASE(→SPINNING)→SCORING→LEVEL_CHECK
│   └── EventBus.ts         # Pub/sub (swap, matchCleared, gravityApplied, gridFilled)
├── models/
│   ├── Symbol.ts           # CellData, PowerUpType (blast/bomb/rainbow)
│   ├── Level.ts            # LevelDef, LevelGoal interfaces
│   └── PlayerState.ts      # Coins, progress, musicMuted, localStorage persistence
├── slots/
│   ├── SlotGrid.ts         # 5x5 visual grid, drag-to-swap, all animations
│   └── CascadeEngine.ts    # Match detection (3+ horizontal/vertical), multipliers [1,2,3,5,8,13,21]
├── match3/
│   └── Match3Engine.ts     # Swap validation, cascade resolution, power-up creation, gravity
├── effects/
│   └── MatchEffects.ts     # Confetti particles, floating "+score" text, cascade burst
├── ui/
│   ├── HUD.ts              # Top bar: level, score, moves, multiplier, coins, music + SFX mute toggles
│   ├── SpinButton.ts       # SPIN / MOVES:N / DONE button
│   ├── LevelSelect.ts      # Path-based level nodes on world map background
│   └── LevelComplete.ts    # Win/lose overlay with stars
└── utils/
    └── MathUtils.ts        # weightedRandom, shuffle, clamp, lerp, delay
```

## Core Game Loop

```
SPIN → symbols fall (slot-style reel drop per column)
  → Auto-resolve pre-existing matches (cascade with multipliers, confetti, floating scores)
  → MATCH3_PHASE: player drag-swaps adjacent symbols for N moves
    → Valid swaps: animate swap → clear matches → gravity → fill → cascade
    → Invalid swaps: bounce-back animation
    → Spin button remains available as escape hatch (MATCH3_PHASE → SPINNING)
    → Dead board detection: if no valid swaps, prompts "No moves! Press SPIN"
  → When moves depleted → SCORING → LEVEL_CHECK
  → Meet level goals → advance (stars + coins), else retry or use more spins
```

## Critical Patterns & Gotchas

### GSAP + PixiJS 8

**NEVER use `onComplete` callbacks with PixiJS containers** — they hang and never resolve. Always use:
```ts
const tl = gsap.timeline();
tl.to(sprite, { y: 100, duration: 0.5 }, 0);
await tl.then();
```

### HMR

App instance stored on `window.__kefslot_app` so HMR can destroy previous instances. On hot reload: clear GSAP global timeline, destroy old app, remove leftover canvases.

### Stage Scaling

The stage is scaled to fit the window while maintaining 800x700 aspect ratio:
```ts
const scale = Math.min(windowW / 800, windowH / 700);
app.stage.scale.set(scale);
app.stage.x = (windowW - 800 * scale) / 2;
app.stage.y = (windowH - 700 * scale) / 2;
```

### Grid Coordinates

- Grid center at game coords (400, 330) — that's `(width/2, height/2 - 20)`
- Cell size: 80px with 4px gap
- Cell (r,c) center in game coords: `(232 + c*84, 162 + r*84)`

### Drag-to-Swap

Uses `pointerdown`/`pointermove`/`pointerup` on each cell sprite. Threshold: 40% of cell size. Direction determined by dominant axis of drag vector.

### Property Name Conflict

PixiJS `Container` has a built-in `effects` property. Our effects layer is named `matchEffects` to avoid collision.

## Current State (as of March 2026)

### Working
- Menu → Level Select → Game flow
- Slot-style reel drop animation with per-column random speeds (staggered left-to-right)
- Symbol clipping mask — symbols masked to slot frame during spin animations
- Drag-to-swap mechanic
- Match detection (3/4/5 horizontal & vertical)
- Cascade resolution with Fibonacci multipliers
- Confetti particles + floating score numbers
- Auto-resolve pre-existing matches after spin
- Power-up creation (blast/bomb/rainbow) for 4+ matches
- Gravity + fill with animation
- Invalid swap bounce-back
- Level goals (score, collect, cascades, power_ups)
- Star rating (1-3 stars)
- Player progress persistence (localStorage)
- 20 levels designed and configured
- Music system (Howler.js, 10-stem progressive layering) with mute toggle
- SFX system (Web Audio API, 18 procedural sounds) with independent mute toggle
- Level select with path-based nodes on AI-generated world map background
- AI-generated menu background art (landscape + portrait variants)
- Spin button available during MATCH3_PHASE (re-spin escape hatch)
- Dead board detection — auto-prompts player when no valid swaps remain
- Portrait/landscape responsive layout with orientation-aware backgrounds

### Not Yet Implemented
- Blocker tiles (ice/stone) — config exists, logic TODO
- Power-up activation animations (logic works, visuals minimal)
- Roxy character reactions during gameplay
- Scene transitions / polish effects
- Screen shake on big wins
- Mobile touch optimization
- Tutorial/guided prompts for levels 1-3
- Final art for symbols (currently placeholder geometric shapes)

## Scoring Reference

| Match | Base Score |
|-------|-----------|
| 3-match | 50 |
| 4-match | 150 |
| 5-match | 500 |

Cascade multipliers: 1x → 2x → 3x → 5x → 8x → 13x → 21x

## Testing

No test framework installed yet. Use `/test-setup` skill to scaffold vitest.
