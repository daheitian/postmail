interface CollectionLike {
  id: string;
}

export function getSelectedFirstOrder<T extends CollectionLike>(
  items: readonly T[],
  selectedIds: readonly string[],
): string[] {
  if (items.length === 0) return [];

  const selected = new Set(selectedIds);
  const selectedOrder: string[] = [];
  const unselectedOrder: string[] = [];

  for (const item of items) {
    if (selected.has(item.id)) {
      selectedOrder.push(item.id);
    } else {
      unselectedOrder.push(item.id);
    }
  }

  return [...selectedOrder, ...unselectedOrder];
}

export function applyItemOrder<T extends CollectionLike>(
  items: readonly T[],
  orderedIds: readonly string[],
): T[] {
  if (items.length === 0 || orderedIds.length === 0) {
    return [...items];
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const orderedItems: T[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const item = itemById.get(id);
    if (!item || seen.has(id)) continue;
    orderedItems.push(item);
    seen.add(id);
  }

  for (const item of items) {
    if (seen.has(item.id)) continue;
    orderedItems.push(item);
  }

  return orderedItems;
}
