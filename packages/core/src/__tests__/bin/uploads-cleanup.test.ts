import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../../../bin/commands/uploads/cleanup.js";

const originalEnv = {
  INTERNAL_ADMIN_TOKEN: process.env.INTERNAL_ADMIN_TOKEN,
  SITE_URL: process.env.SITE_URL,
};

afterEach(() => {
  if (originalEnv.INTERNAL_ADMIN_TOKEN === undefined) {
    delete process.env.INTERNAL_ADMIN_TOKEN;
  } else {
    process.env.INTERNAL_ADMIN_TOKEN = originalEnv.INTERNAL_ADMIN_TOKEN;
  }

  if (originalEnv.SITE_URL === undefined) {
    delete process.env.SITE_URL;
  } else {
    process.env.SITE_URL = originalEnv.SITE_URL;
  }

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("jant uploads cleanup", () => {
  it("calls the internal uploads cleanup endpoint", async () => {
    process.env.SITE_URL = "https://example.com/blog";
    process.env.INTERNAL_ADMIN_TOKEN = "internal-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          abortedMultipartUploads: 1,
          deletedSessions: 3,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await run(["--limit", "25"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/blog/api/internal/uploads/cleanup",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer internal-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 25 }),
      },
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      "Cleaning expired uploads for https://example.com/blog...",
    );
    expect(logSpy).toHaveBeenNthCalledWith(2, "Deleted sessions: 3");
    expect(logSpy).toHaveBeenNthCalledWith(3, "Aborted multipart uploads: 1");
  });
});
