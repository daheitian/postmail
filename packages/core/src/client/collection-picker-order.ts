interface CollectionLike {
  id: string;
}

interface SearchableCollectionLike extends CollectionLike {
  title: string;
  slug?: string | null;
}

function normalizeSearchValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getFieldSearchRank(
  value: string | null | undefined,
  search: string,
): number | null {
  const normalized = normalizeSearchValue(value);
  if (!normalized) return null;

  if (normalized === search) return 0;
  if (normalized.startsWith(search)) return 1;

  const tokens = normalized.split(/[\s\-_.:/]+/).filter(Boolean);
  if (tokens.some((token) => token.startsWith(search))) return 2;

  return normalized.includes(search) ? 3 : null;
}

function getItemSearchRank<T extends SearchableCollectionLike>(
  item: T,
  search: string,
): number | null {
  const titleRank = getFieldSearchRank(item.title, search);
  if (titleRank !== null) return titleRank;

  const slugRank = getFieldSearchRank(item.slug, search);
  return slugRank === null ? null : slugRank + 4;
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

/**
 * Filters collection-like items by a case-insensitive query and ranks
 * stronger matches first while preserving the existing order for ties.
 *
 * Match priority:
 * 1. Title match beats slug-only match
 * 2. Exact match
 * 3. Starts-with match
 * 4. Token starts-with match
 * 5. Includes match
 *
 * @param items - Collections in their current display order
 * @param search - User-entered search query
 * @returns Matching collections ordered by relevance
 *
 * @example
 * ```ts
 * filterCollectionsBySearch(items, "wis");
 * ```
 */
export function filterCollectionsBySearch<T extends SearchableCollectionLike>(
  items: readonly T[],
  search: string,
): T[] {
  const normalizedSearch = normalizeSearchValue(search);
  if (!normalizedSearch) return [...items];

  return items
    .map((item, index) => ({
      item,
      index,
      rank: getItemSearchRank(item, normalizedSearch),
    }))
    .filter((entry): entry is { item: T; index: number; rank: number } => {
      return entry.rank !== null;
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}
