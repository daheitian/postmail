import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveBucketNameMock, runLocalWranglerMock } = vi.hoisted(() => ({
  resolveBucketNameMock: vi.fn(() => "demo-bucket"),
  runLocalWranglerMock: vi.fn(),
}));

vi.mock("../../../bin/lib/wrangler-config.js", () => ({
  resolveWranglerR2BucketName: resolveBucketNameMock,
}));

vi.mock("../../../bin/lib/wrangler-cli.js", () => ({
  runLocalWrangler: runLocalWranglerMock,
}));

const { downloadR2Object, downloadR2ObjectFromPublicUrl } =
  await import("../../../bin/lib/r2-query.js");

const tempDirs: string[] = [];

function createWranglerError(stderr: string) {
  return Object.assign(new Error("Wrangler command failed"), {
    stderr,
    stdout: "",
  });
}

describe("r2-query Wrangler retry behavior", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    resolveBucketNameMock.mockReset();
    resolveBucketNameMock.mockReturnValue("demo-bucket");
    runLocalWranglerMock.mockReset();
  });

  it("retries transient timeout failures for R2 downloads", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    runLocalWranglerMock
      .mockImplementationOnce(() => {
        throw createWranglerError("The request to Cloudflare's API timed out.");
      })
      .mockImplementationOnce(() => "");

    downloadR2Object("media/example.png", "/tmp/example.png", "d1-remote", {
      retryAttempts: 2,
      retryDelayMs: 0,
    });

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
      downloadR2Object("media/example.png", "/tmp/example.png", "d1-remote", {
        retryAttempts: 3,
        retryDelayMs: 0,
      }),
    ).toThrow("Wrangler error: Authentication error.");
    expect(runLocalWranglerMock).toHaveBeenCalledTimes(1);
  });

  it("downloads objects directly from the public URL when available", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-r2-public-"));
    tempDirs.push(root);
    const filePath = join(root, "objects", "media", "example.txt");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("demo object body")),
    );

    await downloadR2ObjectFromPublicUrl(
      "https://demo-source-media.jant.me",
      "media/example.txt",
      filePath,
    );

    expect(await readFile(filePath, "utf-8")).toBe("demo object body");
  });
});
