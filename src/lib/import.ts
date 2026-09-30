import "server-only";
import { db, schema } from "@/db";
import { albumKey, artistKey, type ImportedTrack, ingestImportedTracks } from "./catalog";

// One entry of Spotify's "Extended streaming history" export (Streaming_History_Audio_*.json).
type ExtendedEntry = {
  ts: string;
  ms_played: number;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
};

// Same scrobble rule as last.fm: a play counts after 30 seconds.
const MIN_MS = 30_000;

export async function importHistory(userId: string, entries: unknown[]) {
  const tracks: ImportedTrack[] = [];
  const plays: (typeof schema.scrobbles.$inferInsert)[] = [];

  for (const raw of entries) {
    const e = raw as ExtendedEntry;
    const uri = e?.spotify_track_uri;
    if (!uri?.startsWith("spotify:track:") || !e.master_metadata_track_name) continue;
    if (!e.master_metadata_album_artist_name || (e.ms_played ?? 0) < MIN_MS) continue;

    const trackId = uri.slice("spotify:track:".length);
    const artist = e.master_metadata_album_artist_name;
    const album = e.master_metadata_album_album_name ?? "Unknown album";
    tracks.push({ trackId, name: e.master_metadata_track_name, artist, album });
    plays.push({
      userId,
      trackId,
      artistId: artistKey(artist),
      albumId: albumKey(artist, album),
      playedAt: Math.floor(Date.parse(e.ts) / 1000) * 1000,
      msPlayed: e.ms_played,
      source: "import",
    });
  }

  await ingestImportedTracks(tracks);

  let added = 0;
  const CHUNK = 500;
  for (let i = 0; i < plays.length; i += CHUNK) {
    const inserted = await db
      .insert(schema.scrobbles)
      .values(plays.slice(i, i + CHUNK))
      .onConflictDoNothing()
      .returning({ id: schema.scrobbles.id });
    added += inserted.length;
  }
  return { considered: entries.length, eligible: plays.length, added };
}
