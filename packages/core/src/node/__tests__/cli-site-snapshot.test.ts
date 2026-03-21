import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalDriver } from "../../lib/storage.js";
import { migrate } from "../runtime.js";
import type { Bindings } from "../../types.js";

const SNAPSHOT_SITE_ID = "sit_01jpyy00bc4w2h8r7m3q5t9kda";
const SNAPSHOT_SITE_KEY = "default";
const SNAPSHOT_COLLECTION_ID = "col_01jpyy08bc4w2h8r7m3q5t9kdn";
const SNAPSHOT_NAV_ID = "nav_01jpyy0gqv4m7r2k8s5c1t9bdh";
const SNAPSHOT_DIRECTORY_ITEM_ID = "cdi_01jpyy0r6s3m8v1k5t9q2b4gcn";
const SNAPSHOT_POST_ID = "pst_01jpyy18fh4w2m7r8k3c5t9qdn";
const SNAPSHOT_PATH_ID = "pth_01jpyy1k2v6m4s8r1t5c9b3qgh";
const SNAPSHOT_MEDIA_ID = "med_01jpyy1vxh4m7s2k8r5c9t3qbn";
const SNAPSHOT_AVATAR_MEDIA_ID = "med_01jpyy1zs6m4v8r2k5t9c3b7qh";
const SNAPSHOT_MEDIA_KEY = `media/${SNAPSHOT_SITE_ID}/files/${SNAPSHOT_MEDIA_ID}.png`;
const SNAPSHOT_POSTER_KEY = `media/${SNAPSHOT_SITE_ID}/posters/${SNAPSHOT_MEDIA_ID}.webp`;
const SNAPSHOT_AVATAR_KEY = `media/${SNAPSHOT_SITE_ID}/assets/avatar/${SNAPSHOT_AVATAR_MEDIA_ID}.png`;
const SNAPSHOT_APPLE_TOUCH_KEY = `media/${SNAPSHOT_SITE_ID}/assets/favicon/apple-touch-icon.png`;
const SNAPSHOT_OLD_POST_ID = "pst_01jpyy2c4s7m8r1k5t9b3q6dgh";
const SNAPSHOT_OLD_PATH_ID = "pth_01jpyy2pbh4m6s8r1k5t9c3qgn";
const SNAPSHOT_OLD_MEDIA_ID = "med_01jpyy2z6v4m8r1k5t9c3b7qdh";
const SNAPSHOT_OLD_MEDIA_KEY = `media/${SNAPSHOT_SITE_ID}/files/${SNAPSHOT_OLD_MEDIA_ID}.png`;

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

    await migrate({ DATABASE_URL: `file:${sourceDbPath}` } as Bindings);
    await migrate({ DATABASE_URL: `file:${targetDbPath}` } as Bindings);

    const sourceStorage = createLocalDriver({ rootPath: sourceStoragePath });
    const targetStorage = createLocalDriver({ rootPath: targetStoragePath });

    await sourceStorage.put(SNAPSHOT_MEDIA_KEY, new Uint8Array([1, 2, 3, 4]), {
      contentType: "image/png",
    });
    await sourceStorage.put(SNAPSHOT_POSTER_KEY, new Uint8Array([9, 8, 7, 6]), {
      contentType: "image/webp",
    });
    await sourceStorage.put(SNAPSHOT_AVATAR_KEY, new Uint8Array([3, 3, 3]), {
      contentType: "image/png",
    });
    await sourceStorage.put(
      SNAPSHOT_APPLE_TOUCH_KEY,
      new Uint8Array([4, 4, 4]),
      {
        contentType: "image/png",
      },
    );

    const sourceSqlite = new Database(sourceDbPath);
    const targetSqlite = new Database(targetDbPath);

    try {
      sourceSqlite.exec(`
        INSERT INTO "site" ("id", "key", "status", "created_at", "updated_at")
        VALUES ('${SNAPSHOT_SITE_ID}', '${SNAPSHOT_SITE_KEY}', 'active', 1774009100, 1774009100);

        INSERT INTO "site_setting" ("site_id", "key", "value", "updated_at") VALUES
          ('${SNAPSHOT_SITE_ID}', 'SITE_NAME', 'Snapshot Source', 1774009200),
          ('${SNAPSHOT_SITE_ID}', 'CUSTOM_CSS', 'body { color: red; }', 1774009201),
          ('${SNAPSHOT_SITE_ID}', 'SITE_AVATAR', '${SNAPSHOT_AVATAR_KEY}', 1774009202),
          ('${SNAPSHOT_SITE_ID}', 'SITE_FAVICON_APPLE_TOUCH', '${SNAPSHOT_APPLE_TOUCH_KEY}', 1774009203),
          ('${SNAPSHOT_SITE_ID}', 'SITE_FAVICON_ICO', 'ZmFrZS1pY28=', 1774009204),
          ('${SNAPSHOT_SITE_ID}', 'SITE_FAVICON_VERSION', '20260321010101', 1774009205),
          ('${SNAPSHOT_SITE_ID}', 'ONBOARDING_STATUS', 'pending', 1774009206),
          ('${SNAPSHOT_SITE_ID}', 'PASSWORD_RESET_TOKEN', 'source-reset-token', 1774009207);

        INSERT INTO "collection" ("id", "site_id", "title", "description", "sort_order", "created_at", "updated_at")
        VALUES ('${SNAPSHOT_COLLECTION_ID}', '${SNAPSHOT_SITE_ID}', 'Walks', 'Morning routes', 'newest', 1774009200, 1774009200);

        INSERT INTO "nav_item" ("id", "site_id", "type", "system_key", "label", "url", "position", "created_at", "updated_at")
        VALUES ('${SNAPSHOT_NAV_ID}', '${SNAPSHOT_SITE_ID}', 'link', NULL, 'Archive', '/archive', 'a0', 1774009200, 1774009200);

        INSERT INTO "collection_directory_item" ("id", "site_id", "type", "collection_id", "label", "position", "created_at", "updated_at")
        VALUES ('${SNAPSHOT_DIRECTORY_ITEM_ID}', '${SNAPSHOT_SITE_ID}', 'collection', '${SNAPSHOT_COLLECTION_ID}', NULL, 'a0', 1774009200, 1774009200);

        INSERT INTO "post" (
          "id", "site_id", "format", "status", "visibility", "title", "body", "body_html", "body_text",
          "thread_id", "published_at", "last_activity_at", "created_at", "updated_at"
        ) VALUES (
          '${SNAPSHOT_POST_ID}', '${SNAPSHOT_SITE_ID}', 'note', 'published', 'public',
          'Snapshot post', 'Hello snapshot', '<p>Hello snapshot</p>', 'Hello snapshot',
          '${SNAPSHOT_POST_ID}', 1774009200, 1774009200, 1774009200, 1774009200
        );

        INSERT INTO "post_collection" ("site_id", "post_id", "collection_id", "created_at")
        VALUES ('${SNAPSHOT_SITE_ID}', '${SNAPSHOT_POST_ID}', '${SNAPSHOT_COLLECTION_ID}', 1774009200);

        INSERT INTO "path_registry" (
          "id", "site_id", "path", "kind", "post_id", "collection_id", "redirect_to_path", "redirect_type", "created_at", "updated_at"
        ) VALUES (
          '${SNAPSHOT_PATH_ID}', '${SNAPSHOT_SITE_ID}', 'snapshot-post', 'slug',
          '${SNAPSHOT_POST_ID}', NULL, NULL, NULL, 1774009200, 1774009200
        );

        INSERT INTO "media" (
          "id", "site_id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key",
          "provider", "width", "height", "alt", "position", "poster_key", "media_kind",
          "created_at", "updated_at"
        ) VALUES (
          '${SNAPSHOT_MEDIA_ID}', '${SNAPSHOT_SITE_ID}', '${SNAPSHOT_POST_ID}',
          '${SNAPSHOT_MEDIA_ID}.png', 'sample.png', 'image/png', 4, '${SNAPSHOT_MEDIA_KEY}',
          'local', 1, 1, 'Sample alt', 'a0', '${SNAPSHOT_POSTER_KEY}', 'image',
          1774009200, 1774009200
        );
      `);

      targetSqlite.exec(`
        INSERT INTO "site" ("id", "key", "status", "created_at", "updated_at")
        VALUES ('${SNAPSHOT_SITE_ID}', '${SNAPSHOT_SITE_KEY}', 'active', 1774009000, 1774009000);

        INSERT INTO "site_setting" ("site_id", "key", "value", "updated_at") VALUES
          ('${SNAPSHOT_SITE_ID}', 'SITE_NAME', 'Old Target', 1774009100),
          ('${SNAPSHOT_SITE_ID}', 'ONBOARDING_STATUS', 'completed', 1774009101),
          ('${SNAPSHOT_SITE_ID}', 'PASSWORD_RESET_TOKEN', 'target-reset-token', 1774009102);

        INSERT INTO "post" (
          "id", "site_id", "format", "status", "visibility", "title", "body", "body_html", "body_text",
          "thread_id", "published_at", "last_activity_at", "created_at", "updated_at"
        ) VALUES (
          '${SNAPSHOT_OLD_POST_ID}', '${SNAPSHOT_SITE_ID}', 'note', 'published', 'public',
          'Old post', 'Old body', '<p>Old body</p>', 'Old body',
          '${SNAPSHOT_OLD_POST_ID}', 1774009100, 1774009100, 1774009100, 1774009100
        );

        INSERT INTO "path_registry" (
          "id", "site_id", "path", "kind", "post_id", "collection_id", "redirect_to_path", "redirect_type", "created_at", "updated_at"
        ) VALUES (
          '${SNAPSHOT_OLD_PATH_ID}', '${SNAPSHOT_SITE_ID}', 'old-post', 'slug',
          '${SNAPSHOT_OLD_POST_ID}', NULL, NULL, NULL, 1774009100, 1774009100
        );

        INSERT INTO "media" (
          "id", "site_id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key",
          "provider", "position", "media_kind", "created_at", "updated_at"
        ) VALUES (
          '${SNAPSHOT_OLD_MEDIA_ID}', '${SNAPSHOT_SITE_ID}', '${SNAPSHOT_OLD_POST_ID}',
          '${SNAPSHOT_OLD_MEDIA_ID}.png', 'old.png', 'image/png', 3, '${SNAPSHOT_OLD_MEDIA_KEY}',
          'local', 'a0', 'image', 1774009100, 1774009100
        );
      `);
    } finally {
      sourceSqlite.close();
      targetSqlite.close();
    }

    await targetStorage.put(SNAPSHOT_OLD_MEDIA_KEY, new Uint8Array([7, 7, 7]), {
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
      SNAPSHOT_AVATAR_KEY,
      SNAPSHOT_APPLE_TOUCH_KEY,
      SNAPSHOT_MEDIA_KEY,
      SNAPSHOT_POSTER_KEY,
    ]);
    expect(exportLogSpy).toHaveBeenCalledWith(
      `Exported Node database snapshot to ${snapshotPath}`,
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
            WHERE "id" = '${SNAPSHOT_MEDIA_ID}'
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
        id: SNAPSHOT_MEDIA_ID,
        post_id: SNAPSHOT_POST_ID,
        storage_key: SNAPSHOT_MEDIA_KEY,
        poster_key: SNAPSHOT_POSTER_KEY,
      });

      const siteName = verifySqlite
        .prepare(
          `SELECT "value" FROM "site_setting" WHERE "site_id" = '${SNAPSHOT_SITE_ID}' AND "key" = 'SITE_NAME'`,
        )
        .pluck()
        .get();
      expect(siteName).toBe("Snapshot Source");

      const onboardingStatus = verifySqlite
        .prepare(
          `SELECT "value" FROM "site_setting" WHERE "site_id" = '${SNAPSHOT_SITE_ID}' AND "key" = 'ONBOARDING_STATUS'`,
        )
        .pluck()
        .get();
      expect(onboardingStatus).toBe("completed");

      const resetToken = verifySqlite
        .prepare(
          `SELECT "value" FROM "site_setting" WHERE "site_id" = '${SNAPSHOT_SITE_ID}' AND "key" = 'PASSWORD_RESET_TOKEN'`,
        )
        .pluck()
        .get();
      expect(resetToken).toBe("target-reset-token");

      const oldMediaCount = verifySqlite
        .prepare(
          `SELECT COUNT(*) FROM "media" WHERE "id" = '${SNAPSHOT_OLD_MEDIA_ID}'`,
        )
        .pluck()
        .get();
      expect(oldMediaCount).toBe(0);
    } finally {
      verifySqlite.close();
    }

    const importedMedia = await targetStorage.get(SNAPSHOT_MEDIA_KEY);
    expect(importedMedia?.size).toBe(4);
    expect(importedMedia?.contentType).toBe("image/png");

    const importedPoster = await targetStorage.get(SNAPSHOT_POSTER_KEY);
    expect(importedPoster?.contentType).toBe("image/webp");

    const importedAvatar = await targetStorage.get(SNAPSHOT_AVATAR_KEY);
    expect(importedAvatar?.contentType).toBe("image/png");

    const importedAppleTouch = await targetStorage.get(
      SNAPSHOT_APPLE_TOUCH_KEY,
    );
    expect(importedAppleTouch?.contentType).toBe("image/png");

    const removedOldObject = await targetStorage.get(SNAPSHOT_OLD_MEDIA_KEY);
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
