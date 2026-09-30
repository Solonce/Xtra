import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  // Spotify user id
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").notNull().default("UTC"),
  // Who can see /u/<username>: everyone and listed on Explore, anyone with the link, or only the owner.
  visibility: text("visibility", { enum: ["public", "unlisted", "private"] })
    .notNull()
    .default("public"),
  // False until the user has claimed a handle on /welcome.
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  // The first person to sign in becomes the owner of the instance.
  role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: integer("token_expires_at"),
  // playedAt (ms) of the newest scrobble pulled from recently-played; used as the `after` cursor.
  syncCursor: integer("sync_cursor"),
  lastSyncedAt: integer("last_synced_at"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Artists and albums are keyed by normalized name (like last.fm) so that plays coming
// from the live API and from imported Spotify history files land on the same row.
export const artists = sqliteTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  spotifyId: text("spotify_id"),
  imageUrl: text("image_url"),
  genres: text("genres", { mode: "json" }).$type<string[]>(),
});

export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  artistId: text("artist_id").notNull(),
  imageUrl: text("image_url"),
  // Dominant colours pulled from the cover art, most prominent first.
  colors: text("colors", { mode: "json" }).$type<string[]>(),
});

export const tracks = sqliteTable("tracks", {
  // Spotify track id
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  artistId: text("artist_id").notNull(),
  albumId: text("album_id").notNull(),
  artistNames: text("artist_names").notNull(),
  durationMs: integer("duration_ms"),
  enriched: integer("enriched", { mode: "boolean" }).notNull().default(false),
});

export const scrobbles = sqliteTable(
  "scrobbles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    trackId: text("track_id").notNull(),
    artistId: text("artist_id").notNull(),
    albumId: text("album_id").notNull(),
    // When the play finished, epoch ms rounded down to the second.
    playedAt: integer("played_at").notNull(),
    msPlayed: integer("ms_played").notNull(),
    source: text("source", { enum: ["api", "import"] }).notNull(),
  },
  (t) => [
    uniqueIndex("scrobbles_unique").on(t.userId, t.trackId, t.playedAt),
    index("scrobbles_user_time").on(t.userId, t.playedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Artist = typeof artists.$inferSelect;
