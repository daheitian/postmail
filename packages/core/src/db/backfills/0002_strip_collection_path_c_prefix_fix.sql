-- Strip c/ prefix from collection paths in path_registry.
-- Fixes 0001 which incorrectly matched /c/ (with leading slash).
-- Rows where the target path already exists (conflict) are skipped.
UPDATE "path_registry"
SET "path" = SUBSTR("path", 3)
WHERE "collection_id" IS NOT NULL
  AND "path" LIKE 'c/%'
  AND NOT EXISTS (
    SELECT 1 FROM "path_registry" AS pr2
    WHERE pr2."site_id" = "path_registry"."site_id"
      AND pr2."path" = SUBSTR("path_registry"."path", 3)
  );
