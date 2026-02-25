import { describe, it, expect } from "vitest";
import { extractDomain, normalizePath, isFullUrl, slugify } from "../url.js";

describe("extractDomain", () => {
  it("extracts hostname from HTTPS URL", () => {
    expect(extractDomain("https://example.com/path")).toBe("example.com");
  });

  it("extracts hostname from HTTP URL", () => {
    expect(extractDomain("http://example.com")).toBe("example.com");
  });

  it("includes www subdomain", () => {
    expect(extractDomain("https://www.example.com/path")).toBe(
      "www.example.com",
    );
  });

  it("handles URLs with ports", () => {
    expect(extractDomain("http://localhost:3000/api")).toBe("localhost");
  });

  it("handles URLs with query params and hash", () => {
    expect(extractDomain("https://example.com/path?q=1#section")).toBe(
      "example.com",
    );
  });

  it("returns null for invalid URLs", () => {
    expect(extractDomain("not-a-url")).toBe(null);
    expect(extractDomain("")).toBe(null);
  });

  it("handles complex subdomains", () => {
    expect(extractDomain("https://blog.sub.example.com")).toBe(
      "blog.sub.example.com",
    );
  });
});

describe("normalizePath", () => {
  it("converts to lowercase", () => {
    expect(normalizePath("About")).toBe("about");
    expect(normalizePath("HELLO")).toBe("hello");
  });

  it("removes leading and trailing slashes", () => {
    expect(normalizePath("/about/")).toBe("about");
    expect(normalizePath("///about///")).toBe("about");
  });

  it("collapses multiple slashes", () => {
    expect(normalizePath("about//contact")).toBe("about/contact");
    expect(normalizePath("a///b////c")).toBe("a/b/c");
  });

  it("trims whitespace", () => {
    expect(normalizePath("  about  ")).toBe("about");
  });

  it("handles combined transformations", () => {
    expect(normalizePath("  /About/Contact//  ")).toBe("about/contact");
  });

  it("returns empty string for root path", () => {
    expect(normalizePath("/")).toBe("");
    expect(normalizePath("///")).toBe("");
  });

  it("handles empty input", () => {
    expect(normalizePath("")).toBe("");
    expect(normalizePath("  ")).toBe("");
  });
});

describe("isFullUrl", () => {
  it("returns true for https URLs", () => {
    expect(isFullUrl("https://example.com")).toBe(true);
  });

  it("returns true for http URLs", () => {
    expect(isFullUrl("http://example.com")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isFullUrl("/about")).toBe(false);
    expect(isFullUrl("about")).toBe(false);
  });

  it("returns false for domain-only strings", () => {
    expect(isFullUrl("example.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isFullUrl("")).toBe(false);
  });

  it("returns false for other protocols", () => {
    expect(isFullUrl("ftp://example.com")).toBe(false);
    expect(isFullUrl("mailto:test@test.com")).toBe(false);
  });
});

describe("slugify", () => {
  it("converts text to lowercase hyphenated slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello World! This is a Test.")).toBe(
      "hello-world-this-is-a-test",
    );
  });

  it("collapses multiple spaces", () => {
    expect(slugify("Multiple   Spaces")).toBe("multiple-spaces");
  });

  it("trims leading/trailing whitespace and hyphens", () => {
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });

  it("replaces underscores with hyphens", () => {
    expect(slugify("hello_world")).toBe("hello-world");
  });

  it("handles already-slugified text", () => {
    expect(slugify("already-a-slug")).toBe("already-a-slug");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("transliterates accented characters", () => {
    expect(slugify("café & résumé")).toBe("cafe-and-resume");
  });

  it("converts Chinese characters to pinyin", () => {
    expect(slugify("书评")).toBe("shu-ping");
  });

  it("handles mixed Chinese and English text", () => {
    expect(slugify("我的 Blog")).toBe("wo-de-blog");
  });

  it("handles CJK characters with spaces", () => {
    expect(slugify("电影 评论")).toBe("dian-ying-ping-lun");
  });
});
