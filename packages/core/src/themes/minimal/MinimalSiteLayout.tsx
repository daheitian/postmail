/**
 * Minimal Theme - Site Layout
 *
 * Single-column, centered layout with horizontal nav.
 * Inspired by Tufte CSS and Manton.org.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { NavLinkView, SiteLayoutProps } from "../../types.js";

function NavLinks({ links }: { links: NavLinkView[] }) {
  return (
    <>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          class={`text-sm ${
            link.isActive
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
          {...(link.isExternal
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {link.label}
          {link.isExternal && (
            <span class="ml-0.5 text-xs opacity-50">&#8599;</span>
          )}
        </a>
      ))}
    </>
  );
}

export const SiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  links,
  children,
}) => {
  return (
    <div
      class="max-w-2xl mx-auto px-4 py-8"
      data-signals={JSON.stringify({ _menuOpen: false })}
    >
      {/* Header */}
      <header class="mb-12">
        <div class="flex items-center justify-between">
          <a href="/" class="text-xl font-semibold">
            {siteName}
          </a>

          {/* Mobile menu toggle */}
          {links.length > 0 && (
            <button
              data-on:click="$_menuOpen = !$_menuOpen"
              class="p-2 -mr-2 text-muted-foreground hover:text-foreground sm:hidden"
              aria-label="Toggle menu"
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
          )}
        </div>

        {/* Desktop nav (inline) */}
        {links.length > 0 && (
          <nav class="hidden sm:flex flex-wrap gap-x-4 gap-y-1 mt-3">
            <NavLinks links={links} />
          </nav>
        )}

        {/* Mobile nav (collapsible) */}
        {links.length > 0 && (
          <nav
            class="sm:hidden flex flex-col gap-1 mt-3 overflow-hidden"
            data-show="$_menuOpen"
          >
            <NavLinks links={links} />
          </nav>
        )}
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
};
