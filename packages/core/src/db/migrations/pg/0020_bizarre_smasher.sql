CREATE TABLE "telegram_binding" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"bot_id" text NOT NULL,
	"telegram_user_id" text NOT NULL,
	"telegram_username" text,
	"last_update_id" integer,
	"bound_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_pending_binding" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"code" text NOT NULL,
	"created_at" integer NOT NULL,
	"expires_at" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_binding" ADD CONSTRAINT "telegram_binding_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_pending_binding" ADD CONSTRAINT "telegram_pending_binding_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_telegram_binding_site_id" ON "telegram_binding" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_telegram_binding_bot_user" ON "telegram_binding" USING btree ("bot_id","telegram_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_telegram_pending_binding_site_id" ON "telegram_pending_binding" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_telegram_pending_binding_code" ON "telegram_pending_binding" USING btree ("code");