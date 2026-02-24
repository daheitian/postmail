/**
 * Dashboard Layout
 *
 * Layout for admin dashboard pages
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { Context } from "hono";
import { useLingui } from "@lingui/react/macro";
import { BaseLayout, type ToastProps } from "./BaseLayout.js";

export interface DashLayoutProps {
  c: Context;
  title: string;
  siteName: string;
  currentPath?: string;
  toast?: ToastProps;
}

function DashLayoutContent({
  siteName,
  currentPath,
  children,
}: PropsWithChildren<Omit<DashLayoutProps, "c" | "title">>) {
  const { t } = useLingui();

  const navClass = (match: RegExp) =>
    `dash-header-link ${currentPath && match.test(currentPath) ? "dash-header-link-active" : ""}`;

  return (
    <div class="min-h-screen">
      {/* Header */}
      <header class="dash-header">
        <div class="container dash-header-inner">
          <div class="dash-header-left">
            <a id="site-name" href="/dash" class="dash-header-logo">
              {siteName}
            </a>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              class="dash-header-site-link"
              aria-label={t({
                message: "View Site",
                comment:
                  "@context: Dashboard header link to view the public site",
              })}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
          </div>

          <nav class="dash-header-nav">
            <a href="/dash/pages" class={navClass(/^\/dash\/pages/)}>
              {t({
                message: "Pages",
                comment: "@context: Dashboard navigation - pages management",
              })}
            </a>
            <a href="/dash/appearance" class={navClass(/^\/dash\/appearance/)}>
              {t({
                message: "Appearance",
                comment: "@context: Dashboard navigation - appearance settings",
              })}
            </a>
            <a href="/dash/settings" class={navClass(/^\/dash\/settings/)}>
              {t({
                message: "Settings",
                comment: "@context: Dashboard navigation - site settings",
              })}
            </a>
          </nav>

          <div class="dropdown-menu">
            <button
              type="button"
              id="dash-menu-trigger"
              class="dash-header-menu-btn"
              aria-haspopup="menu"
              aria-controls="dash-menu"
              aria-expanded="false"
              aria-label={t({
                message: "Menu",
                comment: "@context: Dashboard header menu button",
              })}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            <div
              id="dash-menu-popover"
              data-popover
              data-align="end"
              aria-hidden="true"
            >
              <div
                role="menu"
                id="dash-menu"
                aria-labelledby="dash-menu-trigger"
              >
                <a href="/" role="menuitem" target="_blank">
                  {t({
                    message: "Visit Site",
                    comment:
                      "@context: Dashboard menu item to visit the public site",
                  })}
                </a>
                <a href="/signout" role="menuitem">
                  {t({
                    message: "Sign Out",
                    comment: "@context: Dashboard menu item to sign out",
                  })}
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <div class="container py-8">
        <main>{children}</main>
      </div>
    </div>
  );
}

export const DashLayout: FC<PropsWithChildren<DashLayoutProps>> = ({
  c,
  title,
  siteName,
  currentPath,
  toast,
  children,
}) => {
  return (
    <BaseLayout
      title={`${title} - ${siteName}`}
      c={c}
      toast={toast}
      isAuthenticated={true}
    >
      <DashLayoutContent siteName={siteName} currentPath={currentPath}>
        {children}
      </DashLayoutContent>
    </BaseLayout>
  );
};
