/**
 * Card Theme for Jant
 *
 * A bordered card-style theme with sidebar navigation.
 * This serves as a reference implementation for third-party Jant themes.
 *
 * @example
 * ```typescript
 * import { createApp } from "@jant/core";
 * import { theme } from "jant-theme-card";
 *
 * export default createApp({
 *   theme: theme(),
 * });
 * ```
 *
 * CSS: Import the card-specific styles in your CSS entry:
 * ```css
 * @import "jant-theme-card/style.css";
 * ```
 */

import type { JantTheme, ThemeComponents } from "@jant/core";
import type { ColorTheme } from "@jant/core/theme";

// Layout
import { CardSiteLayout } from "./CardSiteLayout.js";

// Pages
import { HomePage } from "./pages/HomePage.js";
import { PostPage } from "./pages/PostPage.js";
import { SinglePage } from "./pages/SinglePage.js";
import { ArchivePage } from "./pages/ArchivePage.js";
import { SearchPage } from "./pages/SearchPage.js";
import { CollectionPage } from "./pages/CollectionPage.js";

// Timeline
import { NoteCard } from "./timeline/NoteCard.js";
import { ArticleCard } from "./timeline/ArticleCard.js";
import { LinkCard } from "./timeline/LinkCard.js";
import { QuoteCard } from "./timeline/QuoteCard.js";
import { ImageCard } from "./timeline/ImageCard.js";
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
 * Create the card theme configuration.
 *
 * @param options - Optional overrides for components, CSS variables, or color themes
 * @returns A JantTheme configuration object
 */
export function theme(options?: ThemeOptions): JantTheme {
  return {
    name: "card",
    components: {
      SiteLayout: CardSiteLayout,
      HomePage,
      PostPage,
      SinglePage,
      ArchivePage,
      SearchPage,
      CollectionPage,
      NoteCard,
      ArticleCard,
      LinkCard,
      QuoteCard,
      ImageCard,
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
export { CardSiteLayout } from "./CardSiteLayout.js";
export { HomePage } from "./pages/HomePage.js";
export { PostPage } from "./pages/PostPage.js";
export { SinglePage } from "./pages/SinglePage.js";
export { ArchivePage } from "./pages/ArchivePage.js";
export { SearchPage } from "./pages/SearchPage.js";
export { CollectionPage } from "./pages/CollectionPage.js";
export { NoteCard } from "./timeline/NoteCard.js";
export { ArticleCard } from "./timeline/ArticleCard.js";
export { LinkCard } from "./timeline/LinkCard.js";
export { QuoteCard } from "./timeline/QuoteCard.js";
export { ImageCard } from "./timeline/ImageCard.js";
export { ThreadPreview } from "./timeline/ThreadPreview.js";
export { TimelineFeed } from "./timeline/TimelineFeed.js";
export { TimelineLoadMore } from "./timeline/TimelineLoadMore.js";
export { TimelineItem, TimelineItemFromPost } from "./timeline/TimelineItem.js";
export { timelineMore } from "./timeline/timelineMore.js";
