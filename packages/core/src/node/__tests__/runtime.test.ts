import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
  migrate,
  resolveDatabasePath,
  resolvePublicRequestUrl,
} from "../runtime.js";
import type { Bindings } from "../../types.js";

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
      /file:/,
    );
  });
});

describe("resolvePublicRequestUrl", () => {
  it("uses JANT_SITE_URL as the canonical host and protocol", () => {
    const url = resolvePublicRequestUrl(
      new Request("http://127.0.0.1:3000/posts/test?draft=1"),
      {
        JANT_SITE_URL: "https://blog.example.com",
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
        JANT_TRUST_PROXY: "true",
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
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("creates the SQLite database and applies migrations", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-node-migrate-"));
    tempDirs.push(root);
    const databasePath = join(root, "data", "jant.sqlite");

    migrate({
      DATABASE_URL: `file:${databasePath}`,
    } as Bindings);

    await access(databasePath);
    const sqlite = new Database(databasePath, { readonly: true });
    try {
      const hasSettingsTable = sqlite
        .prepare(
          `
            SELECT 1
            FROM sqlite_master
            WHERE type = 'table' AND name = 'setting'
            LIMIT 1
          `,
        )
        .pluck()
        .get();

      expect(hasSettingsTable).toBe(1);
    } finally {
      sqlite.close();
    }
  });
});
