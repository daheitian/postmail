import { beforeEach, describe, expect, it, vi } from "vitest";

const { runLocalWranglerMock } = vi.hoisted(() => ({
  runLocalWranglerMock: vi.fn(),
}));

vi.mock("../../../bin/lib/wrangler-cli.js", () => ({
  runLocalWrangler: runLocalWranglerMock,
}));

const { parseWranglerError, queryD1 } =
  await import("../../../bin/lib/d1-query.js");

function createWranglerError(stderr) {
  return Object.assign(new Error("Wrangler command failed"), {
    stderr,
    stdout: "",
  });
}

describe("d1-query Wrangler error parsing", () => {
  beforeEach(() => {
    runLocalWranglerMock.mockReset();
  });

  it("keeps Cloudflare note details in the surfaced error", () => {
    const output = JSON.stringify({
      error: {
        text: "API request failed.",
        notes: [{ text: "The given account is not valid [code: 7403]" }],
      },
    });

    expect(parseWranglerError(output)).toBe(
      "API request failed. (The given account is not valid [code: 7403])",
    );
  });

  it("retries transient fetch failures for D1 queries", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    runLocalWranglerMock
      .mockImplementationOnce(() => {
        throw createWranglerError("fetch failed");
      })
      .mockImplementationOnce(() =>
        JSON.stringify([
          {
            results: [{ count: 1 }],
            success: true,
          },
        ]),
      );

    const rows = queryD1("SELECT 1", "d1-remote", {
      retryAttempts: 2,
      retryDelayMs: 0,
    });

    expect(rows).toEqual([{ count: 1 }]);
    expect(runLocalWranglerMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("does not retry non-transient Wrangler errors", () => {
    runLocalWranglerMock.mockImplementationOnce(() => {
      throw createWranglerError(
        JSON.stringify({
          error: {
            text: "Authentication error.",
          },
        }),
      );
    });

    expect(() =>
      queryD1("SELECT 1", "d1-remote", {
        retryAttempts: 3,
        retryDelayMs: 0,
      }),
    ).toThrow("Wrangler error: Authentication error.");
    expect(runLocalWranglerMock).toHaveBeenCalledTimes(1);
  });
});
