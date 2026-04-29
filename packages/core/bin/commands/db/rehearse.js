import { parseArgs } from "node:util";
import { rehearseD1Migrations } from "../../lib/migration-rehearsal.js";
import {
  bootstrapCliRuntime,
  getCliRuntimeLabel,
} from "../../lib/runtime-target.js";

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: "string" },
      database: { type: "string", default: "DB" },
      env: { type: "string" },
      fixture: { type: "string" },
      help: { type: "boolean", short: "h" },
      local: { type: "boolean", default: false },
      "persist-to": { type: "string" },
      remote: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant db rehearse --fixture <file> [--local | --remote] [--config <file>] [--env <name>] [--database <binding>]",
    );
    console.log("");
    console.log(
      "Reset a D1 database, apply a baseline schema, load a frozen SQL fixture, and then run current migrations/backfills.",
    );
    console.log("");
    console.log("Options:");
    console.log("  --fixture         Rehearsal fixture JSON file");
    console.log("  --local           Run against local D1 (default)");
    console.log("  --remote          Run against remote D1");
    console.log(
      "  --config          Wrangler config file (default: wrangler.toml)",
    );
    console.log("  --env             Wrangler environment name");
    console.log("  --database        D1 binding name (default: DB)");
    console.log("  --persist-to      Local D1 state directory override");
    process.exit(0);
  }

  if (!values.fixture) {
    throw new Error("Missing required --fixture option.");
  }

  const { runtime } = bootstrapCliRuntime(values);
  if (runtime === "node") {
    throw new Error(
      "Migration rehearsal only supports D1. Pass --local or --remote.",
    );
  }

  await rehearseD1Migrations(runtime, {
    configPath: values.config,
    database: values.database,
    env: values.env,
    fixturePath: values.fixture,
    persistTo: values["persist-to"],
  });

  console.log(`Migration rehearsal passed (${getCliRuntimeLabel(runtime)}).`);
}
