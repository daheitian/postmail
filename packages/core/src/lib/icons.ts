/**
 * Shared icon utilities.
 *
 * Provides a small wrapper around lucide-static so server-rendered UI can fetch
 * SVG markup by kebab-case icon name.
 */

import * as lucideIcons from "lucide-static";

/**
 * Convert a kebab-case icon name to PascalCase for lucide-static lookup.
 *
 * @param name - Kebab-case icon name such as "book-open"
 * @returns PascalCase name such as "BookOpen"
 */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Get SVG markup for a Lucide icon by kebab-case name.
 *
 * @param name - Kebab-case icon name
 * @returns SVG string or null when the icon is unknown
 *
 * @example
 * ```ts
 * getIconSvg("book-open");
 * ```
 */
export function getIconSvg(name: string): string | null {
  const pascalName = toPascalCase(name);
  const svg = (lucideIcons as Record<string, string>)[pascalName];
  return typeof svg === "string" ? svg : null;
}
