import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
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
    stdout = execFileSync(
      "pnpm",
      [
        "exec",
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--remote",
        "--command",
        sql,
        "--json",
      ],
      { encoding: "utf-8", cwd: process.cwd() },
    );
  } catch (err) {
    // Wrangler returns JSON errors on stdout even with non-zero exit codes
    const output = err.stdout || err.stderr || "";
    try {
      const errJson = JSON.parse(output.trim());
      if (errJson.error?.text) {
        const detail = errJson.error.notes?.[0]?.text;
        console.error(
          `Wrangler error: ${errJson.error.text}${detail ? `\n  ${detail}` : ""}`,
        );
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
    const detail = parsed.error.notes?.[0]?.text;
    console.error(
      `Wrangler error: ${parsed.error.text}${detail ? `\n  ${detail}` : ""}`,
    );
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

function validateSeed(sql) {
  const persistDir = mkdtempSync(resolve(tmpdir(), "jant-demo-seed-"));
  const seedPath = resolve(persistDir, "seed-demo.sql");

  writeFileSync(seedPath, sql);

  try {
    execFileSync(
      "pnpm",
      ["exec", "jant", "migrate", "--local", "--persist-to", persistDir],
      {
        cwd: process.cwd(),
        encoding: "utf-8",
      },
    );

    execFileSync(
      "pnpm",
      [
        "exec",
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--local",
        "--persist-to",
        persistDir,
        "--file",
        seedPath,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf-8",
      },
    );
  } catch (err) {
    const output = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    console.error(output || err.message);
    process.exit(1);
  } finally {
    rmSync(persistDir, { recursive: true, force: true });
  }
}

const header = `-- =============================================================================
-- Demo seed data for Jant (demo.jant.me)
-- Exported from remote demo D1 database via: mise run db-demo-export
-- Usage: mise run db-demo-reset
-- =============================================================================
`;

// Read reset-demo.sql and include it at the top
const resetSql = readFileSync(resolve(__dirname, "reset-demo.sql"), "utf-8");

const tables = [
  // settings, user, account are preserved by reset-demo.sql — don't export
  [
    "post",
    `SELECT * FROM post
     WHERE deleted_at IS NULL
     ORDER BY CASE WHEN reply_to_id IS NULL THEN 0 ELSE 1 END, created_at, id`,
  ],
  ["collection", "SELECT * FROM collection ORDER BY created_at, id"],
  ["nav_item", "SELECT * FROM nav_item ORDER BY position, id"],
  [
    "collection_directory_item",
    "SELECT * FROM collection_directory_item ORDER BY position, id",
  ],
  [
    "post_collection",
    `SELECT pc.* FROM post_collection pc
     JOIN post p ON p.id = pc.post_id
     WHERE p.deleted_at IS NULL
     ORDER BY pc.created_at, pc.collection_id, pc.post_id`,
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
  ["api_token", "SELECT * FROM api_token ORDER BY created_at, id"],
  [
    "media",
    `SELECT m.* FROM media m
     LEFT JOIN post p ON p.id = m.post_id
     WHERE m.post_id IS NULL OR p.deleted_at IS NULL
     ORDER BY m.created_at, m.id`,
  ],
];

let sql = header;
sql += "\n-- Reset (clear existing content)\n";
sql += resetSql.replace(/^--.*\n/gm, "").trim() + "\n";

for (const [name, query] of tables) {
  const data = dumpTable(name, query);
  if (data) sql += `\n-- ${name}\n${data}\n`;
}

validateSeed(sql);

const out = resolve(__dirname, "seed-demo.sql");
writeFileSync(out, sql);
console.log("Exported demo database to scripts/seed-demo.sql");
