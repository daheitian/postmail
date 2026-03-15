import type { SortableEvent, SortableOptions } from "sortablejs";

/**
 * Shared SortableJS defaults for list reordering.
 *
 * @returns Baseline options that make drag interactions feel responsive on
 * vertical and horizontal lists.
 * @example
 * Sortable.create(list, {
 *   ...responsiveSortableOptions,
 *   handle: "[data-drag-handle]",
 *   scroll: true,
 * });
 */
export const responsiveSortableOptions = {
  animation: 180,
  bubbleScroll: false,
  fallbackTolerance: 4,
  forceAutoScrollFallback: true,
  scrollSensitivity: 56,
  scrollSpeed: 18,
} satisfies SortableOptions;

/**
 * Reads item ids from a sortable list using a data attribute-backed selector.
 *
 * @param list - The sortable container element.
 * @param itemSelector - Selector matching sortable items.
 * @param dataKey - The camelCased dataset key to read from each item.
 * @returns Ordered ids currently rendered in the DOM.
 * @example
 * const ids = readSortableDataIds(list, "[data-nav-id]", "navId");
 */
export function readSortableDataIds(
  list: HTMLElement,
  itemSelector: string,
  dataKey: string,
): string[] {
  return [...list.querySelectorAll<HTMLElement>(itemSelector)]
    .map((el) => el.dataset[dataKey])
    .filter((id): id is string => id !== undefined);
}

/**
 * Captures the original next sibling before Sortable mutates the DOM.
 *
 * @param event - Sortable lifecycle event.
 * @returns The node that originally followed the dragged item.
 * @example
 * onStart: (event) => {
 *   this.#revertNextSibling = captureSortableRevertNextSibling(event);
 * }
 */
export function captureSortableRevertNextSibling(
  event: SortableEvent,
): Node | null {
  return event.item.nextSibling;
}

/**
 * Reverts Sortable's DOM mutation so Lit can re-render from state.
 *
 * @param list - The sortable container element.
 * @param event - Sortable lifecycle event.
 * @param originalNextSibling - Optional sibling captured on drag start.
 * @returns Nothing.
 * @example
 * revertSortableDomMove(list, event, this.#revertNextSibling);
 */
export function revertSortableDomMove(
  list: HTMLElement,
  event: SortableEvent,
  originalNextSibling: Node | null = null,
): void {
  const { item, oldIndex, newIndex } = event;
  if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;

  item.parentNode?.removeChild(item);

  if (originalNextSibling) {
    list.insertBefore(item, originalNextSibling);
    return;
  }

  const children = list.children;
  if (oldIndex >= children.length) {
    list.appendChild(item);
  } else {
    list.insertBefore(item, children[oldIndex] ?? null);
  }
}

/**
 * Sets or clears the shared sortable dragging marker on a list.
 *
 * @param list - The sortable container element.
 * @param dragging - Whether the list is currently being dragged.
 * @returns Nothing.
 * @example
 * setSortableDraggingState(list, true);
 */
export function setSortableDraggingState(
  list: HTMLElement,
  dragging: boolean,
): void {
  if (dragging) {
    list.dataset.dragging = "true";
    return;
  }

  delete list.dataset.dragging;
}

/**
 * Computes moved item metadata from a reordered id list.
 *
 * @param orderedIds - Item ids in their new order.
 * @param newIndex - Sortable's reported drop index.
 * @returns The moved item id and its neighboring ids.
 * @example
 * const move = getSortableMove(ids, event.newIndex);
 */
export function getSortableMove(
  orderedIds: string[],
  newIndex?: number,
): {
  movedId: string | undefined;
  movedIndex: number;
  afterId: string | null;
  beforeId: string | null;
} {
  const movedId = newIndex != null ? orderedIds[newIndex] : undefined;
  if (!movedId) {
    return {
      movedId: undefined,
      movedIndex: -1,
      afterId: null,
      beforeId: null,
    };
  }

  const movedIndex = orderedIds.indexOf(movedId);
  return {
    movedId,
    movedIndex,
    afterId: movedIndex > 0 ? orderedIds[movedIndex - 1] : null,
    beforeId:
      movedIndex >= 0 && movedIndex < orderedIds.length - 1
        ? orderedIds[movedIndex + 1]
        : null,
  };
}
