-- Performance indexes for frequently queried columns
-- Posts: almost every query filters by deleted_at IS NULL AND status = 'published'
CREATE INDEX IF NOT EXISTS idx_posts_status_deleted ON posts (status, deleted_at);--> statement-breakpoint

-- Posts: thread lookups and reply counts
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts (thread_id);--> statement-breakpoint

-- Posts: ordering by publication date
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts (published_at);--> statement-breakpoint

-- Media: lookup by post
CREATE INDEX IF NOT EXISTS idx_media_post_id ON media (post_id);--> statement-breakpoint

-- Post-Collections: junction table queries in both directions
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_collections_pk ON post_collections (post_id, collection_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_post_collections_collection ON post_collections (collection_id);
