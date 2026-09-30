import "server-only";
import sharp from "sharp";
import { distance, type RGB, rgbToHex, saturation } from "./color";

/**
 * Extracts up to `count` dominant, visually distinct colours from an image URL.
 * Colours are bucketed, then scored by coverage with a boost for saturated tones so
 * that a vivid detail can beat a large muddy background.
 */
export async function extractPalette(url: string, count = 5): Promise<string[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const { data } = await sharp(input)
      .resize(32, 32, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buckets = new Map<number, { sum: RGB; n: number }>();
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bucket = buckets.get(key) ?? { sum: [0, 0, 0] as RGB, n: 0 };
      bucket.sum[0] += r;
      bucket.sum[1] += g;
      bucket.sum[2] += b;
      bucket.n++;
      buckets.set(key, bucket);
    }

    const scored = [...buckets.values()]
      .map(({ sum, n }) => {
        const rgb: RGB = [sum[0] / n, sum[1] / n, sum[2] / n];
        return { rgb, score: n * (0.35 + saturation(rgb)) };
      })
      .sort((a, b) => b.score - a.score);

    const picked: RGB[] = [];
    for (const { rgb } of scored) {
      if (picked.every((p) => distance(p, rgb) > 64)) picked.push(rgb);
      if (picked.length === count) break;
    }
    return picked.map(rgbToHex);
  } catch {
    return null;
  }
}
