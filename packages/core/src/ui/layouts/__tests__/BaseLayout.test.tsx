import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("__JANT_DEV__", false);
vi.stubGlobal("__JANT_VERSION__", "test-version");
vi.stubGlobal("__CLIENT_JS_FILE__", "/_assets/client.js");
vi.stubGlobal("__CLIENT_AUTH_JS_FILE__", "/_assets/client-auth.js");

function createContext(
  mainRssFeed: "featured" | "latest",
  overrides?: {
    assetBasePath?: string;
    sitePathPrefix?: string;
    siteUrl?: string;
    themeMode?: "auto" | "light" | "dark";
    themeId?: string;
    defaultThemeId?: string;
  },
) {
  const values = {
    appConfig: {
      mainRssFeed,
      sitePathPrefix: overrides?.sitePathPrefix ?? "",
      siteUrl: overrides?.siteUrl ?? "https://example.com",
      siteLanguage: "en",
      noindex: false,
      customCSS: "",
      themeMode: overrides?.themeMode ?? "auto",
      themeId: overrides?.themeId ?? "",
      defaultThemeId: overrides?.defaultThemeId ?? "linen",
      assetBasePath: overrides?.assetBasePath ?? "/_assets",
    },
    lang: "en",
    i18n: {
      _: (descriptor: { message?: string }) => descriptor.message ?? "",
    },
    publicRequestUrl: "https://example.com",
  } as const;

  return {
    get(key: keyof typeof values) {
      return values[key];
    },
  } as never;
}

async function loadBaseLayout() {
  const [{ CORE_VERSION }, { BaseLayout }] = await Promise.all([
    import("../../../lib/version.js"),
    import("../BaseLayout.js"),
  ]);

  return { CORE_VERSION, BaseLayout };
}

describe("BaseLayout", () => {
  it("always renders favicon and apple-touch links", async () => {
    const { CORE_VERSION, BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        children: "Test",
      }),
    );

    expect(html).toContain(`/favicon.ico?v=${CORE_VERSION}`);
    expect(html).toContain(`/apple-touch-icon.png?v=${CORE_VERSION}`);
    expect(html).not.toContain('sizes="180x180"');
  });

  it("uses explicit favicon and apple-touch asset hrefs when provided", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        faviconHref: "/_/brand/assets/jant-favicon.ico",
        appleTouchHref: "/_/brand/assets/jant-apple-touch-icon.png",
        children: "Test",
      }),
    );

    expect(html).toContain("/_/brand/assets/jant-favicon.ico");
    expect(html).toContain("/_/brand/assets/jant-apple-touch-icon.png");
  });

  it("falls back to the bundled social image when no avatar is provided", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        description: "Quiet writing.",
        children: "Test",
      }),
    );

    expect(html).toContain(
      'meta property="og:image" content="/_/brand/assets/jant-social-preview.png"',
    );
    expect(html).toContain(
      'meta name="twitter:image" content="/_/brand/assets/jant-social-preview.png"',
    );
  });

  it("uses an explicit social image when provided", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        socialImageUrl: "https://cdn.example.com/jant-card.png",
        children: "Test",
      }),
    );

    expect(html).toContain(
      'meta property="og:image" content="https://cdn.example.com/jant-card.png"',
    );
    expect(html).toContain(
      'meta name="twitter:image" content="https://cdn.example.com/jant-card.png"',
    );
  });

  it("exposes the main and alternate feed links without duplicating featured", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        c: createContext("featured"),
        children: "Test",
      }),
    );

    expect(
      html.match(/rel="alternate" type="application\/rss\+xml"/g) ?? [],
    ).toHaveLength(2);
    expect(html).toContain('href="/feed"');
    expect(html).toContain('href="/feed/latest"');
    expect(html).not.toContain('href="/feed/featured"');
  });

  it("switches the alternate feed link when latest is the main feed", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        c: createContext("latest"),
        children: "Test",
      }),
    );

    expect(
      html.match(/rel="alternate" type="application\/rss\+xml"/g) ?? [],
    ).toHaveLength(2);
    expect(html).toContain('href="/feed"');
    expect(html).toContain('href="/feed/featured"');
    expect(html).not.toContain('href="/feed/latest"');
  });

  it("uses the public asset base path from appConfig in production", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        c: createContext("featured", {
          sitePathPrefix: "/blog",
          siteUrl: "https://example.com/blog",
          assetBasePath: "/blog/_assets",
        }),
        children: "Test",
      }),
    );

    expect(html).toContain(`src="/blog/_assets/client.js"`);
    expect(html).toContain(`href="/blog/_assets/client.css"`);
    expect(html).toContain('data-asset-base-path="/blog/_assets"');
  });

  it("renders theme-color tags that follow the active theme in auto mode", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        c: createContext("featured", {
          defaultThemeId: "linen",
          themeMode: "auto",
        }),
        children: "Test",
      }),
    );

    expect(html).toContain('meta name="theme-color" content="#faf7ec"');
    expect(html).toContain('media="(prefers-color-scheme: light)"');
    expect(html).toContain(
      'meta name="theme-color" content="#121211" media="(prefers-color-scheme: dark)"',
    );
  });

  it("pins theme-color to the forced theme mode", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        c: createContext("featured", {
          defaultThemeId: "linen",
          themeMode: "dark",
        }),
        children: "Test",
      }),
    );

    expect(html).toContain('meta name="theme-color" content="#121211"');
    expect(html).not.toContain('media="(prefers-color-scheme: light)"');
    expect(html).not.toContain('media="(prefers-color-scheme: dark)"');
  });

  it("includes critical CSS for the medium and small header layouts", async () => {
    const { BaseLayout } = await loadBaseLayout();
    const html = renderToString(
      BaseLayout({
        title: "Jant",
        c: createContext("featured"),
        children: "Test",
      }),
    );

    expect(html).toContain(".site-header-search-link");
    expect(html).toContain("@media(max-width:1200px)");
    expect(html).toContain(".site-header-search-form{display:none!important}");
    expect(html).toContain("@media(max-width:860px)");
    expect(html).toContain(".site-header-link-overflow");
    expect(html).toContain(
      "@media(max-width:480px){.site-header-nav,.site-header-more{display:none!important}.site-header-search-slot{display:flex!important}",
    );
  });
});
