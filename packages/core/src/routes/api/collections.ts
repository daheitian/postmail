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
import { decode } from "../../lib/sqid.js";

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
  postId: z.union([z.number().int().positive(), z.string().min(1)]),
});

// List collections (includes post counts and dividers)
collectionsApiRoutes.get("/", async (c) => {
  const [collections, dividers, postCounts] = await Promise.all([
    c.var.services.collections.list(),
    c.var.services.collections.listDividers(),
    c.var.services.collections.getPostCounts(),
  ]);

  return c.json({
    collections: collections.map((col) => ({
      ...col,
      postCount: postCounts.get(col.id) ?? 0,
    })),
    dividers,
  });
});

// Create divider (requires auth) — must be before /:id
collectionsApiRoutes.post("/dividers", requireAuthApi(), async (c) => {
  const divider = await c.var.services.collections.createDivider();
  return c.json(divider, 201);
});

// Delete divider (requires auth) — must be before /:id
collectionsApiRoutes.delete("/dividers/:id", requireAuthApi(), async (c) => {
  const id = parseIntParam(c.req.param("id"));
  await c.var.services.collections.deleteDivider(id);
  return c.json({ success: true });
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
  const postId =
    typeof body.postId === "string" ? decode(body.postId) : body.postId;
  if (postId === null) return c.json({ error: "Invalid post ID" }, 400);
  assertFound(await c.var.services.posts.getById(postId), "Post");

  await c.var.services.collections.addPost(id, postId);

  return c.json({ success: true }, 201);
});

// Remove a post from a collection (requires auth)
collectionsApiRoutes.delete(
  "/:id/posts/:postId",
  requireAuthApi(),
  async (c) => {
    const id = parseIntParam(c.req.param("id"));
    const rawPostId = c.req.param("postId");

    // Accept either numeric ID or sqid string
    let postId: number;
    const parsed = parseInt(rawPostId, 10);
    if (!isNaN(parsed) && String(parsed) === rawPostId) {
      postId = parsed;
    } else {
      const decoded = decode(rawPostId);
      if (decoded === null) return c.json({ error: "Invalid post ID" }, 400);
      postId = decoded;
    }

    await c.var.services.collections.removePost(id, postId);

    return c.json({ success: true });
  },
);
