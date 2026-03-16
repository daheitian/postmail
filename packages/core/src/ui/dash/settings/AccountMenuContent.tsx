/**
 * Account settings sub-menu — lists Sessions and Password options
 */

import { useLingui } from "@lingui/react/macro";
import { toPublicPath } from "../../../lib/url.js";

/** Chevron right icon */
function ChevronRight() {
  return (
    <svg
      class="settings-item-chevron"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function AccountMenuItem({
  href,
  icon,
  tone = "accent",
  name,
  description,
}: {
  href: string;
  icon: string;
  tone?: "accent" | "subtle" | "danger";
  name: string;
  description: string;
}) {
  return (
    <a href={href} class="settings-item" data-tone={tone}>
      <span class="settings-item-icon">
        <span dangerouslySetInnerHTML={{ __html: icon }} />
      </span>
      <span class="settings-item-text">
        <span class="settings-item-name">{name}</span>
        <span class="settings-item-desc">{description}</span>
      </span>
      <ChevronRight />
    </a>
  );
}

const ICONS = {
  monitor: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
};

export function AccountMenuContent({
  sitePathPrefix = "",
  demoMode = false,
}: {
  sitePathPrefix?: string;
  demoMode?: boolean;
}) {
  const { t } = useLingui();

  return (
    <div class="settings-root">
      {demoMode && (
        <div class="alert mb-6" role="alert">
          {t({
            message:
              "Demo mode hides sessions, password changes, and account deletion. Export still works.",
            comment:
              "@context: Notice shown on the account page when demo restrictions are enabled",
          })}
        </div>
      )}

      {!demoMode && (
        <div>
          <div class="settings-group">
            <AccountMenuItem
              href={toPublicPath("/settings/account/sessions", sitePathPrefix)}
              icon={ICONS.monitor}
              tone="subtle"
              name={t({
                message: "Sessions",
                comment: "@context: Settings item — session management",
              })}
              description={t({
                message: "Manage active sign-in sessions",
                comment: "@context: Settings item description for sessions",
              })}
            />
            <AccountMenuItem
              href={toPublicPath("/settings/account/password", sitePathPrefix)}
              icon={ICONS.lock}
              tone="subtle"
              name={t({
                message: "Password",
                comment: "@context: Settings item — password settings",
              })}
              description={t({
                message: "Change your sign-in password",
                comment:
                  "@context: Settings item description for password change",
              })}
            />
          </div>
        </div>
      )}

      {/* Data */}
      <div>
        <div class="settings-group-label">
          {t({
            message: "Data",
            comment: "@context: Settings group label for data export/import",
          })}
        </div>
        <div class="settings-group">
          <form
            method="post"
            action={toPublicPath("/api/export/zola", sitePathPrefix)}
            class="settings-export-form"
          >
            <button type="submit" class="settings-item" data-tone="subtle">
              <span class="settings-item-icon">
                <span dangerouslySetInnerHTML={{ __html: ICONS.download }} />
              </span>
              <span class="settings-item-text">
                <span class="settings-item-name">
                  {t({
                    message: "Export Site",
                    comment:
                      "@context: Settings item — export site as Zola ZIP",
                  })}
                </span>
                <span class="settings-item-desc">
                  {t({
                    message: "Download as a Zola static site (.zip)",
                    comment:
                      "@context: Settings item description for site export",
                  })}
                </span>
              </span>
              <ChevronRight />
            </button>
          </form>
        </div>
      </div>

      {/* Danger Zone */}
      {!demoMode && (
        <div>
          <div
            class="settings-group-label"
            style="color: var(--color-destructive)"
          >
            {t({
              message: "Danger Zone",
              comment:
                "@context: Settings group label for destructive account actions",
            })}
          </div>
          <div class="settings-group">
            <AccountMenuItem
              href={toPublicPath(
                "/settings/account/delete-account",
                sitePathPrefix,
              )}
              icon={ICONS.trash}
              tone="danger"
              name={t({
                message: "Delete Account",
                comment:
                  "@context: Settings item — delete account and all data",
              })}
              description={t({
                message: "Permanently delete all data and reset the blog",
                comment:
                  "@context: Settings item description for account deletion",
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
