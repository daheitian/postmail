-- Replace binary `featured` flag with three-value `visibility` text column.
-- Values: 'listed' (default), 'featured', 'unlisted'.

ALTER TABLE posts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'listed';
--> statement-breakpoint
UPDATE posts SET visibility = 'featured' WHERE featured = 1;
--> statement-breakpoint
ALTER TABLE posts DROP COLUMN featured;
