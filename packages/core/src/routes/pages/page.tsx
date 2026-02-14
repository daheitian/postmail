/**
 * Custom Page Route
 *
 * Catch-all route for custom pages accessible via their path field
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { SinglePage as DefaultSinglePage } from "../../theme/pages/SinglePage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toPostViewFromPost } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

// Catch-all for custom page paths
pageRoutes.get("/:path", async (c) => {
  const path = c.req.param("path");

  // Look up page by path
  const page = await c.var.services.posts.getByPath(path);

  // Not found or not a page
  if (!page || page.type !== "page") {
    return c.notFound();
  }

  // Don't show drafts
  if (page.visibility === "draft") {
    return c.notFound();
  }

  const navData = await getNavigationData(c);

  // Transform to View Model
  const mediaCtx = createMediaContext(c);
  const pageView = toPostViewFromPost(page, mediaCtx);

  const components = c.var.config.theme?.components;
  const Page = components?.SinglePage ?? DefaultSinglePage;

  return renderPublicPage(c, {
    title: `${page.title} - ${navData.siteName}`,
    description: page.content?.slice(0, 160),
    navData,
    content: <Page page={pageView} theme={components} />,
  });
});
