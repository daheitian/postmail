/**
 * Thread View Component
 *
 * Flat sibling layout with a continuous vertical line connecting all posts.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Post } from "../../types.js";
import * as time from "../../lib/time.js";

export interface ThreadViewProps {
  /** All posts in the thread, ordered by createdAt */
  posts: Post[];
  /** ID of the currently viewed post (to highlight) */
  currentPostId: string;
}

const ThreadPost: FC<{
  post: Post;
  isCurrent: boolean;
}> = ({ post, isCurrent }) => {
  const { t } = useLingui();
  return (
    <article
      id={`post-${post.id}`}
      class={`h-entry ${isCurrent ? "bg-primary/5 rounded-lg p-3" : ""}`}
    >
      {post.title && (
        <h2 class="p-name text-lg font-medium mb-2">
          <a href={`/${post.slug}`} class="u-url hover:underline">
            {post.title}
          </a>
        </h2>
      )}

      <div
        class="e-content prose prose-sm"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml || "" }}
      />

      <footer class="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        <time
          class="dt-published"
          datetime={time.toISOString(post.publishedAt)}
        >
          {time.formatDate(post.publishedAt)}
        </time>
        {!isCurrent && (
          <a href={`/${post.slug}`} class="text-xs hover:underline">
            {t({
              message: "Permalink",
              comment: "@context: Link to individual post in thread",
            })}
          </a>
        )}
      </footer>
    </article>
  );
};

export const ThreadView: FC<ThreadViewProps> = ({ posts, currentPostId }) => {
  const { t } = useLingui();
  if (posts.length === 0) {
    return null;
  }

  const rootPost = posts[0];

  // Single post, no thread
  if (posts.length <= 1) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Early return for empty array at line 68 guarantees posts[0] exists
      <ThreadPost post={rootPost!} isCurrent={true} />
    );
  }

  const threadLabel =
    posts.length === 1
      ? t({
          message: "Thread with 1 post",
          comment: "@context: Thread view header - single post",
        })
      : t({
          message: "Thread with {count} posts",
          comment: "@context: Thread view header - multiple posts",
          values: { count: String(posts.length) },
        });

  return (
    <div class="thread-view">
      <div class="mb-4 text-sm text-muted-foreground">{threadLabel}</div>

      <div class="thread-group">
        {posts.map((post) => (
          <div key={post.id} class="thread-item">
            <ThreadPost post={post} isCurrent={post.id === currentPostId} />
          </div>
        ))}
      </div>
    </div>
  );
};
