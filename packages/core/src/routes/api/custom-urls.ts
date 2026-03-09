/**
 * Custom URLs API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { CreateCustomUrlSchema, parseValidated } from "../../lib/schemas.js";
import { parseIdParam, NotFoundError } from "../../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const customUrlsApiRoutes = new Hono<Env>();

// List custom URLs
customUrlsApiRoutes.get("/", async (c) => {
  const customUrls = await c.var.services.customUrls.list();
  return c.json({ customUrls });
});

// Create custom URL (requires auth)
customUrlsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const body = parseValidated(CreateCustomUrlSchema, await c.req.json());

  const redirectType = body.redirectType
    ? (parseInt(body.redirectType, 10) as 301 | 302)
    : undefined;

  // Resolve slug → ID for post/collection targets
  let targetId = body.targetId;
  if (body.targetType === "post" && body.targetId) {
    const post = await c.var.services.posts.getBySlug(body.targetId);
    if (!post) {
      throw new NotFoundError(`Post with slug "${body.targetId}" not found`);
    }
    targetId = post.id;
  }
  if (body.targetType === "collection" && body.targetId) {
    const col = await c.var.services.collections.getBySlug(body.targetId);
    if (!col) {
      throw new NotFoundError(
        `Collection with slug "${body.targetId}" not found`,
      );
    }
    targetId = col.id;
  }

  const customUrl = await c.var.services.customUrls.create({
    path: body.path,
    targetType: body.targetType,
    targetId,
    toPath: body.toPath,
    redirectType,
  });

  return c.json(customUrl, 201);
});

// Delete custom URL (requires auth)
customUrlsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const success = await c.var.services.customUrls.delete(id);
  if (!success) throw new NotFoundError("Custom URL");

  return c.json({ success: true });
});
