import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  applyD1Backfills,
  applyD1SchemaMigrations,
  applyNodeBackfills,
} from "../lib/migration-runner.js";
import { loadNodeRuntime } from "../lib/load-node-runtime.js";
import { openNodeSqlite, resolveDatabaseDialect } from "../lib/node-sqlite.js";
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
      node: { type: "boolean", default: false },
      "persist-to": { type: "string" },
      remote: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant migrate [--local | --remote | --node] [--config <file>] [--env <name>] [--database <binding>]",
    );
    console.log("");
    console.log("Apply schema migrations and data backfills.");
    console.log("");
    console.log("Options:");
    console.log("  --local            Force local D1 instead of DATABASE_URL");
    console.log("  --remote           Run against remote D1");
    console.log(
      "  --node             Force Node runtime (loads .env.node for DATABASE_URL)",
    );
    console.log(
      "  --config           Wrangler config file (default: wrangler.toml)",
    );
    console.log("  --env              Wrangler environment name");
    console.log("  --database         D1 binding name (default: DB)");
    console.log("  --persist-to       Local D1 state directory override");
    console.log("");
    console.log(
      "If DATABASE_URL or DATA_DIR is set and no runtime flag is passed, this command uses the Node database runtime.",
    );
    process.exit(0);
  }

  // --node: load .env.node and force node runtime
  if (values.node) {
    const __dir = dirname(fileURLToPath(import.meta.url));
    const envPath = resolve(__dir, "../../.env.node");
    try {
      const content = readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!(key in process.env)) process.env[key] = value;
      }
    } catch {
      // .env.node not found
    }
  }

  const runtime = resolveCliRuntime(values);
  if (runtime === "node") {
    const { migrate } = await loadNodeRuntime();
    await migrate();

    if (
      !process.env.DATABASE_URL ||
      resolveDatabaseDialect(process.env.DATABASE_URL) === "sqlite"
    ) {
      const { sqlite } = openNodeSqlite(process.env);
      try {
        applyNodeBackfills(sqlite);
      } finally {
        sqlite.close();
      }
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
