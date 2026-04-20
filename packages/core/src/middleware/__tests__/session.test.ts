import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { attachSession } from "../session.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

function createAppWithAuth(mockAuth: AppVariables["auth"]): Hono<Env> & {
  // ensures tests see session/isAuthenticated via c.var
  _lastSession?: AppVariables["session"];
  _lastIsAuthenticated?: boolean;
} {
  const app = new Hono<Env>();
  app.use("*", async (c, next) => {
    c.set("auth", mockAuth);
    await next();
  });
  app.use("*", attachSession());
  return app;
}

function buildSessionMock(
  impl: () => Promise<AppVariables["session"]>,
): AppVariables["auth"] {
  return {
    api: {
      getSession: impl,
    },
  } as unknown as AppVariables["auth"];
}

describe("attachSession", () => {
  it("populates c.var.session and isAuthenticated on a valid session", async () => {
    const mockAuth = buildSessionMock(
      async () =>
        ({
          user: { id: "user-1", email: "x@y.z", name: "X" },
          session: { id: "sess-1" },
        }) as unknown as AppVariables["session"],
    );
    const app = createAppWithAuth(mockAuth);
    app.get("/", (c) =>
      c.json({
        authed: c.var.isAuthenticated,
        userId: (c.var.session?.user as { id?: string } | undefined)?.id,
      }),
    );

    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authed: true, userId: "user-1" });
  });

  it("sets isAuthenticated=false and session=null when no session is present", async () => {
    const mockAuth = buildSessionMock(async () => null);
    const app = createAppWithAuth(mockAuth);
    app.get("/", (c) =>
      c.json({
        authed: c.var.isAuthenticated,
        session: c.var.session,
      }),
    );

    const res = await app.request("/");
    expect(await res.json()).toEqual({ authed: false, session: null });
  });

  it("swallows errors from getSession and treats the request as unauthenticated", async () => {
    const mockAuth = buildSessionMock(async () => {
      throw new Error("session lookup failed");
    });
    const app = createAppWithAuth(mockAuth);
    app.get("/", (c) =>
      c.json({
        authed: c.var.isAuthenticated,
        session: c.var.session,
      }),
    );

    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authed: false, session: null });
  });
});
