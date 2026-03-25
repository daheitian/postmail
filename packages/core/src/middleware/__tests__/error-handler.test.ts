import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigurationError } from "../../lib/errors.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { errorHandler } from "../error-handler.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("errorHandler", () => {
  it("renders configuration errors for page requests", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = new Hono<Env>();

    app.onError(errorHandler);
    app.get("/", () => {
      throw new ConfigurationError(
        "single-site mode found multiple sites in the database.",
      );
    });

    const response = await app.request("http://localhost/");

    expect(response.status).toBe(500);
    expect(await response.text()).toContain("Configuration Error");
    expect(consoleError).toHaveBeenCalledWith(
      "[Jant] Configuration error:",
      expect.any(ConfigurationError),
    );
  });
});
