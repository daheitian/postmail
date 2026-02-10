import { createRequire } from "module";
import { readdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// better-sqlite3 is installed in packages/core
const __dirname = dirname(fileURLToPath(import.meta.url));
const coreRequire = createRequire(
  resolve(__dirname, "../../../packages/core/package.json")
);
const Database = coreRequire("better-sqlite3");

const dbDir = resolve(
  __dirname,
  "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
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

function dumpTable(name, query) {
  const rows = db.prepare(query || `SELECT * FROM ${name}`).all();
  return rows
    .map(
      (row) =>
        `INSERT INTO ${name} VALUES(${Object.values(row).map(sqlValue).join(",")});`
    )
    .join("\n");
}

const header = `-- =============================================================================
-- Development seed data for Jant
-- Exported from local D1 database
-- Usage: mise run db-seed
-- =============================================================================
`;

const tables = [
  ["settings"],
  ["user"],
  ["account"],
  ["posts", "SELECT * FROM posts WHERE deleted_at IS NULL"],
  ["collections"],
  ["post_collections"],
  ["media"],
];

let sql = header;
for (const [name, query] of tables) {
  const data = dumpTable(name, query);
  if (data) sql += `\n-- ${name}\n${data}\n`;
}

const out = resolve(__dirname, "seed-dev.sql");
writeFileSync(out, sql);
db.close();
console.log("Exported to templates/jant-site/scripts/seed-dev.sql");
