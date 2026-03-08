/**
 * Featured Page Route
 *
 * Shows featured posts as a timeline feed.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { FeaturedPage } from "../../ui/pages/FeaturedPage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const featuredRoutes = new Hono<Env>();

featuredRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);

  // When homepage already shows featured, redirect to avoid duplicate content
  if (navData.homeDefaultView === "featured") {
    return c.redirect("/", 302);
  }

  const posts = await c.var.services.posts.list({
    featured: true,
    status: "published",
    excludePrivate: !navData.isAuthenticated,
  });

  const mediaCtx = createMediaContext(c.var.appConfig);

  // Build thread root permalink map for reply posts
  const threadRootIds = [
    ...new Set(
      posts.filter((p) => p.threadId).map((p) => p.threadId as string),
    ),
  ];
  const rootPermalinkMap = new Map<string, string>();
  if (threadRootIds.length > 0) {
    const roots = await Promise.all(
      threadRootIds.map((id) => c.var.services.posts.getById(id)),
    );
    for (const root of roots) {
      if (root) rootPermalinkMap.set(root.id, `/${root.slug}`);
    }
  }

  const postViews = toPostViewsFromPosts(posts, mediaCtx, rootPermalinkMap);

  // Convert to timeline items (simple — no thread previews)
  const items = postViews.map((post) => ({ post }));

  return renderPublicPage(c, {
    title: `Featured - ${navData.siteName}`,
    navData,
    content: <FeaturedPage items={items} />,
  });
});
