import type { AppConfig } from "../types/config.js";
import type { Bindings } from "../types.js";
import type { SettingsService } from "../services/settings.js";
import { createHostedControlPlaneClient } from "./hosted-control-plane.js";
import { resolveConfig } from "./resolve-config.js";

export async function syncHostedControlPlaneSiteAvatar(input: {
  appConfig: Pick<AppConfig, "siteUrl">;
  env: Bindings;
  settings: SettingsService;
  siteId: string;
}): Promise<void> {
  const hostedControlPlane = createHostedControlPlaneClient(input.env);
  if (!hostedControlPlane) {
    return;
  }

  const allSettings = await input.settings.getAll();
  const resolved = resolveConfig(input.env, allSettings, {
    siteUrl: input.appConfig.siteUrl || undefined,
  });

  await hostedControlPlane.syncSiteMetadata({
    avatarUrl: resolved.siteAvatarUrl || null,
    coreSiteId: input.siteId,
  });
}
