import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PostView } from "../../../types.js";
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
});
