import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildSiteContentResetSql,
  escapeSqlString,
  queryRemoteD1,
  resolveSingleRemoteSite,
} from "../../../scripts/lib/remote-site-ops.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(__dirname, "..");

function sqlValue(v) {
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replaceAll("'", "''") + "'";
}

function sqlIdentifier(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function dumpTable(name, query) {
  const rows = queryRemoteD1({
    cwd: siteDir,
    sql: query || `SELECT * FROM ${name}`,
  });
  return rows
    .map((row) => {
      const columns = Object.keys(row);
      return `INSERT INTO ${name} (${columns.map(sqlIdentifier).join(",")}) VALUES(${columns.map((column) => sqlValue(row[column])).join(",")});`;
    })
    .join("\n");
}

function stripEmbeddedResetSql(sql) {
  return sql
    .replace(/^--.*\n/gm, "")
    .replace(/^\s*BEGIN TRANSACTION;\s*$/gim, "")
    .replace(/^\s*COMMIT;\s*$/gim, "")
    .trim();
}

const header = `-- =============================================================================
-- Site data for Jant (jant.me)
-- Exported from remote D1 database via: mise run db-site-export
-- Usage: edit this file, then mise run db-site-load-content
-- =============================================================================
`;

const site = resolveSingleRemoteSite({
  cwd: siteDir,
  label: "jant.me",
});
const escapedSiteId = escapeSqlString(site.id);
const resetSql = buildSiteContentResetSql(site.id);

const tables = [
  // Managed shell/config data is preserved by the generated site-scoped reset.
  [
    "post",
    `SELECT * FROM post
     WHERE site_id = '${escapedSiteId}'
       AND deleted_at IS NULL
     ORDER BY CASE WHEN reply_to_id IS NULL THEN 0 ELSE 1 END, created_at, id`,
  ],
  [
    "post_collection",
    `SELECT pc.* FROM post_collection pc
     JOIN post p ON p.id = pc.post_id
     WHERE pc.site_id = '${escapedSiteId}'
       AND p.deleted_at IS NULL
     ORDER BY pc.created_at, pc.collection_id, pc.post_id`,
  ],
  [
    "collection",
    `SELECT * FROM collection
     WHERE site_id = '${escapedSiteId}'
     ORDER BY created_at, id`,
  ],
  [
    "collection_directory_item",
    `SELECT * FROM collection_directory_item
     WHERE site_id = '${escapedSiteId}'
     ORDER BY position, id`,
  ],
  [
    "path_registry",
    `SELECT pr.* FROM path_registry pr
     LEFT JOIN post p ON p.id = pr.post_id
     LEFT JOIN collection c ON c.id = pr.collection_id
     WHERE pr.site_id = '${escapedSiteId}'
       AND (
         pr.kind = 'redirect'
        OR (pr.post_id IS NOT NULL AND p.deleted_at IS NULL)
        OR (pr.collection_id IS NOT NULL AND c.id IS NOT NULL)
       )
     ORDER BY pr.path, pr.id`,
  ],
  [
    "media",
    `SELECT m.* FROM media m
     LEFT JOIN post p ON p.id = m.post_id
     WHERE m.site_id = '${escapedSiteId}'
       AND (m.post_id IS NULL OR p.deleted_at IS NULL)
     ORDER BY m.created_at, m.id`,
  ],
];

let sql = header;
sql += "\nBEGIN TRANSACTION;\n";
sql += "\n-- Reset (clear existing content)\n";
sql += stripEmbeddedResetSql(resetSql) + "\n";

for (const [name, query] of tables) {
  const data = dumpTable(name, query);
  if (data) sql += `\n-- ${name}\n${data}\n`;
}

sql += "\nCOMMIT;\n";

const out = resolve(__dirname, "seed-site.sql");
writeFileSync(out, sql);
console.log("Exported jant.me database to scripts/seed-site.sql");
