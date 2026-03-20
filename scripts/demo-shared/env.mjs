import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(__dirname, "../..");

const SITE_DIRS = Object.freeze({
  demo: resolve(REPO_ROOT, "sites/demo"),
  "demo-public": resolve(REPO_ROOT, "sites/demo"),
  "demo-source": resolve(REPO_ROOT, "sites/demo-source"),
});

function getSiteDirs(rootDir) {
  if (rootDir === REPO_ROOT) {
    return SITE_DIRS;
  }

  return {
    demo: resolve(rootDir, "sites/demo"),
    "demo-public": resolve(rootDir, "sites/demo"),
    "demo-source": resolve(rootDir, "sites/demo-source"),
  };
}

function resolveSiteDir(site, rootDir) {
  const siteDir = getSiteDirs(rootDir)[site];
  if (!siteDir) {
    throw new Error(
      `Unsupported demo env scope "${site}". Expected one of: ${Object.keys(
        getSiteDirs(rootDir),
      ).join(", ")}.`,
    );
  }

  return siteDir;
}

/**
 * Resolve the repo and site-specific .env files for demo operations.
 *
 * Precedence is highest-to-lowest because `process.loadEnvFile()` preserves
 * existing environment variables:
 * shell env > site .env.local > site .env > repo .env.repo.local >
 * repo .env.repo > legacy repo .env.local > legacy repo .env
 *
 * @param {{ sites?: string[]; rootDir?: string }} [options]
 * @returns {string[]}
 */
export function resolveDemoEnvFiles(options = {}) {
  const rootDir = options.rootDir ? resolve(options.rootDir) : REPO_ROOT;
  const files = [];

  for (const site of options.sites ?? []) {
    const siteDir = resolveSiteDir(site, rootDir);
    files.push(resolve(siteDir, ".env.local"));
    files.push(resolve(siteDir, ".env"));
  }

  files.push(resolve(rootDir, ".env.repo.local"));
  files.push(resolve(rootDir, ".env.repo"));
  files.push(resolve(rootDir, ".env.local"));
  files.push(resolve(rootDir, ".env"));

  return files;
}

/**
 * Load the repo and site-specific .env files for demo operations.
 *
 * @param {{ sites?: string[]; rootDir?: string }} [options]
 * @returns {{ loadedFiles: string[] }}
 */
export function loadDemoWorkflowEnv(options = {}) {
  const loadedFiles = [];

  for (const filePath of resolveDemoEnvFiles(options)) {
    if (!existsSync(filePath)) continue;
    process.loadEnvFile(filePath);
    loadedFiles.push(filePath);
  }

  return { loadedFiles };
}
