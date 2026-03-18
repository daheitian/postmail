/**
 * Built-in Color Themes
 *
 * Each theme defines CSS variable overrides for light and dark modes.
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
}

export interface ColorThemeGroup {
  id: string;
  themeIds: string[];
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
  light: ThemeModeColors;
  dark: ThemeModeColors;
}): ColorTheme {
  const { light, dark } = opts;
  return {
    id: opts.id,
    name: opts.name,
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
    light: {
      bg: "oklch(0.975 0.015 92)",
      fg: "oklch(0.29 0.01 70)",
      primary: "oklch(0.4347 0.0569 149.44)",
      primaryFg: "oklch(0.985 0.008 92)",
      siteAccent: "oklch(0.512 0.044 145)",
      muted: "oklch(0.942 0.014 96)",
      mutedFg: "oklch(0.52 0.008 70)",
      border: "oklch(0.892 0.014 98)",
      destructive: "oklch(0.56 0.21 24)",
      success: "oklch(0.56 0.11 158)",
      dashBg: "oklch(0.955 0.012 92)",
    },
    dark: {
      bg: "oklch(0.182 0.003 95)",
      fg: "oklch(0.895 0.006 88)",
      primary: "oklch(0.768 0.04 149)",
      primaryFg: "oklch(0.17 0.003 95)",
      siteAccent: "oklch(0.802 0.035 145)",
      muted: "oklch(0.238 0.003 95)",
      mutedFg: "oklch(0.67 0.005 88)",
      border: "oklch(0.305 0.003 95)",
      destructive: "oklch(0.67 0.18 22)",
      success: "oklch(0.66 0.075 156)",
      searchMarkBg: "oklch(0.37 0.026 82 / 0.42)",
      searchMarkColor: "oklch(0.94 0.012 90)",
      dashBg: "oklch(0.165 0.003 95)",
    },
  }),

  defineTheme({
    id: "dune",
    name: "Dune",
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
      searchMarkBg: "oklch(0.91 0.045 190 / 0.45)",
      searchMarkColor: "oklch(0.32 0.03 198)",
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
      searchMarkBg: "oklch(0.44 0.05 188 / 0.5)",
      searchMarkColor: "oklch(0.93 0.018 84)",
      dashBg: "oklch(0.24 0.016 210)",
    },
  }),

  defineTheme({
    id: "clay",
    name: "Clay",
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
    id: "parchment",
    name: "Parchment",
    light: {
      bg: "oklch(0.978 0.018 87)",
      fg: "oklch(0.31 0.014 72)",
      primary: "oklch(0.5 0.055 78)",
      primaryFg: "oklch(0.987 0.01 88)",
      siteAccent: "oklch(0.58 0.06 72)",
      muted: "oklch(0.946 0.018 88)",
      mutedFg: "oklch(0.55 0.012 72)",
      border: "oklch(0.898 0.018 89)",
      destructive: "oklch(0.54 0.19 24)",
      success: "oklch(0.53 0.09 150)",
      searchMarkBg: "oklch(0.9 0.06 80 / 0.55)",
      searchMarkColor: "oklch(0.34 0.03 70)",
      dashBg: "oklch(0.959 0.015 87)",
    },
    dark: {
      bg: "oklch(0.205 0.016 72)",
      fg: "oklch(0.89 0.012 88)",
      primary: "oklch(0.79 0.06 82)",
      primaryFg: "oklch(0.18 0.014 72)",
      siteAccent: "oklch(0.82 0.065 76)",
      muted: "oklch(0.265 0.014 74)",
      mutedFg: "oklch(0.66 0.01 88)",
      border: "oklch(0.33 0.015 76)",
      destructive: "oklch(0.67 0.18 22)",
      success: "oklch(0.65 0.1 150)",
      searchMarkBg: "oklch(0.43 0.055 78 / 0.5)",
      searchMarkColor: "oklch(0.93 0.03 90)",
      dashBg: "oklch(0.185 0.013 72)",
    },
  }),

  defineTheme({
    id: "ink",
    name: "Ink",
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
      searchMarkBg: "oklch(0.9 0.018 238 / 0.45)",
      searchMarkColor: "oklch(0.29 0.016 246)",
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
      searchMarkBg: "oklch(0.39 0.022 240 / 0.45)",
      searchMarkColor: "oklch(0.94 0.01 90)",
      dashBg: "oklch(0.19 0.005 260)",
    },
  }),

  defineTheme({
    id: "stone",
    name: "Stone",
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
    id: "mist",
    name: "Mist",
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

  defineTheme({
    id: "slate",
    name: "Slate",
    light: {
      bg: "oklch(0.958 0.008 238)",
      fg: "oklch(0.28 0.014 242)",
      primary: "oklch(0.43 0.032 242)",
      primaryFg: "oklch(0.985 0.004 236)",
      siteAccent: "oklch(0.51 0.045 228)",
      muted: "oklch(0.918 0.009 238)",
      mutedFg: "oklch(0.52 0.01 242)",
      border: "oklch(0.85 0.01 240)",
      destructive: "oklch(0.55 0.19 20)",
      success: "oklch(0.52 0.08 188)",
      searchMarkBg: "oklch(0.89 0.025 232 / 0.45)",
      searchMarkColor: "oklch(0.3 0.02 240)",
      dashBg: "oklch(0.94 0.008 238)",
    },
    dark: {
      bg: "oklch(0.18 0.012 242)",
      fg: "oklch(0.88 0.008 230)",
      primary: "oklch(0.78 0.04 232)",
      primaryFg: "oklch(0.17 0.012 242)",
      siteAccent: "oklch(0.79 0.055 220)",
      muted: "oklch(0.245 0.012 242)",
      mutedFg: "oklch(0.64 0.008 230)",
      border: "oklch(0.31 0.012 242)",
      destructive: "oklch(0.67 0.18 20)",
      success: "oklch(0.63 0.09 188)",
      searchMarkBg: "oklch(0.39 0.03 228 / 0.45)",
      searchMarkColor: "oklch(0.93 0.02 230)",
      dashBg: "oklch(0.165 0.011 242)",
    },
  }),

  defineTheme({
    id: "ember",
    name: "Ember",
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
    id: "moss",
    name: "Moss",
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
      bg: "oklch(0.19 0.015 145)",
      fg: "oklch(0.825 0.017 126)",
      primary: "oklch(0.77 0.052 145)",
      primaryFg: "oklch(0.16 0.015 145)",
      siteAccent: "oklch(0.79 0.058 150)",
      muted: "oklch(0.248 0.015 145)",
      mutedFg: "oklch(0.63 0.013 126)",
      border: "oklch(0.315 0.015 145)",
      destructive: "oklch(0.65 0.16 22)",
      success: "oklch(0.61 0.09 210)",
      searchMarkBg: "oklch(0.4 0.04 112 / 0.5)",
      searchMarkColor: "oklch(0.91 0.026 126)",
      dashBg: "oklch(0.17 0.014 145)",
    },
  }),

  defineTheme({
    id: "iris",
    name: "Iris",
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
    id: "nocturne",
    name: "Nocturne",
    light: {
      bg: "oklch(0.962 0.01 280)",
      fg: "oklch(0.27 0.018 276)",
      primary: "oklch(0.45 0.05 266)",
      primaryFg: "oklch(0.986 0.005 282)",
      siteAccent: "oklch(0.56 0.06 258)",
      muted: "oklch(0.924 0.011 280)",
      mutedFg: "oklch(0.51 0.014 276)",
      border: "oklch(0.86 0.011 280)",
      destructive: "oklch(0.55 0.19 18)",
      success: "oklch(0.49 0.1 185)",
      searchMarkBg: "oklch(0.9 0.04 265 / 0.45)",
      searchMarkColor: "oklch(0.31 0.03 272)",
      dashBg: "oklch(0.944 0.009 280)",
    },
    dark: {
      bg: "oklch(0.155 0.018 270)",
      fg: "oklch(0.9 0.009 286)",
      primary: "oklch(0.77 0.055 258)",
      primaryFg: "oklch(0.16 0.015 270)",
      siteAccent: "oklch(0.81 0.07 246)",
      muted: "oklch(0.215 0.016 270)",
      mutedFg: "oklch(0.64 0.01 286)",
      border: "oklch(0.28 0.016 270)",
      destructive: "oklch(0.67 0.18 18)",
      success: "oklch(0.62 0.1 185)",
      searchMarkBg: "oklch(0.37 0.04 258 / 0.5)",
      searchMarkColor: "oklch(0.93 0.02 286)",
      dashBg: "oklch(0.145 0.016 270)",
    },
  }),
];

export const COLOR_THEME_GROUPS: ColorThemeGroup[] = [
  {
    id: "warm-editorial",
    themeIds: ["linen", "dune", "clay", "parchment"],
  },
  {
    id: "quiet-neutral",
    themeIds: ["ink", "stone", "mist", "slate"],
  },
  {
    id: "distinctive-mood",
    themeIds: ["ember", "moss", "iris", "nocturne"],
  },
];

function isColorTheme(theme: ColorTheme | undefined): theme is ColorTheme {
  return !!theme;
}

export function getGroupedColorThemes(
  themes: ColorTheme[] = BUILTIN_COLOR_THEMES,
): Array<{ id: string; themes: ColorTheme[] }> {
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  const assignedIds = new Set(
    COLOR_THEME_GROUPS.flatMap((group) => group.themeIds),
  );

  const groups = COLOR_THEME_GROUPS.map((group) => ({
    id: group.id,
    themes: group.themeIds.map((id) => themeById.get(id)).filter(isColorTheme),
  })).filter((group) => group.themes.length > 0);

  const ungroupedThemes = themes.filter((theme) => !assignedIds.has(theme.id));

  if (ungroupedThemes.length > 0) {
    groups.push({
      id: "other",
      themes: ungroupedThemes,
    });
  }

  return groups;
}
