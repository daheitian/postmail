/**
 * Minimal Theme - Collection Page
 *
 * Simple list of posts in a collection.
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
    <div>
      <header class="mb-8">
        <h1 class="text-2xl font-semibold">{collection.title}</h1>
        {collection.description && (
          <p class="text-muted-foreground mt-2">{collection.description}</p>
        )}
      </header>

      <main class="flex flex-col">
        {posts.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No posts in this collection.",
              comment: "@context: Empty state message",
            })}
          </p>
        ) : (
          posts.map((post, i) => (
            <article key={post.id} class="h-entry">
              {i > 0 && <hr class="my-6 border-border" />}
              {post.title && (
                <h2 class="p-name text-lg font-medium mb-2">
                  <a href={post.permalink} class="u-url hover:underline">
                    {post.title}
                  </a>
                </h2>
              )}
              <div
                class="e-content prose prose-sm"
                dangerouslySetInnerHTML={{ __html: post.contentHtml || "" }}
              />
              <footer class="mt-2 text-sm text-muted-foreground">
                <time class="dt-published" datetime={post.publishedAt}>
                  {post.publishedAtFormatted}
                </time>
              </footer>
            </article>
          ))
        )}
      </main>
    </div>
  );
};
