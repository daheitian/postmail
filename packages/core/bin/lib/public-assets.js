import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_PUBLISH_DIR = "dist/public";
export const ASSET_DIRNAME = "_assets";

export function resolvePackageClientRoot(moduleUrl = import.meta.url) {
  const commandDir = dirname(fileURLToPath(moduleUrl));
  const packageRoot = resolve(commandDir, "../..");
  const candidate = join(packageRoot, "dist", "client");

  if (existsSync(candidate)) {
    return candidate;
  }

  throw new Error(
    "Built client assets were not found. Run `pnpm --filter @jant/core build:client` first.",
  );
}

export function resolvePackageAssetRoot(moduleUrl = import.meta.url) {
  const candidate = join(resolvePackageClientRoot(moduleUrl), ASSET_DIRNAME);

  if (existsSync(candidate)) {
    return candidate;
  }

  throw new Error(
    "Built client assets were not found. Run `pnpm --filter @jant/core build:client` first.",
  );
}

export function resolvePublicAssetBasePath(sitePathPrefix = "") {
  return sitePathPrefix
    ? `${sitePathPrefix}/${ASSET_DIRNAME}`
    : `/${ASSET_DIRNAME}`;
}

export function resolvePreparedAssetRoot(outputDir, sitePathPrefix = "") {
  const absoluteOutputDir = resolve(process.cwd(), outputDir);

  return sitePathPrefix
    ? join(absoluteOutputDir, sitePathPrefix.replace(/^\/+/, ""), ASSET_DIRNAME)
    : join(absoluteOutputDir, ASSET_DIRNAME);
}

export async function preparePublicAssets(options = {}) {
  const sourceAssetRoot =
    options.sourceAssetRoot ?? resolvePackageAssetRoot(import.meta.url);
  const outputDir = options.outputDir ?? DEFAULT_PUBLISH_DIR;
  const sitePathPrefix = options.sitePathPrefix ?? "";
  const absoluteOutputDir = resolve(process.cwd(), outputDir);
  const targetAssetRoot = resolvePreparedAssetRoot(outputDir, sitePathPrefix);

  await rm(absoluteOutputDir, { recursive: true, force: true });
  await mkdir(dirname(targetAssetRoot), { recursive: true });
  await cp(sourceAssetRoot, targetAssetRoot, { recursive: true });

  return {
    outputDir: absoluteOutputDir,
    publicAssetBasePath: resolvePublicAssetBasePath(sitePathPrefix),
    targetAssetRoot,
  };
}
