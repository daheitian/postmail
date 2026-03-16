/**
 * Export API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { createExportService } from "../../services/export.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const exportApiRoutes = new Hono<Env>();

exportApiRoutes.post("/zola", requireAuthApi(), async (c) => {
  const { services, appConfig } = c.var;
  const exportService = createExportService(services, {
    siteName: appConfig.siteName,
    siteUrl: appConfig.siteUrl,
    siteDescription: appConfig.siteDescription,
    siteLanguage: appConfig.siteLanguage,
    showJantBrandingOnHome: appConfig.showJantBrandingOnHome,
  });
  const zip = await exportService.generateZolaSite();
  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="jant-export.zip"',
      "Content-Length": String(zip.byteLength),
    },
  });
});
