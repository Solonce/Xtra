import { hexToRgb, mix, rgbToHex } from "./color";
import { zoned } from "./format";

/**
 * Parameters for the generative background ("aura"). Each one comes from how someone
 * has listened over the last two weeks, so no two skies look the same, and each one
 * drifts as their taste does.
 */
export type AuraParams = {
  colors: [string, string, string, string];
  background: string;
  seed: number; // layout of the whole sky: which top artists you've been playing
  speed: number; // 0–1: genre energy + how much you listen
  warp: number; // 0–1: turbulence of the clouds (variety + heavier genres)
  nebula: number; // 0–1: colour clouds (artist variety)
  aurora: number; // 0–1: ribbons of light (late nights + long tracks)
  stars: number; // 0–1: star density (share of plays after dark)
  glow: number; // 0–1: a bright core (loyalty to one artist)
  ripple: number; // 0–1: sound-wave rings from the core (songs on repeat)
  grain: number; // 0–1: film grain (rock / punk / metal)
  light: number; // 0 dark sky, 1 daylight sky
};

export type AuraReading = { layer: string; value: string; because: string };

type PlayLike = { playedAt: number; trackId: string; artistId: string; msPlayed: number };
type ArtistLike = { id: string; name: string; plays: number; genres: string[] | null };

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;

// Rough energy of a genre, by keyword. Unknown genres count as neutral.
const ENERGY: [RegExp, number][] = [
  [/ambient|classical|piano|sleep|new age|lo-?fi|meditat|drone|acoustic|folk|singer-songwriter|chill|jazz|bossa|shoegaze|dream pop|slowcore/, 0.15],
  [/edm|house|techno|trance|drum and bass|dnb|dubstep|hardstyle|hyperpop|phonk|drill|trap|metal|punk|hardcore|grime|rage|jersey club|breakcore/, 1],
  [/hip hop|rap|reggaeton|dance|funk|disco|k-pop|electro|garage|afrobeats|amapiano|rock/, 0.7],
  [/pop|r&b|soul|indie|latin|country|alt/, 0.5],
];
const GRIT = /rock|metal|punk|grunge|noise|hardcore|garage|emo|post-hardcore/;

function genreEnergy(genre: string) {
  for (const [re, e] of ENERGY) if (re.test(genre)) return e;
  return 0.5;
}

function hash(value: string) {
  let h = 2166136261;
  for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function computeAura({
  plays,
  artists,
  palette,
  mood,
  timezone,
  fallbackSeed,
}: {
  plays: PlayLike[];
  artists: ArtistLike[];
  palette: string[];
  mood: "light" | "dark";
  timezone: string;
  fallbackSeed: string;
}): { params: AuraParams; readings: AuraReading[] } {
  const colors = [palette[0], palette[1] ?? palette[0], palette[2] ?? palette[0], palette[3] ?? palette[0]] as AuraParams["colors"];
  const background =
    mood === "light"
      ? rgbToHex(mix(hexToRgb(colors[0]), [255, 255, 255], 0.7))
      : rgbToHex(mix(hexToRgb(colors[3]), [5, 5, 9], 0.88));

  const n = plays.length;
  const days = 14;
  const readings: AuraReading[] = [];

  if (n < 5) {
    return {
      params: {
        colors, background, seed: hash(fallbackSeed) % 1000, speed: 0.35, warp: 0.5, nebula: 0.6,
        aurora: 0.35, stars: 0.4, glow: 0.2, ripple: 0.1, grain: 0.3, light: mood === "light" ? 1 : 0,
      },
      readings: [{ layer: "Sky", value: "forming", because: "Listen for a few days and it’ll take shape" }],
    };
  }

  const local = zoned(timezone);
  const night = plays.filter((p) => {
    const h = local(p.playedAt).hour;
    return h >= 21 || h < 5;
  }).length / n;

  const artistCounts = new Map<string, number>();
  const trackCounts = new Map<string, number>();
  for (const p of plays) {
    artistCounts.set(p.artistId, (artistCounts.get(p.artistId) ?? 0) + 1);
    trackCounts.set(p.trackId, (trackCounts.get(p.trackId) ?? 0) + 1);
  }
  const uniqueArtists = artistCounts.size;
  const variety = clamp((uniqueArtists / n) * 1.6);
  const loyalty = Math.max(...artistCounts.values()) / n;
  const maxRepeat = Math.max(...trackCounts.values());
  const perDay = n / days;
  const intensity = clamp(perDay / 50);
  const avgMin = plays.reduce((s, p) => s + p.msPlayed, 0) / n / 60_000;

  let energySum = 0, energyWeight = 0, gritWeight = 0;
  const genreTally = new Map<string, number>();
  for (const a of artists) {
    for (const g of a.genres ?? []) {
      energySum += genreEnergy(g) * a.plays;
      energyWeight += a.plays;
      if (GRIT.test(g)) gritWeight += a.plays;
      genreTally.set(g, (genreTally.get(g) ?? 0) + a.plays);
    }
  }
  const energy = energyWeight ? energySum / energyWeight : 0.5;
  const grit = energyWeight ? gritWeight / energyWeight : 0;
  const topGenre = [...genreTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const top = [...artists].sort((a, b) => b.plays - a.plays);
  const seed = hash(top.slice(0, 3).map((a) => a.id).join("|") || fallbackSeed) % 1000;

  const params: AuraParams = {
    colors,
    background,
    seed,
    speed: clamp(0.15 + 0.55 * energy + 0.3 * intensity),
    warp: clamp(0.25 + 0.45 * variety + 0.3 * grit),
    nebula: clamp(0.3 + 0.7 * variety),
    aurora: clamp(0.15 + 0.5 * night + 0.35 * clamp((avgMin - 2.5) / 3)),
    stars: clamp(0.08 + 0.92 * Math.pow(night, 0.8)),
    glow: clamp((loyalty - 0.08) * 2.2),
    ripple: clamp((maxRepeat - 3) / 20),
    grain: clamp(0.2 + grit),
    light: mood === "light" ? 1 : 0,
  };

  readings.push({ layer: "Colour", value: "your covers", because: "sampled from the albums you played most" });
  readings.push({ layer: "Stars", value: pct(night), because: "of your plays were after dark" });
  readings.push({ layer: "Nebula", value: `${uniqueArtists} artists`, because: `across ${nf(n)} plays in two weeks` });
  if (params.glow > 0.15 && top[0]) {
    readings.push({ layer: "Core", value: pct(loyalty), because: `of your listening was ${top[0].name}` });
  }
  if (params.ripple > 0.1) {
    readings.push({ layer: "Ripples", value: `${maxRepeat}×`, because: "one song on repeat" });
  }
  readings.push({
    layer: "Drift",
    value: energy > 0.65 ? "fast" : energy < 0.35 ? "slow" : "steady",
    because: topGenre ? `set by ${topGenre} and ${Math.round(perDay)} plays a day` : `${Math.round(perDay)} plays a day`,
  });
  if (params.aurora > 0.45) {
    readings.push({ layer: "Aurora", value: `${avgMin.toFixed(1)} min`, because: "average track, played late" });
  }

  return { params, readings };
}

const nf = (x: number) => x.toLocaleString("en");

/** A fixed, pleasant sky for pages that aren't about a particular listener. */
export const DEFAULT_AURA: AuraParams = {
  colors: ["#7c5cff", "#ff5ca8", "#2de2e6", "#101018"],
  background: "#07070c",
  seed: 417,
  speed: 0.4,
  warp: 0.55,
  nebula: 0.7,
  aurora: 0.55,
  stars: 0.6,
  glow: 0.25,
  ripple: 0.1,
  grain: 0.3,
  light: 0,
};
