/**
 * API Token Service
 *
 * Manages long-lived Bearer tokens for programmatic API access.
 * Tokens are stored as SHA-256 hashes — the plaintext is shown only once at creation.
 */

import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "../db/index.js";
import { apiTokens } from "../db/schema.js";
import { now } from "../lib/time.js";
import type { ApiToken } from "../types/entities.js";

const TOKEN_PREFIX = "jnt_";

export interface ApiTokenService {
  /**
   * Creates a new API token.
   *
   * @param name - User-assigned label for the token
   * @returns The created token metadata and the plaintext (shown only once)
   *
   * @example
   * ```ts
   * const { token, plaintext } = await apiTokens.create("iOS Shortcuts");
   * // plaintext: "jnt_a1b2c3d4..." — display once, never stored
   * ```
   */
  create(name: string): Promise<{ token: ApiToken; plaintext: string }>;

  /**
   * Lists all active API tokens (without hashes).
   *
   * @returns Array of tokens sorted by creation date (newest first)
   */
  list(): Promise<ApiToken[]>;

  /**
   * Deletes an API token by ID.
   *
   * @param id - Token ID (UUIDv7)
   * @returns `true` if a token was deleted, `false` if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Verifies a raw Bearer token against stored hashes.
   *
   * @param rawToken - The full token string (e.g. "jnt_a1b2c3d4...")
   * @returns The token ID if valid, `null` if invalid or not found
   */
  verify(rawToken: string): Promise<string | null>;

  /**
   * Updates the last-used timestamp for a token.
   * Intended to be called fire-and-forget after successful verification.
   *
   * @param id - Token ID (UUIDv7)
   */
  updateLastUsed(id: string): Promise<void>;
}

/**
 * Hashes a raw token string using SHA-256.
 *
 * @param raw - The raw token bytes as a hex string (without prefix)
 * @returns Hex-encoded SHA-256 hash
 */
async function hashToken(raw: string): Promise<string> {
  const encoded = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates cryptographically random hex bytes.
 *
 * @param byteCount - Number of random bytes
 * @returns Hex string of the random bytes
 */
function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toApiToken(row: typeof apiTokens.$inferSelect): ApiToken {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createApiTokenService(db: Database): ApiTokenService {
  return {
    async create(name: string) {
      const id = uuidv7();
      const timestamp = now();
      const hex = randomHex(32); // 64 hex chars
      const plaintext = `${TOKEN_PREFIX}${hex}`;
      const tokenHash = await hashToken(plaintext);
      const prefix = hex.slice(0, 8);

      const result = await db
        .insert(apiTokens)
        .values({
          id,
          name,
          tokenHash,
          prefix,
          lastUsedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns
      return { token: toApiToken(result[0]!), plaintext };
    },

    async list() {
      const rows = await db
        .select()
        .from(apiTokens)
        .orderBy(apiTokens.createdAt);
      return rows.map(toApiToken);
    },

    async delete(id: string) {
      const result = await db
        .delete(apiTokens)
        .where(eq(apiTokens.id, id))
        .returning();
      return result.length > 0;
    },

    async verify(rawToken: string) {
      if (!rawToken.startsWith(TOKEN_PREFIX)) return null;

      const tokenHash = await hashToken(rawToken);
      const rows = await db
        .select({ id: apiTokens.id })
        .from(apiTokens)
        .where(eq(apiTokens.tokenHash, tokenHash))
        .limit(1);

      return rows[0]?.id ?? null;
    },

    async updateLastUsed(id: string) {
      await db
        .update(apiTokens)
        .set({ lastUsedAt: now(), updatedAt: now() })
        .where(eq(apiTokens.id, id));
    },
  };
}
