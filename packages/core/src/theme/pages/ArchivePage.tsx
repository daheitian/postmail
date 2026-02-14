/**
 * Default Archive Page Component
 *
 * Renders posts grouped by year-month with type filter and cursor pagination.
 * Theme authors can replace this entirely via ThemeComponents.ArchivePage.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ArchivePageProps } from "../../types.js";
import { POST_TYPES } from "../../types.js";
import { Pagination as DefaultPagination } from "../components/Pagination.js";
import * as sqid from "../../lib/sqid.js";
import * as time from "../../lib/time.js";

function getTypeLabel(type: string): string {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    note: t({ message: "Note", comment: "@context: Post type label - note" }),
    article: t({
      message: "Article",
      comment: "@context: Post type label - article",
    }),
    link: t({ message: "Link", comment: "@context: Post type label - link" }),
    quote: t({
      message: "Quote",
      comment: "@context: Post type label - quote",
    }),
    image: t({
      message: "Image",
      comment: "@context: Post type label - image",
    }),
    page: t({ message: "Page", comment: "@context: Post type label - page" }),
  };
  return labels[type] ?? type;
}

function getTypeLabelPlural(type: string): string {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    note: t({
      message: "Notes",
      comment: "@context: Post type label plural - notes",
    }),
    article: t({
      message: "Articles",
      comment: "@context: Post type label plural - articles",
    }),
    link: t({
      message: "Links",
      comment: "@context: Post type label plural - links",
    }),
    quote: t({
      message: "Quotes",
      comment: "@context: Post type label plural - quotes",
    }),
    image: t({
      message: "Images",
      comment: "@context: Post type label plural - images",
    }),
    page: t({
      message: "Pages",
      comment: "@context: Post type label plural - pages",
    }),
  };
  return labels[type] ?? `${type}s`;
}

function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- yearMonth format YYYY-MM guarantees both year and month exist
  const date = new Date(parseInt(year!, 10), parseInt(month!, 10) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export const ArchivePage: FC<ArchivePageProps> = ({
  posts,
  hasMore,
  nextCursor,
  type,
  grouped,
  replyCounts,
  theme,
}) => {
  const { t } = useLingui();
  const title = type
    ? getTypeLabelPlural(type)
    : t({ message: "Archive", comment: "@context: Archive page title" });

  const PaginationComponent = theme?.Pagination ?? DefaultPagination;

  return (
    <div>
      <header class="mb-8">
        <h1 class="text-2xl font-semibold">{title}</h1>

        {/* Type filter */}
        <nav class="flex flex-wrap gap-2 mt-4">
          <a
            href="/archive"
            class={`badge ${!type ? "badge-primary" : "badge-outline"}`}
          >
            {t({
              message: "All",
              comment: "@context: Archive filter - all types",
            })}
          </a>
          {POST_TYPES.filter((t) => t !== "page").map((typeKey) => (
            <a
              key={typeKey}
              href={`/archive?type=${typeKey}`}
              class={`badge ${type === typeKey ? "badge-primary" : "badge-outline"}`}
            >
              {getTypeLabelPlural(typeKey)}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {posts.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No posts found.",
              comment: "@context: Archive empty state",
            })}
          </p>
        ) : (
          Array.from(grouped.entries()).map(([yearMonth, monthPosts]) => (
            <section key={yearMonth} class="mb-8">
              <h2 class="text-lg font-medium mb-4 text-muted-foreground">
                {formatYearMonth(yearMonth)}
              </h2>
              <div class="flex flex-col gap-3">
                {monthPosts.map((post) => {
                  const replyCount = replyCounts.get(post.id);
                  return (
                    <article key={post.id} class="flex items-baseline gap-4">
                      <time
                        class="text-sm text-muted-foreground w-12 shrink-0"
                        datetime={time.toISOString(post.publishedAt)}
                      >
                        {new Date(post.publishedAt * 1000).getDate()}
                      </time>
                      <div class="flex-1 min-w-0">
                        <a
                          href={`/p/${sqid.encode(post.id)}`}
                          class="hover:underline"
                        >
                          {post.title ||
                            post.content?.slice(0, 80) ||
                            `Post #${post.id}`}
                        </a>
                        {!type && (
                          <span class="ml-2 badge-outline text-xs">
                            {getTypeLabel(post.type)}
                          </span>
                        )}
                        {replyCount && replyCount > 0 && (
                          <span class="ml-2 text-xs text-muted-foreground">
                            (
                            {replyCount === 1
                              ? t({
                                  message: "1 reply",
                                  comment:
                                    "@context: Archive post reply indicator - single",
                                })
                              : t({
                                  message: "{count} replies",
                                  comment:
                                    "@context: Archive post reply indicator - plural",
                                  values: { count: String(replyCount) },
                                })}
                            )
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Pagination */}
      <PaginationComponent
        baseUrl={type ? `/archive?type=${type}` : "/archive"}
        hasMore={hasMore}
        nextCursor={nextCursor}
      />
    </div>
  );
};
