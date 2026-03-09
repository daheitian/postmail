/**
 * Built-in Color Themes
 *
 * Each theme defines CSS variable overrides for light and dark modes,
 * plus preview colors for the theme picker UI.
 */

/**
 * A color theme definition with light and dark mode CSS variable overrides.
 */
export interface ColorTheme {
  /** Stored in DB settings, e.g. "beach" */
  id: string;
  /** Display name, e.g. "Beach" */
  name: string;
  /** CSS variable overrides for :root (light mode) */
  light: Record<string, string>;
  /** CSS variable overrides for .dark (dark mode) */
  dark: Record<string, string>;
  /** Preview colors (hex) for theme picker cards */
  preview: {
    lightBg: string;
    lightText: string;
    lightLink: string;
    darkBg: string;
    darkText: string;
    darkLink: string;
  };
}

interface ThemeModeColors {
  bg: string;
  fg: string;
  primary: string;
  primaryFg: string;
  muted: string;
  mutedFg: string;
  border: string;
  /** Destructive action color (defaults to BaseCoat red) */
  destructive?: string;
  /** Success indicator color (defaults to preset green) */
  success?: string;
  /** Search highlight background */
  searchMarkBg?: string;
  /** Search highlight text color */
  searchMarkColor?: string;
  /** Admin dashboard background */
  dashBg?: string;
}

/** Default destructive/success colors that harmonize with most themes */
const DEFAULTS = {
  light: {
    destructive: "oklch(0.577 0.245 27.325)",
    success: "oklch(0.518 0.16 145.071)",
    searchMarkBg: "oklch(0.92 0.14 90 / 0.55)",
    searchMarkColor: "oklch(0.35 0.09 70)",
    dashBg: "oklch(0.97 0.005 80)",
  },
  dark: {
    destructive: "oklch(0.704 0.191 22.216)",
    success: "oklch(0.627 0.194 149.214)",
    searchMarkBg: "oklch(0.45 0.1 85 / 0.5)",
    searchMarkColor: "oklch(0.92 0.08 90)",
    dashBg: "oklch(0.2 0.005 80)",
  },
};

/**
 * Create a comprehensive color theme from key colors.
 * Derives card, popover, muted, secondary, accent, and sidebar variables.
 * Also sets --destructive, --success, --search-mark-*, and --dash-bg.
 */
function defineTheme(opts: {
  id: string;
  name: string;
  preview: ColorTheme["preview"];
  light: ThemeModeColors;
  dark: ThemeModeColors;
}): ColorTheme {
  const { light, dark } = opts;
  return {
    id: opts.id,
    name: opts.name,
    preview: opts.preview,
    light: {
      "--background": light.bg,
      "--foreground": light.fg,
      "--card": light.bg,
      "--card-foreground": light.fg,
      "--popover": light.bg,
      "--popover-foreground": light.fg,
      "--primary": light.primary,
      "--primary-foreground": light.primaryFg,
      "--secondary": light.muted,
      "--secondary-foreground": light.fg,
      "--muted": light.muted,
      "--muted-foreground": light.mutedFg,
      "--accent": light.muted,
      "--accent-foreground": light.fg,
      "--destructive": light.destructive ?? DEFAULTS.light.destructive,
      "--success": light.success ?? DEFAULTS.light.success,
      "--border": light.border,
      "--input": light.border,
      "--ring": light.primary,
      "--sidebar": light.bg,
      "--sidebar-foreground": light.fg,
      "--sidebar-primary": light.primary,
      "--sidebar-primary-foreground": light.primaryFg,
      "--sidebar-accent": light.muted,
      "--sidebar-accent-foreground": light.fg,
      "--sidebar-border": light.border,
      "--sidebar-ring": light.primary,
      "--search-mark-bg": light.searchMarkBg ?? DEFAULTS.light.searchMarkBg,
      "--search-mark-color":
        light.searchMarkColor ?? DEFAULTS.light.searchMarkColor,
      "--dash-bg": light.dashBg ?? DEFAULTS.light.dashBg,
    },
    dark: {
      "--background": dark.bg,
      "--foreground": dark.fg,
      "--card": dark.bg,
      "--card-foreground": dark.fg,
      "--popover": dark.bg,
      "--popover-foreground": dark.fg,
      "--primary": dark.primary,
      "--primary-foreground": dark.primaryFg,
      "--secondary": dark.muted,
      "--secondary-foreground": dark.fg,
      "--muted": dark.muted,
      "--muted-foreground": dark.mutedFg,
      "--accent": dark.muted,
      "--accent-foreground": dark.fg,
      "--destructive": dark.destructive ?? DEFAULTS.dark.destructive,
      "--success": dark.success ?? DEFAULTS.dark.success,
      "--border": dark.border,
      "--input": dark.border,
      "--ring": dark.primary,
      "--sidebar": dark.bg,
      "--sidebar-foreground": dark.fg,
      "--sidebar-primary": dark.primary,
      "--sidebar-primary-foreground": dark.primaryFg,
      "--sidebar-accent": dark.muted,
      "--sidebar-accent-foreground": dark.fg,
      "--sidebar-border": dark.border,
      "--sidebar-ring": dark.primary,
      "--search-mark-bg": dark.searchMarkBg ?? DEFAULTS.dark.searchMarkBg,
      "--search-mark-color":
        dark.searchMarkColor ?? DEFAULTS.dark.searchMarkColor,
      "--dash-bg": dark.dashBg ?? DEFAULTS.dark.dashBg,
    },
  };
}

export const BUILTIN_COLOR_THEMES: ColorTheme[] = [
  defineTheme({
    id: "notepad",
    name: "Notepad",
    preview: {
      lightBg: "#fdfce8",
      lightText: "#333333",
      lightLink: "#2060b8",
      darkBg: "#2a291a",
      darkText: "#d2d2b8",
      darkLink: "#6695cc",
    },
    light: {
      bg: "oklch(0.985 0.018 95)",
      fg: "oklch(0.27 0 0)",
      primary: "oklch(0.5 0.17 260)",
      primaryFg: "oklch(0.985 0.01 95)",
      muted: "oklch(0.94 0.022 95)",
      mutedFg: "oklch(0.52 0 0)",
      border: "oklch(0.88 0.025 95)",
      destructive: "oklch(0.55 0.22 25)",
      success: "oklch(0.5 0.14 150)",
      dashBg: "oklch(0.96 0.015 95)",
    },
    dark: {
      bg: "oklch(0.2 0.02 90)",
      fg: "oklch(0.87 0.015 95)",
      primary: "oklch(0.65 0.14 260)",
      primaryFg: "oklch(0.98 0.01 95)",
      muted: "oklch(0.26 0.018 90)",
      mutedFg: "oklch(0.62 0.012 95)",
      border: "oklch(0.32 0.018 90)",
      destructive: "oklch(0.68 0.19 22)",
      success: "oklch(0.62 0.15 150)",
      dashBg: "oklch(0.18 0.015 90)",
    },
  }),

  defineTheme({
    id: "halloween",
    name: "Halloween",
    preview: {
      lightBg: "#f9f2e3",
      lightText: "#352200",
      lightLink: "#b84400",
      darkBg: "#1e1000",
      darkText: "#dfc390",
      darkLink: "#ff8c00",
    },
    light: {
      bg: "oklch(0.97 0.015 75)",
      fg: "oklch(0.25 0.04 55)",
      primary: "oklch(0.47 0.17 50)",
      primaryFg: "oklch(0.98 0.01 75)",
      muted: "oklch(0.93 0.02 75)",
      mutedFg: "oklch(0.5 0.025 55)",
      border: "oklch(0.88 0.025 75)",
      destructive: "oklch(0.5 0.2 15)",
      success: "oklch(0.5 0.14 155)",
      searchMarkBg: "oklch(0.88 0.12 75 / 0.6)",
      searchMarkColor: "oklch(0.3 0.06 55)",
      dashBg: "oklch(0.95 0.012 75)",
    },
    dark: {
      bg: "oklch(0.16 0.03 50)",
      fg: "oklch(0.85 0.025 75)",
      primary: "oklch(0.72 0.19 55)",
      primaryFg: "oklch(0.14 0.03 50)",
      muted: "oklch(0.22 0.025 50)",
      mutedFg: "oklch(0.62 0.02 75)",
      border: "oklch(0.28 0.025 50)",
      destructive: "oklch(0.65 0.2 15)",
      success: "oklch(0.62 0.15 155)",
      searchMarkBg: "oklch(0.42 0.1 60 / 0.55)",
      searchMarkColor: "oklch(0.9 0.06 75)",
      dashBg: "oklch(0.14 0.025 50)",
    },
  }),

  defineTheme({
    id: "panda",
    name: "Panda",
    preview: {
      lightBg: "#ffffff",
      lightText: "#1e1e1e",
      lightLink: "#1e1e1e",
      darkBg: "#262626",
      darkText: "#fafafa",
      darkLink: "#eaeaea",
    },
    light: {
      bg: "oklch(1 0 0)",
      fg: "oklch(0.2 0 0)",
      primary: "oklch(0.2 0 0)",
      primaryFg: "oklch(1 0 0)",
      muted: "oklch(0.96 0 0)",
      mutedFg: "oklch(0.5 0 0)",
      border: "oklch(0.9 0 0)",
      destructive: "oklch(0.55 0.22 25)",
      success: "oklch(0.5 0.15 145)",
      dashBg: "oklch(0.97 0 0)",
    },
    dark: {
      bg: "oklch(0.21 0 0)",
      fg: "oklch(0.98 0 0)",
      primary: "oklch(0.93 0 0)",
      primaryFg: "oklch(0.15 0 0)",
      muted: "oklch(0.27 0 0)",
      mutedFg: "oklch(0.65 0 0)",
      border: "oklch(0.33 0 0)",
      destructive: "oklch(0.68 0.18 22)",
      success: "oklch(0.62 0.16 150)",
      dashBg: "oklch(0.18 0 0)",
    },
  }),

  defineTheme({
    id: "beach",
    name: "Beach",
    preview: {
      lightBg: "#f9f3ea",
      lightText: "#3d3527",
      lightLink: "#2d6a59",
      darkBg: "#2d4553",
      darkText: "#e2d6c4",
      darkLink: "#7cc5a2",
    },
    light: {
      bg: "oklch(0.97 0.01 85)",
      fg: "oklch(0.28 0.02 65)",
      primary: "oklch(0.46 0.1 170)",
      primaryFg: "oklch(0.98 0.005 85)",
      muted: "oklch(0.93 0.015 85)",
      mutedFg: "oklch(0.52 0.015 65)",
      border: "oklch(0.88 0.018 85)",
      destructive: "oklch(0.52 0.2 22)",
      success: "oklch(0.5 0.12 170)",
      dashBg: "oklch(0.95 0.008 85)",
    },
    dark: {
      bg: "oklch(0.27 0.03 210)",
      fg: "oklch(0.88 0.015 80)",
      primary: "oklch(0.72 0.1 165)",
      primaryFg: "oklch(0.22 0.03 210)",
      muted: "oklch(0.33 0.025 210)",
      mutedFg: "oklch(0.65 0.015 80)",
      border: "oklch(0.38 0.02 210)",
      destructive: "oklch(0.68 0.18 20)",
      success: "oklch(0.65 0.12 170)",
      dashBg: "oklch(0.24 0.025 210)",
    },
  }),

  defineTheme({
    id: "gameboy",
    name: "Gameboy",
    preview: {
      lightBg: "#d3d7c0",
      lightText: "#2b3326",
      lightLink: "#466740",
      darkBg: "#1b1f18",
      darkText: "#a6b09a",
      darkLink: "#6d9660",
    },
    light: {
      bg: "oklch(0.87 0.03 130)",
      fg: "oklch(0.25 0.04 140)",
      primary: "oklch(0.4 0.08 145)",
      primaryFg: "oklch(0.92 0.02 130)",
      muted: "oklch(0.83 0.035 130)",
      mutedFg: "oklch(0.48 0.03 140)",
      border: "oklch(0.79 0.035 130)",
      destructive: "oklch(0.52 0.18 25)",
      // Use blue-teal to differentiate from the green primary
      success: "oklch(0.48 0.1 220)",
      searchMarkBg: "oklch(0.8 0.06 100 / 0.6)",
      searchMarkColor: "oklch(0.3 0.04 130)",
      dashBg: "oklch(0.85 0.028 130)",
    },
    dark: {
      bg: "oklch(0.18 0.02 140)",
      fg: "oklch(0.78 0.025 130)",
      primary: "oklch(0.6 0.08 145)",
      primaryFg: "oklch(0.15 0.02 140)",
      muted: "oklch(0.24 0.02 140)",
      mutedFg: "oklch(0.58 0.02 130)",
      border: "oklch(0.3 0.02 140)",
      destructive: "oklch(0.65 0.17 22)",
      success: "oklch(0.6 0.1 220)",
      searchMarkBg: "oklch(0.4 0.06 110 / 0.55)",
      searchMarkColor: "oklch(0.88 0.04 130)",
      dashBg: "oklch(0.16 0.018 140)",
    },
  }),

  defineTheme({
    id: "grayscale",
    name: "Grayscale",
    preview: {
      lightBg: "#efefef",
      lightText: "#3a3a3a",
      lightLink: "#555555",
      darkBg: "#1e1e1e",
      darkText: "#c8c8c8",
      darkLink: "#999999",
    },
    light: {
      bg: "oklch(0.96 0 0)",
      fg: "oklch(0.3 0 0)",
      primary: "oklch(0.4 0 0)",
      primaryFg: "oklch(0.96 0 0)",
      muted: "oklch(0.92 0 0)",
      mutedFg: "oklch(0.55 0 0)",
      border: "oklch(0.87 0 0)",
      destructive: "oklch(0.55 0.22 25)",
      success: "oklch(0.5 0.15 145)",
      searchMarkBg: "oklch(0.88 0 0 / 0.7)",
      searchMarkColor: "oklch(0.25 0 0)",
      dashBg: "oklch(0.94 0 0)",
    },
    dark: {
      bg: "oklch(0.18 0 0)",
      fg: "oklch(0.82 0 0)",
      primary: "oklch(0.7 0 0)",
      primaryFg: "oklch(0.18 0 0)",
      muted: "oklch(0.24 0 0)",
      mutedFg: "oklch(0.6 0 0)",
      border: "oklch(0.3 0 0)",
      destructive: "oklch(0.68 0.18 22)",
      success: "oklch(0.62 0.16 150)",
      searchMarkBg: "oklch(0.35 0 0 / 0.6)",
      searchMarkColor: "oklch(0.9 0 0)",
      dashBg: "oklch(0.16 0 0)",
    },
  }),

  defineTheme({
    id: "sonnet",
    name: "Sonnet",
    preview: {
      lightBg: "#f7eef5",
      lightText: "#2e1e2c",
      lightLink: "#7a30a8",
      darkBg: "#1d1428",
      darkText: "#d4c2d0",
      darkLink: "#c080fc",
    },
    light: {
      bg: "oklch(0.97 0.012 325)",
      fg: "oklch(0.25 0.02 310)",
      primary: "oklch(0.45 0.2 300)",
      primaryFg: "oklch(0.98 0.008 325)",
      muted: "oklch(0.93 0.016 325)",
      mutedFg: "oklch(0.52 0.015 310)",
      border: "oklch(0.88 0.016 325)",
      destructive: "oklch(0.55 0.2 15)",
      success: "oklch(0.5 0.14 155)",
      searchMarkBg: "oklch(0.9 0.08 310 / 0.45)",
      searchMarkColor: "oklch(0.3 0.04 300)",
      dashBg: "oklch(0.95 0.01 325)",
    },
    dark: {
      bg: "oklch(0.18 0.025 300)",
      fg: "oklch(0.87 0.012 325)",
      primary: "oklch(0.72 0.18 300)",
      primaryFg: "oklch(0.98 0.008 325)",
      muted: "oklch(0.24 0.022 300)",
      mutedFg: "oklch(0.62 0.012 325)",
      border: "oklch(0.3 0.022 300)",
      destructive: "oklch(0.68 0.18 18)",
      success: "oklch(0.62 0.15 155)",
      searchMarkBg: "oklch(0.38 0.08 290 / 0.5)",
      searchMarkColor: "oklch(0.9 0.04 325)",
      dashBg: "oklch(0.16 0.02 300)",
    },
  }),
];
