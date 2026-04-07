ALTER TABLE "nav_item" DROP CONSTRAINT "chk_nav_item_type";--> statement-breakpoint
ALTER TABLE "nav_item" DROP CONSTRAINT "chk_nav_item_shape";--> statement-breakpoint
ALTER TABLE "nav_item" ADD COLUMN "collection_id" text;--> statement-breakpoint
ALTER TABLE "nav_item" ADD CONSTRAINT "nav_item_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_nav_item_site_collection_id" ON "nav_item" USING btree ("site_id","collection_id") WHERE "nav_item"."collection_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "nav_item" ADD CONSTRAINT "chk_nav_item_type" CHECK ("nav_item"."type" IN ('link', 'system', 'collection'));--> statement-breakpoint
ALTER TABLE "nav_item" ADD CONSTRAINT "chk_nav_item_shape" CHECK ((
        "nav_item"."type" = 'link'
        AND "nav_item"."system_key" IS NULL
        AND "nav_item"."collection_id" IS NULL
      ) OR (
        "nav_item"."type" = 'system'
        AND "nav_item"."system_key" IS NOT NULL
        AND "nav_item"."collection_id" IS NULL
      ) OR (
        "nav_item"."type" = 'collection'
        AND "nav_item"."system_key" IS NULL
        AND "nav_item"."collection_id" IS NOT NULL
      ));