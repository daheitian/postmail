ALTER TABLE `post` ADD `featured_at` integer;--> statement-breakpoint
UPDATE post SET featured_at = updated_at, visibility = 'public' WHERE visibility = 'featured';