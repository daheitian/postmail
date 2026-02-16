/**
 * Search Page Route
 */

import { Hono } from "hono";
import type { Bindings, SearchResult } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { SearchPage as DefaultSearchPage } from "../../themes/threads/pages/SearchPage.js";
import { getNavigationData } from "../../lib/navigation.js";
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
        visibility: ["featured", "quiet"],
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
  const mediaCtx = createMediaContext(c);
  const resultViews = toSearchResultViews(results, mediaCtx);

  const components = c.var.config.theme?.components;
  const Page = components?.SearchPage ?? DefaultSearchPage;

  return renderPublicPage(c, {
    title: query
      ? `Search: ${query} - ${navData.siteName}`
      : `Search - ${navData.siteName}`,
    navData,
    content: (
      <Page
        query={query}
        results={resultViews}
        error={error}
        hasMore={hasMore}
        page={page}
        theme={components}
      />
    ),
  });
});
