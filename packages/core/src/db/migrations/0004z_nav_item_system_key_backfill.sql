UPDATE `nav_item`
SET `system_key` = CASE
  WHEN `url` = '/feed' THEN 'rss'
  WHEN `url` IN ('/settings', '/dash', '/dash/settings') THEN 'settings'
  WHEN `url` = '/c' THEN 'collections'
  WHEN `url` = '/archive' THEN 'archive'
  WHEN `label` = 'RSS' THEN 'rss'
  WHEN `label` = 'Settings' THEN 'settings'
  WHEN `label` = 'Collections' THEN 'collections'
  WHEN `label` = 'Archive' THEN 'archive'
  ELSE NULL
END
WHERE `type` = 'system' AND `system_key` IS NULL;--> statement-breakpoint
WITH ranked AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `system_key`
      ORDER BY `position`, `created_at`, `id`
    ) AS `rn`
  FROM `nav_item`
  WHERE `type` = 'system' AND `system_key` IS NOT NULL
)
UPDATE `nav_item`
SET `type` = 'link',
    `system_key` = NULL
WHERE `id` IN (SELECT `id` FROM ranked WHERE `rn` > 1);--> statement-breakpoint
UPDATE `nav_item`
SET `label` = CASE `system_key`
      WHEN 'rss' THEN 'RSS'
      WHEN 'settings' THEN 'Settings'
      WHEN 'collections' THEN 'Collections'
      WHEN 'archive' THEN 'Archive'
      ELSE `label`
    END,
    `url` = CASE `system_key`
      WHEN 'rss' THEN '/feed'
      WHEN 'settings' THEN '/settings'
      WHEN 'collections' THEN '/c'
      WHEN 'archive' THEN '/archive'
      ELSE `url`
    END
WHERE `type` = 'system' AND `system_key` IS NOT NULL;--> statement-breakpoint
UPDATE `nav_item`
SET `type` = 'link'
WHERE `type` = 'system' AND `system_key` IS NULL;
