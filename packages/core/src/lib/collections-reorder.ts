/**
 * Collection Reorder
 *
 * Initializes SortableJS on the collections list in the dashboard.
 * Auto-detects the list element and only activates when present.
 */

import Sortable from "sortablejs";

const list = document.getElementById("collections-list");
if (list) {
  Sortable.create(list, {
    animation: 150,
    handle: "[data-id]",
    onEnd() {
      const ids = [...list.querySelectorAll<HTMLElement>("[data-id]")].map(
        (el) => Number(el.dataset.id),
      );
      fetch("/dash/collections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
  });
}
