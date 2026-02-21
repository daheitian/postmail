/**
 * Search Page
 *
 * Search form and results — divider-separated instead of bordered cards.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { SearchPageProps } from "../../types.js";
import { PagePagination } from "../shared/Pagination.js";

export const SearchPage: FC<SearchPageProps> = ({
  query,
  results,
  error,
  hasMore,
  page,
}) => {
  const { t } = useLingui();
  const searchTitle = t({
    message: "Search",
    comment: "@context: Search page title",
  });

  return (
    <div class="py-6" data-page="search">
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
                    message: `Found ${String(results.length)} results`,
                    comment: "@context: Search results count - multiple",
                  })}
          </p>

          {results.length > 0 && (
            <>
              <div class="divide-y divide-border">
                {results.map((result) => (
                  <article
                    key={result.post.id}
                    class="py-4"
                    data-post
                    data-format={result.post.format}
                  >
                    <a href={result.post.permalink} class="block">
                      <h2 class="font-medium hover:underline">
                        {result.post.title ||
                          result.post.excerpt?.slice(0, 60) ||
                          "Post #" + result.post.id}
                      </h2>

                      {result.snippet && (
                        <p
                          class="text-sm text-muted-foreground mt-2 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                      )}

                      <footer class="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span class="badge-outline">{result.post.format}</span>
                        <time datetime={result.post.publishedAt}>
                          {result.post.publishedAtFormatted}
                        </time>
                      </footer>
                    </a>
                  </article>
                ))}
              </div>

              <PagePagination
                baseUrl={"/search?q=" + encodeURIComponent(query)}
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
