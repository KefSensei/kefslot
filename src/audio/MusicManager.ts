import { Howl } from 'howler';

import stem0Url from './Finding Roxy Stems/0 Lead Vocals.mp3';
import stem1Url from './Finding Roxy Stems/1 Backing Vocals.mp3';
import stem2Url from './Finding Roxy Stems/2 Drums.mp3';
import stem3Url from './Finding Roxy Stems/3 Bass.mp3';
import stem4Url from './Finding Roxy Stems/4 Guitar.mp3';
import stem5Url from './Finding Roxy Stems/5 Keyboard.mp3';
import stem6Url from './Finding Roxy Stems/6 Percussion.mp3';
import stem7Url from './Finding Roxy Stems/7 Synth.mp3';
import stem8Url from './Finding Roxy Stems/8 Other.mp3';
import stem9Url from './Finding Roxy Stems/9 Brass.mp3';

const STEM_URLS = [
  stem0Url, stem1Url, stem2Url, stem3Url, stem4Url,
  stem5Url, stem6Url, stem7Url, stem8Url, stem9Url,
];

// Progress thresholds: when ratio >= threshold, the stem becomes audible
const STEM_THRESHOLDS = [
  0,     // 0: Lead Vocals — always on
  0.1,   // 1: Backing Vocals
  0.1,   // 2: Drums
  0.25,  // 3: Bass
  0.4,   // 4: Guitar
  0.4,   // 5: Keyboard
  0.55,  // 6: Percussion
  0.7,   // 7: Synth
  0.85,  // 8: Other
  0.95,  // 9: Brass — full song
];

const FADE_MS = 800;
const STEM_VOLUME = 0.7;

export class MusicManager {
  private stems: Howl[] = [];
  private active: boolean[] = [];
  private loaded = false;
  private playing = false;

  /** Preload all stems (call after a user gesture) */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;

    for (let i = 0; i < STEM_URLS.length; i++) {
      const howl = new Howl({
        src: [STEM_URLS[i]],
        loop: true,
        volume: 0,
        preload: true,
      });
      this.stems.push(howl);
      this.active.push(false);
    }
  }

  /** Start playback — all stems play in sync, only stem 0 is audible */
  start(): void {
    if (!this.loaded) this.load();

    // Stop any previous playback
    this.stopPlayback();

    this.playing = true;
    this.active = this.active.map(() => false);

    for (let i = 0; i < this.stems.length; i++) {
      this.stems[i].volume(0);
      this.stems[i].play();
    }

    // Fade in lead vocals
    this.stems[0].fade(0, STEM_VOLUME, FADE_MS);
    this.active[0] = true;
  }

  /** Update which stems are audible based on progress ratio (0–1) */
  setProgress(ratio: number): void {
    if (!this.playing) return;

    for (let i = 0; i < this.stems.length; i++) {
      if (this.active[i]) continue; // already on, never turn off (additive)

      if (ratio >= STEM_THRESHOLDS[i]) {
        this.active[i] = true;
        this.stems[i].fade(0, STEM_VOLUME, FADE_MS);
      }
    }
  }

  /** Stop all stems and reset */
  stop(): void {
    this.stopPlayback();
    this.playing = false;
    this.active = this.active.map(() => false);
  }

  private stopPlayback(): void {
    for (const stem of this.stems) {
      stem.stop();
    }
  }
}
