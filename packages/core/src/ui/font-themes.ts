/**
 * Built-in Font Themes
 *
 * System-font-only presets — no external font loading required.
 * Name and description are MessageDescriptor objects for i18n support.
 * Pass them to t() from useLingui() when rendering.
 */

import type { MessageDescriptor } from "@lingui/core";

/**
 * A font theme definition with display metadata.
 */
export interface FontTheme {
  /** Stored in DB settings, e.g. "serif" */
  id: string;
  /** Display name — pass to t() for translation */
  name: MessageDescriptor;
  /** CSS font-family stack */
  fontFamily: string;
  /** Short description for the picker UI — pass to t() for translation */
  description: MessageDescriptor;
}

export const BUILTIN_FONT_THEMES: FontTheme[] = [
  {
    id: "default",
    name: {
      message: "System Default",
      comment: "@context: Font theme name",
    },
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    description: {
      message: "Matches your OS native font for consistent reading",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "serif",
    // ui-serif → New York (macOS 10.15+); Iowan Old Style (macOS/iOS);
    // Charter (macOS); Cambria / Sitka Text (Windows); Georgia (universal)
    name: {
      message: "Editorial Serif",
      comment: "@context: Font theme name",
    },
    fontFamily:
      'ui-serif, "Iowan Old Style", Charter, "Bitstream Charter", Cambria, "Sitka Text", Georgia, "Songti SC", "Noto Serif CJK SC", "STSong", "SimSun", serif',
    description: {
      message: "Elegant serif typeface for immersive long-form reading",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "classical",
    // Palatino (macOS); Palatino Linotype / Book Antiqua (Windows);
    // Old-style serif with calligraphic warmth, distinct from Editorial's modern screen serif
    name: {
      message: "Classical Serif",
      comment: "@context: Font theme name",
    },
    fontFamily:
      'Palatino, "Palatino Linotype", "Book Antiqua", "Songti SC", "Noto Serif CJK SC", "STSong", "SimSun", serif',
    description: {
      message: "Old-style serif with warm, calligraphic character",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "geometric",
    // Futura (macOS); Century Gothic (Windows); clean geometric proportions
    name: {
      message: "Geometric Sans",
      comment: "@context: Font theme name",
    },
    fontFamily:
      'Futura, "Century Gothic", "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    description: {
      message: "Clean geometric sans-serif with modern design aesthetics",
      comment: "@context: Font theme description",
    },
  },
  {
    id: "mono",
    // SF Mono (macOS); Cascadia Code (Windows 11+); Menlo (macOS fallback);
    // Consolas (Windows fallback)
    name: {
      message: "Monospace",
      comment: "@context: Font theme name",
    },
    fontFamily:
      '"SF Mono", "Cascadia Code", "Cascadia Mono", Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "Courier New", "PingFang SC", "Microsoft YaHei", monospace',
    description: {
      message: "Fixed-width typeface for technical writing and code",
      comment: "@context: Font theme description",
    },
  },
];
