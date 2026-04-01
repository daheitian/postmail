/**
 * Site Layout
 *
 * Vertical header: site name on top, custom nav links below.
 * Content area with browse filter tabs and compose prompt/dialog for authenticated users.
 */

import { msg } from "@lingui/core/macro";
import type { FC, PropsWithChildren } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import type { NavItemView, SiteLayoutProps } from "../../types.js";
import { toPublicPath } from "../../lib/url.js";
import { ComposeDialog } from "../compose/ComposeDialog.js";
import { ComposePrompt } from "../compose/ComposePrompt.js";
import { getNavItemDisplayLabel } from "../shared/navigation-labels.js";
import { HomePageBranding } from "../shared/HomePageBranding.js";

function HeaderLink({ link, label }: { link: NavItemView; label: string }) {
  return (
    <a
      href={link.url}
      class={`site-header-link ${link.isActive ? "site-header-link-active" : ""}`}
      {...(link.isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {label}
    </a>
  );
}

export const SiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  links,
  currentPath,
  sitePathPrefix = "",
  isAuthenticated,
  collections,
  homeDefaultView,
  headerNavMaxVisible,
  siteAvatarUrl,
  showHeaderAvatar,
  siteFooterHtml,
  showHomeBranding = false,
  sidebar,
  uploadMaxFileSize,
  showComposeDialog = true,
  showHeader = true,
  composeOpenShortcutDiscovered = false,
  children,
}) => {
  const { i18n } = useLingui();
  const maxVisible = headerNavMaxVisible ?? 3;
  const linksWithLabels = links.map((link) => ({
    ...link,
    displayLabel: getNavItemDisplayLabel(link, i18n, sitePathPrefix),
  }));
  const visibleLinks = linksWithLabels.slice(0, maxVisible);
  const overflowLinks = linksWithLabels.slice(maxVisible);
  const hasActiveOverflow = overflowLinks.some((l) => l.isActive);

  const latestHref =
    homeDefaultView === "featured"
      ? toPublicPath("/latest", sitePathPrefix)
      : toPublicPath("/", sitePathPrefix);
  const featuredHref =
    homeDefaultView === "featured"
      ? toPublicPath("/", sitePathPrefix)
      : toPublicPath("/featured", sitePathPrefix);

  const latestLink = {
    href: latestHref,
    label: i18n._(
      msg({
        message: "Latest",
        comment: "@context: Browse filter for latest posts",
      }),
    ),
  };
  const featuredLink = {
    href: featuredHref,
    label: i18n._(
      msg({
        message: "Featured",
        comment: "@context: Browse filter for featured posts",
      }),
    ),
  };

  // Default view tab comes first
  const browseLinks =
    homeDefaultView === "featured"
      ? [featuredLink, latestLink]
      : [latestLink, featuredLink];

  const searchLabel = i18n._(
    msg({
      message: "Search",
      comment: "@context: Search icon link in browse nav",
    }),
  );

  const isHomePage =
    currentPath === toPublicPath("/", sitePathPrefix) ||
    currentPath === toPublicPath("/featured", sitePathPrefix) ||
    currentPath === toPublicPath("/latest", sitePathPrefix);
  const contentClass = isHomePage
    ? "site-content site-content-home"
    : "site-content";

  return (
    <div class="site-page">
      {showHeader && (
        <header class="site-header">
          <div class="site-header-inner">
            <div
              class={`site-header-top site-header-top-bordered${isHomePage ? " site-header-top-home" : ""}`}
            >
              <a href={toPublicPath("/", sitePathPrefix)} class="site-logo">
                {showHeaderAvatar && siteAvatarUrl && (
                  <img src={siteAvatarUrl} class="site-logo-avatar" alt="" />
                )}
                {siteName}
              </a>
              <div class="site-header-right">
                {links.length > 0 && (
                  <nav class="site-header-nav">
                    {visibleLinks.map((link) => (
                      <HeaderLink
                        key={link.id}
                        link={link}
                        label={link.displayLabel}
                      />
                    ))}
                    <div
                      class="dropdown-menu site-header-more"
                      hidden={overflowLinks.length === 0}
                    >
                      <button
                        type="button"
                        id="site-nav-more-trigger"
                        class={`site-header-more-btn ${hasActiveOverflow ? "site-header-more-btn-active" : ""}`}
                        aria-haspopup="menu"
                        aria-controls="site-nav-more-menu"
                        aria-expanded="false"
                        aria-label={i18n._(
                          msg({
                            message: "More links",
                            comment:
                              "@context: Button to show overflow nav links",
                          }),
                        )}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="5" cy="12" r="2.2" />
                          <circle cx="12" cy="12" r="2.2" />
                          <circle cx="19" cy="12" r="2.2" />
                        </svg>
                      </button>
                      <div
                        id="site-nav-more-popover"
                        data-popover
                        data-align="start"
                        aria-hidden="true"
                      >
                        <div
                          role="menu"
                          id="site-nav-more-menu"
                          aria-labelledby="site-nav-more-trigger"
                        >
                          {overflowLinks.map((link) => (
                            <a
                              key={link.id}
                              href={link.url}
                              role="menuitem"
                              class={
                                link.isActive
                                  ? "site-header-menuitem-active"
                                  : undefined
                              }
                              {...(link.isExternal
                                ? {
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                  }
                                : {})}
                            >
                              {link.displayLabel}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </nav>
                )}
                <a
                  href={toPublicPath("/search", sitePathPrefix)}
                  class={`site-header-search ${currentPath === toPublicPath("/search", sitePathPrefix) ? "site-header-search-active" : ""}`}
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
              </div>
            </div>
          </div>
        </header>
      )}

      <main class="site-main">
        {sidebar ? (
          <div class="site-container site-container-sidebar">
            <aside class="sidebar-nav">{sidebar}</aside>
            <div class={contentClass}>{children}</div>
          </div>
        ) : (
          <div class="site-container">
            <div class={contentClass}>
              {isHomePage && (
                <div class="site-home-header">
                  {isAuthenticated && (
                    <ComposePrompt
                      composeOpenShortcutDiscovered={
                        composeOpenShortcutDiscovered
                      }
                    />
                  )}
                  <nav class="site-browse-nav">
                    {browseLinks.map((link, i) => (
                      <>
                        {i > 0 && (
                          <span class="site-browse-sep" aria-hidden="true">
                            /
                          </span>
                        )}
                        <a
                          key={link.href}
                          href={link.href}
                          class={`site-browse-link ${currentPath === link.href ? "site-browse-link-active" : ""}`}
                        >
                          {link.label}
                        </a>
                      </>
                    ))}
                  </nav>
                </div>
              )}
              {children}
            </div>
          </div>
        )}
      </main>

      {siteFooterHtml && (
        <footer class="site-footer" data-footer>
          <div class="site-container">
            <div
              class="prose"
              dangerouslySetInnerHTML={{ __html: siteFooterHtml }}
            />
          </div>
        </footer>
      )}
      {showHomeBranding && <HomePageBranding />}

      <jant-media-lightbox />
      <jant-text-preview />
      {isAuthenticated && <jant-post-menu />}
      {isAuthenticated && showComposeDialog && (
        <ComposeDialog
          collections={collections}
          uploadMaxFileSize={uploadMaxFileSize}
        />
      )}
    </div>
  );
};
