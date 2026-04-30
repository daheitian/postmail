/**
 * General settings form
 *
 * Server-side template that renders the <jant-settings-general> Lit
 * component for site name, description, footer, homepage branding, language,
 * timezone, and search settings.
 * The settings-bridge.ts script handles server communication.
 */

import { msg } from "@lingui/core/macro";
import { useLingui } from "../../../i18n/context.js";
import type { TimezoneEntry } from "../../../lib/timezones.js";

export function GeneralContent({
  siteName,
  siteDescription,
  siteLanguage,
  cjkSerifFont,
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
  cjkSerifFont: string;
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
  const { i18n } = useLingui();

  const labels = JSON.stringify({
    general: i18n._(
      msg({
        message: "General",
        comment: "@context: Settings section heading",
      }),
    ),
    site: i18n._(
      msg({
        message: "Site",
        comment: "@context: Settings subsection heading for basic site fields",
      }),
    ),
    languageAndTime: i18n._(
      msg({
        message: "Language & Time",
        comment:
          "@context: Settings subsection heading for language and time zone fields",
      }),
    ),
    home: i18n._(
      msg({
        message: "Home",
        comment: "@context: Settings subsection heading for home page settings",
      }),
    ),
    search: i18n._(
      msg({
        message: "Search",
        comment:
          "@context: Settings section heading for search engine indexing settings",
      }),
    ),
    siteName: i18n._(
      msg({
        message: "Site Name",
        comment: "@context: Settings form field",
      }),
    ),
    aboutBlog: i18n._(
      msg({
        message: "About this blog",
        comment: "@context: Settings form field for site description",
      }),
    ),
    aboutBlogHelp: i18n._(
      msg({
        message: "A short intro shown on your home page.",
        comment: "@context: Help text for site description field",
      }),
    ),
    siteLanguage: i18n._(
      msg({
        message: "Language",
        comment: "@context: Settings form field for site/admin language",
      }),
    ),
    siteLanguageHelp: i18n._(
      msg({
        message:
          "Sets the content language announced to readers (HTML lang, RSS) and the dashboard language. Any BCP 47 tag is accepted; tags without a dashboard translation fall back to English.",
        comment: "@context: Help text under the site language input",
      }),
    ),
    siteLanguageSearchPlaceholder: i18n._(
      msg({
        message: "Search…",
        comment:
          "@context: Placeholder inside the language combobox search field",
      }),
    ),
    siteLanguageNoMatches: i18n._(
      msg({
        message: "No matches.",
        comment:
          "@context: Empty state shown when the language search filters out every entry",
      }),
    ),
    cjkFont: i18n._(
      msg({
        message: "CJK Font",
        comment: "@context: Settings form field for CJK serif font selection",
      }),
    ),
    cjkFontHelp: i18n._(
      msg({
        message:
          "Load a serif font optimized for Chinese, Japanese, or Korean content.",
        comment: "@context: Help text for CJK serif font selection",
      }),
    ),
    timeZone: i18n._(
      msg({
        message: "Time Zone",
        comment: "@context: Settings form field",
      }),
    ),
    siteFooter: i18n._(
      msg({
        message: "Site Footer",
        comment: "@context: Settings section heading for site footer",
      }),
    ),
    feeds: i18n._(
      msg({
        message: "Feeds",
        comment:
          "@context: Settings section heading for RSS feed configuration",
      }),
    ),
    mainRssFeed: i18n._(
      msg({
        message: "Main RSS feed",
        comment:
          "@context: Settings field label for the canonical /feed output",
      }),
    ),
    mainRssFeedHelp: i18n._(
      msg({
        message: "This controls what /feed returns.",
        comment:
          "@context: Help text for choosing whether /feed points to latest or featured posts",
      }),
    ),
    mainRssFeedWarning: i18n._(
      msg({
        message: "Changing this updates what subscribers get from /feed.",
        comment:
          "@context: Warning shown when changing the canonical RSS feed selection",
      }),
    ),
    availableFeedUrls: i18n._(
      msg({
        message: "Fixed feed URLs",
        comment: "@context: Label for the list of stable RSS feed URLs",
      }),
    ),
    availableFeedUrlsHelp: i18n._(
      msg({
        message: "Use these when you want a feed URL that never changes.",
        comment:
          "@context: Help text for the explicit latest and featured feed URLs",
      }),
    ),
    mainFeedUrl: i18n._(
      msg({
        message: "Main feed",
        comment: "@context: Label for the canonical /feed URL",
      }),
    ),
    latestFeedUrl: i18n._(
      msg({
        message: "Latest feed",
        comment: "@context: Label for the explicit latest RSS feed URL",
      }),
    ),
    featuredFeedUrl: i18n._(
      msg({
        message: "Featured feed",
        comment: "@context: Label for the explicit featured RSS feed URL",
      }),
    ),
    latestFeedOption: i18n._(
      msg({
        message: "Latest",
        comment:
          "@context: Select option for using latest posts as the main RSS feed",
      }),
    ),
    latestFeedOptionDescription: i18n._(
      msg({
        message: "Uses the latest public posts for /feed.",
        comment:
          "@context: Description for choosing the latest posts as the main RSS feed",
      }),
    ),
    featuredFeedOption: i18n._(
      msg({
        message: "Featured",
        comment:
          "@context: Select option for using featured posts as the main RSS feed",
      }),
    ),
    featuredFeedOptionDescription: i18n._(
      msg({
        message: "Uses featured posts for /feed.",
        comment:
          "@context: Description for choosing featured posts as the main RSS feed",
      }),
    ),
    footerHelp: i18n._(
      msg({
        message: "Displayed at the bottom of all posts and pages.",
        comment: "@context: Help text for site footer field",
      }),
    ),
    showJantBrandingOnHome: i18n._(
      msg({
        message: 'Show "Build with Jant" at the bottom of the home page',
        comment:
          "@context: Checkbox for showing the optional Jant credit link on the home page",
      }),
    ),
    markdownSupported: i18n._(
      msg({
        message: "Markdown supported",
        comment: "@context: Placeholder hint for markdown-enabled textareas",
      }),
    ),
    allowIndexing: i18n._(
      msg({
        message: "Allow search engines to index my site",
        comment: "@context: Checkbox for allowing search engine indexing",
      }),
    ),
    demoSeoLocked: i18n._(
      msg({
        message: "Demo sites always stay hidden from search engines.",
        comment:
          "@context: Help text explaining that SEO indexing is locked in demo mode",
      }),
    ),
    save: i18n._(
      msg({
        message: "Save",
        comment: "@context: Button to save settings",
      }),
    ),
    cancel: i18n._(
      msg({
        message: "Cancel",
        comment:
          "@context: Button to cancel unsaved changes and revert to original values",
      }),
    ),
    copy: i18n._(
      msg({
        message: "Copy",
        comment: "@context: Button to copy a URL to the clipboard",
      }),
    ),
    copyFailed: i18n._(
      msg({
        message: "Could not copy. Try again.",
        comment:
          "@context: Error toast when copying text to the clipboard fails",
      }),
    ),
    feedUrlCopied: i18n._(
      msg({
        message: "Feed URL copied.",
        comment: "@context: Toast after copying a feed URL to the clipboard",
      }),
    ),
  }).replace(/</g, "\\u003c");

  const timezonesJson = JSON.stringify(
    timezones.map((tz) => ({ value: tz.value, label: tz.label })),
  ).replace(/</g, "\\u003c");

  const cjkFontsJson = JSON.stringify([
    { value: "off", label: "None" },
    {
      value: "zh-Hans",
      label: "\u7B80\u4F53\u4E2D\u6587 (Simplified Chinese)",
    },
    {
      value: "zh-Hant",
      label: "\u7E41\u9AD4\u4E2D\u6587 (Traditional Chinese)",
    },
    { value: "ja", label: "\u65E5\u672C\u8A9E (Japanese)" },
    { value: "ko", label: "\uD55C\uAD6D\uC5B4 (Korean)" },
  ]).replace(/</g, "\\u003c");

  const initialData = JSON.stringify({
    siteName,
    siteDescription,
    siteLanguage,
    cjkSerifFont,
    mainRssFeed,
    timeZone,
    siteFooter,
    showJantBrandingOnHome,
    noindex,
  }).replace(/</g, "\\u003c");

  return (
    <>
      <div class="flex flex-col max-w-form">
        <jant-settings-general
          labels={labels}
          timezones={timezonesJson}
          cjk-fonts={cjkFontsJson}
          sitename-fallback={siteNameFallback}
          sitedescription-fallback={siteDescriptionFallback}
          main-feed-url={mainFeedUrl}
          latest-feed-url={latestFeedUrl}
          featured-feed-url={featuredFeedUrl}
          demo-mode={demoMode || undefined}
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
