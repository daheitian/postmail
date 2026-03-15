import { describe, expect, it } from "vitest";
import { buildPageTitle } from "../page-title.js";

describe("buildPageTitle", () => {
  it("joins non-empty parts with separators", () => {
    expect(buildPageTitle("Featured", "Page 2", "My Blog")).toBe(
      "Featured - Page 2 - My Blog",
    );
  });

  it("skips blank and missing parts", () => {
    expect(buildPageTitle("Search", " ", undefined, "My Blog")).toBe(
      "Search - My Blog",
    );
  });

  it("returns an empty string when every part is empty", () => {
    expect(buildPageTitle("", " ", null)).toBe("");
  });
});
