import { describe, expect, it } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createNodeRequestRuntime } from "../node.js";
import type { Bindings } from "../../types.js";

describe("createNodeRequestRuntime", () => {
  it("builds services/auth/storage from NODE_SQLITE bindings", async () => {
    const { sqlite } = createTestDatabase({ fts: true });

    const runtime = await createNodeRequestRuntime(
      {
        NODE_SQLITE: sqlite,
        AUTH_SECRET: "test-secret",
        SITE_URL: "http://localhost:3000",
        STORAGE_DRIVER: "local",
        LOCAL_STORAGE_PATH: "/tmp/jant-node-runtime-test",
      } as Bindings,
      "http://localhost:3000/health",
    );

    expect(runtime.storage).not.toBeNull();
    expect(runtime.services.posts).toBeDefined();
    expect(runtime.auth.api).toBeDefined();
  });

  it("supports post creation through the Node runtime database adapter", async () => {
    const { sqlite } = createTestDatabase();

    const runtime = await createNodeRequestRuntime(
      {
        NODE_SQLITE: sqlite,
        AUTH_SECRET: "test-secret-with-enough-entropy-for-node-runtime",
        SITE_URL: "http://localhost:3000",
        STORAGE_DRIVER: "local",
        LOCAL_STORAGE_PATH: "/tmp/jant-node-runtime-test",
      } as Bindings,
      "http://localhost:3000/compose",
    );

    const post = await runtime.services.posts.create({
      format: "note",
      bodyMarkdown: "hello from node runtime",
    });

    expect(post.id).toBeTruthy();
    expect(post.body).toContain("hello from node runtime");
  });
});
