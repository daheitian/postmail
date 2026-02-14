/**
 * Jant Site Entry Point
 *
 * This is the main entry point for your Jant site.
 *
 * Configuration:
 * - Site settings (name, description, language) should be configured via
 *   environment variables in wrangler.toml or .dev.vars:
 *   SITE_NAME, SITE_DESCRIPTION, SITE_LANGUAGE
 * - Alternatively, you can set them in the dashboard (they will be stored in DB)
 * - Priority: Environment Variables > Database > Defaults
 */

import { createApp } from "@jant/core";

export default createApp({
  // Theme customization (optional)
  // Use this for UI/component overrides that need to be compiled into your build
  // theme: {
  //   components: {
  //     // Override components here
  //     // PostCard: MyPostCard,
  //   },
  // },
});
