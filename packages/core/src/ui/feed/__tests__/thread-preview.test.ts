import { readFileSync } from "node:fs";
import type { Context } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n/context.js";
import { createI18n } from "../../../i18n/i18n.js";
import type { PostView, TimelineItemView } from "../../../types.js";
import { CuratedThreadPreview } from "../CuratedThreadPreview.js";
import { ThreadPreview } from "../ThreadPreview.js";
import {
  getThreadPreviewState,
  isThreadContextLikelyOverflow,
} from "../thread-preview-state.js";

function createPostView(overrides: Partial<PostView> = {}): PostView {
  return {
    id: "post-1",
    permalink: "/post-1",
    slug: "post-1",
    format: "note",
    status: "published",
    visibility: "public",
    pinned: false,
    featured: false,
    publishedAt: "2026-03-14T00:00:00.000Z",
    publishedAtFormatted: "Mar 14, 2026",
    publishedAtTime: "00:00",
    publishedAtRelative: "now",
    updatedAt: "2026-03-14T00:00:00.000Z",
    media: [],
    collections: [],
    isLastInThread: false,
    ...overrides,
  };
}

function renderWithI18n(
  render: () =>
    | ReturnType<typeof ThreadPreview>
    | ReturnType<typeof CuratedThreadPreview>,
) {
  const i18n = createI18n("en");
  const c = {
    get(key: string) {
      if (key === "i18n") return i18n;
      return undefined;
    },
  } as unknown as Context;

  I18nProvider({ c, children: "" });
  return renderToString(render());
}

describe("getThreadPreviewState", () => {
  it("has no hidden ancestors for a 2-post thread", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: false,
        totalReplyCount: 1,
      }),
    ).toEqual({
      hiddenCount: 0,
    });
  });

  it("has no hidden ancestors for a 3-post thread with parent context", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: true,
        totalReplyCount: 2,
      }),
    ).toEqual({
      hiddenCount: 0,
    });
  });

  it("counts hidden ancestors for longer threads", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: true,
        totalReplyCount: 5,
      }),
    ).toEqual({
      hiddenCount: 3,
    });
  });

  it("treats hidden ancestors as likely overflow", () => {
    expect(
      isThreadContextLikelyOverflow({
        rootPost: createPostView(),
        hiddenCount: 1,
      }),
    ).toBe(true);
  });

  it("treats media-heavy context as likely overflow", () => {
    expect(
      isThreadContextLikelyOverflow({
        rootPost: createPostView({
          media: [
            {
              id: "media-1",
              url: "/image.jpg",
              thumbnailUrl: "/image-thumb.jpg",
              mimeType: "image/jpeg",
            },
          ],
        }),
        hiddenCount: 0,
      }),
    ).toBe(true);
  });

  it("keeps very short context collapsed without affordances", () => {
    expect(
      isThreadContextLikelyOverflow({
        rootPost: createPostView({
          bodyHtml: "<p>Short note.</p>",
        }),
        parentReply: createPostView({
          id: "post-2",
          permalink: "/post-2",
          slug: "post-2",
          bodyHtml: "<p>Tiny reply.</p>",
        }),
        hiddenCount: 0,
      }),
    ).toBe(false);
  });

  it("keeps thread preview items shrinkable within the grid track", () => {
    const css = readFileSync(
      new URL("../../../styles/ui.css", import.meta.url),
      "utf8",
    );

    expect(css).toMatch(
      /\.thread-item\s*\{[\s\S]*min-width:\s*0;[\s\S]*max-width:\s*100%;/,
    );
  });

  it("renders article summaries in thread previews", () => {
    const rootPost = createPostView({
      title: "Threaded article",
      bodyHtml: '<p>Intro</p><span id="continue"></span><p>Rest</p>',
      summaryHtml: "<p>Intro</p>",
      summaryHasMore: true,
    });
    const latestReply = createPostView({
      id: "post-2",
      permalink: "/post-2",
      slug: "post-2",
      title: "Reply article",
      bodyHtml: "<p>Full reply body</p>",
      summaryHtml: "<p>Reply summary</p>",
      summaryHasMore: true,
      isLastInThread: true,
    });

    const html = renderWithI18n(() =>
      ThreadPreview({
        rootPost,
        latestReply,
        totalReplyCount: 1,
      }),
    );

    expect(html).toContain("<p>Intro</p>");
    expect(html).toContain("<p>Reply summary</p>");
    expect(html).not.toContain("<p>Rest</p>");
    expect(html).not.toContain("<p>Full reply body</p>");
    expect(html).not.toContain('id="continue"');
  });

  it("renders article summaries in curated thread previews", () => {
    const articlePost = createPostView({
      title: "Curated article",
      bodyHtml: '<p>Lead</p><span id="continue"></span><p>Body</p>',
      summaryHtml: "<p>Lead</p>",
      summaryHasMore: true,
    });
    const curatedThread: NonNullable<TimelineItemView["curatedThread"]> = {
      rootPost: articlePost,
      segments: [
        {
          post: articlePost,
          hiddenBeforeCount: 0,
          highlighted: true,
        },
      ],
    };

    const html = renderWithI18n(() =>
      CuratedThreadPreview({
        curatedThread,
      }),
    );

    expect(html).toContain("<p>Lead</p>");
    expect(html).not.toContain("<p>Body</p>");
    expect(html).not.toContain('id="continue"');
  });
});
