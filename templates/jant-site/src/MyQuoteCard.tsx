import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";
import { time, sqid } from "@jant/core";

export const MyQuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  const permalink = `/p/${sqid.encode(post.id)}`;

  return (
    <article
      class={`h-entry${compact ? " py-2" : " py-4"}`}
      style="border-left: 3px solid var(--color-primary); padding-left: 1rem; background: var(--color-muted); border-radius: 0 0.5rem 0.5rem 0;"
    >
      {post.contentHtml && (
        <blockquote
          class={`e-content ${compact ? "text-sm" : "text-lg"} font-serif italic`}
        >
          <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        </blockquote>
      )}
      {!compact && (post.sourceName || post.sourceUrl) && (
        <div
          class="mt-3 text-sm font-medium"
          style="color: var(--color-primary);"
        >
          {"— "}
          {post.sourceUrl ? (
            <a
              href={post.sourceUrl}
              class="underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {post.sourceName || post.sourceDomain || "Source"}
            </a>
          ) : (
            <span>{post.sourceName}</span>
          )}
        </div>
      )}
      <footer class="mt-2 text-xs text-muted-foreground">
        <a href={permalink} class="u-url hover:underline">
          <time
            class="dt-published"
            datetime={time.toISOString(post.publishedAt)}
          >
            {time.formatDate(post.publishedAt)}
          </time>
        </a>
      </footer>
    </article>
  );
};
