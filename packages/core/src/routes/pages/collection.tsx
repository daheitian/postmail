/**
 * Collection Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { CollectionPage } from "../../ui/pages/CollectionPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionRoutes = new Hono<Env>();

collectionRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const collection = await c.var.services.collections.getBySlug(slug);
  if (!collection) return c.notFound();

  // Fetch posts in this collection
  const posts = await c.var.services.posts.list({
    collectionId: collection.id,
    status: "published",
    excludeReplies: true,
  });

  const navData = await getNavigationData(c);

  // Transform to View Models
  const mediaCtx = createMediaContext(c);
  const postViews = toPostViewsFromPosts(posts, mediaCtx);

  return renderPublicPage(c, {
    title: `${collection.title} - ${navData.siteName}`,
    description: collection.description ?? undefined,
    navData,
    content: (
      <CollectionPage
        collection={collection}
        posts={postViews}
        hasMore={false}
      />
    ),
  });
});
