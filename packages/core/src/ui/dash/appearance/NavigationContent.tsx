/**
 * Navigation management: Lit-powered reorderable nav items, add area, system toggles
 */

import { useLingui } from "@lingui/react/macro";
import type { NavItem, Page, SystemNavKey } from "../../../types.js";
import { SYSTEM_NAV_KEYS } from "../../../types.js";
import type {
  NavManagerLabels,
  SystemNavConfig,
} from "../../components/nav-manager-types.js";
import { AppearanceNav } from "./AppearanceNav.js";

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
  availablePages,
  headerNavMaxVisible,
  siteName,
}: {
  navItems: NavItem[];
  availablePages: Page[];
  headerNavMaxVisible: number;
  siteName: string;
}) {
  const { t } = useLingui();

  // Serialize nav items for the Lit component
  const itemsData = navItems.map((item) => ({
    id: item.id,
    type: item.type,
    label: item.label,
    url: item.url,
    pageId: item.pageId,
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

  // Serialize available pages for the Lit component
  const pagesData = availablePages.map((page) => ({
    id: page.id,
    title: page.title,
    slug: page.slug,
  }));

  const labels: NavManagerLabels = {
    preview: t({
      message: "Preview",
      comment: "@context: Label for nav preview section",
    }),
    navigationItems: t({
      message: "Navigation items",
      comment: "@context: Section heading for nav items",
    }),
    emptyState: t({
      message:
        "No navigation items yet. Add pages, links, or enable system items below.",
      comment: "@context: Empty state for navigation items",
    }),
    page: t({ message: "page", comment: "@context: Nav item type badge" }),
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
    editPage: t({
      message: "Edit Page",
      comment: "@context: Link to edit the page",
    }),
    remove: t({
      message: "Remove",
      comment: "@context: Remove page from navigation",
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
      message: "Failed to save. Please try again.",
      comment: "@context: Error toast when nav save fails",
    }),
    deleteFailed: t({
      message: "Failed to delete. Please try again.",
      comment: "@context: Error toast when nav delete fails",
    }),
    systemLinks: t({
      message: "System links",
      comment: "@context: Section heading for system nav items",
    }),
    systemLinksDescription: t({
      message:
        "Toggle built-in navigation items. Enabled items appear in your navigation alongside pages and links.",
      comment: "@context: Description for system nav toggles",
    }),
    addToNavigation: t({
      message: "Add to navigation",
      comment: "@context: Section heading for adding nav items",
    }),
    addPage: t({
      message: "Add Page",
      comment: "@context: Card title for adding page to nav",
    }),
    addPageDescription: t({
      message: "Add an existing page to your navigation",
      comment: "@context: Card description for page picker",
    }),
    addLink: t({
      message: "Add Link",
      comment: "@context: Card title for adding custom link",
    }),
    addLinkDescription: t({
      message: "Add a custom link to any URL",
      comment: "@context: Card description for link form",
    }),
    add: t({
      message: "Add",
      comment: "@context: Button to add page to nav",
    }),
    allPagesInNav: t({
      message: "All pages are in navigation",
      comment: "@context: Message when no pages available to add",
    }),
    urlPlaceholder: "/archive or https://...",
    labelAndUrlRequired: t({
      message: "Label and URL are required",
      comment: "@context: Error toast when nav link fields are empty",
    }),
  };

  const escapeJson = (data: unknown) =>
    JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <>
      <AppearanceNav currentTab="navigation" />

      <div class="max-w-3xl flex flex-col gap-8">
        <jant-nav-manager
          items={escapeJson(itemsData)}
          labels={escapeJson(labels)}
          system-nav-items={escapeJson(systemNavData)}
          available-pages={escapeJson(pagesData)}
          site-name={siteName}
          max-visible={headerNavMaxVisible}
        >
          {/* SSR fallback: static preview until JS hydrates */}
          <div class="border rounded-lg p-4 bg-muted/30">
            <p class="text-xs text-muted-foreground mb-3">
              {t({
                message: "Preview",
                comment: "@context: Label for nav preview section",
              })}
            </p>
            <div class="flex items-center justify-between">
              <span class="font-semibold">{siteName}</span>
              <div class="flex items-center gap-3 text-sm">
                {navItems.slice(0, headerNavMaxVisible).map((item) => (
                  <span key={item.id} class="text-muted-foreground">
                    {item.label}
                  </span>
                ))}
                {navItems.length > headerNavMaxVisible && (
                  <span class="text-muted-foreground">...</span>
                )}
              </div>
            </div>
          </div>
        </jant-nav-manager>
      </div>
    </>
  );
}
