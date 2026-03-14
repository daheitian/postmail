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
import { CollectionsSidebar } from "../../ui/shared/CollectionsSidebar.js";

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

  return renderPublicPage(c, {
    title: `Collections - ${navData.siteName}`,
    navData,
    sidebar: (
      <CollectionsSidebar
        collections={allCollections}
        sidebarItems={sidebarItems}
        activeSlug={undefined}
        isAuthenticated={navData.isAuthenticated}
        postCounts={postCounts}
      />
    ),
    content: <CollectionsPage collections={collections} />,
  });
});
