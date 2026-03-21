CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_token" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"last_used_at" integer,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "api_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "collection_directory_item" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"type" text NOT NULL,
	"collection_id" text,
	"label" text,
	"position" text DEFAULT 'a0' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_collection_directory_item_type" CHECK ("collection_directory_item"."type" IN ('collection', 'divider')),
	CONSTRAINT "chk_collection_directory_item_shape" CHECK ((
        "collection_directory_item"."type" = 'collection' AND "collection_directory_item"."collection_id" IS NOT NULL
      ) OR (
        "collection_directory_item"."type" = 'divider' AND "collection_directory_item"."collection_id" IS NULL
      )),
	CONSTRAINT "chk_collection_directory_item_label" CHECK ("collection_directory_item"."type" = 'divider' OR "collection_directory_item"."label" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" text DEFAULT 'newest' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_collection_sort_order" CHECK ("collection"."sort_order" IN ('newest', 'oldest', 'rating_desc'))
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"post_id" text,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"provider" text DEFAULT 'r2' NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"position" text DEFAULT 'a0' NOT NULL,
	"blurhash" text,
	"waveform" text,
	"poster_key" text,
	"summary" text,
	"chars" integer,
	"media_kind" text DEFAULT 'document' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_media_size_positive" CHECK ("media"."size" > 0),
	CONSTRAINT "chk_media_position_not_blank" CHECK (trim("media"."position") <> ''),
	CONSTRAINT "chk_media_dimensions_positive" CHECK ((
        "media"."width" IS NULL OR "media"."width" > 0
      ) AND (
        "media"."height" IS NULL OR "media"."height" > 0
      )),
	CONSTRAINT "chk_media_chars_nonnegative" CHECK ("media"."chars" IS NULL OR "media"."chars" >= 0)
);
--> statement-breakpoint
CREATE TABLE "nav_item" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"type" text DEFAULT 'link' NOT NULL,
	"system_key" text,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"position" text DEFAULT 'a0' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_nav_item_type" CHECK ("nav_item"."type" IN ('link', 'system')),
	CONSTRAINT "chk_nav_item_system_key" CHECK ("nav_item"."system_key" IS NULL OR "nav_item"."system_key" IN ('rss', 'settings', 'collections', 'archive')),
	CONSTRAINT "chk_nav_item_shape" CHECK ((
        "nav_item"."type" = 'link'
        AND "nav_item"."system_key" IS NULL
      ) OR (
        "nav_item"."type" = 'system'
        AND "nav_item"."system_key" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "path_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"path" text NOT NULL,
	"kind" text NOT NULL,
	"post_id" text,
	"collection_id" text,
	"redirect_to_path" text,
	"redirect_type" integer,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_path_registry_kind" CHECK ("path_registry"."kind" IN ('slug', 'alias', 'redirect')),
	CONSTRAINT "chk_path_registry_shape" CHECK ((
        "path_registry"."kind" IN ('slug', 'alias')
        AND (
          ("path_registry"."post_id" IS NOT NULL AND "path_registry"."collection_id" IS NULL)
          OR ("path_registry"."post_id" IS NULL AND "path_registry"."collection_id" IS NOT NULL)
        )
        AND "path_registry"."redirect_to_path" IS NULL
        AND "path_registry"."redirect_type" IS NULL
      ) OR (
        "path_registry"."kind" = 'redirect'
        AND "path_registry"."post_id" IS NULL
        AND "path_registry"."collection_id" IS NULL
        AND "path_registry"."redirect_to_path" IS NOT NULL
        AND "path_registry"."redirect_type" IN (301, 302)
      ))
);
--> statement-breakpoint
CREATE TABLE "post_collection" (
	"site_id" text NOT NULL,
	"post_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" integer NOT NULL,
	CONSTRAINT "post_collection_site_id_post_id_collection_id_pk" PRIMARY KEY("site_id","post_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"format" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"visibility" text DEFAULT 'public',
	"pinned_at" integer,
	"featured_at" integer,
	"title" text,
	"url" text,
	"body" text,
	"body_html" text,
	"body_text" text,
	"quote_text" text,
	"summary" text,
	"rating" integer,
	"reply_to_id" text,
	"thread_id" text NOT NULL,
	"deleted_at" integer,
	"published_at" integer,
	"last_activity_at" integer,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_post_reply_to_not_self" CHECK ("post"."reply_to_id" IS NULL OR "post"."reply_to_id" <> "post"."id"),
	CONSTRAINT "chk_post_thread_shape" CHECK ((
        "post"."reply_to_id" IS NULL
        AND "post"."thread_id" = "post"."id"
      ) OR (
        "post"."reply_to_id" IS NOT NULL
        AND "post"."thread_id" <> "post"."id"
      ))
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "site_setting" (
	"site_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "site_setting_site_id_key_pk" PRIMARY KEY("site_id","key")
);
--> statement-breakpoint
CREATE TABLE "site_domain" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"host" text NOT NULL,
	"path_prefix" text,
	"kind" text DEFAULT 'primary' NOT NULL,
	"redirect_to_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chk_site_domain_kind" CHECK ("site_domain"."kind" IN ('primary', 'alias'))
);
--> statement-breakpoint
CREATE TABLE "site_member" (
	"site_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "site_member_site_id_user_id_pk" PRIMARY KEY("site_id","user_id"),
	CONSTRAINT "chk_site_member_role" CHECK ("site_member"."role" IN ('owner', 'admin', 'editor'))
);
--> statement-breakpoint
CREATE TABLE "site" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_site_status" CHECK ("site"."status" IN ('active', 'suspended'))
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'member',
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_directory_item" ADD CONSTRAINT "collection_directory_item_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_directory_item" ADD CONSTRAINT "collection_directory_item_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nav_item" ADD CONSTRAINT "nav_item_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_registry" ADD CONSTRAINT "path_registry_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_registry" ADD CONSTRAINT "path_registry_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_registry" ADD CONSTRAINT "path_registry_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_collection" ADD CONSTRAINT "post_collection_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_collection" ADD CONSTRAINT "post_collection_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_collection" ADD CONSTRAINT "post_collection_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_site_id_reply_to_id_post_site_id_id_fk" FOREIGN KEY ("site_id","reply_to_id") REFERENCES "public"."post"("site_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_site_id_thread_id_post_site_id_id_fk" FOREIGN KEY ("site_id","thread_id") REFERENCES "public"."post"("site_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_setting" ADD CONSTRAINT "site_setting_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_domain" ADD CONSTRAINT "site_domain_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_member" ADD CONSTRAINT "site_member_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_token_site_id" ON "api_token" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_collection_directory_item_site_collection_id" ON "collection_directory_item" USING btree ("site_id","collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_collection_directory_item_site_position" ON "collection_directory_item" USING btree ("site_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_collection_directory_item_site_collection_once" ON "collection_directory_item" USING btree ("site_id","collection_id") WHERE "collection_directory_item"."type" = 'collection' AND "collection_directory_item"."collection_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_collection_site_created_at" ON "collection" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_media_site_post_id_position" ON "media" USING btree ("site_id","post_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_media_site_post_position" ON "media" USING btree ("site_id","post_id","position") WHERE "media"."post_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_media_provider_storage_key" ON "media" USING btree ("provider","storage_key");--> statement-breakpoint
CREATE INDEX "idx_media_site_media_kind_post_id" ON "media" USING btree ("site_id","media_kind","post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_nav_item_site_position" ON "nav_item" USING btree ("site_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_nav_item_site_system_key" ON "nav_item" USING btree ("site_id","system_key") WHERE "nav_item"."system_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_path_registry_site_path" ON "path_registry" USING btree ("site_id","path");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_path_registry_site_post_slug" ON "path_registry" USING btree ("site_id","post_id") WHERE "path_registry"."kind" = 'slug' AND "path_registry"."post_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_path_registry_site_collection_slug" ON "path_registry" USING btree ("site_id","collection_id") WHERE "path_registry"."kind" = 'slug' AND "path_registry"."collection_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_path_registry_site_post_id" ON "path_registry" USING btree ("site_id","post_id");--> statement-breakpoint
CREATE INDEX "idx_path_registry_site_collection_id" ON "path_registry" USING btree ("site_id","collection_id");--> statement-breakpoint
CREATE INDEX "idx_post_collection_site_collection_id" ON "post_collection" USING btree ("site_id","collection_id");--> statement-breakpoint
CREATE INDEX "idx_post_collection_site_collection_created_post" ON "post_collection" USING btree ("site_id","collection_id","created_at","post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_post_site_id_id" ON "post" USING btree ("site_id","id");--> statement-breakpoint
CREATE INDEX "idx_post_site_thread_id" ON "post" USING btree ("site_id","thread_id");--> statement-breakpoint
CREATE INDEX "idx_post_site_thread_live_created" ON "post" USING btree ("site_id","thread_id","created_at","id") WHERE "post"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_post_site_status_deleted_published" ON "post" USING btree ("site_id","status","deleted_at","published_at");--> statement-breakpoint
CREATE INDEX "idx_post_site_status_deleted_activity" ON "post" USING btree ("site_id","status","deleted_at","last_activity_at");--> statement-breakpoint
CREATE INDEX "idx_post_site_root_live_published_activity" ON "post" USING btree ("site_id","last_activity_at","id") WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX "idx_post_site_root_live_draft_updated" ON "post" USING btree ("site_id","updated_at","id") WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'draft';--> statement-breakpoint
CREATE INDEX "idx_post_site_reply_live_thread_created" ON "post" USING btree ("site_id","thread_id","created_at","id") WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NOT NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX "idx_post_site_featured_live_featured_at" ON "post" USING btree ("site_id","featured_at","thread_id","id") WHERE "post"."deleted_at" IS NULL AND "post"."status" = 'published' AND "post"."featured_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_site_setting_site_id" ON "site_setting" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_site_domain_host" ON "site_domain" USING btree ("host");--> statement-breakpoint
CREATE INDEX "idx_site_domain_site_id" ON "site_domain" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_site_member_user_id" ON "site_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_site_key" ON "site" USING btree ("key");
