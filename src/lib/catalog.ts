import "server-only";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { albumKey, artistKey } from "./keys";
import { musicBrainzGenres } from "./musicbrainz";
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

/** Upserts full artist objects (e.g. from the top-artists endpoint), photos and genres included. */
export async function ingestSpotifyArtists(list: SpotifyArtist[]) {
  const ids: string[] = [];
  for (const a of list) {
    const id = artistKey(a.name);
    ids.push(id);
    const genres = a.genres?.length ? a.genres : null;
    await db
      .insert(schema.artists)
      .values({
        id,
        name: a.name,
        spotifyId: a.id,
        imageUrl: pickImage(a.images),
        genres,
        genresCheckedAt: genres ? Date.now() : null,
      })
      .onConflictDoUpdate({
        target: schema.artists.id,
        set: {
          spotifyId: sql`coalesce(${schema.artists.spotifyId}, excluded.spotify_id)`,
          imageUrl: sql`coalesce(nullif(${schema.artists.imageUrl}, ''), excluded.image_url)`,
          ...(genres ? { genres, genresCheckedAt: Date.now() } : {}),
        },
      });
  }
  return ids;
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
 * Fills in artwork, genres and real Spotify ids for things we only know by name,
 * most-played first. Uses single-item endpoints (the batch ones are gone for
 * development-mode apps) and stops after `budgetMs` so it can run in the background
 * after a response, or from the cron job, a slice at a time.
 */
export async function enrichCatalog(token: string, userId: string, budgetMs = 20_000) {
  const deadline = Date.now() + budgetMs;
  const rateLimited = (e: unknown) => e instanceof SpotifyError && e.status === 429;

  // 1. Tracks imported without full metadata, most-played first.
  const pendingTracks = await db
    .select({ id: schema.tracks.id, name: schema.tracks.name, artist: schema.tracks.artistNames })
    .from(schema.tracks)
    .innerJoin(schema.scrobbles, eq(schema.scrobbles.trackId, schema.tracks.id))
    .where(and(eq(schema.tracks.enriched, false), eq(schema.scrobbles.userId, userId)))
    .groupBy(schema.tracks.id)
    .orderBy(sql`count(*) desc`)
    .limit(200);

  for (const t of pendingTracks) {
    if (Date.now() > deadline) break;
    try {
      if (t.id.startsWith("x:")) await resolveByName(token, t);
      else {
        const full = await spotifyGet<SpotifyTrack>(token, `/tracks/${t.id}`);
        if (full) await ingestSpotifyTracks([full]);
      }
    } catch (e) {
      if (rateLimited(e)) break;
    }
    // Mark as attempted so a bad id doesn't block the queue forever.
    await db.update(schema.tracks).set({ enriched: true }).where(eq(schema.tracks.id, t.id));
  }

  // 2. Artist photos and genres: Spotify first, MusicBrainz tags when Spotify has none.
  const pendingArtists = await db
    .select({ id: schema.artists.id, name: schema.artists.name, spotifyId: schema.artists.spotifyId, imageUrl: schema.artists.imageUrl })
    .from(schema.artists)
    .innerJoin(schema.scrobbles, eq(schema.scrobbles.artistId, schema.artists.id))
    .where(and(isNull(schema.artists.genresCheckedAt), eq(schema.scrobbles.userId, userId)))
    .groupBy(schema.artists.id)
    .orderBy(sql`count(*) desc`)
    .limit(100);
  const topOnly = await db
    .select({ id: schema.artists.id, name: schema.artists.name, spotifyId: schema.artists.spotifyId, imageUrl: schema.artists.imageUrl })
    .from(schema.artists)
    .innerJoin(schema.topItems, eq(schema.topItems.itemId, schema.artists.id))
    .where(and(isNull(schema.artists.genresCheckedAt), eq(schema.topItems.userId, userId)))
    .limit(100);

  for (const a of [...pendingArtists, ...topOnly]) {
    if (Date.now() > deadline) break;
    let genres: string[] = [];
    let imageUrl = a.imageUrl;
    if (a.spotifyId) {
      try {
        const full = await spotifyGet<SpotifyArtist>(token, `/artists/${a.spotifyId}`);
        genres = full?.genres ?? [];
        imageUrl = imageUrl || pickImage(full?.images) || "";
      } catch (e) {
        if (rateLimited(e)) break;
      }
    }
    if (!genres.length) genres = (await musicBrainzGenres(a.name)) ?? [];
    await db
      .update(schema.artists)
      .set({ genres, imageUrl, genresCheckedAt: Date.now() })
      .where(eq(schema.artists.id, a.id));
  }

  await fillPalettes(60);
}

/**
 * Tracks from the basic "Account data" export only have names. Find the real track by
 * search and move the plays over to it.
 */
async function resolveByName(token: string, t: { id: string; name: string; artist: string }) {
  const q = encodeURIComponent(`track:${t.name} artist:${t.artist}`);
  const found = await spotifyGet<{ tracks: { items: SpotifyTrack[] } }>(
    token,
    `/search?type=track&limit=1&q=${q}`,
  );
  const hit = found?.tracks.items[0];
  if (!hit) return;
  const ref = (await ingestSpotifyTracks([hit])).get(hit.id)!;
  // Plays that would collide with an existing (track, time) row are duplicates; drop them.
  await db.run(sql`
    update or ignore ${schema.scrobbles}
    set track_id = ${ref.trackId}, artist_id = ${ref.artistId}, album_id = ${ref.albumId}
    where track_id = ${t.id}
  `);
  await db.delete(schema.scrobbles).where(eq(schema.scrobbles.trackId, t.id));
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
