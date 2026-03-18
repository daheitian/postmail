import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("__JANT_DEV__", false);
vi.stubGlobal("__JANT_VERSION__", "test-version");

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
});
