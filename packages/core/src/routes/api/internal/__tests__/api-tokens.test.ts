import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../../__tests__/helpers/app.js";
import { internalApiTokensRoutes } from "../api-tokens.js";

describe("Internal API token admin routes", () => {
  it("reports healthy with a valid internal admin token", async () => {
    const { app } = createTestApp({
      authenticated: false,
      internalAdminToken: "internal-secret",
    });
    app.route("/api/internal/api-tokens", internalApiTokensRoutes);

    const res = await app.request("/api/internal/api-tokens/health", {
      headers: { Authorization: "Bearer internal-secret" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 404 when the internal admin token is not configured", async () => {
    const { app } = createTestApp({ authenticated: false });
    app.route("/api/internal/api-tokens", internalApiTokensRoutes);

    const res = await app.request("/api/internal/api-tokens/purge", {
      method: "POST",
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: "Internal admin endpoint not found",
      code: "NOT_FOUND",
    });
  });

  it("purges all user API tokens with a valid internal admin token", async () => {
    const { app, services } = createTestApp({
      authenticated: false,
      internalAdminToken: "internal-secret",
    });
    app.route("/api/internal/api-tokens", internalApiTokensRoutes);

    await services.apiTokens.create("Shortcuts");
    await services.apiTokens.create("Zapier");

    const res = await app.request("/api/internal/api-tokens/purge", {
      method: "POST",
      headers: { Authorization: "Bearer internal-secret" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 2 });
    expect(await services.apiTokens.list()).toEqual([]);
  });
});
