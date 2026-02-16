/**
 * Threads Theme - Site Layout
 *
 * Top header with site name + horizontal text nav on all screen sizes.
 * Gray page background with white rounded content container.
 * Dimensions derived from threads.com's --barcelona-* design tokens.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { NavItemView, SiteLayoutProps } from "../../types.js";
import { ComposeDialog } from "./components/ComposeDialog.js";
import { ComposePrompt } from "./components/ComposePrompt.js";

function HeaderLink({ link }: { link: NavItemView }) {
  return (
    <a
      href={link.url}
      class={`threads-header-link ${link.isActive ? "threads-header-link-active" : ""}`}
      {...(link.isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {link.label}
    </a>
  );
}

export const ThreadsSiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  links,
  isAuthenticated,
  collections,
  children,
}) => {
  return (
    <div class="threads-page">
      {/* Top header: site name left, text nav right */}
      <header class="threads-header">
        <div class="threads-header-inner">
          <a href="/" class="threads-logo">
            {siteName}
          </a>
          <nav class="threads-header-nav">
            {links.map((link) => (
              <HeaderLink key={link.id} link={link} />
            ))}
          </nav>
        </div>
      </header>

      {/* Main content — white rounded container on gray background */}
      <main class="threads-main">
        <div class="threads-container">
          <div class="threads-content">
            {isAuthenticated && <ComposePrompt />}
            {children}
          </div>
        </div>
      </main>

      {/* Compose dialog for authenticated users */}
      {isAuthenticated && <ComposeDialog collections={collections} />}
    </div>
  );
};
