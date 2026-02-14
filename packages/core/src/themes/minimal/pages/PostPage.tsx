/**
 * Minimal Theme - Post Page
 *
 * Clean article layout for a single post.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { PostPageProps } from "../../../types.js";
import { MediaGallery as DefaultMediaGallery } from "../../../theme/components/MediaGallery.js";

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

      <footer class="mt-8 pt-4 border-t border-border text-sm text-muted-foreground">
        <time class="dt-published" datetime={post.publishedAt}>
          {post.publishedAtFormatted}
        </time>
        <a href={post.permalink} class="u-url ml-4 hover:underline">
          {t({
            message: "Permalink",
            comment: "@context: Link to permanent URL of post",
          })}
        </a>
      </footer>
    </article>
  );
};
