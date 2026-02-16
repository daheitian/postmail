/**
 * Threads Theme
 *
 * A clean, centered timeline theme inspired by Threads.net.
 * Posts separated by thin dividers, no cards, with thread connector lines.
 *
 * This is the default theme for Jant.
 */

import type { JantTheme, ThemeComponents } from "../../types.js";
import type { ColorTheme } from "../../theme/color-themes.js";

// Layout
import { ThreadsSiteLayout } from "./ThreadsSiteLayout.js";

// Pages
import { HomePage } from "./pages/HomePage.js";
import { PostPage } from "./pages/PostPage.js";
import { SinglePage } from "./pages/SinglePage.js";
import { ArchivePage } from "./pages/ArchivePage.js";
import { SearchPage } from "./pages/SearchPage.js";
import { CollectionPage } from "./pages/CollectionPage.js";

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
 * Create the threads theme configuration.
 *
 * @param options - Optional overrides for components, CSS variables, or color themes
 * @returns A JantTheme configuration object
 *
 * @example
 * ```typescript
 * import { createApp } from "@jant/core";
 * import { threadsTheme } from "@jant/core";
 *
 * export default createApp({
 *   theme: threadsTheme(),
 * });
 * ```
 */
export function theme(options?: ThemeOptions): JantTheme {
  return {
    name: "threads",
    components: {
      SiteLayout: ThreadsSiteLayout,
      HomePage,
      PostPage,
      SinglePage,
      ArchivePage,
      SearchPage,
      CollectionPage,
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
export { ThreadsSiteLayout } from "./ThreadsSiteLayout.js";
export { HomePage } from "./pages/HomePage.js";
export { PostPage } from "./pages/PostPage.js";
export { SinglePage } from "./pages/SinglePage.js";
export { ArchivePage } from "./pages/ArchivePage.js";
export { SearchPage } from "./pages/SearchPage.js";
export { CollectionPage } from "./pages/CollectionPage.js";
export { NoteCard } from "./timeline/NoteCard.js";
export { LinkCard } from "./timeline/LinkCard.js";
export { QuoteCard } from "./timeline/QuoteCard.js";
export { ThreadPreview } from "./timeline/ThreadPreview.js";
export { TimelineFeed } from "./timeline/TimelineFeed.js";
export { TimelineLoadMore } from "./timeline/TimelineLoadMore.js";
export { TimelineItem, TimelineItemFromPost } from "./timeline/TimelineItem.js";
export { timelineMore } from "./timeline/timelineMore.js";
