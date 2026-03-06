/**
 * Navigation management: Lit-powered reorderable nav items, add area, system toggles
 */

import { useLingui } from "@lingui/react/macro";
import type { NavItem, SystemNavKey } from "../../../types.js";
import { SYSTEM_NAV_KEYS } from "../../../types.js";
import type {
  NavManagerLabels,
  SystemNavConfig,
} from "../../../client/components/nav-manager-types.js";
// =============================================================================
// System descriptions (used to build the config passed to the Lit component)
// =============================================================================

const SYSTEM_DESCRIPTIONS: Record<SystemNavKey, string> = {
  rss: "Add a link to your RSS feed",
  dashboard: "Shows 'Dashboard' when logged in, 'Sign in' when logged out",
  collections: "Link to your collections page",
  archive: "Link to the post archive",
};

// =============================================================================
// Main component
// =============================================================================

export function NavigationContent({
  navItems,
  headerNavMaxVisible,
  homeDefaultView,
  siteName,
}: {
  navItems: NavItem[];
  headerNavMaxVisible: number;
  homeDefaultView: string;
  siteName: string;
}) {
  const { t } = useLingui();

  // Serialize nav items for the Lit component
  const itemsData = navItems.map((item) => ({
    id: item.id,
    type: item.type,
    label: item.label,
    url: item.url,
  }));

  // Build system nav config array for the Lit component
  const systemNavData: SystemNavConfig[] = (
    Object.keys(SYSTEM_NAV_KEYS) as SystemNavKey[]
  ).map((key) => ({
    key,
    defaultLabel: SYSTEM_NAV_KEYS[key].defaultLabel,
    url: SYSTEM_NAV_KEYS[key].url,
    description: SYSTEM_DESCRIPTIONS[key],
  }));

  const labels: NavManagerLabels = {
    preview: t({
      message: "Navigation Preview",
      comment: "@context: Label for nav preview section",
    }),
    navigationItems: t({
      message: "Navigation items",
      comment: "@context: Section heading for nav items",
    }),
    emptyState: t({
      message:
        "No navigation items yet. Add links or enable system items below.",
      comment: "@context: Empty state for navigation items",
    }),
    link: t({ message: "link", comment: "@context: Nav item type badge" }),
    system: t({
      message: "system",
      comment: "@context: Nav item type badge",
    }),
    toggleEdit: t({
      message: "Toggle edit panel",
      comment: "@context: Button to expand/collapse nav item edit",
    }),
    label: t({
      message: "Label",
      comment: "@context: Nav item label field",
    }),
    url: t({ message: "URL", comment: "@context: Nav item URL field" }),
    save: t({
      message: "Save",
      comment: "@context: Save nav item changes",
    }),
    delete: t({
      message: "Delete",
      comment: "@context: Delete nav item",
    }),
    remove: t({
      message: "Remove",
      comment: "@context: Remove system item from navigation",
    }),
    orderSaved: t({
      message: "Order saved",
      comment: "@context: Toast after saving navigation item order",
    }),
    labelRequired: t({
      message: "Label is required",
      comment: "@context: Error toast when nav label is empty",
    }),
    saveFailed: t({
      message: "Couldn't save. Try again in a moment.",
      comment: "@context: Error toast when nav save fails",
    }),
    deleteFailed: t({
      message: "Couldn't delete. Try again in a moment.",
      comment: "@context: Error toast when nav delete fails",
    }),
    systemLinks: t({
      message: "System links",
      comment: "@context: Section heading for system nav items",
    }),
    systemLinksDescription: t({
      message:
        "Toggle built-in navigation items. Enabled items appear in your navigation alongside links.",
      comment: "@context: Description for system nav toggles",
    }),
    addCustomLinkToNavigation: t({
      message: "Add custom link to navigation",
      comment: "@context: Section heading for adding custom link to nav",
    }),
    addLink: t({
      message: "Add Link",
      comment: "@context: Button and heading for adding custom link",
    }),
    addLinkDescription: t({
      message: "Add a custom link to any URL",
      comment: "@context: Description in link popover form",
    }),
    urlPlaceholder: "/archive or https://...",
    maxVisibleLinks: t({
      message: "Links shown in header",
      comment: "@context: Label for max visible nav links number input",
    }),
    maxVisibleLinksDescription: t({
      message: "The rest will be tucked into a ··· menu",
      comment:
        "@context: Description for max visible nav links, explains overflow behavior",
    }),
    maxVisibleSaved: t({
      message: "Max visible links saved",
      comment: "@context: Toast after saving max visible nav links setting",
    }),
    useFeaturedAsDefault: t({
      message: "Open with Featured posts",
      comment:
        "@context: Switch label for setting featured posts as default homepage",
    }),
    useFeaturedAsDefaultDescription: t({
      message: "When off, visitors see your latest posts first",
      comment:
        "@context: Description for featured default toggle, explains what happens when off",
    }),
    homeViewSaved: t({
      message: "Home view saved",
      comment: "@context: Toast after saving home default view setting",
    }),
    latest: t({
      message: "Latest",
      comment: "@context: Browse filter label for latest posts",
    }),
    featured: t({
      message: "Featured",
      comment: "@context: Browse filter label for featured posts",
    }),
    labelAndUrlRequired: t({
      message: "Label and URL are required",
      comment: "@context: Error toast when nav link fields are empty",
    }),
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
            <span class="nav-preview-label">
              {t({
                message: "Navigation Preview",
                comment: "@context: Label for nav preview section",
              })}
            </span>
          </div>
          <div class="nav-preview-content">
            <div class="site-header-top">
              <a href="/" class="site-logo">
                {siteName}
              </a>
              <div class="site-header-right">
                {navItems.length > 0 && (
                  <nav class="site-header-nav">
                    {navItems.slice(0, headerNavMaxVisible).map((item) => (
                      <a key={item.id} href={item.url} class="site-header-link">
                        {item.label}
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
                {homeDefaultView === "featured"
                  ? t({
                      message: "Featured",
                      comment: "@context: Browse filter label",
                    })
                  : t({
                      message: "Latest",
                      comment: "@context: Browse filter label",
                    })}
              </span>
              <span class="site-browse-sep" aria-hidden="true">
                /
              </span>
              <span class="site-browse-link">
                {homeDefaultView === "featured"
                  ? t({
                      message: "Latest",
                      comment: "@context: Browse filter label",
                    })
                  : t({
                      message: "Featured",
                      comment: "@context: Browse filter label",
                    })}
              </span>
            </nav>
          </div>
        </div>
      </jant-nav-manager>
    </div>
  );
}
