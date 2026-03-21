import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
  createNodeRequestHandler,
  migrate,
  resolveNodeAssetRoot,
  resolveNodeDataDir,
  resolveDatabasePath,
  resolvePublicRequestUrl,
} from "../runtime.js";
import type { Bindings } from "../../types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});

describe("resolveDatabasePath", () => {
  it("resolves relative file URLs against the current working directory", () => {
    const path = resolveDatabasePath("file:./data/jant.sqlite", "/srv/jant");
    expect(path).toBe("/srv/jant/data/jant.sqlite");
  });

  it("accepts absolute file URLs", () => {
    const path = resolveDatabasePath("file:/var/lib/jant/jant.sqlite");
    expect(path).toBe("/var/lib/jant/jant.sqlite");
  });

  it("rejects non-file database URLs", () => {
    expect(() => resolveDatabasePath("postgres://localhost/jant")).toThrow(
      /SQLite DATABASE_URL/,
    );
  });
});

describe("resolveNodeDataDir", () => {
  it("resolves DATA_DIR relative to the current working directory", () => {
    expect(
      resolveNodeDataDir({ DATA_DIR: "./data" } as Bindings, {
        cwd: "/srv/jant",
      }),
    ).toBe("/srv/jant/data");
  });
});

describe("resolveNodeAssetRoot", () => {
  it("resolves the built _assets directory for Node bundles", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-node-assets-"));
    tempDirs.push(root);
    const assetRoot = join(root, "dist", "client", "_assets");
    await mkdir(assetRoot, { recursive: true });
    await writeFile(join(assetRoot, "client.css"), "body{}");

    expect(
      resolveNodeAssetRoot(pathToFileURL(join(root, "dist", "node.js")).href),
    ).toBe(assetRoot);
  });

  it("serves built asset files from the root public asset path", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-node-assets-server-"));
    tempDirs.push(root);
    const assetRoot = join(root, "dist", "client", "_assets");
    const databasePath = join(root, "data", "jant.sqlite");
    await mkdir(assetRoot, { recursive: true });
    await writeFile(join(assetRoot, "client.css"), "body{}");
    await migrate({
      DATABASE_URL: `file:${databasePath}`,
    } as Bindings);

    const handler = await createNodeRequestHandler({
      assetRoot,
      env: {
        DATABASE_URL: `file:${databasePath}`,
      } as Bindings,
    });

    try {
      const response = await handler.fetch(
        new Request("http://127.0.0.1:3000/_assets/client.css"),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        "text/css; charset=utf-8",
      );
      expect(await response.text()).toBe("body{}");
    } finally {
      await handler.close();
    }
  });

  it("serves built asset files from a prefixed public asset path", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-node-assets-subpath-"));
    tempDirs.push(root);
    const assetRoot = join(root, "dist", "client", "_assets");
    const databasePath = join(root, "data", "jant.sqlite");
    await mkdir(assetRoot, { recursive: true });
    await writeFile(join(assetRoot, "client.css"), "body{}");
    await migrate({
      DATABASE_URL: `file:${databasePath}`,
    } as Bindings);

    const handler = await createNodeRequestHandler({
      assetRoot,
      env: {
        DATABASE_URL: `file:${databasePath}`,
        SITE_URL: "https://example.com/blog",
      } as Bindings,
    });

    try {
      const response = await handler.fetch(
        new Request("http://127.0.0.1:3000/blog/_assets/client.css"),
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("body{}");
    } finally {
      await handler.close();
    }
  });
});

describe("resolvePublicRequestUrl", () => {
  it("uses SITE_URL as the canonical host and protocol", () => {
    const url = resolvePublicRequestUrl(
      new Request("http://127.0.0.1:3000/posts/test?draft=1"),
      {
        SITE_URL: "https://blog.example.com",
      } as Bindings,
    );

    expect(url).toBe("https://blog.example.com/posts/test?draft=1");
  });

  it("uses trusted proxy headers when enabled", () => {
    const url = resolvePublicRequestUrl(
      new Request("http://127.0.0.1:3000/posts/test", {
        headers: {
          "x-forwarded-host": "jant.example.com",
          "x-forwarded-proto": "https",
        },
      }),
      {
        TRUST_PROXY: "true",
      } as Bindings,
    );

    expect(url).toBe("https://jant.example.com/posts/test");
  });

  it("ignores proxy headers when trust is disabled", () => {
    const url = resolvePublicRequestUrl(
      new Request("http://127.0.0.1:3000/posts/test", {
        headers: {
          "x-forwarded-host": "jant.example.com",
          "x-forwarded-proto": "https",
        },
      }),
      {} as Bindings,
    );

    expect(url).toBe("http://127.0.0.1:3000/posts/test");
  });
});

describe("migrate", () => {
  it("creates the SQLite database and applies migrations", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-node-migrate-"));
    tempDirs.push(root);
    const databasePath = join(root, "data", "jant.sqlite");

    await migrate({
      DATABASE_URL: `file:${databasePath}`,
    } as Bindings);

    await access(databasePath);
    const sqlite = new Database(databasePath, { readonly: true });
    try {
      const hasSiteTable = sqlite
        .prepare(
          `
            SELECT 1
            FROM sqlite_master
            WHERE type = 'table' AND name = 'site'
            LIMIT 1
          `,
        )
        .pluck()
        .get();
      const hasSiteSettingsTable = sqlite
        .prepare(
          `
            SELECT 1
            FROM sqlite_master
            WHERE type = 'table' AND name = 'site_setting'
            LIMIT 1
          `,
        )
        .pluck()
        .get();

      expect(hasSiteTable).toBe(1);
      expect(hasSiteSettingsTable).toBe(1);
    } finally {
      sqlite.close();
    }
  });

  it("derives the SQLite path from DATA_DIR when DATABASE_URL is unset", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-node-data-dir-"));
    tempDirs.push(root);
    const dataDir = join(root, "data");
    const databasePath = join(dataDir, "jant.sqlite");

    await migrate({
      DATA_DIR: dataDir,
    } as Bindings);

    await access(databasePath);
  });
});
