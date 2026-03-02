/**
 * Latest Page Route
 *
 * Explicit /latest URL that always shows the latest posts timeline.
 * When HOME_DEFAULT_VIEW is "latest" (default), this redirects to /
 * to avoid duplicate content. When it's "featured", this serves as
 * the explicit latest view.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { assembleTimeline } from "../../lib/timeline.js";
import { HomePage } from "../../ui/pages/HomePage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const latestRoutes = new Hono<Env>();

latestRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);

  // When homepage already shows latest, redirect to avoid duplicate content
  if (navData.homeDefaultView !== "featured") {
    return c.redirect("/", 302);
  }

  const pageParam = c.req.query("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  const { items, currentPage, totalPages } = await assembleTimeline(c, {
    page,
  });

  return renderPublicPage(c, {
    title: `Latest - ${navData.siteName}`,
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
