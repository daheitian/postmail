import { getSiteName } from "../../lib/config.js";
/**
 * Dashboard Navigation Items Routes
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, NavItem } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../theme/layouts/index.js";
import {
  EmptyState,
  ListItemRow,
  ActionButtons,
  CrudPageHeader,
} from "../../theme/components/index.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const navigationRoutes = new Hono<Env>();

function NavigationListContent({ items }: { items: NavItem[] }) {
  const { t } = useLingui();

  return (
    <>
      <CrudPageHeader
        title={t({
          message: "Navigation",
          comment: "@context: Dashboard heading",
        })}
        ctaLabel={t({
          message: "New Link",
          comment: "@context: Button to create new navigation link",
        })}
        ctaHref="/dash/navigation/new"
      />

      {items.length === 0 ? (
        <EmptyState
          message={t({
            message: "No navigation links configured.",
            comment: "@context: Empty state message",
          })}
          ctaText={t({
            message: "New Link",
            comment: "@context: Button to create new navigation link",
          })}
          ctaHref="/dash/navigation/new"
        />
      ) : (
        <>
          <div id="nav-links-list" class="flex flex-col divide-y">
            {items.map((item) => (
              <ListItemRow
                key={item.id}
                actions={
                  <ActionButtons
                    editHref={`/dash/navigation/${item.id}/edit`}
                    editLabel={t({
                      message: "Edit",
                      comment: "@context: Button to edit navigation link",
                    })}
                    deleteAction={`/dash/navigation/${item.id}/delete`}
                    deleteLabel={t({
                      message: "Delete",
                      comment: "@context: Button to delete navigation link",
                    })}
                  />
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
                  </div>
                </div>
              </ListItemRow>
            ))}
          </div>

          {/* SortableJS is initialized by client.ts via lib/nav-reorder.ts */}
        </>
      )}
    </>
  );
}

function NavigationFormContent({
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

  const action = isEdit ? `/dash/navigation/${item?.id}` : "/dash/navigation";

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
          <a href="/dash/navigation" class="btn-outline">
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

// List navigation items
navigationRoutes.get("/", async (c) => {
  const siteName = await getSiteName(c);
  const items = await c.var.services.navItems.list();

  return c.html(
    <DashLayout
      c={c}
      title="Navigation"
      siteName={siteName}
      currentPath="/dash/navigation"
    >
      <NavigationListContent items={items} />
    </DashLayout>,
  );
});

// New link form
navigationRoutes.get("/new", async (c) => {
  const siteName = await getSiteName(c);

  return c.html(
    <DashLayout
      c={c}
      title="New Link"
      siteName={siteName}
      currentPath="/dash/navigation"
    >
      <NavigationFormContent />
    </DashLayout>,
  );
});

// Create link
navigationRoutes.post("/", async (c) => {
  const body = await c.req.json<{ label: string; url: string }>();

  if (!body.label || !body.url) {
    return dsToast("Label and URL are required", "error");
  }

  await c.var.services.navItems.create({
    type: "link",
    label: body.label,
    url: body.url,
  });

  return dsRedirect("/dash/navigation");
});

// Reorder links (must be before /:id to avoid "reorder" matching as :id)
navigationRoutes.post("/reorder", async (c) => {
  const body = await c.req.json<{ ids: number[] }>();

  if (!Array.isArray(body.ids)) {
    return dsToast("Invalid request", "error");
  }

  await c.var.services.navItems.reorder(body.ids);

  return dsToast("Order saved");
});

// Edit link form
navigationRoutes.get("/:id/edit", async (c) => {
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
      currentPath="/dash/navigation"
    >
      <NavigationFormContent item={item} isEdit />
    </DashLayout>,
  );
});

// Update link
navigationRoutes.post("/:id", async (c) => {
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

  return dsRedirect("/dash/navigation");
});

// Delete link
navigationRoutes.post("/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!isNaN(id)) {
    await c.var.services.navItems.delete(id);
  }

  return dsRedirect("/dash/navigation");
});
