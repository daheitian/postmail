/**
 * Home Page Route
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, Post, MediaAttachment } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { BaseLayout } from "../../theme/layouts/index.js";
import { MediaGallery } from "../../theme/components/index.js";
import * as sqid from "../../lib/sqid.js";
import * as time from "../../lib/time.js";
import { getSiteName } from "../../lib/config.js";
import { getMediaUrl, getImageUrl } from "../../lib/image.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const homeRoutes = new Hono<Env>();

function HomeContent({
  siteName,
  posts,
  mediaMap,
}: {
  siteName: string;
  posts: Post[];
  mediaMap: Map<number, MediaAttachment[]>;
}) {
  const { t } = useLingui();

  return (
    <div class="container py-8">
      <header class="mb-8 flex items-center justify-between">
        <h1 class="text-2xl font-semibold">{siteName}</h1>
        <nav class="flex items-center gap-4 text-sm">
          <a
            href="/archive"
            class="text-muted-foreground hover:text-foreground"
          >
            {t({
              message: "Archive",
              comment: "@context: Navigation link to archive page",
            })}
          </a>
          <a href="/feed" class="text-muted-foreground hover:text-foreground">
            RSS
          </a>
        </nav>
      </header>

      <main class="flex flex-col gap-6">
        {posts.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No posts yet.",
              comment: "@context: Empty state message on home page",
            })}
          </p>
        ) : (
          posts.map((post) => {
            const attachments = mediaMap.get(post.id) ?? [];
            return (
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
                {attachments.length > 0 && (
                  <MediaGallery attachments={attachments} />
                )}
                <footer class="mt-2 text-sm text-muted-foreground">
                  <time
                    class="dt-published"
                    datetime={time.toISOString(post.publishedAt)}
                  >
                    {time.formatDate(post.publishedAt)}
                  </time>
                  {post.visibility === "featured" && (
                    <span class="ml-2 text-xs">
                      {t({
                        message: "Featured",
                        comment: "@context: Post visibility badge",
                      })}
                    </span>
                  )}
                </footer>
              </article>
            );
          })
        )}
      </main>

      {posts.length >= 20 && (
        <nav class="mt-8 text-center">
          <a
            href="/archive"
            class="text-sm text-muted-foreground hover:text-foreground"
          >
            {t({
              message: "View all posts →",
              comment: "@context: Link to view all posts on archive page",
            })}
          </a>
        </nav>
      )}
    </div>
  );
}

homeRoutes.get("/", async (c) => {
  const siteName = await getSiteName(c);

  const posts = await c.var.services.posts.list({
    visibility: ["featured", "quiet"],
    limit: 20,
  });

  // Batch load media attachments
  const postIds = posts.map((p) => p.id);
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const r2PublicUrl = c.env.R2_PUBLIC_URL;
  const imageTransformUrl = c.env.IMAGE_TRANSFORM_URL;

  const mediaMap = new Map<number, MediaAttachment[]>();
  for (const [postId, mediaList] of rawMediaMap) {
    mediaMap.set(
      postId,
      mediaList.map((m) => ({
        id: m.id,
        url: getMediaUrl(m.id, m.r2Key, r2PublicUrl),
        previewUrl: getImageUrl(
          getMediaUrl(m.id, m.r2Key, r2PublicUrl),
          imageTransformUrl,
          { width: 400, quality: 80, format: "auto", fit: "cover" },
        ),
        alt: m.alt,
        blurhash: m.blurhash,
        width: m.width,
        height: m.height,
        position: m.position,
        mimeType: m.mimeType,
      })),
    );
  }

  return c.html(
    <BaseLayout title={siteName} c={c}>
      <HomeContent siteName={siteName} posts={posts} mediaMap={mediaMap} />
    </BaseLayout>,
  );
});
