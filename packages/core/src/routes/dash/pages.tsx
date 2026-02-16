import { getSiteName } from "../../lib/config.js";
/**
 * Dashboard Pages & Navigation Routes
 *
 * Unified management for pages and navigation items (pika.page style).
 * Two sections: "Your site navigation" (draggable) and "Other pages".
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, Page, NavItem } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../theme/layouts/index.js";
import {
  PageForm,
  ListItemRow,
  ActionButtons,
  CrudPageHeader,
  DangerZone,
} from "../../theme/components/index.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pagesRoutes = new Hono<Env>();

// =============================================================================
// Components
// =============================================================================

function UnifiedPagesContent({
  navItems,
  otherPages,
}: {
  navItems: NavItem[];
  otherPages: Page[];
}) {
  const { t } = useLingui();

  return (
    <>
      <CrudPageHeader
        title={t({
          message: "Pages",
          comment: "@context: Pages main heading",
        })}
      >
        <div class="flex gap-2">
          <a href="/dash/pages/links/new" class="btn-outline">
            {t({
              message: "Add Link",
              comment: "@context: Button to add a navigation link",
            })}
          </a>
          <a href="/dash/pages/new" class="btn">
            {t({
              message: "New Page",
              comment: "@context: Button to create new page",
            })}
          </a>
        </div>
      </CrudPageHeader>

      {/* Navigation section */}
      <section class="mb-8">
        <h2 class="text-lg font-medium mb-3">
          {t({
            message: "Your site navigation",
            comment: "@context: Section heading for navigation items",
          })}
        </h2>
        {navItems.length === 0 ? (
          <p class="text-sm text-muted-foreground py-4">
            {t({
              message:
                "No navigation links yet. Add pages to navigation or create links.",
              comment: "@context: Empty state for navigation section",
            })}
          </p>
        ) : (
          <div id="nav-links-list" class="flex flex-col divide-y">
            {navItems.map((item) => (
              <ListItemRow
                key={item.id}
                actions={
                  item.type === "page" ? (
                    <>
                      <ActionButtons
                        editHref={
                          item.pageId
                            ? `/dash/pages/${item.pageId}/edit`
                            : undefined
                        }
                        editLabel={t({
                          message: "Edit",
                          comment: "@context: Button to edit page",
                        })}
                      />
                      <button
                        type="button"
                        class="btn-sm-ghost"
                        data-on:click__prevent={`@post('/dash/pages/${item.pageId}/remove-from-nav')`}
                      >
                        {t({
                          message: "Un-nav",
                          comment:
                            "@context: Button to remove page from navigation",
                        })}
                      </button>
                    </>
                  ) : (
                    <>
                      <ActionButtons
                        editHref={`/dash/pages/links/${item.id}/edit`}
                        editLabel={t({
                          message: "Edit",
                          comment: "@context: Button to edit link",
                        })}
                        deleteAction={`/dash/pages/links/${item.id}/delete`}
                        deleteLabel={t({
                          message: "Delete",
                          comment: "@context: Button to delete link",
                        })}
                      />
                    </>
                  )
                }
              >
                <div
                  class="flex items-center gap-3 cursor-grab"
                  data-id={item.id}
                >
                  <span class="text-muted-foreground select-none">⠿</span>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{item.label}</span>
                    <code class="text-sm text-muted-foreground bg-muted px-1 rounded">
                      {item.url}
                    </code>
                    <span class="badge badge-sm">
                      {item.type === "page"
                        ? t({
                            message: "page",
                            comment: "@context: Nav item type badge",
                          })
                        : t({
                            message: "link",
                            comment: "@context: Nav item type badge",
                          })}
                    </span>
                  </div>
                </div>
              </ListItemRow>
            ))}
          </div>
        )}
      </section>

      {/* Other pages section */}
      <section>
        <h2 class="text-lg font-medium mb-3">
          {t({
            message: "Other pages",
            comment: "@context: Section heading for pages not in navigation",
          })}
        </h2>
        {otherPages.length === 0 ? (
          <p class="text-sm text-muted-foreground py-4">
            {t({
              message: "All pages are in your navigation.",
              comment: "@context: Empty state when all pages are in nav",
            })}
          </p>
        ) : (
          <div class="flex flex-col divide-y">
            {otherPages.map((page) => (
              <ListItemRow
                key={page.id}
                actions={
                  <>
                    <button
                      type="button"
                      class="btn-sm-outline"
                      data-on:click__prevent={`@post('/dash/pages/${page.id}/add-to-nav')`}
                    >
                      {t({
                        message: "Add to nav",
                        comment: "@context: Button to add page to navigation",
                      })}
                    </button>
                    <ActionButtons
                      editHref={`/dash/pages/${page.id}/edit`}
                      editLabel={t({
                        message: "Edit",
                        comment: "@context: Button to edit page",
                      })}
                      viewHref={
                        page.status !== "draft" ? `/${page.slug}` : undefined
                      }
                      viewLabel={t({
                        message: "View",
                        comment: "@context: Button to view page on public site",
                      })}
                    />
                  </>
                }
              >
                <a
                  href={`/dash/pages/${page.id}`}
                  class="font-medium hover:underline"
                >
                  {page.title ||
                    t({
                      message: "Untitled",
                      comment: "@context: Default title for untitled page",
                    })}
                </a>
                <p class="text-sm text-muted-foreground mt-1">/{page.slug}</p>
              </ListItemRow>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

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

function LinkFormContent({
  item,
  isEdit,
}: {
  item?: NavItem;
  isEdit?: boolean;
}) {
  const { t } = useLingui();
  const title = isEdit
    ? t({ message: "Edit Link", comment: "@context: Page heading" })
    : t({ message: "New Link", comment: "@context: Page heading" });

  const signals = JSON.stringify({
    label: item?.label ?? "",
    url: item?.url ?? "",
  }).replace(/</g, "\\u003c");

  const action = isEdit ? `/dash/pages/links/${item?.id}` : "/dash/pages/links";

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">{title}</h1>

      <form
        data-signals={signals}
        data-on:submit__prevent={`@post('${action}')`}
        data-indicator="_loading"
        class="flex flex-col gap-4 max-w-lg"
      >
        <div class="field">
          <label class="label">
            {t({
              message: "Label",
              comment: "@context: Navigation link form field",
            })}
          </label>
          <input
            type="text"
            data-bind="label"
            class="input"
            placeholder="Home"
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message: "Display text for the link",
              comment: "@context: Navigation label help text",
            })}
          </p>
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "URL",
              comment: "@context: Navigation link form field",
            })}
          </label>
          <input
            type="text"
            data-bind="url"
            class="input"
            placeholder="/archive or https://..."
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message:
                "Path (e.g. /archive) or full URL (e.g. https://example.com)",
              comment: "@context: Navigation URL help text",
            })}
          </p>
        </div>

        <div class="flex gap-2">
          <button type="submit" class="btn" data-attr-disabled="$_loading">
            <span data-show="!$_loading">
              {isEdit
                ? t({
                    message: "Save Changes",
                    comment: "@context: Button to save edited navigation link",
                  })
                : t({
                    message: "Create Link",
                    comment: "@context: Button to save new navigation link",
                  })}
            </span>
            <span data-show="$_loading">
              {t({
                message: "Processing...",
                comment:
                  "@context: Loading text shown on submit button while request is in progress",
              })}
            </span>
          </button>
          <a href="/dash/pages" class="btn-outline">
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

// =============================================================================
// Page Routes
// =============================================================================

// List pages (unified view)
pagesRoutes.get("/", async (c) => {
  const [navItems, otherPages] = await Promise.all([
    c.var.services.navItems.list(),
    c.var.services.pages.listNotInNav(),
  ]);
  const siteName = await getSiteName(c);

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

// New page form
pagesRoutes.get("/new", async (c) => {
  const siteName = await getSiteName(c);

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

// New link form
pagesRoutes.get("/links/new", async (c) => {
  const siteName = await getSiteName(c);

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

// Create link
pagesRoutes.post("/links", async (c) => {
  const body = await c.req.json<{ label: string; url: string }>();

  if (!body.label || !body.url) {
    return dsToast("Label and URL are required", "error");
  }

  await c.var.services.navItems.create({
    type: "link",
    label: body.label,
    url: body.url,
  });

  return dsRedirect("/dash/pages");
});

// Reorder nav items (must be before /:id to avoid matching)
pagesRoutes.post("/reorder", async (c) => {
  const body = await c.req.json<{ ids: number[] }>();

  if (!Array.isArray(body.ids)) {
    return dsToast("Invalid request", "error");
  }

  await c.var.services.navItems.reorder(body.ids);

  return dsToast("Order saved");
});

// Edit link form
pagesRoutes.get("/links/:id/edit", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const item = await c.var.services.navItems.getById(id);
  if (!item) return c.notFound();

  const siteName = await getSiteName(c);

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

// Update link
pagesRoutes.post("/links/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const body = await c.req.json<{ label: string; url: string }>();

  if (!body.label || !body.url) {
    return dsToast("Label and URL are required", "error");
  }

  const updated = await c.var.services.navItems.update(id, {
    label: body.label,
    url: body.url,
  });

  if (!updated) return c.notFound();

  return dsRedirect("/dash/pages");
});

// Delete link
pagesRoutes.post("/links/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!isNaN(id)) {
    await c.var.services.navItems.delete(id);
  }

  return dsRedirect("/dash/pages");
});

// Create page
pagesRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    title: string;
    body: string;
    status: string;
    slug: string;
  }>();

  const page = await c.var.services.pages.create({
    title: body.title,
    body: body.body,
    status: body.status as Page["status"],
    slug: body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  });

  return dsRedirect(`/dash/pages/${page.id}`);
});

// Add page to navigation
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

// Remove page from navigation (keeps the page, deletes the nav item)
pagesRoutes.post("/:id/remove-from-nav", async (c) => {
  const pageId = parseInt(c.req.param("id"), 10);
  if (isNaN(pageId)) return c.notFound();

  // Find nav item by pageId
  const navItems = await c.var.services.navItems.list();
  const navItem = navItems.find((item) => item.pageId === pageId);
  if (navItem) {
    await c.var.services.navItems.delete(navItem.id);
  }

  return dsRedirect("/dash/pages");
});

// View single page
pagesRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.notFound();

  const siteName = await getSiteName(c);

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

// Edit page form
pagesRoutes.get("/:id/edit", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.notFound();

  const siteName = await getSiteName(c);

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

// Update page
pagesRoutes.post("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  const body = await c.req.json<{
    title: string;
    body: string;
    status: string;
    slug: string;
  }>();

  await c.var.services.pages.update(id, {
    title: body.title,
    body: body.body,
    status: body.status as Page["status"],
    slug: body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  });

  return dsRedirect(`/dash/pages/${id}`);
});

// Delete page
pagesRoutes.post("/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.notFound();

  await c.var.services.pages.delete(id);

  return dsRedirect("/dash/pages");
});
