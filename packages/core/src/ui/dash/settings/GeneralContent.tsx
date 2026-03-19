/**
 * General settings form
 *
 * Server-side template that renders the <jant-settings-general> Lit
 * component for site name, description, footer, homepage branding, language,
 * timezone, and search settings.
 * The settings-bridge.ts script handles server communication.
 */

import { useLingui } from "@lingui/react/macro";
import type { TimezoneEntry } from "../../../lib/timezones.js";

export function GeneralContent({
  siteName,
  siteDescription,
  siteLanguage,
  siteNameFallback,
  siteDescriptionFallback,
  mainRssFeed,
  mainFeedUrl,
  latestFeedUrl,
  featuredFeedUrl,
  timeZone,
  siteFooter,
  showJantBrandingOnHome,
  noindex,
  demoMode,
  timezones,
}: {
  siteName: string;
  siteDescription: string;
  siteLanguage: string;
  siteNameFallback: string;
  siteDescriptionFallback: string;
  mainRssFeed: string;
  mainFeedUrl: string;
  latestFeedUrl: string;
  featuredFeedUrl: string;
  timeZone: string;
  siteFooter: string;
  showJantBrandingOnHome: boolean;
  noindex: boolean;
  demoMode: boolean;
  timezones: TimezoneEntry[];
}) {
  const { t } = useLingui();

  const labels = JSON.stringify({
    general: t({
      message: "General",
      comment: "@context: Settings section heading",
    }),
    site: t({
      message: "Site",
      comment: "@context: Settings subsection heading for basic site fields",
    }),
    languageAndTime: t({
      message: "Language & Time",
      comment:
        "@context: Settings subsection heading for language and time zone fields",
    }),
    home: t({
      message: "Home",
      comment: "@context: Settings subsection heading for home page settings",
    }),
    search: t({
      message: "Search",
      comment:
        "@context: Settings section heading for search engine indexing settings",
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
        "A short intro for search engines and feed readers. Plain text only.",
      comment: "@context: Help text for site description field",
    }),
    language: t({
      message: "Language",
      comment: "@context: Settings form field",
    }),
    timeZone: t({
      message: "Time Zone",
      comment: "@context: Settings form field",
    }),
    siteFooter: t({
      message: "Site Footer",
      comment: "@context: Settings section heading for site footer",
    }),
    feeds: t({
      message: "Feeds",
      comment: "@context: Settings section heading for RSS feed configuration",
    }),
    mainRssFeed: t({
      message: "Main RSS feed",
      comment: "@context: Settings field label for the canonical /feed output",
    }),
    mainRssFeedHelp: t({
      message: "This controls what /feed returns.",
      comment:
        "@context: Help text for choosing whether /feed points to latest or featured posts",
    }),
    mainRssFeedWarning: t({
      message: "Changing this updates what subscribers get from /feed.",
      comment:
        "@context: Warning shown when changing the canonical RSS feed selection",
    }),
    availableFeedUrls: t({
      message: "Fixed feed URLs",
      comment: "@context: Label for the list of stable RSS feed URLs",
    }),
    availableFeedUrlsHelp: t({
      message: "Use these when you want a feed URL that never changes.",
      comment:
        "@context: Help text for the explicit latest and featured feed URLs",
    }),
    mainFeedUrl: t({
      message: "Main feed",
      comment: "@context: Label for the canonical /feed URL",
    }),
    latestFeedUrl: t({
      message: "Latest feed",
      comment: "@context: Label for the explicit latest RSS feed URL",
    }),
    featuredFeedUrl: t({
      message: "Featured feed",
      comment: "@context: Label for the explicit featured RSS feed URL",
    }),
    latestFeedOption: t({
      message: "Latest",
      comment:
        "@context: Select option for using latest posts as the main RSS feed",
    }),
    latestFeedOptionDescription: t({
      message: "Uses the latest public posts for /feed.",
      comment:
        "@context: Description for choosing the latest posts as the main RSS feed",
    }),
    featuredFeedOption: t({
      message: "Featured",
      comment:
        "@context: Select option for using featured posts as the main RSS feed",
    }),
    featuredFeedOptionDescription: t({
      message: "Uses featured posts for /feed.",
      comment:
        "@context: Description for choosing featured posts as the main RSS feed",
    }),
    footerHelp: t({
      message:
        "Displayed at the bottom of all posts and pages. Markdown supported.",
      comment: "@context: Help text for site footer field",
    }),
    showJantBrandingOnHome: t({
      message: 'Show "Build with Jant" at the bottom of the home page',
      comment:
        "@context: Checkbox for showing the optional Jant credit link on the home page",
    }),
    markdownSupported: t({
      message: "Markdown supported",
      comment: "@context: Placeholder hint for markdown-enabled textareas",
    }),
    allowIndexing: t({
      message: "Allow search engines to index my site",
      comment: "@context: Checkbox for allowing search engine indexing",
    }),
    demoSeoLocked: t({
      message: "Demo sites always stay hidden from search engines.",
      comment:
        "@context: Help text explaining that SEO indexing is locked in demo mode",
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
    mainRssFeed,
    timeZone,
    siteFooter,
    showJantBrandingOnHome,
    noindex,
  }).replace(/</g, "\\u003c");

  return (
    <>
      <div class="flex flex-col max-w-lg">
        <jant-settings-general
          labels={labels}
          timezones={timezonesJson}
          languages={languagesJson}
          sitename-fallback={siteNameFallback}
          sitedescription-fallback={siteDescriptionFallback}
          main-feed-url={mainFeedUrl}
          latest-feed-url={latestFeedUrl}
          featured-feed-url={featuredFeedUrl}
          demo-mode={demoMode ? "true" : "false"}
        >
          {/* SSR fallback skeleton */}
          <div>
            <h2 class="skel-label" />
            <div class="skel-section-lg" />
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
