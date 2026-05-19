import { describe, expect, it } from "vitest";
import { buildArticleJsonLd, buildWebSiteJsonLd } from "../structured-data.js";

describe("buildArticleJsonLd", () => {
  it("builds a BlogPosting with required fields", () => {
    const data = buildArticleJsonLd({
      headline: "Hello world",
      url: "https://site.com/hello",
      datePublished: "2026-01-01T00:00:00.000Z",
      dateModified: "2026-01-02T00:00:00.000Z",
      authorName: "Jant",
    });

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Hello world",
      datePublished: "2026-01-01T00:00:00.000Z",
      dateModified: "2026-01-02T00:00:00.000Z",
      url: "https://site.com/hello",
      mainEntityOfPage: { "@type": "WebPage", "@id": "https://site.com/hello" },
      author: { "@type": "Person", name: "Jant" },
    });
  });

  it("omits description and image when not provided", () => {
    const data = buildArticleJsonLd({
      headline: "Hello",
      url: "https://site.com/hello",
      datePublished: "2026-01-01T00:00:00.000Z",
      dateModified: "2026-01-01T00:00:00.000Z",
      authorName: "Jant",
    });

    expect(data).not.toHaveProperty("description");
    expect(data).not.toHaveProperty("image");
  });

  it("includes description and image when provided", () => {
    const data = buildArticleJsonLd({
      headline: "Hello",
      description: "A short note.",
      url: "https://site.com/hello",
      datePublished: "2026-01-01T00:00:00.000Z",
      dateModified: "2026-01-01T00:00:00.000Z",
      imageUrl: "https://site.com/m/cover.png",
      authorName: "Jant",
    });

    expect(data.description).toBe("A short note.");
    expect(data.image).toBe("https://site.com/m/cover.png");
  });
});

describe("buildWebSiteJsonLd", () => {
  it("builds a WebSite with a SearchAction when a search template is given", () => {
    const data = buildWebSiteJsonLd({
      name: "Jant",
      url: "https://site.com/",
      searchUrlTemplate: "https://site.com/search?q={search_term_string}",
    });

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Jant",
      url: "https://site.com/",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://site.com/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    });
  });

  it("omits the SearchAction when no search template is given", () => {
    const data = buildWebSiteJsonLd({
      name: "Jant",
      url: "https://site.com/",
    });

    expect(data).not.toHaveProperty("potentialAction");
  });
});
