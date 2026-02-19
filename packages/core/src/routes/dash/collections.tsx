/**
 * Dashboard Collections Routes
 */

import { Hono } from "hono";
import type { Bindings, SortOrder } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { DangerZone } from "../../ui/dash/index.js";
import { dsRedirect } from "../../lib/sse.js";
import { getSiteName } from "../../lib/config.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { slugify } from "../../lib/url.js";
import { CollectionsListContent } from "../../ui/dash/collections/CollectionsListContent.js";
import { CollectionForm } from "../../ui/dash/collections/CollectionForm.js";
import { ViewCollectionContent } from "../../ui/dash/collections/ViewCollectionContent.js";
import { IconPickerGrid } from "../../ui/dash/collections/IconPickerGrid.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsRoutes = new Hono<Env>();

// List collections
collectionsRoutes.get("/", async (c) => {
  const siteName = await getSiteName(c);
  const [collections, dividers, postCounts] = await Promise.all([
    c.var.services.collections.list(),
    c.var.services.collections.listDividers(),
    c.var.services.collections.getPostCounts(),
  ]);

  return c.html(
    <DashLayout
      c={c}
      title="Collections"
      siteName={siteName}
      currentPath="/dash/collections"
    >
      <CollectionsListContent
        collections={collections}
        dividers={dividers}
        postCounts={postCounts}
      />
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
  const wantsJson = c.req.header("Accept")?.includes("application/json");
  const body = await c.req.json<{
    title: string;
    slug: string;
    description?: string;
    icon?: string;
    sortOrder?: string;
  }>();

  // Auto-generate slug from title if empty
  const slug = body.slug || slugify(body.title);

  const collection = await c.var.services.collections.create({
    title: body.title,
    slug,
    description: body.description || undefined,
    icon: body.icon || undefined,
    sortOrder: (body.sortOrder as SortOrder) || undefined,
  });

  const redirectUrl = `/dash/collections/${collection.id}`;
  if (wantsJson) {
    return c.json({ status: "redirect" as const, url: redirectUrl });
  }

  return dsRedirect(redirectUrl);
});

// Reorder collections (accepts prefixed items)
collectionsRoutes.post("/reorder", async (c) => {
  const body = await c.req.json<{ items?: string[]; ids?: number[] }>();

  if (body.items) {
    await c.var.services.collections.reorderAll(body.items);
  } else if (body.ids) {
    // Backward compat: plain numeric IDs
    await c.var.services.collections.reorder(body.ids);
  }

  return c.json({ success: true });
});

// Create divider
collectionsRoutes.post("/dividers", async (c) => {
  await c.var.services.collections.createDivider();
  return dsRedirect("/dash/collections");
});

// Delete divider
collectionsRoutes.post("/dividers/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!isNaN(id)) {
    await c.var.services.collections.deleteDivider(id);
  }
  return dsRedirect("/dash/collections");
});

// Icon picker grid (HTML fragment)
collectionsRoutes.get("/icons", (c) => {
  return c.html(<IconPickerGrid />);
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

  const wantsJson = c.req.header("Accept")?.includes("application/json");
  const body = await c.req.json<{
    title: string;
    slug: string;
    description?: string;
    icon?: string;
    sortOrder?: string;
  }>();

  await c.var.services.collections.update(id, {
    title: body.title,
    slug: body.slug,
    description: body.description || null,
    icon: body.icon || null,
    sortOrder: (body.sortOrder as SortOrder) || undefined,
  });

  const redirectUrl = `/dash/collections/${id}`;
  if (wantsJson) {
    return c.json({ status: "redirect" as const, url: redirectUrl });
  }

  return dsRedirect(redirectUrl);
});

// Delete collection
collectionsRoutes.post("/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  await c.var.services.collections.delete(id);

  return dsRedirect("/dash/collections");
});
