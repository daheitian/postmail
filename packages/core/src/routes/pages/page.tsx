/**
 * Custom Page Route
 *
 * Catch-all route for custom pages accessible via their path field
 */

import { Hono } from "hono";
import type { Bindings, Post } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { BaseLayout, SiteLayout } from "../../theme/layouts/index.js";
import { getNavigationData } from "../../lib/navigation.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

function PageContent({ page }: { page: Post }) {
  return (
    <article class="h-entry">
      {page.title && (
        <h1 class="p-name text-3xl font-semibold mb-6">{page.title}</h1>
      )}

      <div
        class="e-content prose"
        dangerouslySetInnerHTML={{ __html: page.contentHtml || "" }}
      />
    </article>
  );
}

// Catch-all for custom page paths
pageRoutes.get("/:path", async (c) => {
  const path = c.req.param("path");

  // Look up page by path
  const page = await c.var.services.posts.getByPath(path);

  // Not found or not a page
  if (!page || page.type !== "page") {
    return c.notFound();
  }

  // Don't show drafts
  if (page.visibility === "draft") {
    return c.notFound();
  }

  const navData = await getNavigationData(c);

  return c.html(
    <BaseLayout
      title={`${page.title} - ${navData.siteName}`}
      description={page.content?.slice(0, 160)}
      c={c}
    >
      <SiteLayout {...navData}>
        <PageContent page={page} />
      </SiteLayout>
    </BaseLayout>,
  );
});
