import { describe, expect, it } from "vitest";
import { defaultAtomRenderer, defaultRssRenderer } from "../feed.js";
import type { FeedData, PostView } from "../../types.js";

function makePostView(overrides: Partial<PostView> = {}): PostView {
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

function makeFeedData(post: PostView): FeedData {
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
  it("uses excerpt fallback for untitled Atom entries and strips script tags from content", () => {
    const xml = defaultAtomRenderer(
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

    expect(xml).toContain("<title>哈哈哈😍</title>");
    expect(xml).toContain('<summary type="text">哈哈哈😍</summary>');
    expect(xml).toContain("<![CDATA[<p>哈哈哈😍</p>]]>");
    expect(xml).not.toContain("data-jant-meta");
    expect(xml).not.toContain('{"kind":"text"}');
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
});
