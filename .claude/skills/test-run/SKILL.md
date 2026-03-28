---
name: test-run
description: Run the vitest test suite and interpret results. If tests fail, show file:line and suggest fixes. If asked to add tests for a new module, scaffold the test file. Use when asked to run tests, check if tests pass, or add tests for a file.
---

# Test Run Skill

Run and interpret the vitest suite.

## Step 1: Check vitest is installed
```bash
ls node_modules/.bin/vitest 2>/dev/null && echo "installed" || echo "not installed"
```
If not installed: tell the user to run `/test-setup` first, then stop.

## Step 2: Check test script exists
```bash
cat package.json | grep '"test"'
```
If the `test` script is missing from `package.json`, note that `/test-setup` needs to be run to add it.
You can still run directly: `npx vitest run --reporter=verbose`

## Step 3: Run tests
```bash
npx vitest run --reporter=verbose
```

## Step 4: Interpret results

**All pass:**
> "✅ X tests passed in Xms across X files."
Note if coverage is configured; if not, suggest adding it.

**Failures:**
For each failing test, report:
- Test name and file:line
- The assertion that failed (expected vs received)
- Likely cause (wrong return value, async not awaited, import error, missing mock)

## Step 5: Add tests for a new module (if requested)
1. Read the module's exported functions
2. Create `src/__tests__/<ModuleName>.test.ts` following the pattern below
3. Cover: happy path, edge cases (empty input, boundary values), error/throw conditions
4. Run again to confirm green

### Test file pattern
```ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/path/to/Module';

describe('MyModule', () => {
  describe('myFunction', () => {
    it('returns expected value for normal input', () => {
      expect(myFunction(2, 3)).toBe(5);
    });

    it('handles edge case: empty input', () => {
      expect(myFunction([], 0)).toEqual([]);
    });

    it('throws on invalid input', () => {
      expect(() => myFunction(null, -1)).toThrow();
    });
  });
});
```

### Existing test files (for reference)
- `src/__tests__/MathUtils.test.ts` — pure function tests (weightedRandom, shuffle, clamp, lerp)
- `src/__tests__/CascadeEngine.test.ts` — grid logic tests (once `/test-setup` is run)
