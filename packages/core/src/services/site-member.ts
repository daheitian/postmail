import { and, eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { siteMembers } from "../db/schema.js";
import { now } from "../lib/time.js";
import type { SiteMember, SiteMemberRole } from "../types.js";

function toSiteMember(row: typeof siteMembers.$inferSelect): SiteMember {
  return {
    siteId: row.siteId,
    userId: row.userId,
    role: row.role as SiteMemberRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface SiteMemberService {
  get(siteId: string, userId: string): Promise<SiteMember | null>;
  listForSite(siteId: string): Promise<SiteMember[]>;
  ensure(siteId: string, userId: string, role: SiteMemberRole): Promise<void>;
}

export function createSiteMemberService(db: Database): SiteMemberService {
  return {
    async get(siteId, userId) {
      const rows = await db
        .select()
        .from(siteMembers)
        .where(
          and(eq(siteMembers.siteId, siteId), eq(siteMembers.userId, userId)),
        )
        .limit(1);
      return rows[0] ? toSiteMember(rows[0]) : null;
    },

    async listForSite(siteId) {
      const rows = await db
        .select()
        .from(siteMembers)
        .where(eq(siteMembers.siteId, siteId));
      return rows.map(toSiteMember);
    },

    async ensure(siteId, userId, role) {
      const timestamp = now();
      await db
        .insert(siteMembers)
        .values({
          siteId,
          userId,
          role,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: [siteMembers.siteId, siteMembers.userId],
          set: {
            role,
            updatedAt: timestamp,
          },
        });
    },
  };
}
