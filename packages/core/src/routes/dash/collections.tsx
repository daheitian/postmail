/**
 * Dashboard Collections Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { DangerZone } from "../../ui/dash/index.js";
import { dsRedirect } from "../../lib/sse.js";
import { getSiteName } from "../../lib/config.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { CollectionsListContent } from "../../ui/dash/collections/CollectionsListContent.js";
import { CollectionForm } from "../../ui/dash/collections/CollectionForm.js";
import { ViewCollectionContent } from "../../ui/dash/collections/ViewCollectionContent.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsRoutes = new Hono<Env>();

// List collections
collectionsRoutes.get("/", async (c) => {
  const siteName = await getSiteName(c);
  const collections = await c.var.services.collections.list();

  return c.html(
    <DashLayout
      c={c}
      title="Collections"
      siteName={siteName}
      currentPath="/dash/collections"
    >
      <CollectionsListContent collections={collections} />
    </DashLayout>,
  );
});

// New collection form
collectionsRoutes.get("/new", async (c) => {
  const siteName = await getSiteName(c);

  return c.html(
    <DashLayout
      c={c}
      title="New Collection"
      siteName={siteName}
      currentPath="/dash/collections"
    >
      <CollectionForm />
    </DashLayout>,
  );
});

// Create collection
collectionsRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    title: string;
    slug: string;
    description?: string;
  }>();

  const collection = await c.var.services.collections.create({
    title: body.title,
    slug: body.slug,
    description: body.description || undefined,
  });

  return dsRedirect(`/dash/collections/${collection.id}`);
});

// View single collection
collectionsRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const collection = await c.var.services.collections.getById(id);
  if (!collection) return c.notFound();

  const rawPosts = await c.var.services.posts.list({ collectionId: id });
  const ctx = createMediaContext(c);
  const posts = toPostViewsFromPosts(rawPosts, ctx);
  const siteName = await getSiteName(c);

  return c.html(
    <DashLayout
      c={c}
      title={collection.title}
      siteName={siteName}
      currentPath="/dash/collections"
    >
      <ViewCollectionContent collection={collection} posts={posts} />
    </DashLayout>,
  );
});

// Edit collection form
collectionsRoutes.get("/:id/edit", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const collection = await c.var.services.collections.getById(id);
  if (!collection) return c.notFound();

  const siteName = await getSiteName(c);

  return c.html(
    <DashLayout
      c={c}
      title={`Edit: ${collection.title}`}
      siteName={siteName}
      currentPath="/dash/collections"
    >
      <CollectionForm collection={collection} isEdit />
      <DangerZone
        actionLabel="Delete Collection"
        formAction={`/dash/collections/${collection.id}/delete`}
        confirmMessage="Are you sure you want to delete this collection?"
      />
    </DashLayout>,
  );
});

// Update collection
collectionsRoutes.post("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const body = await c.req.json<{
    title: string;
    slug: string;
    description?: string;
  }>();

  await c.var.services.collections.update(id, {
    title: body.title,
    slug: body.slug,
    description: body.description || undefined,
  });

  return dsRedirect(`/dash/collections/${id}`);
});

// Delete collection
collectionsRoutes.post("/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  await c.var.services.collections.delete(id);

  return dsRedirect("/dash/collections");
});
