DELETE FROM `post` WHERE `deleted_at` IS NOT NULL;--> statement-breakpoint
DROP INDEX `idx_post_site_thread_live_created`;--> statement-breakpoint
DROP INDEX `idx_post_site_status_deleted_published`;--> statement-breakpoint
DROP INDEX `idx_post_site_status_deleted_activity`;--> statement-breakpoint
DROP INDEX `idx_post_site_root_live_published_activity`;--> statement-breakpoint
DROP INDEX `idx_post_site_root_live_draft_updated`;--> statement-breakpoint
DROP INDEX `idx_post_site_reply_live_thread_created`;--> statement-breakpoint
DROP INDEX `idx_post_site_featured_live_featured_at`;--> statement-breakpoint
CREATE INDEX `idx_post_site_thread_created` ON `post` (`site_id`,`thread_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_post_site_status_published` ON `post` (`site_id`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_post_site_status_activity` ON `post` (`site_id`,`status`,`last_activity_at`);--> statement-breakpoint
CREATE INDEX `idx_post_site_root_published_activity` ON `post` (`site_id`,`last_activity_at`,`id`) WHERE "post"."reply_to_id" IS NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_post_site_root_draft_updated` ON `post` (`site_id`,`updated_at`,`id`) WHERE "post"."reply_to_id" IS NULL AND "post"."status" = 'draft';--> statement-breakpoint
CREATE INDEX `idx_post_site_reply_thread_created` ON `post` (`site_id`,`thread_id`,`created_at`,`id`) WHERE "post"."reply_to_id" IS NOT NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_post_site_featured_featured_at` ON `post` (`site_id`,`featured_at`,`thread_id`,`id`) WHERE "post"."status" = 'published' AND "post"."featured_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE `post` DROP COLUMN `deleted_at`;