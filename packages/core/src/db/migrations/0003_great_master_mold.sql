PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_collection` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`sort_order` text DEFAULT 'newest' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "chk_collection_sort_order" CHECK("__new_collection"."sort_order" IN ('newest', 'oldest', 'rating_desc'))
);
--> statement-breakpoint
INSERT INTO `__new_collection`("id", "title", "description", "sort_order", "created_at", "updated_at") SELECT "id", "title", "description", "sort_order", "created_at", "updated_at" FROM `collection`;--> statement-breakpoint
DROP TABLE `collection`;--> statement-breakpoint
ALTER TABLE `__new_collection` RENAME TO `collection`;--> statement-breakpoint
PRAGMA foreign_keys=ON;