PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sidebar_item` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`collection_id` text,
	`label` text,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_sidebar_item_type" CHECK("__new_sidebar_item"."type" IN ('collection', 'divider')),
	CONSTRAINT "chk_sidebar_item_shape" CHECK((
        "__new_sidebar_item"."type" = 'collection' AND "__new_sidebar_item"."collection_id" IS NOT NULL
      ) OR (
        "__new_sidebar_item"."type" = 'divider' AND "__new_sidebar_item"."collection_id" IS NULL
      )),
	CONSTRAINT "chk_sidebar_item_label" CHECK("__new_sidebar_item"."type" = 'divider' OR "__new_sidebar_item"."label" IS NULL)
);
--> statement-breakpoint
INSERT INTO `__new_sidebar_item`("id", "type", "collection_id", "label", "position", "created_at", "updated_at") SELECT "id", "type", "collection_id", NULL, "position", "created_at", "updated_at" FROM `sidebar_item`;--> statement-breakpoint
DROP TABLE `sidebar_item`;--> statement-breakpoint
ALTER TABLE `__new_sidebar_item` RENAME TO `sidebar_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_sidebar_item_collection_id` ON `sidebar_item` (`collection_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sidebar_item_position` ON `sidebar_item` (`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sidebar_item_collection_once` ON `sidebar_item` (`collection_id`) WHERE "sidebar_item"."type" = 'collection' AND "sidebar_item"."collection_id" IS NOT NULL;
