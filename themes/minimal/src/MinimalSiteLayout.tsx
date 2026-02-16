/**
 * Minimal Theme - Site Layout
 *
 * Header-based layout with site name, horizontal navigation links,
 * optional markdown site description, and centered content column.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { SiteLayoutProps } from "@jant/core";
import { markdown } from "@jant/core";

export const MinimalSiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  siteDescription,
  links,
  children,
}) => {
  const descriptionHtml = siteDescription
    ? markdown.render(siteDescription)
    : "";

  return (
    <div class="minimal-page">
      <main class="minimal-main">
        <div class="minimal-container">
          {/* Header: site name + nav links + optional description */}
          <header class="minimal-header">
            <a href="/" class="minimal-site-name">
              {siteName}
            </a>
            {links.length > 0 && (
              <nav class="minimal-nav">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    class={`minimal-nav-link ${link.isActive ? "minimal-nav-link-active" : ""}`}
                    {...(link.isExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
            {descriptionHtml && (
              <div
                class="minimal-description prose prose-sm"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}
            <hr class="minimal-header-divider" />
          </header>

          {/* Page content */}
          <div class="minimal-content">{children}</div>
        </div>
      </main>
    </div>
  );
};
