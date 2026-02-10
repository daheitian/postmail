/**
 * Navigation Link Service
 *
 * Manages navigation links displayed on public pages
 */

import { eq, asc, sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { navigationLinks } from "../db/schema.js";
import { now } from "../lib/time.js";
import type {
  NavigationLink,
  CreateNavigationLink,
  UpdateNavigationLink,
} from "../types.js";

export interface NavigationLinkService {
  list(): Promise<NavigationLink[]>;
  getById(id: number): Promise<NavigationLink | null>;
  create(data: CreateNavigationLink): Promise<NavigationLink>;
  update(
    id: number,
    data: UpdateNavigationLink,
  ): Promise<NavigationLink | null>;
  delete(id: number): Promise<boolean>;
  reorder(ids: number[]): Promise<void>;
  ensureDefaults(): Promise<NavigationLink[]>;
}

export function createNavigationLinkService(
  db: Database,
): NavigationLinkService {
  function toNavigationLink(
    row: typeof navigationLinks.$inferSelect,
  ): NavigationLink {
    return {
      id: row.id,
      label: row.label,
      url: row.url,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async list() {
      const rows = await db
        .select()
        .from(navigationLinks)
        .orderBy(asc(navigationLinks.position));
      return rows.map(toNavigationLink);
    },

    async getById(id) {
      const result = await db
        .select()
        .from(navigationLinks)
        .where(eq(navigationLinks.id, id))
        .limit(1);
      return result[0] ? toNavigationLink(result[0]) : null;
    },

    async create(data) {
      const timestamp = now();

      let position = data.position;
      if (position === undefined) {
        const maxResult = await db
          .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)` })
          .from(navigationLinks);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- aggregate always returns one row
        position = maxResult[0]!.maxPos + 1;
      }

      const result = await db
        .insert(navigationLinks)
        .values({
          label: data.label,
          url: data.url,
          position,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toNavigationLink(result[0]!);
    },

    async update(id, data) {
      const existing = await db
        .select()
        .from(navigationLinks)
        .where(eq(navigationLinks.id, id))
        .limit(1);
      if (!existing[0]) return null;

      const timestamp = now();
      const result = await db
        .update(navigationLinks)
        .set({
          ...(data.label !== undefined && { label: data.label }),
          ...(data.url !== undefined && { url: data.url }),
          ...(data.position !== undefined && { position: data.position }),
          updatedAt: timestamp,
        })
        .where(eq(navigationLinks.id, id))
        .returning();

      return result[0] ? toNavigationLink(result[0]) : null;
    },

    async delete(id) {
      const result = await db
        .delete(navigationLinks)
        .where(eq(navigationLinks.id, id))
        .returning();
      return result.length > 0;
    },

    async reorder(ids) {
      const timestamp = now();
      for (let i = 0; i < ids.length; i++) {
        await db
          .update(navigationLinks)
          .set({ position: i, updatedAt: timestamp })
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- loop index guarantees element exists
          .where(eq(navigationLinks.id, ids[i]!));
      }
    },

    async ensureDefaults() {
      const existing = await db.select().from(navigationLinks).limit(1);
      if (existing.length > 0) {
        const rows = await db
          .select()
          .from(navigationLinks)
          .orderBy(asc(navigationLinks.position));
        return rows.map(toNavigationLink);
      }

      const timestamp = now();
      const defaults = [
        { label: "Home", url: "/", position: 0 },
        { label: "Archive", url: "/archive", position: 1 },
        { label: "RSS", url: "/feed", position: 2 },
      ];

      for (const link of defaults) {
        await db.insert(navigationLinks).values({
          ...link,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      const rows = await db
        .select()
        .from(navigationLinks)
        .orderBy(asc(navigationLinks.position));
      return rows.map(toNavigationLink);
    },
  };
}
