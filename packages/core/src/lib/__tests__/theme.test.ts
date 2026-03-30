import { describe, it, expect } from "vitest";
import {
  buildThemeStyle,
  getThemeBrowserColors,
  resolveBuiltinTheme,
} from "../theme.js";
import {
  BUILTIN_FONT_THEMES,
  getFontThemeCssVariables,
} from "../../ui/font-themes.js";
import { BUILTIN_COLOR_THEMES } from "../../ui/color-themes.js";

describe("buildThemeStyle", () => {
  it("returns empty string when no theme and no variables", () => {
    expect(buildThemeStyle(undefined)).toBe("");
    expect(buildThemeStyle(undefined, "auto", {})).toBe("");
  });

  it("generates CSS with font overrides only (no color theme)", () => {
    const theme = BUILTIN_FONT_THEMES.find(
      (f) => f.id === "system-sans",
    ) as (typeof BUILTIN_FONT_THEMES)[number];
    const fontOverrides = getFontThemeCssVariables(theme);

    const css = buildThemeStyle(undefined, "auto", fontOverrides);

    expect(css).toContain(":root:root");
    expect(css).toContain("--font-body:");
    expect(css).toContain("--font-heading:");
    expect(css).toContain("--type-body-leading:");
    expect(css).toContain("ui-sans-serif");
    expect(css).toContain("prefers-color-scheme: dark");
  });

  it("font override merges with color theme", () => {
    const fakeTheme = {
      id: "test",
      name: "Test",
      light: {
        "--primary": "oklch(0.5 0.1 200)",
        "--site-accent": "oklch(0.58 0.08 210)",
      },
      dark: {
        "--primary": "oklch(0.7 0.1 200)",
        "--site-accent": "oklch(0.76 0.08 210)",
      },
    };
    const fontOverrides = {
      "--font-body": "Georgia, serif",
      "--font-heading": "Futura, sans-serif",
    };

    const css = buildThemeStyle(fakeTheme, "auto", fontOverrides);

    expect(css).toContain("--primary:");
    expect(css).toContain("--site-accent:");
    expect(css).toContain("--font-body: Georgia, serif");
    expect(css).toContain("--font-heading: Futura, sans-serif");
  });

  it("cssVariables override theme values", () => {
    const fakeTheme = {
      id: "test",
      name: "Test",
      light: { "--font-body": "should-be-overridden" },
      dark: {},
    };
    const overrides = { "--font-body": "Charter, serif" };

    const css = buildThemeStyle(fakeTheme, "auto", overrides);

    expect(css).toContain("--font-body: Charter, serif");
    expect(css).not.toContain("should-be-overridden");
  });

  it("supports forcing dark mode without relying on system preference", () => {
    const fakeTheme = {
      id: "test",
      name: "Test",
      light: { "--primary": "oklch(0.5 0.1 200)" },
      dark: { "--primary": "oklch(0.7 0.1 200)" },
    };

    const css = buildThemeStyle(fakeTheme, "dark");

    expect(css).toContain("color-scheme: dark");
    expect(css).not.toContain('data-theme-mode="dark"');
    expect(css).not.toContain("prefers-color-scheme: dark");
  });

  it("lets forced light mode opt out of system dark preference", () => {
    const fakeTheme = {
      id: "test",
      name: "Test",
      light: { "--primary": "oklch(0.5 0.1 200)" },
      dark: { "--primary": "oklch(0.7 0.1 200)" },
    };

    const css = buildThemeStyle(fakeTheme, "light");

    expect(css).toContain(':root:root[data-theme-mode="dark"]');
    expect(css).toContain(':root:root:not([data-theme-mode="light"])');
  });

  it("resolves the active built-in theme from primary and fallback IDs", () => {
    expect(resolveBuiltinTheme("linen", "dune")?.id).toBe("linen");
    expect(resolveBuiltinTheme("", "dune")?.id).toBe("dune");
    expect(resolveBuiltinTheme("missing", "dune")).toBeUndefined();
  });

  it("returns theme-aware browser chrome colors", () => {
    const linen = BUILTIN_COLOR_THEMES.find(
      (theme) => theme.id === "linen",
    ) as (typeof BUILTIN_COLOR_THEMES)[number];

    expect(getThemeBrowserColors(linen)).toEqual({
      light: "#faf7ec",
      dark: "#121211",
    });
    expect(getThemeBrowserColors()).toEqual({
      light: "#ffffff",
      dark: "#0a0a0a",
    });
  });

  it("keeps non-oklch browser chrome colors unchanged", () => {
    expect(
      getThemeBrowserColors({
        id: "custom",
        name: "Custom",
        light: { "--background": "#f4efe5" },
        dark: { "--background": "rgb(18 18 17)" },
      }),
    ).toEqual({
      light: "#f4efe5",
      dark: "rgb(18 18 17)",
    });
  });
});
