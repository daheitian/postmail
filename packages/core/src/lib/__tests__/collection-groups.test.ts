import { describe, expect, it } from "vitest";
import { getDividerCollectionGroup } from "../collection-groups.js";

describe("getDividerCollectionGroup", () => {
  it("returns a slug expression for divider groups with two or more collections", () => {
    const group = getDividerCollectionGroup(
      [
        { type: "divider", label: "Reading" },
        { type: "collection", collection: { slug: "books" } },
        { type: "collection", collection: { slug: "essays" } },
        { type: "collection", collection: { slug: "notes" } },
      ],
      0,
    );

    expect(group).toEqual({
      slugExpression: "books+essays+notes",
      collectionCount: 3,
    });
  });

  it("stops at the next divider", () => {
    const group = getDividerCollectionGroup(
      [
        { type: "divider", label: "Reading" },
        { type: "collection", collection: { slug: "books" } },
        { type: "collection", collection: { slug: "essays" } },
        { type: "divider", label: "Watching" },
        { type: "collection", collection: { slug: "movies" } },
        { type: "collection", collection: { slug: "shows" } },
      ],
      0,
    );

    expect(group).toEqual({
      slugExpression: "books+essays",
      collectionCount: 2,
    });
  });

  it("ignores links while collecting grouped collection slugs", () => {
    const group = getDividerCollectionGroup(
      [
        { type: "divider", label: "Browse" },
        { type: "collection", collection: { slug: "books" } },
        { type: "link", label: "Quotes", url: "/archive?format=quote" },
        { type: "collection", collection: { slug: "essays" } },
      ],
      0,
    );

    expect(group).toEqual({
      slugExpression: "books+essays",
      collectionCount: 2,
    });
  });

  it("returns null for unlabeled dividers or groups with fewer than two collections", () => {
    expect(
      getDividerCollectionGroup(
        [
          { type: "divider", label: "" },
          { type: "collection", collection: { slug: "books" } },
          { type: "collection", collection: { slug: "essays" } },
        ],
        0,
      ),
    ).toBeNull();

    expect(
      getDividerCollectionGroup(
        [
          { type: "divider", label: "Solo" },
          { type: "collection", collection: { slug: "books" } },
        ],
        0,
      ),
    ).toBeNull();
  });
});
