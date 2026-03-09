/**
 * Auth Service
 *
 * Handles authentication-related business logic:
 * password reset token validation, password updates, and session management.
 */

import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import type { Database } from "../db/index.js";
import { user, account, session } from "../db/schema.js";
import type { SettingsService } from "./settings.js";
import { SETTINGS_KEYS } from "../lib/constants.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";

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
  };
}
