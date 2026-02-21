/**
 * Dashboard Redirects Routes
 *
 * Mounted under /dash/settings/redirects
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, Redirect } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { EmptyState, ListItemRow, ActionButtons } from "../../ui/dash/index.js";
import { SettingsNav } from "../../ui/dash/settings/SettingsNav.js";
import { dsRedirect } from "../../lib/sse.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const redirectsRoutes = new Hono<Env>();

function RedirectsListContent({ redirects }: { redirects: Redirect[] }) {
  const { t } = useLingui();

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="redirects" />

      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-medium">
          {t({
            message: "Redirects",
            comment: "@context: Settings section heading",
          })}
        </h2>
        <a href="/dash/settings/redirects/new" class="btn">
          {t({
            message: "New Redirect",
            comment: "@context: Button to create new redirect",
          })}
        </a>
      </div>

      {redirects.length === 0 ? (
        <EmptyState
          message={t({
            message: "No redirects configured.",
            comment: "@context: Empty state message",
          })}
          ctaText={t({
            message: "New Redirect",
            comment: "@context: Button to create new redirect",
          })}
          ctaHref="/dash/settings/redirects/new"
        />
      ) : (
        <div class="flex flex-col divide-y">
          {redirects.map((r) => (
            <ListItemRow
              key={r.id}
              actions={
                <ActionButtons
                  deleteAction={`/dash/settings/redirects/${r.id}/delete`}
                  deleteLabel={t({
                    message: "Delete",
                    comment: "@context: Button to delete redirect",
                  })}
                />
              }
            >
              <div class="flex items-center gap-2">
                <code class="text-sm bg-muted px-1 rounded">{r.fromPath}</code>
                <span class="text-muted-foreground">→</span>
                <code class="text-sm bg-muted px-1 rounded">{r.toPath}</code>
                <span class="badge-outline">{r.type}</span>
              </div>
            </ListItemRow>
          ))}
        </div>
      )}
    </>
  );
}

function NewRedirectContent() {
  const { t } = useLingui();

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="redirects" />

      <h2 class="text-lg font-medium mb-6">
        {t({ message: "New Redirect", comment: "@context: Page heading" })}
      </h2>

      <form
        data-signals="{fromPath: '', toPath: '', type: '301'}"
        data-on:submit__prevent="@post('/dash/settings/redirects')"
        data-indicator="_loading"
        class="flex flex-col gap-4 max-w-lg"
      >
        <div class="field">
          <label class="label">
            {t({
              message: "From Path",
              comment: "@context: Redirect form field",
            })}
          </label>
          <input
            type="text"
            data-bind="fromPath"
            class="input"
            placeholder="/old-path"
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message: "The path to redirect from",
              comment: "@context: Redirect from path help text",
            })}
          </p>
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "To Path",
              comment: "@context: Redirect form field",
            })}
          </label>
          <input
            type="text"
            data-bind="toPath"
            class="input"
            placeholder="/new-path or https://..."
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message: "The destination path or URL",
              comment: "@context: Redirect to path help text",
            })}
          </p>
        </div>

        <div class="field">
          <label class="label">
            {t({ message: "Type", comment: "@context: Redirect form field" })}
          </label>
          <select data-bind="type" class="select">
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
              message: "Create Redirect",
              comment: "@context: Button to save new redirect",
            })}
          </button>
          <a href="/dash/settings/redirects" class="btn-outline">
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

// List redirects
redirectsRoutes.get("/", async (c) => {
  const siteName = c.var.appConfig.siteName;
  const redirects = await c.var.services.redirects.list();

  return c.html(
    <DashLayout
      c={c}
      title="Settings"
      siteName={siteName}
      currentPath="/dash/settings"
    >
      <RedirectsListContent redirects={redirects} />
    </DashLayout>,
  );
});

// New redirect form
redirectsRoutes.get("/new", async (c) => {
  const siteName = c.var.appConfig.siteName;

  return c.html(
    <DashLayout
      c={c}
      title="Settings"
      siteName={siteName}
      currentPath="/dash/settings"
    >
      <NewRedirectContent />
    </DashLayout>,
  );
});

// Create redirect
redirectsRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    fromPath: string;
    toPath: string;
    type: string;
  }>();

  const type = parseInt(body.type, 10) as 301 | 302;
  await c.var.services.redirects.create(body.fromPath, body.toPath, type);

  return dsRedirect("/dash/settings/redirects");
});

// Delete redirect
redirectsRoutes.post("/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!isNaN(id)) {
    await c.var.services.redirects.delete(id);
  }

  return dsRedirect("/dash/settings/redirects");
});
