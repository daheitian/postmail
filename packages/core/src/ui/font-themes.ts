/**
 * Built-in Font Themes
 *
 * System-font-only presets — no external font loading required.
 */

/**
 * A font theme definition with display metadata.
 */
export interface FontTheme {
  /** Stored in DB settings, e.g. "serif" */
  id: string;
  /** Display name, e.g. "Serif" */
  name: string;
  /** CSS font-family stack */
  fontFamily: string;
  /** Short description for the picker UI */
  description: string;
}

export const BUILTIN_FONT_THEMES: FontTheme[] = [
  {
    id: "default",
    name: "System Default",
    fontFamily: "system-ui, -apple-system, sans-serif",
    description: "Uses your device's default system font",
  },
  {
    id: "serif",
    name: "Serif",
    fontFamily:
      'Georgia, "Noto Serif CJK SC", "Songti SC", SimSun, PMingLiU, serif',
    description: "Traditional serif typeface for a classic reading experience",
  },
  {
    id: "classic",
    name: "Classic Sans",
    fontFamily:
      '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
    description: "Clean, neutral sans-serif",
  },
  {
    id: "humanist",
    name: "Humanist",
    fontFamily:
      'Optima, Candara, "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    description: "Warm, organic sans-serif with calligraphic influence",
  },
  {
    id: "mono",
    name: "Monospace",
    fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
    description: "Fixed-width typeface for a technical aesthetic",
  },
];
