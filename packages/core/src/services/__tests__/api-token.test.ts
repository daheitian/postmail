import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestDatabase,
  DEFAULT_TEST_SITE_ID,
} from "../../__tests__/helpers/db.js";
import { createApiTokenService } from "../api-token.js";
import type { Database } from "../../db/index.js";

describe("ApiTokenService", () => {
  let db: Database;
  let service: ReturnType<typeof createApiTokenService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    service = createApiTokenService(db, DEFAULT_TEST_SITE_ID);
  });

  describe("create", () => {
    it("returns a token with jnt_ prefix and metadata", async () => {
      const { token, plaintext } = await service.create("Test Token");

      expect(plaintext).toMatch(/^jnt_[0-9a-f]{64}$/);
      expect(token.name).toBe("Test Token");
      expect(token.prefix).toHaveLength(8);
      expect(token.lastUsedAt).toBeNull();
      expect(token.createdAt).toBeGreaterThan(0);
      expect(token.updatedAt).toBeGreaterThan(0);
      expect(token.id).toBeTruthy();
    });

    it("does not expose tokenHash in the returned entity", async () => {
      const { token } = await service.create("Test");

      expect(token).not.toHaveProperty("tokenHash");
    });

    it("generates unique tokens each time", async () => {
      const { plaintext: t1 } = await service.create("Token 1");
      const { plaintext: t2 } = await service.create("Token 2");

      expect(t1).not.toBe(t2);
    });
  });

  describe("list", () => {
    it("returns empty array when no tokens exist", async () => {
      const tokens = await service.list();
      expect(tokens).toEqual([]);
    });

    it("returns all created tokens", async () => {
      await service.create("Token A");
      await service.create("Token B");

      const tokens = await service.list();
      expect(tokens).toHaveLength(2);
      expect(tokens[0]?.name).toBe("Token A");
      expect(tokens[1]?.name).toBe("Token B");
    });

    it("does not include tokenHash in listed tokens", async () => {
      await service.create("Token");

      const tokens = await service.list();
      expect(tokens[0]).not.toHaveProperty("tokenHash");
    });
  });

  describe("verify", () => {
    it("returns token ID for valid token", async () => {
      const { token, plaintext } = await service.create("Test");

      const result = await service.verify(plaintext);
      expect(result).toBe(token.id);
    });

    it("returns null for invalid token", async () => {
      await service.create("Test");

      const result = await service.verify("jnt_" + "0".repeat(64));
      expect(result).toBeNull();
    });

    it("returns null for token without jnt_ prefix", async () => {
      const result = await service.verify("invalid_token");
      expect(result).toBeNull();
    });

    it("returns null for empty string", async () => {
      const result = await service.verify("");
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true when token exists", async () => {
      const { token } = await service.create("Test");

      const result = await service.delete(token.id);
      expect(result).toBe(true);
    });

    it("returns false when token does not exist", async () => {
      const result = await service.delete("nonexistent-id");
      expect(result).toBe(false);
    });

    it("prevents verification of deleted token", async () => {
      const { token, plaintext } = await service.create("Test");
      await service.delete(token.id);

      const result = await service.verify(plaintext);
      expect(result).toBeNull();
    });

    it("removes token from list", async () => {
      const { token } = await service.create("Test");
      await service.delete(token.id);

      const tokens = await service.list();
      expect(tokens).toHaveLength(0);
    });
  });

  describe("updateLastUsed", () => {
    it("updates the lastUsedAt timestamp", async () => {
      const { token } = await service.create("Test");
      expect(token.lastUsedAt).toBeNull();

      await service.updateLastUsed(token.id);

      const tokens = await service.list();
      const updated = tokens.find((t) => t.id === token.id);
      expect(updated?.lastUsedAt).toBeGreaterThan(0);
    });
  });
});
