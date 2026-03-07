import { describe, it, expect } from "vitest";
import { detectLocaleFromHeader } from "../detect.js";

describe("detectLocaleFromHeader", () => {
  // English variants
  it("returns en for en", () => {
    expect(detectLocaleFromHeader("en")).toBe("en");
  });

  it("returns en for en-US", () => {
    expect(detectLocaleFromHeader("en-US")).toBe("en");
  });

  it("returns en for en-GB", () => {
    expect(detectLocaleFromHeader("en-GB")).toBe("en");
  });

  // Simplified Chinese
  it("maps zh-CN to zh-Hans", () => {
    expect(detectLocaleFromHeader("zh-CN")).toBe("zh-Hans");
  });

  it("maps zh-SG to zh-Hans", () => {
    expect(detectLocaleFromHeader("zh-SG")).toBe("zh-Hans");
  });

  it("maps zh-Hans to zh-Hans", () => {
    expect(detectLocaleFromHeader("zh-Hans")).toBe("zh-Hans");
  });

  // Traditional Chinese
  it("maps zh-TW to zh-Hant", () => {
    expect(detectLocaleFromHeader("zh-TW")).toBe("zh-Hant");
  });

  it("maps zh-HK to zh-Hant", () => {
    expect(detectLocaleFromHeader("zh-HK")).toBe("zh-Hant");
  });

  it("maps zh-MO to zh-Hant", () => {
    expect(detectLocaleFromHeader("zh-MO")).toBe("zh-Hant");
  });

  it("maps zh-Hant to zh-Hant", () => {
    expect(detectLocaleFromHeader("zh-Hant")).toBe("zh-Hant");
  });

  // Bare zh
  it("maps bare zh to zh-Hans", () => {
    expect(detectLocaleFromHeader("zh")).toBe("zh-Hans");
  });

  // q-value priority
  it("picks highest q-value language", () => {
    expect(detectLocaleFromHeader("fr;q=0.5,zh-CN;q=0.9,en;q=0.8")).toBe(
      "zh-Hans",
    );
  });

  it("picks first when q-values are equal (stable sort)", () => {
    expect(detectLocaleFromHeader("zh-TW,en")).toBe("zh-Hant");
  });

  it("treats missing q as q=1.0", () => {
    expect(detectLocaleFromHeader("zh-CN,en;q=0.5")).toBe("zh-Hans");
  });

  // Unsupported languages fallback
  it("falls back to en for unsupported language", () => {
    expect(detectLocaleFromHeader("fr")).toBe("en");
  });

  it("falls back to en when all languages are unsupported", () => {
    expect(detectLocaleFromHeader("fr,de,ja")).toBe("en");
  });

  it("returns supported locale when mixed with unsupported", () => {
    expect(detectLocaleFromHeader("fr,zh-TW;q=0.8")).toBe("zh-Hant");
  });

  // Edge cases
  it("returns en for undefined", () => {
    expect(detectLocaleFromHeader(undefined)).toBe("en");
  });

  it("returns en for empty string", () => {
    expect(detectLocaleFromHeader("")).toBe("en");
  });

  it("returns en for whitespace-only string", () => {
    expect(detectLocaleFromHeader("   ")).toBe("en");
  });

  it("skips entries with q=0", () => {
    expect(detectLocaleFromHeader("zh-CN;q=0,en")).toBe("en");
  });

  it("handles malformed q-values gracefully (falls back to q=1.0)", () => {
    expect(detectLocaleFromHeader("zh-CN;q=abc,en")).toBe("zh-Hans");
  });

  it("is case-insensitive", () => {
    expect(detectLocaleFromHeader("ZH-CN")).toBe("zh-Hans");
  });

  it("handles wildcard (*)", () => {
    expect(detectLocaleFromHeader("*")).toBe("en");
  });

  it("handles realistic browser header", () => {
    expect(detectLocaleFromHeader("zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7")).toBe(
      "zh-Hant",
    );
  });
});
