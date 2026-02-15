/**
 * Minimal Theme
 *
 * A content-first, borderless theme inspired by Tufte CSS and Manton.org.
 * Single-column layout with serif-friendly typography and generous whitespace.
 *
 * This is the default theme for Jant.
 */

import type { JantTheme, ThemeComponents } from "../../types.js";
import type { ColorTheme } from "../../theme/color-themes.js";

// Layout
import { SiteLayout } from "./MinimalSiteLayout.js";

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
 *
 * @example
 * ```typescript
 * import { createApp } from "@jant/core";
 * import { minimalTheme } from "@jant/core";
 *
 * export default createApp({
 *   theme: minimalTheme(),  // re-exported as minimalTheme from @jant/core
 * });
 * ```
 */
export function theme(options?: ThemeOptions): JantTheme {
  return {
    name: "minimal",
    components: {
      SiteLayout,
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
    cssVariables: {
      ...options?.cssVariables,
    },
    colorThemes: options?.colorThemes,
  };
}
