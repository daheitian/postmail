/**
 * Single collection detail view
 */

import { useLingui } from "@lingui/react/macro";
import type { Collection, PostView } from "../../../types.js";
import { ActionButtons } from "../index.js";
import { encode } from "../../../lib/sqid.js";
import { renderCollectionIcon } from "../../../lib/icons.js";

export function ViewCollectionContent({
  collection,
  posts,
}: {
  collection: Collection;
  posts: PostView[];
}) {
  const { t } = useLingui();
  const count = String(posts.length);
  const postsHeader = t({
    message: `Posts in Collection (${count})`,
    comment: "@context: Collection posts section heading",
  });

  return (
    <>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold flex items-center gap-2">
            {collection.icon && (
              <span
                class="shrink-0"
                dangerouslySetInnerHTML={{
                  __html: renderCollectionIcon(collection.icon, { size: 24 }),
                }}
              />
            )}
            {collection.title}
          </h1>
          <p class="text-sm text-muted-foreground">/{collection.slug}</p>
        </div>
        <ActionButtons
          editHref={`/dash/collections/${collection.id}/edit`}
          editLabel={t({
            message: "Edit",
            comment: "@context: Button to edit collection",
          })}
          viewHref={`/c/${collection.slug}`}
          viewLabel={t({
            message: "View",
            comment: "@context: Button to view collection",
          })}
        />
      </div>

      {collection.description && (
        <p class="text-muted-foreground mb-6">{collection.description}</p>
      )}

      <div class="card">
        <header>
          <h2>{postsHeader}</h2>
        </header>
        <section>
          {posts.length === 0 ? (
            <p class="text-muted-foreground">
              {t({
                message: "No posts in this collection.",
                comment: "@context: Empty state message",
              })}
            </p>
          ) : (
            <div class="flex flex-col divide-y">
              {posts.map((post) => (
                <div key={post.id} class="py-3 flex items-center gap-4">
                  <div class="flex-1 min-w-0">
                    <a
                      href={`/dash/posts/${encode(post.id)}`}
                      class="font-medium hover:underline"
                    >
                      {post.title ||
                        post.excerpt?.slice(0, 50) ||
                        `Post #${post.id}`}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div class="mt-6">
        <a href="/dash/collections" class="text-sm hover:underline">
          {t({
            message: "\u2190 Back to Collections",
            comment: "@context: Navigation link",
          })}
        </a>
      </div>
    </>
  );
}
