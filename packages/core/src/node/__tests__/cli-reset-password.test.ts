import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../../../bin/commands/reset-password.js";
import { migrate } from "../runtime.js";
import type { Bindings } from "../../types.js";

describe("jant reset-password", () => {
  const tempDirs: string[] = [];
  const originalEnv = process.env.DATABASE_URL;

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalEnv;
    }

    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
    vi.restoreAllMocks();
  });

  it("writes the reset token to the Node SQLite database when DATABASE_URL is set", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-reset-password-"));
    tempDirs.push(root);

    const databasePath = join(root, "jant.sqlite");
    await migrate({ DATABASE_URL: `file:${databasePath}` } as Bindings);
    process.env.DATABASE_URL = `file:${databasePath}`;

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await run([]);

    const sqlite = new Database(databasePath, { readonly: true });
    try {
      const stored = sqlite
        .prepare(
          `
            SELECT value
            FROM "site_setting"
            WHERE "key" = 'PASSWORD_RESET_TOKEN'
          `,
        )
        .pluck()
        .get();

      expect(stored).toMatch(/^[a-f0-9]{64}:\d{10}$/);
    } finally {
      sqlite.close();
    }

    expect(logSpy).toHaveBeenCalledWith("Runtime: Node database");
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^Visit: \/reset\?token=[a-f0-9]{64}$/),
    );
  });
});
