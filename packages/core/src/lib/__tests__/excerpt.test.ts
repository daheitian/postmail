/**
 * HTML Excerpt Utility Tests
 */

import { describe, it, expect } from "vitest";
import { stripHtml, getHtmlExcerpt } from "../excerpt.js";

// =============================================================================
// stripHtml
// =============================================================================

describe("stripHtml", () => {
  it("removes simple HTML tags", () => {
    expect(stripHtml("<p>Hello world</p>")).toBe("Hello world");
  });

  it("removes nested tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
  });

  it("handles self-closing tags", () => {
    expect(stripHtml("Hello<br/>world")).toBe("Helloworld");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("no tags here")).toBe("no tags here");
  });
});

// =============================================================================
// getHtmlExcerpt
// =============================================================================

describe("getHtmlExcerpt", () => {
  it("returns short content as-is with hasMore=false", () => {
    const html = "<p>Short post.</p>";
    const result = getHtmlExcerpt(html);
    expect(result.excerpt).toBe("<p>Short post.</p>");
    expect(result.hasMore).toBe(false);
  });

  it("takes first two paragraphs when total fits under 500 chars", () => {
    const p1 = `<p>${"A".repeat(200)}</p>`;
    const p2 = `<p>${"B".repeat(200)}</p>`;
    const p3 = `<p>${"C".repeat(200)}</p>`;
    const html = p1 + p2 + p3;

    const result = getHtmlExcerpt(html);
    expect(result.excerpt).toBe(p1 + p2);
    expect(result.hasMore).toBe(true);
  });

  it("keeps at least one paragraph even if it exceeds 500 chars", () => {
    const p1 = `<p>${"A".repeat(600)}</p>`;
    const p2 = `<p>${"B".repeat(100)}</p>`;
    const html = p1 + p2;

    const result = getHtmlExcerpt(html);
    expect(result.excerpt).toBe(p1);
    expect(result.hasMore).toBe(true);
  });

  it("returns all paragraphs when total is under 500 chars", () => {
    const p1 = "<p>First paragraph.</p>";
    const p2 = "<p>Second paragraph.</p>";
    const p3 = "<p>Third paragraph.</p>";
    const html = p1 + p2 + p3;

    const result = getHtmlExcerpt(html);
    expect(result.excerpt).toBe(html);
    expect(result.hasMore).toBe(false);
  });

  it("honors <!--more--> marker", () => {
    const html = "<p>Intro paragraph.</p><!--more--><p>Rest of the post.</p>";
    const result = getHtmlExcerpt(html);
    expect(result.excerpt).toBe("<p>Intro paragraph.</p>");
    expect(result.hasMore).toBe(true);
  });

  it("handles content with no paragraph tags", () => {
    const html = "Just plain text without paragraphs";
    const result = getHtmlExcerpt(html);
    expect(result.excerpt).toBe(html);
    expect(result.hasMore).toBe(false);
  });

  it("handles single paragraph under 500 chars", () => {
    const html = `<p>${"A".repeat(100)}</p>`;
    const result = getHtmlExcerpt(html);
    expect(result.excerpt).toBe(html);
    expect(result.hasMore).toBe(false);
  });

  it("counts plain text length, not HTML length", () => {
    // Each paragraph has ~240 chars of plain text but more in HTML
    const p1 = `<p>${"A".repeat(240)}</p>`;
    const p2 = `<p>${"B".repeat(240)}</p>`;
    const p3 = `<p>${"C".repeat(240)}</p>`;
    const html = p1 + p2 + p3;

    const result = getHtmlExcerpt(html);
    // 240 + 240 = 480 < 500, so first two paragraphs fit
    expect(result.excerpt).toBe(p1 + p2);
    expect(result.hasMore).toBe(true);
  });

  it("handles paragraphs with nested HTML elements", () => {
    const p1 = `<p>Hello <strong>bold</strong> and <em>italic</em> text here.</p>`;
    const p2 = `<p>${"B".repeat(500)}</p>`;
    const html = p1 + p2;

    const result = getHtmlExcerpt(html);
    // First paragraph text is ~37 chars, second is 500 chars
    // Total would exceed 500, but first paragraph was already added
    expect(result.excerpt).toBe(p1);
    expect(result.hasMore).toBe(true);
  });
});
