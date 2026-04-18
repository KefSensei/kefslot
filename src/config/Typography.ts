/**
 * Typography — centralized TextStyle definitions for Roxy's Magic Reels.
 *
 * Font: Cinzel (loaded from Google Fonts in index.html, weights 400 & 700).
 * All game text uses Cinzel for a consistent fantasy-tavern aesthetic.
 * Every style includes a drop-shadow or stroke to ensure legibility over
 * textured/image backgrounds at all supported screen sizes (iPhone SE min).
 */
import { TextStyle } from 'pixi.js';

const FONT = 'Cinzel, Georgia, serif';

// ── Shared shadow/stroke presets ────────────────────────────────────────────
const SHADOW_SM = { color: 0x000000, distance: 1, blur: 4, alpha: 0.8 };
const SHADOW_MD = { color: 0x000000, distance: 2, blur: 6, alpha: 0.85 };
const SHADOW_LG = { color: 0x000000, distance: 3, blur: 8, alpha: 0.9 };

// ── Display / Headings ───────────────────────────────────────────────────────

/** Large screen headings — level complete headline, world title */
export const tsHeading = new TextStyle({
  fontFamily: FONT,
  fontSize: 32,
  fontWeight: 'bold',
  fill: 0xfff0d0,
  stroke: { color: 0x3a1500, width: 6 },
  dropShadow: { ...SHADOW_LG, blur: 10 },
});

/** Mid-size heading — level name, section titles */
export const tsSubheading = new TextStyle({
  fontFamily: FONT,
  fontSize: 22,
  fontWeight: 'bold',
  fill: 0xfff0d0,
  stroke: { color: 0x3a1500, width: 4 },
  dropShadow: SHADOW_MD,
});

/** Victory headline */
export const tsVictoryHeadline = new TextStyle({
  fontFamily: FONT,
  fontSize: 33,
  fontWeight: 'bold',
  fill: 0xfff0a0,
  stroke: { color: 0x7c3000, width: 6 },
  dropShadow: { color: 0xffaa00, distance: 0, blur: 18, alpha: 0.85 },
});

/** Failure headline */
export const tsFailureHeadline = new TextStyle({
  fontFamily: FONT,
  fontSize: 33,
  fontWeight: 'bold',
  fill: 0xff6b6b,
  stroke: { color: 0x3a0000, width: 6 },
  dropShadow: { color: 0xff0000, distance: 0, blur: 18, alpha: 0.85 },
});

// ── Body / Descriptions ───────────────────────────────────────────────────────

/** Readable body text — level intro description, goal labels */
export const tsBody = new TextStyle({
  fontFamily: FONT,
  fontSize: 15,
  fill: 0xf0e0d0,
  dropShadow: SHADOW_SM,
  wordWrap: true,
  wordWrapWidth: 230,
  align: 'center',
  lineHeight: 22,
});

/** Small label — "SCORE", "LEVEL", "MOVES" caps labels */
export const tsLabel = new TextStyle({
  fontFamily: FONT,
  fontSize: 12,
  fill: 0xc0b0d8,
  letterSpacing: 2,
  dropShadow: SHADOW_SM,
});

// ── HUD values ────────────────────────────────────────────────────────────────

/** Standard HUD number — level number, move count */
export const tsHudValue = new TextStyle({
  fontFamily: FONT,
  fontSize: 22,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 3 },
  dropShadow: SHADOW_MD,
});

/** Big HUD number — score (gold) */
export const tsHudValueBig = new TextStyle({
  fontFamily: FONT,
  fontSize: 28,
  fontWeight: 'bold',
  fill: 0xf1c40f,
  stroke: { color: 0x3a2000, width: 4 },
  dropShadow: SHADOW_MD,
});

/** HUD multiplier — active cascade chain */
export const tsMultiplier = new TextStyle({
  fontFamily: FONT,
  fontSize: 24,
  fontWeight: 'bold',
  fill: 0xff8c8c,
  stroke: { color: 0x3a0000, width: 3 },
  dropShadow: { color: 0xff0000, distance: 0, blur: 8, alpha: 0.6 },
});

/** Coins display */
export const tsCoins = new TextStyle({
  fontFamily: FONT,
  fontSize: 20,
  fontWeight: 'bold',
  fill: 0xf39c12,
  stroke: { color: 0x3a2000, width: 3 },
  dropShadow: SHADOW_MD,
});

/** Centre-screen HUD message (e.g. "No moves!") */
export const tsHudMessage = new TextStyle({
  fontFamily: FONT,
  fontSize: 32,
  fontWeight: 'bold',
  fill: 0xf1c40f,
  stroke: { color: 0x000000, width: 6 },
  dropShadow: { ...SHADOW_LG, blur: 10 },
  align: 'center',
  wordWrap: true,
});

/** Mechanic/progress bar label */
export const tsMechanicBar = new TextStyle({
  fontFamily: FONT,
  fontSize: 11,
  fill: 0xccbbdd,
  letterSpacing: 1,
  dropShadow: SHADOW_SM,
});

// ── Scores & Effects ─────────────────────────────────────────────────────────

/** Score display on level complete */
export const tsScoreDisplay = new TextStyle({
  fontFamily: FONT,
  fontSize: 40,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 5 },
  dropShadow: { color: 0xf5c842, distance: 0, blur: 14, alpha: 0.9 },
});

/** Floating "+score" rising text */
export const tsFloating = new TextStyle({
  fontFamily: FONT,
  fontSize: 30,
  fontWeight: 'bold',
  fill: 0xf1c40f,
  stroke: { color: 0x000000, width: 4 },
  dropShadow: SHADOW_MD,
});

/** Cascade multiplier burst text */
export const tsCascadeBurst = new TextStyle({
  fontFamily: FONT,
  fontSize: 40,
  fontWeight: 'bold',
  fill: 0xff5722,
  stroke: { color: 0xffffff, width: 4 },
  dropShadow: { color: 0xffaa00, distance: 0, blur: 12, alpha: 0.9 },
});

// ── Buttons ──────────────────────────────────────────────────────────────────

/** Primary action button — SPIN, PLAY, Continue */
export const tsButton = new TextStyle({
  fontFamily: FONT,
  fontSize: 22,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x1a0a00, width: 3 },
  letterSpacing: 3,
  dropShadow: SHADOW_MD,
});

/** Secondary button — "Let's Go!", retry */
export const tsButtonSecondary = new TextStyle({
  fontFamily: FONT,
  fontSize: 17,
  fontWeight: 'bold',
  fill: 0xfdf0c0,
  letterSpacing: 1,
  dropShadow: SHADOW_SM,
});

// ── Level Intro ──────────────────────────────────────────────────────────────

/** Level intro scroll title */
export const tsLevelTitle = new TextStyle({
  fontFamily: FONT,
  fontSize: 20,
  fontWeight: 'bold',
  fill: 0x2a1005,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 230,
  dropShadow: { color: 0xfdf0c0, distance: 0, blur: 4, alpha: 0.6 },
});

/** Level intro scroll description */
export const tsLevelDesc = new TextStyle({
  fontFamily: FONT,
  fontSize: 13,
  fill: 0x3a2008,
  wordWrap: true,
  wordWrapWidth: 230,
  align: 'center',
  lineHeight: 20,
});

// ── Level Select / World Map ─────────────────────────────────────────────────

/** World title on map */
export const tsWorldTitle = new TextStyle({
  fontFamily: FONT,
  fontSize: 20,
  fontWeight: 'bold',
  fill: 0xfff0d0,
  stroke: { color: 0x3a1500, width: 4 },
  letterSpacing: 2,
  dropShadow: SHADOW_MD,
});

/** Level number on map node */
export const tsLevelNumber = new TextStyle({
  fontFamily: FONT,
  fontSize: 17,
  fontWeight: 'bold',
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 3 },
  dropShadow: SHADOW_MD,
});

/** Level number — boss node */
export const tsLevelNumberBoss = new TextStyle({
  fontFamily: FONT,
  fontSize: 22,
  fontWeight: 'bold',
  fill: 0xf1c40f,
  stroke: { color: 0x3a2000, width: 4 },
  dropShadow: SHADOW_MD,
});

/** Stars text on map node */
export const tsMapStars = new TextStyle({
  fontFamily: FONT,
  fontSize: 11,
  fill: 0xf1c40f,
  dropShadow: SHADOW_SM,
});

/** World nav label (previous/next world) */
export const tsWorldNav = new TextStyle({
  fontFamily: FONT,
  fontSize: 11,
  fill: 0xb0a0c0,
  dropShadow: SHADOW_SM,
});

// ── Level Complete ────────────────────────────────────────────────────────────

/** Goal item label on results screen */
export const tsGoalLabel = new TextStyle({
  fontFamily: FONT,
  fontSize: 13,
  fill: 0xffffff,
  dropShadow: SHADOW_SM,
  wordWrap: true,
  wordWrapWidth: 260,
});

/** Score label caption on results screen */
export const tsScoreLabel = new TextStyle({
  fontFamily: FONT,
  fontSize: 12,
  fill: 0xaaaaaa,
  letterSpacing: 4,
  dropShadow: SHADOW_SM,
});

/** Coins earned on results screen */
export const tsCoinEarned = new TextStyle({
  fontFamily: FONT,
  fontSize: 19,
  fontWeight: 'bold',
  fill: 0xf5d060,
  stroke: { color: 0x3a2000, width: 3 },
  dropShadow: SHADOW_MD,
});

/** Continue / retry button on results screen */
export const tsResultButton = new TextStyle({
  fontFamily: FONT,
  fontSize: 21,
  fontWeight: 'bold',
  fill: 0xffffff,
  letterSpacing: 1,
  stroke: { color: 0x1a0a00, width: 3 },
  dropShadow: SHADOW_MD,
});
