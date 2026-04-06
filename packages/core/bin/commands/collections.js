import { parseArgs } from "node:util";
import {
  getOptionalApiToken,
  printJson,
  readJsonInput,
  requestJson,
  requireApiToken,
  requireSiteUrl,
  runCommand,
  sharedApiOptions,
} from "../lib/http-api.js";

function showHelp() {
  console.log("Usage: jant collections <subcommand> [options]");
  console.log("");
  console.log("Subcommands:");
  console.log("  list                         List collections");
  console.log("  get <id>                     Get one collection");
  console.log("  create                       Create a collection from JSON");
  console.log("  update <id>                  Update a collection from JSON");
  console.log("  delete <id>                  Delete a collection");
  console.log("  add-post <collection> <post> Add a post to a collection");
  console.log(
    "  remove-post <collection> <post> Remove a post from a collection",
  );
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
      case "create":
        await runCreate(rest);
        return;
      case "update":
        await runUpdate(rest);
        return;
      case "delete":
        await runDelete(rest);
        return;
      case "add-post":
        await runAddPost(rest);
        return;
      case "remove-post":
        await runRemovePost(rest);
        return;
      default:
        throw new Error(`Unknown collections subcommand: ${subcommand}`);
    }
  });
}

async function runList(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      ...sharedApiOptions,
      view: { type: "string" },
    },
  });

  if (values.help) {
    console.log("Usage: jant collections list [--view compose] [options]");
    return;
  }

  const siteUrl = requireSiteUrl(values, "Listing collections");
  const result = await requestJson({
    siteUrl,
    path: "/api/collections",
    token: getOptionalApiToken(values),
    query: { view: values.view },
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
    console.log("Usage: jant collections get <id> [options]");
    return;
  }

  const collectionId = positionals[0];
  if (!collectionId) {
    throw new Error("Collection ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Getting a collection");
  const result = await requestJson({
    siteUrl,
    path: `/api/collections/${collectionId}`,
    token: getOptionalApiToken(values),
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
    console.log(
      "Usage: jant collections create (--json '{...}' | --input <path>)",
    );
    return;
  }

  const siteUrl = requireSiteUrl(values, "Creating a collection");
  const token = requireApiToken(values, "Creating a collection");
  const body = await readJsonInput(values);
  const result = await requestJson({
    siteUrl,
    path: "/api/collections",
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
      "Usage: jant collections update <id> (--json '{...}' | --input <path>)",
    );
    return;
  }

  const collectionId = positionals[0];
  if (!collectionId) {
    throw new Error("Collection ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Updating a collection");
  const token = requireApiToken(values, "Updating a collection");
  const body = await readJsonInput(values);
  const result = await requestJson({
    siteUrl,
    path: `/api/collections/${collectionId}`,
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
    console.log("Usage: jant collections delete <id> [options]");
    return;
  }

  const collectionId = positionals[0];
  if (!collectionId) {
    throw new Error("Collection ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Deleting a collection");
  const token = requireApiToken(values, "Deleting a collection");
  const result = await requestJson({
    siteUrl,
    path: `/api/collections/${collectionId}`,
    method: "DELETE",
    token,
  });
  printJson(result);
}

async function runAddPost(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: sharedApiOptions,
  });

  if (values.help) {
    console.log("Usage: jant collections add-post <collectionId> <postId>");
    return;
  }

  const collectionId = positionals[0];
  const postId = positionals[1];
  if (!collectionId || !postId) {
    throw new Error("Collection ID and post ID are required.");
  }

  const siteUrl = requireSiteUrl(values, "Adding a post to a collection");
  const token = requireApiToken(values, "Adding a post to a collection");
  const result = await requestJson({
    siteUrl,
    path: `/api/collections/${collectionId}/posts`,
    method: "POST",
    token,
    body: { postId },
  });
  printJson(result);
}

async function runRemovePost(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: sharedApiOptions,
  });

  if (values.help) {
    console.log("Usage: jant collections remove-post <collectionId> <postId>");
    return;
  }

  const collectionId = positionals[0];
  const postId = positionals[1];
  if (!collectionId || !postId) {
    throw new Error("Collection ID and post ID are required.");
  }

  const siteUrl = requireSiteUrl(values, "Removing a post from a collection");
  const token = requireApiToken(values, "Removing a post from a collection");
  const result = await requestJson({
    siteUrl,
    path: `/api/collections/${collectionId}/posts/${postId}`,
    method: "DELETE",
    token,
  });
  printJson(result);
}
