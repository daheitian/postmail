/**
 * Collections API Routes
 */

import { Hono } from "hono";
import type { Bindings, SortOrder } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { z } from "zod";
import { SORT_ORDERS } from "../../types.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsApiRoutes = new Hono<Env>();

const SortOrderSchema = z.enum(SORT_ORDERS);

const CreateCollectionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: SortOrderSchema.optional(),
  position: z.number().int().min(0).optional(),
});

const UpdateCollectionSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: SortOrderSchema.optional(),
  position: z.number().int().min(0).optional(),
});

const ReorderSchema = z.object({
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
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const collection = await c.var.services.collections.getById(id);
  if (!collection) return c.json({ error: "Not found" }, 404);

  return c.json(collection);
});

// Reorder collections (requires auth) — must be before /:id
collectionsApiRoutes.put("/reorder", requireAuthApi(), async (c) => {
  const rawBody = await c.req.json();

  const parseResult = ReorderSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  if (parseResult.data.items) {
    await c.var.services.collections.reorderAll(parseResult.data.items);
  } else if (parseResult.data.ids) {
    await c.var.services.collections.reorder(parseResult.data.ids);
  }
  const collections = await c.var.services.collections.list();
  return c.json({ collections });
});

// Create collection (requires auth)
collectionsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const rawBody = await c.req.json();

  const parseResult = CreateCollectionSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  const body = parseResult.data;

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
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const rawBody = await c.req.json();

  const parseResult = UpdateCollectionSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  const collection = await c.var.services.collections.update(
    id,
    parseResult.data,
  );
  if (!collection) return c.json({ error: "Not found" }, 404);

  return c.json(collection);
});

// Delete collection (requires auth)
collectionsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const success = await c.var.services.collections.delete(id);
  if (!success) return c.json({ error: "Not found" }, 404);

  return c.json({ success: true });
});

// Add a post to a collection (requires auth)
collectionsApiRoutes.post("/:id/posts", requireAuthApi(), async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const collection = await c.var.services.collections.getById(id);
  if (!collection) return c.json({ error: "Collection not found" }, 404);

  const rawBody = await c.req.json();
  const parseResult = PostAssignSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  const post = await c.var.services.posts.getById(parseResult.data.postId);
  if (!post) return c.json({ error: "Post not found" }, 404);

  await c.var.services.collections.addPost(id, parseResult.data.postId);

  return c.json({ success: true }, 201);
});

// Remove a post from a collection (requires auth)
collectionsApiRoutes.delete(
  "/:id/posts/:postId",
  requireAuthApi(),
  async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const postId = parseInt(c.req.param("postId"), 10);
    if (isNaN(id) || isNaN(postId)) return c.json({ error: "Invalid ID" }, 400);

    await c.var.services.collections.removePost(id, postId);

    return c.json({ success: true });
  },
);
