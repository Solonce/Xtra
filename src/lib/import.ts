import "server-only";
import { db, schema } from "@/db";
import { albumKey, artistKey, type ImportedTrack, ingestImportedTracks } from "./catalog";
import { type HistoryRow, MIN_MS } from "./history-format";

const norm = (s: string) => s.trim().toLowerCase();

/** Stores rows parsed by the browser (see history-format.ts). Safe to re-run: duplicates are skipped. */
export async function importRows(userId: string, rows: HistoryRow[]) {
  const tracks: ImportedTrack[] = [];
  const plays: (typeof schema.scrobbles.$inferInsert)[] = [];

  for (const r of rows) {
    if (typeof r?.t !== "number" || typeof r.n !== "string" || typeof r.a !== "string") continue;
    if (!(r.ms >= MIN_MS) || !r.n.trim() || !r.a.trim()) continue;
    // Name-only plays get a placeholder id until enrichment finds the real track.
    const trackId = r.id && /^[A-Za-z0-9]{22}$/.test(r.id) ? r.id : `x:${norm(r.a)}|${norm(r.n)}`.slice(0, 300);
    const album = r.al?.trim() || "Unknown album";
    tracks.push({ trackId, name: r.n, artist: r.a, album });
    plays.push({
      userId,
      trackId,
      artistId: artistKey(r.a),
      albumId: albumKey(r.a, album),
      playedAt: Math.floor(r.t / 1000) * 1000,
      msPlayed: Math.round(r.ms),
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
  return { received: rows.length, added };
}
