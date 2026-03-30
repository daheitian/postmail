import { readFileSync } from "node:fs";
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

  it("renders the link footer outside the feed card shell", () => {
    const post = createPostView({ format: "link" });

    const feedHtml = renderWithI18n(LinkCard({ post, mode: "feed" }));
    const detailHtml = renderWithI18n(LinkCard({ post, mode: "detail" }));

    expect(feedHtml).toMatch(
      /<article[^>]*class="h-entry post-menu-target feed-link-post"[\s\S]*<div class="feed-card feed-card-link">[\s\S]*<\/div><footer class="post-menu-footer"/,
    );
    expect(detailHtml).not.toContain("feed-link-post");
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

  it("preserves authored line breaks in quote cards", () => {
    const css = readFileSync(
      new URL("../../../styles/ui.css", import.meta.url),
      "utf8",
    );

    expect(css).toMatch(
      /\.feed-quote-content\s*\{[\s\S]*white-space:\s*pre-line;/,
    );
  });

  it("resets default prose quote marks for editorial blockquotes", () => {
    const css = readFileSync(
      new URL("../../../preset.css", import.meta.url),
      "utf8",
    );

    expect(css).toMatch(
      /blockquote\s*:where\(p:first-of-type\)::before,\s*[\s\S]*blockquote\s*:where\(p:last-of-type\)::after\s*\{[\s\S]*content:\s*none;/,
    );
  });

  it("keeps feed summary prose overrides outside component layers", () => {
    const css = readFileSync(
      new URL("../../../preset.css", import.meta.url),
      "utf8",
    );

    expect(css).toContain(".post-body-summary.prose");
    expect(css).toContain(".feed-card-link .feed-link-summary.prose");
    expect(css).toContain(
      '[data-post]:not([data-page="post"]) [data-post-body].prose blockquote',
    );
  });

  it("uses inset-note styling for compose editor blockquotes", () => {
    const css = readFileSync(
      new URL("../../../styles/ui.css", import.meta.url),
      "utf8",
    );

    expect(css).toMatch(
      /\.compose-tiptap-body\s+\.tiptap\s+blockquote\s*\{[\s\S]*background:\s*linear-gradient\(/,
    );
    expect(css).toMatch(
      /\.compose-tiptap-body\s+\.tiptap\s+blockquote:focus-within\s*\{/,
    );
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

  it("keeps rated note feed cards bottom-weighted while moving detail ratings under the title", () => {
    const post = createPostView({
      format: "note",
      rating: 4,
      summaryHtml: "<p>Summary</p>",
    });

    const feedHtml = renderWithI18n(NoteCard({ post, mode: "feed" }));
    const detailHtml = renderWithI18n(NoteCard({ post, mode: "detail" }));

    expect(feedHtml.indexOf("data-post-body")).toBeLessThan(
      feedHtml.indexOf('class="post-rating"'),
    );
    expect(detailHtml).toContain(
      'class="post-header-block post-header-block-detail"',
    );
    expect(detailHtml.indexOf('class="post-rating"')).toBeLessThan(
      detailHtml.indexOf("data-post-body"),
    );
  });

  it("moves titled note detail timestamps into the header while keeping footer actions", () => {
    const post = createPostView({
      format: "note",
      rating: 4,
      summaryHtml: "<p>Summary</p>",
    });

    const detailHtml = renderWithI18n(NoteCard({ post, mode: "detail" }));

    expect(detailHtml).toContain('class="post-header-meta-row"');
    expect(detailHtml).toContain('class="u-url post-header-meta-link"');
    expect(detailHtml.match(/class="dt-published"/g)).toHaveLength(1);
    expect(detailHtml).toContain("data-reply-trigger");
    expect(detailHtml.match(/data-post-menu-trigger/g)).toHaveLength(2);
    expect(detailHtml.indexOf('class="post-header-meta-row"')).toBeLessThan(
      detailHtml.indexOf("data-post-body"),
    );
  });

  it("renders titled note feed summaries as secondary prose without shrinking detail reading", () => {
    const post = createPostView({
      format: "note",
      summaryHtml: "<p>Summary</p>",
    });

    const feedHtml = renderWithI18n(NoteCard({ post, mode: "feed" }));
    const detailHtml = renderWithI18n(NoteCard({ post, mode: "detail" }));

    expect(feedHtml).toContain('class="e-content prose post-body-summary"');
    expect(detailHtml).toContain('class="e-content prose post-detail-body"');
  });

  it("moves rated link detail cards into the title block without changing feed ordering", () => {
    const post = createPostView({
      format: "link",
      rating: 5,
    });

    const feedHtml = renderWithI18n(LinkCard({ post, mode: "feed" }));
    const detailHtml = renderWithI18n(LinkCard({ post, mode: "detail" }));

    expect(feedHtml.indexOf("data-post-body")).toBeLessThan(
      feedHtml.indexOf('class="post-rating"'),
    );
    expect(detailHtml).toContain('class="post-header-block"');
    expect(detailHtml.indexOf('class="post-rating"')).toBeLessThan(
      detailHtml.indexOf("data-post-body"),
    );
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
