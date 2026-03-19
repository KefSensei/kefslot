import { Assets, Texture } from 'pixi.js';

import rubyUrl from '@/assets/sprites/symbol-ruby.png';
import emeraldUrl from '@/assets/sprites/symbol-emerald.png';
import sapphireUrl from '@/assets/sprites/symbol-sapphire.png';
import amethystUrl from '@/assets/sprites/symbol-amethyst.png';
import topazUrl from '@/assets/sprites/symbol-topaz.png';
import potionUrl from '@/assets/sprites/symbol-potion.png';
import roxyUrl from '@/assets/sprites/symbol-roxy.png';
import scatterUrl from '@/assets/sprites/symbol-scatter.png';
import multiplierUrl from '@/assets/sprites/symbol-multiplier.png';
import crystalUrl from '@/assets/sprites/symbol-crystal.png';
import mushroomUrl from '@/assets/sprites/symbol-mushroom.png';
import batUrl from '@/assets/sprites/symbol-bat.png';

const SYMBOL_URLS: Record<string, string> = {
  ruby: rubyUrl,
  emerald: emeraldUrl,
  sapphire: sapphireUrl,
  amethyst: amethystUrl,
  topaz: topazUrl,
  potion: potionUrl,
  roxy: roxyUrl,
  scatter: scatterUrl,
  multiplier: multiplierUrl,
  crystal: crystalUrl,
  mushroom: mushroomUrl,
  bat: batUrl,
};

const textureCache = new Map<string, Texture>();
let loaded = false;

export async function loadSymbolTextures(): Promise<void> {
  if (loaded) return;
  const entries = Object.entries(SYMBOL_URLS);
  const textures = await Promise.all(entries.map(([, url]) => Assets.load<Texture>(url)));
  entries.forEach(([id], i) => textureCache.set(id, textures[i]));
  loaded = true;
}

export function getSymbolTexture(symbolId: string): Texture | undefined {
  return textureCache.get(symbolId);
}
