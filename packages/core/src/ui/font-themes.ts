/**
 * Built-in Font Themes
 *
 * Heading + body pairings plus typography rhythm overrides. Each theme sets
 * `--font-heading` and `--font-body`, and can optionally tune additional
 * typography tokens so the overall feel is more distinct.
 *
 * Name and description are MessageDescriptor objects for i18n support.
 * Pass them to t() from useLingui() when rendering.
 */

import type { MessageDescriptor } from "@lingui/core";

/**
 * A font theme definition with heading + body pairing.
 */
export interface FontTheme {
  /** Stored in DB settings, e.g. "classic-editorial" */
  id: string;
  /** Display name — pass to t() for translation */
  name: MessageDescriptor;
  /** CSS font-family stack for headings (h1-h6, site logo) */
  headingFontFamily: string;
  /** CSS font-family stack for body text */
  bodyFontFamily: string;
  /** Optional typography token overrides applied with the theme */
  cssVariables?: Record<string, string>;
  /** Short description for the picker UI — pass to t() for translation */
  description: MessageDescriptor;
}

/** System sans-serif stack */
const SANS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/** Humanist sans stack with self-hosted Latin and system CJK fallback */
const HUMANIST_SANS =
  '"Source Sans 3 Variable", "Source Sans 3", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/** Narrower newsroom sans for headlines and labels */
const NEWSROOM_SANS =
  '"News Cycle", "Franklin Gothic Medium", "Arial Narrow", "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/**
 * Editorial serif stack
 *
 * ui-serif → New York (macOS 10.15+); Iowan Old Style (macOS/iOS);
 * Charter (macOS); Cambria / Sitka Text (Windows); Georgia (universal)
 */
const EDITORIAL_SERIF =
  'ui-serif, "New York Small", "New York", "Iowan Old Style", Charter, "Bitstream Charter", "Source Serif 4", Cambria, "Sitka Text", Georgia, "Songti SC", "Noto Serif CJK SC", "STSong", "SimSun", "Noto Serif SC", serif';

/** Refined newsroom serif with self-hosted Latin text */
const NEWSROOM_SERIF =
  '"Newsreader Variable", Newsreader, ui-serif, "New York Small", "New York", "Iowan Old Style", Charter, "Bitstream Charter", Cambria, "Sitka Text", Georgia, "Songti SC", "Noto Serif CJK SC", "STSong", "SimSun", "Noto Serif SC", serif';

/** Library serif with self-hosted Latin text and CJK serif fallback */
const LITERARY_SERIF =
  '"Literata Variable", Literata, Palatino, "Palatino Linotype", "Book Antiqua", "Source Serif 4", "Songti SC", "Noto Serif CJK SC", "STSong", "SimSun", "Noto Serif SC", serif';

/**
 * Geometric sans stack
 *
 * Futura (macOS); Century Gothic (Windows); clean geometric proportions
 */
const GEOMETRIC_SANS =
  '"Avenir Next", Avenir, Futura, "Century Gothic", Montserrat, "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/**
 * Resolve all CSS variables a font theme contributes.
 *
 * @param theme - Font theme definition
 * @returns CSS variable map for theme injection or preview rendering
 *
 * @example
 * ```typescript
 * const vars = getFontThemeCssVariables(BUILTIN_FONT_THEMES[0]);
 * // => { "--font-heading": "...", "--font-body": "..." }
 * ```
 */
export function getFontThemeCssVariables(
  theme: FontTheme,
): Record<string, string> {
  return {
    "--font-body": theme.bodyFontFamily,
    "--font-heading": theme.headingFontFamily,
    ...(theme.cssVariables ?? {}),
  };
}

export const BUILTIN_FONT_THEMES: FontTheme[] = [
  {
    id: "default",
    name: {
      id: "Notebook",
      message: "Notebook",
      comment: "@context: Font theme name",
    },
    headingFontFamily: EDITORIAL_SERIF,
    bodyFontFamily: SANS,
    cssVariables: {
      "--type-body-size": "0.95rem",
      "--type-body-leading": "1.66",
      "--type-body-tracking": "0.002em",
      "--type-heading-weight": "var(--fw-medium)",
      "--type-heading-leading": "1.26",
      "--type-heading-tracking": "-0.02em",
      "--type-display-weight": "var(--fw-regular)",
      "--type-display-leading": "1.04",
      "--type-display-tracking": "-0.036em",
      "--type-label-weight": "var(--fw-medium)",
      "--type-label-tracking": "0.08em",
    },
    description: {
      id: "Warmer serif titles over plainspoken sans body copy",
      message: "Warmer serif titles over plainspoken sans body copy",
      comment: "@context: Font theme description",
    },
  },

  {
    id: "system-sans",
    name: {
      id: "System Sans",
      message: "System Sans",
      comment: "@context: Font theme name",
    },
    headingFontFamily: SANS,
    bodyFontFamily: SANS,
    cssVariables: {
      "--type-body-size": "0.95rem",
      "--type-body-leading": "1.62",
      "--type-body-tracking": "0",
      "--type-heading-weight": "var(--fw-semibold)",
      "--type-heading-leading": "1.24",
      "--type-heading-tracking": "-0.018em",
      "--type-display-weight": "var(--fw-semibold)",
      "--type-display-leading": "1.02",
      "--type-display-tracking": "-0.032em",
      "--type-label-weight": "var(--fw-medium)",
      "--type-label-tracking": "0.06em",
    },
    description: {
      id: "Neutral, compact, and close to the platform default",
      message: "Neutral, compact, and close to the platform default",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "humanist-sans",
    name: {
      id: "Humanist Sans",
      message: "Humanist Sans",
      comment: "@context: Font theme name",
    },
    headingFontFamily: HUMANIST_SANS,
    bodyFontFamily: HUMANIST_SANS,
    cssVariables: {
      "--type-body-size": "0.97rem",
      "--type-body-leading": "1.72",
      "--type-body-tracking": "0.001em",
      "--type-heading-weight": "var(--fw-semibold)",
      "--type-heading-leading": "1.22",
      "--type-heading-tracking": "-0.014em",
      "--type-display-weight": "var(--fw-semibold)",
      "--type-display-leading": "0.99",
      "--type-display-tracking": "-0.024em",
      "--type-label-weight": "var(--fw-medium)",
      "--type-label-tracking": "0.11em",
    },
    description: {
      id: "Open, readable sans with softer shapes and steadier rhythm",
      message: "Open, readable sans with softer shapes and steadier rhythm",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "modern-editorial",
    name: {
      id: "Newsroom",
      message: "Newsroom",
      comment: "@context: Font theme name",
    },
    headingFontFamily: NEWSROOM_SANS,
    bodyFontFamily: NEWSROOM_SERIF,
    cssVariables: {
      "--type-body-size": "0.99rem",
      "--type-body-leading": "1.8",
      "--type-body-tracking": "0.003em",
      "--type-heading-weight": "var(--fw-bold)",
      "--type-heading-leading": "1.14",
      "--type-heading-tracking": "-0.02em",
      "--type-display-weight": "var(--fw-bold)",
      "--type-display-leading": "0.96",
      "--type-display-tracking": "-0.026em",
      "--type-label-weight": "var(--fw-semibold)",
      "--type-label-tracking": "0.14em",
    },
    description: {
      id: "News-cycle headlines over calmer Newsreader body text",
      message: "News-cycle headlines over calmer Newsreader body text",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "literary",
    name: {
      id: "Library",
      message: "Library",
      comment: "@context: Font theme name",
    },
    headingFontFamily: LITERARY_SERIF,
    bodyFontFamily: LITERARY_SERIF,
    cssVariables: {
      "--type-body-size": "1rem",
      "--type-body-leading": "1.84",
      "--type-body-tracking": "0.002em",
      "--type-heading-weight": "var(--fw-regular)",
      "--type-heading-leading": "1.16",
      "--type-heading-tracking": "-0.018em",
      "--type-display-weight": "var(--fw-regular)",
      "--type-display-leading": "1.01",
      "--type-display-tracking": "-0.026em",
      "--type-label-weight": "var(--fw-medium)",
      "--type-label-tracking": "0.14em",
    },
    description: {
      id: "Literata-driven all-serif setting for essays, notes, and quotations",
      message:
        "Literata-driven all-serif setting for essays, notes, and quotations",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "geometric",
    name: {
      id: "Signal",
      message: "Signal",
      comment: "@context: Font theme name",
    },
    headingFontFamily: GEOMETRIC_SANS,
    bodyFontFamily: SANS,
    cssVariables: {
      "--type-body-size": "0.93rem",
      "--type-body-leading": "1.58",
      "--type-body-tracking": "0.003em",
      "--type-heading-weight": "var(--fw-bold)",
      "--type-heading-leading": "1.14",
      "--type-heading-tracking": "-0.038em",
      "--type-display-weight": "var(--fw-extrabold)",
      "--type-display-leading": "0.96",
      "--type-display-tracking": "-0.06em",
      "--type-label-weight": "var(--fw-semibold)",
      "--type-label-tracking": "0.16em",
    },
    description: {
      id: "High-contrast sans rhythm with tighter titles and louder labels",
      message:
        "High-contrast sans rhythm with tighter titles and louder labels",
      comment: "@context: Font theme description",
    },
  },
];
