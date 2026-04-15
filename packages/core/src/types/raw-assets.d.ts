/**
 * Ambient declarations for Vite's `?raw` query suffix on asset imports.
 *
 * Vite (and our worker bundle build) inlines the file contents as a
 * UTF-8 string at build time. We use this for shipping CSS assets
 * (e.g. tokens.css) into the Zola export bundle without requiring
 * filesystem access at runtime.
 */
declare module "*.css?raw" {
  const content: string;
  export default content;
}
