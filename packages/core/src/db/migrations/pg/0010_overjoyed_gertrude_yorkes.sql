ALTER TABLE "path_registry" DROP CONSTRAINT "chk_path_registry_kind";--> statement-breakpoint
ALTER TABLE "path_registry" DROP CONSTRAINT "chk_path_registry_shape";--> statement-breakpoint
ALTER TABLE "path_registry" ADD COLUMN "archive_query" text;--> statement-breakpoint
ALTER TABLE "path_registry" ADD CONSTRAINT "chk_path_registry_kind" CHECK ("path_registry"."kind" IN ('slug', 'alias', 'redirect', 'archive'));--> statement-breakpoint
ALTER TABLE "path_registry" ADD CONSTRAINT "chk_path_registry_shape" CHECK ((
        "path_registry"."kind" IN ('slug', 'alias')
        AND (
          ("path_registry"."post_id" IS NOT NULL AND "path_registry"."collection_id" IS NULL)
          OR ("path_registry"."post_id" IS NULL AND "path_registry"."collection_id" IS NOT NULL)
        )
        AND "path_registry"."redirect_to_path" IS NULL
        AND "path_registry"."redirect_type" IS NULL
        AND "path_registry"."archive_query" IS NULL
      ) OR (
        "path_registry"."kind" = 'redirect'
        AND "path_registry"."post_id" IS NULL
        AND "path_registry"."collection_id" IS NULL
        AND "path_registry"."redirect_to_path" IS NOT NULL
        AND "path_registry"."redirect_type" IN (301, 302)
        AND "path_registry"."archive_query" IS NULL
      ) OR (
        "path_registry"."kind" = 'archive'
        AND "path_registry"."post_id" IS NULL
        AND "path_registry"."collection_id" IS NULL
        AND "path_registry"."redirect_to_path" IS NULL
        AND "path_registry"."redirect_type" IS NULL
        AND "path_registry"."archive_query" IS NOT NULL
      ));