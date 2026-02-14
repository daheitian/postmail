/**
 * Jant Site Entry Point
 *
 * This is the main entry point for your Jant site.
 * The minimal theme is used by default. To customize, pass options to createApp().
 *
 * Configuration:
 * - Site settings (name, description, language) should be configured via
 *   environment variables in wrangler.toml or .dev.vars
 * - Alternatively, set them in the dashboard (stored in DB)
 */

import { createApp } from "@jant/core";

export default createApp();
