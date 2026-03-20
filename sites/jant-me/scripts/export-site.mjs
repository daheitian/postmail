import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function sqlValue(v) {
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replaceAll("'", "''") + "'";
}

function sqlIdentifier(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function queryRemote(sql) {
  let stdout;
  try {
    stdout = execSync(
      `pnpm exec wrangler d1 execute DB --remote --command "${sql}" --json`,
      { encoding: "utf-8", cwd: process.cwd() },
    );
  } catch (err) {
    const output = err.stdout || err.stderr || "";
    try {
      const errJson = JSON.parse(output.trim());
      if (errJson.error?.text) {
        console.error(`Wrangler error: ${errJson.error.text}`);
        process.exit(1);
      }
    } catch {
      // Not JSON, fall through
    }
    console.error(`Failed to query remote database: ${output || err.message}`);
    process.exit(1);
  }
  const parsed = JSON.parse(stdout);
  if (parsed.error?.text) {
    console.error(`Wrangler error: ${parsed.error.text}`);
    process.exit(1);
  }
  return parsed[0]?.results || [];
}

function dumpTable(name, query) {
  const rows = queryRemote(query || `SELECT * FROM ${name}`);
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

// Read reset-site.sql and include it at the top
const resetSql = readFileSync(resolve(__dirname, "reset-site.sql"), "utf-8");

const tables = [
  // Managed shell/config data is preserved by reset-site.sql — export content only.
  [
    "post",
    `SELECT * FROM post
     WHERE deleted_at IS NULL
     ORDER BY CASE WHEN reply_to_id IS NULL THEN 0 ELSE 1 END, created_at, id`,
  ],
  [
    "post_collection",
    `SELECT pc.* FROM post_collection pc
     JOIN post p ON p.id = pc.post_id
     WHERE p.deleted_at IS NULL
     ORDER BY pc.created_at, pc.collection_id, pc.post_id`,
  ],
  ["collection", "SELECT * FROM collection ORDER BY created_at, id"],
  [
    "collection_directory_item",
    "SELECT * FROM collection_directory_item ORDER BY position, id",
  ],
  [
    "path_registry",
    `SELECT pr.* FROM path_registry pr
     LEFT JOIN post p ON p.id = pr.post_id
     LEFT JOIN collection c ON c.id = pr.collection_id
     WHERE pr.kind = 'redirect'
        OR (pr.post_id IS NOT NULL AND p.deleted_at IS NULL)
        OR (pr.collection_id IS NOT NULL AND c.id IS NOT NULL)
     ORDER BY pr.path, pr.id`,
  ],
  [
    "media",
    `SELECT m.* FROM media m
     LEFT JOIN post p ON p.id = m.post_id
     WHERE m.post_id IS NULL OR p.deleted_at IS NULL
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
