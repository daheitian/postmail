/**
 * Archive Page
 *
 * Posts grouped by year-month with format filter and cursor pagination.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ArchivePageProps } from "../../types.js";
import { FORMATS } from "../../types.js";
import { Pagination } from "../shared/Pagination.js";

function getFormatLabel(format: string): string {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    note: t({ message: "Note", comment: "@context: Post format label - note" }),
    link: t({ message: "Link", comment: "@context: Post format label - link" }),
    quote: t({
      message: "Quote",
      comment: "@context: Post format label - quote",
    }),
  };
  return labels[format] ?? format;
}

function getFormatLabelPlural(format: string): string {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    note: t({
      message: "Notes",
      comment: "@context: Post format label plural - notes",
    }),
    link: t({
      message: "Links",
      comment: "@context: Post format label plural - links",
    }),
    quote: t({
      message: "Quotes",
      comment: "@context: Post format label plural - quotes",
    }),
  };
  return labels[format] ?? format + "s";
}

export const ArchivePage: FC<ArchivePageProps> = ({
  groups,
  hasMore,
  nextCursor,
  format,
  visibility,
}) => {
  const { t } = useLingui();
  const title = format
    ? getFormatLabelPlural(format)
    : t({ message: "Archive", comment: "@context: Archive page title" });

  return (
    <div class="py-6" data-page="archive">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold">{title}</h1>

        {/* Format filter */}
        <nav class="flex flex-wrap gap-2 mt-4">
          <a
            href="/archive"
            class={
              "badge " +
              (!format && !visibility ? "badge-primary" : "badge-outline")
            }
          >
            {t({
              message: "All",
              comment: "@context: Archive filter - all formats",
            })}
          </a>
          {FORMATS.map((formatKey) => (
            <a
              key={formatKey}
              href={"/archive?format=" + formatKey}
              class={
                "badge " +
                (format === formatKey ? "badge-primary" : "badge-outline")
              }
            >
              {getFormatLabelPlural(formatKey)}
            </a>
          ))}
          <a
            href="/archive?visibility=featured"
            class={
              "badge " +
              (visibility === "featured" ? "badge-primary" : "badge-outline")
            }
          >
            {t({
              message: "Featured",
              comment: "@context: Archive filter - featured posts",
            })}
          </a>
        </nav>
      </header>

      <main>
        {groups.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No posts match this filter.",
              comment: "@context: Archive empty state",
            })}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.year + "-" + group.month} class="mb-8">
              <h2 class="text-lg font-medium mb-4 text-muted-foreground">
                {group.label}
              </h2>
              <div class="divide-y divide-border">
                {group.posts.map((post) => (
                  <article
                    key={post.id}
                    class="flex items-baseline gap-4 py-2.5"
                    data-post
                    data-format={post.format}
                  >
                    <time
                      class="text-sm text-muted-foreground w-12 shrink-0"
                      datetime={post.publishedAt}
                    >
                      {new Date(post.publishedAt).getUTCDate()}
                    </time>
                    <div class="flex-1 min-w-0">
                      <a href={post.permalink} class="hover:underline">
                        {post.title ||
                          post.excerpt?.slice(0, 80) ||
                          "Post #" + post.id}
                      </a>
                      {!format && (
                        <span class="ml-2 badge-outline text-xs">
                          {getFormatLabel(post.format)}
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

      {/* Pagination */}
      <Pagination
        baseUrl={
          format
            ? "/archive?format=" + format
            : visibility
              ? "/archive?visibility=" + visibility
              : "/archive"
        }
        hasMore={hasMore}
        nextCursor={nextCursor}
      />
    </div>
  );
};
