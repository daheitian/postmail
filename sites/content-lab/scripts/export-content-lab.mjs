import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function sqlValue(value) {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return `'${String(value).replaceAll("'", "''")}'`;
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
        `--command=${sql}`,
        "--json",
      ],
      {
        encoding: "utf-8",
        cwd: process.cwd(),
      },
    );
  } catch (error) {
    const output = error.stdout || error.stderr || "";

    try {
      const parsed = JSON.parse(output.trim());
      if (parsed.error?.text) {
        const detail = parsed.error.notes?.[0]?.text;
        console.error(
          `Wrangler error: ${parsed.error.text}${detail ? `\n  ${detail}` : ""}`,
        );
        process.exit(1);
      }
    } catch {
      // Fall through to the generic message below.
    }

    console.error(`Failed to query remote database: ${output || error.message}`);
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

function validateSnapshot(sql) {
  const persistDir = mkdtempSync(resolve(tmpdir(), "jant-content-lab-seed-"));
  const snapshotPath = resolve(persistDir, "content-lab-snapshot.sql");

  writeFileSync(snapshotPath, sql);

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
        snapshotPath,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf-8",
      },
    );
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    console.error(output || error.message);
    process.exit(1);
  } finally {
    rmSync(persistDir, { recursive: true, force: true });
  }
}

const header = `-- =============================================================================
-- Content-lab snapshot for Jant
-- Exported from the long-lived content-lab Worker
-- Usage: curate this file, then copy the frozen snapshot into
-- packages/core/src/db/rehearsal-fixtures/
-- =============================================================================
`;

const resetSql = readFileSync(resolve(__dirname, "reset-content-lab.sql"), "utf-8");

const tables = [
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
  if (data) {
    sql += `\n-- ${name}\n${data}\n`;
  }
}

validateSnapshot(sql);

const outputPath = resolve(__dirname, "content-lab-snapshot.sql");
writeFileSync(outputPath, sql);
console.log("Exported content-lab database to scripts/content-lab-snapshot.sql");
