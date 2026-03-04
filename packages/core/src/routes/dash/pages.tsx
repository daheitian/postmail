/**
 * Dashboard Pages Routes
 *
 * Page CRUD management.
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, Page } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { PageForm, ActionButtons, DangerZone } from "../../ui/dash/index.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { CreatePageSchema } from "../../lib/schemas.js";
import { parseIdParam } from "../../lib/errors.js";
import { PagesContent } from "../../ui/dash/pages/PagesContent.js";
import { getI18n } from "../../i18n/index.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pagesRoutes = new Hono<Env>();

// =============================================================================
// Inline components (small, tightly coupled to route params)
// =============================================================================

function NewPageContent() {
  const { t } = useLingui();
  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">
        {t({ message: "New Page", comment: "@context: New page main heading" })}
      </h1>
      <PageForm action="/dash/pages" />
    </>
  );
}

function ViewPageContent({ page }: { page: Page }) {
  const { t } = useLingui();
  return (
    <>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold">
            {page.title ||
              t({
                message: "Page",
                comment: "@context: Default page heading when untitled",
              })}
          </h1>
          <p class="text-muted-foreground mt-1">/{page.slug}</p>
        </div>
        <ActionButtons
          editHref={`/dash/pages/${page.id}/edit`}
          editLabel={t({
            message: "Edit",
            comment: "@context: Button to edit page",
          })}
          viewHref={page.status !== "draft" ? `/${page.slug}` : undefined}
          viewLabel={t({
            message: "View",
            comment: "@context: Button to view page on public site",
          })}
        />
      </div>

      <div class="card">
        <section>
          <div
            class="prose"
            dangerouslySetInnerHTML={{ __html: page.bodyHtml || "" }}
          />
        </section>
      </div>

      <DangerZone
        actionLabel={t({
          message: "Delete Page",
          comment: "@context: Button to delete page",
        })}
        formAction={`/dash/pages/${page.id}/delete`}
        confirmMessage="Are you sure you want to delete this page?"
      />
    </>
  );
}

function EditPageContent({ page }: { page: Page }) {
  const { t } = useLingui();
  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">
        {t({
          message: "Edit Page",
          comment: "@context: Edit page main heading",
        })}
      </h1>
      <PageForm page={page} action={`/dash/pages/${page.id}`} />
    </>
  );
}

// =============================================================================
// Route handlers
// =============================================================================

pagesRoutes.get("/", async (c) => {
  const pages = await c.var.services.pages.list();
  const siteName = c.var.appConfig.siteName;

  return c.html(
    <DashLayout
      c={c}
      title="Pages"
      siteName={siteName}
      siteAvatarUrl={c.var.appConfig.siteAvatarUrl}
      currentPath="/dash/pages"
    >
      <PagesContent pages={pages} />
    </DashLayout>,
  );
});

pagesRoutes.get("/new", async (c) => {
  const siteName = c.var.appConfig.siteName;
  return c.html(
    <DashLayout
      c={c}
      title="New Page"
      siteName={siteName}
      siteAvatarUrl={c.var.appConfig.siteAvatarUrl}
      currentPath="/dash/pages"
    >
      <NewPageContent />
    </DashLayout>,
  );
});

pagesRoutes.post("/", async (c) => {
  const i18n = getI18n(c);
  const raw = await c.req.json();
  const parsed = CreatePageSchema.safeParse(raw);
  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message ??
      i18n._(
        msg({
          message:
            "Something doesn't look right. Check the form and try again.",
          comment: "@context: Fallback validation error for page form",
        }),
      );
    return dsToast(errorMsg, "error");
  }

  const page = await c.var.services.pages.create({
    title: parsed.data.title,
    body: parsed.data.body,
    status: parsed.data.status,
    slug: parsed.data.slug,
  });

  return dsRedirect(`/dash/pages/${page.id}`);
});

pagesRoutes.get("/:id", async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.notFound();

  const siteName = c.var.appConfig.siteName;
  return c.html(
    <DashLayout
      c={c}
      title={page.title || "Page"}
      siteName={siteName}
      siteAvatarUrl={c.var.appConfig.siteAvatarUrl}
      currentPath="/dash/pages"
    >
      <ViewPageContent page={page} />
    </DashLayout>,
  );
});

pagesRoutes.get("/:id/edit", async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.notFound();

  const siteName = c.var.appConfig.siteName;
  return c.html(
    <DashLayout
      c={c}
      title={`Edit: ${page.title || "Page"}`}
      siteName={siteName}
      siteAvatarUrl={c.var.appConfig.siteAvatarUrl}
      currentPath="/dash/pages"
    >
      <EditPageContent page={page} />
    </DashLayout>,
  );
});

pagesRoutes.post("/:id", async (c) => {
  const i18n = getI18n(c);
  const id = parseIdParam(c.req.param("id"));

  const raw = await c.req.json();
  const parsed = CreatePageSchema.safeParse(raw);
  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message ??
      i18n._(
        msg({
          message:
            "Something doesn't look right. Check the form and try again.",
          comment: "@context: Fallback validation error for page form",
        }),
      );
    return dsToast(errorMsg, "error");
  }

  await c.var.services.pages.update(id, {
    title: parsed.data.title,
    body: parsed.data.body,
    status: parsed.data.status,
    slug: parsed.data.slug,
  });

  return dsRedirect(`/dash/pages/${id}`);
});

pagesRoutes.post("/:id/delete", async (c) => {
  const id = parseIdParam(c.req.param("id"));

  await c.var.services.pages.delete(id);
  return dsRedirect("/dash/pages");
});
