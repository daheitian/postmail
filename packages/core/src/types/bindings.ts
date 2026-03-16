/**
 * Cloudflare Worker Bindings
 */

export interface Bindings {
  DB: D1Database;
  R2?: R2Bucket;
  SITE_URL: string;
  DEFAULT_THEME?: string;
  AUTH_SECRET?: string;
  R2_PUBLIC_URL?: string;
  IMAGE_TRANSFORM_URL?: string;
  DEMO_EMAIL?: string;
  DEMO_PASSWORD?: string;
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
