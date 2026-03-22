import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { unzipSync } from "fflate";
import { executeD1, queryD1 } from "../../../lib/d1-query.js";
import { loadNodeRuntime } from "../../../lib/load-node-runtime.js";
import { openNodeDatabase } from "../../../lib/node-database.js";
import {
  deleteR2Object,
  uploadR2Object,
} from "../../../lib/r2-query.js";
import {
  assertSnapshotManifest,
  assertSnapshotMeta,
  buildReplaceSql,
  buildSnapshotStorageQuery,
  collectSnapshotObjects,
  getSnapshotBootstrapSite,
  normalizeD1Sql,
  remapSnapshotManifestObjects,
  rewriteLegacySnapshotSql,
  rewriteSnapshotSiteIdentifiers,
  sha256File,
  validateSnapshotTargetSite,
} from "../../../lib/site-snapshot.js";
import {
  getCliSiteResolutionMode,
  resolveCliSite,
} from "../../../lib/site-selection.js";
import { resolveCliRuntime } from "../../../lib/runtime-target.js";

function isZipPath(filePath) {
  return filePath.toLowerCase().endsWith(".zip");
}

function createWranglerOptions(values) {
  return {
    bucket: values.bucket,
    bucketBinding: values["bucket-binding"],
    configPath: values.config,
    database: values.database,
    env: values.env,
    persistTo: values["persist-to"],
  };
}

async function createNodeImportContext() {
  const nodeDatabase = await openNodeDatabase(process.env);
  const { createNodeCliRuntime } = await loadNodeRuntime();
  const runtime = await createNodeCliRuntime(nodeDatabase.bindings);

  return {
    async close() {
      await nodeDatabase.close();
    },
    async query(sql) {
      return nodeDatabase.query(sql);
    },
    async execute(sql) {
      await nodeDatabase.execute(sql);
    },
    async uploadObject(key, filePath, contentType) {
      if (!runtime.storage) {
        throw new Error("Snapshot import requires configured storage.");
      }

      const bytes = new Uint8Array(await readFile(filePath));
      await runtime.storage.put(key, bytes, {
        contentType: contentType || undefined,
      });
    },
    async deleteObject(key) {
      if (!runtime.storage) {
        return;
      }
      await runtime.storage.delete(key);
    },
  };
}

function createD1ImportContext(runtime, values) {
  const wranglerOptions = createWranglerOptions(values);

  return {
    async close() {},
    async query(sql) {
      return queryD1(sql, runtime, wranglerOptions);
    },
    async execute(sql) {
      const d1Sql = normalizeD1Sql(sql);
      if (!d1Sql) {
        return;
      }
      executeD1(d1Sql, runtime, {
        ...wranglerOptions,
        quiet: true,
      });
    },
    async uploadObject(key, filePath, contentType) {
      uploadR2Object(key, filePath, runtime, {
        ...wranglerOptions,
        contentType: contentType || undefined,
      });
    },
    async deleteObject(key) {
      deleteR2Object(key, runtime, wranglerOptions);
    },
  };
}

async function materializeSnapshotInput(inputPath) {
  if (!existsSync(inputPath)) {
    throw new Error(`Snapshot path not found: ${inputPath}`);
  }

  if (!isZipPath(inputPath)) {
    const fileStat = await stat(inputPath);
    if (!fileStat.isDirectory()) {
      throw new Error(`Snapshot path must be a directory or .zip: ${inputPath}`);
    }
    return {
      cleanup: async () => {},
      rootDir: inputPath,
    };
  }

  const outputDir = await mkdtemp(join(tmpdir(), "jant-site-snapshot-import-"));
  const bytes = new Uint8Array(await readFile(inputPath));
  const files = unzipSync(bytes);

  for (const [relativePath, data] of Object.entries(files)) {
    const absolutePath = join(outputDir, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, data);
  }

  return {
    cleanup: async () => {
      await rm(outputDir, { recursive: true, force: true });
    },
    rootDir: outputDir,
  };
}

async function readSnapshotJson(rootDir, filename) {
  const absolutePath = join(rootDir, filename);
  return JSON.parse(await readFile(absolutePath, "utf-8"));
}

async function validateManifestObjects(rootDir, manifest) {
  for (const object of manifest.objects) {
    const absolutePath = join(rootDir, object.file);
    const fileStat = await stat(absolutePath).catch(() => null);
    if (!fileStat?.isFile()) {
      throw new Error(`Snapshot object file is missing: ${object.file}`);
    }

    const actualHash = await sha256File(absolutePath);
    if (actualHash !== object.sha256) {
      throw new Error(
        `Snapshot object checksum mismatch for ${object.key}: expected ${object.sha256}, got ${actualHash}`,
      );
    }
  }
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      bucket: { type: "string" },
      "bucket-binding": { type: "string", default: "R2" },
      config: { type: "string" },
      database: { type: "string", default: "DB" },
      env: { type: "string" },
      host: { type: "string" },
      help: { type: "boolean", short: "h" },
      local: { type: "boolean", default: false },
      path: { type: "string", default: "." },
      "path-prefix": { type: "string" },
      "persist-to": { type: "string" },
      remote: { type: "boolean", default: false },
      replace: { type: "boolean", default: false },
      "remap-site": { type: "boolean", default: false },
      site: { type: "string" },
      url: { type: "string" },
    },
  });

  if (values.help) {
    console.log(
      "Usage: jant site snapshot import --path <dir|zip> --replace [--local | --remote]",
    );
    console.log("");
    console.log(
      "Import a Jant content snapshot and restore IDs, storage keys, and object files.",
    );
    console.log("");
    console.log("Options:");
    console.log(
      "  --path                  Snapshot directory or .zip file (default: .)",
    );
    console.log(
      "  --replace               Replace the current content scope before importing",
    );
    console.log("  --site                  Target site id");
    console.log("  --host                  Target site host");
    console.log("  --url                   Target site URL");
    console.log("  --path-prefix           Path prefix used with --host");
    console.log("  --local                 Force local D1 instead of DATABASE_URL");
    console.log("  --remote                Import into remote D1");
    console.log(
      "  --config                Wrangler config file (default: wrangler.toml)",
    );
    console.log("  --env                   Wrangler environment name");
    console.log("  --database              D1 binding name (default: DB)");
    console.log(
      "  --bucket                Override the R2 bucket name used for object import",
    );
    console.log(
      "  --bucket-binding        Wrangler R2 binding to resolve (default: R2)",
    );
    console.log("  --persist-to            Local D1/R2 state directory override");
    console.log(
      "  --remap-site            Rewrite snapshot site_id and storage keys to the resolved target site",
    );
    console.log("");
    console.log(
      "In single-site mode, snapshot imports automatically remap to the only initialized site.",
    );
    console.log("");
    console.log(
      "Snapshot import currently requires --replace. It preserves user/auth shell data outside the content scope.",
    );
    process.exit(0);
  }

  if (!values.replace) {
    throw new Error(
      "Snapshot import currently requires --replace to avoid partial merge semantics.",
    );
  }

  const runtime = resolveCliRuntime(values);
  const inputPath = resolve(process.cwd(), values.path);
  const materialized = await materializeSnapshotInput(inputPath);
  const context =
    runtime === "node"
      ? await createNodeImportContext()
      : createD1ImportContext(runtime, values);

  try {
    const meta = await readSnapshotJson(materialized.rootDir, "meta.json");
    const rawManifest = await readSnapshotJson(
      materialized.rootDir,
      "storage-manifest.json",
    );
    assertSnapshotMeta(meta);
    const explicitRemap = values["remap-site"] === true;
    const snapshotSite = getSnapshotBootstrapSite(meta);
    const originalManifest = rawManifest;
    assertSnapshotManifest(originalManifest);
    await validateManifestObjects(materialized.rootDir, originalManifest);
    const resolutionMode = getCliSiteResolutionMode(process.env);

    const { site: targetSite } = await resolveCliSite(context, {
      env: process.env,
      createIfMissing: false,
      host: values.host,
      pathPrefix: values["path-prefix"],
      site: values.site,
      url: values.url,
    });

    const autoRemapSingleSite =
      !explicitRemap &&
      resolutionMode === "single-site" &&
      !!snapshotSite &&
      snapshotSite.id !== targetSite.id;
    const shouldRemapSite = explicitRemap || autoRemapSingleSite;

    if (shouldRemapSite) {
      if (!snapshotSite) {
        throw new Error(
          "--remap-site requires a snapshot with embedded site metadata.",
        );
      }
    } else {
      validateSnapshotTargetSite(meta, targetSite);
    }

    if (autoRemapSingleSite) {
      console.log(
        `single-site mode detected. Remapping snapshot site ${snapshotSite.id} to ${targetSite.id}.`,
      );
    }

    const manifest = shouldRemapSite
      ? remapSnapshotManifestObjects(
          originalManifest,
          snapshotSite?.id ?? "",
          targetSite.id,
        )
      : originalManifest;

    const snapshotKeys = new Set(
      manifest.objects.map((object) => String(object.key)),
    );
    const currentObjectRows = await context.query(
      buildSnapshotStorageQuery(targetSite.id),
    );
    const currentKeys = new Set(
      collectSnapshotObjects(currentObjectRows).map((object) => object.key),
    );

    for (const object of manifest.objects) {
      await context.uploadObject(
        object.key,
        join(materialized.rootDir, object.file),
        typeof object.contentType === "string" ? object.contentType : "",
      );
    }

    const rawDbSql = await readFile(
      join(materialized.rootDir, "db.sql"),
      "utf-8",
    );
    const dbSql = snapshotSite
      ? shouldRemapSite
        ? rewriteSnapshotSiteIdentifiers(rawDbSql, snapshotSite.id, targetSite.id)
        : rawDbSql
      : rewriteLegacySnapshotSql(rawDbSql, targetSite.id);
    await context.execute(`${buildReplaceSql(targetSite.id)}\n${dbSql}`);

    const keysToDelete = [...currentKeys].filter((key) => !snapshotKeys.has(key));
    for (const key of keysToDelete) {
      await context.deleteObject(key);
    }

    console.log(`Imported snapshot from ${values.path}`);
  } finally {
    await context.close();
    await materialized.cleanup();
  }
}
