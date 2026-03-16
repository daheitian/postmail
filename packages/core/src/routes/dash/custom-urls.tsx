/**
 * Custom URLs Routes
 *
 * Mounted under /settings/custom-urls
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, CustomUrl } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { EmptyState, ListItemRow, ActionButtons } from "../../ui/dash/index.js";
import { dsRedirect } from "../../lib/sse.js";
import { parseIdParam } from "../../lib/errors.js";
import { CreateCustomUrlSchema, parseValidated } from "../../lib/schemas.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import { getNavigationData } from "../../lib/navigation.js";
import { AdminBreadcrumb } from "../../ui/shared/AdminBreadcrumb.js";
import { PagePagination } from "../../ui/shared/Pagination.js";
import { DEFAULT_PAGE_SIZE } from "../../lib/constants.js";
import { toPublicPath } from "../../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const customUrlsRoutes = new Hono<Env>();

function targetBadge(targetType: CustomUrl["targetType"]) {
  switch (targetType) {
    case "post":
      return "Post";
    case "collection":
      return "Collection";
    case "redirect":
      return "Redirect";
  }
}

function CustomUrlsListContent({
  customUrls,
  targetSlugs,
  currentPage,
  totalPages,
  sitePathPrefix = "",
}: {
  customUrls: CustomUrl[];
  targetSlugs: Record<string, string>;
  currentPage: number;
  totalPages: number;
  sitePathPrefix?: string;
}) {
  const { t } = useLingui();
  const hasCustomUrls = customUrls.length > 0;

  return (
    <>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-medium">
          {t({
            message: "Custom URLs",
            comment: "@context: Settings section heading",
          })}
        </h2>
        {hasCustomUrls ? (
          <a
            href={toPublicPath("/settings/custom-urls/new", sitePathPrefix)}
            class="btn"
          >
            {t({
              message: "New Custom URL",
              comment: "@context: Button to create new custom URL",
            })}
          </a>
        ) : null}
      </div>

      {!hasCustomUrls ? (
        <EmptyState
          message={t({
            message:
              "No custom URLs yet. Create one to add redirects or custom paths for posts.",
            comment: "@context: Empty state message",
          })}
          ctaText={t({
            message: "New Custom URL",
            comment: "@context: Button to create new custom URL",
          })}
          ctaHref={toPublicPath("/settings/custom-urls/new", sitePathPrefix)}
        />
      ) : (
        <>
          <div class="flex flex-col divide-y">
            {customUrls.map((cu) => (
              <ListItemRow
                key={cu.id}
                actions={
                  <ActionButtons
                    deleteAction={toPublicPath(
                      `/settings/custom-urls/${cu.id}/delete`,
                      sitePathPrefix,
                    )}
                    deleteLabel={t({
                      message: "Delete",
                      comment: "@context: Button to delete custom URL",
                    })}
                  />
                }
              >
                <div class="flex items-center gap-2">
                  <code class="text-sm bg-muted px-1 rounded">/{cu.path}</code>
                  <span class="text-muted-foreground">&rarr;</span>
                  {cu.targetType === "redirect" ? (
                    <code class="text-sm bg-muted px-1 rounded">
                      {cu.toPath}
                    </code>
                  ) : (
                    <code class="text-sm bg-muted px-1 rounded">
                      /
                      {cu.targetId
                        ? (targetSlugs[cu.targetId] ?? cu.targetId)
                        : "?"}
                    </code>
                  )}
                  <span class="badge-outline">
                    {targetBadge(cu.targetType)}
                  </span>
                  {cu.targetType === "redirect" && cu.redirectType && (
                    <span class="badge-outline">{cu.redirectType}</span>
                  )}
                </div>
              </ListItemRow>
            ))}
          </div>
          <PagePagination
            baseUrl={toPublicPath("/settings/custom-urls", sitePathPrefix)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </>
      )}
    </>
  );
}

function NewCustomUrlContent({
  sitePathPrefix = "",
}: {
  sitePathPrefix?: string;
}) {
  const { t } = useLingui();

  return (
    <>
      <h2 class="text-lg font-medium mb-6">
        {t({ message: "New Custom URL", comment: "@context: Page heading" })}
      </h2>

      <form
        data-signals="{path: '', targetType: 'redirect', targetId: '', toPath: '', redirectType: '301'}"
        data-on:submit__prevent={`@post('${toPublicPath("/settings/custom-urls", sitePathPrefix)}')`}
        data-indicator="_loading"
        class="flex flex-col gap-4 max-w-lg"
      >
        <div class="field">
          <label class="label">
            {t({
              message: "Path",
              comment: "@context: Custom URL form field",
            })}
          </label>
          <input
            type="text"
            data-bind="path"
            class="input"
            placeholder="blog/my-post"
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message: "The custom URL path (without leading slash)",
              comment: "@context: Custom URL path help text",
            })}
          </p>
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "Type",
              comment: "@context: Custom URL form field",
            })}
          </label>
          <select data-bind="targetType" class="select">
            <option value="redirect">
              {t({
                message: "Redirect",
                comment: "@context: Custom URL type option",
              })}
            </option>
            <option value="post">
              {t({
                message: "Post",
                comment: "@context: Custom URL type option",
              })}
            </option>
            <option value="collection">
              {t({
                message: "Collection",
                comment: "@context: Custom URL type option",
              })}
            </option>
          </select>
        </div>

        <div data-show="$targetType === 'redirect'" class="flex flex-col gap-4">
          <div class="field">
            <label class="label">
              {t({
                message: "Destination",
                comment: "@context: Redirect destination field",
              })}
            </label>
            <input
              type="text"
              data-bind="toPath"
              class="input"
              placeholder="/new-path or https://..."
            />
          </div>

          <div class="field">
            <label class="label">
              {t({
                message: "Redirect Type",
                comment: "@context: Redirect type field",
              })}
            </label>
            <select data-bind="redirectType" class="select">
              <option value="301">
                {t({
                  message: "301 (Permanent)",
                  comment: "@context: Redirect type option",
                })}
              </option>
              <option value="302">
                {t({
                  message: "302 (Temporary)",
                  comment: "@context: Redirect type option",
                })}
              </option>
            </select>
          </div>
        </div>

        <div
          data-show="$targetType === 'post' || $targetType === 'collection'"
          class="field"
        >
          <label class="label">
            {t({
              message: "Target Slug",
              comment: "@context: Custom URL target slug field",
            })}
          </label>
          <input
            type="text"
            data-bind="targetId"
            class="input"
            placeholder="my-post-slug"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message: "The slug of the target post or collection",
              comment: "@context: Custom URL target slug help text",
            })}
          </p>
        </div>

        <div class="flex gap-2">
          <button type="submit" class="btn" data-attr:disabled="$_loading">
            <svg
              data-show="$_loading"
              style="display:none"
              class="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              role="status"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {t({
              message: "Create Custom URL",
              comment: "@context: Button to save new custom URL",
            })}
          </button>
          <a
            href={toPublicPath("/settings/custom-urls", sitePathPrefix)}
            class="btn-outline"
          >
            {t({
              message: "Cancel",
              comment: "@context: Button to cancel form",
            })}
          </a>
        </div>
      </form>
    </>
  );
}

// List custom URLs
customUrlsRoutes.get("/", async (c) => {
  const pageParam = c.req.query("page");
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const [total, customUrlsList] = await Promise.all([
    c.var.services.customUrls.count(),
    c.var.services.customUrls.list({
      limit: DEFAULT_PAGE_SIZE,
      offset: (currentPage - 1) * DEFAULT_PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  // Resolve target UUIDs → slugs for display
  const targetSlugs: Record<string, string> = {};
  for (const cu of customUrlsList) {
    if (!cu.targetId || cu.targetType === "redirect") continue;
    if (cu.targetType === "post") {
      const post = await c.var.services.posts.getById(cu.targetId);
      if (post) targetSlugs[cu.targetId] = post.slug;
    } else if (cu.targetType === "collection") {
      const col = await c.var.services.collections.getById(cu.targetId);
      if (col) targetSlugs[cu.targetId] = col.slug;
    }
  }

  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Custom URLs", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={toPublicPath("/settings", c.var.appConfig.sitePathPrefix)}
          current="Custom URLs"
        />
        <CustomUrlsListContent
          customUrls={customUrlsList}
          targetSlugs={targetSlugs}
          currentPage={currentPage}
          totalPages={totalPages}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
      </>
    ),
  });
});

// New custom URL form
customUrlsRoutes.get("/new", async (c) => {
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("New Custom URL", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={toPublicPath("/settings", c.var.appConfig.sitePathPrefix)}
          current="Custom URLs"
        />
        <NewCustomUrlContent sitePathPrefix={c.var.appConfig.sitePathPrefix} />
      </>
    ),
  });
});

// Create custom URL
customUrlsRoutes.post("/", async (c) => {
  const body = parseValidated(CreateCustomUrlSchema, await c.req.json());

  const redirectType = body.redirectType
    ? (parseInt(body.redirectType, 10) as 301 | 302)
    : undefined;

  // Resolve slug → ID for post/collection targets
  let targetId = body.targetId;
  if (body.targetType === "post" && body.targetId) {
    const post = await c.var.services.posts.getBySlug(body.targetId);
    if (!post) {
      return c.json(
        { error: `Post with slug "${body.targetId}" not found` },
        404,
      );
    }
    targetId = post.id;
  }
  if (body.targetType === "collection" && body.targetId) {
    const col = await c.var.services.collections.getBySlug(body.targetId);
    if (!col) {
      return c.json(
        { error: `Collection with slug "${body.targetId}" not found` },
        404,
      );
    }
    targetId = col.id;
  }

  await c.var.services.customUrls.create({
    path: body.path,
    targetType: body.targetType,
    targetId,
    toPath: body.toPath,
    redirectType,
  });

  return dsRedirect(
    toPublicPath("/settings/custom-urls", c.var.appConfig.sitePathPrefix),
  );
});

// Delete custom URL
customUrlsRoutes.post("/:id/delete", async (c) => {
  const id = parseIdParam(c.req.param("id"));
  await c.var.services.customUrls.delete(id);

  return dsRedirect(
    toPublicPath("/settings/custom-urls", c.var.appConfig.sitePathPrefix),
  );
});
