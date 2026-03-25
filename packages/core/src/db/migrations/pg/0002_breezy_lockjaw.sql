CREATE TABLE "upload_session" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"media_id" text NOT NULL,
	"original_name" text NOT NULL,
	"filename" text NOT NULL,
	"provider" text NOT NULL,
	"expected_content_type" text NOT NULL,
	"expected_size" integer NOT NULL,
	"expected_checksum_sha256" text,
	"content_disposition" text DEFAULT 'inline' NOT NULL,
	"temp_storage_key" text NOT NULL,
	"final_storage_key" text NOT NULL,
	"multipart_upload_id" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"expires_at" integer NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "chk_upload_session_expected_size_positive" CHECK ("upload_session"."expected_size" > 0),
	CONSTRAINT "chk_upload_session_state" CHECK ("upload_session"."state" IN ('pending', 'uploaded', 'completed', 'aborted', 'failed')),
	CONSTRAINT "chk_upload_session_content_disposition" CHECK ("upload_session"."content_disposition" IN ('inline', 'attachment'))
);
--> statement-breakpoint
ALTER TABLE "upload_session" ADD CONSTRAINT "upload_session_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_upload_session_media_id" ON "upload_session" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_upload_session_temp_storage_key" ON "upload_session" USING btree ("temp_storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_upload_session_final_storage_key" ON "upload_session" USING btree ("final_storage_key");--> statement-breakpoint
CREATE INDEX "idx_upload_session_site_state" ON "upload_session" USING btree ("site_id","state");--> statement-breakpoint
CREATE INDEX "idx_upload_session_site_expires_at" ON "upload_session" USING btree ("site_id","expires_at");