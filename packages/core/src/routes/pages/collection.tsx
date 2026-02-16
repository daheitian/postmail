/**
 * Collection Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { CollectionPage as DefaultCollectionPage } from "../../themes/threads/pages/CollectionPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionRoutes = new Hono<Env>();

collectionRoutes.get("/:path", async (c) => {
  const path = c.req.param("path");

  const collection = await c.var.services.collections.getByPath(path);
  if (!collection) return c.notFound();

  const posts = await c.var.services.collections.getPosts(collection.id);
  const navData = await getNavigationData(c);

  // Transform to View Models
  const mediaCtx = createMediaContext(c);
  const postViews = toPostViewsFromPosts(posts, mediaCtx);

  const components = c.var.config.theme?.components;
  const Page = components?.CollectionPage ?? DefaultCollectionPage;

  return renderPublicPage(c, {
    title: `${collection.title} - ${navData.siteName}`,
    description: collection.description ?? undefined,
    navData,
    content: (
      <Page collection={collection} posts={postViews} theme={components} />
    ),
  });
});
