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
  it("has no hidden posts for a 2-post thread", () => {
    const latestReply = createPostView({
      id: "post-2",
      permalink: "/post-2",
      slug: "post-2",
    });

    expect(
      getThreadPreviewState({
        secondReply: latestReply,
        latestReply,
        totalReplyCount: 1,
      }),
    ).toEqual({
      hiddenCount: 0,
    });
  });

  it("has no hidden posts for a 4-post thread when all four slots are visible", () => {
    const secondReply = createPostView({
      id: "post-2",
      permalink: "/post-2",
      slug: "post-2",
    });
    const penultimateReply = createPostView({
      id: "post-3",
      permalink: "/post-3",
      slug: "post-3",
    });
    const latestReply = createPostView({
      id: "post-4",
      permalink: "/post-4",
      slug: "post-4",
    });

    expect(
      getThreadPreviewState({
        secondReply,
        penultimateReply,
        latestReply,
        totalReplyCount: 3,
      }),
    ).toEqual({
      hiddenCount: 0,
    });
  });

  it("counts hidden posts for longer threads after deduping visible slots", () => {
    const secondReply = createPostView({
      id: "post-2",
      permalink: "/post-2",
      slug: "post-2",
    });
    const penultimateReply = createPostView({
      id: "post-4",
      permalink: "/post-4",
      slug: "post-4",
    });
    const latestReply = createPostView({
      id: "post-5",
      permalink: "/post-5",
      slug: "post-5",
    });

    expect(
      getThreadPreviewState({
        secondReply,
        penultimateReply,
        latestReply,
        totalReplyCount: 4,
      }),
    ).toEqual({
      hiddenCount: 1,
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
        secondReply: createPostView({
          id: "post-2",
          permalink: "/post-2",
          slug: "post-2",
          bodyHtml: "<p>Tiny reply.</p>",
        }),
        penultimateReply: createPostView({
          id: "post-3",
          permalink: "/post-3",
          slug: "post-3",
          bodyHtml: "<p>Brief note.</p>",
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

  it("adds extra mobile inset before the thread rail reaches the viewport edge", () => {
    const css = readFileSync(
      new URL("../../../styles/ui.css", import.meta.url),
      "utf8",
    );

    expect(css).toMatch(
      /@media\s*\(max-width:\s*700px\)\s*\{[\s\S]*\.thread-group-preview,\s*\.thread-group-detail\s*\{[\s\S]*--site-thread-rail-indent:\s*8px;[\s\S]*--site-thread-rail-line-left:\s*-11px;/,
    );
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*700px\)\s*\{[\s\S]*\.thread-group-preview,\s*\.thread-group-detail\s*\{[\s\S]*--site-thread-rail-dot-left:/,
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
      id: "post-4",
      permalink: "/post-4",
      slug: "post-4",
      title: "Reply article",
      bodyHtml: "<p>Full reply body</p>",
      summaryHtml: "<p>Reply summary</p>",
      summaryHasMore: true,
      isLastInThread: true,
    });
    const secondReply = createPostView({
      id: "post-2",
      permalink: "/post-2",
      slug: "post-2",
      title: "Second article",
      bodyHtml: "<p>Second full body</p>",
      summaryHtml: "<p>Second summary</p>",
      summaryHasMore: true,
    });

    const html = renderWithI18n(() =>
      ThreadPreview({
        rootPost,
        secondReply,
        latestReply,
        totalReplyCount: 3,
      }),
    );

    expect(html).toContain("<p>Intro</p>");
    expect(html).toContain("<p>Second summary</p>");
    expect(html).toContain("<p>Reply summary</p>");
    expect(html).not.toContain("<p>Rest</p>");
    expect(html).not.toContain("<p>Second full body</p>");
    expect(html).not.toContain("<p>Full reply body</p>");
    expect(html).not.toContain('id="continue"');
  });

  it("always renders collapsible context shell with toggle even when all thread slots are visible", () => {
    const html = renderWithI18n(() =>
      ThreadPreview({
        rootPost: createPostView({
          title: "Long root",
          summaryHtml: "<p>Root summary</p>",
          summaryHasMore: true,
        }),
        secondReply: createPostView({
          id: "post-2",
          permalink: "/post-2",
          slug: "post-2",
          bodyHtml: "<p>Second</p>",
        }),
        penultimateReply: createPostView({
          id: "post-4",
          permalink: "/post-4",
          slug: "post-4",
          bodyHtml: "<p>Penultimate</p>",
        }),
        latestReply: createPostView({
          id: "post-5",
          permalink: "/post-5",
          slug: "post-5",
          bodyHtml: "<p>Latest</p>",
          isLastInThread: true,
        }),
        totalReplyCount: 4,
      }),
    );

    expect(html).toContain("data-thread-context");
    expect(html).toContain("data-thread-context-toggle");
    expect(html).toContain("thread-context-collapsed");
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
