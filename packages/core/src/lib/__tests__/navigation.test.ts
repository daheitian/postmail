import type { Context } from "hono";
import { describe, expect, it } from "vitest";
import {
  getHomeDefaultViewFromNavItems,
  getNavigationData,
} from "../navigation.js";

describe("getHomeDefaultViewFromNavItems", () => {
  it("falls back to latest when both built-in feed links are disabled", () => {
    expect(
      getHomeDefaultViewFromNavItems([
        { type: "system", systemKey: "archive" },
        { type: "link", systemKey: undefined },
      ]),
    ).toBe("latest");
  });

  it("uses whichever feed link appears first", () => {
    expect(
      getHomeDefaultViewFromNavItems([
        { type: "system", systemKey: "featured" },
        { type: "system", systemKey: "latest" },
      ]),
    ).toBe("featured");

    expect(
      getHomeDefaultViewFromNavItems([
        { type: "system", systemKey: "latest" },
        { type: "system", systemKey: "featured" },
      ]),
    ).toBe("latest");
  });
});

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
    expect(result.siteFooterHtml).toContain('<label for="sn-');
    expect(result.siteFooterHtml).toContain('<span class="sidenote">');
    expect(result.siteFooterHtml).toContain("<strong>note</strong>");
    expect(result.siteFooterHtml).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("derives the home default view from nav item order", async () => {
    const context = {
      var: {
        publicPath: "/",
        appConfig: {
          siteName: "Jant",
          sitePathPrefix: "",
          siteDescription: "",
          siteDescriptionExplicit: false,
          homeDefaultView: "latest",
          siteAvatarUrl: "",
          showHeaderAvatar: false,
          siteFooter: "",
        },
        services: {
          navItems: {
            list: async () => [
              {
                id: "nav_1",
                type: "system",
                systemKey: "featured",
                label: "Featured",
                url: "/featured",
                placement: "header",
                position: "a0",
                createdAt: 1,
                updatedAt: 1,
              },
              {
                id: "nav_2",
                type: "system",
                systemKey: "latest",
                label: "Latest",
                url: "/latest",
                placement: "header",
                position: "a1",
                createdAt: 1,
                updatedAt: 1,
              },
            ],
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

    expect(result.homeDefaultView).toBe("featured");
    expect(result.links[0]?.url).toBe("/");
    expect(result.links[1]?.url).toBe("/latest");
  });
});
