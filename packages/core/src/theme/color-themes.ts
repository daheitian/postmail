/**
 * Built-in Color Themes
 *
 * Each theme defines CSS variable overrides for light and dark modes.
 * Variables not listed in a theme fall through to BaseCoat defaults.
 *
 * Theme palettes are derived from the shadcn/ui ecosystem.
 */

/**
 * A color theme definition with light and dark mode CSS variable overrides.
 *
 * @example
 * ```typescript
 * const myTheme: ColorTheme = {
 *   id: "ocean",
 *   name: "Ocean",
 *   light: { "--primary": "oklch(0.5 0.2 240)" },
 *   dark: { "--primary": "oklch(0.7 0.2 240)" },
 * };
 * ```
 */
export interface ColorTheme {
  /** Stored in DB settings, e.g. "blue" */
  id: string;
  /** Display name, e.g. "Blue" */
  name: string;
  /** CSS variable overrides for :root (light mode) */
  light: Record<string, string>;
  /** CSS variable overrides for .dark (dark mode) */
  dark: Record<string, string>;
}

export const BUILTIN_COLOR_THEMES: ColorTheme[] = [
  {
    id: "default",
    name: "Default",
    light: {},
    dark: {},
  },
  {
    id: "blue",
    name: "Blue",
    light: {
      "--primary": "oklch(0.623 0.214 259.815)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.623 0.214 259.815)",
      "--chart-1": "oklch(0.623 0.214 259.815)",
      "--chart-2": "oklch(0.6 0.118 184.704)",
      "--chart-3": "oklch(0.398 0.07 227.392)",
      "--chart-4": "oklch(0.828 0.189 84.429)",
      "--chart-5": "oklch(0.769 0.188 70.08)",
      "--sidebar-primary": "oklch(0.623 0.214 259.815)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.623 0.214 259.815)",
    },
    dark: {
      "--primary": "oklch(0.488 0.243 264.376)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.488 0.243 264.376)",
      "--chart-1": "oklch(0.488 0.243 264.376)",
      "--chart-2": "oklch(0.696 0.17 162.48)",
      "--chart-3": "oklch(0.769 0.188 70.08)",
      "--chart-4": "oklch(0.627 0.265 303.9)",
      "--chart-5": "oklch(0.645 0.246 16.439)",
      "--sidebar-primary": "oklch(0.488 0.243 264.376)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.488 0.243 264.376)",
    },
  },
  {
    id: "green",
    name: "Green",
    light: {
      "--primary": "oklch(0.723 0.219 149.579)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.723 0.219 149.579)",
      "--chart-1": "oklch(0.723 0.219 149.579)",
      "--chart-2": "oklch(0.6 0.118 184.704)",
      "--chart-3": "oklch(0.398 0.07 227.392)",
      "--chart-4": "oklch(0.828 0.189 84.429)",
      "--chart-5": "oklch(0.769 0.188 70.08)",
      "--sidebar-primary": "oklch(0.723 0.219 149.579)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.723 0.219 149.579)",
    },
    dark: {
      "--primary": "oklch(0.696 0.17 162.48)",
      "--primary-foreground": "oklch(0.145 0 0)",
      "--ring": "oklch(0.696 0.17 162.48)",
      "--chart-1": "oklch(0.696 0.17 162.48)",
      "--chart-2": "oklch(0.488 0.243 264.376)",
      "--chart-3": "oklch(0.769 0.188 70.08)",
      "--chart-4": "oklch(0.627 0.265 303.9)",
      "--chart-5": "oklch(0.645 0.246 16.439)",
      "--sidebar-primary": "oklch(0.696 0.17 162.48)",
      "--sidebar-primary-foreground": "oklch(0.145 0 0)",
      "--sidebar-ring": "oklch(0.696 0.17 162.48)",
    },
  },
  {
    id: "orange",
    name: "Orange",
    light: {
      "--primary": "oklch(0.705 0.213 47.604)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.705 0.213 47.604)",
      "--chart-1": "oklch(0.705 0.213 47.604)",
      "--chart-2": "oklch(0.6 0.118 184.704)",
      "--chart-3": "oklch(0.398 0.07 227.392)",
      "--chart-4": "oklch(0.828 0.189 84.429)",
      "--chart-5": "oklch(0.769 0.188 70.08)",
      "--sidebar-primary": "oklch(0.705 0.213 47.604)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.705 0.213 47.604)",
    },
    dark: {
      "--primary": "oklch(0.705 0.213 47.604)",
      "--primary-foreground": "oklch(0.145 0 0)",
      "--ring": "oklch(0.705 0.213 47.604)",
      "--chart-1": "oklch(0.705 0.213 47.604)",
      "--chart-2": "oklch(0.696 0.17 162.48)",
      "--chart-3": "oklch(0.769 0.188 70.08)",
      "--chart-4": "oklch(0.627 0.265 303.9)",
      "--chart-5": "oklch(0.645 0.246 16.439)",
      "--sidebar-primary": "oklch(0.705 0.213 47.604)",
      "--sidebar-primary-foreground": "oklch(0.145 0 0)",
      "--sidebar-ring": "oklch(0.705 0.213 47.604)",
    },
  },
  {
    id: "red",
    name: "Red",
    light: {
      "--primary": "oklch(0.637 0.237 25.331)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.637 0.237 25.331)",
      "--chart-1": "oklch(0.637 0.237 25.331)",
      "--chart-2": "oklch(0.6 0.118 184.704)",
      "--chart-3": "oklch(0.398 0.07 227.392)",
      "--chart-4": "oklch(0.828 0.189 84.429)",
      "--chart-5": "oklch(0.769 0.188 70.08)",
      "--sidebar-primary": "oklch(0.637 0.237 25.331)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.637 0.237 25.331)",
    },
    dark: {
      "--primary": "oklch(0.704 0.191 22.216)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.704 0.191 22.216)",
      "--chart-1": "oklch(0.704 0.191 22.216)",
      "--chart-2": "oklch(0.696 0.17 162.48)",
      "--chart-3": "oklch(0.769 0.188 70.08)",
      "--chart-4": "oklch(0.627 0.265 303.9)",
      "--chart-5": "oklch(0.488 0.243 264.376)",
      "--sidebar-primary": "oklch(0.704 0.191 22.216)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.704 0.191 22.216)",
    },
  },
  {
    id: "rose",
    name: "Rose",
    light: {
      "--primary": "oklch(0.645 0.246 16.439)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.645 0.246 16.439)",
      "--chart-1": "oklch(0.645 0.246 16.439)",
      "--chart-2": "oklch(0.6 0.118 184.704)",
      "--chart-3": "oklch(0.398 0.07 227.392)",
      "--chart-4": "oklch(0.828 0.189 84.429)",
      "--chart-5": "oklch(0.769 0.188 70.08)",
      "--sidebar-primary": "oklch(0.645 0.246 16.439)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.645 0.246 16.439)",
    },
    dark: {
      "--primary": "oklch(0.645 0.246 16.439)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.645 0.246 16.439)",
      "--chart-1": "oklch(0.645 0.246 16.439)",
      "--chart-2": "oklch(0.696 0.17 162.48)",
      "--chart-3": "oklch(0.769 0.188 70.08)",
      "--chart-4": "oklch(0.627 0.265 303.9)",
      "--chart-5": "oklch(0.488 0.243 264.376)",
      "--sidebar-primary": "oklch(0.645 0.246 16.439)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.645 0.246 16.439)",
    },
  },
  {
    id: "violet",
    name: "Violet",
    light: {
      "--primary": "oklch(0.606 0.25 292.717)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.606 0.25 292.717)",
      "--chart-1": "oklch(0.606 0.25 292.717)",
      "--chart-2": "oklch(0.6 0.118 184.704)",
      "--chart-3": "oklch(0.398 0.07 227.392)",
      "--chart-4": "oklch(0.828 0.189 84.429)",
      "--chart-5": "oklch(0.769 0.188 70.08)",
      "--sidebar-primary": "oklch(0.606 0.25 292.717)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.606 0.25 292.717)",
    },
    dark: {
      "--primary": "oklch(0.627 0.265 303.9)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.627 0.265 303.9)",
      "--chart-1": "oklch(0.627 0.265 303.9)",
      "--chart-2": "oklch(0.696 0.17 162.48)",
      "--chart-3": "oklch(0.769 0.188 70.08)",
      "--chart-4": "oklch(0.488 0.243 264.376)",
      "--chart-5": "oklch(0.645 0.246 16.439)",
      "--sidebar-primary": "oklch(0.627 0.265 303.9)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-ring": "oklch(0.627 0.265 303.9)",
    },
  },
];
