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

const ExternalLinkIcon = () => (
  <svg
    class="site-header-link-external"
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);

function SearchIcon({ class: className = "" }: { class?: string }) {
  return (
    <svg
      class={className}
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

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
      {link.isExternal && <ExternalLinkIcon />}
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
  const linksWithLabels = links.map((link) => ({
    ...link,
    displayLabel: getNavItemDisplayLabel(link, i18n, sitePathPrefix),
  }));

  const searchLabel = i18n._(
    msg({
      message: "Search",
      comment: "@context: Search icon link in browse nav",
    }),
  );
  const searchHref = toPublicPath("/search", sitePathPrefix);

  const moreLabel = i18n._(
    msg({
      message: "More",
      comment: "@context: More navigation links dropdown button",
    }),
  );

  // Split custom links by placement
  const headerLinks = linksWithLabels.filter(
    (l) => l.placement === "header" || !l.placement,
  );
  const moreLinks = linksWithLabels.filter((l) => l.placement === "more");

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
              <nav class="site-header-nav" aria-label="Primary">
                {headerLinks.map((link) => (
                  <HeaderLink
                    key={link.id}
                    link={link}
                    label={link.displayLabel}
                  />
                ))}
                {moreLinks.length > 0 && (
                  <div class="site-header-more">
                    <button
                      type="button"
                      class="site-header-more-btn"
                      id="site-nav-more-trigger"
                      aria-haspopup="menu"
                      aria-expanded="false"
                    >
                      {moreLabel}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <div
                      id="site-nav-more-popover"
                      class="site-header-more-popover"
                      data-popover
                      data-align="start"
                      aria-hidden="true"
                    >
                      {moreLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          class={`site-header-more-link ${link.isActive ? "site-header-more-link-active" : ""}`}
                          {...(link.isExternal
                            ? {
                                target: "_blank",
                                rel: "noopener noreferrer",
                              }
                            : {})}
                        >
                          {link.displayLabel}
                          {link.isExternal && <ExternalLinkIcon />}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </nav>

              {/* Search */}
              <div class="site-header-search-slot">
                <form
                  class="site-header-search-form"
                  action={searchHref}
                  method="get"
                >
                  <SearchIcon class="site-header-search-icon" />
                  <input
                    type="search"
                    name="q"
                    class="site-header-search-input"
                    placeholder={searchLabel}
                    aria-label={searchLabel}
                    enterkeyhint="search"
                  />
                </form>
                <a
                  href={searchHref}
                  class="site-header-search-link"
                  aria-label={searchLabel}
                  title={searchLabel}
                >
                  <SearchIcon class="site-header-search-link-icon" />
                </a>
              </div>

              <div class="site-header-right">
                {/* Mobile hamburger */}
                <button
                  type="button"
                  class="site-header-hamburger"
                  aria-controls="site-nav-drawer"
                  aria-expanded="false"
                  aria-label={i18n._(
                    msg({
                      message: "Menu",
                      comment: "@context: Hamburger menu button label",
                    }),
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Mobile navigation drawer */}
      <div class="site-nav-drawer-backdrop" aria-hidden="true" />
      <div
        id="site-nav-drawer"
        class="site-nav-drawer"
        aria-hidden="true"
        inert
      >
        <div class="site-nav-drawer-header">
          <a
            href={toPublicPath("/", sitePathPrefix)}
            class="site-nav-drawer-brand"
          >
            {showHeaderAvatar && siteAvatarUrl && (
              <img
                src={siteAvatarUrl}
                class="site-nav-drawer-brand-avatar"
                alt=""
              />
            )}
            {siteName}
          </a>
          <button
            type="button"
            class="site-nav-drawer-close"
            aria-label={i18n._(
              msg({
                message: "Close menu",
                comment: "@context: Close drawer button label",
              }),
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <form
          class="site-nav-drawer-search"
          action={toPublicPath("/search", sitePathPrefix)}
          method="get"
        >
          <SearchIcon class="site-nav-drawer-search-icon" />
          <input
            type="search"
            name="q"
            class="site-nav-drawer-search-input"
            placeholder={searchLabel}
            aria-label={searchLabel}
            enterkeyhint="search"
          />
        </form>
        <nav class="site-nav-drawer-nav" aria-label="Primary">
          {headerLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              class={`site-nav-drawer-link ${link.isActive ? "site-nav-drawer-link-active" : ""}`}
              {...(link.isExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.displayLabel}
              {link.isExternal && <ExternalLinkIcon />}
            </a>
          ))}
          {moreLinks.length > 0 && (
            <>
              <div class="site-nav-drawer-divider" />
              <span class="site-nav-drawer-section-label">{moreLabel}</span>
              {moreLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  class={`site-nav-drawer-link site-nav-drawer-link-secondary ${link.isActive ? "site-nav-drawer-link-active" : ""}`}
                  {...(link.isExternal
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.displayLabel}
                  {link.isExternal && <ExternalLinkIcon />}
                </a>
              ))}
            </>
          )}
        </nav>
      </div>

      <main class="site-main">
        {sidebar ? (
          <div class="site-container site-container-sidebar">
            <aside class="sidebar-nav">{sidebar}</aside>
            <div class={contentClass}>{children}</div>
          </div>
        ) : (
          <div class="site-container">
            <div class={contentClass}>
              {isHomePage && isAuthenticated && (
                <div class="site-home-header">
                  <ComposePrompt
                    composeOpenShortcutDiscovered={
                      composeOpenShortcutDiscovered
                    }
                  />
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
