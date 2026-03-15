// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  getSortableMove,
  readSortableDataIds,
  revertSortableDomMove,
  setSortableDraggingState,
} from "../sortable-list.js";

function createList(ids: string[], dataKey: string): HTMLElement {
  const list = document.createElement("div");

  for (const id of ids) {
    const item = document.createElement("div");
    item.dataset[dataKey] = id;
    list.appendChild(item);
  }

  return list;
}

describe("sortable-list helpers", () => {
  it("reads ordered ids from dataset-backed sortable items", () => {
    const list = createList(["a", "b", "c"], "navId");

    expect(readSortableDataIds(list, "[data-nav-id]", "navId")).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("reverts DOM moves using the original index when no sibling is captured", () => {
    const list = createList(["a", "b", "c"], "navId");
    const movedItem = list.children[1] as HTMLElement;

    list.appendChild(movedItem);
    revertSortableDomMove(list, {
      item: movedItem,
      oldIndex: 1,
      newIndex: 2,
    });

    expect(readSortableDataIds(list, "[data-nav-id]", "navId")).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("reverts DOM moves using the captured next sibling when available", () => {
    const list = createList(["a", "b", "c"], "sidebarItem");
    const movedItem = list.children[1] as HTMLElement;
    const originalNextSibling = movedItem.nextSibling;

    list.appendChild(movedItem);
    revertSortableDomMove(
      list,
      {
        item: movedItem,
        oldIndex: 1,
        newIndex: 2,
      },
      originalNextSibling,
    );

    expect(
      readSortableDataIds(list, "[data-sidebar-item]", "sidebarItem"),
    ).toEqual(["a", "b", "c"]);
  });

  it("computes moved item neighbors from the new order", () => {
    expect(getSortableMove(["a", "c", "b"], 2)).toEqual({
      movedId: "b",
      movedIndex: 2,
      afterId: "c",
      beforeId: null,
    });
  });

  it("toggles the dragging marker on the list", () => {
    const list = document.createElement("div");

    setSortableDraggingState(list, true);
    expect(list.dataset.dragging).toBe("true");

    setSortableDraggingState(list, false);
    expect(list.dataset.dragging).toBeUndefined();
  });
});
