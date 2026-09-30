// Parses Spotify data-export files into compact play rows. Runs in the browser, so big
// exports never have to be uploaded whole (serverless hosts cap request bodies at ~4.5MB).

export type HistoryRow = {
  t: number; // when the play ended, epoch ms
  ms: number; // how long it played
  n: string; // track name
  a: string; // artist
  al?: string; // album (extended export only)
  id?: string; // Spotify track id (extended export only)
};

// Same scrobble rule as last.fm: a play counts after 30 seconds.
export const MIN_MS = 30_000;

type Extended = {
  ts?: string;
  ms_played?: number;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  spotify_track_uri?: string | null;
};
type Basic = { endTime?: string; artistName?: string; trackName?: string; msPlayed?: number };

/** Accepts the entries of either export format; ignores podcasts, videos and skips. */
export function parseHistory(entries: unknown[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Extended & Basic;
    if (e.ts !== undefined) {
      // "Extended streaming history" (Streaming_History_Audio_*.json)
      const uri = e.spotify_track_uri;
      if (!uri?.startsWith("spotify:track:") || !e.master_metadata_track_name) continue;
      if (!e.master_metadata_album_artist_name || (e.ms_played ?? 0) < MIN_MS) continue;
      const t = Date.parse(e.ts);
      if (Number.isNaN(t)) continue;
      rows.push({
        t,
        ms: e.ms_played!,
        n: e.master_metadata_track_name,
        a: e.master_metadata_album_artist_name,
        al: e.master_metadata_album_album_name ?? undefined,
        id: uri.slice("spotify:track:".length),
      });
    } else if (e.endTime !== undefined) {
      // "Account data" (StreamingHistory_music_*.json): names only, times in UTC.
      if (!e.trackName || !e.artistName || (e.msPlayed ?? 0) < MIN_MS) continue;
      if (e.artistName === "Unknown Artist") continue;
      const t = Date.parse(e.endTime.replace(" ", "T") + ":00Z");
      if (Number.isNaN(t)) continue;
      rows.push({ t, ms: e.msPlayed!, n: e.trackName, a: e.artistName });
    }
  }
  return rows;
}

/** Which files inside a Spotify export zip hold music history. */
export function isHistoryFile(name: string) {
  const base = name.split("/").pop() ?? name;
  if (/video|podcast/i.test(base)) return false;
  return /^Streaming_?History.*\.json$/i.test(base);
}
