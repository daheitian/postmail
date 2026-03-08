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
});

const PostAssignSchema = z.object({
  postId: z.string().min(1),
});

const MoveSchema = z.object({
  after: z.string().nullable().optional(),
  before: z.string().nullable().optional(),
});

// List collections (includes post counts and sidebar items)
collectionsApiRoutes.get("/", async (c) => {
  const [collections, sidebarItems, postCounts] = await Promise.all([
    c.var.services.collections.list(),
    c.var.services.collections.listSidebarItems(),
    c.var.services.collections.getPostCounts(),
  ]);

  return c.json({
    collections: collections.map((col) => ({
      ...col,
      id: toUid(col.id),
      postCount: postCounts.get(col.id) ?? 0,
    })),
    sidebarItems: sidebarItems.map((item) => ({
      ...item,
      id: toUid(item.id),
      collectionId: item.collectionId ? toUid(item.collectionId) : null,
    })),
  });
});

// Create sidebar item (divider) — must be before /:id
collectionsApiRoutes.post("/sidebar-items", requireAuthApi(), async (c) => {
  const item = await c.var.services.collections.createSidebarItem("divider");
  return c.json(
    {
      ...item,
      id: toUid(item.id),
      collectionId: item.collectionId ? toUid(item.collectionId) : null,
    },
    201,
  );
});

// Move sidebar item — must be before /:id
collectionsApiRoutes.put(
  "/sidebar-items/:id/move",
  requireAuthApi(),
  async (c) => {
    const id = parseIdParam(c.req.param("id"));
    const body = parseValidated(MoveSchema, await c.req.json());

    const afterId = body.after ? fromUid(body.after) : null;
    const beforeId = body.before ? fromUid(body.before) : null;

    const item = assertFound(
      await c.var.services.collections.moveSidebarItem(
        id,
        afterId ?? null,
        beforeId ?? null,
      ),
      "Sidebar item",
    );

    return c.json({
      ...item,
      id: toUid(item.id),
      collectionId: item.collectionId ? toUid(item.collectionId) : null,
    });
  },
);

// Delete sidebar item — must be before /:id
collectionsApiRoutes.delete(
  "/sidebar-items/:id",
  requireAuthApi(),
  async (c) => {
    const id = parseIdParam(c.req.param("id"));
    await c.var.services.collections.deleteSidebarItem(id);
    return c.json({ success: true });
  },
);

// Get single collection
collectionsApiRoutes.get("/:id", async (c) => {
  const id = parseIdParam(c.req.param("id"));
  const collection = assertFound(
    await c.var.services.collections.getById(id),
    "Collection",
  );
  return c.json({ ...collection, id: toUid(collection.id) });
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
