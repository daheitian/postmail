/**
 * Minimal Theme - Archive Page
 *
 * Date-first list with type filter and cursor pagination.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ArchivePageProps } from "../../../types.js";
import { POST_TYPES } from "../../../types.js";
import { Pagination as DefaultPagination } from "../../../theme/components/Pagination.js";

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

export const ArchivePage: FC<ArchivePageProps> = ({
  groups,
  hasMore,
  nextCursor,
  type,
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

        <nav class="flex flex-wrap gap-2 mt-4">
          <a
            href="/archive"
            class={`text-sm ${!type ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
              class={`text-sm ${type === typeKey ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {getTypeLabelPlural(typeKey)}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {groups.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No posts found.",
              comment: "@context: Archive empty state",
            })}
          </p>
        ) : (
          groups.map((group) => (
            <section key={`${group.year}-${group.month}`} class="mb-8">
              <h2 class="text-lg font-medium mb-4 text-muted-foreground">
                {group.label}
              </h2>
              <div class="flex flex-col gap-3">
                {group.posts.map((post) => (
                  <article key={post.id} class="flex items-baseline gap-4">
                    <time
                      class="text-sm text-muted-foreground w-12 shrink-0"
                      datetime={post.publishedAt}
                    >
                      {new Date(post.publishedAt).getUTCDate()}
                    </time>
                    <div class="flex-1 min-w-0">
                      <a href={post.permalink} class="hover:underline">
                        {post.title ||
                          post.content?.slice(0, 80) ||
                          `Post #${post.id}`}
                      </a>
                      {!type && (
                        <span class="ml-2 text-xs text-muted-foreground">
                          {getTypeLabel(post.type)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <PaginationComponent
        baseUrl={type ? `/archive?type=${type}` : "/archive"}
        hasMore={hasMore}
        nextCursor={nextCursor}
      />
    </div>
  );
};
