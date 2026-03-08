/**
 * Home Page Route
 *
 * Timeline feed with per-type card components and thread previews.
 * Uses page-based pagination.
 *
 * When HOME_DEFAULT_VIEW is "featured", the homepage shows featured posts
 * instead of latest. The /latest route always shows latest posts explicitly.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { assembleTimeline } from "../../lib/timeline.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { HomePage } from "../../ui/pages/HomePage.js";
import { FeaturedPage } from "../../ui/pages/FeaturedPage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const homeRoutes = new Hono<Env>();

homeRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);

  if (navData.homeDefaultView === "featured") {
    // Show featured posts on homepage
    const posts = await c.var.services.posts.list({
      visibility: "featured",
      status: "published",
      excludeReplies: true,
      excludePrivate: !navData.isAuthenticated,
    });
    const mediaCtx = createMediaContext(c.var.appConfig);
    const postViews = toPostViewsFromPosts(posts, mediaCtx);
    const items = postViews.map((post) => ({ post }));

    return renderPublicPage(c, {
      title: navData.siteName,
      navData,
      content: <FeaturedPage items={items} />,
    });
  }

  // Default: show latest posts (pinned posts sort to top via service layer)
  const pageParam = c.req.query("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  const { items, currentPage, totalPages } = await assembleTimeline(c, {
    page,
    isAuthenticated: navData.isAuthenticated,
  });

  return renderPublicPage(c, {
    title: navData.siteName,
    navData,
    content: (
      <HomePage
        items={items}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    ),
  });
});
