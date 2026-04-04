import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const SNAPSHOT_FORMAT = "jant-site-snapshot";
export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_SCOPE = "content";

export const SNAPSHOT_TABLES = [
  "site_setting",
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

function escapeSqlString(value) {
  return String(value).replaceAll("'", "''");
}

const SELECT_SQL_BY_TABLE = {
  site_setting: `
    SELECT *
    FROM "site_setting"
    WHERE "site_id" = ?1
      AND "key" IN (${quoteList(SNAPSHOT_SETTING_KEYS)})
    ORDER BY "key"
  `,
  collection: `
    SELECT *
    FROM "collection"
    WHERE "site_id" = ?1
    ORDER BY "created_at", "id"
  `,
  nav_item: `
    SELECT *
    FROM "nav_item"
    WHERE "site_id" = ?1
    ORDER BY "position", "id"
  `,
  collection_directory_item: `
    SELECT *
    FROM "collection_directory_item"
    WHERE "site_id" = ?1
    ORDER BY "position", "id"
  `,
  post: `
    SELECT *
    FROM "post"
    WHERE "site_id" = ?1
    ORDER BY "created_at", "id"
  `,
  post_collection: `
    SELECT *
    FROM "post_collection"
    WHERE "site_id" = ?1
    ORDER BY "created_at", "post_id", "collection_id"
  `,
  path_registry: `
    SELECT *
    FROM "path_registry"
    WHERE "site_id" = ?1
    ORDER BY "path", "id"
  `,
  media: `
    SELECT *
    FROM "media"
    WHERE "site_id" = ?1
    ORDER BY "created_at", "id"
  `,
};

export function quoteList(values) {
  return values
    .map((value) => `'${String(value).replaceAll("'", "''")}'`)
    .join(", ");
}

export function getSnapshotSelectSql(tableName, siteId) {
  const statement = SELECT_SQL_BY_TABLE[tableName];
  if (!statement) {
    throw new Error(`Unsupported snapshot table: ${tableName}`);
  }
  return statement.trim().replaceAll("?1", `'${escapeSqlString(siteId)}'`);
}

export function buildSnapshotStorageQuery(siteId) {
  return `
    SELECT "key", "contentType"
    FROM (
      SELECT
        "storage_key" AS "key",
        "mime_type" AS "contentType"
      FROM "media"
      WHERE "storage_key" IS NOT NULL
        AND "site_id" = '${escapeSqlString(siteId)}'
        AND trim("storage_key") <> ''

      UNION ALL

      SELECT
        "poster_key" AS "key",
        NULL AS "contentType"
      FROM "media"
      WHERE "poster_key" IS NOT NULL
        AND "site_id" = '${escapeSqlString(siteId)}'
        AND trim("poster_key") <> ''

      UNION ALL

      SELECT
        "value" AS "key",
        NULL AS "contentType"
      FROM "site_setting"
      WHERE "key" IN (${quoteList(SNAPSHOT_STORAGE_SETTING_KEYS)})
        AND "site_id" = '${escapeSqlString(siteId)}'
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

export function buildSnapshotMeta(source, site) {
  return {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    scope: SNAPSHOT_SCOPE,
    createdAt: new Date().toISOString(),
    source,
    site: {
      id: site.id,
      key: site.key,
    },
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

  if (
    meta.site !== undefined &&
    (!meta.site ||
      typeof meta.site !== "object" ||
      typeof meta.site.id !== "string" ||
      typeof meta.site.key !== "string")
  ) {
    throw new Error("Snapshot meta site must contain string id and key.");
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
    throw new Error(
      "Snapshot storage-manifest.json must contain an objects array.",
    );
  }
}

export function isLegacySnapshotMeta(meta) {
  const tables = Array.isArray(meta?.tables) ? meta.tables : [];
  return !meta?.site || tables.includes("setting");
}

export function getSnapshotBootstrapSite(meta) {
  if (isLegacySnapshotMeta(meta)) {
    return undefined;
  }

  return {
    id: meta.site.id,
    key: meta.site.key,
  };
}

export function validateSnapshotTargetSite(meta, site) {
  if (isLegacySnapshotMeta(meta)) {
    return;
  }

  if (meta.site.id !== site.id) {
    throw new Error(
      `Snapshot site "${meta.site.id}" does not match target site "${site.id}".`,
    );
  }
}

export function rewriteSnapshotSiteIdentifiers(
  sql,
  sourceSiteId,
  targetSiteId,
) {
  if (!sourceSiteId || sourceSiteId === targetSiteId) {
    return sql;
  }

  const escapedSource = escapeSqlString(sourceSiteId);
  const escapedTarget = escapeSqlString(targetSiteId);
  return sql.replaceAll(escapedSource, escapedTarget);
}

export function remapSnapshotManifestObjects(
  manifest,
  sourceSiteId,
  targetSiteId,
) {
  if (!sourceSiteId || sourceSiteId === targetSiteId) {
    return manifest;
  }

  return {
    ...manifest,
    objects: manifest.objects.map((object) => ({
      ...object,
      key: String(object.key).replaceAll(sourceSiteId, targetSiteId),
    })),
  };
}

function prependSiteIdInsert(sql, tableName, siteId) {
  const match = sql.match(
    new RegExp(
      `^INSERT INTO "?${tableName}"? \\(([^)]*)\\) VALUES\\(([\\s\\S]*)\\)$`,
      "i",
    ),
  );
  if (!match) {
    return sql;
  }

  return `INSERT INTO "${tableName}" ("site_id", ${match[1]}) VALUES('${escapeSqlString(siteId)}', ${match[2]})`;
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    if (char === "'") {
      current += char;
      if (inString && sql[index + 1] === "'") {
        current += "'";
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === ";" && !inString) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
}

export function rewriteLegacySnapshotSql(sql, siteId) {
  const uncommentedSql = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  const rewrittenStatements = splitSqlStatements(uncommentedSql).map(
    (statement) => {
      const normalized = statement.trim();
      const legacySettingMatch = normalized.match(
        /^INSERT INTO "?setting"? \(([^)]*)\) VALUES\(([\s\S]*)\)$/i,
      );
      if (legacySettingMatch) {
        return `INSERT INTO "site_setting" ("site_id", ${legacySettingMatch[1]}) VALUES('${escapeSqlString(siteId)}', ${legacySettingMatch[2]})`;
      }

      let rewritten = normalized;
      for (const tableName of [
        "collection",
        "nav_item",
        "collection_directory_item",
        "post",
        "post_collection",
        "path_registry",
        "media",
      ]) {
        rewritten = prependSiteIdInsert(rewritten, tableName, siteId);
      }

      return rewritten;
    },
  );

  return `${rewrittenStatements.join(";\n")};\n`;
}

export function buildReplaceSql(siteId) {
  const statements = [];

  for (const tableName of SNAPSHOT_CLEAR_TABLES) {
    statements.push(
      `DELETE FROM "${tableName}" WHERE "site_id" = '${escapeSqlString(siteId)}';`,
    );
  }

  statements.push(
    `DELETE FROM "site_setting" WHERE "site_id" = '${escapeSqlString(siteId)}' AND "key" IN (${quoteList(SNAPSHOT_SETTING_KEYS)});`,
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
