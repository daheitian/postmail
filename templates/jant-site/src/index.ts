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
import { MyQuoteCard } from "./MyQuoteCard.js";

export default createApp({
  theme: {
    components: {
      QuoteCard: MyQuoteCard,
    },
  },
});
