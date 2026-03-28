PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_collection_directory_item` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`type` text NOT NULL,
	`collection_id` text,
	`label` text,
	`url` text,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_collection_directory_item_type" CHECK("__new_collection_directory_item"."type" IN ('collection', 'divider', 'link')),
	CONSTRAINT "chk_collection_directory_item_shape" CHECK((
        "__new_collection_directory_item"."type" = 'collection'
        AND "__new_collection_directory_item"."collection_id" IS NOT NULL
        AND "__new_collection_directory_item"."label" IS NULL
        AND "__new_collection_directory_item"."url" IS NULL
      ) OR (
        "__new_collection_directory_item"."type" = 'divider'
        AND "__new_collection_directory_item"."collection_id" IS NULL
        AND "__new_collection_directory_item"."url" IS NULL
      ) OR (
        "__new_collection_directory_item"."type" = 'link'
        AND "__new_collection_directory_item"."collection_id" IS NULL
        AND "__new_collection_directory_item"."label" IS NOT NULL
        AND "__new_collection_directory_item"."url" IS NOT NULL
      )),
	CONSTRAINT "chk_collection_directory_item_label" CHECK("__new_collection_directory_item"."type" <> 'collection' OR "__new_collection_directory_item"."label" IS NULL)
);
--> statement-breakpoint
INSERT INTO `__new_collection_directory_item`("id", "site_id", "type", "collection_id", "label", "url", "position", "created_at", "updated_at") SELECT "id", "site_id", "type", "collection_id", "label", NULL, "position", "created_at", "updated_at" FROM `collection_directory_item`;--> statement-breakpoint
DROP TABLE `collection_directory_item`;--> statement-breakpoint
ALTER TABLE `__new_collection_directory_item` RENAME TO `collection_directory_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_collection_directory_item_site_collection_id` ON `collection_directory_item` (`site_id`,`collection_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_collection_directory_item_site_position` ON `collection_directory_item` (`site_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_collection_directory_item_site_collection_once` ON `collection_directory_item` (`site_id`,`collection_id`) WHERE "collection_directory_item"."type" = 'collection' AND "collection_directory_item"."collection_id" IS NOT NULL;
