PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_path_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`path` text NOT NULL,
	`kind` text NOT NULL,
	`post_id` text,
	`collection_id` text,
	`redirect_to_path` text,
	`redirect_type` integer,
	`archive_query` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_path_registry_kind" CHECK("__new_path_registry"."kind" IN ('slug', 'alias', 'redirect', 'archive')),
	CONSTRAINT "chk_path_registry_shape" CHECK((
        "__new_path_registry"."kind" IN ('slug', 'alias')
        AND (
          ("__new_path_registry"."post_id" IS NOT NULL AND "__new_path_registry"."collection_id" IS NULL)
          OR ("__new_path_registry"."post_id" IS NULL AND "__new_path_registry"."collection_id" IS NOT NULL)
        )
        AND "__new_path_registry"."redirect_to_path" IS NULL
        AND "__new_path_registry"."redirect_type" IS NULL
        AND "__new_path_registry"."archive_query" IS NULL
      ) OR (
        "__new_path_registry"."kind" = 'redirect'
        AND "__new_path_registry"."post_id" IS NULL
        AND "__new_path_registry"."collection_id" IS NULL
        AND "__new_path_registry"."redirect_to_path" IS NOT NULL
        AND "__new_path_registry"."redirect_type" IN (301, 302)
        AND "__new_path_registry"."archive_query" IS NULL
      ) OR (
        "__new_path_registry"."kind" = 'archive'
        AND "__new_path_registry"."post_id" IS NULL
        AND "__new_path_registry"."collection_id" IS NULL
        AND "__new_path_registry"."redirect_to_path" IS NULL
        AND "__new_path_registry"."redirect_type" IS NULL
        AND "__new_path_registry"."archive_query" IS NOT NULL
      ))
);
--> statement-breakpoint
INSERT INTO `__new_path_registry`("id", "site_id", "path", "kind", "post_id", "collection_id", "redirect_to_path", "redirect_type", "archive_query", "created_at", "updated_at") SELECT "id", "site_id", "path", "kind", "post_id", "collection_id", "redirect_to_path", "redirect_type", NULL, "created_at", "updated_at" FROM `path_registry`;--> statement-breakpoint
DROP TABLE `path_registry`;--> statement-breakpoint
ALTER TABLE `__new_path_registry` RENAME TO `path_registry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_path_registry_site_path` ON `path_registry` (`site_id`,`path`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_path_registry_site_post_slug` ON `path_registry` (`site_id`,`post_id`) WHERE "path_registry"."kind" = 'slug' AND "path_registry"."post_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_path_registry_site_collection_slug` ON `path_registry` (`site_id`,`collection_id`) WHERE "path_registry"."kind" = 'slug' AND "path_registry"."collection_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_path_registry_site_post_id` ON `path_registry` (`site_id`,`post_id`);--> statement-breakpoint
CREATE INDEX `idx_path_registry_site_collection_id` ON `path_registry` (`site_id`,`collection_id`);