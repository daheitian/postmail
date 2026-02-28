import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createSearchService } from "../search.js";
import { createPostService } from "../post.js";
import { createPathRegistryService } from "../path-registry.js";
import type { Database } from "../../db/index.js";
import type BetterSqlite3 from "better-sqlite3";

/** Wraps plain text in a minimal valid TipTap JSON document. */
function tiptapDoc(text: string): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  });
}

describe("SearchService", () => {
  let db: Database;
  let sqlite: BetterSqlite3.Database;
  let postService: ReturnType<typeof createPostService>;

  // Create a mock D1Database interface wrapping better-sqlite3
  function createMockD1(sqliteDb: BetterSqlite3.Database) {
    return {
      prepare(query: string) {
        return {
          bind(...params: unknown[]) {
            return {
              async all<T>() {
                const stmt = sqliteDb.prepare(query);
                const rows = stmt.all(...(params as never[])) as T[];
                return { results: rows };
              },
            };
          },
        };
      },
    } as unknown as D1Database;
  }

  beforeEach(() => {
    const testDb = createTestDatabase({ fts: true });
    db = testDb.db as unknown as Database;
    sqlite = testDb.sqlite;
    postService = createPostService(db, createPathRegistryService(db));
  });

  it("returns empty results for empty query", async () => {
    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("");
    expect(results).toEqual([]);
  });

  it("returns empty results for whitespace-only query", async () => {
    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("   ");
    expect(results).toEqual([]);
  });

  it("finds posts by content", async () => {
    await postService.create({
      format: "note",
      body: tiptapDoc("Hello world from jant"),
    });
    await postService.create({
      format: "note",
      body: tiptapDoc("Another post entirely"),
    });

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("jant");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.post.bodyText).toContain("jant");
  });

  it("finds posts by title", async () => {
    await postService.create({
      format: "note",
      title: "Introduction to TypeScript",
      body: tiptapDoc("Some article body"),
    });

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("TypeScript");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.post.title).toContain("TypeScript");
  });

  it("respects status filter", async () => {
    await postService.create({
      format: "note",
      body: tiptapDoc("published post about testing"),
    });
    await postService.create({
      format: "note",
      body: tiptapDoc("draft post about testing"),
      status: "draft",
    });

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("testing", {
      status: ["published"],
    });

    expect(results.every((r) => r.post.status === "published")).toBe(true);
  });

  it("excludes deleted posts", async () => {
    const post = await postService.create({
      format: "note",
      body: tiptapDoc("deleted post with unique search term xyzzy"),
    });
    await postService.delete(post.id);

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("xyzzy");
    expect(results).toHaveLength(0);
  });

  it("supports limit and offset", async () => {
    for (let i = 0; i < 5; i++) {
      await postService.create({
        format: "note",
        body: tiptapDoc(`searchable post number ${i}`),
      });
    }

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const limited = await searchService.search("searchable", { limit: 2 });
    expect(limited.length).toBeLessThanOrEqual(2);
  });

  it("finds link posts by URL", async () => {
    await postService.create({
      format: "link",
      title: "Example Site",
      url: "https://example.com/article",
    });

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("example.com");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.post.url).toContain("example.com");
  });

  it("finds posts with short queries (< 3 chars) via LIKE fallback", async () => {
    await postService.create({
      format: "note",
      body: tiptapDoc("自由软件"),
    });

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    // "自由" is 2 Chinese characters — below trigram minimum, uses LIKE
    const results = await searchService.search("自由");
    expect(results.length).toBeGreaterThanOrEqual(1);
    // LIKE fallback returns no snippet
    expect(results[0]?.snippet).toBeUndefined();
  });

  it("does not match TipTap JSON structural tokens", async () => {
    await postService.create({
      format: "note",
      body: tiptapDoc("Hello world"),
    });

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    // "paragraph" is a JSON key in TipTap but not user content
    const results = await searchService.search("paragraph");
    expect(results).toHaveLength(0);
  });
});
