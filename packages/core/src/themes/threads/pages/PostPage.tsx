/**
 * Threads Theme - Post Page
 *
 * Single post view — clean, no card border, with divider footer.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { PostPageProps } from "../../../types.js";
import { MediaGallery as DefaultMediaGallery } from "../../../theme/index.js";

export const PostPage: FC<PostPageProps> = ({ post, theme }) => {
  const { t } = useLingui();

  const Gallery = theme?.MediaGallery ?? DefaultMediaGallery;

  return (
    <article class="h-entry py-6">
      {post.title && (
        <h1 class="p-name text-2xl font-semibold mb-4">{post.title}</h1>
      )}

      <div
        class="e-content prose"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml || "" }}
      />

      {post.media.length > 0 && (
        <div class="threads-media mt-4">
          <Gallery attachments={post.media} />
        </div>
      )}

      <footer class="mt-6 pt-4 border-t text-sm text-muted-foreground">
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
