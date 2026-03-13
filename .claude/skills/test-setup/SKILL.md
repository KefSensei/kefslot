---
name: test-setup
description: Scaffold vitest testing framework for this PixiJS + TypeScript + Vite project
disable-model-invocation: true
---

# Test Setup Skill

Set up vitest for the KefSlot project:

1. Install vitest as a dev dependency: `npm install -D vitest`
2. Add a `test` script to package.json: `"test": "vitest run"`, `"test:watch": "vitest"`
3. Create `vitest.config.ts` at the project root with:
   - Path alias `@` → `src/` (matching existing vite.config.ts)
   - Environment: `jsdom` (for PixiJS container mocking if needed)
4. Create a `src/__tests__/` directory with a sample test file (`MathUtils.test.ts`) that tests functions from `src/utils/MathUtils.ts` (weightedRandom, shuffle, clamp, lerp)
5. Create a `src/__tests__/CascadeEngine.test.ts` that tests match detection from `src/slots/CascadeEngine.ts`
6. Run `npx vitest run` to verify the setup works
