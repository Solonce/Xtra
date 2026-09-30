// Small colour helpers shared by server and client code.

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

export function saturation([r, g, b]: RGB) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Relative luminance, 0 (black) – 1 (white). */
export function luminance([r, g, b]: RGB) {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function distance(a: RGB, b: RGB) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Scales a colour's lightness so it reads well as an accent on a dark background. */
export function accentOnDark(hex: string) {
  let rgb = hexToRgb(hex);
  while (luminance(rgb) < 0.18) rgb = mix(rgb, [255, 255, 255], 0.15);
  return rgbToHex(rgb);
}

/** A stable pseudo-random pair of colours for things that have no artwork yet. */
export function fallbackColors(seed: string): string[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return [`hsl(${hue} 70% 55%)`, `hsl(${(hue + 50) % 360} 75% 35%)`];
}
