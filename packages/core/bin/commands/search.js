import { parseArgs } from "node:util";
import {
  getOptionalApiToken,
  printJson,
  requestJson,
  requireSiteUrl,
  runCommand,
  sharedApiOptions,
} from "../lib/http-api.js";

function showHelp() {
  console.log("Usage: jant search [--query <text>] [options]");
  console.log("");
  console.log("Options:");
  console.log("  --query            Search query");
  console.log("  --limit            Max results to return (1-50)");
}

export async function run(argv) {
  return runCommand(async () => {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        ...sharedApiOptions,
        limit: { type: "string" },
        query: { type: "string" },
      },
    });

    if (values.help) {
      showHelp();
      return;
    }

    const query = values.query?.trim() || positionals.join(" ").trim();
    if (!query) {
      throw new Error("Search query is required.");
    }

    const siteUrl = requireSiteUrl(values, "Searching posts");
    const result = await requestJson({
      siteUrl,
      path: "/api/search",
      token: getOptionalApiToken(values),
      query: {
        limit: values.limit,
        q: query,
      },
    });
    printJson(result);
  });
}
