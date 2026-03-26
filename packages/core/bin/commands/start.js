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
    console.log("Usage: jant start");
    console.log("");
    console.log("Start the Node.js server using environment variables.");
    console.log("");
    console.log("Required:");
    console.log("  AUTH_SECRET=your-secret");
    console.log("  SITE_ORIGIN=https://your-site.example");
    console.log("");
    console.log("Database:");
    console.log("  DATABASE_URL=file:<data-dir>/jant.sqlite");
    console.log("  DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME");
    console.log("");
    console.log("Node defaults:");
    console.log("  DATA_DIR=./data");
    console.log("  LOCAL_STORAGE_PATH=<data-dir>/media");
    console.log("  SITE_PATH_PREFIX=");
    console.log("  SITE_RESOLUTION_MODE=single-site");
    console.log("  STORAGE_DRIVER defaults to local on Node");
    process.exit(0);
  }

  const { start } = await loadNodeRuntime();
  const handle = await start();
  console.log(`Jant listening on ${handle.url}`);
}
