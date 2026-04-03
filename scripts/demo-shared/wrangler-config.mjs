import { readFileSync } from "node:fs";

/**
 * Read a quoted string assignment from a Wrangler TOML file.
 *
 * @param {string} configPath
 * @param {string} key
 * @param {{ required?: boolean }} [options]
 * @returns {string | null}
 */
export function readWranglerString(configPath, key, { required = true } = {}) {
  const content = readFileSync(configPath, "utf-8");
  const pattern = new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m");
  const match = content.match(pattern);

  if (!match?.[1]) {
    if (required) {
      throw new Error(`Missing ${key} in ${configPath}`);
    }
    return null;
  }

  return match[1];
}
