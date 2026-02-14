/**
 * Jant Theme Components
 *
 * These components can be imported for wrapping/extending:
 *
 * @example
 * ```typescript
 * import { PostPage } from "@jant/core/theme";
 * import type { PostPageProps } from "@jant/core";
 *
 * export function MyPostPage(props: PostPageProps) {
 *   return (
 *     <div class="my-wrapper">
 *       <PostPage {...props} />
 *     </div>
 *   );
 * }
 * ```
 */

// Layout components
export * from "./layouts/index.js";

// UI components
export * from "./components/index.js";

// Page components
export * from "./pages/index.js";
