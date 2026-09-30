import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { enrichCatalog, ingestSpotifyTracks } from "./catalog";
import { accessTokenFor, type RecentlyPlayed, spotifyGet } from "./spotify";

/**
 * Pulls new plays from Spotify's recently-played endpoint (it only remembers the last
 * 50 tracks, so this needs to run at least every couple of hours to catch everything).
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

  await db
    .update(schema.users)
    .set({ syncCursor: cursor || null, lastSyncedAt: Date.now() })
    .where(eq(schema.users.id, user.id));

  await enrichCatalog(token, user.id);
  return { added };
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
