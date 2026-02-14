/**
 * View Model Conversion Tests
 */

import { describe, it, expect } from "vitest";
import {
  toPostView,
  toPostViews,
  toMediaView,
  toNavLinkView,
  toNavLinkViews,
  toSearchResultView,
  toArchiveGroups,
} from "../view.js";
import type { MediaContext } from "../view.js";
import type {
  PostWithMedia,
  Media,
  NavigationLink,
  SearchResult,
  Post,
} from "../../types.js";

const EMPTY_CTX: MediaContext = {};
const CTX_WITH_URLS: MediaContext = {
  r2PublicUrl: "https://cdn.example.com",
  imageTransformUrl: "https://example.com/cdn-cgi/image",
};

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    type: "note",
    visibility: "featured",
    title: null,
    path: null,
    content: "Hello world",
    contentHtml: "<p>Hello world</p>",
    sourceUrl: null,
    sourceName: null,
    sourceDomain: null,
    replyToId: null,
    threadId: null,
    deletedAt: null,
    publishedAt: 1706745600, // 2024-02-01T00:00:00Z
    createdAt: 1706745600,
    updatedAt: 1706745600,
    ...overrides,
  };
}

function makePostWithMedia(
  overrides: Partial<PostWithMedia> = {},
): PostWithMedia {
  return {
    ...makePost(overrides),
    mediaAttachments: overrides.mediaAttachments ?? [],
  };
}

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: "01902a9f-1a2b-7c3d",
    postId: 1,
    filename: "image.webp",
    originalName: "photo.jpg",
    mimeType: "image/webp",
    size: 12345,
    storageKey: "media/2025/01/01902a9f-1a2b-7c3d.webp",
    provider: "r2",
    width: 1920,
    height: 1080,
    alt: "A photo",
    position: 0,
    blurhash: null,
    createdAt: 1706745600,
    ...overrides,
  };
}

function makeNavLink(overrides: Partial<NavigationLink> = {}): NavigationLink {
  return {
    id: 1,
    label: "Home",
    url: "/",
    position: 0,
    createdAt: 1706745600,
    updatedAt: 1706745600,
    ...overrides,
  };
}

// =============================================================================
// toPostView
// =============================================================================

describe("toPostView", () => {
  it("generates permalink from post id", () => {
    const post = makePostWithMedia({ id: 123 });
    const view = toPostView(post, EMPTY_CTX);
    expect(view.permalink).toMatch(/^\/p\/.+$/);
    expect(view.permalink.length).toBeGreaterThan(3);
  });

  it("formats dates correctly", () => {
    const post = makePostWithMedia({ publishedAt: 1706745600 });
    const view = toPostView(post, EMPTY_CTX);
    expect(view.publishedAt).toBe("2024-02-01T00:00:00.000Z");
    expect(view.publishedAtFormatted).toBe("Feb 1, 2024");
  });

  it("generates excerpt from content", () => {
    const shortContent = "Short text";
    const longContent = "A".repeat(200);

    const shortView = toPostView(
      makePostWithMedia({ content: shortContent }),
      EMPTY_CTX,
    );
    expect(shortView.excerpt).toBe("Short text");

    const longView = toPostView(
      makePostWithMedia({ content: longContent }),
      EMPTY_CTX,
    );
    expect(longView.excerpt).toBe("A".repeat(160) + "...");
  });

  it("handles null content gracefully", () => {
    const view = toPostView(makePostWithMedia({ content: null }), EMPTY_CTX);
    expect(view.excerpt).toBeUndefined();
    expect(view.content).toBeUndefined();
  });

  it("converts null fields to undefined", () => {
    const view = toPostView(makePostWithMedia(), EMPTY_CTX);
    expect(view.title).toBeUndefined();
    expect(view.path).toBeUndefined();
    expect(view.sourceUrl).toBeUndefined();
    expect(view.sourceName).toBeUndefined();
    expect(view.sourceDomain).toBeUndefined();
    expect(view.replyToId).toBeUndefined();
    expect(view.threadRootId).toBeUndefined();
  });

  it("preserves non-null source fields", () => {
    const view = toPostView(
      makePostWithMedia({
        sourceUrl: "https://example.com",
        sourceName: "Example",
        sourceDomain: "example.com",
      }),
      EMPTY_CTX,
    );
    expect(view.sourceUrl).toBe("https://example.com");
    expect(view.sourceName).toBe("Example");
    expect(view.sourceDomain).toBe("example.com");
  });

  it("converts media attachments to MediaView", () => {
    const view = toPostView(
      makePostWithMedia({
        mediaAttachments: [
          {
            id: "abc",
            url: "/media/abc.webp",
            previewUrl: "/media/abc-thumb.webp",
            alt: "Photo",
            blurhash: null,
            width: 800,
            height: 600,
            position: 0,
            mimeType: "image/webp",
          },
        ],
      }),
      EMPTY_CTX,
    );
    expect(view.media).toHaveLength(1);
    expect(view.media[0]).toEqual({
      id: "abc",
      url: "/media/abc.webp",
      thumbnailUrl: "/media/abc-thumb.webp",
      mimeType: "image/webp",
      altText: "Photo",
      width: 800,
      height: 600,
    });
  });
});

describe("toPostViews", () => {
  it("converts multiple posts", () => {
    const posts = [makePostWithMedia({ id: 1 }), makePostWithMedia({ id: 2 })];
    const views = toPostViews(posts, EMPTY_CTX);
    expect(views).toHaveLength(2);
    expect(views[0]!.id).toBe(1);
    expect(views[1]!.id).toBe(2);
  });
});

// =============================================================================
// toMediaView
// =============================================================================

describe("toMediaView", () => {
  it("generates local proxy URL without public URL", () => {
    const media = makeMedia();
    const view = toMediaView(media, EMPTY_CTX);
    expect(view.url).toBe("/media/01902a9f-1a2b-7c3d.webp");
    expect(view.thumbnailUrl).toBe("/media/01902a9f-1a2b-7c3d.webp");
  });

  it("generates CDN URL with public URL", () => {
    const media = makeMedia();
    const view = toMediaView(media, CTX_WITH_URLS);
    expect(view.url).toBe(
      "https://cdn.example.com/media/2025/01/01902a9f-1a2b-7c3d.webp",
    );
    expect(view.thumbnailUrl).toContain("cdn-cgi/image");
  });

  it("uses S3 URL for s3 provider", () => {
    const media = makeMedia({ provider: "s3" });
    const ctx: MediaContext = {
      r2PublicUrl: "https://r2.example.com",
      s3PublicUrl: "https://s3.example.com",
    };
    const view = toMediaView(media, ctx);
    expect(view.url).toContain("s3.example.com");
  });

  it("maps alt text and dimensions", () => {
    const view = toMediaView(makeMedia(), EMPTY_CTX);
    expect(view.altText).toBe("A photo");
    expect(view.width).toBe(1920);
    expect(view.height).toBe(1080);
    expect(view.mimeType).toBe("image/webp");
    expect(view.size).toBe(12345);
  });

  it("handles null alt and dimensions", () => {
    const media = makeMedia({ alt: null, width: null, height: null });
    const view = toMediaView(media, EMPTY_CTX);
    expect(view.altText).toBeUndefined();
    expect(view.width).toBeUndefined();
    expect(view.height).toBeUndefined();
  });
});

// =============================================================================
// toNavLinkView
// =============================================================================

describe("toNavLinkView", () => {
  it("marks home link active on exact / match", () => {
    const view = toNavLinkView(makeNavLink({ url: "/" }), "/");
    expect(view.isActive).toBe(true);
    expect(view.isExternal).toBe(false);
  });

  it("marks home link inactive on other paths", () => {
    const view = toNavLinkView(makeNavLink({ url: "/" }), "/archive");
    expect(view.isActive).toBe(false);
  });

  it("matches prefix for non-root links", () => {
    const view = toNavLinkView(makeNavLink({ url: "/archive" }), "/archive");
    expect(view.isActive).toBe(true);

    const viewSub = toNavLinkView(
      makeNavLink({ url: "/archive" }),
      "/archive/2024",
    );
    expect(viewSub.isActive).toBe(true);
  });

  it("does not false-match similar prefixes", () => {
    const view = toNavLinkView(makeNavLink({ url: "/arch" }), "/archive");
    expect(view.isActive).toBe(false);
  });

  it("marks external links as external and never active", () => {
    const view = toNavLinkView(
      makeNavLink({ url: "https://example.com" }),
      "/",
    );
    expect(view.isExternal).toBe(true);
    expect(view.isActive).toBe(false);
  });

  it("handles http:// links", () => {
    const view = toNavLinkView(makeNavLink({ url: "http://example.com" }), "/");
    expect(view.isExternal).toBe(true);
    expect(view.isActive).toBe(false);
  });
});

describe("toNavLinkViews", () => {
  it("converts multiple links", () => {
    const links = [
      makeNavLink({ id: 1, url: "/" }),
      makeNavLink({ id: 2, url: "/archive" }),
      makeNavLink({ id: 3, url: "https://github.com" }),
    ];
    const views = toNavLinkViews(links, "/archive");
    expect(views).toHaveLength(3);
    expect(views[0]!.isActive).toBe(false);
    expect(views[1]!.isActive).toBe(true);
    expect(views[2]!.isExternal).toBe(true);
  });
});

// =============================================================================
// toSearchResultView
// =============================================================================

describe("toSearchResultView", () => {
  it("wraps post in PostView", () => {
    const result: SearchResult = {
      post: makePost({ id: 42, title: "Test" }),
      rank: 1.5,
      snippet: "...matching <b>text</b>...",
    };
    const view = toSearchResultView(result, EMPTY_CTX);
    expect(view.post.id).toBe(42);
    expect(view.post.title).toBe("Test");
    expect(view.post.permalink).toBeDefined();
    expect(view.rank).toBe(1.5);
    expect(view.snippet).toBe("...matching <b>text</b>...");
  });
});

// =============================================================================
// toArchiveGroups
// =============================================================================

describe("toArchiveGroups", () => {
  it("converts grouped map to ArchiveGroup array", () => {
    const grouped = new Map<string, Post[]>();
    grouped.set("2024-02", [
      makePost({ id: 1, publishedAt: 1706745600 }),
      makePost({ id: 2, publishedAt: 1706832000 }),
    ]);
    grouped.set("2024-01", [makePost({ id: 3, publishedAt: 1704067200 })]);

    const groups = toArchiveGroups(grouped, EMPTY_CTX);
    expect(groups).toHaveLength(2);

    expect(groups[0]!.year).toBe("2024");
    expect(groups[0]!.month).toBe("02");
    expect(groups[0]!.label).toBe("February 2024");
    expect(groups[0]!.posts).toHaveLength(2);

    expect(groups[1]!.year).toBe("2024");
    expect(groups[1]!.month).toBe("01");
    expect(groups[1]!.label).toBe("January 2024");
    expect(groups[1]!.posts).toHaveLength(1);
  });

  it("converts posts to PostView within groups", () => {
    const grouped = new Map<string, Post[]>();
    grouped.set("2024-02", [makePost({ id: 1 })]);

    const groups = toArchiveGroups(grouped, EMPTY_CTX);
    const post = groups[0]!.posts[0]!;
    expect(post.permalink).toBeDefined();
    expect(post.publishedAtFormatted).toBeDefined();
  });

  it("handles empty map", () => {
    const groups = toArchiveGroups(new Map(), EMPTY_CTX);
    expect(groups).toHaveLength(0);
  });
});
