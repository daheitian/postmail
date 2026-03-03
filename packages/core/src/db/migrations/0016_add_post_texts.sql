-- Post texts: attached text content for posts
CREATE TABLE IF NOT EXISTS `post_texts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `post_id` integer NOT NULL REFERENCES `posts`(`id`) ON DELETE CASCADE,
  `body_json` text NOT NULL,
  `body_html` text NOT NULL,
  `summary` text NOT NULL,
  `position` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_post_texts_post_id` ON `post_texts` (`post_id`);
