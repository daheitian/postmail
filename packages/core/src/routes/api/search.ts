/**
 * Search API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { ValidationError, ExternalServiceError } from "../../lib/errors.js";
import { toPublicPath } from "../../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const searchApiRoutes = new Hono<Env>();

// Search posts
searchApiRoutes.get("/", async (c) => {
  const query = c.req.query("q");

  if (!query || query.trim().length === 0) {
    throw new ValidationError("Query parameter 'q' is required");
  }

  if (query.length > 200) {
    throw new ValidationError("Query too long");
  }

  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 50) : 20;

  try {
    const results = await c.var.services.search.search(query, {
      limit,
      status: ["published"],
    });

    return c.json({
      query,
      results: results.map((r) => ({
        id: r.post.id,
        format: r.post.format,
        title: r.post.title,
        slug: r.post.slug,
        snippet: r.snippet,
        publishedAt: r.post.publishedAt,
        url: toPublicPath(`/${r.post.slug}`, c.var.appConfig.sitePathPrefix),
      })),
      count: results.length,
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    // eslint-disable-next-line no-console -- Error logging is intentional
    console.error("Search error:", err);
    throw new ExternalServiceError("Search failed");
  }
});
