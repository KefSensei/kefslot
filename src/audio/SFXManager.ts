// ─── Synthesized SFX Manager ──────────────────────────────────────────────
// Uses Web Audio API to generate all game sounds procedurally.
// No audio files needed — everything is oscillators, noise, and envelopes.

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
  | 'coinEarned';

export interface SFXOptions {
  pitch?: number;        // semitone offset
  volume?: number;       // 0–1 override
  cascadeLevel?: number;
  starIndex?: number;    // 0, 1, 2
}

const STORAGE_KEY = 'kefslot_sfx_muted';

export class SFXManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private _muted = false;

  constructor() {
    this._muted = localStorage.getItem(STORAGE_KEY) === 'true';
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  play(name: SFXName, opts: SFXOptions = {}): void {
    if (this._muted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const vol = opts.volume ?? 0.25;
    const t = this.ctx.currentTime;

    switch (name) {
      case 'buttonPress':   this.playButtonPress(t, vol); break;
      case 'reelSpin':      this.playReelSpin(t, vol); break;
      case 'reelStop':      this.playReelStop(t, vol, opts.pitch ?? 0); break;
      case 'swap':          this.playSwap(t, vol); break;
      case 'invalidSwap':   this.playInvalidSwap(t, vol); break;
      case 'match3':        this.playMatch3(t, vol); break;
      case 'match4':        this.playMatch4(t, vol); break;
      case 'match5':        this.playMatch5(t, vol); break;
      case 'cascade':       this.playCascade(t, vol, opts.cascadeLevel ?? 0); break;
      case 'multiplier':    this.playMultiplier(t, vol); break;
      case 'powerUpCreate': this.playPowerUpCreate(t, vol); break;
      case 'confetti':      this.playConfetti(t, vol); break;
      case 'scorePop':      this.playScorePop(t, vol); break;
      case 'starEarned':    this.playStarEarned(t, vol, opts.starIndex ?? 0); break;
      case 'levelComplete': this.playLevelComplete(t, vol); break;
      case 'levelFailed':   this.playLevelFailed(t, vol); break;
      case 'coinEarned':    this.playCoinEarned(t, vol); break;
    }
  }

  get muted(): boolean { return this._muted; }

  setMuted(muted: boolean): void {
    this._muted = muted;
    localStorage.setItem(STORAGE_KEY, String(muted));
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  // ─── Context Setup ───────────────────────────────────────────────────────

  private ensureContext(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }

    this.ctx = new AudioContext();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 8;
    this.compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._muted ? 0 : 1;
    this.masterGain.connect(this.compressor);

    // Pre-generate noise buffer
    this.noiseBuffer = this.createNoiseBuffer();
  }

  private createNoiseBuffer(): AudioBuffer {
    const length = this.ctx!.sampleRate; // 1 second
    const buf = this.ctx!.createBuffer(1, length, this.ctx!.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // ─── Utility Builders ────────────────────────────────────────────────────

  private tone(
    freq: number, start: number, dur: number,
    vol: number, type: OscillatorType = 'sine',
    attack = 0.005, decay = dur * 0.8,
  ): OscillatorNode {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, start + attack + decay);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(start);
    osc.stop(start + dur + 0.05);
    return osc;
  }

  private sweep(
    startFreq: number, endFreq: number, start: number, dur: number,
    vol: number, type: OscillatorType = 'sine',
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private noise(
    start: number, dur: number, vol: number,
    filterFreq = 4000, filterType: BiquadFilterType = 'lowpass',
  ): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  // ─── Sound Recipes ───────────────────────────────────────────────────────

  private playButtonPress(t: number, vol: number): void {
    this.tone(800, t, 0.04, vol * 0.6, 'sine', 0.002, 0.03);
    this.tone(600, t + 0.005, 0.03, vol * 0.3, 'sine', 0.002, 0.025);
  }

  private playReelSpin(t: number, vol: number): void {
    // A series of quick ticks that slow down, simulating a spinning reel
    const ticks = 12;
    for (let i = 0; i < ticks; i++) {
      const offset = i * 0.06 + i * i * 0.003; // accelerating gaps
      const freq = 300 + Math.random() * 100;
      this.tone(freq, t + offset, 0.03, vol * 0.15, 'square', 0.002, 0.025);
    }
    // Low rumble underneath
    this.noise(t, 0.8, vol * 0.08, 800, 'lowpass');
  }

  private playReelStop(t: number, vol: number, pitch: number): void {
    const baseFreq = 200 + pitch * 20;
    // Thud: sine sweep down
    this.sweep(baseFreq, 60, t, 0.15, vol * 0.5, 'sine');
    // Impact noise
    this.noise(t, 0.08, vol * 0.3, 1200, 'lowpass');
    // Subtle click on top
    this.tone(800 + pitch * 50, t, 0.02, vol * 0.2, 'sine', 0.001, 0.015);
  }

  private playSwap(t: number, vol: number): void {
    // Quick swoosh: bandpass noise sweep
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(5000, t + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    src.start(t);
    src.stop(t + 0.2);

    // Tiny pitch accent
    this.tone(1200, t, 0.06, vol * 0.15, 'sine', 0.005, 0.05);
  }

  private playInvalidSwap(t: number, vol: number): void {
    // Low buzz
    this.tone(150, t, 0.18, vol * 0.4, 'square', 0.01, 0.15);
    this.tone(155, t, 0.18, vol * 0.3, 'square', 0.01, 0.15); // detune for wobble
    this.noise(t, 0.1, vol * 0.1, 600, 'lowpass');
  }

  private playMatch3(t: number, vol: number): void {
    // Bright chime: perfect fifth
    this.tone(880, t, 0.25, vol * 0.5, 'sine', 0.005, 0.2);
    this.tone(1320, t + 0.01, 0.22, vol * 0.35, 'sine', 0.005, 0.18);
    // Tiny sparkle
    this.tone(2640, t + 0.02, 0.08, vol * 0.1, 'sine', 0.002, 0.06);
  }

  private playMatch4(t: number, vol: number): void {
    // Richer major chord
    this.tone(880, t, 0.3, vol * 0.5, 'sine', 0.005, 0.25);
    this.tone(1100, t + 0.01, 0.28, vol * 0.4, 'sine', 0.005, 0.22);
    this.tone(1320, t + 0.02, 0.26, vol * 0.35, 'sine', 0.005, 0.2);
    // Sparkle tail
    this.tone(2640, t + 0.05, 0.1, vol * 0.15, 'sine', 0.002, 0.08);
    this.tone(3300, t + 0.08, 0.08, vol * 0.1, 'sine', 0.002, 0.06);
  }

  private playMatch5(t: number, vol: number): void {
    // Ascending arpeggio: C5-E5-G5 with shimmer
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i], t + i * 0.08, 0.3, vol * 0.45, 'sine', 0.005, 0.25);
    }
    // Shimmer noise
    this.noise(t + 0.1, 0.35, vol * 0.12, 6000, 'highpass');
    // High sparkle
    this.tone(3000, t + 0.2, 0.15, vol * 0.12, 'sine', 0.005, 0.12);
    this.tone(4000, t + 0.28, 0.12, vol * 0.08, 'sine', 0.005, 0.1);
  }

  private playCascade(t: number, vol: number, level: number): void {
    // Ascending pitch per cascade level
    const freq = 600 + level * 120;
    this.tone(freq, t, 0.18, vol * 0.5, 'sine', 0.005, 0.14);
    this.tone(freq * 1.5, t + 0.02, 0.14, vol * 0.3, 'sine', 0.005, 0.1);
    // Higher levels get extra sparkle
    if (level >= 2) {
      this.tone(freq * 2, t + 0.04, 0.1, vol * 0.15, 'sine', 0.003, 0.08);
    }
    if (level >= 4) {
      this.noise(t, 0.15, vol * 0.08, 5000, 'highpass');
    }
  }

  private playMultiplier(t: number, vol: number): void {
    // Quick ascending slide
    this.sweep(400, 1200, t, 0.2, vol * 0.3, 'sine');
    this.tone(1200, t + 0.18, 0.1, vol * 0.2, 'sine', 0.005, 0.08);
  }

  private playPowerUpCreate(t: number, vol: number): void {
    // Three ascending high pings
    this.tone(2000, t, 0.08, vol * 0.3, 'sine', 0.002, 0.06);
    this.tone(2400, t + 0.06, 0.08, vol * 0.3, 'sine', 0.002, 0.06);
    this.tone(2800, t + 0.12, 0.12, vol * 0.35, 'sine', 0.002, 0.1);
    // Magical shimmer
    this.noise(t + 0.05, 0.2, vol * 0.1, 4000, 'highpass');
  }

  private playConfetti(t: number, vol: number): void {
    // Random sparkle pings
    for (let i = 0; i < 5; i++) {
      const freq = 3000 + Math.random() * 2000;
      const offset = Math.random() * 0.15;
      this.tone(freq, t + offset, 0.06, vol * 0.12, 'sine', 0.002, 0.04);
    }
  }

  private playScorePop(t: number, vol: number): void {
    // Quick pop
    this.tone(1200, t, 0.06, vol * 0.35, 'sine', 0.002, 0.04);
    this.tone(1800, t + 0.01, 0.04, vol * 0.15, 'sine', 0.002, 0.03);
  }

  private playStarEarned(t: number, vol: number, starIndex: number): void {
    // Bell tone that ascends per star
    const baseFreq = 800 + starIndex * 200;
    this.tone(baseFreq, t, 0.4, vol * 0.5, 'sine', 0.005, 0.35);
    this.tone(baseFreq * 2, t + 0.01, 0.3, vol * 0.2, 'sine', 0.005, 0.25); // overtone
    // Slight vibrato via second detuned osc
    this.tone(baseFreq * 1.002, t, 0.4, vol * 0.25, 'sine', 0.005, 0.35);
    // Sparkle on higher stars
    if (starIndex >= 1) {
      this.tone(baseFreq * 3, t + 0.05, 0.15, vol * 0.1, 'sine', 0.003, 0.12);
    }
  }

  private playLevelComplete(t: number, vol: number): void {
    // C-E-G-C victory fanfare arpeggio
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i], t + i * 0.12, 0.35, vol * 0.5, 'sine', 0.005, 0.3);
      this.tone(notes[i] * 0.5, t + i * 0.12, 0.3, vol * 0.2, 'sine', 0.005, 0.25); // octave below
    }
    // Final sustained chord
    this.tone(523, t + 0.5, 0.5, vol * 0.3, 'sine', 0.01, 0.45);
    this.tone(659, t + 0.5, 0.5, vol * 0.25, 'sine', 0.01, 0.45);
    this.tone(784, t + 0.5, 0.5, vol * 0.2, 'sine', 0.01, 0.45);
    // Shimmer tail
    this.noise(t + 0.3, 0.5, vol * 0.08, 5000, 'highpass');
  }

  private playLevelFailed(t: number, vol: number): void {
    // Descending minor: E-C-A
    const notes = [659, 523, 440];
    for (let i = 0; i < notes.length; i++) {
      this.tone(notes[i], t + i * 0.15, 0.35, vol * 0.4, 'sine', 0.01, 0.3);
    }
    // Dark low tone
    this.tone(220, t + 0.4, 0.4, vol * 0.2, 'sine', 0.01, 0.35);
  }

  private playCoinEarned(t: number, vol: number): void {
    // Two quick metallic pings
    this.tone(1800, t, 0.06, vol * 0.4, 'sine', 0.002, 0.04);
    this.tone(2200, t + 0.04, 0.08, vol * 0.35, 'sine', 0.002, 0.06);
    // Tiny noise for metallic texture
    this.noise(t, 0.04, vol * 0.08, 8000, 'highpass');
  }
}
