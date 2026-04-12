import { describe, expect, it } from "vitest";
import { defaultFeedRenderer } from "../feed.js";
import type { FeedData, FeedPostView, PostView } from "../../types.js";

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
    selfUrl: "https://example.com/feed",
    posts: [post],
  };
}

describe("feed renderers", () => {
  it("keeps Atom entry titles empty for untitled posts and strips script tags from content", () => {
    const xml = defaultFeedRenderer(
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

    expect(xml).toContain("<title></title>");
    expect(xml).toContain('<summary type="text">哈哈哈😍</summary>');
    expect(xml).toContain("<![CDATA[<p>哈哈哈😍</p>]]>");
    expect(xml).not.toContain("data-jant-meta");
    expect(xml).not.toContain('{"kind":"text"}');
  });

  it("does not expose quote attribution as feed title", () => {
    const xml = defaultFeedRenderer(
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

    expect(xml).toContain("<title></title>");
    expect(xml).toContain(
      '<summary type="text">What stands in the way becomes the way.</summary>',
    );
    expect(xml).toContain("Marcus Aurelius");
    expect(xml).toContain("https://example.com/meditations");
  });

  it("link posts point <link> to original URL with ★ permalink back to blog", () => {
    const post = makePostView({
      format: "link",
      title: "Interesting Article",
      url: "https://external.com/article",
      bodyHtml: "<p>My thoughts on this.</p>",
    });
    const data = makeFeedData(post);

    const xml = defaultFeedRenderer(data);
    // Atom <link rel="alternate"> should point to external URL
    expect(xml).toContain(
      '<link href="https://external.com/article" rel="alternate"/>',
    );
    // Atom should have <link rel="related"> back to blog
    expect(xml).toContain(
      '<link href="https://example.com/post-1" rel="related"/>',
    );
    // Atom <id> should remain the blog permalink
    expect(xml).toContain("<id>https://example.com/post-1</id>");
    // Should contain ★ permalink
    expect(xml).toContain(
      '<a href="https://example.com/post-1" title="Permalink">&nbsp;★&nbsp;</a>',
    );
  });

  it("note posts still link to blog permalink without ★", () => {
    const post = makePostView({
      format: "note",
      title: "A thought",
      bodyHtml: "<p>Just thinking.</p>",
    });
    const xml = defaultFeedRenderer(makeFeedData(post));
    expect(xml).toContain(
      '<link href="https://example.com/post-1" rel="alternate"/>',
    );
    expect(xml).not.toContain("★");
  });

  it("uses feed-specific timestamps when provided", () => {
    const xml = defaultFeedRenderer(
      makeFeedData(
        makePostView({
          feedPublishedAt: "2026-03-20T08:30:00.000Z",
          feedUpdatedAt: "2026-03-20T09:45:00.000Z",
        }),
      ),
    );

    expect(xml).toContain("<published>2026-03-20T08:30:00.000Z</published>");
    expect(xml).toContain("<updated>2026-03-20T09:45:00.000Z</updated>");
  });

  it("renders thread replies with hr separator and time element", () => {
    const reply: PostView = {
      id: "reply-1",
      permalink: "/reply-1",
      slug: "reply-1",
      format: "note",
      status: "published",
      visibility: "public",
      pinned: false,
      featured: false,
      publishedAt: "2026-03-19T12:00:00.000Z",
      publishedAtFormatted: "Mar 19, 2026",
      publishedAtTime: "12:00",
      publishedAtRelative: "now",
      updatedAt: "2026-03-19T12:00:00.000Z",
      media: [],
      collections: [],
      isLastInThread: true,
      bodyHtml: "<p>This is a reply</p>",
    };

    const xml = defaultFeedRenderer(
      makeFeedData(
        makePostView({
          title: "Thread Root",
          bodyHtml: "<p>Root content</p>",
          threadReplies: [reply],
        }),
      ),
    );

    expect(xml).toContain("<p>Root content</p>");
    expect(xml).toContain("<hr/>");
    expect(xml).toContain('<time datetime="2026-03-19T12:00:00.000Z">');
    expect(xml).toContain("<p>This is a reply</p>");
  });
});
