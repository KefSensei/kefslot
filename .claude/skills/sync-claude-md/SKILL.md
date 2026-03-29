---
name: sync-claude-md
description: Audit CLAUDE.md against the actual repo and update it to match reality. Use when CLAUDE.md may be outdated, after merging new features, or when the project structure has changed.
---

# Sync CLAUDE.md Skill

Your job is to make CLAUDE.md accurately reflect the current state of the repo. Do not summarize or compress existing content — preserve all detail, only correct what's wrong and add what's missing.

## Step 1: Read current CLAUDE.md
Read the full contents of CLAUDE.md from disk.

## Step 2: Audit the actual repo structure
Run the following and capture all output:
```bash
find src -type f | sort
ls -la
ls android/ 2>/dev/null && echo "android exists" || echo "no android"
ls ios/ 2>/dev/null && echo "ios exists" || echo "no ios"
cat package.json | grep -E '"dependencies"|"devDependencies"' -A 50 | head -80
```

## Step 3: Identify every discrepancy
Compare what CLAUDE.md says against what the audit found. For each discrepancy, note:
- **Missing from CLAUDE.md** — files/dirs that exist on disk but aren't documented
- **Wrong in CLAUDE.md** — documented things that don't match reality (wrong paths, wrong library names, wrong patterns)
- **Stale in CLAUDE.md** — documented things that no longer exist on disk

List all discrepancies clearly before making any edits.

## Step 4: Confirm before editing
Present the full discrepancy list to the user and ask:
"Ready to apply these updates to CLAUDE.md?"
Wait for explicit confirmation before proceeding.

## Step 5: Apply updates
Edit CLAUDE.md to:
- Add missing directories and files to the architecture tree
- Correct any wrong library or system references
- Remove references to things that no longer exist
- Add a `## Mobile` section if `android/` or `ios/` exist and aren't documented
- Ensure the audio system description matches actual files in `src/audio/`

Do not rewrite sections that are still accurate. Surgical edits only.

## Step 6: Verify
Re-read the updated CLAUDE.md and confirm every directory in `src/` is now represented.
Report a summary of what was changed.
