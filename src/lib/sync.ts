import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { enrichCatalog, ingestSpotifyArtists, ingestSpotifyTracks } from "./catalog";
import {
  accessTokenFor,
  type RecentlyPlayed,
  type SpotifyArtist,
  spotifyGet,
  type SpotifyTrack,
} from "./spotify";

const RANGES = ["short_term", "medium_term", "long_term"] as const;
const TOPS_EVERY = 6 * 3_600_000;

/**
 * Pulls new plays from Spotify's recently-played endpoint (it only remembers the last
 * 50 tracks, so this needs to run at least every couple of hours to catch everything),
 * and refreshes the top-artists/tracks rankings every few hours.
 */
export async function syncUser(user: User): Promise<{ added: number }> {
  const token = await accessTokenFor(user);
  if (!token) return { added: 0 };

  const after = user.syncCursor ? `&after=${user.syncCursor}` : "";
  const recent = await spotifyGet<RecentlyPlayed>(
    token,
    `/me/player/recently-played?limit=50${after}`,
  );
  const items = (recent?.items ?? []).filter((i) => i.track?.id);

  let added = 0;
  let cursor = user.syncCursor ?? 0;
  if (items.length) {
    const refs = await ingestSpotifyTracks(items.map((i) => i.track));
    const rows = items.map((i) => {
      const playedAt = Math.floor(Date.parse(i.played_at) / 1000) * 1000;
      cursor = Math.max(cursor, playedAt);
      return {
        userId: user.id,
        ...refs.get(i.track.id)!,
        playedAt,
        msPlayed: i.track.duration_ms,
        source: "api" as const,
      };
    });
    const inserted = await db
      .insert(schema.scrobbles)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: schema.scrobbles.id });
    added = inserted.length;
  }

  const update: Partial<User> = { syncCursor: cursor || null, lastSyncedAt: Date.now() };
  if (!user.topsSyncedAt || Date.now() - user.topsSyncedAt > TOPS_EVERY) {
    try {
      await syncTopItems(user.id, token);
      update.topsSyncedAt = Date.now();
    } catch (e) {
      console.error("top items sync failed", user.id, e);
    }
  }
  await db.update(schema.users).set(update).where(eq(schema.users.id, user.id));
  Object.assign(user, update);
  return { added };
}

async function syncTopItems(userId: string, token: string) {
  for (const range of RANGES) {
    const [artists, tracks] = await Promise.all([
      spotifyGet<{ items: SpotifyArtist[] }>(token, `/me/top/artists?limit=50&time_range=${range}`),
      spotifyGet<{ items: SpotifyTrack[] }>(token, `/me/top/tracks?limit=50&time_range=${range}`),
    ]);
    const artistIds = await ingestSpotifyArtists(artists?.items ?? []);
    const trackItems = (tracks?.items ?? []).filter((t) => t?.id);
    const refs = await ingestSpotifyTracks(trackItems);

    for (const [kind, ids] of [
      ["artist", artistIds],
      ["track", trackItems.map((t) => refs.get(t.id)!.trackId)],
    ] as const) {
      await db
        .delete(schema.topItems)
        .where(and(eq(schema.topItems.userId, userId), eq(schema.topItems.kind, kind), eq(schema.topItems.range, range)));
      if (ids.length) {
        await db
          .insert(schema.topItems)
          .values(ids.map((itemId, rank) => ({ userId, kind, range, rank, itemId })))
          .onConflictDoNothing();
      }
    }
  }
}

/** Background catalogue work: artwork, genres, name-only imports. */
export async function enrichUser(user: User, budgetMs = 20_000) {
  try {
    const token = await accessTokenFor(user);
    if (token) await enrichCatalog(token, user.id, budgetMs);
  } catch (e) {
    console.error("enrich failed", user.id, e);
  }
}

/** Syncs if the last sync is older than `maxAgeMs`. Errors are swallowed: stale data beats a broken page. */
export async function syncIfStale(user: User, maxAgeMs = 5 * 60_000) {
  if (user.lastSyncedAt && Date.now() - user.lastSyncedAt < maxAgeMs) return;
  try {
    await syncUser(user);
  } catch (e) {
    console.error("sync failed", user.id, e);
  }
}
