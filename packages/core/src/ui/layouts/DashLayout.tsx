/**
 * Dashboard Layout
 *
 * Layout for admin dashboard pages
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { Context } from "hono";
import { useLingui } from "@lingui/react/macro";
import { BaseLayout, type ToastProps } from "./BaseLayout.js";

export interface DashBreadcrumb {
  parent: string;
  parentHref: string;
  current: string;
}

export interface DashLayoutProps {
  c: Context;
  title: string;
  siteName: string;
  currentPath?: string;
  breadcrumb?: DashBreadcrumb;
  toast?: ToastProps;
}

function DashLayoutContent({
  currentPath,
  breadcrumb,
  children,
}: PropsWithChildren<Omit<DashLayoutProps, "c" | "title" | "siteName">>) {
  const { t } = useLingui();

  const navClass = (match: RegExp) =>
    `dash-header-link ${currentPath && match.test(currentPath) ? "dash-header-link-active" : ""}`;

  return (
    <div class="min-h-screen">
      {/* Header */}
      <header class="dash-header">
        <div class="container dash-header-inner">
          <nav class="dash-header-nav">
            <a href="/dash" class={navClass(/^\/dash$/)}>
              {t({
                message: "Dashboard",
                comment: "@context: Dashboard navigation - dashboard home",
              })}
            </a>
            <span class="dash-header-nav-sep" aria-hidden="true">
              &middot;
            </span>
            <a href="/dash/pages" class={navClass(/^\/dash\/pages/)}>
              {t({
                message: "Pages",
                comment: "@context: Dashboard navigation - pages management",
              })}
            </a>
            <span class="dash-header-nav-sep" aria-hidden="true">
              &middot;
            </span>
            <a href="/dash/settings" class={navClass(/^\/dash\/settings/)}>
              {t({
                message: "Settings",
                comment: "@context: Dashboard navigation - site settings",
              })}
            </a>
          </nav>

          <div class="dash-header-right">
            <a
              href="/"
              class="dash-header-visit"
              target="_blank"
              data-tooltip={t({
                message: "Visit Blog",
                comment:
                  "@context: Dashboard header tooltip for visit blog icon on mobile",
              })}
              data-side="bottom"
              aria-label={t({
                message: "Visit Blog",
                comment:
                  "@context: Dashboard header link to visit the public blog",
              })}
            >
              <span class="dash-header-visit-icon">
                <svg
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
                  <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                  <path d="m21 3-9 9" />
                  <path d="M15 3h6v6" />
                </svg>
              </span>
              <span class="dash-header-visit-text">
                {t({
                  message: "Visit Blog",
                  comment:
                    "@context: Dashboard header link text to visit the public blog",
                })}
                <span class="ml-1" aria-hidden="true">
                  {"\u2197"}
                </span>
              </span>
            </a>

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
        </div>
      </header>

      {breadcrumb && (
        <div class="container">
          <nav class="dash-breadcrumb">
            <a href={breadcrumb.parentHref} class="dash-breadcrumb-parent">
              {breadcrumb.parent}
            </a>
            <span class="dash-breadcrumb-sep">/</span>
            <span class="dash-breadcrumb-current">{breadcrumb.current}</span>
          </nav>
        </div>
      )}

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
  breadcrumb,
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
      <DashLayoutContent currentPath={currentPath} breadcrumb={breadcrumb}>
        {children}
      </DashLayoutContent>
    </BaseLayout>
  );
};
