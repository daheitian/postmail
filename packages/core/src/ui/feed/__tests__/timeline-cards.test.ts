import type { Context } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import type { MediaView, PostView } from "../../../types.js";
import { I18nProvider } from "../../../i18n/context.js";
import { createI18n } from "../../../i18n/i18n.js";
import { NoteCard } from "../NoteCard.js";
import { LinkCard } from "../LinkCard.js";
import { QuoteCard } from "../QuoteCard.js";

function createMediaView(overrides: Partial<MediaView> = {}): MediaView {
  return {
    id: "media-1",
    url: "/media/full.jpg",
    thumbnailUrl: "/media/thumb.jpg",
    mimeType: "image/jpeg",
    ...overrides,
  };
}

function createPostView(overrides: Partial<PostView> = {}): PostView {
  return {
    id: "post-1",
    permalink: "/post-1",
    slug: "post-1",
    title: "Card title",
    bodyHtml: "<p>Summary</p>",
    quoteText: "Quoted text",
    url: "https://example.com/article",
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
    media: [createMediaView()],
    collections: [],
    isLastInThread: true,
    ...overrides,
  };
}

function renderWithI18n(
  html:
    | ReturnType<typeof NoteCard>
    | ReturnType<typeof LinkCard>
    | ReturnType<typeof QuoteCard>,
) {
  const i18n = createI18n("en");
  const c = {
    get(key: string) {
      if (key === "i18n") return i18n;
      return undefined;
    },
  } as unknown as Context;

  I18nProvider({ c, children: "" });
  return renderToString(html);
}

describe("timeline cards", () => {
  it("renders link attachments in feed and detail modes", () => {
    const post = createPostView({ format: "link" });

    const feedHtml = renderWithI18n(LinkCard({ post, mode: "feed" }));
    const detailHtml = renderWithI18n(LinkCard({ post, mode: "detail" }));

    expect(feedHtml).toContain("data-post-media");
    expect(feedHtml).toContain('href="/media/full.jpg"');
    expect(detailHtml).toContain("data-post-media");
    expect(detailHtml).toContain('href="/media/full.jpg"');
  });

  it("renders quote attachments in feed and detail modes", () => {
    const post = createPostView({ format: "quote" });

    const feedHtml = renderWithI18n(QuoteCard({ post, mode: "feed" }));
    const detailHtml = renderWithI18n(QuoteCard({ post, mode: "detail" }));

    expect(feedHtml).toContain("data-post-media");
    expect(feedHtml).toContain('href="/media/full.jpg"');
    expect(detailHtml).toContain("data-post-media");
    expect(detailHtml).toContain('href="/media/full.jpg"');
  });

  it("keeps link and quote attachments hidden in compact mode", () => {
    const linkPost = createPostView({ format: "link" });
    const quotePost = createPostView({ format: "quote" });

    const linkHtml = renderWithI18n(
      LinkCard({ post: linkPost, mode: "compact" }),
    );
    const quoteHtml = renderWithI18n(
      QuoteCard({ post: quotePost, mode: "compact" }),
    );

    expect(linkHtml).not.toContain("data-post-media");
    expect(quoteHtml).not.toContain("data-post-media");
  });

  it("can hide reply without hiding the more menu on note cards", () => {
    const post = createPostView({ format: "note", isLastInThread: true });

    const html = renderWithI18n(
      NoteCard({
        post,
        mode: "feed",
        display: {
          footer: {
            hideReply: true,
          },
        },
      }),
    );

    expect(html).not.toContain("data-reply-trigger");
    expect(html).toContain("data-post-menu-trigger");
  });
});
