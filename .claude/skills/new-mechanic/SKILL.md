---
name: new-mechanic
description: Scaffold a new level mechanic in src/mechanics/MechanicsEngine.ts, following the existing lifecycle hook pattern. Use when asked to add a mechanic, implement a new level mechanic, or add a new gameplay modifier.
---

# New Mechanic Skill

Add a new mechanic to the KefSlot game engine.

## Background
All mechanics live in `src/mechanics/MechanicsEngine.ts` (~1,150 lines).
They are **data-driven**: activated by properties on `LevelDef` in `src/config/LevelConfig.ts`.

**4 lifecycle hooks** (each returns events/bonuses to notify UI):
- `onSpinStart()` → fires before reel drop; use for pre-spin mutations (freeze, shift, spread)
- `onSpinEnd()` → fires after cascade resolves; use for initial placement (place fog, set locks)
- `onSwap(r1, c1, r2, c2)` → fires on valid swap; use for combo tracking, reveals
- `onMatchCleared(matches)` → fires when matches are destroyed; use for bonus scoring, tracking

The engine is accessed in `Game.ts` via `this.match3.getMechanics()`.

---

## Step 1: Name and describe
If the mechanic name and behavior weren't specified, ask:
> "What should the mechanic do? When does it trigger, and what does it affect?"

## Step 2: Read the relevant section of MechanicsEngine.ts
Read `src/mechanics/MechanicsEngine.ts` — find a similar existing mechanic to use as a pattern.
Look at: state variable declaration, `setLevel()` reset, lifecycle hook activation, and private helper naming.

## Step 3: Add state variable(s)
In the class body, add a state variable. Always reset it in `setLevel()`:
```ts
private fooActive: boolean = false;
private fooCount: number = 0;

setLevel(level: LevelDef): void {
  // ... existing resets ...
  this.fooActive = !!level.fooMechanic;
  this.fooCount = 0;
}
```

## Step 4: Add lifecycle activation
In the appropriate hook(s), add a gated block:
```ts
onSpinStart(): MechanicEvent[] {
  const events: MechanicEvent[] = [];
  // ... existing mechanics ...
  if (this.fooActive) {
    this.spreadFoo();
    events.push({ type: 'foo-spread', data: {} });
  }
  return events;
}
```

## Step 5: Add private helper method
Name it consistently: `placeFoo()`, `spreadFoo()`, `setupFoo()`, `applyFoo()`:
```ts
private spreadFoo(): void {
  // mutate this.grid as needed
  const neighbors = this.getNeighbors(r, c);
  // ...
}
```
Use existing helpers where possible: `getNeighbors()`, `getRandomEmptyCells()`, `getRandomSymbolId()`.

## Step 6: Emit a MechanicEvent
Use a descriptive string for `type` so the UI/animations can respond:
```ts
events.push({ type: 'foo-activated', data: { count: affected.length } });
```

## Step 7: Extend LevelDef type
In `src/models/Level.ts`, add the new optional property:
```ts
export interface LevelDef {
  // ... existing fields ...
  fooMechanic?: boolean;        // or: fooMechanic?: { intensity: number }
}
```

## Step 8: Assign to levels
In `src/config/LevelConfig.ts`, add `fooMechanic: true` (or appropriate config) to the relevant levels.

## Step 9: Build
Run `/build` to type-check. Fix any errors before continuing.

## Step 10: Document
If the visual/animation side isn't wired up yet, add to CLAUDE.md under "Not Yet Implemented":
```
- Foo mechanic visuals (logic works, no animation yet)
```

---

## Critical files
- `src/mechanics/MechanicsEngine.ts` — state + hooks + helpers
- `src/models/Level.ts` — LevelDef type extension
- `src/config/LevelConfig.ts` — assign mechanic to levels
