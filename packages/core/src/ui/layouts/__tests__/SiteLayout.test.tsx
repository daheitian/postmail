import type { Context } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n/context.js";
import { createI18n } from "../../../i18n/i18n.js";
import { SiteLayout } from "../SiteLayout.js";

function renderSiteLayout(
  props: Partial<Parameters<typeof SiteLayout>[0]> = {},
): string {
  const i18n = createI18n("en");
  const c = {
    get(key: string) {
      if (key === "i18n") return i18n;
      return undefined;
    },
  } as unknown as Context;

  I18nProvider({ c, children: "" });

  return renderToString(
    SiteLayout({
      siteName: "Jant",
      links: [],
      currentPath: "/",
      children: "Feed",
      ...props,
    }),
  );
}

describe("SiteLayout", () => {
  it("renders the mobile compose FAB for authenticated timeline pages", () => {
    const html = renderSiteLayout({
      currentPath: "/latest",
      isAuthenticated: true,
    });

    expect(html).toContain('class="site-mobile-compose-fab"');
    expect(html).toContain('aria-label="New post"');
    expect(html).toContain("openNew()");
  });

  it("does not render the mobile compose FAB for collection pages", () => {
    const html = renderSiteLayout({
      currentPath: "/collections/writing",
      isAuthenticated: true,
      children: "Collection",
    });

    expect(html).not.toContain('class="site-mobile-compose-fab"');
  });

  it("does not render the mobile compose FAB for signed-out readers", () => {
    const html = renderSiteLayout({
      currentPath: "/featured",
      isAuthenticated: false,
      children: "Feed",
    });

    expect(html).not.toContain('class="site-mobile-compose-fab"');
  });
});
