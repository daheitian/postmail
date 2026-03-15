/**
 * Theme Resolution Helpers
 *
 * Resolves the active color theme and builds CSS for injection into `<head>`.
 */

import type { ColorTheme } from "../ui/color-themes.js";
import { BUILTIN_COLOR_THEMES } from "../ui/color-themes.js";
import type { ThemeMode } from "../types/config.js";

/**
 * Get the list of available color themes.
 *
 * Returns the built-in color theme list.
 *
 * @returns Array of available color themes
 *
 * @example
 * ```typescript
 * const themes = getAvailableThemes();
 * ```
 */
export function getAvailableThemes(): ColorTheme[] {
  return BUILTIN_COLOR_THEMES;
}

/**
 * Build a `<style>` CSS string from a color theme and optional cssVariables overlay.
 *
 * Priority (lowest → highest):
 *   BaseCoat defaults → selected theme → cssVariables
 *
 * @param theme - The active color theme (undefined = no theme overrides)
 * @param cssVariables - Extra CSS variable overrides
 * @returns CSS string to inject in `<head>`, or empty string if nothing to inject
 *
 * Uses `:root:root` for light mode and `@media (prefers-color-scheme: dark)`
 * with `:root:root` for dark mode, giving higher specificity than BaseCoat
 * defaults (`:root`). This ensures theme overrides win regardless of source
 * order — important because Vite dev mode injects CSS as `<style>` tags
 * after the theme `<style>`.
 *
 * @example
 * ```typescript
 * const css = buildThemeStyle(blueTheme, "auto", { "--radius": "0.5rem" });
 * // => ":root:root { ... }\n@media (prefers-color-scheme: dark) { :root:root { ... } }"
 * ```
 */
export function buildThemeStyle(
  theme: ColorTheme | undefined,
  themeMode: ThemeMode = "auto",
  cssVariables?: Record<string, string>,
): string {
  const lightVars: Record<string, string> = {
    ...(theme?.light ?? {}),
    ...(cssVariables ?? {}),
  };
  const darkVars: Record<string, string> = {
    ...(theme?.dark ?? {}),
    ...(cssVariables ?? {}),
  };

  const hasLight = Object.keys(lightVars).length > 0;
  const hasDark = Object.keys(darkVars).length > 0;

  if (!hasLight && !hasDark) return "";

  const parts: string[] = [];

  if (hasLight) {
    const declarations = Object.entries(lightVars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
    // :root:root has specificity (0,0,2) > BaseCoat's :root (0,0,1)
    parts.push(`:root:root {\n  color-scheme: light;\n${declarations}\n}`);
  }

  if (hasDark) {
    const declarations = Object.entries(darkVars)
      .map(([k, v]) => `    ${k}: ${v};`)
      .join("\n");
    const darkBlock = `  color-scheme: dark;\n${declarations}`;
    if (themeMode === "dark") {
      parts.push(`:root:root {\n${darkBlock}\n}`);
    } else {
      parts.push(`:root:root[data-theme-mode="dark"] {\n${darkBlock}\n}`);
      parts.push(
        `@media (prefers-color-scheme: dark) {\n  :root:root:not([data-theme-mode="light"]) {\n${darkBlock}\n  }\n}`,
      );
    }
  }

  return parts.join("\n");
}
