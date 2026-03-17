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
    console.log("  JANT_AUTH_SECRET=your-secret");
    console.log("");
    console.log("Defaults:");
    console.log("  JANT_DATA_DIR=./data");
    console.log("  DATABASE_URL=file:<data-dir>/jant.sqlite");
    console.log("  JANT_LOCAL_STORAGE_PATH=<data-dir>/media");
    process.exit(0);
  }

  const { start } = await loadNodeRuntime();
  const handle = await start();
  console.log(`Jant listening on ${handle.url}`);
}
