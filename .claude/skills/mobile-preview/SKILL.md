---
name: mobile-preview
description: Build the game and sync to iOS or Android via Capacitor, then open the native IDE. Use when asked to preview on mobile, open on iOS/Android, run cap sync, or test on device.
---

# Mobile Preview Skill

Build and sync the game to a native mobile target via Capacitor.

## iOS (default)

### Step 1: Build + sync
```bash
npm run cap:sync
```
This runs `npm run build && npx cap sync ios` — compiles TypeScript, bundles with Vite, then copies `dist/` into the Xcode project.

### Step 2: Open Xcode
```bash
npm run cap:open
```
This runs `npx cap open ios` — opens the Xcode workspace.

### Step 3: In Xcode
1. Select a target device or simulator from the device dropdown
2. Click the Run ▶ button (or ⌘R)
3. The app will install and launch

---

## Android

No dedicated npm script — run manually:

### Step 1: Build + sync
```bash
npm run build && npx cap sync android
```

### Step 2: Open Android Studio
```bash
npx cap open android
```

### Step 3: In Android Studio
1. Wait for Gradle sync to complete
2. Select a device or emulator from the device dropdown
3. Click Run ▶

---

## Livereload on a physical device

Not currently configured. `vite.config.ts` binds to `localhost` only (no `host: true`).

To enable livereload on a real device:
1. Add `host: true` to the `server` block in `vite.config.ts`
2. Find your machine's LAN IP: `ipconfig getifaddr en0` (macOS)
3. Update `capacitor.config.ts` — add a `server` block:
   ```ts
   server: {
     url: 'http://192.168.x.x:3005',
     cleartext: true,
   }
   ```
4. Run the dev server (`/dev`), then sync and open as normal
5. Machine and device must be on the same Wi-Fi network

---

## Config file
`capacitor.config.ts` at project root — app ID, name, web dir, and optional server URL.
