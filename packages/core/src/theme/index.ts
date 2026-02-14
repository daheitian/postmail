/**
 * Jant Theme - Shared Infrastructure
 *
 * Exports shared layouts, components, and color themes used by all themes.
 * Individual theme packages (minimal, card, etc.) import from here.
 *
 * @example
 * ```typescript
 * // In a theme package:
 * import { MediaGallery, Pagination } from "@jant/core/theme";
 * import type { ColorTheme } from "@jant/core/theme";
 * ```
 */

// Layout components (BaseLayout, DashLayout)
export * from "./layouts/index.js";

// Shared UI components (MediaGallery, Pagination, EmptyState, etc.)
export * from "./components/index.js";

// Color themes
export * from "./color-themes.js";
