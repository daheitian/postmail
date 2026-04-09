-- Clear default English labels from system nav items so they use i18n translation.
-- Previously system items stored the English default (e.g. "Latest", "Featured") as
-- the label. Now empty string means "use translated default" and any non-empty value
-- is a user-customized label.
UPDATE "nav_item"
SET "label" = ''
WHERE "system_key" IS NOT NULL
  AND (
    ("system_key" = 'latest' AND "label" = 'Latest')
    OR ("system_key" = 'featured' AND "label" = 'Featured')
    OR ("system_key" = 'collections' AND "label" = 'Collections')
    OR ("system_key" = 'archive' AND "label" = 'Archive')
    OR ("system_key" = 'rss' AND "label" = 'RSS')
    OR ("system_key" = 'settings' AND "label" = 'Settings')
  );
