/**
 * Dashboard Index Route
 *
 * Example of using @lingui/react/macro with Hono JSX!
 */

import { Hono } from "hono";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { getSiteName } from "../../lib/config.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const dashIndexRoutes = new Hono<Env>();

/**
 * Dashboard content component
 * Uses useLingui() from @lingui/react/macro - works with Hono JSX!
 */
function DashboardContent({
  publishedCount,
  draftCount,
}: {
  publishedCount: number;
  draftCount: number;
}) {
  // 🎉 Single layer! Just like React!
  const { t } = useLingui();

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">
        {t({
          message: "Dashboard",
          comment: "@context: Dashboard main heading",
        })}
      </h1>

      <div class="grid gap-4 md:grid-cols-3 mb-6">
        <div class="p-4 border rounded">
          <p class="text-sm text-muted-foreground">
            {t({
              message: "Published",
              comment: "@context: Post status label",
            })}
          </p>
          <p class="text-3xl font-bold">{publishedCount}</p>
        </div>

        <div class="p-4 border rounded">
          <p class="text-sm text-muted-foreground">
            {t({ message: "Drafts", comment: "@context: Post status label" })}
          </p>
          <p class="text-3xl font-bold">{draftCount}</p>
        </div>

        <div class="p-4 border rounded">
          <p class="text-sm text-muted-foreground mb-2">
            {t({
              message: "Quick Actions",
              comment: "@context: Dashboard section title",
            })}
          </p>
          <a href="/dash/posts/new" class="btn btn-primary w-full">
            {t({
              message: "New Post",
              comment: "@context: Button to create new post",
            })}
          </a>
        </div>
      </div>

      <p>
        <Trans comment="@context: Help text with link">
          Need help? Visit the{" "}
          <a href="/docs" class="underline">
            documentation
          </a>
        </Trans>
      </p>
    </>
  );
}

dashIndexRoutes.get("/", async (c) => {
  const siteName = await getSiteName(c);

  // Get some stats
  const allPosts = await c.var.services.posts.list({ limit: 1000 });
  const publishedPosts = allPosts.filter((p) => p.status !== "draft");
  const draftPosts = allPosts.filter((p) => p.status === "draft");

  return c.html(
    <DashLayout c={c} title="Dashboard" siteName={siteName} currentPath="/dash">
      <DashboardContent
        publishedCount={publishedPosts.length}
        draftCount={draftPosts.length}
      />
    </DashLayout>,
  );
});
