/**
 * Collection Reorder
 *
 * Initializes SortableJS on the collections list in the dashboard.
 * Auto-detects the list element and only activates when present.
 * Sends prefixed string IDs (e.g. "c-1", "d-2") to support mixed
 * collections and dividers in a unified sort order.
 */

import Sortable from "sortablejs";

const list = document.getElementById("collections-list");
if (list) {
  Sortable.create(list, {
    animation: 150,
    handle: "[data-id]",
    onEnd() {
      const items = [...list.querySelectorAll<HTMLElement>("[data-id]")]
        .map((el) => el.dataset.id)
        .filter((id): id is string => id !== undefined);
      fetch("/dash/collections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    },
  });
}
