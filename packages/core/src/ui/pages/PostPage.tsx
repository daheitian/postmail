/**
 * Single Post Page
 *
 * Single post view — clean, no card border, with divider footer.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { PostPageProps } from "../../types.js";
import { MediaGallery } from "../shared/MediaGallery.js";

export const PostPage: FC<PostPageProps> = ({ post }) => {
  const { t } = useLingui();

  return (
    <article
      class="h-entry py-6"
      data-page="post"
      data-post
      data-format={post.format}
    >
      {post.title && (
        <h1 class="p-name text-2xl font-semibold mb-4">{post.title}</h1>
      )}

      {post.bodyHtml && (
        <div
          class="e-content prose"
          data-post-body
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      )}

      {post.media.length > 0 && (
        <div class="mt-4" data-post-media>
          <MediaGallery attachments={post.media} />
        </div>
      )}

      <footer
        class="mt-6 pt-4 border-t text-sm text-muted-foreground"
        data-post-meta
      >
        <time class="dt-published" datetime={post.publishedAt}>
          {post.publishedAtFormatted}
        </time>
        <a href={post.permalink} class="u-url ml-4">
          {t({
            message: "Permalink",
            comment: "@context: Link to permanent URL of post",
          })}
        </a>
      </footer>
    </article>
  );
};
