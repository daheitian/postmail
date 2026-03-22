import {
  getHostedControlPlaneInternalBaseUrl,
  getHostedControlPlaneInternalToken,
  getSiteResolutionMode,
} from "./env.js";

export interface HostedControlPlaneSiteMetadataInput {
  coreSiteId: string;
  displayName?: string;
  primaryHost?: string;
  status?: "provisioning" | "ready" | "suspended" | "failed";
}

export interface HostedControlPlaneClient {
  syncSiteMetadata(input: HostedControlPlaneSiteMetadataInput): Promise<void>;
}

export function createHostedControlPlaneClient(
  env: object | undefined | null,
  fetchImpl: typeof fetch = fetch,
): HostedControlPlaneClient | null {
  if (getSiteResolutionMode(env) !== "host-based") {
    return null;
  }

  const baseUrl = getHostedControlPlaneInternalBaseUrl(env);
  const token = getHostedControlPlaneInternalToken(env);
  if (!baseUrl || !token) {
    return null;
  }

  return {
    async syncSiteMetadata(input) {
      const endpoint = new URL(
        `/api/internal/core-sites/${encodeURIComponent(input.coreSiteId)}/metadata`,
        baseUrl,
      );
      const response = await fetchImpl(endpoint.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (response.ok) {
        return;
      }

      const message = await response.text();
      throw new Error(
        `Hosted control plane metadata sync failed (${response.status}): ${message || "Unknown error."}`,
      );
    },
  };
}
