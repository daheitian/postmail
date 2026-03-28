import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({
    t: ({
      message,
    }: {
      message: string;
      comment?: string;
      values?: Record<string, unknown>;
    }) => message,
  }),
}));

async function loadGeneralContent() {
  const { GeneralContent } = await import("../GeneralContent.js");
  return GeneralContent;
}

function createProps(demoMode: boolean) {
  return {
    siteName: "My Blog",
    siteDescription: "A test blog",
    siteLanguage: "en",
    siteNameFallback: "Fallback Name",
    siteDescriptionFallback: "Fallback Description",
    mainRssFeed: "featured" as const,
    mainFeedUrl: "/feed",
    latestFeedUrl: "/feed/latest",
    featuredFeedUrl: "/feed/featured",
    timeZone: "UTC",
    siteFooter: "Footer text",
    showJantBrandingOnHome: false,
    noindex: false,
    demoMode,
    timezones: [
      {
        value: "UTC",
        label: "(UTC) UTC",
        offset: "+00:00",
        iana: ["UTC"],
      },
    ],
  };
}

describe("GeneralContent", () => {
  it("omits the demo-mode attribute when demo mode is disabled", async () => {
    const GeneralContent = await loadGeneralContent();
    const html = renderToString(GeneralContent(createProps(false)));

    expect(html).not.toContain("demo-mode");
  });

  it("renders the demo-mode attribute when demo mode is enabled", async () => {
    const GeneralContent = await loadGeneralContent();
    const html = renderToString(GeneralContent(createProps(true)));

    expect(html).toMatch(/<jant-settings-general[^>]*demo-mode(?:=|\s|>)/);
  });
});
