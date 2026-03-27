import { describe, expect, it } from "vitest";
import {
  getSlugValidationIssue,
  isValidSlug,
  normalizeSlug,
  truncateSlug,
} from "../slug-format.js";

describe("slug-format", () => {
  it("normalizes arbitrary text into a slug", () => {
    expect(normalizeSlug("My Cool Page!")).toBe("my-cool-page");
    expect(normalizeSlug("  hello  world  ")).toBe("hello-world");
  });

  it("treats empty slugs as valid so they can be auto-generated", () => {
    expect(getSlugValidationIssue("")).toBeNull();
    expect(isValidSlug("")).toBe(true);
  });

  it("flags illegal characters", () => {
    expect(getSlugValidationIssue("bad/slug")).toBe("invalid");
    expect(getSlugValidationIssue("bad slug")).toBe("invalid");
    expect(getSlugValidationIssue("-bad-slug")).toBe("invalid");
  });

  it("flags reserved paths", () => {
    expect(getSlugValidationIssue("compose")).toBe("reserved");
    expect(isValidSlug("compose")).toBe(false);
  });

  it("flags additional reserved values", () => {
    expect(
      getSlugValidationIssue("new", {
        additionalReservedValues: ["new"],
      }),
    ).toBe("reserved");
  });

  it("flags slugs that exceed a configured maximum length", () => {
    expect(getSlugValidationIssue("a".repeat(121), { maxLength: 120 })).toBe(
      "too_long",
    );
    expect(isValidSlug("a".repeat(121), { maxLength: 120 })).toBe(false);
  });

  it("accepts valid slugs", () => {
    expect(getSlugValidationIssue("reading-notes")).toBeNull();
    expect(isValidSlug("reading-notes")).toBe(true);
  });

  it("truncates slugs without leaving trailing hyphens", () => {
    expect(truncateSlug("reading-notes-forever", 8)).toBe("reading");
  });
});
