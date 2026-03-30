import { describe, expect, it } from "vitest";
import { buildPostMeta } from "../post-meta.js";
import type { Post } from "../../types.js";

const basePost: Post = {
  id: "post-1",
  format: "note",
  status: "published",
  visibility: "public",
  pinnedAt: null,
  featuredAt: null,
  slug: "post-1",
  title: null,
  url: null,
  body: null,
  bodyHtml: null,
  bodyText: null,
  quoteText: null,
  summary: null,
  rating: null,
  previewImageKey: null,
  previewKind: null,
  previewProvider: null,
  replyToId: null,
  threadId: "post-1",
  deletedAt: null,
  publishedAt: 1,
  lastActivityAt: 1,
  createdAt: 1,
  updatedAt: 1,
};

function makePost(overrides: Partial<Post>): Post {
  return { ...basePost, ...overrides };
}

describe("buildPostMeta", () => {
  it("prefers explicit titles", () => {
    const meta = buildPostMeta(
      makePost({
        title: "A Real Title",
        summary: "Summary text",
      }),
      "Jant",
    );

    expect(meta.title).toBe("A Real Title");
    expect(meta.description).toBe("Summary text");
  });

  it("derives note titles from summary when no explicit title exists", () => {
    const meta = buildPostMeta(
      makePost({
        summary:
          "This is the first paragraph.\n\nThis second paragraph should not drive the title.",
      }),
      "Jant",
    );

    expect(meta.title).toBe("This is the first paragraph.");
    expect(meta.description).toContain("This is the first paragraph.");
    expect(meta.description).toContain("This second paragraph");
  });

  it("derives quote titles from quote text", () => {
    const meta = buildPostMeta(
      makePost({
        format: "quote",
        quoteText:
          "Luck gets more predictable the more disciplined your practice becomes.",
      }),
      "Jant",
    );

    expect(meta.title).toBe(
      "Luck gets more predictable the more disciplined your practice becomes.",
    );
    expect(meta.description).toBe(
      "Luck gets more predictable the more disciplined your practice becomes.",
    );
  });

  it("treats quote titles as attribution, not the primary page title", () => {
    const meta = buildPostMeta(
      makePost({
        format: "quote",
        title: "Gary Player",
        quoteText: "The more I practice, the luckier I seem to get.",
      }),
      "Jant",
    );

    expect(meta.title).toContain("The more I practice");
    expect(meta.title).toContain("Gary Player");
  });

  it("falls back to link domains when no title or summary exists", () => {
    const meta = buildPostMeta(
      makePost({
        format: "link",
        url: "https://www.example.com/articles/test",
      }),
      "Jant",
    );

    expect(meta.title).toBe("example.com");
    expect(meta.description).toBe("https://www.example.com/articles/test");
  });

  it("falls back to site name when there is no usable content", () => {
    const meta = buildPostMeta(makePost({}), "Jant");

    expect(meta.title).toBe("Jant");
    expect(meta.description).toBeUndefined();
  });

  it("clips long generated titles without cutting too aggressively", () => {
    const meta = buildPostMeta(
      makePost({
        summary:
          "This is a deliberately long summary line that should be clipped for the page title without looking broken or abrupt in the browser tab.",
      }),
      "Jant",
    );

    expect(meta.title.length).toBeLessThanOrEqual(72);
    expect(meta.title.endsWith("...")).toBe(true);
  });
});
