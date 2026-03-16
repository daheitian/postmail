/**
 * Shared types for settings Lit components and bridge script
 */

/** Translated labels for the settings UI */
export interface SettingsLabels {
  // Avatar
  blogAvatar: string;
  uploadAvatar: string;
  remove: string;
  avatarHelp: string;
  displayInHeader: string;
  processing: string;
  uploading: string;
  uploadError: string;

  // General
  general: string;
  siteName: string;
  aboutBlog: string;
  aboutBlogHelp: string;
  siteFooter: string;
  footerHelp: string;
  showJantBrandingOnHome: string;
  markdownSupported: string;
  language: string;
  timeZone: string;

  // SEO
  allowIndexing: string;

  // Actions
  save: string;
  cancel: string;
}

/** Timezone entry for the select dropdown */
export interface SettingsTimezone {
  value: string;
  label: string;
}

/** Language option for the select dropdown */
export interface SettingsLanguage {
  value: string;
  label: string;
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
