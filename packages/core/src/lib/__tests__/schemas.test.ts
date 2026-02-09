import { describe, it, expect } from "vitest";
import {
  PostTypeSchema,
  VisibilitySchema,
  RedirectTypeSchema,
  CreatePostSchema,
  UpdatePostSchema,
  parseFormData,
  parseFormDataOptional,
} from "../schemas.js";
import { z } from "zod";
import { POST_TYPES, VISIBILITY_LEVELS } from "../../types.js";

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
