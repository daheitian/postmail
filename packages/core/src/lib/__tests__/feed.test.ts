import { describe, expect, it } from "vitest";
import { defaultFeedRenderer } from "../feed.js";
import type {
  FeedData,
  FeedPostView,
  MediaView,
  PostView,
} from "../../types.js";

function makeMediaView(overrides: Partial<MediaView> = {}): MediaView {
  return {
    id: "med_1",
    url: "https://example.com/media/file.bin",
    thumbnailUrl: "https://example.com/media/file.bin",
    mimeType: "application/octet-stream",
    ...overrides,
  };
}

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

  it("strips embed iframes and replaces them with the fallback link", () => {
    const post = makePostView({
      bodyHtml:
        "<p>Watch this:</p>" +
        '<figure class="tiptap-embed-figure" data-provider="youtube" data-orientation="landscape">' +
        '<div class="tiptap-embed-frame">' +
        '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" sandbox="allow-scripts" loading="lazy"></iframe>' +
        "</div>" +
        '<a class="tiptap-embed-fallback" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer">YouTube →</a>' +
        "</figure>",
    });
    const xml = defaultFeedRenderer(makeFeedData(post));
    expect(xml).not.toContain("<iframe");
    expect(xml).not.toContain("tiptap-embed-figure");
    expect(xml).toContain("tiptap-embed-fallback");
    expect(xml).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("strips raw HTML blocks entirely", () => {
    const post = makePostView({
      bodyHtml:
        "<p>Sign up:</p>" +
        '<div class="tiptap-html-block"><script src="https://letterbird.co/embed/v1.js"></script></div>',
    });
    const xml = defaultFeedRenderer(makeFeedData(post));
    expect(xml).not.toContain("tiptap-html-block");
    expect(xml).not.toContain("letterbird.co/embed/v1.js");
    expect(xml).not.toContain("<script");
    expect(xml).toContain("<p>Sign up:</p>");
  });

  it("removes stray iframes even outside embed figures", () => {
    const post = makePostView({
      bodyHtml: '<p>Hi</p><iframe src="https://example.com"></iframe>',
    });
    const xml = defaultFeedRenderer(makeFeedData(post));
    expect(xml).not.toContain("<iframe");
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

  it("embeds image attachments as figures with alt text caption", () => {
    const post = makePostView({
      bodyHtml: "<p>Look at this.</p>",
      media: [
        makeMediaView({
          id: "med_img",
          url: "https://example.com/media/photo.jpg",
          thumbnailUrl: "https://example.com/media/photo-thumb.jpg",
          mimeType: "image/jpeg",
          altText: "A red bicycle",
          width: 1200,
          height: 800,
          size: 245_000,
        }),
      ],
    });
    const xml = defaultFeedRenderer(makeFeedData(post));

    expect(xml).toContain('<a href="https://example.com/media/photo.jpg">');
    expect(xml).toContain(
      '<img src="https://example.com/media/photo.jpg" alt="A red bicycle" width="1200" height="800"/>',
    );
    expect(xml).toContain("<figcaption>A red bicycle</figcaption>");
    expect(xml).toContain(
      '<link rel="enclosure" type="image/jpeg" href="https://example.com/media/photo.jpg" length="245000"',
    );
  });

  it("renders video attachments as poster + caption (never inline <video>)", () => {
    const post = makePostView({
      media: [
        makeMediaView({
          id: "med_vid",
          url: "https://example.com/media/clip.mp4",
          thumbnailUrl: "https://example.com/media/clip-thumb.jpg",
          posterUrl: "https://example.com/media/clip-poster.jpg",
          mimeType: "video/mp4",
          durationSeconds: 42,
          size: 1_200_000,
          width: 1920,
          height: 1080,
        }),
      ],
    });
    const xml = defaultFeedRenderer(makeFeedData(post));

    expect(xml).not.toContain("<video");
    expect(xml).toContain(
      '<img src="https://example.com/media/clip-poster.jpg"',
    );
    expect(xml).toContain("Watch video · 0:42 · 1.1 MB");
    expect(xml).toContain(
      '<link rel="enclosure" type="video/mp4" href="https://example.com/media/clip.mp4" length="1200000"',
    );
  });

  it("renders audio attachments as a labeled link with duration and size", () => {
    const post = makePostView({
      media: [
        makeMediaView({
          id: "med_audio",
          url: "https://example.com/media/song.mp3",
          thumbnailUrl: "https://example.com/media/song.mp3",
          mimeType: "audio/mpeg",
          originalName: "song.mp3",
          durationSeconds: 215,
          size: 5_242_880,
        }),
      ],
    });
    const xml = defaultFeedRenderer(makeFeedData(post));

    expect(xml).toContain(
      '<a href="https://example.com/media/song.mp3">song.mp3</a> (3:35 · 5.0 MB)',
    );
    expect(xml).toContain(
      '<link rel="enclosure" type="audio/mpeg" href="https://example.com/media/song.mp3" length="5242880" title="song.mp3"',
    );
  });

  it("inlines text-attachment summaries with a link to the rendered preview", () => {
    const post = makePostView({
      permalink: "/post-1",
      media: [
        makeMediaView({
          id: "med_txt",
          url: "https://example.com/media/notes.md",
          thumbnailUrl: "https://example.com/media/notes.md",
          mimeType: "text/markdown",
          originalName: "notes.md",
          summary: "Outline of the talk: intro, three acts, takeaways.",
          chars: 4200,
        }),
      ],
    });
    const xml = defaultFeedRenderer(makeFeedData(post));

    expect(xml).toContain("<strong>notes.md</strong>");
    expect(xml).toContain("Outline of the talk: intro, three acts, takeaways.");
    expect(xml).toContain("4200 chars");
    expect(xml).toContain(
      '<a href="https://example.com/post-1/text/med_txt">Read full text →</a>',
    );
  });

  it("renders document attachments as a link with size suffix", () => {
    const post = makePostView({
      media: [
        makeMediaView({
          id: "med_pdf",
          url: "https://example.com/media/spec.pdf",
          thumbnailUrl: "https://example.com/media/spec.pdf",
          mimeType: "application/pdf",
          originalName: "spec.pdf",
          size: 524_288,
        }),
      ],
    });
    const xml = defaultFeedRenderer(makeFeedData(post));

    expect(xml).toContain(
      '<a href="https://example.com/media/spec.pdf">spec.pdf</a> (512 KB)',
    );
    expect(xml).toContain(
      '<link rel="enclosure" type="application/pdf" href="https://example.com/media/spec.pdf" length="524288" title="spec.pdf"',
    );
  });

  it("escapes XML special characters in media URLs and names", () => {
    const post = makePostView({
      media: [
        makeMediaView({
          id: "med_x",
          url: "https://example.com/media/file.pdf?a=1&b=2",
          thumbnailUrl: "https://example.com/media/file.pdf?a=1&b=2",
          mimeType: "application/pdf",
          originalName: "Q&A <draft>.pdf",
          size: 1024,
        }),
      ],
    });
    const xml = defaultFeedRenderer(makeFeedData(post));

    expect(xml).not.toContain("?a=1&b=2");
    expect(xml).toContain("?a=1&amp;b=2");
    expect(xml).toContain("Q&amp;A &lt;draft&gt;.pdf");
  });

  it("emits no enclosure links and no media block when post has no media", () => {
    const xml = defaultFeedRenderer(
      makeFeedData(
        makePostView({
          bodyHtml: "<p>Plain text only.</p>",
        }),
      ),
    );

    expect(xml).not.toContain('rel="enclosure"');
    expect(xml).not.toContain("<figure>");
  });
});
