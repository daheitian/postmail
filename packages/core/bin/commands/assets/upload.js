/**
 * jant assets upload
 *
 * Upload built static assets to S3-compatible object storage.
 *
 * Uses the same S3_* environment variables as media storage. Files with
 * content-hashed names (JS, fonts) are skipped if already present in the
 * bucket — they are immutable. Non-hashed files (e.g. CSS in older builds)
 * are always uploaded.
 *
 * Intended CI order: build → upload-assets → deploy container
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { createReadStream } from "node:fs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONTENT_TYPES = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".map": "application/json",
};

function getContentType(filePath) {
  return (
    CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream"
  );
}

/**
 * Resolve the default source directory: packages/core/dist/client/_assets
 * relative to this file's location in packages/core/bin/commands/assets/.
 */
function resolveDefaultSourceDir() {
  return resolve(__dirname, "../../../dist/client/_assets");
}

async function walkDir(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function loadS3(config) {
  const { S3Client, PutObjectCommand, ListObjectsV2Command } =
    await import("@aws-sdk/client-s3");
  const forcePathStyle = !config.endpoint.includes("amazonaws.com");
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle,
  });
  return {
    client,
    PutObjectCommand,
    ListObjectsV2Command,
    bucket: config.bucket,
  };
}

async function listExistingKeys(s3, prefix) {
  const { client, ListObjectsV2Command, bucket } = s3;
  const keys = new Set();
  let continuationToken;

  for (;;) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix ? `${prefix}/` : undefined,
      MaxKeys: 500,
      ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
    });
    const response = await client.send(command);
    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.add(obj.Key);
    }
    if (!response.IsTruncated) break;
    continuationToken = response.NextContinuationToken;
  }

  return keys;
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      prefix: { type: "string", default: "_assets" },
      "source-dir": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log("Usage: jant assets upload [options]");
    console.log("");
    console.log("Upload built static assets to S3-compatible storage.");
    console.log("Reads S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID,");
    console.log("S3_SECRET_ACCESS_KEY, S3_REGION from environment.");
    console.log("");
    console.log("Options:");
    console.log(
      "      --prefix <prefix>     Key prefix in the bucket (default: _assets)",
    );
    console.log(
      "      --source-dir <path>   Source directory (default: packages/core/dist/client/_assets)",
    );
    console.log(
      "      --dry-run             Print what would be uploaded without uploading",
    );
    process.exit(0);
  }

  // Validate required env vars
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION ?? "auto";

  const missing = [
    !endpoint && "S3_ENDPOINT",
    !bucket && "S3_BUCKET",
    !accessKeyId && "S3_ACCESS_KEY_ID",
    !secretAccessKey && "S3_SECRET_ACCESS_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    if (process.env.ASSET_BASE_URL) {
      console.error(
        `ASSET_BASE_URL is set but S3 is not fully configured. Missing: ${missing.join(", ")}.`,
      );
      console.error(
        "Assets must be uploaded before the app can serve them from the CDN.",
      );
      process.exit(1);
    }
    console.log(
      `S3 not configured (${missing.join(", ")} not set), skipping asset upload.`,
    );
    process.exit(0);
  }

  const sourceDir = values["source-dir"] ?? resolveDefaultSourceDir();
  const prefix = values.prefix.replace(/^\/+|\/+$/g, "");
  const dryRun = values["dry-run"];

  // Verify source directory exists
  try {
    await stat(sourceDir);
  } catch {
    console.error(`Source directory not found: ${sourceDir}`);
    console.error("Run 'mise run build' first.");
    process.exit(1);
  }

  console.log(`Source:  ${sourceDir}`);
  console.log(`Bucket:  ${bucket}`);
  console.log(`Prefix:  ${prefix}`);
  if (dryRun) console.log("Dry run: no files will be uploaded");
  console.log("");

  const s3 = await loadS3({
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
  });

  // List existing keys upfront (one API call instead of per-file HEAD)
  process.stdout.write("Listing existing keys... ");
  const existingKeys = await listExistingKeys(s3, prefix);
  console.log(`${existingKeys.size} found`);

  const files = await walkDir(sourceDir);
  let uploaded = 0;
  let skipped = 0;

  const toUpload = [];
  for (const filePath of files) {
    const relPath = relative(sourceDir, filePath).replace(/\\/g, "/");
    const key = prefix ? `${prefix}/${relPath}` : relPath;
    if (existingKeys.has(key)) {
      skipped++;
    } else {
      toUpload.push({ filePath, key });
    }
  }

  if (dryRun) {
    for (const { key } of toUpload) {
      console.log(`  [dry-run] upload ${key}`);
    }
    uploaded = toUpload.length;
  } else {
    const CONCURRENCY = 20;
    for (let i = 0; i < toUpload.length; i += CONCURRENCY) {
      const batch = toUpload.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async ({ filePath, key }) => {
          const body = await readFile(filePath);
          const command = new s3.PutObjectCommand({
            Bucket: s3.bucket,
            Key: key,
            Body: body,
            ContentType: getContentType(filePath),
            CacheControl: "public, max-age=31536000, immutable",
          });
          await s3.client.send(command);
          process.stdout.write(`  uploaded ${key}\n`);
          uploaded++;
        }),
      );
    }
  }

  console.log("");
  console.log(`Done. ${uploaded} uploaded, ${skipped} skipped.`);
}
