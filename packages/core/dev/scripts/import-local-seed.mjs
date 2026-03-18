import { createRequire } from "module";
import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreRequire = createRequire(resolve(__dirname, "../../package.json"));
const Database = coreRequire("better-sqlite3");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findLocalDatabasePath(cwd) {
  const dbDir = resolve(
    cwd,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );

  if (!existsSync(dbDir)) {
    fail(
      "No local D1 database found. Run `mise run db-local-reset` or `node ./bin/jant.js migrate --local` from packages/core first.",
    );
  }

  const files = readdirSync(dbDir).filter((entry) => entry.endsWith(".sqlite"));
  if (files.length === 0) {
    fail(
      "No local D1 database file found. Run `mise run db-local-reset` or `node ./bin/jant.js migrate --local` from packages/core first.",
    );
  }

  if (files.length > 1) {
    fail(
      `Expected one local D1 database file, found ${files.length}. Resolve this manually before importing.`,
    );
  }

  return resolve(dbDir, files[0]);
}

function readSqlFile(filePath) {
  if (!existsSync(filePath)) {
    fail(`Seed file not found: ${filePath}`);
  }

  const bytes = readFileSync(filePath);
  const sqliteHeader = Buffer.from("SQLite format 3\u0000", "utf8");
  if (bytes.subarray(0, sqliteHeader.length).equals(sqliteHeader)) {
    fail(
      [
        `Expected a SQL dump, but got a binary SQLite database: ${filePath}`,
        "Export it to SQL first, then import the SQL file.",
      ].join("\n"),
    );
  }

  return bytes.toString("utf8");
}

function normalizeSql(sql) {
  let normalized = sql;
  const applied = [];

  if (/\bsidebar_item\b/.test(normalized)) {
    normalized = normalized.replace(
      /\bsidebar_item\b/g,
      "collection_directory_item",
    );
    applied.push("sidebar_item -> collection_directory_item");
  }

  if (/\bcustom_url\b/.test(normalized)) {
    fail(
      [
        "This seed still references `custom_url`, which no longer matches the current schema.",
        "Convert it to `path_registry` records before importing.",
      ].join("\n"),
    );
  }

  if (
    /INSERT INTO\s+"?post"?\b/.test(normalized) &&
    !/INSERT INTO post_fts\(post_fts\) VALUES \('rebuild'\);/.test(normalized)
  ) {
    normalized = `${normalized.trimEnd()}\n\n-- Rebuild FTS after import\nINSERT INTO post_fts(post_fts) VALUES ('rebuild');\n`;
    applied.push("append post_fts rebuild");
  }

  return { normalized, applied };
}

function queryCount(db, table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count;
}

const inputArg = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith("-") && arg !== process.argv[0]);

if (!inputArg) {
  fail("Usage: node dev/scripts/import-local-seed.mjs <seed.sql>");
}

const inputPath = resolve(process.cwd(), inputArg);
const rawSql = readSqlFile(inputPath);
const { normalized, applied } = normalizeSql(rawSql);
const databasePath = findLocalDatabasePath(process.cwd());

const db = new Database(databasePath);

try {
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(normalized);

  console.log(`Imported ${basename(inputPath)} into local D1.`);
  console.log(`  Database: ${databasePath}`);
  if (applied.length > 0) {
    console.log(`  Normalized: ${applied.join(", ")}`);
  }
  console.log(`  post: ${queryCount(db, "post")}`);
  console.log(`  collection: ${queryCount(db, "collection")}`);
  console.log(
    `  collection_directory_item: ${queryCount(db, "collection_directory_item")}`,
  );
  console.log(`  path_registry: ${queryCount(db, "path_registry")}`);
  console.log(`  media: ${queryCount(db, "media")}`);
  console.log(`  nav_item: ${queryCount(db, "nav_item")}`);
} finally {
  db.close();
}
