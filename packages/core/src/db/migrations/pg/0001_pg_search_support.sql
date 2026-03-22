CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "search_text" text GENERATED ALWAYS AS (coalesce("title", '') || ' ' || coalesce("url", '') || ' ' || coalesce("quote_text", '') || ' ' || coalesce("body_text", '')) STORED;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "search_document" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("url", '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("quote_text", '')), 'B') ||
          setweight(to_tsvector('simple', coalesce("body_text", '')), 'C')) STORED;--> statement-breakpoint
CREATE INDEX "idx_post_search_document_live" ON "post" USING gin ("search_document") WHERE "post"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_post_search_text_trgm_live" ON "post" USING gin ("search_text" gin_trgm_ops) WHERE "post"."deleted_at" IS NULL;
