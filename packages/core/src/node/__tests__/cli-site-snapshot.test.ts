import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalDriver } from "../../lib/storage.js";
import { migrate } from "../runtime.js";
import type { Bindings } from "../../types.js";

describe("jant site snapshot export/import", () => {
  const tempDirs: string[] = [];
  const originalEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH,
  };

  afterEach(async () => {
    if (originalEnv.DATABASE_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalEnv.DATABASE_URL;
    }

    if (originalEnv.LOCAL_STORAGE_PATH === undefined) {
      delete process.env.LOCAL_STORAGE_PATH;
    } else {
      process.env.LOCAL_STORAGE_PATH = originalEnv.LOCAL_STORAGE_PATH;
    }

    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
    vi.restoreAllMocks();
  });

  it("round-trips a content snapshot while preserving ids and storage keys", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-site-snapshot-"));
    tempDirs.push(root);

    const sourceDbPath = join(root, "source.sqlite");
    const sourceStoragePath = join(root, "source-media");
    const targetDbPath = join(root, "target.sqlite");
    const targetStoragePath = join(root, "target-media");
    const snapshotPath = join(root, "snapshot");

    migrate({ DATABASE_URL: `file:${sourceDbPath}` } as Bindings);
    migrate({ DATABASE_URL: `file:${targetDbPath}` } as Bindings);

    const sourceStorage = createLocalDriver({ rootPath: sourceStoragePath });
    const targetStorage = createLocalDriver({ rootPath: targetStoragePath });

    await sourceStorage.put(
      "media/2026/03/sample.png",
      new Uint8Array([1, 2, 3, 4]),
      { contentType: "image/png" },
    );
    await sourceStorage.put(
      "media/2026/03/sample-poster.webp",
      new Uint8Array([9, 8, 7, 6]),
      { contentType: "image/webp" },
    );
    await sourceStorage.put("media/avatar.png", new Uint8Array([3, 3, 3]), {
      contentType: "image/png",
    });
    await sourceStorage.put(
      "favicon/apple-touch-icon.png",
      new Uint8Array([4, 4, 4]),
      { contentType: "image/png" },
    );

    const sourceSqlite = new Database(sourceDbPath);
    const targetSqlite = new Database(targetDbPath);

    try {
      sourceSqlite.exec(`
        INSERT INTO "setting" ("key", "value", "updated_at") VALUES
          ('SITE_NAME', 'Snapshot Source', 1774009200),
          ('CUSTOM_CSS', 'body { color: red; }', 1774009201),
          ('SITE_AVATAR', 'media/avatar.png', 1774009202),
          ('SITE_FAVICON_APPLE_TOUCH', 'favicon/apple-touch-icon.png', 1774009203),
          ('SITE_FAVICON_ICO', 'ZmFrZS1pY28=', 1774009204),
          ('SITE_FAVICON_VERSION', '20260321010101', 1774009205),
          ('ONBOARDING_STATUS', 'pending', 1774009206),
          ('PASSWORD_RESET_TOKEN', 'source-reset-token', 1774009207);

        INSERT INTO "collection" ("id", "title", "description", "sort_order", "created_at", "updated_at")
        VALUES ('019cfd70-0000-7000-8000-000000000001', 'Walks', 'Morning routes', 'newest', 1774009200, 1774009200);

        INSERT INTO "nav_item" ("id", "type", "system_key", "label", "url", "position", "created_at", "updated_at")
        VALUES ('019cfd70-0000-7000-8000-000000000002', 'link', NULL, 'Archive', '/archive', 'a0', 1774009200, 1774009200);

        INSERT INTO "collection_directory_item" ("id", "type", "collection_id", "label", "position", "created_at", "updated_at")
        VALUES ('019cfd70-0000-7000-8000-000000000003', 'collection', '019cfd70-0000-7000-8000-000000000001', NULL, 'a0', 1774009200, 1774009200);

        INSERT INTO "post" (
          "id", "format", "status", "visibility", "title", "body", "body_html", "body_text",
          "thread_id", "published_at", "last_activity_at", "created_at", "updated_at"
        ) VALUES (
          '019cfd70-0000-7000-8000-000000000010', 'note', 'published', 'public',
          'Snapshot post', 'Hello snapshot', '<p>Hello snapshot</p>', 'Hello snapshot',
          '019cfd70-0000-7000-8000-000000000010', 1774009200, 1774009200, 1774009200, 1774009200
        );

        INSERT INTO "post_collection" ("post_id", "collection_id", "created_at")
        VALUES ('019cfd70-0000-7000-8000-000000000010', '019cfd70-0000-7000-8000-000000000001', 1774009200);

        INSERT INTO "path_registry" (
          "id", "path", "kind", "post_id", "collection_id", "redirect_to_path", "redirect_type", "created_at", "updated_at"
        ) VALUES (
          '019cfd70-0000-7000-8000-000000000011', 'snapshot-post', 'slug',
          '019cfd70-0000-7000-8000-000000000010', NULL, NULL, NULL, 1774009200, 1774009200
        );

        INSERT INTO "media" (
          "id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key",
          "provider", "width", "height", "alt", "position", "poster_key", "media_kind",
          "created_at", "updated_at"
        ) VALUES (
          '019cfd70-0000-7000-8000-000000000012', '019cfd70-0000-7000-8000-000000000010',
          'sample.png', 'sample.png', 'image/png', 4, 'media/2026/03/sample.png',
          'local', 1, 1, 'Sample alt', 'a0', 'media/2026/03/sample-poster.webp', 'image',
          1774009200, 1774009200
        );
      `);

      targetSqlite.exec(`
        INSERT INTO "setting" ("key", "value", "updated_at") VALUES
          ('SITE_NAME', 'Old Target', 1774009100),
          ('ONBOARDING_STATUS', 'completed', 1774009101),
          ('PASSWORD_RESET_TOKEN', 'target-reset-token', 1774009102);

        INSERT INTO "post" (
          "id", "format", "status", "visibility", "title", "body", "body_html", "body_text",
          "thread_id", "published_at", "last_activity_at", "created_at", "updated_at"
        ) VALUES (
          '019cfd70-0000-7000-8000-000000000099', 'note', 'published', 'public',
          'Old post', 'Old body', '<p>Old body</p>', 'Old body',
          '019cfd70-0000-7000-8000-000000000099', 1774009100, 1774009100, 1774009100, 1774009100
        );

        INSERT INTO "path_registry" (
          "id", "path", "kind", "post_id", "collection_id", "redirect_to_path", "redirect_type", "created_at", "updated_at"
        ) VALUES (
          '019cfd70-0000-7000-8000-000000000098', 'old-post', 'slug',
          '019cfd70-0000-7000-8000-000000000099', NULL, NULL, NULL, 1774009100, 1774009100
        );

        INSERT INTO "media" (
          "id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key",
          "provider", "position", "media_kind", "created_at", "updated_at"
        ) VALUES (
          '019cfd70-0000-7000-8000-000000000097', '019cfd70-0000-7000-8000-000000000099',
          'old.png', 'old.png', 'image/png', 3, 'media/old.png',
          'local', 'a0', 'image', 1774009100, 1774009100
        );
      `);
    } finally {
      sourceSqlite.close();
      targetSqlite.close();
    }

    await targetStorage.put("media/old.png", new Uint8Array([7, 7, 7]), {
      contentType: "image/png",
    });

    process.env.DATABASE_URL = `file:${sourceDbPath}`;
    process.env.LOCAL_STORAGE_PATH = sourceStoragePath;

    const exportLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { run: runExport } =
      await import("../../../bin/commands/site/snapshot/export.js");
    await runExport(["--output", snapshotPath]);

    const manifest = JSON.parse(
      await readFile(join(snapshotPath, "storage-manifest.json"), "utf-8"),
    );
    expect(manifest.objects.map((object) => object.key)).toEqual([
      "favicon/apple-touch-icon.png",
      "media/2026/03/sample-poster.webp",
      "media/2026/03/sample.png",
      "media/avatar.png",
    ]);
    expect(exportLogSpy).toHaveBeenCalledWith(
      `Exported Node SQLite snapshot to ${snapshotPath}`,
    );

    process.env.DATABASE_URL = `file:${targetDbPath}`;
    process.env.LOCAL_STORAGE_PATH = targetStoragePath;

    const importLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { run: runImport } =
      await import("../../../bin/commands/site/snapshot/import.js");
    await runImport(["--path", snapshotPath, "--replace"]);

    const verifySqlite = new Database(targetDbPath, { readonly: true });
    try {
      const mediaRow = verifySqlite
        .prepare(
          `
            SELECT "id", "post_id", "storage_key", "poster_key"
            FROM "media"
            WHERE "id" = '019cfd70-0000-7000-8000-000000000012'
          `,
        )
        .get() as
        | {
            id: string;
            post_id: string;
            poster_key: string;
            storage_key: string;
          }
        | undefined;
      expect(mediaRow).toEqual({
        id: "019cfd70-0000-7000-8000-000000000012",
        post_id: "019cfd70-0000-7000-8000-000000000010",
        storage_key: "media/2026/03/sample.png",
        poster_key: "media/2026/03/sample-poster.webp",
      });

      const siteName = verifySqlite
        .prepare(`SELECT "value" FROM "setting" WHERE "key" = 'SITE_NAME'`)
        .pluck()
        .get();
      expect(siteName).toBe("Snapshot Source");

      const onboardingStatus = verifySqlite
        .prepare(
          `SELECT "value" FROM "setting" WHERE "key" = 'ONBOARDING_STATUS'`,
        )
        .pluck()
        .get();
      expect(onboardingStatus).toBe("completed");

      const resetToken = verifySqlite
        .prepare(
          `SELECT "value" FROM "setting" WHERE "key" = 'PASSWORD_RESET_TOKEN'`,
        )
        .pluck()
        .get();
      expect(resetToken).toBe("target-reset-token");

      const oldMediaCount = verifySqlite
        .prepare(
          `SELECT COUNT(*) FROM "media" WHERE "id" = '019cfd70-0000-7000-8000-000000000097'`,
        )
        .pluck()
        .get();
      expect(oldMediaCount).toBe(0);
    } finally {
      verifySqlite.close();
    }

    const importedMedia = await targetStorage.get("media/2026/03/sample.png");
    expect(importedMedia?.size).toBe(4);
    expect(importedMedia?.contentType).toBe("image/png");

    const importedPoster = await targetStorage.get(
      "media/2026/03/sample-poster.webp",
    );
    expect(importedPoster?.contentType).toBe("image/webp");

    const importedAvatar = await targetStorage.get("media/avatar.png");
    expect(importedAvatar?.contentType).toBe("image/png");

    const importedAppleTouch = await targetStorage.get(
      "favicon/apple-touch-icon.png",
    );
    expect(importedAppleTouch?.contentType).toBe("image/png");

    const removedOldObject = await targetStorage.get("media/old.png");
    expect(removedOldObject).toBeNull();

    expect(importLogSpy).toHaveBeenCalledWith(
      `Imported snapshot from ${snapshotPath}`,
    );
  });

  it("requires --replace for snapshot import", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-site-snapshot-replace-"));
    tempDirs.push(root);

    const snapshotPath = join(root, "snapshot");
    process.env.DATABASE_URL = `file:${join(root, "jant.sqlite")}`;
    process.env.LOCAL_STORAGE_PATH = join(root, "media");

    await rm(snapshotPath, { recursive: true, force: true });
    await mkdir(snapshotPath, { recursive: true });
    await Promise.all([
      writeFile(
        join(snapshotPath, "meta.json"),
        JSON.stringify(
          {
            format: "jant-site-snapshot",
            version: 1,
            scope: "content",
          },
          null,
          2,
        ),
      ),
      writeFile(
        join(snapshotPath, "storage-manifest.json"),
        JSON.stringify({ version: 1, objects: [] }, null, 2),
      ),
      writeFile(join(snapshotPath, "db.sql"), ""),
    ]);

    const { run: runImport } =
      await import("../../../bin/commands/site/snapshot/import.js");

    await expect(runImport(["--path", snapshotPath])).rejects.toThrow(
      "Snapshot import currently requires --replace to avoid partial merge semantics.",
    );
  });
});
