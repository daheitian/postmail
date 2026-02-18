import { describe, it, expect } from "vitest";
import { BUILTIN_FONT_THEMES } from "../font-themes.js";

describe("BUILTIN_FONT_THEMES", () => {
  it("contains 5 themes", () => {
    expect(BUILTIN_FONT_THEMES).toHaveLength(5);
  });

  it("has 'default' as the first theme", () => {
    expect(BUILTIN_FONT_THEMES[0].id).toBe("default");
  });

  it("each theme has required fields", () => {
    for (const theme of BUILTIN_FONT_THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.name.message).toBeTruthy();
      expect(theme.fontFamily).toBeTruthy();
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
    expect(ids).toContain("serif");
    expect(ids).toContain("classical");
    expect(ids).toContain("geometric");
    expect(ids).toContain("mono");
  });
});
