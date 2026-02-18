/**
 * Collections Listing Page Route
 *
 * Lists all collections with their post counts.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { CollectionsPage } from "../../ui/pages/CollectionsPage.js";
import { CollectionsSidebar } from "../../ui/shared/CollectionsSidebar.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsPageRoutes = new Hono<Env>();

collectionsPageRoutes.get("/", async (c) => {
  const [allCollections, postCounts] = await Promise.all([
    c.var.services.collections.list(),
    c.var.services.collections.getPostCounts(),
  ]);

  const collections = allCollections.map((col) => ({
    ...col,
    postCount: postCounts.get(col.id) ?? 0,
  }));

  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Collections - ${navData.siteName}`,
    navData,
    sidebar: <CollectionsSidebar collections={allCollections} />,
    content: <CollectionsPage collections={collections} />,
  });
});
