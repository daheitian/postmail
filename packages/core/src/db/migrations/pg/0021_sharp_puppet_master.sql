CREATE TABLE "telegram_media_group_item" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"bot_id" text NOT NULL,
	"telegram_user_id" text NOT NULL,
	"media_group_id" text NOT NULL,
	"chat_id" integer NOT NULL,
	"message_id" integer NOT NULL,
	"update_id" integer NOT NULL,
	"file_id" text NOT NULL,
	"media_kind" text NOT NULL,
	"mime_type" text,
	"original_name" text,
	"caption_markdown" text,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_media_group_item" ADD CONSTRAINT "telegram_media_group_item_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_telegram_media_group_item_group" ON "telegram_media_group_item" USING btree ("bot_id","media_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_telegram_media_group_item_message" ON "telegram_media_group_item" USING btree ("bot_id","media_group_id","message_id");