import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { queryD1 } from "../lib/d1-query.js";
import { openNodeSqlite } from "../lib/node-sqlite.js";
import { dumpDatabaseToSql } from "../lib/sql-export.js";
import {
  getCliRuntimeLabel,
  resolveCliRuntime,
} from "../lib/runtime-target.js";

function createSqliteQueryRunner(sqlite) {
  return {
    async query(sql) {
      return sqlite.prepare(sql).all();
    },
  };
}

function createD1QueryRunner(runtime) {
  return {
    async query(sql, options) {
      return queryD1(sql, runtime, options);
    },
  };
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: "string" },
      database: { type: "string", default: "DB" },
      env: { type: "string" },
      local: { type: "boolean", default: false },
      remote: { type: "boolean", default: false },
      output: { type: "string", short: "o", default: "jant-export.sql" },
      help: { type: "boolean", short: "h" },
      "persist-to": { type: "string" },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant db export [--local | --remote] [--output <file>] [--config <file>] [--env <name>] [--database <binding>]",
    );
    console.log("");
    console.log("Export the current database to a SQL file.");
    console.log("");
    console.log("Options:");
    console.log("  --local           Force local D1 instead of DATABASE_URL");
    console.log(
      "  --remote          Export from remote D1 database (default: local)",
    );
    console.log(
      "  --output, -o      Output file path (default: jant-export.sql)",
    );
    console.log(
      "  --config          Wrangler config file (default: wrangler.toml)",
    );
    console.log("  --env             Wrangler environment name");
    console.log("  --database        D1 binding name (default: DB)");
    console.log("  --persist-to      Local D1 state directory override");
    console.log("");
    console.log(
      "If DATABASE_URL or DATA_DIR is set and no runtime flag is passed, this command uses Node SQLite.",
    );
    console.log("");
    console.log("Compatibility alias: jant export");
    process.exit(0);
  }

  const runtime = resolveCliRuntime(values);
  const output = values.output;
  let sql;

  if (runtime === "node") {
    const { sqlite } = openNodeSqlite(process.env, { readonly: true });
    try {
      sql = await dumpDatabaseToSql(createSqliteQueryRunner(sqlite), {
        source: "node",
      });
    } finally {
      sqlite.close();
    }
  } else {
    const d1Options = {
      configPath: values.config,
      database: values.database,
      env: values.env,
      persistTo: values["persist-to"],
    };
    const queryRunner = createD1QueryRunner(runtime);
    sql = await dumpDatabaseToSql(
      {
        async query(statement) {
          return queryRunner.query(statement, d1Options);
        },
      },
      {
        source: runtime === "d1-remote" ? "remote" : "local",
      },
    );
  }

  const outPath = resolve(process.cwd(), output);
  writeFileSync(outPath, sql);
  console.log(`Exported ${getCliRuntimeLabel(runtime)} to ${output}`);
}
