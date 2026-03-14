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
import {
  createMediaContext,
  toPostViewsFromPosts,
  loadThreadRootPermalinks,
} from "../../lib/view.js";
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

  // Permalinks + last-in-thread are independent — run in parallel
  const threadIds = [...new Set(posts.map((p) => p.threadId))];
  const [rootPermalinkMap, lastPostMap] = await Promise.all([
    loadThreadRootPermalinks(
      posts,
      c.var.services.posts.getById.bind(c.var.services.posts),
    ),
    c.var.services.posts.getLastPostIdsByThread(threadIds),
  ]);
  const isLastInThreadMap = new Map<string, boolean>();
  for (const p of posts) {
    isLastInThreadMap.set(p.id, lastPostMap.get(p.threadId) === p.id);
  }

  const postViews = toPostViewsFromPosts(
    posts,
    mediaCtx,
    rootPermalinkMap,
    isLastInThreadMap,
  );

  // Convert to timeline items (simple — no thread previews)
  const items = postViews.map((post) => ({ post }));

  return renderPublicPage(c, {
    title: `Featured - ${navData.siteName}`,
    navData,
    content: <FeaturedPage items={items} />,
  });
});
