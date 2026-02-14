/**
 * Card Theme - Post Page
 *
 * Single post view with media gallery.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { PostPageProps } from "@jant/core";
import { MediaGallery as DefaultMediaGallery } from "@jant/core/theme";

export const PostPage: FC<PostPageProps> = ({ post, theme }) => {
  const { t } = useLingui();

  const Gallery = theme?.MediaGallery ?? DefaultMediaGallery;

  return (
    <article class="h-entry">
      {post.title && (
        <h1 class="p-name text-2xl font-semibold mb-4">{post.title}</h1>
      )}

      <div
        class="e-content prose"
        dangerouslySetInnerHTML={{ __html: post.contentHtml || "" }}
      />

      {post.media.length > 0 && <Gallery attachments={post.media} />}

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
