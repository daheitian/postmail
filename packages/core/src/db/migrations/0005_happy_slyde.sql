PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_nav_item` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'link' NOT NULL,
	`system_key` text,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "chk_nav_item_type" CHECK("__new_nav_item"."type" IN ('link', 'system')),
	CONSTRAINT "chk_nav_item_system_key" CHECK("__new_nav_item"."system_key" IS NULL OR "__new_nav_item"."system_key" IN ('rss', 'settings', 'collections', 'archive')),
	CONSTRAINT "chk_nav_item_shape" CHECK((
        "__new_nav_item"."type" = 'link'
        AND "__new_nav_item"."system_key" IS NULL
      ) OR (
        "__new_nav_item"."type" = 'system'
        AND "__new_nav_item"."system_key" IS NOT NULL
      ))
);
--> statement-breakpoint
INSERT INTO `__new_nav_item`("id", "type", "system_key", "label", "url", "position", "created_at", "updated_at") SELECT "id", "type", "system_key", "label", "url", "position", "created_at", "updated_at" FROM `nav_item`;--> statement-breakpoint
DROP TABLE `nav_item`;--> statement-breakpoint
ALTER TABLE `__new_nav_item` RENAME TO `nav_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_nav_item_position` ON `nav_item` (`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_nav_item_system_key` ON `nav_item` (`system_key`) WHERE "nav_item"."system_key" IS NOT NULL;