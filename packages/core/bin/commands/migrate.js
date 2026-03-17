import { parseArgs } from "node:util";
import { loadNodeRuntime } from "../lib/load-node-runtime.js";

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log("Usage: jant migrate");
    console.log("");
    console.log("Apply SQLite migrations using DATABASE_URL.");
    console.log("");
    console.log("Defaults:");
    console.log("  JANT_DATA_DIR=./data");
    console.log("  DATABASE_URL=file:<data-dir>/jant.sqlite");
    process.exit(0);
  }

  const { migrate } = await loadNodeRuntime();
  migrate();
  console.log("Migrations applied.");
}
