import "server-only";

// MusicBrainz asks for a descriptive User-Agent and at most ~1 request per second.
const UA = `xtra/0.1 ( ${process.env.APP_URL ?? "https://github.com/solonce/xtra"} )`;

// Community tags that say nothing about how music sounds.
const JUNK = /^(seen live|favou?rites?|my favou?rites?|awesome|love|british|american|english|usa|uk|canadian|australian|german|french|swedish|japanese|korean|\d{4}s?|\d0s|male vocalists?|female vocalists?|all|music|band|singer|vocalist|under \d+ listeners)$/i;

type SearchResult = {
  artists?: { name: string; score: number; tags?: { name: string; count: number }[] }[];
};

let lastCall = 0;

/** Genre-ish tags for an artist from MusicBrainz, most-voted first. */
export async function musicBrainzGenres(artist: string): Promise<string[] | null> {
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const query = encodeURIComponent(`artist:"${artist.replace(/"/g, "")}"`);
  try {
    const res = await fetch(`https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json&limit=3`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as SearchResult;
    const match = body.artists?.find(
      (a) => a.score >= 90 && a.name.toLowerCase() === artist.toLowerCase(),
    ) ?? body.artists?.find((a) => a.score >= 98);
    if (!match?.tags?.length) return [];
    return match.tags
      .filter((t) => t.count > 0 && !JUNK.test(t.name.trim()))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t) => t.name.toLowerCase());
  } catch {
    return null;
  }
}
