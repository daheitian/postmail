/**
 * Site Layout
 *
 * Two-column layout for public pages with sidebar navigation.
 * On mobile, collapses to single column with horizontal nav.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { NavigationLink } from "../../types.js";

export interface SiteLayoutProps {
  siteName: string;
  navigationLinks: NavigationLink[];
  currentPath: string;
}

/**
 * Determine if a navigation link is active based on the current path.
 *
 * @param linkUrl - The link's URL
 * @param currentPath - The current page path
 * @returns Whether the link should be shown as active
 */
function isLinkActive(linkUrl: string, currentPath: string): boolean {
  // External links are never active
  if (linkUrl.startsWith("http://") || linkUrl.startsWith("https://")) {
    return false;
  }

  // Exact match for home
  if (linkUrl === "/") {
    return currentPath === "/";
  }

  // Prefix match for other internal links
  return currentPath === linkUrl || currentPath.startsWith(linkUrl + "/");
}

/**
 * Check if a URL is external
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export const SiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  navigationLinks,
  currentPath,
  children,
}) => {
  return (
    <div class="container py-8 md:flex md:gap-12">
      {/* Sidebar */}
      <aside class="mb-8 md:mb-0 md:w-48 md:shrink-0 md:sticky md:top-8 md:self-start">
        <a href="/" class="text-xl font-semibold block mb-4">
          {siteName}
        </a>
        <nav class="flex flex-wrap gap-2 md:flex-col md:gap-1">
          {navigationLinks.map((link) => {
            const active = isLinkActive(link.url, currentPath);
            const external = isExternalUrl(link.url);
            return (
              <a
                key={link.id}
                href={link.url}
                class={`text-sm px-2 py-1 rounded-md ${
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
                {external && <span class="ml-1 text-xs opacity-50">↗</span>}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main class="flex-1 min-w-0">{children}</main>
    </div>
  );
};
