/** Lighten a hex color by amount (0-1). 0 = unchanged, 1 = white */
export function lightenColor(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * amount);
  const b = Math.min(255, (color & 0xff) + (255 - (color & 0xff)) * amount);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Darken a hex color by amount (0-1). 0 = unchanged, 1 = black */
export function darkenColor(color: number, amount: number): number {
  const r = ((color >> 16) & 0xff) * (1 - amount);
  const g = ((color >> 8) & 0xff) * (1 - amount);
  const b = (color & 0xff) * (1 - amount);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Convert numeric color to hex string '#RRGGBB' for FillGradient colorStops */
export function colorToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}
