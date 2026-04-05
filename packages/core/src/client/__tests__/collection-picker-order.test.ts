import { describe, expect, it } from "vitest";
import {
  applyItemOrder,
  filterCollectionsBySearch,
  getSelectedFirstOrder,
} from "../collection-picker-order.js";

const collections = [
  { id: "col-1", title: "Claw", slug: "claw" },
  { id: "col-2", title: "New Wisdom", slug: "new-wisdom" },
  { id: "col-3", title: "Wisdom", slug: "wisdom" },
  { id: "col-4", title: "Archive", slug: "archive" },
];

describe("getSelectedFirstOrder", () => {
  it("moves selected collections to the front without reordering peers", () => {
    expect(getSelectedFirstOrder(collections, ["col-3", "col-1"])).toEqual([
      "col-1",
      "col-3",
      "col-2",
      "col-4",
    ]);
  });
});

describe("applyItemOrder", () => {
  it("applies a saved item order and appends unknown ids safely", () => {
    expect(
      applyItemOrder(collections, ["col-3", "missing", "col-1"]).map(
        (collection) => collection.id,
      ),
    ).toEqual(["col-3", "col-1", "col-2", "col-4"]);
  });
});

describe("filterCollectionsBySearch", () => {
  it("prioritizes prefix matches before broader substring matches", () => {
    expect(
      filterCollectionsBySearch(collections, "w").map(
        (collection) => collection.title,
      ),
    ).toEqual(["Wisdom", "New Wisdom", "Claw"]);
  });

  it("matches against slugs when the title does not match", () => {
    expect(
      filterCollectionsBySearch(
        [{ id: "col-5", title: "Archive", slug: "wisdom-notes" }],
        "wis",
      ).map((collection) => collection.id),
    ).toEqual(["col-5"]);
  });
});
