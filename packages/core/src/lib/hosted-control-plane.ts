import {
  getHostedControlPlaneInternalBaseUrl,
  getHostedControlPlaneInternalToken,
  getSiteResolutionMode,
} from "./env.js";

export interface HostedControlPlaneSiteMetadataInput {
  avatarUrl?: string | null;
  coreSiteId: string;
  displayName?: string;
  primaryHost?: string;
  status?: "provisioning" | "ready" | "suspended" | "failed";
}

export interface HostedControlPlaneMediaQuotaCheckInput {
  additionalBytes: number;
  coreSiteId: string;
}

export interface HostedControlPlaneMediaQuotaCheckResult {
  allowed: boolean;
  limitBytes: number;
  remainingBytes: number;
  usedBytes: number;
}

export interface HostedControlPlaneClient {
  checkMediaWriteQuota(
    input: HostedControlPlaneMediaQuotaCheckInput,
  ): Promise<HostedControlPlaneMediaQuotaCheckResult>;
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
    async checkMediaWriteQuota(input) {
      const endpoint = new URL(
        `/api/internal/core-sites/${encodeURIComponent(input.coreSiteId)}/media/quota/check`,
        baseUrl,
      );
      const response = await fetchImpl(endpoint.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          additionalBytes: input.additionalBytes,
        }),
      });

      if (response.ok) {
        return (await response.json()) as HostedControlPlaneMediaQuotaCheckResult;
      }

      const message = await response.text();
      throw new Error(
        `Hosted control plane media quota check failed (${response.status}): ${message || "Unknown error."}`,
      );
    },

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
