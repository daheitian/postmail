import { describe, expect, it } from "vitest";
import { defaultAtomRenderer, defaultRssRenderer } from "../feed.js";
import type { FeedData, FeedPostView } from "../../types.js";

function makePostView(overrides: Partial<FeedPostView> = {}): FeedPostView {
  return {
    id: "post-1",
    permalink: "/post-1",
    slug: "post-1",
    format: "note",
    status: "published",
    visibility: "public",
    pinned: false,
    featured: false,
    publishedAt: "2026-03-19T00:00:00.000Z",
    publishedAtFormatted: "Mar 19, 2026",
    publishedAtTime: "00:00",
    publishedAtRelative: "now",
    updatedAt: "2026-03-19T00:00:00.000Z",
    media: [],
    collections: [],
    isLastInThread: true,
    ...overrides,
  };
}

function makeFeedData(post: FeedPostView): FeedData {
  return {
    siteName: "Jant",
    siteDescription: "Thoughts, links, and quotes — one post at a time",
    siteUrl: "https://example.com",
    siteLanguage: "en",
    selfUrl: "https://example.com/feed/atom.xml",
    posts: [post],
  };
}

describe("feed renderers", () => {
  it("keeps Atom entry titles empty for untitled posts and strips script tags from content", () => {
    const atomXml = defaultAtomRenderer(
      makeFeedData(
        makePostView({
          title: undefined,
          summary: "哈哈哈😍",
          excerpt: "哈哈哈😍",
          bodyHtml:
            '<p>哈哈哈😍</p><script type="application/json" data-jant-meta>{"kind":"text"}</script>',
        }),
      ),
    );
    const rssXml = defaultRssRenderer(
      makeFeedData(
        makePostView({
          title: undefined,
          summary: "哈哈哈😍",
          excerpt: "哈哈哈😍",
          bodyHtml:
            '<p>哈哈哈😍</p><script type="application/json" data-jant-meta>{"kind":"text"}</script>',
        }),
      ),
    );

    expect(atomXml).toContain("<title></title>");
    expect(atomXml).toContain('<summary type="text">哈哈哈😍</summary>');
    expect(atomXml).toContain("<![CDATA[<p>哈哈哈😍</p>]]>");
    expect(atomXml).not.toContain("data-jant-meta");
    expect(atomXml).not.toContain('{"kind":"text"}');
    expect(rssXml).not.toContain("<title><![CDATA[哈哈哈😍]]></title>");
    expect(rssXml).not.toContain("data-jant-meta");
  });

  it("does not double-escape RSS titles inside CDATA", () => {
    const xml = defaultRssRenderer(
      makeFeedData(
        makePostView({
          title: "Tom & Jerry",
          bodyHtml: "<p>Cartoon chaos</p>",
        }),
      ),
    );

    expect(xml).toContain("<title><![CDATA[Tom & Jerry]]></title>");
    expect(xml).not.toContain("<title><![CDATA[Tom &amp; Jerry]]></title>");
  });

  it("does not expose quote attribution as feed title", () => {
    const atomXml = defaultAtomRenderer(
      makeFeedData(
        makePostView({
          format: "quote",
          title: "Marcus Aurelius",
          url: "https://example.com/meditations",
          quoteText: "What stands in the way becomes the way.",
          summary: undefined,
          excerpt: undefined,
        }),
      ),
    );
    const rssXml = defaultRssRenderer(
      makeFeedData(
        makePostView({
          format: "quote",
          title: "Marcus Aurelius",
          url: "https://example.com/meditations",
          quoteText: "What stands in the way becomes the way.",
          summary: undefined,
          excerpt: undefined,
        }),
      ),
    );

    expect(atomXml).toContain("<title></title>");
    expect(atomXml).toContain(
      '<summary type="text">What stands in the way becomes the way.</summary>',
    );
    expect(atomXml).toContain("Marcus Aurelius");
    expect(rssXml).not.toContain("<title><![CDATA[Marcus Aurelius]]></title>");
    expect(rssXml).toContain("What stands in the way becomes the way.");
    expect(rssXml).toContain("https://example.com/meditations");
  });

  it("uses feed-specific timestamps when provided", () => {
    const rssXml = defaultRssRenderer(
      makeFeedData(
        makePostView({
          feedPublishedAt: "2026-03-20T08:30:00.000Z",
        }),
      ),
    );
    const atomXml = defaultAtomRenderer(
      makeFeedData(
        makePostView({
          feedPublishedAt: "2026-03-20T08:30:00.000Z",
          feedUpdatedAt: "2026-03-20T09:45:00.000Z",
        }),
      ),
    );

    expect(rssXml).toContain(
      "<pubDate>Fri, 20 Mar 2026 08:30:00 GMT</pubDate>",
    );
    expect(atomXml).toContain(
      "<published>2026-03-20T08:30:00.000Z</published>",
    );
    expect(atomXml).toContain("<updated>2026-03-20T09:45:00.000Z</updated>");
  });
});
