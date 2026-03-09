/**
 * Authentication with better-auth
 */

import { betterAuth, APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema.js";

export function createAuth(
  d1: D1Database,
  options: { secret: string; baseURL: string; useSecureCookies: boolean },
) {
  const db = drizzle(d1, { schema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: options.secret,
    baseURL: options.baseURL,
    advanced: {
      useSecureCookies: options.useSecureCookies,
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 3600 * 24 * 30, // 30 days
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (userData) => {
            const existing = await db
              .select({ id: schema.user.id })
              .from(schema.user)
              .limit(1);
            if (existing.length > 0) {
              throw new APIError("FORBIDDEN", {
                message: "Registration is closed.",
              });
            }
            return { data: { ...userData, role: "admin" } };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
