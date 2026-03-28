---
name: dev
description: Start the Vite dev server for local development, confirm it's running, and report the local URL. Use when asked to start the dev server, run the game, launch dev, or check if the server is running.
---

# Dev Skill

Start and confirm the local web development server.

## Step 1: Check if already running
```bash
lsof -ti:3005
```
If output is non-empty, the server is already on port 3005. Report:
> "Dev server already running at http://localhost:3005"
Stop here.

## Step 2: Start the dev server
Start Vite on port 3005 in the background:
```bash
node node_modules/.bin/vite --port 3005
```
Run this as a background process.

## Step 3: Confirm it's up
Wait ~2 seconds, then verify the port is now listening:
```bash
lsof -ti:3005
```
Once confirmed, report:
> "Dev server started at http://localhost:3005"

## Notes
- `vite.config.ts` does **not** have `host: true` — the server binds to localhost only.
  If you need access from a physical device on the same network, add `host: true` to the
  `server` block in `vite.config.ts` before starting.
- Port is also configurable via the `$PORT` environment variable (default: 3000, overridden here to 3005).
- For mobile device testing, use `/mobile-preview` instead.
