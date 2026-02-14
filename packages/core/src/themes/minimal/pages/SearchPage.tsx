/**
 * Minimal Theme - Search Page
 *
 * Minimal search form + results with page-based pagination.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { SearchPageProps } from "../../../types.js";
import { PagePagination as DefaultPagePagination } from "../../../theme/components/Pagination.js";

export const SearchPage: FC<SearchPageProps> = ({
  query,
  results,
  error,
  hasMore,
  page,
  theme,
}) => {
  const { t } = useLingui();
  const searchTitle = t({
    message: "Search",
    comment: "@context: Search page title",
  });

  const PaginationComponent = theme?.PagePagination ?? DefaultPagePagination;

  return (
    <div>
      <h1 class="text-2xl font-semibold mb-6">{searchTitle}</h1>

      <form method="get" action="/search" class="mb-8">
        <div class="flex gap-2">
          <input
            type="search"
            name="q"
            class="input flex-1"
            placeholder={t({
              message: "Search posts...",
              comment: "@context: Search input placeholder",
            })}
            value={query}
            autofocus
          />
          <button type="submit" class="btn">
            {t({
              message: "Search",
              comment: "@context: Search submit button",
            })}
          </button>
        </div>
      </form>

      {error && (
        <div class="alert-destructive mb-6">
          <h2>{error}</h2>
        </div>
      )}

      {query && !error && (
        <div>
          <p class="text-sm text-muted-foreground mb-4">
            {results.length === 0
              ? t({
                  message: "No results found.",
                  comment: "@context: Search empty results",
                })
              : results.length === 1
                ? t({
                    message: "Found 1 result",
                    comment: "@context: Search results count - single",
                  })
                : t({
                    message: "Found {count} results",
                    comment: "@context: Search results count - multiple",
                    values: { count: String(results.length) },
                  })}
          </p>

          {results.length > 0 && (
            <>
              <div class="flex flex-col gap-4">
                {results.map((result) => (
                  <article key={result.post.id} class="py-3">
                    <a href={result.post.permalink} class="block group">
                      <h2 class="font-medium group-hover:underline">
                        {result.post.title ||
                          result.post.content?.slice(0, 60) ||
                          `Post #${result.post.id}`}
                      </h2>

                      {result.snippet && (
                        <p
                          class="text-sm text-muted-foreground mt-1 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                      )}

                      <footer class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{result.post.type}</span>
                        <span>&middot;</span>
                        <time datetime={result.post.publishedAt}>
                          {result.post.publishedAtFormatted}
                        </time>
                      </footer>
                    </a>
                  </article>
                ))}
              </div>

              <PaginationComponent
                baseUrl={`/search?q=${encodeURIComponent(query)}`}
                currentPage={page}
                hasMore={hasMore}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
