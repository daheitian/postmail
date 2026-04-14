CREATE TABLE "sync_job" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	"locked_until" integer
);
--> statement-breakpoint
ALTER TABLE "sync_job" ADD CONSTRAINT "sync_job_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sync_job_status_created" ON "sync_job" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_sync_job_site_id" ON "sync_job" USING btree ("site_id");