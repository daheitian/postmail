/**
 * Generate icon catalog data in icon-catalog.ts from lucide-static and lucide.dev.
 *
 * - ALL_ICON_NAMES: flat sorted array of all kebab-case icon names (from tags.json)
 * - ALL_ICON_CATEGORIES: Record<category, iconName[]> (from lucide.dev/api/categories)
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
const installedNames = new Set(Object.keys(tags));
const allNames = [...installedNames].sort();

console.log(`Found ${allNames.length} icons in lucide-static tags.json`);

// Fetch official categories from lucide.dev
console.log("Fetching categories from lucide.dev...");
const res = await fetch("https://lucide.dev/api/categories");
if (!res.ok) {
  throw new Error(
    `Failed to fetch categories: ${res.status} ${res.statusText}`,
  );
}
const iconCategories: Record<string, string[]> = await res.json();

// Invert: icon→categories to category→icons, only including installed icons
const categoryMap = new Map<string, string[]>();
for (const [iconName, cats] of Object.entries(iconCategories)) {
  if (!installedNames.has(iconName)) continue;
  for (const cat of cats) {
    let list = categoryMap.get(cat);
    if (!list) {
      list = [];
      categoryMap.set(cat, list);
    }
    list.push(iconName);
  }
}

// Sort categories and their icons
const sortedCategories = [...categoryMap.keys()].sort();
for (const cat of sortedCategories) {
  categoryMap.get(cat)!.sort();
}

console.log(`Found ${sortedCategories.length} categories`);

// Read current catalog file
let content = readFileSync(catalogPath, "utf-8");

// Remove existing generated block if present
const marker = "\n/** All available Lucide icon names";
const markerIndex = content.indexOf(marker);
if (markerIndex !== -1) {
  content = content.slice(0, markerIndex);
}
content = content.trimEnd();

// Build ALL_ICON_NAMES
const nameEntries = allNames.map((name) => `  "${name}",`).join("\n");

// Build ALL_ICON_CATEGORIES
const catEntries = sortedCategories
  .map((cat) => {
    const icons = categoryMap.get(cat)!;
    const iconList = icons.map((n) => `"${n}"`).join(", ");
    return `  "${cat}": [${iconList}],`;
  })
  .join("\n");

const block = `

/** All available Lucide icon names (kebab-case), sorted alphabetically.
 * Generated from lucide-static — run \`mise run codegen-icons\` to update. */
export const ALL_ICON_NAMES: string[] = [
${nameEntries}
];

/** All Lucide icons grouped by official category.
 * Generated from lucide.dev — run \`mise run codegen-icons\` to update. */
export const ALL_ICON_CATEGORIES: Record<string, string[]> = {
${catEntries}
};
`;

writeFileSync(catalogPath, content + block, "utf-8");
console.log(
  `Wrote ALL_ICON_NAMES (${allNames.length}) + ALL_ICON_CATEGORIES (${sortedCategories.length}) to icon-catalog.ts`,
);
