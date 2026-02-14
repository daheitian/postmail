/**
 * Default Search Page Component
 *
 * Renders search form and results with page-based pagination.
 * Theme authors can replace this entirely via ThemeComponents.SearchPage.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { SearchPageProps } from "../../types.js";
import { PagePagination as DefaultPagePagination } from "../components/Pagination.js";
import * as sqid from "../../lib/sqid.js";
import * as time from "../../lib/time.js";

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

      {/* Search form */}
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

      {/* Error */}
      {error && (
        <div class="alert-destructive mb-6">
          <h2>{error}</h2>
        </div>
      )}

      {/* Results */}
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
                  <article
                    key={result.post.id}
                    class="p-4 rounded-lg border hover:border-primary"
                  >
                    <a href={`/p/${sqid.encode(result.post.id)}`} class="block">
                      <h2 class="font-medium hover:underline">
                        {result.post.title ||
                          result.post.content?.slice(0, 60) ||
                          `Post #${result.post.id}`}
                      </h2>

                      {result.snippet && (
                        <p
                          class="text-sm text-muted-foreground mt-2 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                      )}

                      <footer class="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span class="badge-outline">{result.post.type}</span>
                        <time
                          datetime={time.toISOString(result.post.publishedAt)}
                        >
                          {time.formatDate(result.post.publishedAt)}
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
