import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createSearchService } from "../search.js";
import { createPostService } from "../post.js";
import { createPathRegistryService } from "../path-registry.js";
import type { Database } from "../../db/index.js";
import type BetterSqlite3 from "better-sqlite3";

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
      body: "Hello world from jant",
    });
    await postService.create({
      format: "note",
      body: "Another post entirely",
    });

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const results = await searchService.search("jant");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.post.body).toContain("jant");
  });

  it("finds posts by title", async () => {
    await postService.create({
      format: "note",
      title: "Introduction to TypeScript",
      body: "Some article body",
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
      body: "published post about testing",
    });
    await postService.create({
      format: "note",
      body: "draft post about testing",
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
      body: "deleted post with unique search term xyzzy",
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
        body: `searchable post number ${i}`,
      });
    }

    const d1 = createMockD1(sqlite);
    const searchService = createSearchService(d1);

    const limited = await searchService.search("searchable", { limit: 2 });
    expect(limited.length).toBeLessThanOrEqual(2);
  });
});
