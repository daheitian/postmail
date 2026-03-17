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
    expect(config.timeZone).toBe("UTC");
    expect(config.showJantBrandingOnHome).toBe(false);
    expect(config.noindex).toBe(false);
    expect(config.demoMode).toBe(false);
    expect(config.pageSize).toBe(20);
    expect(config.rssFeedLimit).toBe(50);
  });

  it("DB settings override ENV and defaults", () => {
    const config = resolveConfig(
      makeEnv({ SITE_NAME: "FromEnv" } as Partial<Bindings>),
      { SITE_NAME: "FromDB" },
    );

    expect(config.siteName).toBe("FromDB");
  });

  it("ENV overrides defaults when DB is empty", () => {
    const config = resolveConfig(
      makeEnv({ SITE_NAME: "FromEnv" } as Partial<Bindings>),
      {},
    );

    expect(config.siteName).toBe("FromEnv");
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
      } as Partial<Bindings>),
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
        STORAGE_DRIVER: "s3",
      }),
      {},
    );

    expect(config.r2PublicUrl).toBe("https://r2.example.com");
    expect(config.imageTransformUrl).toBe("https://img.example.com");
    expect(config.s3PublicUrl).toBe("https://s3.example.com");
    expect(config.storageDriver).toBe("s3");
  });

  it("resolves siteAvatarUrl from storage key", () => {
    const config = resolveConfig(
      makeEnv({
        R2_PUBLIC_URL: "https://r2.example.com",
        STORAGE_DRIVER: "r2",
      }),
      { SITE_AVATAR: "media/2024/01/avatar.jpg" },
    );

    expect(config.siteAvatar).toBe("media/2024/01/avatar.jpg");
    expect(config.siteAvatarUrl).toBe(
      "https://r2.example.com/media/2024/01/avatar.jpg",
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
        DEMO_MODE: "true",
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
    // Valid numbers
    const config1 = resolveConfig(
      makeEnv({
        PAGE_SIZE: "10",
        RSS_FEED_LIMIT: "25",
      }),
      {},
    );
    expect(config1.pageSize).toBe(10);
    expect(config1.rssFeedLimit).toBe(25);

    // Invalid numbers fall back to defaults
    const config2 = resolveConfig(
      makeEnv({
        PAGE_SIZE: "not-a-number",
        RSS_FEED_LIMIT: "invalid",
      }),
      {},
    );
    expect(config2.pageSize).toBe(20);
    expect(config2.rssFeedLimit).toBe(50);
  });

  it("resolves fallbacks without DB values", () => {
    const config = resolveConfig(
      makeEnv({ SITE_NAME: "EnvName" } as Partial<Bindings>),
      { SITE_NAME: "DBName" },
    );

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
    const config = resolveConfig(
      makeEnv({ DEFAULT_THEME: "dark" } as Partial<Bindings>),
      {},
    );
    expect(config.defaultThemeId).toBe("dark");

    // Falls back to default
    const config2 = resolveConfig(makeEnv(), {});
    expect(config2.defaultThemeId).toBe("linen");
  });
});
