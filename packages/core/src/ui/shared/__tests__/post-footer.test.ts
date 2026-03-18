import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import type { CollectionTagView, PostView } from "../../../types.js";
import { PostFooter } from "../PostFooter.js";

function createCollection(slug: string, title: string): CollectionTagView {
  return {
    slug,
    title,
    url: `/c/${slug}`,
  };
}

function createPostView(overrides: Partial<PostView> = {}): PostView {
  return {
    id: "post-1",
    permalink: "/hello-world",
    slug: "hello-world",
    format: "note",
    status: "published",
    visibility: "public",
    pinned: false,
    featured: false,
    publishedAt: "2026-03-17T10:00:00.000Z",
    publishedAtFormatted: "Mar 17, 2026",
    publishedAtTime: "10:00",
    publishedAtRelative: "1h",
    updatedAt: "2026-03-17T10:00:00.000Z",
    media: [],
    collections: [
      createCollection("notes", "Notes"),
      createCollection("writing", "Writing"),
      createCollection("studio", "Studio"),
    ],
    isLastInThread: true,
    ...overrides,
  };
}

describe("PostFooter", () => {
  it("links the detail timestamp and keeps compact collection summary", () => {
    const html = renderToString(
      PostFooter({
        post: createPostView(),
        detail: true,
      }),
    );

    expect(html).toContain('href="/hello-world"');
    expect(html).not.toContain(">Permalink<");
    expect(html).toContain("and 2 more");
    expect(html).toContain("data-collection-popover-trigger");
  });

  it("shows only hidden collections inside the more popover", () => {
    const html = renderToString(
      PostFooter({
        post: createPostView(),
      }),
    );

    expect(html).toContain("and 2 more");
    expect(html).toContain("data-collection-popover-trigger");
    expect(html.match(/class="post-collection-popover-item"/g)).toHaveLength(2);
    expect(html.match(/href="\/c\/notes"/g)).toHaveLength(1);
    expect(html.match(/href="\/c\/writing"/g)).toHaveLength(1);
    expect(html.match(/href="\/c\/studio"/g)).toHaveLength(1);
  });
});
