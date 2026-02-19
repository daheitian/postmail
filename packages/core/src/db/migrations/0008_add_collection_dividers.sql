-- Add collection_dividers table for standalone sortable divider lines

CREATE TABLE `collection_dividers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
