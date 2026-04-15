/**
 * Shared types for settings Lit components and bridge script
 */

/** Translated labels for the settings UI */
export interface SettingsLabels {
  // Avatar
  blogAvatar: string;
  uploadAvatar: string;
  remove: string;
  confirmRemoveAvatar: string;
  avatarHelp: string;
  displayInHeader: string;
  processing: string;
  uploading: string;
  uploadError: string;

  // General
  general: string;
  site: string;
  languageAndTime: string;
  home: string;
  search: string;
  siteName: string;
  aboutBlog: string;
  aboutBlogHelp: string;
  siteFooter: string;
  footerHelp: string;
  feeds: string;
  mainRssFeed: string;
  mainRssFeedHelp: string;
  mainRssFeedWarning: string;
  availableFeedUrls: string;
  availableFeedUrlsHelp: string;
  mainFeedUrl: string;
  latestFeedUrl: string;
  featuredFeedUrl: string;
  latestFeedOption: string;
  latestFeedOptionDescription: string;
  featuredFeedOption: string;
  featuredFeedOptionDescription: string;
  showJantBrandingOnHome: string;
  markdownSupported: string;
  siteLanguage: string;
  siteLanguageHelp: string;
  cjkFont: string;
  cjkFontHelp: string;
  timeZone: string;

  // Search
  allowIndexing: string;
  demoSeoLocked: string;

  // Actions
  save: string;
  cancel: string;
  copy: string;
  copyFailed: string;
  feedUrlCopied: string;
}

/** Timezone entry for the select dropdown */
export interface SettingsTimezone {
  value: string;
  label: string;
}

/** CJK font option for the select dropdown */
export interface SettingsCjkFont {
  value: string;
  label: string;
}

/** Site language option for the select dropdown */
export interface SettingsLanguage {
  value: string;
  label: string;
}

export interface SettingsInitialData {
  siteName: string;
  siteDescription: string;
  siteLanguage: string;
  cjkSerifFont: string;
  mainRssFeed: string;
  timeZone: string;
  siteFooter: string;
  showJantBrandingOnHome: boolean;
  noindex: boolean;
}

/** Event detail dispatched when a settings form is saved */
export interface SettingsSaveDetail {
  endpoint: string;
  data: Record<string, unknown>;
  section: string;
}

/** Event detail dispatched when avatar remove is requested */
export interface AvatarRemoveDetail {
  endpoint: string;
}
