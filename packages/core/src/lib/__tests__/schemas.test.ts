import { describe, it, expect } from "vitest";
import {
  PostTypeSchema,
  VisibilitySchema,
  RedirectTypeSchema,
  CreatePostSchema,
  UpdatePostSchema,
  parseFormData,
  parseFormDataOptional,
  validateMediaForPostType,
} from "../schemas.js";
import { z } from "zod";
import {
  POST_TYPES,
  VISIBILITY_LEVELS,
  MAX_MEDIA_ATTACHMENTS,
} from "../../types.js";

describe("PostTypeSchema", () => {
  it("accepts all valid post types", () => {
    for (const type of POST_TYPES) {
      expect(PostTypeSchema.parse(type)).toBe(type);
    }
  });

  it("rejects invalid post types", () => {
    expect(() => PostTypeSchema.parse("invalid")).toThrow();
    expect(() => PostTypeSchema.parse("")).toThrow();
    expect(() => PostTypeSchema.parse(123)).toThrow();
  });
});

describe("VisibilitySchema", () => {
  it("accepts all valid visibility levels", () => {
    for (const level of VISIBILITY_LEVELS) {
      expect(VisibilitySchema.parse(level)).toBe(level);
    }
  });

  it("rejects invalid visibility levels", () => {
    expect(() => VisibilitySchema.parse("public")).toThrow();
    expect(() => VisibilitySchema.parse("private")).toThrow();
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
    type: "note",
    content: "Hello world",
    visibility: "quiet",
  };

  it("accepts a valid post with required fields", () => {
    const result = CreatePostSchema.parse(validPost);
    expect(result.type).toBe("note");
    expect(result.content).toBe("Hello world");
    expect(result.visibility).toBe("quiet");
  });

  it("accepts all post types", () => {
    for (const type of POST_TYPES) {
      expect(() =>
        CreatePostSchema.parse({ ...validPost, type }),
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
      path: "my-post-slug",
    });
    expect(result.path).toBe("my-post-slug");
  });

  it("accepts empty path", () => {
    const result = CreatePostSchema.parse({ ...validPost, path: "" });
    expect(result.path).toBe("");
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

  it("accepts valid source URL", () => {
    const result = CreatePostSchema.parse({
      ...validPost,
      sourceUrl: "https://example.com",
    });
    expect(result.sourceUrl).toBe("https://example.com");
  });

  it("accepts empty source URL", () => {
    const result = CreatePostSchema.parse({ ...validPost, sourceUrl: "" });
    expect(result.sourceUrl).toBe("");
  });

  it("rejects invalid source URL", () => {
    expect(() =>
      CreatePostSchema.parse({ ...validPost, sourceUrl: "not-a-url" }),
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

  it("rejects missing required fields", () => {
    expect(() => CreatePostSchema.parse({})).toThrow();
    expect(() => CreatePostSchema.parse({ type: "note" })).toThrow();
    expect(() => CreatePostSchema.parse({ content: "hello" })).toThrow();
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

  it("accepts only type", () => {
    const result = UpdatePostSchema.parse({ type: "article" });
    expect(result.type).toBe("article");
  });

  it("still validates field types", () => {
    expect(() => UpdatePostSchema.parse({ type: "invalid" })).toThrow();
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
    form.set("type", "invalid-type");
    expect(() => parseFormData(form, "type", PostTypeSchema)).toThrow();
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
    form.set("type", "invalid");
    expect(() => parseFormDataOptional(form, "type", PostTypeSchema)).toThrow();
  });
});

describe("validateMediaForPostType", () => {
  it("returns null for note with no media", () => {
    expect(validateMediaForPostType("note", [])).toBeNull();
  });

  it("returns null for note with media", () => {
    expect(validateMediaForPostType("note", ["id-1", "id-2"])).toBeNull();
  });

  it("returns null for article with media", () => {
    expect(validateMediaForPostType("article", ["id-1"])).toBeNull();
  });

  it("returns null for image with at least 1 media", () => {
    expect(validateMediaForPostType("image", ["id-1"])).toBeNull();
  });

  it("returns error for image with no media", () => {
    const error = validateMediaForPostType("image", []);
    expect(error).toBe("image posts require at least 1 media attachment");
  });

  it("returns null for link with 0 or 1 media", () => {
    expect(validateMediaForPostType("link", [])).toBeNull();
    expect(validateMediaForPostType("link", ["id-1"])).toBeNull();
  });

  it("returns error for link with more than 1 media", () => {
    const error = validateMediaForPostType("link", ["id-1", "id-2"]);
    expect(error).toBe("link posts allow at most 1 media attachment");
  });

  it("returns error for page with any media", () => {
    const error = validateMediaForPostType("page", ["id-1"]);
    expect(error).toBe("page posts do not allow media attachments");
  });

  it("returns null for page with no media", () => {
    expect(validateMediaForPostType("page", [])).toBeNull();
  });

  it("returns null for quote with media", () => {
    expect(validateMediaForPostType("quote", ["id-1", "id-2"])).toBeNull();
  });

  it("returns error when exceeding max for note", () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `id-${i}`);
    const error = validateMediaForPostType("note", tooMany);
    expect(error).toBe("note posts allow at most 20 media attachments");
  });
});
