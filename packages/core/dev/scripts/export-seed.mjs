import { createRequire } from "module";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Parse flags
const args = process.argv.slice(2);
const noMedia = args.includes("--no-media");
const noAuth = args.includes("--no-auth");
const outputIndex = args.indexOf("--output");
const outputFile =
  outputIndex !== -1 ? args[outputIndex + 1] : "seed-local.sql";

// better-sqlite3 is installed in packages/core
const __dirname = dirname(fileURLToPath(import.meta.url));
const coreRequire = createRequire(resolve(__dirname, "../../package.json"));
const Database = coreRequire("better-sqlite3");

const dbDir = resolve(
  __dirname,
  "../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);
const files = readdirSync(dbDir).filter((f) => f.endsWith(".sqlite"));
if (!files.length) {
  console.error("No local D1 database found. Run mise run dev first.");
  process.exit(1);
}

const db = new Database(resolve(dbDir, files[0]), { readonly: true });

function sqlValue(v) {
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replaceAll("'", "''") + "'";
}

function quoteIdentifier(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function dumpTable(name, query) {
  const rows = db.prepare(query || `SELECT * FROM ${name}`).all();
  return rows
    .map((row) => {
      const entries = Object.entries(row);
      const columns = entries
        .map(([column]) => quoteIdentifier(column))
        .join(",");
      const values = entries.map(([, value]) => sqlValue(value)).join(",");
      return `INSERT INTO ${quoteIdentifier(name)} (${columns}) VALUES(${values});`;
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
-- ${noMedia ? "Seed data (without media)" : "Local development seed data"} for Jant
-- Exported from local D1 database
-- Companion reset script: ${noAuth ? "dev/scripts/reset-content.sql" : "dev/scripts/reset-local.sql"}
-- =============================================================================
`;

const tables = [
  ...(!noAuth ? [["setting"], ["user"], ["account"]] : []),
  ["collection", "SELECT * FROM collection ORDER BY created_at, id"],
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
  ...(!noAuth ? [["nav_item", "SELECT * FROM nav_item ORDER BY position, id"]] : []),
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
  ...(!noAuth
    ? [["api_token", "SELECT * FROM api_token ORDER BY created_at, id"]]
    : []),
];

// Include media table only when --no-media is not set
if (!noMedia) {
  tables.push(["media"]);
}

let sql = header;
sql += "\nBEGIN TRANSACTION;\n";

// When --no-auth, embed reset statements so everything runs in a single D1 import
if (noAuth) {
  const resetSql = readFileSync(
    resolve(__dirname, "reset-content.sql"),
    "utf-8",
  );
  sql += "\n-- Reset (clear existing content)\n";
  sql += stripEmbeddedResetSql(resetSql) + "\n";
}

for (const [name, query] of tables) {
  const data = dumpTable(name, query);
  if (data) sql += `\n-- ${name}\n${data}\n`;
}

sql += "\nCOMMIT;\n";

const out = resolve(__dirname, outputFile);
writeFileSync(out, sql);
db.close();
console.log(`Exported to dev/scripts/${outputFile}`);
