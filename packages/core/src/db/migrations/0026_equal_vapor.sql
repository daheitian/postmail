PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`pinned_at` integer,
	`slug` text NOT NULL,
	`title` text,
	`url` text,
	`body` text,
	`body_html` text,
	`body_text` text,
	`quote_text` text,
	`summary` text,
	`rating` integer,
	`reply_to_id` text,
	`thread_id` text,
	`deleted_at` integer,
	`published_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "format", "status", "visibility", "pinned_at", "slug", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "created_at", "updated_at") SELECT "id", "format", "status", "visibility", CASE WHEN "pinned" = 1 THEN "published_at" ELSE NULL END, "slug", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "created_at", "updated_at" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);