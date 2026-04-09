import { describe, it, expect } from "vitest";
import {
  BUILTIN_FONT_THEMES,
  DEFAULT_FONT_CJK_SERIF_FALLBACK,
  getCjkSerifCssVariables,
  getFontThemeCssVariables,
} from "../font-themes.js";

describe("BUILTIN_FONT_THEMES", () => {
  it("contains 6 themes", () => {
    expect(BUILTIN_FONT_THEMES).toHaveLength(7);
  });

  it("has 'tufte' as the first theme", () => {
    expect(BUILTIN_FONT_THEMES[0].id).toBe("tufte");
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
    expect(ids).toContain("classic");
    expect(ids).toContain("system-sans");
    expect(ids).toContain("humanist-sans");
    expect(ids).toContain("modern-editorial");
    expect(ids).toContain("literary");
    expect(ids).toContain("tufte");
    expect(ids).toContain("geometric");
  });

  it("classic theme uses serif heading and sans body", () => {
    const defaultTheme = BUILTIN_FONT_THEMES.find(
      (t) => t.id === "classic",
    ) as (typeof BUILTIN_FONT_THEMES)[number];
    expect(defaultTheme.name.message).toBe("Classic");
    expect(defaultTheme.headingFontFamily).not.toBe(
      defaultTheme.bodyFontFamily,
    );
    expect(defaultTheme.headingFontFamily).toContain("Charter");
    expect(defaultTheme.bodyFontFamily).toContain("ui-sans-serif");
  });

  it("pairing themes have distinct heading and body fonts", () => {
    const pairingIds = ["classic", "modern-editorial"];
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
    expect(variables["--type-label-weight"]).toBe("var(--fw-semibold)");
  });

  it("routes zh-Hans to the simplified CJK serif fallback first", () => {
    const variables = getCjkSerifCssVariables("zh-Hans");
    const stack = variables["--font-cjk-serif-fallback"];

    expect(stack).toContain('"Songti SC"');
    expect(stack).toContain('"Noto Serif SC"');
    expect(stack.indexOf('"Songti SC"')).toBeLessThan(
      stack.indexOf('"Noto Serif SC"'),
    );
  });

  it("routes zh-Hant to the traditional CJK serif fallback first", () => {
    const variables = getCjkSerifCssVariables("zh-Hant");
    const stack = variables["--font-cjk-serif-fallback"];

    expect(stack).toContain('"Songti TC"');
    expect(stack).toContain('"Noto Serif TC"');
    expect(stack.indexOf('"Songti TC"')).toBeLessThan(
      stack.indexOf('"Noto Serif TC"'),
    );
  });

  it("routes ja to the Japanese CJK serif fallback", () => {
    const variables = getCjkSerifCssVariables("ja");
    const stack = variables["--font-cjk-serif-fallback"];

    expect(stack).toContain('"Noto Serif JP"');
  });

  it("routes ko to the Korean CJK serif fallback", () => {
    const variables = getCjkSerifCssVariables("ko");
    const stack = variables["--font-cjk-serif-fallback"];

    expect(stack).toContain('"Noto Serif KR"');
  });

  it("does not inject a runtime override when CJK is off", () => {
    expect(getCjkSerifCssVariables("off")).toEqual({});
  });

  it("does not inject a runtime override for unrecognized values", () => {
    expect(getCjkSerifCssVariables("en")).toEqual({});
  });

  it("keeps a default CJK serif fallback for the base tokens", () => {
    expect(DEFAULT_FONT_CJK_SERIF_FALLBACK).toContain('"Songti SC"');
    expect(DEFAULT_FONT_CJK_SERIF_FALLBACK).toContain('"Noto Serif SC"');
  });
});
