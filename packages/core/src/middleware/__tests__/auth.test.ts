import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import {
  requireAuth,
  requireAuthApi,
  requireInternalAdminApi,
  isLocalHostname,
  hasValidLocalDevToken,
} from "../auth.js";
import { errorHandler } from "../error-handler.js";
import { DEFAULT_APP_PORT } from "../../lib/env.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };
const LOCAL_API_URL = `http://localhost:${DEFAULT_APP_PORT}/api/data`;
const LOCAL_HOST = `127.0.0.1:${DEFAULT_APP_PORT}`;

function createMockAuth(authenticated: boolean) {
  return {
    api: {
      getSession: async () =>
        authenticated
          ? {
              user: { id: "user-1", email: "test@test.com", name: "Test" },
              session: { id: "session-1" },
            }
          : null,
    },
  } as AppVariables["auth"];
}

function createMockApiTokenService(validToken?: string) {
  const tokenId = "token-id-1";
  return {
    verify: vi.fn(async (raw: string) => (raw === validToken ? tokenId : null)),
    updateLastUsed: vi.fn(async () => {}),
    create: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
    deleteAll: vi.fn(async () => 0),
  };
}

describe("isLocalHostname", () => {
  it.each([
    ["localhost", true],
    ["127.0.0.1", true],
    ["::1", true],
    ["jant.localtest.me", true],
    ["sub.localtest.me", true],
    ["myblog.com", false],
    ["demo.jant.me", false],
    ["localtest.me.evil.com", false],
  ])("isLocalHostname(%s) → %s", (hostname, expected) => {
    expect(isLocalHostname(hostname)).toBe(expected);
  });
});

describe("hasValidLocalDevToken", () => {
  it("accepts a local Host header even when the canonical request URL is remote", () => {
    expect(
      hasValidLocalDevToken(
        "https://jant.me/api/posts",
        "127.0.0.1:8020",
        "jnt_dev",
        "jnt_dev",
      ),
    ).toBe(true);
  });

  it("falls back to the request URL hostname when Host is absent", () => {
    expect(
      hasValidLocalDevToken(
        "http://127.0.0.1:8020/api/posts",
        undefined,
        "jnt_dev",
        "jnt_dev",
      ),
    ).toBe(true);
  });

  it("rejects non-local hosts even with a matching token", () => {
    expect(
      hasValidLocalDevToken(
        "https://jant.me/api/posts",
        "jant.me",
        "jnt_dev",
        "jnt_dev",
      ),
    ).toBe(false);
  });
});

describe("requireAuth", () => {
  it("allows authenticated requests", async () => {
    const app = new Hono<Env>();
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(true));
      await next();
    });
    app.get("/settings", requireAuth(), (c) => c.text("Settings"));

    const res = await app.request("/settings");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Settings");
  });

  it("redirects unauthenticated requests to /signin", async () => {
    const app = new Hono<Env>();
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(false));
      await next();
    });
    app.get("/settings", requireAuth(), (c) => c.text("Settings"));

    const res = await app.request("/settings", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/signin");
  });

  it("redirects to custom path", async () => {
    const app = new Hono<Env>();
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(false));
      await next();
    });
    app.get("/settings", requireAuth("/login"), (c) => c.text("Settings"));

    const res = await app.request("/settings", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login");
  });
});

describe("requireAuthApi", () => {
  it("allows authenticated requests via session", async () => {
    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(true));
      c.set("services", {
        apiTokens: createMockApiTokenService(),
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("/api/data");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBe("secret");
  });

  it("returns 401 for unauthenticated requests without Bearer token", async () => {
    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: createMockApiTokenService(),
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("/api/data");
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when getSession throws", async () => {
    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.set("auth", {
        api: {
          getSession: async () => {
            throw new Error("Session error");
          },
        },
      } as AppVariables["auth"]);
      c.set("services", {
        apiTokens: createMockApiTokenService(),
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("/api/data");
    expect(res.status).toBe(401);
  });

  it("allows requests with valid Bearer token when session auth fails", async () => {
    const validToken = "jnt_abc123";
    const mockApiTokens = createMockApiTokenService(validToken);

    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: mockApiTokens,
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("/api/data", {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBe("secret");

    expect(mockApiTokens.verify).toHaveBeenCalledWith(validToken);
    expect(mockApiTokens.updateLastUsed).toHaveBeenCalledWith("token-id-1");
  });

  it("returns 401 for invalid Bearer token", async () => {
    const mockApiTokens = createMockApiTokenService("jnt_valid");

    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: mockApiTokens,
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("/api/data", {
      headers: { Authorization: "Bearer jnt_invalid" },
    });
    expect(res.status).toBe(401);

    expect(mockApiTokens.verify).toHaveBeenCalledWith("jnt_invalid");
  });

  it("prefers session auth over Bearer token", async () => {
    const mockApiTokens = createMockApiTokenService("jnt_valid");

    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(true));
      c.set("services", {
        apiTokens: mockApiTokens,
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("/api/data", {
      headers: { Authorization: "Bearer jnt_valid" },
    });
    expect(res.status).toBe(200);

    // Should not check the token since session auth succeeded
    expect(mockApiTokens.verify).not.toHaveBeenCalled();
  });

  it("allows DEV_API_TOKEN on localhost", async () => {
    const devToken = "jnt_dev_test123";
    const mockApiTokens = createMockApiTokenService();

    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.env = { ...c.env, DEV_API_TOKEN: devToken } as Bindings;
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: mockApiTokens,
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request(LOCAL_API_URL, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    expect(res.status).toBe(200);

    // Should NOT hit DB verification
    expect(mockApiTokens.verify).not.toHaveBeenCalled();
  });

  it("rejects DEV_API_TOKEN on non-local hostname", async () => {
    const devToken = "jnt_dev_test123";
    const mockApiTokens = createMockApiTokenService();

    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.env = { ...c.env, DEV_API_TOKEN: devToken } as Bindings;
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: mockApiTokens,
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("https://myblog.com/api/data", {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    expect(res.status).toBe(401);

    // Falls through to normal DB verification (which also fails)
    expect(mockApiTokens.verify).toHaveBeenCalledWith(devToken);
  });

  it("allows DEV_API_TOKEN on *.localtest.me", async () => {
    const devToken = "jnt_dev_test123";
    const mockApiTokens = createMockApiTokenService();

    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.env = { ...c.env, DEV_API_TOKEN: devToken } as Bindings;
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: mockApiTokens,
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("https://jant.localtest.me/api/data", {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    expect(res.status).toBe(200);
    expect(mockApiTokens.verify).not.toHaveBeenCalled();
  });

  it("allows DEV_API_TOKEN when SITE_URL canonicalizes to a remote host", async () => {
    const devToken = "jnt_dev_test123";
    const mockApiTokens = createMockApiTokenService();

    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.env = {
        ...c.env,
        DEV_API_TOKEN: devToken,
        SITE_URL: "https://jant.me",
      } as Bindings;
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: mockApiTokens,
      } as AppVariables["services"]);
      await next();
    });
    app.get("/api/data", requireAuthApi(), (c) => c.json({ data: "secret" }));

    const res = await app.request("https://jant.me/api/data", {
      headers: {
        Authorization: `Bearer ${devToken}`,
        Host: LOCAL_HOST,
      },
    });

    expect(res.status).toBe(200);
    expect(mockApiTokens.verify).not.toHaveBeenCalled();
  });
});

describe("requireInternalAdminApi", () => {
  it("returns 404 when the internal admin token is not configured", async () => {
    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: createMockApiTokenService(),
      } as AppVariables["services"]);
      await next();
    });
    app.post("/api/internal/demo", requireInternalAdminApi(), (c) =>
      c.json({ ok: true }),
    );

    const res = await app.request("/api/internal/demo", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("returns 401 for an invalid internal admin token", async () => {
    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.env = {
        ...c.env,
        INTERNAL_ADMIN_TOKEN: "internal-secret",
      } as Bindings;
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: createMockApiTokenService(),
      } as AppVariables["services"]);
      await next();
    });
    app.post("/api/internal/demo", requireInternalAdminApi(), (c) =>
      c.json({ ok: true }),
    );

    const res = await app.request("/api/internal/demo", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status).toBe(401);
  });

  it("allows requests with the configured internal admin token", async () => {
    const app = new Hono<Env>();
    app.onError(errorHandler);
    app.use("*", async (c, next) => {
      c.env = {
        ...c.env,
        INTERNAL_ADMIN_TOKEN: "internal-secret",
      } as Bindings;
      c.set("auth", createMockAuth(false));
      c.set("services", {
        apiTokens: createMockApiTokenService(),
      } as AppVariables["services"]);
      await next();
    });
    app.post("/api/internal/demo", requireInternalAdminApi(), (c) =>
      c.json({ ok: true }),
    );

    const res = await app.request("/api/internal/demo", {
      method: "POST",
      headers: { Authorization: "Bearer internal-secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
