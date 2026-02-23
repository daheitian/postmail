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

function queryRemote(sql) {
  let stdout;
  try {
    stdout = execSync(
      `pnpm exec wrangler d1 execute DB --remote --command "${sql}" --json`,
      { encoding: "utf-8", cwd: process.cwd() }
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
    .map(
      (row) =>
        `INSERT INTO ${name} VALUES(${Object.values(row).map(sqlValue).join(",")});`
    )
    .join("\n");
}

const header = `-- =============================================================================
-- Site data for Jant (jant.me)
-- Exported from remote D1 database via: mise run site-export
-- Usage: edit this file, then mise run site-push
-- =============================================================================
`;

// Read reset-site.sql and include it at the top
const resetSql = readFileSync(resolve(__dirname, "reset-site.sql"), "utf-8");

const tables = [
  // settings, user, account are preserved by reset-site.sql — don't export
  ["posts", "SELECT * FROM posts WHERE deleted_at IS NULL"],
  ["post_collections"],
  ["pages"],
  ["collections"],
  ["nav_items"],
  ["media"],
];

let sql = header;
sql += "\n-- Reset (clear existing content)\n";
sql += resetSql.replace(/^--.*\n/gm, "").trim() + "\n";

for (const [name, query] of tables) {
  const data = dumpTable(name, query);
  if (data) sql += `\n-- ${name}\n${data}\n`;
}

const out = resolve(__dirname, "seed-site.sql");
writeFileSync(out, sql);
console.log("Exported jant.me database to scripts/seed-site.sql");
