import { readFileSync } from "node:fs";
import { executeD1, queryD1 } from "./d1-query.js";
import {
  DEFAULT_DATA_MIGRATION_TABLE,
  listBackfillFiles,
  listSchemaMigrationFiles,
  readWranglerDatabaseConfig,
  resolveBundledBackfillsDir,
} from "./migration-artifacts.js";

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function quoteString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeSqlFile(sql) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .join("\n");
}

function createTrackingTableSql(tableName) {
  const table = quoteIdentifier(tableName);
  return `
    CREATE TABLE IF NOT EXISTS ${table} (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT UNIQUE NOT NULL,
      "applied_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;
}

function createNodeSqlRunner(sqlite) {
  return {
    execute(sql) {
      sqlite.exec(sql);
    },
    query(sql) {
      return sqlite.prepare(sql).all();
    },
  };
}

function createD1SqlRunner(runtime, options) {
  return {
    execute(sql) {
      executeD1(sql, runtime, { ...options, quiet: true });
    },
    query(sql) {
      return queryD1(sql, runtime, options);
    },
  };
}

function listAppliedNames(runner, tableName) {
  const table = quoteIdentifier(tableName);
  return runner
    .query(`SELECT "name" FROM ${table} ORDER BY "id"`)
    .map((row) => String(row.name));
}

function applySqlFiles(runner, options) {
  const { files, headline, tableName } = options;
  if (files.length === 0) {
    console.log(`No ${headline.toLowerCase()} to apply.`);
    return 0;
  }

  runner.execute(createTrackingTableSql(tableName));
  const appliedNames = new Set(listAppliedNames(runner, tableName));
  const pendingFiles = files.filter((file) => !appliedNames.has(file.name));

  if (pendingFiles.length === 0) {
    console.log(`No ${headline.toLowerCase()} to apply.`);
    return 0;
  }

  console.log(
    `Applying ${headline.toLowerCase()} (${pendingFiles.length} pending)...`,
  );

  const table = quoteIdentifier(tableName);
  for (const [index, file] of pendingFiles.entries()) {
    const sql = normalizeSqlFile(readFileSync(file.path, "utf-8"));
    if (!sql) {
      throw new Error(`${headline.slice(0, -1)} file is empty: ${file.path}`);
    }

    try {
      runner.execute(
        `\n${sql}\nINSERT INTO ${table} ("name") VALUES (${quoteString(file.name)});`,
      );
      console.log(`[${index + 1}/${pendingFiles.length}] ${file.name} ✅`);
    } catch (error) {
      console.log(`[${index + 1}/${pendingFiles.length}] ${file.name} ❌`);
      throw new Error(`Failed to apply ${file.name}: ${error.message}`, {
        cause: error,
      });
    }
  }

  return pendingFiles.length;
}

function resolveD1RunnerOptions(options = {}) {
  const config = readWranglerDatabaseConfig(options);
  return {
    config,
    runnerOptions: {
      configPath: config.configPath,
      database: config.databaseBinding,
      env: options.env,
      persistTo: options.persistTo,
    },
  };
}

export function applyD1SchemaMigrations(runtime, options = {}) {
  const { config, runnerOptions } = resolveD1RunnerOptions(options);
  return applySqlFiles(createD1SqlRunner(runtime, runnerOptions), {
    files: listSchemaMigrationFiles(config.migrationsDir),
    headline: "Schema migrations",
    tableName: config.migrationsTable,
  });
}

export function applyD1Backfills(runtime, options = {}) {
  const { runnerOptions } = resolveD1RunnerOptions(options);
  return applySqlFiles(createD1SqlRunner(runtime, runnerOptions), {
    files: listBackfillFiles(resolveBundledBackfillsDir()),
    headline: "Data backfills",
    tableName: DEFAULT_DATA_MIGRATION_TABLE,
  });
}

export function applyNodeBackfills(sqlite) {
  return applySqlFiles(createNodeSqlRunner(sqlite), {
    files: listBackfillFiles(resolveBundledBackfillsDir()),
    headline: "Data backfills",
    tableName: DEFAULT_DATA_MIGRATION_TABLE,
  });
}
