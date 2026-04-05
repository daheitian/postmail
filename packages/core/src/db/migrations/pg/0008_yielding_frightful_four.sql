ALTER TABLE "nav_item" DROP CONSTRAINT "chk_nav_item_system_key";--> statement-breakpoint
ALTER TABLE "nav_item" ADD CONSTRAINT "chk_nav_item_placement" CHECK ("nav_item"."placement" IN ('header', 'more'));--> statement-breakpoint
ALTER TABLE "nav_item" ADD CONSTRAINT "chk_nav_item_system_key" CHECK ("nav_item"."system_key" IS NULL OR "nav_item"."system_key" IN ('latest', 'featured', 'collections', 'archive', 'rss', 'settings'));
