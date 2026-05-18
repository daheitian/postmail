import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestDatabase,
  DEFAULT_TEST_SITE_ID,
} from "../../__tests__/helpers/db.js";
import type { Database } from "../../db/index.js";
import { createTelegramService, type TelegramService } from "../telegram.js";

const SECOND_SITE_ID = "sit_second00000000000000000000000";
const BOT_ID = "111111";
const USER_ID = "999999";

function insertSecondSite(
  sqlite: ReturnType<typeof createTestDatabase>["sqlite"],
): void {
  const timestamp = Math.floor(Date.now() / 1000);
  sqlite
    .prepare(
      `INSERT INTO site (id, key, status, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?)`,
    )
    .run(SECOND_SITE_ID, "second", timestamp, timestamp);
}

describe("TelegramService", () => {
  let db: Database;
  let sqlite: ReturnType<typeof createTestDatabase>["sqlite"];
  let service: TelegramService;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    sqlite = testDb.sqlite;
    insertSecondSite(sqlite);
    service = createTelegramService(db, DEFAULT_TEST_SITE_ID);
  });

  it("reports an empty status for a fresh site", async () => {
    const status = await service.getStatus();
    expect(status.binding).toBeNull();
    expect(status.userBot).toBeNull();
  });

  it("reuses an existing code via getOrCreateCode", async () => {
    const first = await service.getOrCreateCode();
    const second = await service.getOrCreateCode();
    expect(second).toBe(first);
  });

  it("replaces the code on generateCode", async () => {
    const first = await service.getOrCreateCode();
    const next = await service.generateCode();
    expect(next).not.toBe(first);
    expect(await service.resolvePendingCode(first)).toBeNull();
    expect(await service.resolvePendingCode(next)).toEqual({
      siteId: DEFAULT_TEST_SITE_ID,
    });
  });

  it("resolves a pending code to its site", async () => {
    const code = await service.getOrCreateCode();
    expect(await service.resolvePendingCode(code)).toEqual({
      siteId: DEFAULT_TEST_SITE_ID,
    });
  });

  it("returns null for an unknown code", async () => {
    expect(await service.resolvePendingCode("nope")).toBeNull();
  });

  it("treats an expired code as unknown", async () => {
    const code = await service.getOrCreateCode();
    sqlite
      .prepare(
        `UPDATE telegram_pending_binding SET expires_at = ? WHERE code = ?`,
      )
      .run(1, code);
    expect(await service.resolvePendingCode(code)).toBeNull();
  });

  it("binds an account and surfaces it in status", async () => {
    await service.getOrCreateCode();
    const binding = await service.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: USER_ID,
      telegramUsername: "alice",
    });
    expect(binding.siteId).toBe(DEFAULT_TEST_SITE_ID);

    const status = await service.getStatus();
    expect(status.binding).toMatchObject({
      botId: BOT_ID,
      telegramUserId: USER_ID,
      telegramUsername: "alice",
    });

    // The pending code is consumed on bind.
    const found = await service.findBindingByUser(BOT_ID, USER_ID);
    expect(found?.siteId).toBe(DEFAULT_TEST_SITE_ID);
  });

  it("moves a binding to a new site on rebind (last-write-wins)", async () => {
    await service.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: USER_ID,
      telegramUsername: "alice",
    });
    await service.bindAccount({
      siteId: SECOND_SITE_ID,
      botId: BOT_ID,
      telegramUserId: USER_ID,
      telegramUsername: "alice",
    });

    const found = await service.findBindingByUser(BOT_ID, USER_ID);
    expect(found?.siteId).toBe(SECOND_SITE_ID);

    // The first site no longer has a binding.
    const firstSiteService = createTelegramService(db, DEFAULT_TEST_SITE_ID);
    expect((await firstSiteService.getStatus()).binding).toBeNull();
  });

  it("records the last processed update id", async () => {
    const binding = await service.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: USER_ID,
      telegramUsername: null,
    });
    await service.markUpdateProcessed(binding.id, 42);
    const found = await service.findBindingByUser(BOT_ID, USER_ID);
    expect(found?.lastUpdateId).toBe(42);
  });

  it("disconnects the active binding", async () => {
    await service.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: USER_ID,
      telegramUsername: null,
    });
    await service.disconnect();
    expect((await service.getStatus()).binding).toBeNull();
    expect(await service.findBindingByUser(BOT_ID, USER_ID)).toBeNull();
  });
});
