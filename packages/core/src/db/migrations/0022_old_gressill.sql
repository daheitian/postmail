CREATE TABLE `telegram_binding` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`bot_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`telegram_username` text,
	`last_update_id` integer,
	`bound_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_telegram_binding_site_id` ON `telegram_binding` (`site_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_telegram_binding_bot_user` ON `telegram_binding` (`bot_id`,`telegram_user_id`);--> statement-breakpoint
CREATE TABLE `telegram_pending_binding` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_telegram_pending_binding_site_id` ON `telegram_pending_binding` (`site_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_telegram_pending_binding_code` ON `telegram_pending_binding` (`code`);