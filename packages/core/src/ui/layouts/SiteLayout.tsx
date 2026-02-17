/**
 * Site Layout
 *
 * Vertical header: site name on top, nav links below, description under nav.
 * Clean flat content area. Includes compose prompt/dialog for authenticated users.
 * Hardcoded browse links (Featured, Archive, Search) below compose prompt.
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
        message: "All",
        comment: "@context: Browse filter for all posts",
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
      href: "/archive",
      label: t({
        message: "Archive",
        comment: "@context: Browse filter for archive",
      }),
    },
    {
      href: "/search",
      label: t({
        message: "Search",
        comment: "@context: Browse filter for search",
      }),
    },
  ];

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
            </nav>
            {children}
          </div>
        </div>
      </main>

      {isAuthenticated && <ComposeDialog collections={collections} />}
    </div>
  );
};
