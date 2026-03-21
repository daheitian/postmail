import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "smol-toml";

function readWranglerToml(configPath) {
  const absolutePath = resolve(process.cwd(), configPath);
  const raw = readFileSync(absolutePath, "utf-8");
  return parse(raw);
}

function readWranglerScope(config, envName) {
  if (!envName) {
    return config;
  }

  const scoped = config?.env?.[envName];
  if (!scoped || typeof scoped !== "object") {
    throw new Error(
      `Environment "${envName}" was not found in ${config.name || "wrangler.toml"}.`,
    );
  }

  return {
    ...config,
    ...scoped,
  };
}

export function resolveWranglerVarString(options = {}) {
  const configPath = options.configPath || "wrangler.toml";
  const key = options.key;

  if (!key) {
    throw new Error("resolveWranglerVarString requires a vars key.");
  }

  const config = readWranglerToml(configPath);
  const scope = readWranglerScope(config, options.env);
  const vars = scope?.vars;

  if (!vars || typeof vars !== "object") {
    return undefined;
  }

  const value = vars[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveWranglerAssetsDirectory(options = {}) {
  const configPath = options.configPath || "wrangler.toml";
  const config = readWranglerToml(configPath);
  const scope = readWranglerScope(config, options.env);
  const directory = scope?.assets?.directory;

  if (typeof directory !== "string") {
    return undefined;
  }

  const trimmed = directory.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveWranglerR2BucketName(options = {}) {
  const configPath = options.configPath || "wrangler.toml";
  const binding = options.binding || "R2";
  const config = readWranglerToml(configPath);
  const scope = readWranglerScope(config, options.env);
  const buckets = Array.isArray(scope?.r2_buckets) ? scope.r2_buckets : [];

  const match =
    buckets.find((bucket) => bucket?.binding === binding) ||
    (buckets.length === 1 ? buckets[0] : null);

  if (!match?.bucket_name) {
    throw new Error(
      `Could not resolve R2 bucket "${binding}" from ${configPath}. Pass --bucket or add [[r2_buckets]] binding = "${binding}".`,
    );
  }

  return String(match.bucket_name);
}
