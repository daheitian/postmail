import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { resolveWranglerVarString } from "../../lib/wrangler-config.js";

const DEFAULT_CONFIG_PATH = "wrangler.toml";
const DEFAULT_OUTPUT_DIR = ".jant/public-assets";
const ASSET_DIRNAME = "_assets";

function normalizeSitePathPrefix(siteUrl) {
  const trimmed = siteUrl.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = new URL(trimmed);
  if (parsed.pathname === "/" || parsed.pathname === "") {
    return "";
  }

  const normalized = parsed.pathname.replace(/\/+$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function resolvePackageAssetRoot(moduleUrl = import.meta.url) {
  const commandDir = dirname(fileURLToPath(moduleUrl));
  const packageRoot = resolve(commandDir, "../../..");
  const candidate = join(packageRoot, "dist", "client", ASSET_DIRNAME);

  if (existsSync(candidate)) {
    return candidate;
  }

  throw new Error(
    "Built client assets were not found. Run `pnpm --filter @jant/core build:client` first.",
  );
}

function resolveSiteUrl(options) {
  const explicitSiteUrl = options.siteUrl?.trim();
  if (explicitSiteUrl) {
    return explicitSiteUrl;
  }

  const envSiteUrl = process.env.SITE_URL?.trim();
  if (envSiteUrl) {
    return envSiteUrl;
  }

  return (
    resolveWranglerVarString({
      configPath: options.config,
      env: options.env,
      key: "SITE_URL",
    }) ?? ""
  );
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      config: { type: "string", short: "c", default: DEFAULT_CONFIG_PATH },
      env: { type: "string", short: "e" },
      output: { type: "string", short: "o", default: DEFAULT_OUTPUT_DIR },
      "site-url": { type: "string" },
    },
  });

  if (values.help) {
    console.log("Usage: jant assets prepare [options]");
    console.log("");
    console.log(
      "Generate a Cloudflare publish directory for production assets.",
    );
    console.log("");
    console.log("Options:");
    console.log(
      `  -c, --config <path>     Wrangler config path (default: ${DEFAULT_CONFIG_PATH})`,
    );
    console.log("  -e, --env <name>        Wrangler environment name");
    console.log(
      `  -o, --output <path>     Output directory (default: ${DEFAULT_OUTPUT_DIR})`,
    );
    console.log(
      "      --site-url <url>    Override SITE_URL instead of reading config",
    );
    process.exit(0);
  }

  const siteUrl = resolveSiteUrl({
    config: values.config,
    env: values.env,
    siteUrl: values["site-url"],
  });
  const sitePathPrefix = normalizeSitePathPrefix(siteUrl);
  const sourceAssetRoot = resolvePackageAssetRoot();
  const outputDir = resolve(process.cwd(), values.output);
  const targetAssetRoot = sitePathPrefix
    ? join(outputDir, sitePathPrefix.replace(/^\/+/, ""), ASSET_DIRNAME)
    : join(outputDir, ASSET_DIRNAME);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(dirname(targetAssetRoot), { recursive: true });
  await cp(sourceAssetRoot, targetAssetRoot, { recursive: true });

  const publicAssetBasePath = sitePathPrefix
    ? `${sitePathPrefix}/${ASSET_DIRNAME}`
    : `/${ASSET_DIRNAME}`;

  console.log(`Prepared public assets in ${outputDir}`);
  console.log(`Public asset base path: ${publicAssetBasePath}`);
}
