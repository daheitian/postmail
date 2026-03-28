ALTER TABLE "collection_directory_item" DROP CONSTRAINT "chk_collection_directory_item_type";--> statement-breakpoint
ALTER TABLE "collection_directory_item" DROP CONSTRAINT "chk_collection_directory_item_shape";--> statement-breakpoint
ALTER TABLE "collection_directory_item" DROP CONSTRAINT "chk_collection_directory_item_label";--> statement-breakpoint
ALTER TABLE "collection_directory_item" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "collection_directory_item" ADD CONSTRAINT "chk_collection_directory_item_type" CHECK ("collection_directory_item"."type" IN ('collection', 'divider', 'link'));--> statement-breakpoint
ALTER TABLE "collection_directory_item" ADD CONSTRAINT "chk_collection_directory_item_shape" CHECK ((
        "collection_directory_item"."type" = 'collection'
        AND "collection_directory_item"."collection_id" IS NOT NULL
        AND "collection_directory_item"."label" IS NULL
        AND "collection_directory_item"."url" IS NULL
      ) OR (
        "collection_directory_item"."type" = 'divider'
        AND "collection_directory_item"."collection_id" IS NULL
        AND "collection_directory_item"."url" IS NULL
      ) OR (
        "collection_directory_item"."type" = 'link'
        AND "collection_directory_item"."collection_id" IS NULL
        AND "collection_directory_item"."label" IS NOT NULL
        AND "collection_directory_item"."url" IS NOT NULL
      ));--> statement-breakpoint
ALTER TABLE "collection_directory_item" ADD CONSTRAINT "chk_collection_directory_item_label" CHECK ("collection_directory_item"."type" <> 'collection' OR "collection_directory_item"."label" IS NULL);