import { readFileSync } from "node:fs";

/**
 * Read a quoted string assignment from a Wrangler TOML file.
 *
 * @param {string} configPath
 * @param {string} key
 * @returns {string}
 */
export function readWranglerString(configPath, key) {
  const content = readFileSync(configPath, "utf-8");
  const pattern = new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m");
  const match = content.match(pattern);

  if (!match?.[1]) {
    throw new Error(`Missing ${key} in ${configPath}`);
  }

  return match[1];
}
