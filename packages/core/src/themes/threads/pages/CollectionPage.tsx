/**
 * Threads Theme - Collection Page
 *
 * Collection header with divider-separated post list.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionPageProps } from "../../../types.js";

export const CollectionPage: FC<CollectionPageProps> = ({
  collection,
  posts,
}) => {
  const { t } = useLingui();

  return (
    <div class="py-6">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold">{collection.title}</h1>
        {collection.description && (
          <p class="text-muted-foreground mt-2">{collection.description}</p>
        )}
      </header>

      <main>
        {posts.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No posts in this collection.",
              comment: "@context: Empty state message",
            })}
          </p>
        ) : (
          <div class="divide-y divide-border">
            {posts.map((post) => (
              <article key={post.id} class="h-entry py-4">
                {post.title && (
                  <h2 class="p-name text-lg font-medium mb-2">
                    <a href={post.permalink} class="u-url hover:underline">
                      {post.title}
                    </a>
                  </h2>
                )}
                <div
                  class="e-content prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: post.bodyHtml || "" }}
                />
                <footer class="mt-2 text-sm text-muted-foreground">
                  <time class="dt-published" datetime={post.publishedAt}>
                    {post.publishedAtFormatted}
                  </time>
                </footer>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
