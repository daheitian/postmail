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
export const CONFIG_FIELDS = {
  // User-configurable (can be modified in settings)
  SITE_NAME: {
    defaultValue: "Jant",
    envOnly: false,
  },
  SITE_DESCRIPTION: {
    defaultValue: "Thoughts, links, and quotes — one post at a time",
    envOnly: false,
  },
  SITE_LANGUAGE: {
    defaultValue: "en",
    envOnly: false,
  },
  HOME_DEFAULT_VIEW: {
    defaultValue: "latest",
    envOnly: false,
  },
  HEADER_NAV_MAX_VISIBLE: {
    defaultValue: "2",
    envOnly: false,
  },

  // Environment-only (deployment/infrastructure config)
  DEFAULT_THEME: {
    defaultValue: "notepad",
    envOnly: true,
  },
  SITE_URL: {
    defaultValue: "",
    envOnly: true,
  },
  AUTH_SECRET: {
    defaultValue: "",
    envOnly: true,
  },
  R2_PUBLIC_URL: {
    defaultValue: "",
    envOnly: true,
  },
  IMAGE_TRANSFORM_URL: {
    defaultValue: "",
    envOnly: true,
  },
  DEMO_EMAIL: {
    defaultValue: "",
    envOnly: true,
  },
  DEMO_PASSWORD: {
    defaultValue: "",
    envOnly: true,
  },
  PAGE_SIZE: {
    defaultValue: "20",
    envOnly: true,
  },
  STORAGE_DRIVER: {
    defaultValue: "r2",
    envOnly: true,
  },
  S3_ENDPOINT: {
    defaultValue: "",
    envOnly: true,
  },
  S3_BUCKET: {
    defaultValue: "",
    envOnly: true,
  },
  S3_ACCESS_KEY_ID: {
    defaultValue: "",
    envOnly: true,
  },
  S3_SECRET_ACCESS_KEY: {
    defaultValue: "",
    envOnly: true,
  },
  S3_REGION: {
    defaultValue: "auto",
    envOnly: true,
  },
  S3_PUBLIC_URL: {
    defaultValue: "",
    envOnly: true,
  },
  UPLOAD_MAX_FILE_SIZE_MB: {
    defaultValue: "500",
    envOnly: true,
  },
  SUMMARY_MAX_PARAGRAPHS: {
    defaultValue: "5",
    envOnly: true,
  },
  SUMMARY_MAX_CHARS: {
    defaultValue: "500",
    envOnly: true,
  },
  SLUG_ID_LENGTH: {
    defaultValue: "5",
    envOnly: true,
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
  },
  SITE_FOOTER: {
    defaultValue: "",
    envOnly: false,
  },
  NOINDEX: {
    defaultValue: "",
    envOnly: false,
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
} as const;

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
  headerNavMaxVisible: number;
  timeZone: string;
  siteFooter: string;
  noindex: boolean;

  // Infrastructure (ENV only)
  siteUrl: string;
  authConfigured: boolean;

  // Media (ENV only)
  storageDriver: string;
  r2PublicUrl: string;
  s3PublicUrl: string;
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
