// ─── SFX Manager ─────────────────────────────────────────────────────────────
// All sounds are AI-generated files played via Howler.js.

import { Howl } from 'howler';

import blockerBreakUrl from '@/audio/sfx/sfx-blocker-break.mp3';
import blockerCrackUrl from '@/audio/sfx/sfx-blocker-crack.mp3';
import buttonPressUrl from '@/audio/sfx/sfx-button-press.mp3';
import cascadeBurstUrl from '@/audio/sfx/sfx-cascade-burst.mp3';
import coinCollectUrl from '@/audio/sfx/sfx-coin-collect.mp3';
import confettiUrl from '@/audio/sfx/sfx-confetti.mp3';
import invalidSwapUrl from '@/audio/sfx/sfx-invalid-swap.mp3';
import levelCompleteUrl from '@/audio/sfx/sfx-level-complete.mp3';
import levelFailedUrl from '@/audio/sfx/sfx-level-failed.mp3';
import levelIntroUrl from '@/audio/sfx/sfx-level-intro.mp3';
import match3Url from '@/audio/sfx/sfx-match3.mp3';
import match4Url from '@/audio/sfx/sfx-match4.mp3';
import match5Url from '@/audio/sfx/sfx-match5.mp3';
import multiplierUrl from '@/audio/sfx/sfx-multiplier.mp3';
import powerupActivateUrl from '@/audio/sfx/sfx-powerup-activate.mp3';
import powerupCreateUrl from '@/audio/sfx/sfx-powerup-create.mp3';
import reelStopUrl from '@/audio/sfx/sfx-reel-stop.mp3';
import reelSpinUrl from '@/audio/sfx/sfx-spin-reel.mp3';
import scorePopUrl from '@/audio/sfx/sfx-score-pop.mp3';
import starPopUrl from '@/audio/sfx/sfx-star-pop.mp3';
import swapUrl from '@/audio/sfx/sfx-swap.mp3';

export type SFXName =
  | 'buttonPress'
  | 'reelSpin'
  | 'reelStop'
  | 'swap'
  | 'invalidSwap'
  | 'match3'
  | 'match4'
  | 'match5'
  | 'cascade'
  | 'multiplier'
  | 'powerUpCreate'
  | 'confetti'
  | 'scorePop'
  | 'starEarned'
  | 'levelComplete'
  | 'levelFailed'
  | 'coinEarned'
  | 'levelIntro'
  | 'powerUpActivate'
  | 'blockerCrack'
  | 'blockerBreak';

export interface SFXOptions {
  pitch?: number;
  volume?: number;
  cascadeLevel?: number;
  starIndex?: number; // 0, 1, 2
}

const STORAGE_KEY = 'kefslot_sfx_muted';

function howl(url: string, volume = 0.55): Howl {
  return new Howl({ src: [url], volume, preload: true });
}

const sfx: Record<SFXName, Howl> = {
  buttonPress: howl(buttonPressUrl, 0.5),
  reelSpin: howl(reelSpinUrl, 0.45),
  reelStop: howl(reelStopUrl, 0.55),
  swap: howl(swapUrl, 0.45),
  invalidSwap: howl(invalidSwapUrl, 0.5),
  match3: howl(match3Url, 0.7),
  match4: howl(match4Url, 0.75),
  match5: howl(match5Url, 0.8),
  cascade: howl(cascadeBurstUrl, 0.65),
  multiplier: howl(multiplierUrl, 0.55),
  powerUpCreate: howl(powerupCreateUrl, 0.7),
  confetti: howl(confettiUrl, 0.45),
  scorePop: howl(scorePopUrl, 0.4),
  starEarned: howl(starPopUrl, 0.7),
  levelComplete: howl(levelCompleteUrl, 0.75),
  levelFailed: howl(levelFailedUrl, 0.6),
  coinEarned: howl(coinCollectUrl, 0.55),
  levelIntro: howl(levelIntroUrl, 0.55),
  powerUpActivate: howl(powerupActivateUrl, 0.75),
  blockerCrack: howl(blockerCrackUrl, 0.55),
  blockerBreak: howl(blockerBreakUrl, 0.65),
};

export class SFXManager {
  private _muted = false;

  constructor() {
    this._muted = localStorage.getItem(STORAGE_KEY) === 'true';
    if (this._muted) Object.values(sfx).forEach((h) => h.mute(true));
  }

  play(name: SFXName, opts: SFXOptions = {}): void {
    if (this._muted) return;

    const h = sfx[name];

    // cascade pitch rises with level; star pitch rises with star index
    let rate = 1;
    if (name === 'cascade') rate = 1 + (opts.cascadeLevel ?? 0) * 0.1;
    if (name === 'starEarned') rate = 1 + (opts.starIndex ?? 0) * 0.18;

    const id = h.play();
    if (rate !== 1) h.rate(rate, id);
  }

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    localStorage.setItem(STORAGE_KEY, String(muted));
    Object.values(sfx).forEach((h) => h.mute(muted));
  }
}
