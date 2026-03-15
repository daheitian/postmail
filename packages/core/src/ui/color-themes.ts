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
  /** Stored in DB settings, e.g. "linen" */
  id: string;
  /** Display name, e.g. "Dune" */
  name: string;
  /** CSS variable overrides for :root (light mode) */
  light: Record<string, string>;
  /** CSS variable overrides for dark mode */
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
  siteAccent: string;
  /** Text on site accent backgrounds (defaults to primaryFg) */
  siteAccentFg?: string;
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
      "--site-accent": light.siteAccent,
      "--site-accent-text": light.siteAccentFg ?? light.primaryFg,
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
      "--site-accent": dark.siteAccent,
      "--site-accent-text": dark.siteAccentFg ?? dark.primaryFg,
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
    id: "linen",
    name: "Linen",
    preview: {
      lightBg: "#f7f1e4",
      lightText: "#342f28",
      lightLink: "#64745f",
      darkBg: "#242116",
      darkText: "#d7cfbb",
      darkLink: "#b0c5aa",
    },
    light: {
      bg: "oklch(0.975 0.015 92)",
      fg: "oklch(0.29 0.01 70)",
      primary: "oklch(0.47 0.045 140)",
      primaryFg: "oklch(0.985 0.008 92)",
      siteAccent: "oklch(0.54 0.038 138)",
      muted: "oklch(0.942 0.014 96)",
      mutedFg: "oklch(0.52 0.008 70)",
      border: "oklch(0.892 0.014 98)",
      destructive: "oklch(0.56 0.21 24)",
      success: "oklch(0.56 0.11 158)",
      dashBg: "oklch(0.955 0.012 92)",
    },
    dark: {
      bg: "oklch(0.2 0.016 88)",
      fg: "oklch(0.87 0.012 92)",
      primary: "oklch(0.77 0.05 140)",
      primaryFg: "oklch(0.18 0.014 88)",
      siteAccent: "oklch(0.8 0.044 138)",
      muted: "oklch(0.258 0.012 96)",
      mutedFg: "oklch(0.64 0.01 92)",
      border: "oklch(0.325 0.012 98)",
      destructive: "oklch(0.67 0.18 22)",
      success: "oklch(0.68 0.11 158)",
      dashBg: "oklch(0.18 0.012 88)",
    },
  }),

  defineTheme({
    id: "ember",
    name: "Ember",
    preview: {
      lightBg: "#f5ede1",
      lightText: "#39291d",
      lightLink: "#9d5428",
      darkBg: "#22160f",
      darkText: "#e5ccb2",
      darkLink: "#e69463",
    },
    light: {
      bg: "oklch(0.968 0.014 68)",
      fg: "oklch(0.28 0.03 45)",
      primary: "oklch(0.47 0.11 45)",
      primaryFg: "oklch(0.985 0.008 70)",
      siteAccent: "oklch(0.57 0.12 55)",
      muted: "oklch(0.93 0.017 68)",
      mutedFg: "oklch(0.51 0.022 45)",
      border: "oklch(0.88 0.02 68)",
      destructive: "oklch(0.52 0.18 18)",
      success: "oklch(0.5 0.12 150)",
      searchMarkBg: "oklch(0.88 0.09 62 / 0.65)",
      searchMarkColor: "oklch(0.31 0.045 42)",
      dashBg: "oklch(0.95 0.012 68)",
    },
    dark: {
      bg: "oklch(0.17 0.022 38)",
      fg: "oklch(0.86 0.018 68)",
      primary: "oklch(0.79 0.1 58)",
      primaryFg: "oklch(0.16 0.02 38)",
      siteAccent: "oklch(0.74 0.12 48)",
      muted: "oklch(0.23 0.02 38)",
      mutedFg: "oklch(0.64 0.016 68)",
      border: "oklch(0.29 0.02 38)",
      destructive: "oklch(0.66 0.18 16)",
      success: "oklch(0.62 0.13 150)",
      searchMarkBg: "oklch(0.4 0.08 55 / 0.55)",
      searchMarkColor: "oklch(0.9 0.04 72)",
      dashBg: "oklch(0.145 0.018 38)",
    },
  }),

  defineTheme({
    id: "ink",
    name: "Ink",
    preview: {
      lightBg: "#f8f7f5",
      lightText: "#262320",
      lightLink: "#536074",
      darkBg: "#1f2024",
      darkText: "#e6e5e0",
      darkLink: "#b0bdd1",
    },
    light: {
      bg: "oklch(0.985 0.002 85)",
      fg: "oklch(0.24 0.004 85)",
      primary: "oklch(0.36 0.012 255)",
      primaryFg: "oklch(0.985 0.002 85)",
      siteAccent: "oklch(0.45 0.02 242)",
      muted: "oklch(0.95 0.003 85)",
      mutedFg: "oklch(0.5 0.006 85)",
      border: "oklch(0.89 0.003 85)",
      destructive: "oklch(0.56 0.2 24)",
      success: "oklch(0.49 0.1 170)",
      dashBg: "oklch(0.97 0.002 85)",
    },
    dark: {
      bg: "oklch(0.22 0.006 260)",
      fg: "oklch(0.94 0.004 85)",
      primary: "oklch(0.83 0.015 248)",
      primaryFg: "oklch(0.18 0.008 260)",
      siteAccent: "oklch(0.8 0.03 238)",
      muted: "oklch(0.28 0.006 260)",
      mutedFg: "oklch(0.66 0.004 85)",
      border: "oklch(0.34 0.006 260)",
      destructive: "oklch(0.67 0.18 22)",
      success: "oklch(0.62 0.11 170)",
      dashBg: "oklch(0.19 0.005 260)",
    },
  }),

  defineTheme({
    id: "dune",
    name: "Dune",
    preview: {
      lightBg: "#f7efe3",
      lightText: "#3b332a",
      lightLink: "#2d756f",
      darkBg: "#243f45",
      darkText: "#e3d7c7",
      darkLink: "#82cdc1",
    },
    light: {
      bg: "oklch(0.972 0.01 82)",
      fg: "oklch(0.29 0.018 55)",
      primary: "oklch(0.44 0.085 200)",
      primaryFg: "oklch(0.985 0.004 82)",
      siteAccent: "oklch(0.53 0.075 187)",
      muted: "oklch(0.934 0.013 82)",
      mutedFg: "oklch(0.52 0.014 55)",
      border: "oklch(0.885 0.015 82)",
      destructive: "oklch(0.54 0.18 20)",
      success: "oklch(0.49 0.11 175)",
      dashBg: "oklch(0.952 0.008 82)",
    },
    dark: {
      bg: "oklch(0.265 0.02 210)",
      fg: "oklch(0.88 0.012 82)",
      primary: "oklch(0.8 0.08 190)",
      primaryFg: "oklch(0.22 0.018 210)",
      siteAccent: "oklch(0.77 0.09 178)",
      muted: "oklch(0.325 0.018 210)",
      mutedFg: "oklch(0.67 0.012 82)",
      border: "oklch(0.38 0.016 210)",
      destructive: "oklch(0.68 0.17 18)",
      success: "oklch(0.65 0.12 175)",
      dashBg: "oklch(0.24 0.016 210)",
    },
  }),

  defineTheme({
    id: "moss",
    name: "Moss",
    preview: {
      lightBg: "#d7dbc7",
      lightText: "#2f382d",
      lightLink: "#446b4f",
      darkBg: "#182019",
      darkText: "#b4bea8",
      darkLink: "#7fb88f",
    },
    light: {
      bg: "oklch(0.882 0.026 125)",
      fg: "oklch(0.27 0.032 140)",
      primary: "oklch(0.36 0.055 148)",
      primaryFg: "oklch(0.94 0.016 125)",
      siteAccent: "oklch(0.44 0.05 138)",
      muted: "oklch(0.84 0.028 125)",
      mutedFg: "oklch(0.46 0.024 140)",
      border: "oklch(0.79 0.028 125)",
      destructive: "oklch(0.54 0.17 24)",
      success: "oklch(0.5 0.09 210)",
      searchMarkBg: "oklch(0.81 0.05 100 / 0.65)",
      searchMarkColor: "oklch(0.31 0.03 130)",
      dashBg: "oklch(0.855 0.023 125)",
    },
    dark: {
      bg: "oklch(0.18 0.018 145)",
      fg: "oklch(0.8 0.02 126)",
      primary: "oklch(0.77 0.06 145)",
      primaryFg: "oklch(0.15 0.018 145)",
      siteAccent: "oklch(0.8 0.07 150)",
      muted: "oklch(0.24 0.018 145)",
      mutedFg: "oklch(0.61 0.015 126)",
      border: "oklch(0.305 0.018 145)",
      destructive: "oklch(0.65 0.16 22)",
      success: "oklch(0.61 0.09 210)",
      searchMarkBg: "oklch(0.39 0.045 110 / 0.55)",
      searchMarkColor: "oklch(0.9 0.03 126)",
      dashBg: "oklch(0.16 0.016 145)",
    },
  }),

  defineTheme({
    id: "stone",
    name: "Stone",
    preview: {
      lightBg: "#efeeeb",
      lightText: "#3e3b38",
      lightLink: "#677184",
      darkBg: "#202126",
      darkText: "#d1cec8",
      darkLink: "#aeb7c5",
    },
    light: {
      bg: "oklch(0.96 0.002 90)",
      fg: "oklch(0.31 0.005 90)",
      primary: "oklch(0.42 0.008 248)",
      primaryFg: "oklch(0.97 0.002 90)",
      siteAccent: "oklch(0.5 0.018 230)",
      muted: "oklch(0.92 0.002 90)",
      mutedFg: "oklch(0.56 0.004 90)",
      border: "oklch(0.87 0.002 90)",
      destructive: "oklch(0.55 0.2 24)",
      success: "oklch(0.5 0.1 170)",
      searchMarkBg: "oklch(0.88 0.01 240 / 0.4)",
      searchMarkColor: "oklch(0.28 0.01 240)",
      dashBg: "oklch(0.94 0.002 90)",
    },
    dark: {
      bg: "oklch(0.19 0.004 250)",
      fg: "oklch(0.84 0.003 90)",
      primary: "oklch(0.78 0.012 240)",
      primaryFg: "oklch(0.19 0.004 250)",
      siteAccent: "oklch(0.8 0.022 222)",
      muted: "oklch(0.25 0.004 250)",
      mutedFg: "oklch(0.62 0.003 90)",
      border: "oklch(0.31 0.004 250)",
      destructive: "oklch(0.67 0.18 22)",
      success: "oklch(0.62 0.1 170)",
      searchMarkBg: "oklch(0.38 0.012 240 / 0.45)",
      searchMarkColor: "oklch(0.92 0.01 90)",
      dashBg: "oklch(0.17 0.004 250)",
    },
  }),

  defineTheme({
    id: "iris",
    name: "Iris",
    preview: {
      lightBg: "#f5edf5",
      lightText: "#332634",
      lightLink: "#8a518d",
      darkBg: "#201724",
      darkText: "#ddcfe0",
      darkLink: "#d0a0d8",
    },
    light: {
      bg: "oklch(0.972 0.01 320)",
      fg: "oklch(0.28 0.018 315)",
      primary: "oklch(0.49 0.09 315)",
      primaryFg: "oklch(0.985 0.006 320)",
      siteAccent: "oklch(0.58 0.08 320)",
      muted: "oklch(0.934 0.012 320)",
      mutedFg: "oklch(0.53 0.012 315)",
      border: "oklch(0.885 0.013 320)",
      destructive: "oklch(0.56 0.19 15)",
      success: "oklch(0.49 0.12 165)",
      searchMarkBg: "oklch(0.9 0.05 315 / 0.45)",
      searchMarkColor: "oklch(0.32 0.03 312)",
      dashBg: "oklch(0.952 0.008 320)",
    },
    dark: {
      bg: "oklch(0.185 0.018 305)",
      fg: "oklch(0.88 0.01 320)",
      primary: "oklch(0.8 0.09 312)",
      primaryFg: "oklch(0.18 0.015 305)",
      siteAccent: "oklch(0.79 0.11 318)",
      muted: "oklch(0.245 0.016 305)",
      mutedFg: "oklch(0.64 0.01 320)",
      border: "oklch(0.305 0.016 305)",
      destructive: "oklch(0.68 0.18 18)",
      success: "oklch(0.62 0.13 165)",
      searchMarkBg: "oklch(0.4 0.06 300 / 0.45)",
      searchMarkColor: "oklch(0.92 0.03 320)",
      dashBg: "oklch(0.165 0.015 305)",
    },
  }),

  defineTheme({
    id: "clay",
    name: "Clay",
    preview: {
      lightBg: "#f6ede5",
      lightText: "#403028",
      lightLink: "#a35b3f",
      darkBg: "#261a16",
      darkText: "#e4d3ca",
      darkLink: "#e29c77",
    },
    light: {
      bg: "oklch(0.973 0.011 45)",
      fg: "oklch(0.29 0.022 35)",
      primary: "oklch(0.49 0.085 34)",
      primaryFg: "oklch(0.986 0.006 45)",
      siteAccent: "oklch(0.56 0.09 28)",
      muted: "oklch(0.936 0.013 45)",
      mutedFg: "oklch(0.53 0.016 35)",
      border: "oklch(0.888 0.014 45)",
      destructive: "oklch(0.54 0.18 20)",
      success: "oklch(0.5 0.1 145)",
      searchMarkBg: "oklch(0.9 0.05 42 / 0.55)",
      searchMarkColor: "oklch(0.33 0.03 34)",
      dashBg: "oklch(0.954 0.009 45)",
    },
    dark: {
      bg: "oklch(0.19 0.017 28)",
      fg: "oklch(0.88 0.011 45)",
      primary: "oklch(0.76 0.08 34)",
      primaryFg: "oklch(0.17 0.015 28)",
      siteAccent: "oklch(0.78 0.1 26)",
      muted: "oklch(0.25 0.016 28)",
      mutedFg: "oklch(0.65 0.01 45)",
      border: "oklch(0.31 0.016 28)",
      destructive: "oklch(0.67 0.18 18)",
      success: "oklch(0.63 0.11 145)",
      searchMarkBg: "oklch(0.4 0.05 40 / 0.5)",
      searchMarkColor: "oklch(0.93 0.025 45)",
      dashBg: "oklch(0.17 0.014 28)",
    },
  }),

  defineTheme({
    id: "mist",
    name: "Mist",
    preview: {
      lightBg: "#edf2f5",
      lightText: "#2d3640",
      lightLink: "#4c7192",
      darkBg: "#1c232c",
      darkText: "#d7dfe7",
      darkLink: "#9fbad1",
    },
    light: {
      bg: "oklch(0.978 0.006 230)",
      fg: "oklch(0.29 0.015 240)",
      primary: "oklch(0.46 0.055 232)",
      primaryFg: "oklch(0.986 0.003 230)",
      siteAccent: "oklch(0.54 0.05 220)",
      muted: "oklch(0.94 0.008 230)",
      mutedFg: "oklch(0.53 0.012 240)",
      border: "oklch(0.89 0.008 230)",
      destructive: "oklch(0.55 0.19 22)",
      success: "oklch(0.5 0.09 185)",
      searchMarkBg: "oklch(0.91 0.03 225 / 0.45)",
      searchMarkColor: "oklch(0.32 0.025 240)",
      dashBg: "oklch(0.958 0.006 230)",
    },
    dark: {
      bg: "oklch(0.205 0.014 240)",
      fg: "oklch(0.87 0.008 230)",
      primary: "oklch(0.79 0.055 228)",
      primaryFg: "oklch(0.19 0.012 240)",
      siteAccent: "oklch(0.79 0.07 216)",
      muted: "oklch(0.265 0.013 240)",
      mutedFg: "oklch(0.66 0.008 230)",
      border: "oklch(0.325 0.013 240)",
      destructive: "oklch(0.67 0.18 20)",
      success: "oklch(0.64 0.1 185)",
      searchMarkBg: "oklch(0.41 0.035 228 / 0.45)",
      searchMarkColor: "oklch(0.93 0.02 230)",
      dashBg: "oklch(0.18 0.012 240)",
    },
  }),
];
