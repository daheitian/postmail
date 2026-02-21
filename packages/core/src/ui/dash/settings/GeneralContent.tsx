/**
 * General settings form
 *
 * Server-side template that renders Lit Web Components for the
 * settings page. Provides translated labels, initial data, and
 * timezone/language options as JSON attributes.
 *
 * The Lit components <jant-settings-avatar> and <jant-settings-general>
 * handle all form state and rendering. The settings-bridge.ts script
 * handles server communication.
 */

import { useLingui } from "@lingui/react/macro";
import type { TimezoneEntry } from "../../../lib/timezones.js";
import { SettingsNav } from "./SettingsNav.js";

export function GeneralContent({
  siteName,
  siteDescription,
  siteLanguage,
  homeDefaultView,
  siteNameFallback,
  siteDescriptionFallback,
  siteAvatarUrl,
  showHeaderAvatar,
  timeZone,
  siteFooter,
  noindex,
  timezones,
}: {
  siteName: string;
  siteDescription: string;
  siteLanguage: string;
  homeDefaultView: string;
  siteNameFallback: string;
  siteDescriptionFallback: string;
  siteAvatarUrl: string;
  showHeaderAvatar: boolean;
  timeZone: string;
  siteFooter: string;
  noindex: boolean;
  timezones: TimezoneEntry[];
}) {
  const { t } = useLingui();

  const labels = JSON.stringify({
    blogAvatar: t({
      message: "Blog Avatar",
      comment: "@context: Settings section heading for avatar",
    }),
    uploadAvatar: t({
      message: "Upload Avatar",
      comment: "@context: Button to upload avatar image",
    }),
    remove: t({
      message: "Remove",
      comment: "@context: Button to remove the blog avatar",
    }),
    avatarHelp: t({
      message:
        "This is used for your favicon and apple-touch-icon. For best results, upload a square image at least 180x180 pixels.",
      comment: "@context: Help text for avatar upload",
    }),
    displayInHeader: t({
      message: "Display avatar in my site header",
      comment: "@context: Checkbox to show avatar in the site header",
    }),
    processing: t({
      message: "Processing...",
      comment:
        "@context: Avatar upload button text while generating favicon variants",
    }),
    uploading: t({
      message: "Uploading...",
      comment: "@context: Avatar upload button text while uploading",
    }),
    uploadError: t({
      message: "Upload failed. Please try again.",
      comment: "@context: Error message when avatar upload fails",
    }),
    general: t({
      message: "General",
      comment: "@context: Settings section heading",
    }),
    siteName: t({
      message: "Site Name",
      comment: "@context: Settings form field",
    }),
    aboutBlog: t({
      message: "About this blog",
      comment: "@context: Settings form field for site description",
    }),
    aboutBlogHelp: t({
      message:
        "Displayed above your blog posts on the home page. Also used as the meta description. Markdown supported.",
      comment: "@context: Help text for site description field",
    }),
    language: t({
      message: "Language",
      comment: "@context: Settings form field",
    }),
    defaultHomepageView: t({
      message: "Default Homepage View",
      comment: "@context: Settings form field",
    }),
    latest: t({
      message: "Latest",
      comment: "@context: Homepage view option - show latest posts",
    }),
    featured: t({
      message: "Featured",
      comment: "@context: Homepage view option - show featured posts",
    }),
    timeZone: t({
      message: "Time Zone",
      comment: "@context: Settings form field",
    }),
    siteFooter: t({
      message: "Site Footer",
      comment: "@context: Settings section heading for site footer",
    }),
    footerHelp: t({
      message:
        "Displayed at the bottom of all posts and pages. Markdown supported.",
      comment: "@context: Help text for site footer field",
    }),
    markdownSupported: t({
      message: "Markdown supported",
      comment: "@context: Placeholder hint for markdown-enabled textareas",
    }),
    seo: t({
      message: "SEO",
      comment: "@context: Settings section heading for SEO",
    }),
    allowIndexing: t({
      message: "It's OK for search engines to index my site",
      comment: "@context: Checkbox for allowing search engine indexing",
    }),
    save: t({
      message: "Save",
      comment: "@context: Button to save settings",
    }),
    cancel: t({
      message: "Cancel",
      comment:
        "@context: Button to cancel unsaved changes and revert to original values",
    }),
  }).replace(/</g, "\\u003c");

  const timezonesJson = JSON.stringify(
    timezones.map((tz) => ({ value: tz.value, label: tz.label })),
  ).replace(/</g, "\\u003c");

  const languagesJson = JSON.stringify([
    { value: "en", label: "English" },
    { value: "zh-Hans", label: "\u7B80\u4F53\u4E2D\u6587" },
    { value: "zh-Hant", label: "\u7E41\u9AD4\u4E2D\u6587" },
  ]);

  const initialData = JSON.stringify({
    siteName,
    siteDescription,
    siteLanguage,
    homeDefaultView,
    timeZone,
    siteFooter,
    noindex,
  }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="general" />

      <div class="flex flex-col gap-6 max-w-lg">
        <jant-settings-avatar
          avatar-url={siteAvatarUrl}
          show-in-header={showHeaderAvatar || undefined}
          labels={labels}
        >
          {/* SSR fallback skeleton */}
          <div class="card">
            <header>
              <h2 class="skel-label" />
            </header>
            <section class="skel-section-sm" />
          </div>
        </jant-settings-avatar>

        <jant-settings-general
          labels={labels}
          timezones={timezonesJson}
          languages={languagesJson}
          sitename-fallback={siteNameFallback}
          sitedescription-fallback={siteDescriptionFallback}
        >
          {/* SSR fallback skeleton */}
          <div class="flex flex-col gap-6">
            <div class="card">
              <header>
                <h2 class="skel-label" />
              </header>
              <section class="skel-section-lg" />
            </div>
          </div>
        </jant-settings-general>
      </div>

      <script
        type="application/json"
        id="settings-initial-data"
        dangerouslySetInnerHTML={{ __html: initialData }}
      />
    </>
  );
}
