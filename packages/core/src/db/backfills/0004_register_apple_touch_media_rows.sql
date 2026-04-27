-- Register apple-touch icons in the media table.
--
-- Pre-JAN-6, apple-touch icons were uploaded to storage but only referenced
-- via the SITE_FAVICON_APPLE_TOUCH setting; they had no corresponding media
-- row. The snapshot logic compensated with a hardcoded list of "storage
-- setting keys", and the dashboard's media manager couldn't see the file.
--
-- JAN-6 makes apple-touch a first-class media entry so snapshot/admin
-- behavior is uniform with avatar. This backfill creates the missing media
-- rows for sites that already had apple-touch icons uploaded.
--
-- The size column is a placeholder (1). We have no way to read the real byte
-- length from pure SQL, and the field is only used for storage budgeting
-- that doesn't apply to favicon assets. Re-uploading the apple-touch icon
-- through the dashboard refreshes size to the accurate value.
--
-- The provider is borrowed from an existing media row in the same site so
-- the (provider, storage_key) unique index stays consistent with how that
-- site's other media is tracked.
INSERT INTO "media" (
  "id",
  "site_id",
  "filename",
  "original_name",
  "mime_type",
  "size",
  "storage_key",
  "provider",
  "position",
  "media_kind",
  "created_at",
  "updated_at"
)
SELECT
  'med_apt_' || substr(s."site_id", 5),
  s."site_id",
  'apple-touch-icon.png',
  'apple-touch-icon.png',
  'image/png',
  1,
  s."value",
  COALESCE(
    (
      SELECT m."provider"
      FROM "media" m
      WHERE m."site_id" = s."site_id"
      ORDER BY m."created_at"
      LIMIT 1
    ),
    'r2'
  ),
  'a0',
  'image',
  s."updated_at",
  s."updated_at"
FROM "site_setting" s
WHERE s."key" = 'SITE_FAVICON_APPLE_TOUCH'
  AND s."value" IS NOT NULL
  AND trim(s."value") <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "media" m
    WHERE m."site_id" = s."site_id"
      AND m."storage_key" = s."value"
  );
