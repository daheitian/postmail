/**
 * Auth Service
 *
 * Handles authentication-related business logic:
 * password reset token validation, password updates, session management,
 * and account deletion with full data wipe.
 */

import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import {
  user,
  account,
  session,
  verification,
  media,
  collections,
  postCollections,
  pathRegistry,
  sidebarItems,
  navItems,
  settings as settingsTable,
  apiTokens,
} from "../db/schema.js";
import type { SettingsService } from "./settings.js";
import type { StorageDriver } from "../lib/storage.js";
import { SETTINGS_KEYS } from "../lib/constants.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";
import { hashPassword } from "../lib/password.js";

/** Dependencies for account deletion */
export interface DeleteAccountDeps {
  storage?: StorageDriver | null;
}

export interface AuthService {
  /**
   * Validate a password reset token against the stored value.
   *
   * @param token - The reset token from the URL
   * @returns true if the token is valid and not expired
   */
  validateResetToken(token: string): Promise<boolean>;

  /**
   * Reset the admin user's password.
   *
   * Validates the token, hashes the new password, updates the account,
   * clears all sessions, and removes the reset token.
   *
   * @param token - The reset token (re-validated to prevent TOCTOU)
   * @param newPassword - The new plaintext password
   * @throws {ValidationError} if token is invalid or expired
   * @throws {NotFoundError} if no user account exists
   */
  resetPassword(token: string, newPassword: string): Promise<void>;

  /**
   * Generate a short-lived CSRF token for account deletion.
   * Stores the hash + expiry in settings and returns the plaintext.
   *
   * @returns The plaintext CSRF token to embed in the page
   */
  generateDeleteCsrfToken(): Promise<string>;

  /**
   * Validate a CSRF token for account deletion.
   *
   * @param token - The plaintext CSRF token from the form
   * @returns true if valid and not expired
   */
  validateDeleteCsrfToken(token: string): Promise<boolean>;

  /**
   * Delete all user data and reset the blog to its initial state.
   * Removes all posts, media, collections, settings, auth data, etc.
   * Optionally cleans up storage files.
   *
   * @param deps - Optional storage driver for file cleanup
   */
  deleteAllData(deps?: DeleteAccountDeps): Promise<void>;
}

export function createAuthService(
  db: Database,
  settings: SettingsService,
): AuthService {
  async function validateResetToken(token: string): Promise<boolean> {
    const stored = await settings.get(SETTINGS_KEYS.PASSWORD_RESET_TOKEN);
    if (!stored) return false;

    const separatorIndex = stored.lastIndexOf(":");
    const storedHash = stored.substring(0, separatorIndex);
    const expiry = parseInt(stored.substring(separatorIndex + 1), 10);
    const now = Math.floor(Date.now() / 1000);

    if (now > expiry) return false;

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const encoder = new TextEncoder();
    const a = encoder.encode(tokenHash);
    const b = encoder.encode(storedHash);
    if (a.byteLength !== b.byteLength) return false;

    return crypto.subtle.timingSafeEqual(a, b);
  }

  async function hashToken(token: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return {
    validateResetToken,

    async resetPassword(token, newPassword) {
      const isValid = await validateResetToken(token);
      if (!isValid) {
        throw new ValidationError("Invalid or expired reset token");
      }

      const hashedPw = await hashPassword(newPassword);

      // Get admin user (single-author system)
      const userResult = await db.select({ id: user.id }).from(user).limit(1);
      if (!userResult[0]) {
        throw new NotFoundError("User account");
      }
      const userId = userResult[0].id;

      // Update password
      await db
        .update(account)
        .set({ password: hashedPw })
        .where(
          and(eq(account.userId, userId), eq(account.providerId, "credential")),
        );

      // Clear all sessions
      await db.delete(session).where(eq(session.userId, userId));

      // Remove the reset token
      await settings.remove(SETTINGS_KEYS.PASSWORD_RESET_TOKEN);
    },

    async generateDeleteCsrfToken() {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const plaintext = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const tokenHash = await hashToken(plaintext);
      // Token valid for 15 minutes
      const expiry = Math.floor(Date.now() / 1000) + 15 * 60;

      await settings.set(
        SETTINGS_KEYS.DELETE_CSRF_TOKEN,
        `${tokenHash}:${expiry}`,
      );

      return plaintext;
    },

    async validateDeleteCsrfToken(token) {
      const stored = await settings.get(SETTINGS_KEYS.DELETE_CSRF_TOKEN);
      if (!stored) return false;

      const separatorIndex = stored.lastIndexOf(":");
      const storedHash = stored.substring(0, separatorIndex);
      const expiry = parseInt(stored.substring(separatorIndex + 1), 10);
      const now = Math.floor(Date.now() / 1000);

      if (now > expiry) return false;

      const tokenHash = await hashToken(token);

      const encoder = new TextEncoder();
      const a = encoder.encode(tokenHash);
      const b = encoder.encode(storedHash);
      if (a.byteLength !== b.byteLength) return false;

      return crypto.subtle.timingSafeEqual(a, b);
    },

    async deleteAllData(deps) {
      // 1. Collect all storage keys for cleanup before deleting DB records
      if (deps?.storage) {
        const mediaRows = await db
          .select({
            storageKey: media.storageKey,
            posterKey: media.posterKey,
          })
          .from(media);

        const appleTouchKey = await settings.get("SITE_FAVICON_APPLE_TOUCH");
        const avatarKey = await settings.get("SITE_AVATAR");

        const keysToDelete = new Set<string>();
        for (const row of mediaRows) {
          keysToDelete.add(row.storageKey);
          if (row.posterKey) keysToDelete.add(row.posterKey);
        }
        if (appleTouchKey) keysToDelete.add(appleTouchKey);
        if (avatarKey) keysToDelete.add(avatarKey);

        // Delete storage files (best-effort, don't block on failures)
        const storageDriver = deps.storage;
        if (storageDriver) {
          await Promise.allSettled(
            [...keysToDelete].map((key) => storageDriver.delete(key)),
          );
        }
      }

      // 2. Delete all DB records in dependency order
      // Junction/dependent tables first
      await db.delete(postCollections);
      await db.delete(pathRegistry);
      await db.delete(sidebarItems);
      await db.delete(media);
      await db.delete(navItems);

      // Posts: break self-referential FKs while satisfying all CHECK constraints,
      // then delete. Must update reply_to_id, visibility, AND thread_id together
      // because CHECKs enforce: reply_to_id IS NULL → visibility NOT NULL ∧ thread_id = id
      await db.run(
        sql`UPDATE post SET reply_to_id = NULL, visibility = 'public', thread_id = id WHERE reply_to_id IS NOT NULL`,
      );
      await db.run(sql`DELETE FROM post`);

      await db.delete(collections);
      await db.delete(apiTokens);
      await db.delete(settingsTable);

      // Auth tables
      await db.delete(verification);
      await db.delete(session);
      await db.delete(account);
      await db.delete(user);

      // FTS table is auto-cleaned by triggers when posts are deleted,
      // but run a rebuild to ensure consistency
      await db.run(sql`INSERT INTO post_fts(post_fts) VALUES ('rebuild')`);
    },
  };
}
