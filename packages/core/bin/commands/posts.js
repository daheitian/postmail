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
  console.log("Usage: jant posts <subcommand> [options]");
  console.log("");
  console.log("Subcommands:");
  console.log("  list                List posts");
  console.log("  get <id>            Get one post");
  console.log("  content <id>        Get one post body as markdown");
  console.log("  create              Create a post from JSON");
  console.log("  update <id>         Update a post from JSON");
  console.log("  delete <id>         Delete a post");
  console.log("");
  console.log("Create and update accept either:");
  console.log("  --json '{...}'      Inline JSON body");
  console.log("  --input <path>      Path to a JSON file");
  console.log("  --input -           Read JSON from stdin");
  console.log("");
  console.log("Shared options:");
  console.log("  --url               Target site URL");
  console.log("  --token             API token");
  console.log(
    "  --config            Wrangler config file (default: wrangler.toml)",
  );
  console.log("  --env               Wrangler environment name");
  console.log("");
  console.log("Authentication:");
  console.log("  Posts commands require an API token.");
  console.log("  Use JANT_API_TOKEN or DEV_API_TOKEN for local development.");
}

export async function run(argv) {
  return runCommand(async () => {
    const [subcommand, ...rest] = argv;

    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      showHelp();
      return;
    }

    switch (subcommand) {
      case "list":
        await runList(rest);
        return;
      case "get":
        await runGet(rest);
        return;
      case "content":
        await runContent(rest);
        return;
      case "create":
        await runCreate(rest);
        return;
      case "update":
        await runUpdate(rest);
        return;
      case "delete":
        await runDelete(rest);
        return;
      default:
        throw new Error(`Unknown posts subcommand: ${subcommand}`);
    }
  });
}

async function runList(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      ...sharedApiOptions,
      cursor: { type: "string" },
      format: { type: "string" },
      limit: { type: "string" },
      status: { type: "string" },
    },
  });

  if (values.help) {
    console.log("Usage: jant posts list [options]");
    console.log("");
    console.log("Options:");
    console.log("  --format            note | link | quote");
    console.log("  --status            draft | published");
    console.log("  --limit             Max posts to return (1-100)");
    console.log("  --cursor            Cursor from nextCursor");
    return;
  }

  const siteUrl = requireSiteUrl(values, "Listing posts");
  const token = requireApiToken(values, "Listing posts");

  const result = await requestJson({
    siteUrl,
    path: "/api/posts",
    token,
    query: {
      cursor: values.cursor,
      format: values.format,
      limit: values.limit,
      status: values.status,
    },
  });

  printJson(result);
}

async function runGet(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: sharedApiOptions,
  });

  if (values.help) {
    console.log("Usage: jant posts get <id> [options]");
    return;
  }

  const postId = positionals[0];
  if (!postId) {
    throw new Error("Post ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Getting a post");
  const token = requireApiToken(values, "Getting a post");
  const result = await requestJson({
    siteUrl,
    path: `/api/posts/${postId}`,
    token,
  });
  printJson(result);
}

async function runContent(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: sharedApiOptions,
  });

  if (values.help) {
    console.log("Usage: jant posts content <id> [options]");
    return;
  }

  const postId = positionals[0];
  if (!postId) {
    throw new Error("Post ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Getting post content");
  const token = requireApiToken(values, "Getting post content");
  const result = await requestJson({
    siteUrl,
    path: `/api/posts/${postId}/content`,
    token,
  });
  printJson(result);
}

async function runCreate(argv) {
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
    console.log("Usage: jant posts create (--json '{...}' | --input <path>)");
    return;
  }

  const siteUrl = requireSiteUrl(values, "Creating a post");
  const token = requireApiToken(values, "Creating a post");
  const body = await readJsonInput(values);
  const result = await requestJson({
    siteUrl,
    path: "/api/posts",
    method: "POST",
    token,
    body,
  });
  printJson(result);
}

async function runUpdate(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ...sharedApiOptions,
      input: { type: "string" },
      json: { type: "string" },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant posts update <id> (--json '{...}' | --input <path>)",
    );
    return;
  }

  const postId = positionals[0];
  if (!postId) {
    throw new Error("Post ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Updating a post");
  const token = requireApiToken(values, "Updating a post");
  const body = await readJsonInput(values);
  const result = await requestJson({
    siteUrl,
    path: `/api/posts/${postId}`,
    method: "PUT",
    token,
    body,
  });
  printJson(result);
}

async function runDelete(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: sharedApiOptions,
  });

  if (values.help) {
    console.log("Usage: jant posts delete <id> [options]");
    return;
  }

  const postId = positionals[0];
  if (!postId) {
    throw new Error("Post ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Deleting a post");
  const token = requireApiToken(values, "Deleting a post");
  const result = await requestJson({
    siteUrl,
    path: `/api/posts/${postId}`,
    method: "DELETE",
    token,
  });
  printJson(result);
}
