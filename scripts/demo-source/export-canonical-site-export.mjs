import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  mkdtempSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";
import { resolveDemoSourceSiteUrl } from "./lib/runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const demoSourceDir = resolve(repoRoot, "sites/demo-source");
const canonicalDir = resolve(demoSourceDir, "canonical");
const snapshotDir = resolve(canonicalDir, "snapshot");
const outputDir = resolve(canonicalDir, "site-export");
const runJantScript = resolve(__dirname, "../run-jant.mjs");
const checkOnly = process.argv.includes("--check");

loadDemoWorkflowEnv({ sites: ["demo-source"] });

const siteUrl = resolveDemoSourceSiteUrl();
const siteBaseUrl = new URL(siteUrl);
const sitePathPrefix =
  siteBaseUrl.pathname && siteBaseUrl.pathname !== "/"
    ? siteBaseUrl.pathname.replace(/\/+$/, "")
    : "";

function assertCanonicalSnapshot() {
  const metaPath = resolve(snapshotDir, "meta.json");
  const manifestPath = resolve(snapshotDir, "storage-manifest.json");
  const dbSqlPath = resolve(snapshotDir, "db.sql");

  if (
    !existsSync(metaPath) ||
    !existsSync(manifestPath) ||
    !existsSync(dbSqlPath)
  ) {
    throw new Error(
      [
        "Missing canonical demo snapshot at sites/demo-source/canonical/snapshot.",
        "Run `mise run demo-source-export-canonical` first.",
      ].join("\n"),
    );
  }

  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (!meta?.site?.id || !meta?.site?.key) {
    throw new Error("Canonical snapshot meta.json is missing site id/key.");
  }

  return meta;
}

function createTempEnv(tempRootDir, siteMeta) {
  const dataDir = resolve(tempRootDir, "data");

  return {
    ...process.env,
    AUTH_SECRET:
      process.env.AUTH_SECRET ||
      "demo-source-canonical-site-export-local-auth-secret-2026-04-02",
    DATABASE_URL: pathToFileURL(resolve(dataDir, "jant.sqlite")).href,
    DATA_DIR: dataDir,
    LOCAL_STORAGE_PATH: resolve(dataDir, "media"),
    SITE_ORIGIN: siteBaseUrl.origin,
    SITE_PATH_PREFIX: sitePathPrefix,
    SITE_RESOLUTION_MODE: "single-site",
    STORAGE_DRIVER: "local",
    TEMP_CANONICAL_SITE_ID: siteMeta.site.id,
    TEMP_CANONICAL_SITE_KEY: siteMeta.site.key,
  };
}

function seedTempSite(databasePath, siteMeta, env) {
  const seedScript = `
    const Database = require("better-sqlite3");
    const [databasePath, siteId, siteKey] = process.argv.slice(1);
    const timestamp = Math.floor(Date.now() / 1000);
    const sqlite = new Database(databasePath);
    sqlite.exec(\`
      INSERT INTO "site" ("id", "key", "status", "created_at", "updated_at")
      VALUES (
        '\${siteId.replaceAll("'", "''")}',
        '\${siteKey.replaceAll("'", "''")}',
        'active',
        \${timestamp},
        \${timestamp}
      );
    \`);
    sqlite.close();
  `;

  execFileSync(
    "pnpm",
    [
      "--filter",
      "@jant/core",
      "exec",
      "node",
      "-e",
      seedScript,
      databasePath,
      siteMeta.site.id,
      siteMeta.site.key,
    ],
    {
      cwd: repoRoot,
      env,
      stdio: "inherit",
    },
  );
}

if (checkOnly) {
  const meta = assertCanonicalSnapshot();
  console.log("demo-source site-export prerequisites look good.");
  console.log(`  Snapshot dir:  ${snapshotDir}`);
  console.log(`  Source URL:    ${siteUrl}`);
  console.log(`  Output dir:    ${outputDir}`);
  console.log(`  Site id:       ${meta.site.id}`);
  process.exit(0);
}

mkdirSync(canonicalDir, { recursive: true });
const meta = assertCanonicalSnapshot();
const tempRootDir = mkdtempSync(join(canonicalDir, ".site-export-build-"));
const tempOutputDir = resolve(tempRootDir, "site-export");
const tempEnv = createTempEnv(tempRootDir, meta);

console.log(
  "Deriving canonical demo site-export from the canonical snapshot...",
);

try {
  console.log("Building @jant/core for local export...");
  execFileSync("pnpm", ["--filter", "@jant/core", "build"], {
    cwd: repoRoot,
    env: tempEnv,
    stdio: "inherit",
  });

  console.log("Running local migrations in a temporary Node runtime...");
  execFileSync(process.execPath, [runJantScript, "migrate"], {
    cwd: demoSourceDir,
    env: tempEnv,
    stdio: "inherit",
  });

  seedTempSite(resolve(tempRootDir, "data", "jant.sqlite"), meta, tempEnv);

  console.log(
    "Importing the canonical snapshot into the temporary Node runtime...",
  );
  execFileSync(
    process.execPath,
    [
      runJantScript,
      "site",
      "snapshot",
      "import",
      "--path",
      snapshotDir,
      "--replace",
    ],
    {
      cwd: demoSourceDir,
      env: tempEnv,
      stdio: "inherit",
    },
  );

  execFileSync(
    process.execPath,
    [runJantScript, "site", "export", "--directory", tempOutputDir],
    {
      cwd: demoSourceDir,
      env: tempEnv,
      stdio: "inherit",
    },
  );

  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }

  renameSync(tempOutputDir, outputDir);
  console.log(`Canonical demo site-export updated at ${outputDir}`);
} catch (error) {
  rmSync(tempRootDir, { recursive: true, force: true });
  throw error;
}

rmSync(tempRootDir, { recursive: true, force: true });
