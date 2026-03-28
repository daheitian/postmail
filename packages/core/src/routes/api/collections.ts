/**
 * Collections API Routes
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, CollectionSortOrder } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import {
  CollectionDirectoryItemIdSchema,
  CollectionDescriptionValueSchema,
  CollectionSortOrderSchema,
  CreateCollectionDirectoryItemSchema,
  CreateCollectionSchema,
  PostIdSchema,
  UpdateCollectionDirectoryItemSchema,
  parseValidated,
} from "../../lib/schemas.js";
import { assertFound, parseIdParam, NotFoundError } from "../../lib/errors.js";
import { ID_PREFIX } from "../../lib/ids.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsApiRoutes = new Hono<Env>();

// API update schema extends shared schema with nullable fields for explicit clearing
const UpdateCollectionSchema = CreateCollectionSchema.partial().extend({
  description: z.union([CollectionDescriptionValueSchema, z.null()]).optional(),
  sortOrder: CollectionSortOrderSchema.optional(),
});

const PostAssignSchema = z.object({
  postId: PostIdSchema,
});

const MoveSchema = z.object({
  after: CollectionDirectoryItemIdSchema.nullable().optional(),
  before: CollectionDirectoryItemIdSchema.nullable().optional(),
});

const ListCollectionsQuerySchema = z.object({
  view: z.enum(["compose"]).optional(),
});

// List collections (includes post counts and directory items)
collectionsApiRoutes.get("/", async (c) => {
  const query = parseValidated(ListCollectionsQuerySchema, c.req.query());

  if (query.view === "compose") {
    const collections = await c.var.services.collections.listByRecentActivity();
    return c.json({
      collections,
      directoryItems: [],
    });
  }

  const directoryData = await c.var.services.collections.listDirectoryData();

  return c.json({
    collections: directoryData.collections,
    directoryItems: directoryData.directoryItems,
  });
});

// Create directory item (divider or link) — must be before /:id
collectionsApiRoutes.post("/directory-items", requireAuthApi(), async (c) => {
  const body = parseValidated(
    CreateCollectionDirectoryItemSchema,
    await c.req.json(),
  );
  const item = await c.var.services.collections.createDirectoryItem(body);
  return c.json(item, 201);
});

collectionsApiRoutes.put(
  "/directory-items/:id",
  requireAuthApi(),
  async (c) => {
    const id = parseIdParam(
      c.req.param("id"),
      ID_PREFIX.collectionDirectoryItem,
    );
    const body = parseValidated(
      UpdateCollectionDirectoryItemSchema,
      await c.req.json(),
    );

    const item = assertFound(
      await c.var.services.collections.updateDirectoryItem(id, body),
      "Directory item",
    );

    return c.json(item);
  },
);

// Move directory item — must be before /:id
collectionsApiRoutes.put(
  "/directory-items/:id/move",
  requireAuthApi(),
  async (c) => {
    const id = parseIdParam(
      c.req.param("id"),
      ID_PREFIX.collectionDirectoryItem,
    );
    const body = parseValidated(MoveSchema, await c.req.json());

    const item = assertFound(
      await c.var.services.collections.moveDirectoryItem(
        id,
        body.after ?? null,
        body.before ?? null,
      ),
      "Directory item",
    );

    return c.json(item);
  },
);

// Delete directory item — must be before /:id
collectionsApiRoutes.delete(
  "/directory-items/:id",
  requireAuthApi(),
  async (c) => {
    const id = parseIdParam(
      c.req.param("id"),
      ID_PREFIX.collectionDirectoryItem,
    );
    await c.var.services.collections.deleteDirectoryItem(id);
    return c.json({ success: true });
  },
);

// Get single collection
collectionsApiRoutes.get("/:id", async (c) => {
  const id = parseIdParam(c.req.param("id"), ID_PREFIX.collection);
  const collection = assertFound(
    await c.var.services.collections.getById(id),
    "Collection",
  );
  return c.json(collection);
});

// Create collection (requires auth)
collectionsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const body = parseValidated(CreateCollectionSchema, await c.req.json());

  const collection = await c.var.services.collections.create({
    slug: body.slug,
    title: body.title,
    description: body.description,
    sortOrder: body.sortOrder as CollectionSortOrder | undefined,
  });

  return c.json(collection, 201);
});

// Update collection (requires auth)
collectionsApiRoutes.put("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"), ID_PREFIX.collection);
  const body = parseValidated(UpdateCollectionSchema, await c.req.json());

  const collection = assertFound(
    await c.var.services.collections.update(id, body),
    "Collection",
  );

  return c.json(collection);
});

// Delete collection (requires auth)
collectionsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"), ID_PREFIX.collection);

  const success = await c.var.services.collections.delete(id);
  if (!success) throw new NotFoundError("Collection");

  return c.json({ success: true });
});

// Add a post to a collection (requires auth)
collectionsApiRoutes.post("/:id/posts", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"), ID_PREFIX.collection);
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
    const id = parseIdParam(c.req.param("id"), ID_PREFIX.collection);
    const postId = parseIdParam(c.req.param("postId"), ID_PREFIX.post);

    await c.var.services.collections.removePost(id, postId);

    return c.json({ success: true });
  },
);
