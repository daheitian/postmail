import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { errorHandler } from "../../../middleware/error-handler.js";
import { computeHostedVerificationToken } from "../../../lib/hosted-domain-check.js";
import { hostedDomainCheckRoutes } from "../domain-check.js";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

function createHostedDomainCheckTestApp(options?: {
  host?: string;
  domainId?: string;
  secret?: string;
}) {
  const app = new Hono<Env>();
  app.onError(errorHandler);
  app.use("*", async (c, next) => {
    c.env = {
      HOSTED_CONTROL_PLANE_DOMAIN_CHECK_SECRET: options?.secret,
    } as Bindings;
    c.set("currentSite", {
      createdAt: 0,
      id: "sit_test",
      key: "demo",
      status: "active",
      updatedAt: 0,
    });
    c.set("currentSiteDomain", {
      createdAt: 0,
      host: options?.host ?? "blog.example.com",
      id: options?.domainId ?? "sdom_custom",
      kind: "alias",
      pathPrefix: null,
      redirectToPrimary: true,
      siteId: "sit_test",
      updatedAt: 0,
    });
    await next();
  });
  app.route("/", hostedDomainCheckRoutes);
  return app;
}

describe("hostedDomainCheckRoutes (jant-verification)", () => {
  it("returns 404 when the domain check secret is not configured", async () => {
    const app = createHostedDomainCheckTestApp();

    const response = await app.request(
      "/.well-known/jant-verification?nonce=test-nonce",
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("404 Not Found");
  });

  it("returns 400 when the nonce is missing", async () => {
    const app = createHostedDomainCheckTestApp({
      secret: "cloud-domain-check-secret-cloud-domain-check-secret",
    });

    const response = await app.request("/.well-known/jant-verification");

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Missing nonce.");
  });

  it("returns the plaintext HMAC token for the current hosted domain", async () => {
    const secret = "cloud-domain-check-secret-cloud-domain-check-secret";
    const host = "blog.example.com";
    const nonce = "test-nonce";
    const app = createHostedDomainCheckTestApp({
      domainId: "sdom_custom",
      host,
      secret,
    });

    const response = await app.request(
      `/.well-known/jant-verification?nonce=${nonce}`,
    );
    const body = (await response.text()).trim();
    const expected = await computeHostedVerificationToken(secret, host, nonce);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(body).toBe(`jant-verification=${expected}`);
  });

  it("normalizes host casing when computing the token", async () => {
    const secret = "cloud-domain-check-secret-cloud-domain-check-secret";
    const nonce = "abc";
    const lower = await computeHostedVerificationToken(
      secret,
      "blog.example.com",
      nonce,
    );
    const mixed = await computeHostedVerificationToken(
      secret,
      "Blog.Example.COM",
      nonce,
    );
    expect(lower).toBe(mixed);
  });
});
