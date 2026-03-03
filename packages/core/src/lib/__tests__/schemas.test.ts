import { describe, it, expect } from "vitest";
import {
  FormatSchema,
  StatusSchema,
  RedirectTypeSchema,
  CreatePostSchema,
  UpdatePostSchema,
  parseFormData,
  parseFormDataOptional,
  validateMediaCount,
} from "../schemas.js";
import { z } from "zod";
import { FORMATS, STATUSES, MAX_MEDIA_ATTACHMENTS } from "../../types.js";

describe("FormatSchema", () => {
  it("accepts all valid formats", () => {
    for (const format of FORMATS) {
      expect(FormatSchema.parse(format)).toBe(format);
    }
  });

  it("rejects invalid formats", () => {
    expect(() => FormatSchema.parse("invalid")).toThrow();
    expect(() => FormatSchema.parse("")).toThrow();
    expect(() => FormatSchema.parse(123)).toThrow();
  });
});

describe("StatusSchema", () => {
  it("accepts all valid statuses", () => {
    for (const status of STATUSES) {
      expect(StatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects invalid statuses", () => {
    expect(() => StatusSchema.parse("public")).toThrow();
    expect(() => StatusSchema.parse("private")).toThrow();
  });
});

describe("RedirectTypeSchema", () => {
  it("accepts 301 and 302 as strings", () => {
    expect(RedirectTypeSchema.parse("301")).toBe("301");
    expect(RedirectTypeSchema.parse("302")).toBe("302");
  });

  it("rejects other values", () => {
    expect(() => RedirectTypeSchema.parse("200")).toThrow();
    expect(() => RedirectTypeSchema.parse("404")).toThrow();
    expect(() => RedirectTypeSchema.parse(301)).toThrow();
  });
});

describe("CreatePostSchema", () => {
  const validPost = {
    format: "note",
    body: "Hello world",
    status: "published",
  };

  it("accepts a valid post with required fields", () => {
    const result = CreatePostSchema.parse(validPost);
    expect(result.format).toBe("note");
    expect(result.body).toBe("Hello world");
    expect(result.status).toBe("published");
  });

  it("accepts all formats", () => {
    for (const format of FORMATS) {
      expect(() =>
        CreatePostSchema.parse({ ...validPost, format }),
      ).not.toThrow();
    }
  });

  it("accepts optional title", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      title: "My Post",
    });
    expect(result.title).toBe("My Post");
  });

  it("accepts valid path format", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      path: "my-post-path",
    });
    expect(result.path).toBe("my-post-path");
  });

  it("accepts single-character path", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      path: "a",
    });
    expect(result.path).toBe("a");
  });

  it("accepts empty path (transforms to undefined)", () => {
    const result = CreatePostSchema.parse({ ...validPost, path: "" });
    expect(result.path).toBeUndefined();
  });

  it("accepts multi-level path", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      path: "2024/my-post",
    });
    expect(result.path).toBe("2024/my-post");
  });

  it("accepts deeply nested path", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      path: "2024/01/my-post",
    });
    expect(result.path).toBe("2024/01/my-post");
  });

  it("rejects invalid path format (uppercase)", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, path: "MyPost" }),
    ).toThrow();
  });

  it("rejects invalid path format (special chars)", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, path: "my post!" }),
    ).toThrow();
  });

  it("rejects path starting with hyphen", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, path: "-my-post" }),
    ).toThrow();
  });

  it("rejects path ending with hyphen", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, path: "my-post-" }),
    ).toThrow();
  });

  it("rejects path with leading slash", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, path: "/my-post" }),
    ).toThrow();
  });

  it("rejects path with trailing slash", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, path: "my-post/" }),
    ).toThrow();
  });

  it("rejects path with consecutive slashes", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, path: "2024//my-post" }),
    ).toThrow();
  });

  it("accepts valid url", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      url: "https://example.com",
    });
    expect(result.url).toBe("https://example.com");
  });

  it("accepts empty url", () => {
    const result = CreatePostSchema.parse({ ...validPost, url: "" });
    expect(result.url).toBe("");
  });

  it("rejects invalid url", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, url: "not-a-url" }),
    ).toThrow();
  });

  it("accepts optional publishedAt as positive integer", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      publishedAt: 1706745600,
    });
    expect(result.publishedAt).toBe(1706745600);
  });

  it("rejects negative publishedAt", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, publishedAt: -1 }),
    ).toThrow();
  });

  it("rejects non-integer publishedAt", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, publishedAt: 1.5 }),
    ).toThrow();
  });

  it("accepts valid mediaIds", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      mediaIds: ["id-1", "id-2"],
    });
    expect(result.mediaIds).toEqual(["id-1", "id-2"]);
  });

  it("accepts empty mediaIds array", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      mediaIds: [],
    });
    expect(result.mediaIds).toEqual([]);
  });

  it("accepts omitted mediaIds", () => {
    const result = CreatePostSchema.parse(validPost);
    expect(result.mediaIds).toBeUndefined();
  });

  it("rejects mediaIds over MAX_MEDIA_ATTACHMENTS", () => {
    const tooMany = Array.from(
      { length: MAX_MEDIA_ATTACHMENTS + 1 },
      (_, i) => `id-${i}`,
    );
    expect(() =>
      CreatePostSchema.parse({ ...validPost, mediaIds: tooMany }),
    ).toThrow();
  });

  it("accepts visibility values", () => {
    for (const v of ["public", "featured", "unlisted"]) {
      const result = CreatePostSchema.parse({ ...validPost, visibility: v });
      expect(result.visibility).toBe(v);
    }
  });

  it("rejects invalid visibility", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, visibility: "hidden" }),
    ).toThrow();
  });

  it("accepts pinned as boolean", () => {
    const result = CreatePostSchema.parse({ ...validPost, pinned: true });
    expect(result.pinned).toBe(true);
  });

  it("accepts pinned as 'on' (transforms to true)", () => {
    const result = CreatePostSchema.parse({ ...validPost, pinned: "on" });
    expect(result.pinned).toBe(true);
  });

  it("accepts optional quoteText", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      quoteText: "A wise person once said...",
    });
    expect(result.quoteText).toBe("A wise person once said...");
  });

  it("accepts optional rating (1-5)", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const result = CreatePostSchema.parse({ ...validPost, rating });
      expect(result.rating).toBe(rating);
    }
  });

  it("rejects rating outside 0-5 range", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, rating: -1 }),
    ).toThrow();
    expect(() => CreatePostSchema.parse({ ...validPost, rating: 6 })).toThrow();
  });

  it("accepts rating 0 (transforms to undefined)", () => {
    const result = CreatePostSchema.parse({ ...validPost, rating: 0 });
    expect(result.rating).toBeUndefined();
  });

  it("accepts empty string rating (transforms to undefined)", () => {
    const result = CreatePostSchema.parse({ ...validPost, rating: "" });
    expect(result.rating).toBeUndefined();
  });

  it("accepts optional collectionIds as array of positive integers", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      collectionIds: [1, 2, 3],
    });
    expect(result.collectionIds).toEqual([1, 2, 3]);
  });

  it("accepts empty string collectionIds (transforms to undefined)", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      collectionIds: "",
    });
    expect(result.collectionIds).toBeUndefined();
  });

  it("accepts optional replyToId", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      replyToId: "abc123",
    });
    expect(result.replyToId).toBe("abc123");
  });

  it("only requires format field", () => {
    const result = CreatePostSchema.parse({ format: "note" });
    expect(result.format).toBe("note");
  });

  it("rejects missing format", () => {
    expect(() => CreatePostSchema.parse({})).toThrow();
    expect(() => CreatePostSchema.parse({ body: "hello" })).toThrow();
  });
});

describe("UpdatePostSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = UpdatePostSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial updates", () => {
    const result = UpdatePostSchema.parse({ title: "New Title" });
    expect(result.title).toBe("New Title");
  });

  it("accepts only format", () => {
    const result = UpdatePostSchema.parse({ format: "link" });
    expect(result.format).toBe("link");
  });

  it("still validates field types", () => {
    expect(() => UpdatePostSchema.parse({ format: "invalid" })).toThrow();
  });
});

describe("parseFormData", () => {
  it("parses a valid form field", () => {
    const form = new FormData();
    form.set("name", "hello");
    expect(parseFormData(form, "name", z.string())).toBe("hello");
  });

  it("throws for missing required field", () => {
    const form = new FormData();
    expect(() => parseFormData(form, "missing", z.string())).toThrow(
      "Missing required field: missing",
    );
  });

  it("throws for invalid value", () => {
    const form = new FormData();
    form.set("format", "invalid-format");
    expect(() => parseFormData(form, "format", FormatSchema)).toThrow();
  });
});

describe("parseFormDataOptional", () => {
  it("returns parsed value when present", () => {
    const form = new FormData();
    form.set("name", "hello");
    expect(parseFormDataOptional(form, "name", z.string())).toBe("hello");
  });

  it("returns undefined when field is missing", () => {
    const form = new FormData();
    expect(parseFormDataOptional(form, "missing", z.string())).toBeUndefined();
  });

  it("returns undefined when field is empty string", () => {
    const form = new FormData();
    form.set("name", "");
    expect(parseFormDataOptional(form, "name", z.string())).toBeUndefined();
  });

  it("throws for invalid value", () => {
    const form = new FormData();
    form.set("format", "invalid");
    expect(() => parseFormDataOptional(form, "format", FormatSchema)).toThrow();
  });
});

describe("validateMediaCount", () => {
  it("returns null for empty media array", () => {
    expect(validateMediaCount([])).toBeNull();
  });

  it("returns null for media within limit", () => {
    const media = Array.from({ length: 5 }, (_, i) => `id-${i}`);
    expect(validateMediaCount(media)).toBeNull();
  });

  it("returns null for exactly MAX_MEDIA_ATTACHMENTS", () => {
    const media = Array.from(
      { length: MAX_MEDIA_ATTACHMENTS },
      (_, i) => `id-${i}`,
    );
    expect(validateMediaCount(media)).toBeNull();
  });

  it("returns error when exceeding MAX_MEDIA_ATTACHMENTS", () => {
    const tooMany = Array.from(
      { length: MAX_MEDIA_ATTACHMENTS + 1 },
      (_, i) => `id-${i}`,
    );
    const error = validateMediaCount(tooMany);
    expect(error).toBe(
      `Posts allow at most ${MAX_MEDIA_ATTACHMENTS} media attachments`,
    );
  });
});
