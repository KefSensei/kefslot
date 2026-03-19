# Roxy's Magic Reels 🎰✨

> A hybrid **Slot Machine + Match-3** browser game built with PixiJS 8, TypeScript, and GSAP.

![Game Status](https://img.shields.io/badge/status-proof%20of%20concept-orange)
![PixiJS](https://img.shields.io/badge/PixiJS-8.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Vite](https://img.shields.io/badge/Vite-8.x-purple)

---

## What Is This?

**Roxy's Magic Reels** is a casual browser game that fuses the tactile satisfaction of a slot machine pull with the strategic depth of gem-swapping match-3 puzzles. Players follow **Roxy** — a halfling adventurer — across 20 levels in two fantasy worlds, spinning reels to fill a 5×5 board and then matching gems to meet level goals.

### Core Game Loop

1. **SPIN** — Reels drop symbols column by column (slot-machine style) into a 5×5 grid
2. **Auto-resolve** — Pre-existing matches clear automatically with cascade multipliers + visual rewards
3. **MATCH-3** — Player drags to swap adjacent symbols for N moves, creating chains, combos, and power-ups
4. **Level goals** — Score targets, gem collection, cascade counts, blocker clearing
5. **Repeat or advance** — Meet goals to earn 1–3 stars and move to the next level

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- A modern browser with WebGL support (Chrome, Firefox, Safari, Edge)

### Install

```bash
git clone git@github.com:KefSensei/kefslot.git
cd kefslot
npm install
```

### Run locally

```bash
npm run dev
```

Opens at **http://localhost:3000** by default. The dev server supports hot module replacement (HMR) — edits to source files reload instantly.

> **Note:** If port 3000 is occupied, Vite will try the next available port. Check the terminal output for the actual URL.

### Build for production

```bash
npm run build       # Type-check + bundle → dist/
npm run preview     # Preview the production build locally
```

---

## Project Structure

```
kefslot/
├── src/
│   ├── main.ts                 # Entry point — Pixi app init, HMR cleanup
│   ├── config/
│   │   ├── GameConfig.ts       # Canvas size, grid dimensions, scoring constants
│   │   ├── SymbolConfig.ts     # 12 symbols with weights and display names
│   │   └── LevelConfig.ts      # 20 level definitions across 2 worlds
│   ├── audio/
│   │   ├── MusicManager.ts     # Howler.js music with 10-stem progressive layering
│   │   └── SFXManager.ts       # Web Audio API procedural SFX (18 sounds)
│   ├── core/
│   │   ├── Game.ts             # Main game controller — scenes, state, spin/swap flow
│   │   ├── StateMachine.ts     # Finite state machine for game phases
│   │   └── EventBus.ts         # Pub/sub event system
│   ├── models/
│   │   ├── Symbol.ts           # CellData, PowerUpType definitions
│   │   ├── Level.ts            # LevelDef, LevelGoal interfaces
│   │   └── PlayerState.ts      # Coins, progress, localStorage persistence
│   ├── slots/
│   │   ├── SlotGrid.ts         # 5×5 visual grid, drag-to-swap, all animations
│   │   └── CascadeEngine.ts    # Match detection (3+ h/v), Fibonacci multipliers
│   ├── match3/
│   │   └── Match3Engine.ts     # Swap validation, cascade resolution, power-up creation, gravity
│   ├── effects/
│   │   └── MatchEffects.ts     # Confetti particles, floating "+score" text, burst effects
│   ├── ui/
│   │   ├── HUD.ts              # Top bar: level, score, moves, multiplier, coins, mute toggles
│   │   ├── SpinButton.ts       # SPIN / MOVES:N / DONE button state machine
│   │   ├── LevelSelect.ts      # World map with path-based level nodes
│   │   ├── LevelIntro.ts       # Per-level intro overlay (mechanic introduction)
│   │   ├── LevelComplete.ts    # Win/lose overlay with star rating
│   │   └── MenuScreen.ts       # Main menu with animated background
│   └── utils/
│       └── MathUtils.ts        # weightedRandom, shuffle, clamp, lerp, delay
├── docs/                       # Extended documentation
├── tools/
│   └── kie-mcp/                # AI art generation MCP server (kie.ai)
├── .claude/                    # Claude Code automations (skills, hooks, agents)
├── .github/workflows/          # CI: lint → type-check → build → bundle size
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Renderer | [PixiJS](https://pixijs.com) (WebGL) | 8.x |
| Language | TypeScript (strict) | 5.x |
| Animations | [GSAP](https://gsap.com) | 3.x |
| Music | [Howler.js](https://howlerjs.com) | 2.x |
| SFX | Web Audio API (procedural) | — |
| Build | [Vite](https://vitejs.dev) | 8.x |
| Linting | ESLint + Prettier | Latest |
| Git hooks | Husky + lint-staged | Latest |
| CI | GitHub Actions | — |

---

## Development Commands

```bash
npm run dev           # Start Vite dev server (default: port 3000, HMR enabled)
npm run build         # TypeScript check + Vite production build → dist/
npm run preview       # Preview production build at localhost:4173
npm run lint          # ESLint check across src/
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier format all files in src/
npm run format:check  # Prettier check (used in CI)
```

---

## Code Style & Conventions

- **TypeScript strict mode** — no implicit `any`, full null-checks required
- **Prettier** — single quotes, 120 character line width, trailing commas
- **ESLint** — TypeScript-ESLint ruleset, Prettier compatibility layer
- **Husky pre-commit hook** — runs `lint-staged` (ESLint fix + Prettier) on every commit

### Key Architecture Rules

- **GSAP + PixiJS 8:** Never use `onComplete` callbacks on PixiJS containers — they hang indefinitely. Always `await tl.then()` to sequence animations.
- **PixiJS name collision:** `Container` has a built-in `effects` property. Our particle layer is named `matchEffects` to avoid the collision.
- **HMR cleanup:** The Pixi `Application` instance is stored on `window.__kefslot_app` so that HMR can destroy and recreate it cleanly without leaking WebGL contexts.
- **State machine:** All game phase transitions flow through `StateMachine` — never mutate game state directly.

---

## Game Design Reference

### Worlds & Levels

| World | Levels | Theme | Introduces |
|-------|--------|-------|-----------|
| 1 — Enchanted Meadow | 1–10 | Fantasy outdoor | Feature ramp (one new mechanic per level) + Boss L10 |
| 2 — Crystal Caverns | 11–20 | Underground cave | New symbol palette, higher targets + Boss L20 |

### Scoring

| Match | Base Score |
|-------|-----------|
| 3 gems | 50 pts |
| 4 gems | 150 pts |
| 5 gems | 500 pts |

Cascade multipliers follow the Fibonacci sequence: **1× → 2× → 3× → 5× → 8× → 13× → 21×**

### Power-ups

| Power-up | How to Create | Effect |
|----------|--------------|--------|
| Blast | 4-in-a-line | Clears entire row or column |
| Bomb | L or T shape (4 gems) | Clears 3×3 area |
| Rainbow | 5-in-a-line | Clears all gems of one colour from the board |

---

## CI / Quality Gates

Every push and pull request runs the following GitHub Actions pipeline:

1. **Lint** — `npm run lint` (ESLint)
2. **Type-check** — `tsc --noEmit`
3. **Build** — `npm run build`
4. **Bundle size** — reports asset sizes (no hard limit yet)

---

## Contributing

1. Branch from `main`: `git checkout -b your-name/feature-description`
2. Make changes — pre-commit hook will auto-lint and format
3. Open a pull request against `main`
4. Ensure all CI checks pass before requesting review

---

## Project Status

> **Current phase: Proof of Concept**

Core gameplay loop is functional end-to-end. See the [wiki](https://github.com/KefSensei/kefslot/wiki/Game-Development) for a full breakdown of what's working, what's not, and the PoC → MVP roadmap.

---

*© KefSensei. All rights reserved.*
