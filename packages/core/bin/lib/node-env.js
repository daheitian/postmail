import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function stripSurroundingQuotes(value) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function fileExists(envPath) {
  try {
    readFileSync(envPath, "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate `.env.node` for CLI auto-load. Searches, in order:
 *   1. `<cwd>/.env.node`             — user's site directory
 *   2. `<bin>/../../.env.node`        — `packages/core/.env.node` (in-repo dev)
 *
 * Returns the first existing path, or `null` if none is found.
 */
export function findNodeEnvPath(cwd = process.cwd()) {
  const candidates = [
    resolve(cwd, ".env.node"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../../.env.node"),
  ];

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Parse the .env.node file and assign keys into `env`. Existing values in
 * `env` are preserved (already-exported shell vars win over file values).
 *
 * Returns a result object useful for debug logging:
 *   { envPath, found, assignedKeys, skippedKeys }
 */
export function loadNodeEnvFile(envPath, env = process.env) {
  const result = {
    envPath,
    found: false,
    assignedKeys: [],
    skippedKeys: [],
  };

  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return result;
  }

  result.found = true;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = stripSurroundingQuotes(trimmed.slice(eqIdx + 1).trim());
    if (key in env) {
      result.skippedKeys.push(key);
      continue;
    }
    env[key] = value;
    result.assignedKeys.push(key);
  }

  return result;
}

/**
 * Auto-locate and load `.env.node` for any DB-touching CLI command.
 *
 * Always called before `resolveCliRuntime()`, so DATABASE_URL / DATA_DIR
 * defined in `.env.node` make `--node` (or auto-detect) work without
 * requiring the user to source the file manually.
 */
export function autoloadNodeEnv(env = process.env) {
  const envPath = findNodeEnvPath();
  if (!envPath) {
    return { envPath: null, found: false, assignedKeys: [], skippedKeys: [] };
  }
  return loadNodeEnvFile(envPath, env);
}
