import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const SNAPSHOT_FORMAT = "jant-site-snapshot";
export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_SCOPE = "content";

export const SNAPSHOT_TABLES = [
  "setting",
  "collection",
  "nav_item",
  "collection_directory_item",
  "post",
  "post_collection",
  "path_registry",
  "media",
];

export const SNAPSHOT_CLEAR_TABLES = [
  "post_collection",
  "media",
  "path_registry",
  "collection_directory_item",
  "nav_item",
  "post",
  "collection",
];

export const SNAPSHOT_SETTING_KEYS = [
  "SITE_NAME",
  "SITE_DESCRIPTION",
  "SITE_LANGUAGE",
  "HOME_DEFAULT_VIEW",
  "MAIN_RSS_FEED",
  "HEADER_NAV_MAX_VISIBLE",
  "THEME",
  "CUSTOM_CSS",
  "SITE_AVATAR",
  "SHOW_HEADER_AVATAR",
  "SITE_FAVICON_ICO",
  "SITE_FAVICON_APPLE_TOUCH",
  "SITE_FAVICON_VERSION",
  "FONT_THEME",
  "THEME_MODE",
  "TIME_ZONE",
  "SITE_FOOTER",
  "SHOW_JANT_BRANDING_ON_HOME",
  "NOINDEX",
];

export const SNAPSHOT_STORAGE_SETTING_KEYS = [
  "SITE_AVATAR",
  "SITE_FAVICON_APPLE_TOUCH",
];

const SELECT_SQL_BY_TABLE = {
  setting: `
    SELECT *
    FROM "setting"
    WHERE "key" IN (${quoteList(SNAPSHOT_SETTING_KEYS)})
    ORDER BY "key"
  `,
  collection: `
    SELECT *
    FROM "collection"
    ORDER BY "created_at", "id"
  `,
  nav_item: `
    SELECT *
    FROM "nav_item"
    ORDER BY "position", "id"
  `,
  collection_directory_item: `
    SELECT *
    FROM "collection_directory_item"
    ORDER BY "position", "id"
  `,
  post: `
    SELECT *
    FROM "post"
    ORDER BY "created_at", "id"
  `,
  post_collection: `
    SELECT *
    FROM "post_collection"
    ORDER BY "created_at", "post_id", "collection_id"
  `,
  path_registry: `
    SELECT *
    FROM "path_registry"
    ORDER BY "path", "id"
  `,
  media: `
    SELECT *
    FROM "media"
    ORDER BY "created_at", "id"
  `,
};

export function quoteList(values) {
  return values
    .map((value) => `'${String(value).replaceAll("'", "''")}'`)
    .join(", ");
}

export function getSnapshotSelectSql(tableName) {
  const statement = SELECT_SQL_BY_TABLE[tableName];
  if (!statement) {
    throw new Error(`Unsupported snapshot table: ${tableName}`);
  }
  return statement.trim();
}

export function buildSnapshotStorageQuery() {
  return `
    SELECT "key", "contentType"
    FROM (
      SELECT
        "storage_key" AS "key",
        "mime_type" AS "contentType"
      FROM "media"
      WHERE "storage_key" IS NOT NULL
        AND trim("storage_key") <> ''

      UNION ALL

      SELECT
        "poster_key" AS "key",
        NULL AS "contentType"
      FROM "media"
      WHERE "poster_key" IS NOT NULL
        AND trim("poster_key") <> ''

      UNION ALL

      SELECT
        "value" AS "key",
        NULL AS "contentType"
      FROM "setting"
      WHERE "key" IN (${quoteList(SNAPSHOT_STORAGE_SETTING_KEYS)})
        AND trim("value") <> ''
    )
    WHERE "key" IS NOT NULL
      AND trim("key") <> ''
    ORDER BY "key"
  `.trim();
}

export function collectSnapshotObjects(rows) {
  const objects = new Map();

  for (const row of rows) {
    const key = typeof row.key === "string" ? row.key.trim() : "";
    if (!key) {
      continue;
    }

    const contentType =
      typeof row.contentType === "string" && row.contentType.trim()
        ? row.contentType.trim()
        : guessContentTypeFromKey(key);
    const existing = objects.get(key);
    if (!existing) {
      objects.set(key, { key, contentType });
      continue;
    }

    if (!existing.contentType && contentType) {
      existing.contentType = contentType;
    }
  }

  return [...objects.values()];
}

export function snapshotObjectPath(key) {
  return `objects/${key}`.replace(/\\/g, "/");
}

export function buildSnapshotMeta(source) {
  return {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    scope: SNAPSHOT_SCOPE,
    createdAt: new Date().toISOString(),
    source,
    tables: SNAPSHOT_TABLES,
    settingKeys: SNAPSHOT_SETTING_KEYS,
  };
}

export function assertSnapshotMeta(meta) {
  if (!meta || typeof meta !== "object") {
    throw new Error("Snapshot meta.json is missing or invalid.");
  }

  if (meta.format !== SNAPSHOT_FORMAT) {
    throw new Error(
      `Unsupported snapshot format: expected ${SNAPSHOT_FORMAT}, got ${String(meta.format)}`,
    );
  }

  if (meta.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported snapshot version: expected ${SNAPSHOT_VERSION}, got ${String(meta.version)}`,
    );
  }

  if (meta.scope !== SNAPSHOT_SCOPE) {
    throw new Error(
      `Unsupported snapshot scope: expected ${SNAPSHOT_SCOPE}, got ${String(meta.scope)}`,
    );
  }
}

export function assertSnapshotManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Snapshot storage-manifest.json is missing or invalid.");
  }

  if (manifest.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported storage manifest version: expected ${SNAPSHOT_VERSION}, got ${String(manifest.version)}`,
    );
  }

  if (!Array.isArray(manifest.objects)) {
    throw new Error("Snapshot storage-manifest.json must contain an objects array.");
  }
}

export function buildReplaceSql() {
  const statements = [];

  for (const tableName of SNAPSHOT_CLEAR_TABLES) {
    statements.push(`DELETE FROM "${tableName}";`);
  }

  statements.push(
    `DELETE FROM "setting" WHERE "key" IN (${quoteList(SNAPSHOT_SETTING_KEYS)});`,
  );

  return statements.join("\n");
}

export function normalizeD1Sql(sql) {
  return sql
    .replace(/^\s*BEGIN(?:\s+TRANSACTION)?\s*;\s*$/gim, "")
    .replace(/^\s*COMMIT\s*;\s*$/gim, "")
    .replace(/^\s*ROLLBACK\s*;\s*$/gim, "")
    .trim();
}

export async function sha256File(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export function guessContentTypeFromKey(key) {
  const normalized = String(key).toLowerCase();

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (normalized.endsWith(".gif")) {
    return "image/gif";
  }
  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalized.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (normalized.endsWith(".avif")) {
    return "image/avif";
  }
  if (normalized.endsWith(".ico")) {
    return "image/x-icon";
  }
  if (normalized.endsWith(".mp4")) {
    return "video/mp4";
  }
  if (normalized.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (normalized.endsWith(".ogg")) {
    return "audio/ogg";
  }
  if (normalized.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (normalized.endsWith(".json")) {
    return "application/json";
  }
  if (normalized.endsWith(".txt")) {
    return "text/plain";
  }

  return "";
}
