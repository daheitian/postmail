import { describe, expect, it, vi } from "vitest";
import { createHostedControlPlaneClient } from "../hosted-control-plane.js";

describe("createHostedControlPlaneClient", () => {
  it("returns null outside host-based mode", () => {
    expect(
      createHostedControlPlaneClient({
        HOSTED_CONTROL_PLANE_BASE_URL: "https://cloud-jant.localtest.me",
        HOSTED_CONTROL_PLANE_INTERNAL_TOKEN: "internal-token-123456",
        SITE_RESOLUTION_MODE: "single-site",
      }),
    ).toBeNull();
  });

  it("posts site metadata to the hosted control plane", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createHostedControlPlaneClient(
      {
        HOSTED_CONTROL_PLANE_BASE_URL: "https://cloud-jant.localtest.me",
        HOSTED_CONTROL_PLANE_INTERNAL_BASE_URL: "http://127.0.0.1:3300",
        HOSTED_CONTROL_PLANE_INTERNAL_TOKEN: "internal-token-123456",
        SITE_RESOLUTION_MODE: "host-based",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(client).not.toBeNull();
    await client?.syncSiteMetadata({
      coreSiteId: "sit_123",
      displayName: "Updated Site",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3300/api/internal/core-sites/sit_123/metadata",
      expect.objectContaining({
        body: JSON.stringify({
          coreSiteId: "sit_123",
          displayName: "Updated Site",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer internal-token-123456",
          "Content-Type": "application/json",
        }),
        method: "POST",
      }),
    );
  });
});
