import { describe, expect, it } from "vitest";
import {
  buildSearchSnippet,
  extractSearchTerms,
  highlightText,
} from "../search-snippet.js";

describe("search-snippet", () => {
  it("extracts unicode search terms", () => {
    expect(extractSearchTerms("  hello, 世界! ")).toEqual(["hello", "世界"]);
  });

  it("highlights matched terms safely", () => {
    expect(highlightText("<hello> world", "hello world")).toBe(
      "&lt;<mark>hello</mark>&gt; <mark>world</mark>",
    );
  });

  it("builds an excerpt around the first body match", () => {
    const snippet = buildSearchSnippet(
      [
        "This is a fairly long paragraph about Postgres search ranking and snippets.",
      ],
      "Postgres",
    );

    expect(snippet).toContain("<mark>Postgres</mark>");
    expect(snippet).toContain("search ranking");
  });

  it("falls back to later fields when earlier fields do not match", () => {
    const snippet = buildSearchSnippet(
      ["No match here", "A quoted passage about Jant search"],
      "Jant",
    );

    expect(snippet).toContain("<mark>Jant</mark>");
  });

  it("returns undefined when no field matches", () => {
    expect(buildSearchSnippet(["alpha", "beta"], "gamma")).toBeUndefined();
  });
});
