/**
 * Site Layout
 *
 * Vertical header: site name on top, custom nav links below, description under nav.
 * Content area with browse filter tabs and compose prompt/dialog for authenticated users.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { NavItemView, SiteLayoutProps } from "../../types.js";
import { ComposeDialog } from "../compose/ComposeDialog.js";
import { ComposePrompt } from "../compose/ComposePrompt.js";

function HeaderLink({ link }: { link: NavItemView }) {
  return (
    <a
      href={link.url}
      class={`site-header-link ${link.isActive ? "site-header-link-active" : ""}`}
      {...(link.isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {link.label}
    </a>
  );
}

export const SiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  siteDescription,
  links,
  currentPath,
  isAuthenticated,
  collections,
  children,
}) => {
  const { t } = useLingui();

  const browseLinks = [
    {
      href: "/",
      label: t({
        message: "Latest",
        comment: "@context: Browse filter for latest posts",
      }),
    },
    {
      href: "/featured",
      label: t({
        message: "Featured",
        comment: "@context: Browse filter for featured posts",
      }),
    },
    {
      href: "/collections",
      label: t({
        message: "Collections",
        comment: "@context: Browse filter for collections",
      }),
    },
    {
      href: "/archive",
      label: t({
        message: "Archive",
        comment: "@context: Browse filter for archive",
      }),
    },
  ];

  const searchLabel = t({
    message: "Search",
    comment: "@context: Search icon link in browse nav",
  });

  return (
    <div class="site-page">
      <header class="site-header">
        <div class="site-header-inner">
          <a href="/" class="site-logo">
            {siteName}
          </a>
          {links.length > 0 && (
            <nav class="site-header-nav">
              {links.map((link) => (
                <HeaderLink key={link.id} link={link} />
              ))}
            </nav>
          )}
          {siteDescription && <p class="site-description">{siteDescription}</p>}
        </div>
      </header>

      <main class="site-main">
        <div class="site-container">
          <div class="site-content">
            {isAuthenticated && <ComposePrompt />}
            <nav class="site-browse-nav">
              {browseLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  class={`site-browse-link ${currentPath === link.href ? "site-browse-link-active" : ""}`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/search"
                class={`site-browse-search ${currentPath === "/search" ? "site-browse-search-active" : ""}`}
                aria-label={searchLabel}
                title={searchLabel}
              >
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
              </a>
            </nav>
            {children}
          </div>
        </div>
      </main>

      {isAuthenticated && <ComposeDialog collections={collections} />}
    </div>
  );
};
