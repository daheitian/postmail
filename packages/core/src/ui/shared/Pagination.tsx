/**
 * Pagination Component
 *
 * Cursor-based pagination for post lists
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import { getPageNumbers } from "../../lib/pagination.js";

export interface PaginationProps {
  /** Base URL for pagination links (e.g., "/archive", "/search?q=test") */
  baseUrl: string;
  /** Whether there are more items after the current page */
  hasMore: boolean;
  /** Cursor for the next page (typically the last item's ID) */
  nextCursor?: number | string;
  /** Cursor for the previous page */
  prevCursor?: number | string;
  /** Parameter name for cursor (default: "cursor") */
  cursorParam?: string;
}

export const Pagination: FC<PaginationProps> = ({
  baseUrl,
  hasMore,
  nextCursor,
  prevCursor,
  cursorParam = "cursor",
}) => {
  const { t } = useLingui();
  const hasPrev = prevCursor !== undefined;
  const hasNext = hasMore && nextCursor !== undefined;

  if (!hasPrev && !hasNext) {
    return null;
  }

  // Build URL with cursor parameter
  const buildUrl = (cursor: number | string) => {
    const url = new URL(baseUrl, "http://localhost");
    url.searchParams.set(cursorParam, String(cursor));
    return `${url.pathname}${url.search}`;
  };

  const prevText = t({
    message: "Previous",
    comment: "@context: Pagination button - previous page",
  });
  const nextText = t({
    message: "Next",
    comment: "@context: Pagination button - next page",
  });

  return (
    <nav class="flex items-center justify-between py-4" aria-label="Pagination">
      <div>
        {hasPrev ? (
          <a href={buildUrl(prevCursor)} class="btn-outline text-sm">
            ← {prevText}
          </a>
        ) : (
          <span class="btn-outline text-sm opacity-50 cursor-not-allowed">
            ← {prevText}
          </span>
        )}
      </div>

      <div>
        {hasNext ? (
          <a href={buildUrl(nextCursor)} class="btn-outline text-sm">
            {nextText} →
          </a>
        ) : (
          <span class="btn-outline text-sm opacity-50 cursor-not-allowed">
            {nextText} →
          </span>
        )}
      </div>
    </nav>
  );
};

/**
 * Simple "Load More" style pagination
 */
export interface LoadMoreProps {
  /** URL for loading more items */
  href: string;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Button text */
  text?: string;
}

export const LoadMore: FC<LoadMoreProps> = ({ href, hasMore, text }) => {
  const { t } = useLingui();
  if (!hasMore) {
    return null;
  }

  const buttonText =
    text ??
    t({
      message: "Load more",
      comment: "@context: Pagination button - load more items",
    });

  return (
    <div class="text-center py-4">
      <a href={href} class="btn-outline">
        {buttonText}
      </a>
    </div>
  );
};

/**
 * Page-based pagination with optional numbered pages.
 *
 * When `totalPages` is provided, renders numbered page links with ellipsis.
 * Otherwise falls back to simple Previous/Next navigation.
 */
export interface PagePaginationProps {
  /** Base URL (query params will be added) */
  baseUrl: string;
  /** Current page (1-indexed) */
  currentPage: number;
  /** Whether there are more pages (used when totalPages is unknown) */
  hasMore?: boolean;
  /** Total number of pages (enables numbered pagination) */
  totalPages?: number;
  /** Page parameter name (default: "page") */
  pageParam?: string;
}

export const PagePagination: FC<PagePaginationProps> = ({
  baseUrl,
  currentPage,
  hasMore,
  totalPages,
  pageParam = "page",
}) => {
  const { t } = useLingui();
  const hasPrev = currentPage > 1;
  const hasNext = totalPages ? currentPage < totalPages : (hasMore ?? false);

  if (!hasPrev && !hasNext) {
    return null;
  }

  // Build URL with page parameter
  const buildUrl = (page: number) => {
    const url = new URL(baseUrl, "http://localhost");
    if (page > 1) {
      url.searchParams.set(pageParam, String(page));
    } else {
      url.searchParams.delete(pageParam);
    }
    return `${url.pathname}${url.search}`;
  };

  const prevText = t({
    message: "Previous",
    comment: "@context: Pagination button - previous page",
  });
  const nextText = t({
    message: "Next",
    comment: "@context: Pagination button - next page",
  });

  // Numbered pagination when totalPages is known
  if (totalPages && totalPages > 1) {
    const pageNumbers = getPageNumbers(currentPage, totalPages);

    return (
      <nav
        class="flex items-center justify-center gap-4 py-6 text-sm"
        aria-label="Pagination"
      >
        {hasPrev ? (
          <a
            href={buildUrl(currentPage - 1)}
            class="underline text-muted-foreground hover:text-foreground"
          >
            {prevText}
          </a>
        ) : (
          <span class="text-muted-foreground/50">{prevText}</span>
        )}

        {pageNumbers.map((page, i) =>
          page === 0 ? (
            <span key={`ellipsis-${i}`} class="text-muted-foreground">
              ...
            </span>
          ) : page === currentPage ? (
            <span key={page} aria-current="page">
              {page}
            </span>
          ) : (
            <a
              key={page}
              href={buildUrl(page)}
              class="underline text-muted-foreground hover:text-foreground"
            >
              {page}
            </a>
          ),
        )}

        {hasNext ? (
          <a
            href={buildUrl(currentPage + 1)}
            class="underline text-muted-foreground hover:text-foreground"
          >
            {nextText}
          </a>
        ) : (
          <span class="text-muted-foreground/50">{nextText}</span>
        )}
      </nav>
    );
  }

  // Simple prev/next fallback when totalPages is unknown
  const page = String(currentPage);
  const pageText = t({
    message: `Page ${page}`,
    comment: "@context: Pagination - current page indicator",
  });

  return (
    <nav class="flex items-center justify-between py-4" aria-label="Pagination">
      <div>
        {hasPrev ? (
          <a href={buildUrl(currentPage - 1)} class="btn-outline text-sm">
            ← {prevText}
          </a>
        ) : (
          <span class="btn-outline text-sm opacity-50 cursor-not-allowed">
            ← {prevText}
          </span>
        )}
      </div>

      <span class="text-sm text-muted-foreground">{pageText}</span>

      <div>
        {hasNext ? (
          <a href={buildUrl(currentPage + 1)} class="btn-outline text-sm">
            {nextText} →
          </a>
        ) : (
          <span class="btn-outline text-sm opacity-50 cursor-not-allowed">
            {nextText} →
          </span>
        )}
      </div>
    </nav>
  );
};
