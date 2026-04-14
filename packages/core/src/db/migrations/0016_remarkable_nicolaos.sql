CREATE TABLE `sync_job` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`locked_until` integer,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_sync_job_status" CHECK("sync_job"."status" IN ('pending', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `idx_sync_job_status_created` ON `sync_job` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sync_job_site_id` ON `sync_job` (`site_id`);