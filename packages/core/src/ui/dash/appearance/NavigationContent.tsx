/**
 * Navigation management: Lit-powered reorderable nav items, add area, system toggles
 */

import { msg } from "@lingui/core/macro";
import { useLingui } from "../../../i18n/context.js";
import type { NavItem, SystemNavKey } from "../../../types.js";
import { SYSTEM_NAV_KEYS } from "../../../types.js";
import type {
  NavManagerLabels,
  SystemNavConfig,
} from "../../../client/components/nav-manager-types.js";
import { toPublicHref, toPublicPath } from "../../../lib/url.js";
import {
  getNavItemDisplayLabel,
  getSystemNavDescription,
  getSystemNavDisplayLabel,
} from "../../shared/navigation-labels.js";

// =============================================================================
// Main component
// =============================================================================

export function NavigationContent({
  navItems,
  headerNavMaxVisible,
  homeDefaultView,
  mainRssFeed,
  siteName,
  sitePathPrefix = "",
}: {
  navItems: NavItem[];
  headerNavMaxVisible: number;
  homeDefaultView: string;
  mainRssFeed: string;
  siteName: string;
  sitePathPrefix?: string;
}) {
  const { i18n } = useLingui();
  const latestLabel = i18n._(
    msg({
      message: "Latest",
      comment: "@context: Browse filter label for latest posts",
    }),
  );
  const featuredLabel = i18n._(
    msg({
      message: "Featured",
      comment: "@context: Browse filter label for featured posts",
    }),
  );
  const previewLabel = i18n._(
    msg({
      message: "Navigation Preview",
      comment: "@context: Label for nav preview section",
    }),
  );

  // Serialize nav items for the Lit component
  const itemsData = navItems.map((item) => ({
    id: item.id,
    type: item.type,
    systemKey: item.systemKey,
    label: item.label,
    displayLabel: getNavItemDisplayLabel(item, i18n, sitePathPrefix),
    url: item.url,
  }));

  // Build system nav config array for the Lit component
  const systemNavData: SystemNavConfig[] = (
    Object.keys(SYSTEM_NAV_KEYS) as SystemNavKey[]
  ).map((key) => ({
    key,
    label: getSystemNavDisplayLabel(key, i18n),
    description:
      key === "rss"
        ? i18n._(
            msg({
              message:
                "Header RSS points to your {feed} feed (/feed). Change what /feed returns in General.",
              comment:
                "@context: Description for the RSS system navigation toggle. {feed} is either Latest or Featured.",
            }),
            {
              feed: mainRssFeed === "latest" ? latestLabel : featuredLabel,
            },
          )
        : getSystemNavDescription(key, i18n),
  }));

  const labels: NavManagerLabels = {
    preview: previewLabel,
    navigationItems: i18n._(
      msg({
        message: "Navigation items",
        comment: "@context: Section heading for nav items",
      }),
    ),
    emptyState: i18n._(
      msg({
        message:
          "No navigation items yet. Add links or enable system items below.",
        comment: "@context: Empty state for navigation items",
      }),
    ),
    link: i18n._(
      msg({
        message: "link",
        comment: "@context: Nav item type badge",
      }),
    ),
    system: i18n._(
      msg({
        message: "system",
        comment: "@context: Nav item type badge",
      }),
    ),
    toggleEdit: i18n._(
      msg({
        message: "Toggle edit panel",
        comment: "@context: Button to expand/collapse nav item edit",
      }),
    ),
    label: i18n._(
      msg({
        message: "Label",
        comment: "@context: Nav item label field",
      }),
    ),
    url: i18n._(
      msg({
        message: "URL",
        comment: "@context: Nav item URL field",
      }),
    ),
    save: i18n._(
      msg({
        message: "Save",
        comment: "@context: Save nav item changes",
      }),
    ),
    delete: i18n._(
      msg({
        message: "Delete",
        comment: "@context: Delete nav item",
      }),
    ),
    remove: i18n._(
      msg({
        message: "Remove",
        comment: "@context: Remove system item from navigation",
      }),
    ),
    orderSaved: i18n._(
      msg({
        message: "Navigation order updated.",
        comment: "@context: Toast after saving navigation item order",
      }),
    ),
    labelRequired: i18n._(
      msg({
        message: "Label is required",
        comment: "@context: Error toast when nav label is empty",
      }),
    ),
    saveFailed: i18n._(
      msg({
        message: "Couldn't save. Try again in a moment.",
        comment: "@context: Error toast when nav save fails",
      }),
    ),
    deleteFailed: i18n._(
      msg({
        message: "Couldn't delete. Try again in a moment.",
        comment: "@context: Error toast when nav delete fails",
      }),
    ),
    systemLinks: i18n._(
      msg({
        message: "System links",
        comment: "@context: Section heading for system nav items",
      }),
    ),
    systemLinksDescription: i18n._(
      msg({
        message:
          "Toggle built-in navigation items. Enabled items appear in your navigation alongside links.",
        comment: "@context: Description for system nav toggles",
      }),
    ),
    addCustomLinkToNavigation: i18n._(
      msg({
        message: "Add custom link to navigation",
        comment: "@context: Section heading for adding custom link to nav",
      }),
    ),
    addLink: i18n._(
      msg({
        message: "Add Link",
        comment: "@context: Button and heading for adding custom link",
      }),
    ),
    addLinkDescription: i18n._(
      msg({
        message: "Add a custom link to any URL",
        comment: "@context: Description in link popover form",
      }),
    ),
    urlPlaceholder: "/archive or https://...",
    maxVisibleLinks: i18n._(
      msg({
        message: "Links shown in header",
        comment: "@context: Label for max visible nav links number input",
      }),
    ),
    maxVisibleLinksDescription: i18n._(
      msg({
        message: "The rest will be tucked into a ··· menu",
        comment:
          "@context: Description for max visible nav links, explains overflow behavior",
      }),
    ),
    maxVisibleSaved: i18n._(
      msg({
        message: "Header link limit updated.",
        comment: "@context: Toast after saving max visible nav links setting",
      }),
    ),
    useFeaturedAsDefault: i18n._(
      msg({
        message: "Use Featured as the home feed",
        comment:
          "@context: Switch label for setting featured posts as default homepage",
      }),
    ),
    useFeaturedAsDefaultDescription: i18n._(
      msg({
        message: "When off, the homepage opens with your latest posts.",
        comment:
          "@context: Description for featured default toggle, explains what happens when off",
      }),
    ),
    homeViewSaved: i18n._(
      msg({
        message: "Home feed updated.",
        comment: "@context: Toast after saving home default view setting",
      }),
    ),
    latest: latestLabel,
    featured: featuredLabel,
    labelAndUrlRequired: i18n._(
      msg({
        message: "Label and URL are required",
        comment: "@context: Error toast when nav link fields are empty",
      }),
    ),
  };

  const escapeJson = (data: unknown) =>
    JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <div class="max-w-3xl flex flex-col gap-8">
      <jant-nav-manager
        items={escapeJson(itemsData)}
        labels={escapeJson(labels)}
        system-nav-items={escapeJson(systemNavData)}
        site-name={siteName}
        max-visible={headerNavMaxVisible}
        home-default-view={homeDefaultView}
      >
        {/* SSR fallback: static preview until JS hydrates */}
        <div class="nav-preview">
          <div class="nav-preview-chrome">
            <div class="nav-preview-dots">
              <span />
              <span />
              <span />
            </div>
            <span class="nav-preview-label">{previewLabel}</span>
          </div>
          <div class="nav-preview-content">
            <div class="site-header-top">
              <a href={toPublicPath("/", sitePathPrefix)} class="site-logo">
                {siteName}
              </a>
              <div class="site-header-right">
                {navItems.length > 0 && (
                  <nav class="site-header-nav">
                    {navItems.slice(0, headerNavMaxVisible).map((item) => (
                      <a
                        key={item.id}
                        href={toPublicHref(item.url, sitePathPrefix)}
                        class="site-header-link"
                      >
                        {getNavItemDisplayLabel(item, i18n, sitePathPrefix)}
                      </a>
                    ))}
                    {navItems.length > headerNavMaxVisible && (
                      <span class="text-muted-foreground">…</span>
                    )}
                  </nav>
                )}
                <span class="site-header-search" aria-hidden="true">
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
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
              </div>
            </div>
            <nav class="site-browse-nav">
              <span class="site-browse-link site-browse-link-active">
                {homeDefaultView === "featured" ? featuredLabel : latestLabel}
              </span>
              <span class="site-browse-sep" aria-hidden="true">
                /
              </span>
              <span class="site-browse-link">
                {homeDefaultView === "featured" ? latestLabel : featuredLabel}
              </span>
            </nav>
          </div>
        </div>
      </jant-nav-manager>
    </div>
  );
}
