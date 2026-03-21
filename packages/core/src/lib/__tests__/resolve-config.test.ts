import { describe, it, expect } from "vitest";
import { resolveConfig } from "../resolve-config.js";
import type { Bindings } from "../../types/bindings.js";

function makeEnv(overrides: Partial<Bindings> = {}): Bindings {
  return {
    DB: {} as D1Database,
    R2: undefined as unknown as R2Bucket,
    AUTH_SECRET: "",
    SITE_URL: "https://example.com",
    R2_PUBLIC_URL: "",
    IMAGE_TRANSFORM_URL: "",
    S3_PUBLIC_URL: "",
    STORAGE_DRIVER: "",
    ...overrides,
  } as Bindings;
}

describe("resolveConfig", () => {
  it("uses defaults when no settings or env overrides", () => {
    const config = resolveConfig(makeEnv(), {});

    expect(config.siteName).toBe("Jant");
    expect(config.siteDescription).toBe(
      "Thoughts, links, and quotes — one post at a time",
    );
    expect(config.siteLanguage).toBe("en");
    expect(config.homeDefaultView).toBe("latest");
    expect(config.mainRssFeed).toBe("featured");
    expect(config.timeZone).toBe("UTC");
    expect(config.showJantBrandingOnHome).toBe(false);
    expect(config.noindex).toBe(false);
    expect(config.demoMode).toBe(false);
    expect(config.pageSize).toBe(50);
    expect(config.searchPageSize).toBe(50);
    expect(config.archivePageSize).toBe(50);
    expect(config.rssFeedLimit).toBe(50);
  });

  it("DB settings override ENV and defaults", () => {
    const config = resolveConfig(makeEnv({ SITE_NAME: "FromEnv" }), {
      SITE_NAME: "FromDB",
    });

    expect(config.siteName).toBe("FromDB");
  });

  it("ENV overrides defaults when DB is empty", () => {
    const config = resolveConfig(makeEnv({ SITE_NAME: "FromEnv" }), {});

    expect(config.siteName).toBe("FromEnv");
  });

  it("resolves mainRssFeed from DB, env, and defaults", () => {
    const defaultConfig = resolveConfig(makeEnv(), {});
    expect(defaultConfig.mainRssFeed).toBe("featured");

    const envConfig = resolveConfig(makeEnv({ MAIN_RSS_FEED: "latest" }), {});
    expect(envConfig.mainRssFeed).toBe("latest");

    const dbConfig = resolveConfig(makeEnv({ MAIN_RSS_FEED: "featured" }), {
      MAIN_RSS_FEED: "latest",
    });
    expect(dbConfig.mainRssFeed).toBe("latest");
  });

  it("normalizes legacy time zone values from the database", () => {
    const config = resolveConfig(makeEnv(), { TIME_ZONE: "Beijing" });

    expect(config.timeZone).toBe("Asia/Shanghai");
  });

  it("resolves siteDescriptionExplicit correctly", () => {
    // Default only -> not explicit
    const config1 = resolveConfig(makeEnv(), {});
    expect(config1.siteDescriptionExplicit).toBe(false);

    // DB setting -> explicit
    const config2 = resolveConfig(makeEnv(), {
      SITE_DESCRIPTION: "Custom description",
    });
    expect(config2.siteDescriptionExplicit).toBe(true);

    // ENV setting -> explicit
    const config3 = resolveConfig(
      makeEnv({
        SITE_DESCRIPTION: "Env description",
      }),
      {},
    );
    expect(config3.siteDescriptionExplicit).toBe(true);
  });

  it("resolves media URLs from env", () => {
    const config = resolveConfig(
      makeEnv({
        R2_PUBLIC_URL: "https://r2.example.com",
        IMAGE_TRANSFORM_URL: "https://img.example.com",
        S3_PUBLIC_URL: "https://s3.example.com",
        LOCAL_PUBLIC_URL: "https://media.example.com",
        STORAGE_DRIVER: "s3",
      }),
      {},
    );

    expect(config.r2PublicUrl).toBe("https://r2.example.com");
    expect(config.imageTransformUrl).toBe("https://img.example.com");
    expect(config.s3PublicUrl).toBe("https://s3.example.com");
    expect(config.localPublicUrl).toBe("https://media.example.com");
    expect(config.storageDriver).toBe("s3");
  });

  it("defaults to local storage in the Node runtime", () => {
    const config = resolveConfig(
      makeEnv({
        NODE_SQLITE: {} as Bindings["NODE_SQLITE"],
      }),
      {},
    );

    expect(config.storageDriver).toBe("local");
  });

  it("resolves siteAvatarUrl from storage key", () => {
    const config = resolveConfig(
      makeEnv({
        R2_PUBLIC_URL: "https://r2.example.com",
        STORAGE_DRIVER: "r2",
      }),
      { SITE_AVATAR: "media/avatar.jpg" },
    );

    expect(config.siteAvatar).toBe("media/avatar.jpg");
    expect(config.siteAvatarUrl).toBe(
      "https://r2.example.com/media/avatar.jpg",
    );
  });

  it("returns empty siteAvatarUrl when no avatar set", () => {
    const config = resolveConfig(makeEnv(), {});
    expect(config.siteAvatarUrl).toBe("");
  });

  it("resolves boolean fields correctly", () => {
    const config = resolveConfig(makeEnv(), {
      NOINDEX: "true",
      SHOW_HEADER_AVATAR: "true",
      SHOW_JANT_BRANDING_ON_HOME: "true",
    });

    expect(config.noindex).toBe(true);
    expect(config.showHeaderAvatar).toBe(true);
    expect(config.showJantBrandingOnHome).toBe(true);
  });

  it("forces noindex when DEMO_MODE is enabled", () => {
    const config = resolveConfig(
      makeEnv({
        DEMO_MODE: true,
      }),
      {},
    );

    expect(config.demoMode).toBe(true);
    expect(config.noindex).toBe(true);
  });

  it("resolves authConfigured from AUTH_SECRET", () => {
    const noAuth = resolveConfig(makeEnv(), {});
    expect(noAuth.authConfigured).toBe(false);

    const withAuth = resolveConfig(makeEnv({ AUTH_SECRET: "supersecret" }), {});
    expect(withAuth.authConfigured).toBe(true);
  });

  it("parses numeric fields with fallbacks", () => {
    const config1 = resolveConfig(
      makeEnv({
        PAGE_SIZE: 10,
        SEARCH_PAGE_SIZE: 7,
        ARCHIVE_PAGE_SIZE: "9",
        RSS_FEED_LIMIT: 25,
      }),
      {},
    );
    expect(config1.pageSize).toBe(10);
    expect(config1.searchPageSize).toBe(7);
    expect(config1.archivePageSize).toBe(9);
    expect(config1.rssFeedLimit).toBe(25);

    const config2 = resolveConfig(
      makeEnv({
        PAGE_SIZE: "not-a-number",
        SEARCH_PAGE_SIZE: 0,
        ARCHIVE_PAGE_SIZE: false,
        RSS_FEED_LIMIT: "invalid",
      }),
      {},
    );
    expect(config2.pageSize).toBe(50);
    expect(config2.searchPageSize).toBe(50);
    expect(config2.archivePageSize).toBe(50);
    expect(config2.rssFeedLimit).toBe(50);
  });

  it("resolves fallbacks without DB values", () => {
    const config = resolveConfig(makeEnv({ SITE_NAME: "EnvName" }), {
      SITE_NAME: "DBName",
    });

    // fallback should use ENV > Default, skipping DB
    expect(config.fallbacks.siteName).toBe("EnvName");
  });

  it("resolves theme fields from DB settings", () => {
    const config = resolveConfig(makeEnv(), {
      THEME: "blue",
      FONT_THEME: "serif",
      THEME_MODE: "dark",
      CUSTOM_CSS: "body { color: red; }",
    });

    expect(config.themeId).toBe("blue");
    expect(config.fontThemeId).toBe("serif");
    expect(config.themeMode).toBe("dark");
    expect(config.customCSS).toBe("body { color: red; }");
  });

  it("falls back to auto when THEME_MODE is missing or invalid", () => {
    const config1 = resolveConfig(makeEnv(), {});
    expect(config1.themeMode).toBe("auto");

    const config2 = resolveConfig(makeEnv(), { THEME_MODE: "sunset" });
    expect(config2.themeMode).toBe("auto");
  });

  it("resolves headerNavMaxVisible with default, DB override, and clamping", () => {
    // Default is 2
    const config1 = resolveConfig(makeEnv(), {});
    expect(config1.headerNavMaxVisible).toBe(2);

    // DB override works
    const config2 = resolveConfig(makeEnv(), { HEADER_NAV_MAX_VISIBLE: "5" });
    expect(config2.headerNavMaxVisible).toBe(5);

    // Clamped to 0 minimum
    const config3 = resolveConfig(makeEnv(), { HEADER_NAV_MAX_VISIBLE: "-1" });
    expect(config3.headerNavMaxVisible).toBe(0);

    // Clamped to 5 maximum
    const config4 = resolveConfig(makeEnv(), { HEADER_NAV_MAX_VISIBLE: "10" });
    expect(config4.headerNavMaxVisible).toBe(5);

    // Zero is valid
    const config5 = resolveConfig(makeEnv(), { HEADER_NAV_MAX_VISIBLE: "0" });
    expect(config5.headerNavMaxVisible).toBe(0);
  });

  it("resolves defaultThemeId from env", () => {
    const config = resolveConfig(makeEnv({ DEFAULT_THEME: "dark" }), {});
    expect(config.defaultThemeId).toBe("dark");

    // Falls back to default
    const config2 = resolveConfig(makeEnv(), {});
    expect(config2.defaultThemeId).toBe("linen");
  });

  it("uses unprefixed env names across the config surface", () => {
    const config = resolveConfig(
      makeEnv({
        SITE_URL: "https://legacy.example.com",
        AUTH_SECRET: "legacy-secret",
        STORAGE_DRIVER: "s3",
        S3_PUBLIC_URL: "https://legacy-s3.example.com",
      }),
      {},
    );

    expect(config.siteUrl).toBe("https://legacy.example.com/");
    expect(config.authConfigured).toBe(true);
    expect(config.storageDriver).toBe("s3");
    expect(config.s3PublicUrl).toBe("https://legacy-s3.example.com");
  });
});
