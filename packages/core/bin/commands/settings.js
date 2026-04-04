import { parseArgs } from "node:util";
import {
  printJson,
  readJsonInput,
  requestJson,
  requireApiToken,
  requireSiteUrl,
  runCommand,
  sharedApiOptions,
} from "../lib/http-api.js";

function showHelp() {
  console.log("Usage: jant settings <subcommand> [options]");
  console.log("");
  console.log("Subcommands:");
  console.log("  get                Get editable site settings");
  console.log("  update             Update editable site settings from JSON");
}

export async function run(argv) {
  return runCommand(async () => {
    const [subcommand, ...rest] = argv;

    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      showHelp();
      return;
    }

    switch (subcommand) {
      case "get":
        await runGet(rest);
        return;
      case "update":
        await runUpdate(rest);
        return;
      default:
        throw new Error(`Unknown settings subcommand: ${subcommand}`);
    }
  });
}

async function runGet(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: sharedApiOptions,
  });

  if (values.help) {
    console.log("Usage: jant settings get [options]");
    return;
  }

  const siteUrl = requireSiteUrl(values, "Getting settings");
  const token = requireApiToken(values, "Getting settings");
  const result = await requestJson({
    siteUrl,
    path: "/api/settings",
    token,
  });
  printJson(result);
}

async function runUpdate(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      ...sharedApiOptions,
      input: { type: "string" },
      json: { type: "string" },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant settings update (--json '{...}' | --input <path>)",
    );
    return;
  }

  const siteUrl = requireSiteUrl(values, "Updating settings");
  const token = requireApiToken(values, "Updating settings");
  const body = await readJsonInput(values);
  const result = await requestJson({
    siteUrl,
    path: "/api/settings",
    method: "PUT",
    token,
    body,
  });
  printJson(result);
}
