/**
 * Default Collection Page Component
 *
 * Renders a collection with its posts.
 * Theme authors can replace this entirely via ThemeComponents.CollectionPage.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionPageProps } from "../../types.js";
import * as sqid from "../../lib/sqid.js";
import * as time from "../../lib/time.js";

export const CollectionPage: FC<CollectionPageProps> = ({
  collection,
  posts,
}) => {
  const { t } = useLingui();

  return (
    <div>
      <header class="mb-8">
        <h1 class="text-2xl font-semibold">{collection.title}</h1>
        {collection.description && (
          <p class="text-muted-foreground mt-2">{collection.description}</p>
        )}
      </header>

      <main class="flex flex-col gap-6">
        {posts.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No posts in this collection.",
              comment: "@context: Empty state message",
            })}
          </p>
        ) : (
          posts.map((post) => (
            <article key={post.id} class="h-entry">
              {post.title && (
                <h2 class="p-name text-lg font-medium mb-2">
                  <a
                    href={`/p/${sqid.encode(post.id)}`}
                    class="u-url hover:underline"
                  >
                    {post.title}
                  </a>
                </h2>
              )}
              <div
                class="e-content prose prose-sm"
                dangerouslySetInnerHTML={{ __html: post.contentHtml || "" }}
              />
              <footer class="mt-2 text-sm text-muted-foreground">
                <time
                  class="dt-published"
                  datetime={time.toISOString(post.publishedAt)}
                >
                  {time.formatDate(post.publishedAt)}
                </time>
              </footer>
            </article>
          ))
        )}
      </main>
    </div>
  );
};
