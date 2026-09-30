import "server-only";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { albumKey, artistKey } from "./keys";
import { extractPalette } from "./palette";
import {
  pickImage,
  type SpotifyArtist,
  spotifyGet,
  SpotifyError,
  type SpotifyTrack,
} from "./spotify";

export { albumKey, artistKey };

export type CatalogRef = { trackId: string; artistId: string; albumId: string };

/** Upserts full track objects from the Spotify API. */
export async function ingestSpotifyTracks(tracks: SpotifyTrack[]): Promise<Map<string, CatalogRef>> {
  const refs = new Map<string, CatalogRef>();
  const unique = [...new Map(tracks.map((t) => [t.id, t])).values()];
  if (!unique.length) return refs;

  await db.transaction(async (tx) => {
    for (const t of unique) {
      const primary = t.artists[0];
      const artistId = artistKey(primary.name);
      const albumId = albumKey(primary.name, t.album.name);
      refs.set(t.id, { trackId: t.id, artistId, albumId });

      await tx
        .insert(schema.artists)
        .values({ id: artistId, name: primary.name, spotifyId: primary.id })
        .onConflictDoUpdate({
          target: schema.artists.id,
          set: { spotifyId: sql`coalesce(${schema.artists.spotifyId}, excluded.spotify_id)` },
        });
      await tx
        .insert(schema.albums)
        .values({ id: albumId, name: t.album.name, artistId, imageUrl: pickImage(t.album.images) })
        .onConflictDoUpdate({
          target: schema.albums.id,
          set: { imageUrl: sql`coalesce(${schema.albums.imageUrl}, excluded.image_url)` },
        });
      await tx
        .insert(schema.tracks)
        .values({
          id: t.id,
          name: t.name,
          artistId,
          albumId,
          artistNames: t.artists.map((a) => a.name).join(", "),
          durationMs: t.duration_ms,
          enriched: true,
        })
        .onConflictDoUpdate({
          target: schema.tracks.id,
          set: {
            artistNames: sql`excluded.artist_names`,
            durationMs: sql`excluded.duration_ms`,
            enriched: true,
          },
        });
    }
  });
  return refs;
}

export type ImportedTrack = { trackId: string; name: string; artist: string; album: string };

/** Inserts catalog rows known only by name (from a Spotify data export). */
export async function ingestImportedTracks(items: ImportedTrack[]) {
  const unique = [...new Map(items.map((t) => [t.trackId, t])).values()];
  const CHUNK = 200;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const artistRows = [...new Map(chunk.map((t) => [artistKey(t.artist), t.artist])).entries()];
    const albumRows = [
      ...new Map(chunk.map((t) => [albumKey(t.artist, t.album), t])).entries(),
    ];
    await db
      .insert(schema.artists)
      .values(artistRows.map(([id, name]) => ({ id, name })))
      .onConflictDoNothing();
    await db
      .insert(schema.albums)
      .values(albumRows.map(([id, t]) => ({ id, name: t.album, artistId: artistKey(t.artist) })))
      .onConflictDoNothing();
    await db
      .insert(schema.tracks)
      .values(
        chunk.map((t) => ({
          id: t.trackId,
          name: t.name,
          artistId: artistKey(t.artist),
          albumId: albumKey(t.artist, t.album),
          artistNames: t.artist,
        })),
      )
      .onConflictDoNothing();
  }
}

/**
 * Fills in artwork and metadata for things we only know by name, most-played first.
 * Uses single-item endpoints (the batch ones are restricted for new Spotify apps) and
 * caps the work per call so a sync request stays fast.
 */
export async function enrichCatalog(token: string, userId: string, limit = 25) {
  const pendingTracks = await db
    .select({ id: schema.tracks.id })
    .from(schema.tracks)
    .innerJoin(schema.scrobbles, eq(schema.scrobbles.trackId, schema.tracks.id))
    .where(and(eq(schema.tracks.enriched, false), eq(schema.scrobbles.userId, userId)))
    .groupBy(schema.tracks.id)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  const fetched: SpotifyTrack[] = [];
  for (const { id } of pendingTracks) {
    try {
      const t = await spotifyGet<SpotifyTrack>(token, `/tracks/${id}`);
      if (t) fetched.push(t);
    } catch (e) {
      if (e instanceof SpotifyError && e.status === 429) break;
    }
    // Mark as attempted so a bad id doesn't block the queue forever.
    await db.update(schema.tracks).set({ enriched: true }).where(eq(schema.tracks.id, id));
  }
  if (fetched.length) await ingestSpotifyTracks(fetched);

  const pendingArtists = await db
    .select({ id: schema.artists.id, spotifyId: schema.artists.spotifyId })
    .from(schema.artists)
    .where(and(isNull(schema.artists.imageUrl), isNotNull(schema.artists.spotifyId)))
    .limit(limit);
  for (const a of pendingArtists) {
    try {
      const full = await spotifyGet<SpotifyArtist>(token, `/artists/${a.spotifyId}`);
      await db
        .update(schema.artists)
        .set({ imageUrl: pickImage(full?.images) ?? "", genres: full?.genres ?? [] })
        .where(eq(schema.artists.id, a.id));
    } catch (e) {
      if (e instanceof SpotifyError && e.status === 429) break;
    }
  }

  await fillPalettes(limit * 2);
}

/** Computes cover-art palettes for albums that have artwork but no colours yet. */
export async function fillPalettes(limit = 50) {
  const pending = await db
    .select({ id: schema.albums.id, imageUrl: schema.albums.imageUrl })
    .from(schema.albums)
    .where(and(isNotNull(schema.albums.imageUrl), isNull(schema.albums.colors)))
    .limit(limit);
  await Promise.all(
    pending.map(async (a) => {
      const colors = (await extractPalette(a.imageUrl!)) ?? [];
      await db.update(schema.albums).set({ colors }).where(eq(schema.albums.id, a.id));
    }),
  );
}
