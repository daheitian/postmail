CREATE TABLE `telegram_media_group_item` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`bot_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`media_group_id` text NOT NULL,
	`chat_id` integer NOT NULL,
	`message_id` integer NOT NULL,
	`update_id` integer NOT NULL,
	`file_id` text NOT NULL,
	`media_kind` text NOT NULL,
	`mime_type` text,
	`original_name` text,
	`caption_markdown` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_telegram_media_group_item_group` ON `telegram_media_group_item` (`bot_id`,`media_group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_telegram_media_group_item_message` ON `telegram_media_group_item` (`bot_id`,`media_group_id`,`message_id`);