import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { zoned } from "./format";

const { scrobbles: s, tracks: t, albums: al, artists: ar } = schema;

const inRange = (userId: string, since: number) =>
  and(eq(s.userId, userId), gte(s.playedAt, since));

// Artist photos are often missing (imports, restricted API) — fall back to their most-played cover.
const artistCover = sql<string | null>`(
  select a2.image_url from ${al} a2
  where a2.artist_id = ${ar.id} and a2.image_url is not null
  order by (select count(*) from ${s} s2 where s2.album_id = a2.id) desc limit 1
)`;

export async function topArtists(userId: string, since: number, limit = 10) {
  return db
    .select({
      id: ar.id,
      name: ar.name,
      imageUrl: sql<string | null>`coalesce(nullif(${ar.imageUrl}, ''), ${artistCover})`,
      genres: ar.genres,
      plays: sql<number>`count(*)`,
      ms: sql<number>`sum(${s.msPlayed})`,
    })
    .from(s)
    .innerJoin(ar, eq(ar.id, s.artistId))
    .where(inRange(userId, since))
    .groupBy(ar.id)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function topAlbums(userId: string, since: number, limit = 10) {
  return db
    .select({
      id: al.id,
      name: al.name,
      artist: ar.name,
      imageUrl: al.imageUrl,
      colors: al.colors,
      plays: sql<number>`count(*)`,
    })
    .from(s)
    .innerJoin(al, eq(al.id, s.albumId))
    .innerJoin(ar, eq(ar.id, al.artistId))
    .where(inRange(userId, since))
    .groupBy(al.id)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function topTracks(userId: string, since: number, limit = 10) {
  return db
    .select({
      id: t.id,
      name: t.name,
      artist: t.artistNames,
      imageUrl: al.imageUrl,
      colors: al.colors,
      plays: sql<number>`count(*)`,
    })
    .from(s)
    .innerJoin(t, eq(t.id, s.trackId))
    .innerJoin(al, eq(al.id, s.albumId))
    .where(inRange(userId, since))
    .groupBy(t.id)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function recentPlays(userId: string, limit = 20) {
  return db
    .select({
      id: s.id,
      playedAt: s.playedAt,
      name: t.name,
      artist: t.artistNames,
      trackId: t.id,
      imageUrl: al.imageUrl,
      colors: al.colors,
    })
    .from(s)
    .innerJoin(t, eq(t.id, s.trackId))
    .innerJoin(al, eq(al.id, s.albumId))
    .where(eq(s.userId, userId))
    .orderBy(desc(s.playedAt))
    .limit(limit);
}

export async function totals(userId: string, since: number) {
  const [row] = await db
    .select({
      plays: sql<number>`count(*)`,
      ms: sql<number>`coalesce(sum(${s.msPlayed}), 0)`,
      artists: sql<number>`count(distinct ${s.artistId})`,
      tracks: sql<number>`count(distinct ${s.trackId})`,
      albums: sql<number>`count(distinct ${s.albumId})`,
      first: sql<number | null>`min(${s.playedAt})`,
    })
    .from(s)
    .where(inRange(userId, since));
  return row;
}

export type Play = {
  playedAt: number;
  trackId: string;
  artistId: string;
  albumId: string;
  msPlayed: number;
};

export async function playsSince(userId: string, since: number): Promise<Play[]> {
  return db
    .select({
      playedAt: s.playedAt,
      trackId: s.trackId,
      artistId: s.artistId,
      albumId: s.albumId,
      msPlayed: s.msPlayed,
    })
    .from(s)
    .where(inRange(userId, since))
    .orderBy(s.playedAt);
}

/** Plays per local calendar day, per hour of day, and the current daily streak. */
export function rhythm(plays: Play[], timezone: string, now = Date.now()) {
  const local = zoned(timezone);
  const byDay = new Map<string, number>();
  const byHour = Array<number>(24).fill(0);
  for (const p of plays) {
    const z = local(p.playedAt);
    byDay.set(z.day, (byDay.get(z.day) ?? 0) + 1);
    byHour[z.hour]++;
  }

  let streak = 0;
  for (let d = 0; ; d++) {
    const day = local(now - d * 86_400_000).day;
    if (byDay.has(day)) streak++;
    // Today not having plays yet shouldn't break a streak.
    else if (d > 0) break;
  }
  return { byDay, byHour, streak };
}

/** Grid of the last `weeks` weeks (columns) × 7 days (rows) for a contribution-style heatmap. */
export function heatmapGrid(byDay: Map<string, number>, timezone: string, weeks = 26, now = Date.now()) {
  const local = zoned(timezone);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayIdx = order.indexOf(local(now).weekday);
  const cells: { day: string; count: number; future: boolean }[] = [];
  const totalDays = weeks * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    // Offset so the final column ends on Sunday of the current week.
    const offset = i - (6 - todayIdx);
    const day = local(now - offset * 86_400_000).day;
    cells.push({ day, count: offset < 0 ? 0 : (byDay.get(day) ?? 0), future: offset < 0 });
  }
  return cells;
}

type Range = "short_term" | "medium_term" | "long_term";

/** Spotify's own top-artists ranking for a time range (~4 weeks / 6 months / 1 year). */
export async function spotifyTopArtists(userId: string, range: Range, limit = 50) {
  const ti = schema.topItems;
  return db
    .select({
      id: ar.id,
      name: ar.name,
      imageUrl: sql<string | null>`coalesce(nullif(${ar.imageUrl}, ''), ${artistCover})`,
      genres: ar.genres,
      rank: ti.rank,
    })
    .from(ti)
    .innerJoin(ar, eq(ar.id, ti.itemId))
    .where(and(eq(ti.userId, userId), eq(ti.kind, "artist"), eq(ti.range, range)))
    .orderBy(ti.rank)
    .limit(limit);
}

export async function spotifyTopTracks(userId: string, range: Range, limit = 50) {
  const ti = schema.topItems;
  return db
    .select({
      id: t.id,
      name: t.name,
      artist: t.artistNames,
      albumId: al.id,
      albumName: al.name,
      imageUrl: al.imageUrl,
      colors: al.colors,
      rank: ti.rank,
    })
    .from(ti)
    .innerJoin(t, eq(t.id, ti.itemId))
    .innerJoin(al, eq(al.id, t.albumId))
    .where(and(eq(ti.userId, userId), eq(ti.kind, "track"), eq(ti.range, range)))
    .orderBy(ti.rank)
    .limit(limit);
}
