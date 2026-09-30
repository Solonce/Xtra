CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`artist_id` text NOT NULL,
	`image_url` text,
	`colors` text
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`spotify_id` text,
	`image_url` text,
	`genres` text
);
--> statement-breakpoint
CREATE TABLE `scrobbles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`artist_id` text NOT NULL,
	`album_id` text NOT NULL,
	`played_at` integer NOT NULL,
	`ms_played` integer NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scrobbles_unique` ON `scrobbles` (`user_id`,`track_id`,`played_at`);--> statement-breakpoint
CREATE INDEX `scrobbles_user_time` ON `scrobbles` (`user_id`,`played_at`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`artist_id` text NOT NULL,
	`album_id` text NOT NULL,
	`artist_names` text NOT NULL,
	`duration_ms` integer,
	`enriched` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`onboarded` integer DEFAULT false NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` integer,
	`sync_cursor` integer,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);