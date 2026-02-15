/**
 * Threads Theme - Site Layout
 *
 * Left icon sidebar (76px) on desktop, bottom tab bar (60px) on mobile.
 * Gray page background (#fafafa) with white rounded content container.
 * All dimensions match threads.com's --barcelona-* design tokens.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { NavLinkView, SiteLayoutProps } from "@jant/core";

/** Map known URL paths to SVG icons. Size 26x26 matching Threads' nav icons. */
function NavIcon({ url, isActive }: { url: string; isActive: boolean }) {
  const stroke = "currentColor";
  const sw = isActive ? "2.25" : "1.75";
  const cls = "size-[26px]";

  // Home
  if (url === "/") {
    return (
      <svg
        class={cls}
        fill="none"
        viewBox="0 0 24 24"
        stroke-width={sw}
        stroke={stroke}
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    );
  }

  // Search
  if (url === "/search") {
    return (
      <svg
        class={cls}
        fill="none"
        viewBox="0 0 24 24"
        stroke-width={sw}
        stroke={stroke}
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
    );
  }

  // Archive
  if (url === "/archive") {
    return (
      <svg
        class={cls}
        fill="none"
        viewBox="0 0 24 24"
        stroke-width={sw}
        stroke={stroke}
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
        />
      </svg>
    );
  }

  // RSS — common for /feed, /rss, /atom
  if (url.match(/\/(feed|rss|atom)/)) {
    return (
      <svg
        class={cls}
        fill="none"
        viewBox="0 0 24 24"
        stroke-width={sw}
        stroke={stroke}
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M4.5 19.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
        />
      </svg>
    );
  }

  // External link
  if (url.startsWith("http")) {
    return (
      <svg
        class={cls}
        fill="none"
        viewBox="0 0 24 24"
        stroke-width={sw}
        stroke={stroke}
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
        />
      </svg>
    );
  }

  // Default: generic page icon
  return (
    <svg
      class={cls}
      fill="none"
      viewBox="0 0 24 24"
      stroke-width={sw}
      stroke={stroke}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function SidebarLink({ link }: { link: NavLinkView }) {
  return (
    <a
      href={link.url}
      class={`threads-sidebar-link ${link.isActive ? "threads-sidebar-link-active" : ""}`}
      title={link.label}
      {...(link.isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      <NavIcon url={link.url} isActive={link.isActive} />
    </a>
  );
}

function MobileTabLink({ link }: { link: NavLinkView }) {
  return (
    <a
      href={link.url}
      class={`threads-mobile-tab ${link.isActive ? "threads-mobile-tab-active" : ""}`}
      {...(link.isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      <NavIcon url={link.url} isActive={link.isActive} />
    </a>
  );
}

export const ThreadsSiteLayout: FC<PropsWithChildren<SiteLayoutProps>> = ({
  siteName,
  links,
  children,
}) => {
  return (
    <div class="threads-page">
      {/* Desktop: left icon sidebar — no border, on gray background */}
      <aside class="threads-sidebar">
        <a href="/" class="threads-logo" title={siteName}>
          <span class="text-2xl font-black leading-none">@</span>
        </a>
        <nav class="flex flex-1 flex-col items-center gap-1">
          {links.map((link) => (
            <SidebarLink key={link.id} link={link} />
          ))}
        </nav>
      </aside>

      {/* Main content — white rounded container on gray background */}
      <main class="threads-main">
        <div class="threads-container">
          <div class="threads-content">{children}</div>
        </div>
      </main>

      {/* Mobile: bottom tab bar */}
      <nav class="threads-mobile-tabs">
        {links.map((link) => (
          <MobileTabLink key={link.id} link={link} />
        ))}
      </nav>
    </div>
  );
};
