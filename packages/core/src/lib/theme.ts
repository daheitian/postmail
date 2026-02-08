/**
 * Theme Resolution Helpers
 *
 * Resolves the active color theme and builds CSS for injection into `<head>`.
 */

import type { ColorTheme } from "../theme/color-themes.js";
import { BUILTIN_COLOR_THEMES } from "../theme/color-themes.js";
import type { JantConfig } from "../types.js";

/**
 * Get the list of available color themes.
 *
 * Returns `config.theme.colorThemes` if provided, otherwise the built-in list.
 *
 * @param config - The Jant configuration
 * @returns Array of available color themes
 *
 * @example
 * ```typescript
 * const themes = getAvailableThemes(c.var.config);
 * ```
 */
export function getAvailableThemes(config: JantConfig): ColorTheme[] {
  return config.theme?.colorThemes ?? BUILTIN_COLOR_THEMES;
}

/**
 * Build a `<style>` CSS string from a color theme and optional cssVariables overlay.
 *
 * Priority (lowest → highest):
 *   BaseCoat defaults → selected theme → cssVariables
 *
 * @param theme - The active color theme (undefined = no theme overrides)
 * @param cssVariables - Extra CSS variable overrides from `createApp({ theme: { cssVariables } })`
 * @returns CSS string to inject in `<head>`, or empty string if nothing to inject
 *
 * Uses `:root:root` and `:root.dark` selectors for higher specificity than
 * BaseCoat defaults (`:root` and `.dark`). This ensures theme overrides win
 * regardless of source order — important because Vite dev mode injects CSS
 * as `<style>` tags after the theme `<style>`.
 *
 * @example
 * ```typescript
 * const css = buildThemeStyle(blueTheme, { "--radius": "0.5rem" });
 * // => ":root:root { --primary: oklch(...); ... }\n:root.dark { ... }"
 * ```
 */
export function buildThemeStyle(
  theme: ColorTheme | undefined,
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
    parts.push(`:root:root {\n${declarations}\n}`);
  }

  if (hasDark) {
    const declarations = Object.entries(darkVars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
    // :root.dark has specificity (0,1,1) > BaseCoat's .dark (0,1,0)
    parts.push(`:root.dark {\n${declarations}\n}`);
  }

  return parts.join("\n");
}
