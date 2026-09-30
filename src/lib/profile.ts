import "server-only";
import { computeAura } from "./aura";
import { distance, hexToRgb, luminance, saturation, vivify } from "./color";
import { zoned } from "./format";
import {
  heatmapGrid,
  type Play,
  playsSince,
  rhythm,
  spotifyTopArtists,
  spotifyTopTracks,
  topAlbums,
  topArtists,
  topTracks,
  totals,
} from "./stats";
import type { User } from "@/db/schema";
import { pickEffects, scoreVibes, VIBES } from "./vibes";

const DAY = 86_400_000;
const DEFAULT_PALETTE = ["#7c5cff", "#ff5ca8", "#2de2e6", "#101018"];

export type Trait = { id: string; title: string; detail: string };

/**
 * Everything on a public profile is derived from listening data — there are no manual
 * settings. The palette, headline, badges, sky and page effects all shift as your
 * listening does. Scrobbles are the main source; Spotify's top-artists/tracks rankings
 * fill the gaps for new profiles (Spotify only hands over the last 50 plays).
 */
export async function buildProfile(user: User) {
  const now = Date.now();
  const week = now - 7 * DAY;
  const month = now - 30 * DAY;
  const fortnight = now - 14 * DAY;

  const [
    weekAlbums, monthAlbums, recentArtists, weekTracks, monthArtists, ninetyAlbums, allTime, recent,
    shortArtists, mediumArtists, longArtists, shortTracks, mediumTracks, longTracks,
  ] = await Promise.all([
    topAlbums(user.id, week, 12),
    topAlbums(user.id, month, 12),
    topArtists(user.id, fortnight, 40),
    topTracks(user.id, week, 5),
    topArtists(user.id, month, 8),
    topAlbums(user.id, now - 90 * DAY, 9),
    totals(user.id, 0),
    playsSince(user.id, now - 182 * DAY),
    spotifyTopArtists(user.id, "short_term"),
    spotifyTopArtists(user.id, "medium_term"),
    spotifyTopArtists(user.id, "long_term", 20),
    spotifyTopTracks(user.id, "short_term"),
    spotifyTopTracks(user.id, "medium_term", 20),
    spotifyTopTracks(user.id, "long_term", 10),
  ]);

  const recentPlays = recent.filter((p) => p.playedAt >= fortnight);

  // Taste = recent plays, topped up by Spotify's rankings (higher rank → more weight).
  const taste = new Map<string, { id: string; name: string; genres: string[] | null; weight: number; imageUrl: string | null }>();
  const addTaste = (a: { id: string; name: string; genres: string[] | null; imageUrl: string | null }, weight: number) => {
    const t = taste.get(a.id) ?? { ...a, weight: 0 };
    t.weight += weight;
    taste.set(a.id, t);
  };
  recentArtists.forEach((a) => addTaste(a, a.plays));
  shortArtists.forEach((a) => addTaste(a, 3 * (1 - a.rank / 50)));
  mediumArtists.forEach((a) => addTaste(a, 1.5 * (1 - a.rank / 50)));
  longArtists.forEach((a) => addTaste(a, 1 * (1 - a.rank / 50)));
  const tasteArtists = [...taste.values()].sort((a, b) => b.weight - a.weight);

  const vibes = scoreVibes(tasteArtists);
  const hue = vibes[0] ? VIBES[vibes[0].id].hue : 265;

  // Palette: this week's covers (or this month's), plus Spotify's short-term favourites.
  const paletteAlbums = [
    ...(weekAlbums.length >= 3 ? weekAlbums : monthAlbums),
    ...shortTracks.slice(0, 20).map((t) => ({ colors: t.colors, plays: 3 * (1 - t.rank / 50) })),
  ];
  const palette = vivify(blendPalette(paletteAlbums), hue);
  const mood: "light" | "dark" = luminance(hexToRgb(palette[0])) > 0.45 ? "light" : "dark";

  const { byDay, byHour, streak } = rhythm(recent, user.timezone, now);
  const monthPlays = recent.filter((p) => p.playedAt >= month);

  const aura = computeAura({
    plays: recentPlays,
    artists: tasteArtists.map((a) => ({ ...a, plays: a.weight })),
    palette,
    mood,
    timezone: user.timezone,
    fallbackSeed: user.id,
  });

  // With only a handful of scrobbles, lean on Spotify's 4-week ranking for the headline.
  const era =
    recentPlays.length >= 15 || !shortArtists[0]
      ? recentArtists[0] ?? null
      : { ...shortArtists[0], plays: 0 };

  // The wall: 90 days of albums, filled out with albums from Spotify's rankings.
  const wall: { id: string; name: string; artist: string; imageUrl: string | null; colors: string[] | null }[] = [...ninetyAlbums];
  for (const t of [...shortTracks, ...mediumTracks, ...longTracks]) {
    if (wall.length >= 9) break;
    if (!wall.some((w) => w.id === t.albumId)) {
      wall.push({ id: t.albumId, name: t.albumName, artist: t.artist, imageUrl: t.imageUrl, colors: t.colors });
    }
  }

  const obsession = weekTracks[0]?.plays >= 3 ? weekTracks[0] : null;
  const effects = pickEffects(vibes, {
    ...habits(recentPlays, user.timezone),
    maxRepeat: obsession?.plays ?? 0,
    artistCount: tasteArtists.length,
  });

  const genres = tally(tasteArtists.flatMap((a) => (a.genres ?? []).map((g) => [g, a.weight] as const)));

  return {
    palette,
    mood,
    era,
    aura,
    vibes: vibes.slice(0, 6),
    effects,
    constellation: tasteArtists.slice(0, 16).map((a) => a.name),
    obsession,
    onRotation: weekTracks,
    topArtists: monthArtists,
    longGame: { artists: longArtists.slice(0, 10), tracks: longTracks.slice(0, 5) },
    wall: wall.slice(0, 9),
    genres: genres.slice(0, 8),
    traits: deriveTraits(monthPlays, recent.filter((p) => p.playedAt >= week), monthArtists, user.timezone),
    heatmap: heatmapGrid(byDay, user.timezone, 26, now),
    byHour,
    streak,
    allTime,
    monthPlays: monthPlays.length,
  };
}

function habits(plays: Play[], timezone: string) {
  if (!plays.length) return { night: 0, morning: 0, variety: 0 };
  const local = zoned(timezone);
  const hours = plays.map((p) => local(p.playedAt).hour);
  return {
    night: hours.filter((h) => h >= 21 || h < 5).length / plays.length,
    morning: hours.filter((h) => h >= 5 && h < 9).length / plays.length,
    variety: new Set(plays.map((p) => p.artistId)).size / plays.length,
  };
}

function tally(entries: (readonly [string, number])[]) {
  const map = new Map<string, number>();
  for (const [k, v] of entries) map.set(k, (map.get(k) ?? 0) + v);
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

/** Merges cover palettes of the most-played albums into one distinct 4-colour palette. */
function blendPalette(albums: { colors: string[] | null; plays: number }[]) {
  const weighted = new Map<string, number>();
  for (const a of albums) {
    (a.colors ?? []).forEach((c, i) => {
      // Favour vivid tones so a single bright detail can beat a big grey background.
      weighted.set(c, (weighted.get(c) ?? 0) + (a.plays / (i + 1)) * (0.25 + 1.5 * saturation(hexToRgb(c))));
    });
  }
  const picked: string[] = [];
  for (const [c] of [...weighted.entries()].sort((a, b) => b[1] - a[1])) {
    if (picked.every((p) => distance(hexToRgb(p), hexToRgb(c)) > 70)) picked.push(c);
    if (picked.length === 4) break;
  }
  for (const c of DEFAULT_PALETTE) if (picked.length < 4 && !picked.includes(c)) picked.push(c);
  return picked;
}

function deriveTraits(
  month: Play[],
  week: Play[],
  artists: { name: string; plays: number }[],
  timezone: string,
): Trait[] {
  const traits: Trait[] = [];
  const n = month.length;
  if (n < 10) return traits;
  const local = zoned(timezone);
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  const hours = month.map((p) => local(p.playedAt));
  const night = hours.filter((h) => h.hour >= 22 || h.hour < 4).length / n;
  const morning = hours.filter((h) => h.hour >= 5 && h.hour < 9).length / n;
  const weekend = hours.filter((h) => h.weekday === "Sat" || h.weekday === "Sun").length / n;

  if (night >= 0.3) traits.push({ id: "night-owl", title: "Night Owl", detail: `${pct(night)} of plays after 10pm` });
  if (morning >= 0.2) traits.push({ id: "early-bird", title: "Early Bird", detail: `${pct(morning)} of plays before 9am` });

  const topShare = artists[0] ? artists[0].plays / n : 0;
  if (topShare >= 0.25) {
    traits.push({ id: "loyalist", title: "Loyalist", detail: `${pct(topShare)} ${artists[0].name}` });
  }

  const uniqueArtists = new Set(month.map((p) => p.artistId)).size;
  if (uniqueArtists / n >= 0.45 && n >= 30) {
    traits.push({ id: "explorer", title: "Explorer", detail: `${uniqueArtists} artists this month` });
  }

  const trackCounts = new Map<string, number>();
  for (const p of week) trackCounts.set(p.trackId, (trackCounts.get(p.trackId) ?? 0) + 1);
  const maxRepeat = Math.max(0, ...trackCounts.values());
  if (maxRepeat >= 10) traits.push({ id: "on-repeat", title: "On Repeat", detail: `one song, ${maxRepeat}× this week` });

  let sameAlbum = 0;
  for (let i = 1; i < n; i++) if (month[i].albumId === month[i - 1].albumId) sameAlbum++;
  if (sameAlbum / n >= 0.5) traits.push({ id: "album-head", title: "Album Head", detail: "listens front to back" });

  let longest = 0;
  let start = month[0].playedAt;
  for (let i = 1; i < n; i++) {
    if (month[i].playedAt - month[i - 1].playedAt > 15 * 60_000) start = month[i].playedAt;
    longest = Math.max(longest, month[i].playedAt - start);
  }
  if (longest >= 3 * 3_600_000) {
    traits.push({ id: "marathoner", title: "Marathoner", detail: `${Math.round(longest / 3_600_000)}h session` });
  }

  if (weekend >= 0.45) traits.push({ id: "weekender", title: "Weekender", detail: `${pct(weekend)} on weekends` });

  return traits.slice(0, 5);
}

export type Profile = Awaited<ReturnType<typeof buildProfile>>;
