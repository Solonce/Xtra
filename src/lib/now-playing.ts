import "server-only";
import type { User } from "@/db/schema";
import { accessTokenFor, type CurrentlyPlaying, pickImage, spotifyGet } from "./spotify";

export type NowPlaying = {
  name: string;
  artist: string;
  album: string;
  imageUrl: string | null;
  url: string;
  progressMs: number;
  durationMs: number;
} | null;

const cache = new Map<string, { at: number; value: NowPlaying }>();

export async function getNowPlaying(user: User): Promise<NowPlaying> {
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < 20_000) return hit.value;

  let value: NowPlaying = null;
  try {
    const token = await accessTokenFor(user);
    const current = token
      ? await spotifyGet<CurrentlyPlaying>(token, "/me/player/currently-playing")
      : null;
    if (current?.is_playing && current.item && current.currently_playing_type === "track") {
      const t = current.item;
      value = {
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        album: t.album.name,
        imageUrl: pickImage(t.album.images, 300),
        url: `https://open.spotify.com/track/${t.id}`,
        progressMs: current.progress_ms ?? 0,
        durationMs: t.duration_ms,
      };
    }
  } catch {
    value = null;
  }
  cache.set(user.id, { at: Date.now(), value });
  return value;
}
