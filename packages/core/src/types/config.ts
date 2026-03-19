/**
 * Configuration System
 *
 * Single Source of Truth for all configuration fields.
 */

/**
 * Configuration Registry - Single Source of Truth
 *
 * All available configuration fields with their metadata.
 * Add new fields here, and they'll automatically work everywhere.
 *
 * Priority logic:
 * - envOnly: false -> User-configurable (DB > ENV > Default)
 * - envOnly: true -> Environment-only (ENV > Default)
 */
interface ConfigField {
  defaultValue: string;
  envOnly: boolean;
  internal?: boolean;
  /**
   * Environment variable names in resolution order.
   *
   * The first entry is the canonical name. Additional entries are legacy
   * fallbacks kept to support the current Cloudflare-first codebase while the
   * Node runtime work lands incrementally.
   */
  envKeys?: readonly string[];
}

export const CONFIG_FIELDS = {
  // User-configurable (can be modified in settings)
  SITE_NAME: {
    defaultValue: "Jant",
    envOnly: false,
    envKeys: ["JANT_SITE_NAME", "SITE_NAME"],
  },
  SITE_DESCRIPTION: {
    defaultValue: "Thoughts, links, and quotes — one post at a time",
    envOnly: false,
    envKeys: ["JANT_SITE_DESCRIPTION", "SITE_DESCRIPTION"],
  },
  SITE_LANGUAGE: {
    defaultValue: "en",
    envOnly: false,
    envKeys: ["JANT_SITE_LANGUAGE", "SITE_LANGUAGE"],
  },
  HOME_DEFAULT_VIEW: {
    defaultValue: "latest",
    envOnly: false,
    envKeys: ["JANT_HOME_DEFAULT_VIEW", "HOME_DEFAULT_VIEW"],
  },
  MAIN_RSS_FEED: {
    defaultValue: "featured",
    envOnly: false,
    envKeys: ["JANT_MAIN_RSS_FEED", "MAIN_RSS_FEED"],
  },
  HEADER_NAV_MAX_VISIBLE: {
    defaultValue: "2",
    envOnly: false,
    envKeys: ["JANT_HEADER_NAV_MAX_VISIBLE", "HEADER_NAV_MAX_VISIBLE"],
  },

  // Environment-only (deployment/infrastructure config)
  DEFAULT_THEME: {
    defaultValue: "linen",
    envOnly: true,
    envKeys: ["JANT_DEFAULT_THEME", "DEFAULT_THEME"],
  },
  SITE_URL: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_SITE_URL", "SITE_URL"],
  },
  AUTH_SECRET: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_AUTH_SECRET", "AUTH_SECRET"],
  },
  R2_PUBLIC_URL: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_R2_PUBLIC_URL", "R2_PUBLIC_URL"],
  },
  IMAGE_TRANSFORM_URL: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_IMAGE_TRANSFORM_URL", "IMAGE_TRANSFORM_URL"],
  },
  DEMO_EMAIL: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_DEMO_EMAIL", "DEMO_EMAIL"],
  },
  DEMO_PASSWORD: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_DEMO_PASSWORD", "DEMO_PASSWORD"],
  },
  DEMO_MODE: {
    defaultValue: "false",
    envOnly: true,
    envKeys: ["JANT_DEMO_MODE", "DEMO_MODE"],
  },
  PAGE_SIZE: {
    defaultValue: "20",
    envOnly: true,
    envKeys: ["JANT_PAGE_SIZE", "PAGE_SIZE"],
  },
  STORAGE_DRIVER: {
    defaultValue: "r2",
    envOnly: true,
    envKeys: ["JANT_STORAGE_DRIVER", "STORAGE_DRIVER"],
  },
  S3_ENDPOINT: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_S3_ENDPOINT", "S3_ENDPOINT"],
  },
  S3_BUCKET: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_S3_BUCKET", "S3_BUCKET"],
  },
  S3_ACCESS_KEY_ID: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_S3_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID"],
  },
  S3_SECRET_ACCESS_KEY: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_S3_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"],
  },
  S3_REGION: {
    defaultValue: "auto",
    envOnly: true,
    envKeys: ["JANT_S3_REGION", "S3_REGION"],
  },
  S3_PUBLIC_URL: {
    defaultValue: "",
    envOnly: true,
    envKeys: ["JANT_S3_PUBLIC_URL", "S3_PUBLIC_URL"],
  },
  UPLOAD_MAX_FILE_SIZE_MB: {
    defaultValue: "500",
    envOnly: true,
    envKeys: ["JANT_UPLOAD_MAX_FILE_SIZE_MB", "UPLOAD_MAX_FILE_SIZE_MB"],
  },
  SUMMARY_MAX_PARAGRAPHS: {
    defaultValue: "5",
    envOnly: true,
    envKeys: ["JANT_SUMMARY_MAX_PARAGRAPHS", "SUMMARY_MAX_PARAGRAPHS"],
  },
  SUMMARY_MAX_CHARS: {
    defaultValue: "500",
    envOnly: true,
    envKeys: ["JANT_SUMMARY_MAX_CHARS", "SUMMARY_MAX_CHARS"],
  },
  SLUG_ID_LENGTH: {
    defaultValue: "5",
    envOnly: true,
    envKeys: ["JANT_SLUG_ID_LENGTH", "SLUG_ID_LENGTH"],
  },
  RSS_FEED_LIMIT: {
    defaultValue: "50",
    envOnly: true,
    envKeys: ["JANT_RSS_FEED_LIMIT", "RSS_FEED_LIMIT"],
  },

  // Internal settings (DB-only, not configurable via env or settings UI)
  THEME: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  CUSTOM_CSS: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  SITE_AVATAR: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  SHOW_HEADER_AVATAR: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  SITE_FAVICON_ICO: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  SITE_FAVICON_APPLE_TOUCH: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  SITE_FAVICON_VERSION: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  FONT_THEME: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  THEME_MODE: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  TIME_ZONE: {
    defaultValue: "UTC",
    envOnly: false,
    envKeys: ["JANT_TIME_ZONE", "TIME_ZONE"],
  },
  SITE_FOOTER: {
    defaultValue: "",
    envOnly: false,
    envKeys: ["JANT_SITE_FOOTER", "SITE_FOOTER"],
  },
  SHOW_JANT_BRANDING_ON_HOME: {
    defaultValue: "",
    envOnly: false,
    envKeys: ["JANT_SHOW_JANT_BRANDING_ON_HOME", "SHOW_JANT_BRANDING_ON_HOME"],
  },
  NOINDEX: {
    defaultValue: "",
    envOnly: false,
    envKeys: ["JANT_NOINDEX", "NOINDEX"],
  },
  ONBOARDING_STATUS: {
    defaultValue: "pending",
    envOnly: false,
    internal: true,
  },
  PASSWORD_RESET_TOKEN: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
  DELETE_CSRF_TOKEN: {
    defaultValue: "",
    envOnly: false,
    internal: true,
  },
} as const satisfies Record<string, ConfigField>;

export type ConfigKey = keyof typeof CONFIG_FIELDS;
export const THEME_MODES = ["auto", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * Unified application configuration
 *
 * Resolved once per request from DB settings + env + defaults.
 * Access via `c.var.appConfig` in routes and lib functions.
 */
export interface AppConfig {
  // Site identity (DB > ENV > Default)
  siteName: string;
  siteDescription: string;
  /** true only when description is set in DB or ENV (not just the default) */
  siteDescriptionExplicit: boolean;
  siteLanguage: string;
  homeDefaultView: string;
  mainRssFeed: string;
  headerNavMaxVisible: number;
  timeZone: string;
  siteFooter: string;
  showJantBrandingOnHome: boolean;
  noindex: boolean;

  // Infrastructure (ENV only)
  siteUrl: string;
  siteOrigin: string;
  sitePathPrefix: string;
  assetBasePath: string;
  authConfigured: boolean;

  // Media (ENV only)
  storageDriver: string;
  r2PublicUrl: string;
  s3PublicUrl: string;
  localPublicUrl: string;
  imageTransformUrl: string;

  // Upload (ENV only, parsed to number)
  /** Max upload file size in MB. Defaults to 500. */
  uploadMaxFileSize: number;

  // Summary extraction (ENV only)
  /** Max paragraphs to include in auto-extracted summary. Defaults to 5. */
  summaryMaxParagraphs: number;
  /** Max characters to include in auto-extracted summary. Defaults to 500. */
  summaryMaxChars: number;

  // Pagination/Feed (ENV only, parsed to number)
  pageSize: number;
  rssFeedLimit: number;

  // Slug (ENV only)
  /** Length of random IDs used in auto-generated slugs. Defaults to 5. */
  slugIdLength: number;

  // Demo (ENV only)
  demoEmail: string;
  demoPassword: string;
  demoMode: boolean;

  // Theme (DB internal)
  themeId: string;
  defaultThemeId: string;
  fontThemeId: string;
  themeMode: ThemeMode;
  customCSS: string;

  // Site appearance (DB internal)
  siteAvatar: string;
  showHeaderAvatar: boolean;
  /** Derived: getMediaUrl(siteAvatar, publicUrl) */
  siteAvatarUrl: string;
  faviconVersion: string;

  // Settings form placeholders (ENV > Default, without DB)
  fallbacks: {
    siteName: string;
    siteDescription: string;
    defaultTheme: string;
  };
}
