/**
 * Collections API Routes
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, SortOrder } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import {
  CreateCollectionSchema,
  SortOrderSchema,
  parseValidated,
} from "../../lib/schemas.js";
import { assertFound, parseIntParam, NotFoundError } from "../../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsApiRoutes = new Hono<Env>();

// API update schema extends shared schema with nullable fields for explicit clearing
const UpdateCollectionSchema = CreateCollectionSchema.partial().extend({
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: SortOrderSchema.optional(),
  position: z.number().int().min(0).optional(),
});

// Route-specific schemas (not shared domain schemas)
const CollectionReorderSchema = z.object({
  ids: z.array(z.number().int().positive()).optional(),
  items: z.array(z.string().regex(/^[cd]-\d+$/)).optional(),
});

const PostAssignSchema = z.object({
  postId: z.number().int().positive(),
});

// List collections (includes post counts)
collectionsApiRoutes.get("/", async (c) => {
  const collections = await c.var.services.collections.list();
  const postCounts = await c.var.services.collections.getPostCounts();

  return c.json({
    collections: collections.map((col) => ({
      ...col,
      postCount: postCounts.get(col.id) ?? 0,
    })),
  });
});

// Get single collection
collectionsApiRoutes.get("/:id", async (c) => {
  const id = parseIntParam(c.req.param("id"));
  const collection = assertFound(
    await c.var.services.collections.getById(id),
    "Collection",
  );
  return c.json(collection);
});

// Reorder collections (requires auth) — must be before /:id
collectionsApiRoutes.put("/reorder", requireAuthApi(), async (c) => {
  const body = parseValidated(CollectionReorderSchema, await c.req.json());

  if (body.items) {
    await c.var.services.collections.reorderAll(body.items);
  } else if (body.ids) {
    await c.var.services.collections.reorder(body.ids);
  }
  const collections = await c.var.services.collections.list();
  return c.json({ collections });
});

// Create collection (requires auth)
collectionsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const body = parseValidated(CreateCollectionSchema, await c.req.json());

  const collection = await c.var.services.collections.create({
    slug: body.slug,
    title: body.title,
    description: body.description,
    icon: body.icon,
    sortOrder: body.sortOrder as SortOrder | undefined,
    position: body.position,
  });

  return c.json(collection, 201);
});

// Update collection (requires auth)
collectionsApiRoutes.put("/:id", requireAuthApi(), async (c) => {
  const id = parseIntParam(c.req.param("id"));
  const body = parseValidated(UpdateCollectionSchema, await c.req.json());

  const collection = assertFound(
    await c.var.services.collections.update(id, body),
    "Collection",
  );

  return c.json(collection);
});

// Delete collection (requires auth)
collectionsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseIntParam(c.req.param("id"));

  const success = await c.var.services.collections.delete(id);
  if (!success) throw new NotFoundError("Collection");

  return c.json({ success: true });
});

// Add a post to a collection (requires auth)
collectionsApiRoutes.post("/:id/posts", requireAuthApi(), async (c) => {
  const id = parseIntParam(c.req.param("id"));
  assertFound(await c.var.services.collections.getById(id), "Collection");

  const body = parseValidated(PostAssignSchema, await c.req.json());
  assertFound(await c.var.services.posts.getById(body.postId), "Post");

  await c.var.services.collections.addPost(id, body.postId);

  return c.json({ success: true }, 201);
});

// Remove a post from a collection (requires auth)
collectionsApiRoutes.delete(
  "/:id/posts/:postId",
  requireAuthApi(),
  async (c) => {
    const id = parseIntParam(c.req.param("id"));
    const postId = parseIntParam(c.req.param("postId"));

    await c.var.services.collections.removePost(id, postId);

    return c.json({ success: true });
  },
);
