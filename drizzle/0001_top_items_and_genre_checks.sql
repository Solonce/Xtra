CREATE TABLE `top_items` (
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`range` text NOT NULL,
	`rank` integer NOT NULL,
	`item_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `kind`, `range`, `rank`)
);
--> statement-breakpoint
ALTER TABLE `artists` ADD `genres_checked_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `tops_synced_at` integer;