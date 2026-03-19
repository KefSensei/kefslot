---
name: build
description: Type-check and build the project, reporting any errors
---

# Build Skill

Run the full build pipeline and report results:

1. Run `npx tsc --noEmit` to type-check the project
2. If type-check passes, run `npm run build` to produce the production bundle in `dist/`
3. Report any errors clearly with file paths and line numbers
4. On success, report the build output size from `dist/`
