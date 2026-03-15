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

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionsPageRoutes = new Hono<Env>();

collectionsPageRoutes.get("/", async (c) => {
  const [directoryData, navData] = await Promise.all([
    c.var.services.collections.listDirectoryData(),
    getNavigationData(c),
  ]);

  return renderPublicPage(c, {
    title: `Collections - ${navData.siteName}`,
    navData,
    content: (
      <CollectionsPage
        items={directoryData.items}
        isAuthenticated={navData.isAuthenticated ?? false}
      />
    ),
  });
});
