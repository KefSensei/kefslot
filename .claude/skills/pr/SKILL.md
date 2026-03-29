---
name: pr
description: Full git workflow — lint, type-check, commit with conventional message, push branch, and open a pull request with a structured description. Use when asked to create a PR, open a pull request, push and PR, or submit for review.
---

# PR Skill

Run the full pre-PR pipeline and open a pull request.

## Step 1: Understand current state
```bash
git status
git log --oneline -5
git branch --show-current
```

## Step 2: Lint
```bash
npm run lint
```
- Auto-fixable issues will be fixed by ESLint.
- If unfixable errors remain, report them and **stop** — do not commit broken code.

## Step 3: Type-check
```bash
npx tsc --noEmit
```
If type errors exist, report them with file:line and **stop**.

## Step 4: Stage changes
Never use `git add -A` or `git add .` — stage by directory or specific files:
```bash
git add src/ .claude/ <other changed files by name>
```
Exclude: `.env`, `dist/`, `node_modules/`, any secrets.

## Step 5: Commit
Write the commit message in **this repo's style** — imperative sentence, no prefix:
- ✅ `"Add sync-claude-md and new-mechanic skills to .claude/skills/"`
- ❌ `"feat: add skills"` (not this repo's style)

```bash
git commit -m "$(cat <<'EOF'
<Your message here>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

## Step 6: Push
```bash
git push -u origin $(git branch --show-current)
```

## Step 7: Create PR
No `.github/pull_request_template.md` exists — use this template:

```bash
gh pr create --title "<imperative title, ≤70 chars>" --body "$(cat <<'EOF'
## Summary
- <bullet: what changed and why>

## Test plan
- [ ] <how to verify this works>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Step 8: Output
Return the PR URL so the user can see it.

---

## Branch naming (for new work)
`feat/`, `fix/`, `refactor/`, `chore/`, `docs/` + kebab-case description.
Examples: `feat/new-mechanic-fog`, `fix/drag-stuck-state`, `chore/update-deps`
