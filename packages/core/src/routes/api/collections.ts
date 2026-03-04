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
import { assertFound, parseIdParam, NotFoundError } from "../../lib/errors.js";
import { fromUid, toUid } from "../../lib/uid.js";

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
  ids: z.array(z.string().min(1)).optional(),
  items: z.array(z.string().regex(/^[cd]-.+$/)).optional(),
});

const PostAssignSchema = z.object({
  postId: z.string().min(1),
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
      id: toUid(col.id),
      postCount: postCounts.get(col.id) ?? 0,
    })),
    dividers: dividers.map((d) => ({ ...d, id: toUid(d.id) })),
  });
});

// Create divider (requires auth) — must be before /:id
collectionsApiRoutes.post("/dividers", requireAuthApi(), async (c) => {
  const divider = await c.var.services.collections.createDivider();
  return c.json({ ...divider, id: toUid(divider.id) }, 201);
});

// Delete divider (requires auth) — must be before /:id
collectionsApiRoutes.delete("/dividers/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));
  await c.var.services.collections.deleteDivider(id);
  return c.json({ success: true });
});

// Get single collection
collectionsApiRoutes.get("/:id", async (c) => {
  const id = parseIdParam(c.req.param("id"));
  const collection = assertFound(
    await c.var.services.collections.getById(id),
    "Collection",
  );
  return c.json({ ...collection, id: toUid(collection.id) });
});

// Reorder collections (requires auth) — must be before /:id
collectionsApiRoutes.put("/reorder", requireAuthApi(), async (c) => {
  const body = parseValidated(CollectionReorderSchema, await c.req.json());

  if (body.items) {
    // Items are prefixed with "c-" or "d-" followed by Base58 UID
    const decodedItems = body.items.map((item) => {
      const prefix = item[0];
      const uid = item.slice(2);
      const uuid = fromUid(uid);
      if (!uuid) throw new Error("Invalid ID in reorder items");
      return `${prefix}-${uuid}`;
    });
    await c.var.services.collections.reorderAll(decodedItems);
  } else if (body.ids) {
    const decodedIds = body.ids.map((uid) => {
      const uuid = fromUid(uid);
      if (!uuid) throw new Error("Invalid ID in reorder ids");
      return uuid;
    });
    await c.var.services.collections.reorder(decodedIds);
  }
  const collections = await c.var.services.collections.list();
  return c.json({
    collections: collections.map((col) => ({
      ...col,
      id: toUid(col.id),
    })),
  });
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

  return c.json({ ...collection, id: toUid(collection.id) }, 201);
});

// Update collection (requires auth)
collectionsApiRoutes.put("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));
  const body = parseValidated(UpdateCollectionSchema, await c.req.json());

  const collection = assertFound(
    await c.var.services.collections.update(id, body),
    "Collection",
  );

  return c.json({ ...collection, id: toUid(collection.id) });
});

// Delete collection (requires auth)
collectionsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const success = await c.var.services.collections.delete(id);
  if (!success) throw new NotFoundError("Collection");

  return c.json({ success: true });
});

// Add a post to a collection (requires auth)
collectionsApiRoutes.post("/:id/posts", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));
  assertFound(await c.var.services.collections.getById(id), "Collection");

  const body = parseValidated(PostAssignSchema, await c.req.json());
  const postId = fromUid(body.postId);
  if (!postId) return c.json({ error: "Invalid post ID" }, 400);
  assertFound(await c.var.services.posts.getById(postId), "Post");

  await c.var.services.collections.addPost(id, postId);

  return c.json({ success: true }, 201);
});

// Remove a post from a collection (requires auth)
collectionsApiRoutes.delete(
  "/:id/posts/:postId",
  requireAuthApi(),
  async (c) => {
    const id = parseIdParam(c.req.param("id"));
    const postId = fromUid(c.req.param("postId"));
    if (!postId) return c.json({ error: "Invalid post ID" }, 400);

    await c.var.services.collections.removePost(id, postId);

    return c.json({ success: true });
  },
);
