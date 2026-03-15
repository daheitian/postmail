/**
 * Collections Listing Page Route
 *
 * Lists all collections with their post counts.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { CollectionsPage } from "../../ui/pages/CollectionsPage.js";
import type { CollectionDirectoryItem } from "../../types.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsPageRoutes = new Hono<Env>();

collectionsPageRoutes.get("/", async (c) => {
  const [allCollections, sidebarItems, postCounts, navData] = await Promise.all(
    [
      c.var.services.collections.list(),
      c.var.services.collections.listSidebarItems(),
      c.var.services.collections.getPostCounts(),
      getNavigationData(c),
    ],
  );

  const collections = allCollections.map((col) => ({
    ...col,
    postCount: postCounts.get(col.id) ?? 0,
  }));
  const collectionMap = new Map(
    collections.map((collection) => [collection.id, collection]),
  );
  const seenCollections = new Set<string>();
  const items: CollectionDirectoryItem[] = [];

  for (const item of sidebarItems) {
    if (item.type === "divider") {
      items.push({ id: item.id, type: "divider" });
      continue;
    }

    const collection = item.collectionId
      ? collectionMap.get(item.collectionId)
      : undefined;
    if (!collection) continue;

    seenCollections.add(collection.id);
    items.push({
      id: item.id,
      type: "collection",
      collection,
    });
  }

  for (const collection of collections) {
    if (seenCollections.has(collection.id)) continue;
    items.push({
      id: collection.id,
      type: "collection",
      collection,
    });
  }

  return renderPublicPage(c, {
    title: `Collections - ${navData.siteName}`,
    navData,
    content: (
      <CollectionsPage
        items={items}
        isAuthenticated={navData.isAuthenticated ?? false}
      />
    ),
  });
});
