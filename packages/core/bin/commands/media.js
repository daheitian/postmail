import { parseArgs } from "node:util";
import {
  printJson,
  requestJson,
  requireApiToken,
  requireSiteUrl,
  runCommand,
  sharedApiOptions,
} from "../lib/http-api.js";
import { uploadMediaFile } from "../lib/media-upload.js";

function parseOptionalNonNegativeInteger(value, label) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function parseOptionalPositiveInteger(value, label) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function showHelp() {
  console.log("Usage: jant media <subcommand> [options]");
  console.log("");
  console.log("Subcommands:");
  console.log("  list                     List uploaded media");
  console.log("  get <id>                 Get one media item");
  console.log("  upload <file>            Upload one file");
  console.log("  content <id>             Get text attachment markdown");
  console.log("  set-alt <id> --alt <t>   Update alt text");
  console.log("  delete <id>              Delete a media item");
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
      case "upload":
        await runUpload(rest);
        return;
      case "content":
        await runContent(rest);
        return;
      case "set-alt":
        await runSetAlt(rest);
        return;
      case "delete":
        await runDelete(rest);
        return;
      default:
        throw new Error(`Unknown media subcommand: ${subcommand}`);
    }
  });
}

async function runList(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      ...sharedApiOptions,
      limit: { type: "string" },
      mimePrefix: { type: "string" },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant media list [--limit 50] [--mimePrefix image/] [options]",
    );
    return;
  }

  const siteUrl = requireSiteUrl(values, "Listing media");
  const token = requireApiToken(values, "Listing media");
  const result = await requestJson({
    siteUrl,
    path: "/api/upload",
    token,
    query: {
      limit: values.limit,
      mimePrefix: values.mimePrefix,
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
    console.log("Usage: jant media get <id> [options]");
    return;
  }

  const mediaId = positionals[0];
  if (!mediaId) {
    throw new Error("Media ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Getting media");
  const token = requireApiToken(values, "Getting media");
  const result = await requestJson({
    siteUrl,
    path: `/api/upload/${mediaId}`,
    token,
  });

  printJson(result);
}

async function runUpload(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ...sharedApiOptions,
      alt: { type: "string" },
      blurhash: { type: "string" },
      chars: { type: "string" },
      contentType: { type: "string" },
      durationSeconds: { type: "string" },
      height: { type: "string" },
      poster: { type: "string" },
      summary: { type: "string" },
      waveform: { type: "string" },
      width: { type: "string" },
    },
  });

  if (values.help) {
    console.log("Usage: jant media upload <file> [options]");
    console.log("");
    console.log("Options:");
    console.log("  --contentType       Override inferred MIME type");
    console.log("  --alt               Alt text");
    console.log("  --summary           Text summary");
    console.log("  --width             Pixel width");
    console.log("  --height            Pixel height");
    console.log("  --durationSeconds   Duration for audio or video");
    console.log("  --blurhash          Image blurhash");
    console.log("  --waveform          Audio waveform string");
    console.log("  --poster            Poster image path for video uploads");
    return;
  }

  const filePath = positionals[0];
  if (!filePath) {
    throw new Error("File path is required.");
  }

  const siteUrl = requireSiteUrl(values, "Uploading media");
  const token = requireApiToken(values, "Uploading media");
  const result = await uploadMediaFile({
    alt: values.alt?.trim() || undefined,
    blurhash: values.blurhash?.trim() || undefined,
    chars: parseOptionalNonNegativeInteger(values.chars, "chars"),
    contentType: values.contentType,
    durationSeconds: parseOptionalPositiveInteger(
      values.durationSeconds,
      "durationSeconds",
    ),
    filePath,
    height: parseOptionalPositiveInteger(values.height, "height"),
    posterPath: values.poster,
    siteUrl,
    summary: values.summary?.trim() || undefined,
    token,
    waveform: values.waveform?.trim() || undefined,
    width: parseOptionalPositiveInteger(values.width, "width"),
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
    console.log("Usage: jant media content <id> [options]");
    return;
  }

  const mediaId = positionals[0];
  if (!mediaId) {
    throw new Error("Media ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Getting attachment content");
  const token = requireApiToken(values, "Getting attachment content");
  const result = await requestJson({
    siteUrl,
    path: `/api/attachments/${mediaId}/content`,
    token,
  });

  printJson(result);
}

async function runSetAlt(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ...sharedApiOptions,
      alt: { type: "string" },
    },
  });

  if (values.help) {
    console.log("Usage: jant media set-alt <id> --alt <text> [options]");
    return;
  }

  const mediaId = positionals[0];
  if (!mediaId) {
    throw new Error("Media ID is required.");
  }
  if (values.alt === undefined) {
    throw new Error("--alt is required.");
  }

  const siteUrl = requireSiteUrl(values, "Updating media alt text");
  const token = requireApiToken(values, "Updating media alt text");
  const result = await requestJson({
    siteUrl,
    path: `/api/upload/${mediaId}`,
    method: "PATCH",
    token,
    body: {
      alt: values.alt,
    },
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
    console.log("Usage: jant media delete <id> [options]");
    return;
  }

  const mediaId = positionals[0];
  if (!mediaId) {
    throw new Error("Media ID is required.");
  }

  const siteUrl = requireSiteUrl(values, "Deleting media");
  const token = requireApiToken(values, "Deleting media");
  const result = await requestJson({
    siteUrl,
    path: `/api/upload/${mediaId}`,
    method: "DELETE",
    token,
  });

  printJson(result);
}
