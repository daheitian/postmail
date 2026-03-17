import { parseArgs } from "node:util";
import {
  applyD1Backfills,
  applyD1SchemaMigrations,
  applyNodeBackfills,
} from "../lib/migration-runner.js";
import { loadNodeRuntime } from "../lib/load-node-runtime.js";
import { openNodeSqlite } from "../lib/node-sqlite.js";
import {
  getCliRuntimeLabel,
  resolveCliRuntime,
} from "../lib/runtime-target.js";

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: "string" },
      database: { type: "string", default: "DB" },
      env: { type: "string" },
      help: { type: "boolean", short: "h" },
      local: { type: "boolean", default: false },
      "persist-to": { type: "string" },
      remote: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant migrate [--local | --remote] [--config <file>] [--env <name>] [--database <binding>]",
    );
    console.log("");
    console.log("Apply schema migrations and data backfills.");
    console.log("");
    console.log("Options:");
    console.log("  --local            Force local D1 instead of DATABASE_URL");
    console.log("  --remote           Run against remote D1");
    console.log(
      "  --config           Wrangler config file (default: wrangler.toml)",
    );
    console.log("  --env              Wrangler environment name");
    console.log("  --database         D1 binding name (default: DB)");
    console.log("  --persist-to       Local D1 state directory override");
    console.log("");
    console.log(
      "If DATABASE_URL or JANT_DATA_DIR is set and no runtime flag is passed, this command uses Node SQLite.",
    );
    process.exit(0);
  }

  const runtime = resolveCliRuntime(values);
  if (runtime === "node") {
    const { migrate } = await loadNodeRuntime();
    migrate();

    const { sqlite } = openNodeSqlite(process.env);
    try {
      applyNodeBackfills(sqlite);
    } finally {
      sqlite.close();
    }
  } else {
    const options = {
      configPath: values.config,
      database: values.database,
      env: values.env,
      persistTo: values["persist-to"],
    };
    applyD1SchemaMigrations(runtime, options);
    applyD1Backfills(runtime, options);
  }

  console.log(`Database is up to date (${getCliRuntimeLabel(runtime)}).`);
}
