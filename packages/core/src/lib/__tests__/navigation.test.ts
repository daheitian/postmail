import type { Context } from "hono";
import { describe, expect, it } from "vitest";
import { getNavigationData } from "../navigation.js";

describe("getNavigationData", () => {
  it("renders site footer markdown through the shared pipeline", async () => {
    const context = {
      var: {
        publicPath: "/",
        appConfig: {
          siteName: "Jant",
          sitePathPrefix: "",
          siteDescription: "Footer test",
          siteDescriptionExplicit: true,
          homeDefaultView: "latest",
          headerNavMaxVisible: 4,
          siteAvatarUrl: "",
          showHeaderAvatar: false,
          siteFooter:
            "Read the [docs](https://example.com)[^1]\n\n[^1]: Footer **note**\n\n<script>alert(1)</script>",
        },
        services: {
          navItems: {
            list: async () => [],
          },
          collections: {
            listByRecentActivity: async () => [],
          },
        },
        auth: {
          api: {
            getSession: async () => null,
          },
        },
      },
      req: {
        raw: {
          headers: new Headers(),
        },
      },
    } as unknown as Context;

    const result = await getNavigationData(context);

    expect(result.isAuthenticated).toBe(false);
    expect(result.collections).toEqual([]);
    expect(result.siteFooterHtml).toContain(
      '<sup class="footnote-ref" data-footnote-reference>',
    );
    expect(result.siteFooterHtml).toContain(
      '<section class="footnotes" data-footnotes>',
    );
    expect(result.siteFooterHtml).toContain("<strong>note</strong>");
    expect(result.siteFooterHtml).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });
});
