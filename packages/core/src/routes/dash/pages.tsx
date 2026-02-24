/**
 * Dashboard Pages & Navigation Routes
 *
 * Unified management for pages and navigation items.
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, Page } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { PageForm, ActionButtons, DangerZone } from "../../ui/dash/index.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { CreatePageSchema, CreateNavItemSchema } from "../../lib/schemas.js";
import { UnifiedPagesContent } from "../../ui/dash/pages/UnifiedPagesContent.js";
import { LinkFormContent } from "../../ui/dash/pages/LinkFormContent.js";
import { getI18n } from "../../i18n/index.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const NavLinkBody = CreateNavItemSchema.pick({ label: true, url: true });

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
  const [navItems, otherPages] = await Promise.all([
    c.var.services.navItems.list(),
    c.var.services.pages.listNotInNav(),
  ]);
  const siteName = c.var.appConfig.siteName;

  return c.html(
    <DashLayout
      c={c}
      title="Pages"
      siteName={siteName}
      currentPath="/dash/pages"
    >
      <UnifiedPagesContent navItems={navItems} otherPages={otherPages} />
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
      currentPath="/dash/pages"
    >
      <NewPageContent />
    </DashLayout>,
  );
});

pagesRoutes.get("/links/new", async (c) => {
  const siteName = c.var.appConfig.siteName;
  return c.html(
    <DashLayout
      c={c}
      title="New Link"
      siteName={siteName}
      currentPath="/dash/pages"
    >
      <LinkFormContent />
    </DashLayout>,
  );
});

pagesRoutes.post("/links", async (c) => {
  const i18n = getI18n(c);
  const result = NavLinkBody.safeParse(await c.req.json());
  if (!result.success) {
    return dsToast(
      i18n._(
        msg({
          message: "Label and URL are required",
          comment: "@context: Error toast when nav link fields are empty",
        }),
      ),
      "error",
    );
  }
  const body = result.data;

  await c.var.services.navItems.create({
    type: "link",
    label: body.label,
    url: body.url,
  });
  return dsRedirect("/dash/pages");
});

pagesRoutes.post("/reorder", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ ids: number[] }>();
  if (!Array.isArray(body.ids)) {
    return dsToast(
      i18n._(
        msg({
          message: "Invalid request",
          comment: "@context: Error toast when reorder request is malformed",
        }),
      ),
      "error",
    );
  }
  await c.var.services.navItems.reorder(body.ids);
  return dsToast(
    i18n._(
      msg({
        message: "Order saved",
        comment: "@context: Toast after saving navigation item order",
      }),
    ),
  );
});

pagesRoutes.get("/links/:id/edit", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const item = await c.var.services.navItems.getById(id);
  if (!item) return c.notFound();

  const siteName = c.var.appConfig.siteName;
  return c.html(
    <DashLayout
      c={c}
      title="Edit Link"
      siteName={siteName}
      currentPath="/dash/pages"
    >
      <LinkFormContent item={item} isEdit />
    </DashLayout>,
  );
});

pagesRoutes.post("/links/:id", async (c) => {
  const i18n = getI18n(c);
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const result = NavLinkBody.safeParse(await c.req.json());
  if (!result.success) {
    return dsToast(
      i18n._(
        msg({
          message: "Label and URL are required",
          comment: "@context: Error toast when nav link fields are empty",
        }),
      ),
      "error",
    );
  }
  const body = result.data;

  const updated = await c.var.services.navItems.update(id, {
    label: body.label,
    url: body.url,
  });
  if (!updated) return c.notFound();

  return dsRedirect("/dash/pages");
});

pagesRoutes.post("/links/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!isNaN(id)) {
    await c.var.services.navItems.delete(id);
  }
  return dsRedirect("/dash/pages");
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
          message: "Invalid input",
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

pagesRoutes.post("/:id/add-to-nav", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.notFound();

  await c.var.services.navItems.create({
    type: "page",
    label: page.title || page.slug,
    url: `/${page.slug}`,
    pageId: page.id,
  });
  return dsRedirect("/dash/pages");
});

pagesRoutes.post("/:id/remove-from-nav", async (c) => {
  const pageId = parseInt(c.req.param("id"), 10);
  if (isNaN(pageId)) return c.notFound();

  await c.var.services.navItems.deleteByPageId(pageId);
  return dsRedirect("/dash/pages");
});

pagesRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.notFound();

  const siteName = c.var.appConfig.siteName;
  return c.html(
    <DashLayout
      c={c}
      title={page.title || "Page"}
      siteName={siteName}
      currentPath="/dash/pages"
    >
      <ViewPageContent page={page} />
    </DashLayout>,
  );
});

pagesRoutes.get("/:id/edit", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.notFound();

  const siteName = c.var.appConfig.siteName;
  return c.html(
    <DashLayout
      c={c}
      title={`Edit: ${page.title || "Page"}`}
      siteName={siteName}
      currentPath="/dash/pages"
    >
      <EditPageContent page={page} />
    </DashLayout>,
  );
});

pagesRoutes.post("/:id", async (c) => {
  const i18n = getI18n(c);
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const raw = await c.req.json();
  const parsed = CreatePageSchema.safeParse(raw);
  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message ??
      i18n._(
        msg({
          message: "Invalid input",
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
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  await c.var.services.pages.delete(id);
  return dsRedirect("/dash/pages");
});
