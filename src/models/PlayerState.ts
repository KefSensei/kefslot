export interface LevelResult {
  stars: number; // 0-3
  bestScore: number;
}

export interface PlayerData {
  coins: number;
  currentLevel: number;
  levelResults: Record<number, LevelResult>;
  musicMuted: boolean;
}

const STORAGE_KEY = 'roxy_magic_reels_save';

export class PlayerState {
  data: PlayerData;

  constructor() {
    this.data = this.load();
  }

  get coins(): number { return this.data.coins; }
  get currentLevel(): number { return this.data.currentLevel; }
  get musicMuted(): boolean { return this.data.musicMuted; }

  setMusicMuted(muted: boolean): void {
    this.data.musicMuted = muted;
    this.save();
  }

  addCoins(amount: number): void {
    this.data.coins += amount;
    this.save();
  }

  completeLevel(levelId: number, score: number, stars: number): void {
    const existing = this.data.levelResults[levelId];
    if (!existing || score > existing.bestScore) {
      this.data.levelResults[levelId] = { stars: Math.max(stars, existing?.stars ?? 0), bestScore: score };
    }
    if (levelId >= this.data.currentLevel) {
      this.data.currentLevel = levelId + 1;
    }
    this.save();
  }

  isLevelUnlocked(levelId: number): boolean {
    return levelId <= this.data.currentLevel;
  }

  getStars(levelId: number): number {
    return this.data.levelResults[levelId]?.stars ?? 0;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { /* storage full or unavailable */ }
  }

  private load(): PlayerData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* corrupt data */ }
    return { coins: 1000, currentLevel: 1, levelResults: {}, musicMuted: false };
  }
}
