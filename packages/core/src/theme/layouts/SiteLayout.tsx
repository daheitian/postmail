/**
 * Site Layout
 *
 * Two-column layout for public pages with sidebar navigation.
 * On mobile, uses a slide-out drawer menu.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { NavigationLink, SiteLayoutProps } from "../../types.js";

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

/**
 * Render navigation links with dot indicator for active state.
 */
function NavLinks({
  navigationLinks,
  currentPath,
}: {
  navigationLinks: NavigationLink[];
  currentPath: string;
}) {
  return (
    <>
      {navigationLinks.map((link) => {
        const active = isLinkActive(link.url, currentPath);
        const external = isExternalUrl(link.url);
        return (
          <a
            key={link.id}
            href={link.url}
            class={`text-sm flex items-center gap-2 py-0.5 ${
              active
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <span
              class={`size-1.5 rounded-full shrink-0 ${active ? "bg-primary" : "bg-transparent"}`}
            />
            {link.label}
            {external && <span class="ml-1 text-xs opacity-50">↗</span>}
          </a>
        );
      })}
    </>
  );
}

export const SiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  navigationLinks,
  currentPath,
  children,
}) => {
  return (
    <div
      class="container py-8 md:flex md:gap-12"
      data-signals={JSON.stringify({ _drawerOpen: false })}
    >
      {/* Mobile header with hamburger */}
      <div class="flex items-center justify-between mb-6 md:hidden">
        <a href="/" class="text-xl font-semibold">
          {siteName}
        </a>
        <button
          data-on:click="$_drawerOpen = true"
          class="p-2 -mr-2 text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <svg
            class="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      <div
        class="fixed inset-0 bg-black/50 z-40 opacity-0 pointer-events-none transition-opacity duration-300 ease-in-out md:hidden"
        data-class="{'opacity-100 pointer-events-auto': $_drawerOpen, 'opacity-0 pointer-events-none': !$_drawerOpen}"
        data-on:click="$_drawerOpen = false"
      />

      {/* Mobile drawer panel */}
      <aside
        class="fixed inset-y-0 left-0 w-64 bg-background z-50 p-6 overflow-y-auto shadow-lg -translate-x-full transition-transform duration-300 ease-in-out md:hidden"
        data-class="{'translate-x-0': $_drawerOpen, '-translate-x-full': !$_drawerOpen}"
      >
        <div class="flex items-center justify-between mb-8">
          <a href="/" class="text-xl font-semibold">
            {siteName}
          </a>
          <button
            data-on:click="$_drawerOpen = false"
            class="p-2 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <svg
              class="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav class="flex flex-col gap-0.5">
          <NavLinks
            navigationLinks={navigationLinks}
            currentPath={currentPath}
          />
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside class="hidden md:block md:w-48 md:shrink-0 md:sticky md:top-8 md:self-start">
        <a href="/" class="text-xl font-semibold block mb-20">
          {siteName}
        </a>
        <nav class="flex flex-col gap-0.5">
          <NavLinks
            navigationLinks={navigationLinks}
            currentPath={currentPath}
          />
        </nav>
      </aside>

      {/* Main content */}
      <main class="flex-1 min-w-0">{children}</main>
    </div>
  );
};
