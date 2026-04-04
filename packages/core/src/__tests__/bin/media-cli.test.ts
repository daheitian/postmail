import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../../../bin/commands/media.js";

const originalEnv = {
  DEV_API_TOKEN: process.env.DEV_API_TOKEN,
  JANT_API_TOKEN: process.env.JANT_API_TOKEN,
  SITE_ORIGIN: process.env.SITE_ORIGIN,
  SITE_PATH_PREFIX: process.env.SITE_PATH_PREFIX,
};

function createFakeWebpBytes(length = 32) {
  const bytes = new Uint8Array(length);
  bytes.set([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  return bytes;
}

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("media CLI commands", () => {
  it("lists media through the authenticated API", async () => {
    process.env.SITE_ORIGIN = "https://example.com";
    process.env.JANT_API_TOKEN = "jant-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          media: [{ id: "med_1", mimeType: "image/webp" }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await run(["list", "--mimePrefix", "image/"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/upload?mimePrefix=image%2F",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jant-secret",
        },
        body: undefined,
      },
    );
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toEqual({
      media: [{ id: "med_1", mimeType: "image/webp" }],
    });
  });

  it("uploads media through the upload session API and patches alt text", async () => {
    process.env.SITE_ORIGIN = "https://example.com";
    process.env.JANT_API_TOKEN = "jant-secret";

    const tempDir = await mkdtemp(join(tmpdir(), "jant-media-cli-"));
    const filePath = join(tempDir, "photo.webp");
    await writeFile(filePath, createFakeWebpBytes());

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "ups_1",
            transport: {
              kind: "relay",
              url: "/api/uploads/ups_1/body",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "med_1",
            filename: "med_1-photo.webp",
            mimeType: "image/webp",
            size: 32,
            url: "/media/photo.webp",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "med_1",
            alt: "Cover image",
            mimeType: "image/webp",
            type: "media",
            url: "/media/photo.webp",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await run(["upload", filePath, "--alt", "Cover image"]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.com/api/uploads/init",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jant-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: "photo.webp",
          contentType: "image/webp",
          size: 32,
        }),
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/api/uploads/ups_1/body",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer jant-secret",
        },
        body: Buffer.from(createFakeWebpBytes()),
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://example.com/api/uploads/ups_1/complete",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jant-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://example.com/api/upload/med_1",
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jant-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alt: "Cover image" }),
      },
    );
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      id: "med_1",
      alt: "Cover image",
    });
  });
});
