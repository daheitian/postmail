import { describe, expect, it } from "vitest";
import { coalesceDisplayText, normalizeDisplayText } from "../display-text.js";

describe("normalizeDisplayText", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeDisplayText("  Hosted account  ")).toBe("Hosted account");
  });

  it("returns undefined for empty or whitespace-only values", () => {
    expect(normalizeDisplayText("")).toBeUndefined();
    expect(normalizeDisplayText("   ")).toBeUndefined();
    expect(normalizeDisplayText("\u200B\u2060")).toBeUndefined();
    expect(normalizeDisplayText(undefined)).toBeUndefined();
  });
});

describe("coalesceDisplayText", () => {
  it("returns the first non-empty candidate", () => {
    expect(
      coalesceDisplayText("   ", undefined, "cloud.example", "Hosted account"),
    ).toBe("cloud.example");
  });

  it("returns undefined when every candidate is empty", () => {
    expect(coalesceDisplayText("", "   ", undefined, null)).toBeUndefined();
  });
});
