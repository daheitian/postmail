-- Create sidebar_items table
CREATE TABLE `sidebar_items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`collection_id` text,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint

-- Populate sidebar_items from existing collections
INSERT INTO sidebar_items (id, type, collection_id, position, created_at, updated_at)
SELECT lower(hex(randomblob(16))), 'collection', id,
       'a' || CAST(position AS TEXT), created_at, updated_at
FROM collections;
--> statement-breakpoint

-- Populate sidebar_items from existing dividers
INSERT INTO sidebar_items (id, type, collection_id, position, created_at, updated_at)
SELECT id, 'divider', NULL,
       'a' || CAST(position AS TEXT), created_at, updated_at
FROM collection_dividers;
--> statement-breakpoint

-- Drop collection_dividers table
DROP TABLE `collection_dividers`;
--> statement-breakpoint

-- Rebuild collections table without position column
CREATE TABLE `collections_new` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` text DEFAULT 'newest' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `collections_new` SELECT `id`, `slug`, `title`, `description`, `icon`, `sort_order`, `created_at`, `updated_at` FROM `collections`;
--> statement-breakpoint
DROP TABLE `collections`;
--> statement-breakpoint
ALTER TABLE `collections_new` RENAME TO `collections`;
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_unique` ON `collections` (`slug`);
--> statement-breakpoint

-- Rebuild nav_items table with text position
CREATE TABLE `nav_items_new` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'link' NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `nav_items_new` SELECT `id`, `type`, `label`, `url`, 'a' || CAST(`position` AS TEXT), `created_at`, `updated_at` FROM `nav_items`;
--> statement-breakpoint
DROP TABLE `nav_items`;
--> statement-breakpoint
ALTER TABLE `nav_items_new` RENAME TO `nav_items`;
