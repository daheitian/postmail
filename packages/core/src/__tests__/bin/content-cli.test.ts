import { afterEach, describe, expect, it, vi } from "vitest";
import { run as runCollections } from "../../../bin/commands/collections.js";
import { run as runPosts } from "../../../bin/commands/posts.js";
import { run as runSearch } from "../../../bin/commands/search.js";

const originalEnv = {
  DEV_API_TOKEN: process.env.DEV_API_TOKEN,
  JANT_API_TOKEN: process.env.JANT_API_TOKEN,
  SITE_ORIGIN: process.env.SITE_ORIGIN,
  SITE_PATH_PREFIX: process.env.SITE_PATH_PREFIX,
};

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

describe("content CLI commands", () => {
  it("lists posts through the authenticated API", async () => {
    process.env.SITE_ORIGIN = "https://example.com";
    process.env.SITE_PATH_PREFIX = "/blog";
    process.env.JANT_API_TOKEN = "jant-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          nextCursor: null,
          posts: [{ id: "pst_1", format: "note" }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runPosts(["list", "--format", "note", "--limit", "5"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/blog/api/posts?format=note&limit=5",
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
      nextCursor: null,
      posts: [{ id: "pst_1", format: "note" }],
    });
  });

  it("creates a post from inline JSON", async () => {
    process.env.SITE_ORIGIN = "https://example.com";
    process.env.JANT_API_TOKEN = "jant-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pst_created",
          format: "note",
          bodyText: "Hello from CLI",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runPosts([
      "create",
      "--json",
      JSON.stringify({
        format: "note",
        bodyMarkdown: "Hello from CLI",
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/api/posts", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer jant-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: "note",
        bodyMarkdown: "Hello from CLI",
      }),
    });
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      id: "pst_created",
      format: "note",
    });
  });

  it("falls back to DEV_API_TOKEN for collection mutations", async () => {
    process.env.DEV_API_TOKEN = "dev-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runCollections([
      "add-post",
      "col_123",
      "pst_456",
      "--url",
      "https://example.com",
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/collections/col_123/posts",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer dev-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId: "pst_456" }),
      },
    );
  });

  it("searches without requiring a token", async () => {
    process.env.SITE_ORIGIN = "https://example.com";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          query: "quiet design",
          results: [{ id: "pst_1", slug: "quiet-design" }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runSearch(["quiet", "design"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/search?q=quiet+design",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        body: undefined,
      },
    );
  });
});
