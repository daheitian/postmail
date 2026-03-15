/**
 * Search Page Route
 */

import { Hono } from "hono";
import type { Bindings, SearchResult } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { SearchPage } from "../../ui/pages/SearchPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toSearchResultViews } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const PAGE_SIZE = 10;

export const searchRoutes = new Hono<Env>();

searchRoutes.get("/", async (c) => {
  const query = c.req.query("q") || "";
  const pageParam = c.req.query("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  const navData = await getNavigationData(c);

  // Only search if there's a query
  let results: SearchResult[] = [];
  let error: string | undefined;
  let hasMore = false;

  if (query.trim()) {
    try {
      // Fetch one extra to check for more
      results = await c.var.services.search.search(query, {
        limit: PAGE_SIZE + 1,
        offset: (page - 1) * PAGE_SIZE,
        status: ["published"],
      });

      hasMore = results.length > PAGE_SIZE;
      if (hasMore) {
        results = results.slice(0, PAGE_SIZE);
      }
    } catch (err) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("Search error:", err);
      error = "Search failed. Please try again.";
    }
  }

  // Transform to View Models
  const mediaCtx = createMediaContext(c.var.appConfig);
  const resultViews = toSearchResultViews(results, mediaCtx, query);

  return renderPublicPage(c, {
    title: buildPageTitle(
      query ? `Search: ${query}` : "Search",
      navData.siteName,
    ),
    navData,
    content: (
      <SearchPage
        query={query}
        results={resultViews}
        error={error}
        hasMore={hasMore}
        page={page}
      />
    ),
  });
});
