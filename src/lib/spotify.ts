import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";

export const SCOPES = [
  "user-read-recently-played",
  "user-read-currently-playing",
  "user-top-read",
].join(" ");

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

export function redirectUri() {
  return `${process.env.APP_URL}/api/auth/callback`;
}

function basicAuth() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    scope: SCOPES,
    redirect_uri: redirectUri(),
    state,
  });
  return `${ACCOUNTS}/authorize?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export function exchangeCode(code: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });
}

/** Returns a valid access token for the user, refreshing (and persisting) it if needed. */
export async function accessTokenFor(user: User): Promise<string | null> {
  if (!user.refreshToken) return null;
  if (user.accessToken && user.tokenExpiresAt && user.tokenExpiresAt > Date.now() + 60_000) {
    return user.accessToken;
  }
  const token = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: user.refreshToken,
  });
  const update = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? user.refreshToken,
    tokenExpiresAt: Date.now() + token.expires_in * 1000,
  };
  await db.update(schema.users).set(update).where(eq(schema.users.id, user.id));
  Object.assign(user, update);
  return token.access_token;
}

export class SpotifyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function spotifyGet<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new SpotifyError(res.status, `Spotify ${path} → ${res.status}`);
  return res.json();
}

// --- Spotify object shapes (only the fields we use) ---

export type SpotifyImage = { url: string; width: number | null; height: number | null };
export type SpotifyArtistRef = { id: string; name: string };
export type SpotifyArtist = SpotifyArtistRef & { images?: SpotifyImage[]; genres?: string[] };
export type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtistRef[];
  album: { id: string; name: string; images: SpotifyImage[]; artists: SpotifyArtistRef[] };
};
export type SpotifyMe = { id: string; display_name: string | null; images?: SpotifyImage[] };
export type RecentlyPlayed = {
  items: { track: SpotifyTrack; played_at: string }[];
};
export type CurrentlyPlaying = {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type: string;
  item: SpotifyTrack | null;
};

/** Picks the image closest to `size` px wide (Spotify returns 640/300/64). */
export function pickImage(images: SpotifyImage[] | undefined, size = 300) {
  if (!images?.length) return null;
  return [...images].sort(
    (a, b) => Math.abs((a.width ?? 0) - size) - Math.abs((b.width ?? 0) - size),
  )[0].url;
}
