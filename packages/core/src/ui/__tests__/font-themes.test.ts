import { describe, it, expect } from "vitest";
import {
  BUILTIN_FONT_THEMES,
  getFontThemeCssVariables,
} from "../font-themes.js";

describe("BUILTIN_FONT_THEMES", () => {
  it("contains 6 themes", () => {
    expect(BUILTIN_FONT_THEMES).toHaveLength(6);
  });

  it("has 'default' as the first theme", () => {
    expect(BUILTIN_FONT_THEMES[0].id).toBe("default");
  });

  it("each theme has required fields", () => {
    for (const theme of BUILTIN_FONT_THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.name.message).toBeTruthy();
      expect(theme.headingFontFamily).toBeTruthy();
      expect(theme.bodyFontFamily).toBeTruthy();
      expect(theme.cssVariables).toBeTruthy();
      expect(theme.description.message).toBeTruthy();
    }
  });

  it("has no duplicate IDs", () => {
    const ids = BUILTIN_FONT_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes expected theme IDs", () => {
    const ids = BUILTIN_FONT_THEMES.map((t) => t.id);
    expect(ids).toContain("default");
    expect(ids).toContain("system-sans");
    expect(ids).toContain("humanist-sans");
    expect(ids).toContain("modern-editorial");
    expect(ids).toContain("literary");
    expect(ids).toContain("geometric");
  });

  it("default theme uses serif heading and sans body", () => {
    const defaultTheme = BUILTIN_FONT_THEMES.find(
      (t) => t.id === "default",
    ) as (typeof BUILTIN_FONT_THEMES)[number];
    expect(defaultTheme.name.message).toBe("Notebook");
    expect(defaultTheme.headingFontFamily).not.toBe(
      defaultTheme.bodyFontFamily,
    );
    expect(defaultTheme.headingFontFamily).toContain("Charter");
    expect(defaultTheme.bodyFontFamily).toContain("ui-sans-serif");
  });

  it("pairing themes have distinct heading and body fonts", () => {
    const pairingIds = ["default", "modern-editorial"];
    for (const id of pairingIds) {
      const theme = BUILTIN_FONT_THEMES.find(
        (t) => t.id === id,
      ) as (typeof BUILTIN_FONT_THEMES)[number];
      expect(theme.headingFontFamily).not.toBe(theme.bodyFontFamily);
    }
  });

  it("system sans uses the same font for heading and body", () => {
    const theme = BUILTIN_FONT_THEMES.find(
      (item) => item.id === "system-sans",
    ) as (typeof BUILTIN_FONT_THEMES)[number];
    expect(theme.headingFontFamily).toBe(theme.bodyFontFamily);
  });

  it("humanist sans uses Source Sans 3 for both heading and body", () => {
    const theme = BUILTIN_FONT_THEMES.find(
      (item) => item.id === "humanist-sans",
    ) as (typeof BUILTIN_FONT_THEMES)[number];
    expect(theme.headingFontFamily).toBe(theme.bodyFontFamily);
    expect(theme.bodyFontFamily).toContain("Source Sans 3 Variable");
  });

  it("exposes font theme css variables for injection", () => {
    const theme = BUILTIN_FONT_THEMES.find(
      (item) => item.id === "geometric",
    ) as (typeof BUILTIN_FONT_THEMES)[number];
    const variables = getFontThemeCssVariables(theme);

    expect(variables["--font-body"]).toBe(theme.bodyFontFamily);
    expect(variables["--font-heading"]).toBe(theme.headingFontFamily);
    expect(variables["--type-display-tracking"]).toBe("-0.06em");
  });
});
