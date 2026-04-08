/**
 * Theme Resolution Helpers
 *
 * Resolves the active color theme and builds CSS for injection into `<head>`.
 */

import type { ColorTheme } from "../ui/color-themes.js";
import { BUILTIN_COLOR_THEMES } from "../ui/color-themes.js";
import type { ThemeMode } from "../types/config.js";

const DEFAULT_THEME_BROWSER_COLORS = {
  light: "oklch(1 0 0)",
  dark: "oklch(0.145 0 0)",
} as const;

function clampToUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function linearSrgbToEncoded(value: number): number {
  const channel = clampToUnit(value);
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

function rgbChannelToHex(value: number): string {
  return Math.round(clampToUnit(value) * 255)
    .toString(16)
    .padStart(2, "0");
}

function parseOklch(color: string): { l: number; c: number; h: number } | null {
  const match = color
    .trim()
    .match(
      /^oklch\(\s*([+-]?\d*\.?\d+%?)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)(?:\s*\/\s*[+-]?\d*\.?\d+%?)?\s*\)$/i,
    );
  if (!match) return null;

  const [, rawL, rawC, rawH] = match;
  if (!rawL || !rawC || !rawH) return null;

  const l = rawL.endsWith("%")
    ? Number.parseFloat(rawL.slice(0, -1)) / 100
    : Number.parseFloat(rawL);
  const c = Number.parseFloat(rawC);
  const h = Number.parseFloat(rawH);

  if ([l, c, h].some((value) => Number.isNaN(value))) return null;

  return { l, c, h };
}

function oklchToHex(color: string): string | null {
  const parsed = parseOklch(color);
  if (!parsed) return null;

  const hueRadians = (parsed.h * Math.PI) / 180;
  const a = parsed.c * Math.cos(hueRadians);
  const b = parsed.c * Math.sin(hueRadians);

  const l = parsed.l + 0.3963377774 * a + 0.2158037573 * b;
  const m = parsed.l - 0.1055613458 * a - 0.0638541728 * b;
  const s = parsed.l - 0.0894841775 * a - 1.291485548 * b;

  const lCube = l ** 3;
  const mCube = m ** 3;
  const sCube = s ** 3;

  const rLinear =
    4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
  const gLinear =
    -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
  const bLinear =
    -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube;

  return `#${rgbChannelToHex(linearSrgbToEncoded(rLinear))}${rgbChannelToHex(
    linearSrgbToEncoded(gLinear),
  )}${rgbChannelToHex(linearSrgbToEncoded(bLinear))}`;
}

function normalizeThemeColorForMeta(color: string): string {
  return oklchToHex(color) ?? color;
}

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
 * Resolve the active built-in color theme from a configured ID.
 *
 * @param themeId - Theme ID (already resolved via DB → ENV → default chain)
 * @returns Matching built-in theme, if found
 *
 * @example
 * ```typescript
 * const activeTheme = resolveBuiltinTheme("linen");
 * ```
 */
export function resolveBuiltinTheme(themeId?: string): ColorTheme | undefined {
  return BUILTIN_COLOR_THEMES.find((theme) => theme.id === themeId);
}

/**
 * Return browser chrome colors for the active theme.
 *
 * These colors are used for `<meta name="theme-color">` so mobile browser UI
 * stays aligned with the page surface.
 *
 * @param theme - Active color theme
 * @returns Light and dark browser chrome colors
 *
 * @example
 * ```typescript
 * const chromeColors = getThemeBrowserColors(activeTheme);
 * ```
 */
export function getThemeBrowserColors(theme?: ColorTheme): {
  light: string;
  dark: string;
} {
  return {
    light: normalizeThemeColorForMeta(
      theme?.light["--background"] ?? DEFAULT_THEME_BROWSER_COLORS.light,
    ),
    dark: normalizeThemeColorForMeta(
      theme?.dark["--background"] ?? DEFAULT_THEME_BROWSER_COLORS.dark,
    ),
  };
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
