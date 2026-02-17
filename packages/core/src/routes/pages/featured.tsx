/**
 * Featured Page Route
 *
 * Shows featured posts as a timeline feed.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { FeaturedPage } from "../../ui/pages/FeaturedPage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const featuredRoutes = new Hono<Env>();

featuredRoutes.get("/", async (c) => {
  const posts = await c.var.services.posts.list({
    featured: true,
    status: "published",
    excludeReplies: true,
  });

  const navData = await getNavigationData(c);
  const mediaCtx = createMediaContext(c);
  const postViews = toPostViewsFromPosts(posts, mediaCtx);

  // Convert to timeline items (simple — no thread previews)
  const items = postViews.map((post) => ({ post }));

  return renderPublicPage(c, {
    title: `Featured - ${navData.siteName}`,
    navData,
    content: <FeaturedPage items={items} hasMore={false} />,
  });
});
