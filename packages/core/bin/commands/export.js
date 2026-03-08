import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

function sqlValue(v) {
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replaceAll("'", "''") + "'";
}

function query(sql, flag) {
  let stdout;
  try {
    stdout = execSync(
      `npx wrangler d1 execute DB ${flag} --command "${sql}" --json`,
      { encoding: "utf-8" },
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
    console.error(`Failed to query database: ${output || err.message}`);
    process.exit(1);
  }
  const parsed = JSON.parse(stdout);
  if (parsed.error?.text) {
    console.error(`Wrangler error: ${parsed.error.text}`);
    process.exit(1);
  }
  return parsed[0]?.results || [];
}

function dumpTable(name, flag, customQuery) {
  const rows = query(customQuery || `SELECT * FROM ${name}`, flag);
  return rows
    .map(
      (row) =>
        `INSERT INTO ${name} VALUES(${Object.values(row).map(sqlValue).join(",")});`,
    )
    .join("\n");
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      remote: { type: "boolean", default: false },
      output: { type: "string", short: "o", default: "jant-export.sql" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log("Usage: jant export [--remote] [--output <file>]");
    console.log("");
    console.log("Export D1 database to a SQL file.");
    console.log("");
    console.log("Options:");
    console.log(
      "  --remote          Export from remote D1 database (default: local)",
    );
    console.log(
      "  --output, -o      Output file path (default: jant-export.sql)",
    );
    process.exit(0);
  }

  const flag = values.remote ? "--remote" : "--local";
  const output = values.output;

  // Order matters for foreign key constraints
  const tables = [
    // Auth
    ["settings"],
    ["user"],
    ["account"],
    // Content
    ["pages"],
    ["collections"],
    ["posts", "SELECT * FROM posts WHERE deleted_at IS NULL"],
    ["post_collections"],
    ["sidebar_items"],
    ["nav_items"],
    ["media"],
    ["redirects"],
  ];

  const timestamp = new Date().toISOString();
  const source = values.remote ? "remote" : "local";
  let sql = `-- Jant database export\n`;
  sql += `-- Exported: ${timestamp}\n`;
  sql += `-- Source: ${source}\n\n`;

  for (const [name, customQuery] of tables) {
    const data = dumpTable(name, flag, customQuery);
    if (data) {
      sql += `-- ${name}\n${data}\n\n`;
    }
  }

  const outPath = resolve(process.cwd(), output);
  writeFileSync(outPath, sql);
  console.log(`Exported ${source} database to ${output}`);
}
