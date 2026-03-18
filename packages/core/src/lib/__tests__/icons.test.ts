import { describe, expect, it } from "vitest";
import { getIconSvg } from "../icons.js";

describe("getIconSvg", () => {
  it("returns SVG for a valid icon name", () => {
    const svg = getIconSvg("library");
    expect(svg).toContain("<svg");
    expect(svg).toContain("lucide-library");
  });

  it("handles multi-word kebab-case names", () => {
    const svg = getIconSvg("book-open");
    expect(svg).toContain("<svg");
    expect(svg).toContain("lucide-book-open");
  });

  it("returns null for unknown icon names", () => {
    expect(getIconSvg("nonexistent-icon-xyz")).toBeNull();
  });
});
