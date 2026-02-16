/**
 * Compose Route
 *
 * Handles post creation from the public-site compose dialog.
 * Returns dsRedirect to the new post's permalink (Datastar form pattern).
 */

import { Hono } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../app.js";
import { requireAuth } from "../middleware/auth.js";
import { CreatePostSchema, validateMediaCount } from "../lib/schemas.js";
import * as sqid from "../lib/sqid.js";
import { dsRedirect, dsToast } from "../lib/sse.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const composeRoutes = new Hono<Env>();

// All compose routes require authentication
composeRoutes.use("*", requireAuth());

composeRoutes.post("/", async (c) => {
  const raw = await c.req.json();

  const result = CreatePostSchema.safeParse(raw);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? "Invalid input";
    return dsToast(firstError, "error");
  }

  const data = result.data;

  // Validate media count
  if (data.mediaIds) {
    const mediaError = validateMediaCount(data.mediaIds);
    if (mediaError) {
      return dsToast(mediaError, "error");
    }
  }

  const post = await c.var.services.posts.create({
    format: data.format,
    title: data.title || undefined,
    body: data.body || undefined,
    status: data.status ?? "published",
    featured: data.featured,
    pinned: data.pinned,
    url: data.url || undefined,
    quoteText: data.quoteText || undefined,
    rating: data.rating || undefined,
    collectionId: data.collectionId || undefined,
  });

  // Attach media if provided
  if (data.mediaIds && data.mediaIds.length > 0) {
    await c.var.services.media.attachToPost(post.id, data.mediaIds);
  }

  // Redirect to the new post's permalink
  const permalink = post.path ? `/${post.path}` : `/p/${sqid.encode(post.id)}`;
  return dsRedirect(permalink);
});
