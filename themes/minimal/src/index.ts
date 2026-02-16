/**
 * Minimal Theme for Jant
 *
 * A clean, header-based theme with centered content column.
 * Site name, horizontal navigation links, optional markdown description.
 *
 * @example
 * ```typescript
 * import { createApp } from "@jant/core";
 * import { theme } from "jant-theme-minimal";
 *
 * export default createApp({
 *   theme: theme(),
 * });
 * ```
 *
 * CSS: Import the minimal-specific styles in your CSS entry:
 * ```css
 * @import "jant-theme-minimal/style.css";
 * ```
 */

import type { JantTheme, ThemeComponents } from "@jant/core";
import type { ColorTheme } from "@jant/core/theme";

// Layout
import { MinimalSiteLayout } from "./MinimalSiteLayout.js";

// Pages
import { HomePage } from "./pages/HomePage.js";
import { PostPage } from "./pages/PostPage.js";
import { SinglePage } from "./pages/SinglePage.js";
import { ArchivePage } from "./pages/ArchivePage.js";
import { SearchPage } from "./pages/SearchPage.js";
import { CollectionPage } from "./pages/CollectionPage.js";
import { FeaturedPage } from "./pages/FeaturedPage.js";
import { CollectionsPage } from "./pages/CollectionsPage.js";

// Timeline
import { NoteCard } from "./timeline/NoteCard.js";
import { LinkCard } from "./timeline/LinkCard.js";
import { QuoteCard } from "./timeline/QuoteCard.js";
import { ThreadPreview } from "./timeline/ThreadPreview.js";
import { TimelineFeed } from "./timeline/TimelineFeed.js";
import { TimelineLoadMore } from "./timeline/TimelineLoadMore.js";
import { timelineMore } from "./timeline/timelineMore.js";

export interface ThemeOptions {
  /** Override individual components */
  components?: Partial<ThemeComponents>;
  /** CSS variable overrides */
  cssVariables?: Record<string, string>;
  /** Custom color themes */
  colorThemes?: ColorTheme[];
}

/**
 * Create the minimal theme configuration.
 *
 * @param options - Optional overrides for components, CSS variables, or color themes
 * @returns A JantTheme configuration object
 */
export function theme(options?: ThemeOptions): JantTheme {
  return {
    name: "minimal",
    components: {
      SiteLayout: MinimalSiteLayout,
      HomePage,
      PostPage,
      SinglePage,
      ArchivePage,
      SearchPage,
      CollectionPage,
      FeaturedPage,
      CollectionsPage,
      NoteCard,
      LinkCard,
      QuoteCard,
      ThreadPreview,
      TimelineFeed,
      TimelineLoadMore,
      ...options?.components,
    },
    timelineMore,
    cssVariables: {
      ...options?.cssVariables,
    },
    colorThemes: options?.colorThemes,
  };
}

// Re-export individual components for wrapping/extending
export { MinimalSiteLayout } from "./MinimalSiteLayout.js";
export { HomePage } from "./pages/HomePage.js";
export { PostPage } from "./pages/PostPage.js";
export { SinglePage } from "./pages/SinglePage.js";
export { ArchivePage } from "./pages/ArchivePage.js";
export { SearchPage } from "./pages/SearchPage.js";
export { CollectionPage } from "./pages/CollectionPage.js";
export { FeaturedPage } from "./pages/FeaturedPage.js";
export { CollectionsPage } from "./pages/CollectionsPage.js";
export { NoteCard } from "./timeline/NoteCard.js";
export { LinkCard } from "./timeline/LinkCard.js";
export { QuoteCard } from "./timeline/QuoteCard.js";
export { ThreadPreview } from "./timeline/ThreadPreview.js";
export { TimelineFeed } from "./timeline/TimelineFeed.js";
export { TimelineLoadMore } from "./timeline/TimelineLoadMore.js";
export { TimelineItem, TimelineItemFromPost } from "./timeline/TimelineItem.js";
export { timelineMore } from "./timeline/timelineMore.js";
