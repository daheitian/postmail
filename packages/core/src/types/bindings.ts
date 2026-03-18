/// <reference types="@cloudflare/workers-types/latest" />

import type BetterSqlite3 from "better-sqlite3";

/**
 * Application runtime bindings.
 *
 * The Cloudflare runtime still provides most of these values today, but the
 * interface now also carries the canonical `JANT_*` environment names that the
 * Node runtime will use.
 */

export interface Bindings {
  DB?: D1Database;
  R2?: R2Bucket;
  NODE_SQLITE?: BetterSqlite3.Database;
  SITE_URL?: string;
  DEFAULT_THEME?: string;
  AUTH_SECRET?: string;
  JANT_SITE_URL?: string;
  JANT_SITE_NAME?: string;
  JANT_SITE_DESCRIPTION?: string;
  JANT_SITE_LANGUAGE?: string;
  JANT_HOME_DEFAULT_VIEW?: string;
  JANT_HEADER_NAV_MAX_VISIBLE?: string;
  JANT_TIME_ZONE?: string;
  JANT_SITE_FOOTER?: string;
  JANT_SHOW_JANT_BRANDING_ON_HOME?: string;
  JANT_NOINDEX?: string;
  JANT_DEFAULT_THEME?: string;
  JANT_AUTH_SECRET?: string;
  JANT_R2_PUBLIC_URL?: string;
  JANT_IMAGE_TRANSFORM_URL?: string;
  JANT_DEMO_EMAIL?: string;
  JANT_DEMO_PASSWORD?: string;
  JANT_DEMO_MODE?: string;
  JANT_DEV_API_TOKEN?: string;
  JANT_PAGE_SIZE?: string;
  JANT_STORAGE_DRIVER?: string;
  JANT_S3_ENDPOINT?: string;
  JANT_S3_BUCKET?: string;
  JANT_S3_ACCESS_KEY_ID?: string;
  JANT_S3_SECRET_ACCESS_KEY?: string;
  JANT_S3_REGION?: string;
  JANT_S3_PUBLIC_URL?: string;
  JANT_DATA_DIR?: string;
  JANT_LOCAL_STORAGE_PATH?: string;
  JANT_LOCAL_PUBLIC_URL?: string;
  JANT_UPLOAD_MAX_FILE_SIZE_MB?: string;
  JANT_SUMMARY_MAX_PARAGRAPHS?: string;
  JANT_SUMMARY_MAX_CHARS?: string;
  JANT_SLUG_ID_LENGTH?: string;
  JANT_RSS_FEED_LIMIT?: string;
  JANT_TRUST_PROXY?: string;
  DATABASE_URL?: string;
  HOST?: string;
  PORT?: string;
  R2_PUBLIC_URL?: string;
  IMAGE_TRANSFORM_URL?: string;
  DEMO_EMAIL?: string;
  DEMO_PASSWORD?: string;
  DEMO_MODE?: string;
  DEV_API_TOKEN?: string;
  // Timeline
  PAGE_SIZE?: string;
  // Site configuration (optional - can be overridden in DB)
  HEADER_NAV_MAX_VISIBLE?: string;
  SITE_NAME?: string;
  SITE_DESCRIPTION?: string;
  SITE_LANGUAGE?: string;
  SHOW_JANT_BRANDING_ON_HOME?: string;
  // S3-compatible storage (alternative to R2)
  STORAGE_DRIVER?: string;
  DATA_DIR?: string;
  S3_ENDPOINT?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_REGION?: string;
  S3_PUBLIC_URL?: string;
  // Upload
  UPLOAD_MAX_FILE_SIZE_MB?: string;
  // Summary extraction
  SUMMARY_MAX_PARAGRAPHS?: string;
  SUMMARY_MAX_CHARS?: string;
  // Slug generation
  SLUG_ID_LENGTH?: string;
  // RSS feed
  RSS_FEED_LIMIT?: string;
}
