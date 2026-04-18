import { SymbolDef } from '@/config/SymbolConfig';

export function weightedRandom(symbols: SymbolDef[]): SymbolDef {
  const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const sym of symbols) {
    roll -= sym.weight;
    if (roll <= 0) return sym;
  }
  return symbols[symbols.length - 1];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scale and position a Sprite so it covers (fills with crop) a given rectangle,
 * preserving the texture's aspect ratio. Equivalent to CSS `object-fit: cover`.
 */
export function coverSprite(
  sprite: { width: number; height: number; x: number; y: number; texture: { width: number; height: number } },
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const texW = sprite.texture.width;
  const texH = sprite.texture.height;
  if (!texW || !texH) return;
  const texAR = texW / texH;
  const targetAR = w / h;

  if (texAR > targetAR) {
    // Texture wider than target — fit height, crop sides
    sprite.height = h;
    sprite.width = h * texAR;
  } else {
    // Texture taller than target — fit width, crop top/bottom
    sprite.width = w;
    sprite.height = w / texAR;
  }
  sprite.x = x + (w - sprite.width) / 2;
  sprite.y = y + (h - sprite.height) / 2;
}
