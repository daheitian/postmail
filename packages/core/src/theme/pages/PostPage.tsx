/**
 * Default Post Page Component
 *
 * Renders a single post with media gallery.
 * Theme authors can replace this entirely via ThemeComponents.PostPage.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { PostPageProps } from "../../types.js";
import { MediaGallery as DefaultMediaGallery } from "../components/MediaGallery.js";
import * as sqid from "../../lib/sqid.js";
import * as time from "../../lib/time.js";

export const PostPage: FC<PostPageProps> = ({
  post,
  mediaAttachments,
  theme,
}) => {
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

      {mediaAttachments.length > 0 && (
        <Gallery attachments={mediaAttachments} />
      )}

      <footer class="mt-6 pt-4 border-t text-sm text-muted-foreground">
        <time
          class="dt-published"
          datetime={time.toISOString(post.publishedAt)}
        >
          {time.formatDate(post.publishedAt)}
        </time>
        <a href={`/p/${sqid.encode(post.id)}`} class="u-url ml-4">
          {t({
            message: "Permalink",
            comment: "@context: Link to permanent URL of post",
          })}
        </a>
      </footer>
    </article>
  );
};
