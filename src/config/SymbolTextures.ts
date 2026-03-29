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

// World 3: Volcanic Forge
import obsidianUrl from '@/assets/sprites/symbol-obsidian.png';
import magmaUrl from '@/assets/sprites/symbol-magma.png';
import emberUrl from '@/assets/sprites/symbol-ember.png';
import slagUrl from '@/assets/sprites/symbol-slag.png';

// World 4: Sunken Ruins
import pearlUrl from '@/assets/sprites/symbol-pearl.png';
import coralUrl from '@/assets/sprites/symbol-coral.png';
import shellUrl from '@/assets/sprites/symbol-shell.png';
import tridentUrl from '@/assets/sprites/symbol-trident.png';

// World 5: Skyward Spire
import cloudUrl from '@/assets/sprites/symbol-cloud.png';
import lightningUrl from '@/assets/sprites/symbol-lightning.png';
import windUrl from '@/assets/sprites/symbol-wind.png';
import featherUrl from '@/assets/sprites/symbol-feather.png';

// World 6: Shadow Forest
import moonstoneUrl from '@/assets/sprites/symbol-moonstone.png';
import nightbloomUrl from '@/assets/sprites/symbol-nightbloom.png';
import shadowgemUrl from '@/assets/sprites/symbol-shadowgem.png';
import sporeUrl from '@/assets/sprites/symbol-spore.png';

// World 7: Frozen Wastes
import icicleUrl from '@/assets/sprites/symbol-icicle.png';
import snowflakeUrl from '@/assets/sprites/symbol-snowflake.png';
import froststoneUrl from '@/assets/sprites/symbol-froststone.png';
import auroraUrl from '@/assets/sprites/symbol-aurora.png';

// World 8: Dragon's Lair
import firegemUrl from '@/assets/sprites/symbol-firegem.png';
import dragonfangUrl from '@/assets/sprites/symbol-dragonfang.png';
import dragonscaleUrl from '@/assets/sprites/symbol-dragonscale.png';
import moltenUrl from '@/assets/sprites/symbol-molten.png';

// World 9: Astral Realm
import stardustUrl from '@/assets/sprites/symbol-stardust.png';
import nebulaUrl from '@/assets/sprites/symbol-nebula.png';
import cometUrl from '@/assets/sprites/symbol-comet.png';
import voidUrl from '@/assets/sprites/symbol-void.png';

// World 10: Roxy's Tower
import arcaneUrl from '@/assets/sprites/symbol-arcane.png';
import runicUrl from '@/assets/sprites/symbol-runic.png';
import enchantedUrl from '@/assets/sprites/symbol-enchanted.png';
import towerUrl from '@/assets/sprites/symbol-tower.png';
import prestigeUrl from '@/assets/sprites/symbol-prestige.png';

const SYMBOL_URLS: Record<string, string> = {
  // World 1: Enchanted Meadow
  ruby: rubyUrl,
  emerald: emeraldUrl,
  sapphire: sapphireUrl,
  amethyst: amethystUrl,
  topaz: topazUrl,
  potion: potionUrl,
  roxy: roxyUrl,
  scatter: scatterUrl,
  multiplier: multiplierUrl,
  // World 2: Crystal Caverns
  crystal: crystalUrl,
  mushroom: mushroomUrl,
  bat: batUrl,
  // World 3: Volcanic Forge
  obsidian: obsidianUrl,
  magma: magmaUrl,
  ember: emberUrl,
  slag: slagUrl,
  // World 4: Sunken Ruins
  pearl: pearlUrl,
  coral: coralUrl,
  shell: shellUrl,
  trident: tridentUrl,
  // World 5: Skyward Spire
  cloud: cloudUrl,
  lightning: lightningUrl,
  wind: windUrl,
  feather: featherUrl,
  // World 6: Shadow Forest
  moonstone: moonstoneUrl,
  nightbloom: nightbloomUrl,
  shadowgem: shadowgemUrl,
  spore: sporeUrl,
  // World 7: Frozen Wastes
  icicle: icicleUrl,
  snowflake: snowflakeUrl,
  froststone: froststoneUrl,
  aurora: auroraUrl,
  // World 8: Dragon's Lair
  firegem: firegemUrl,
  dragonfang: dragonfangUrl,
  dragonscale: dragonscaleUrl,
  molten: moltenUrl,
  // World 9: Astral Realm
  stardust: stardustUrl,
  nebula: nebulaUrl,
  comet: cometUrl,
  void: voidUrl,
  // World 10: Roxy's Tower
  arcane: arcaneUrl,
  runic: runicUrl,
  enchanted: enchantedUrl,
  tower: towerUrl,
  prestige: prestigeUrl,
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
