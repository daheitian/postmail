import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { requireAuth, requireAuthApi } from "../auth.js";
import { errorHandler } from "../error-handler.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

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
  };
}

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
});
