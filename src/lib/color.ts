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

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/**
 * Makes a palette usable as a sky: colourless tones (black-and-white covers, grungy
 * browns) borrow a hue from the listener's dominant genre instead of turning the page grey.
 */
export function vivify(palette: string[], fallbackHue: number) {
  return palette.map((hex, i) => {
    let [h, s, l] = rgbToHsl(hexToRgb(hex));
    if (s < 0.15 || (l < 0.12 && s < 0.4)) {
      h = fallbackHue + i * 28;
      s = 0.5;
    } else if (s < 0.45) {
      s = 0.45 + s * 0.4;
    }
    // Keep the first three bright enough to glow; the fourth is the deep background tone.
    l = i < 3 ? Math.min(0.68, Math.max(0.38, l)) : Math.min(0.3, Math.max(0.08, l));
    return rgbToHex(hslToRgb(h, s, l));
  });
}
