/**
 * Generate ALL_ICON_NAMES array in icon-catalog.ts from lucide-static tags.json.
 *
 * Usage: npx tsx scripts/generate-icon-catalog.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const tagsPath = resolve(
  ROOT,
  "packages/core/node_modules/lucide-static/tags.json",
);
const catalogPath = resolve(ROOT, "packages/core/src/lib/icon-catalog.ts");

// Read all icon names from tags.json (authoritative kebab-case names)
const tags: Record<string, unknown> = JSON.parse(
  readFileSync(tagsPath, "utf-8"),
);
const allNames = Object.keys(tags).sort();

console.log(`Found ${allNames.length} icons in lucide-static tags.json`);

// Read current catalog file
let content = readFileSync(catalogPath, "utf-8");

// Remove existing ALL_ICON_NAMES block if present
const marker = "\n/** All available Lucide icon names";
const markerIndex = content.indexOf(marker);
if (markerIndex !== -1) {
  content = content.slice(0, markerIndex);
}

// Remove trailing whitespace
content = content.trimEnd();

// Build the ALL_ICON_NAMES array
const entries = allNames.map((name) => `  "${name}",`).join("\n");
const block = `

/** All available Lucide icon names (kebab-case), sorted alphabetically.
 * Generated from lucide-static — run \`mise run generate-icons\` to update. */
export const ALL_ICON_NAMES: string[] = [
${entries}
];
`;

writeFileSync(catalogPath, content + block, "utf-8");
console.log(
  `Wrote ALL_ICON_NAMES (${allNames.length} entries) to icon-catalog.ts`,
);
