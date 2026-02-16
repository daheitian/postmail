/**
 * Nav Item Service (v2)
 *
 * Manages navigation items (page links and external links)
 */

import { eq, asc, sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { navItems } from "../db/schema.js";
import { now } from "../lib/time.js";
import type {
  NavItem,
  NavItemType,
  CreateNavItem,
  UpdateNavItem,
} from "../types.js";

export interface NavItemService {
  list(): Promise<NavItem[]>;
  getById(id: number): Promise<NavItem | null>;
  create(data: CreateNavItem): Promise<NavItem>;
  update(id: number, data: UpdateNavItem): Promise<NavItem | null>;
  delete(id: number): Promise<boolean>;
  reorder(ids: number[]): Promise<void>;
}

export function createNavItemService(db: Database): NavItemService {
  function toNavItem(row: typeof navItems.$inferSelect): NavItem {
    return {
      id: row.id,
      type: row.type as NavItemType,
      label: row.label,
      url: row.url,
      pageId: row.pageId,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async list() {
      const rows = await db
        .select()
        .from(navItems)
        .orderBy(asc(navItems.position));
      return rows.map(toNavItem);
    },

    async getById(id) {
      const result = await db
        .select()
        .from(navItems)
        .where(eq(navItems.id, id))
        .limit(1);
      return result[0] ? toNavItem(result[0]) : null;
    },

    async create(data) {
      const timestamp = now();

      let position = data.position;
      if (position === undefined) {
        const maxResult = await db
          .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)` })
          .from(navItems);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- aggregate always returns one row
        position = maxResult[0]!.maxPos + 1;
      }

      const result = await db
        .insert(navItems)
        .values({
          type: data.type,
          label: data.label,
          url: data.url,
          pageId: data.pageId ?? null,
          position,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toNavItem(result[0]!);
    },

    async update(id, data) {
      const existing = await db
        .select()
        .from(navItems)
        .where(eq(navItems.id, id))
        .limit(1);
      if (!existing[0]) return null;

      const timestamp = now();
      const result = await db
        .update(navItems)
        .set({
          ...(data.type !== undefined && { type: data.type }),
          ...(data.label !== undefined && { label: data.label }),
          ...(data.url !== undefined && { url: data.url }),
          ...(data.pageId !== undefined && { pageId: data.pageId }),
          ...(data.position !== undefined && { position: data.position }),
          updatedAt: timestamp,
        })
        .where(eq(navItems.id, id))
        .returning();

      return result[0] ? toNavItem(result[0]) : null;
    },

    async delete(id) {
      const result = await db
        .delete(navItems)
        .where(eq(navItems.id, id))
        .returning();
      return result.length > 0;
    },

    async reorder(ids) {
      const timestamp = now();
      for (let i = 0; i < ids.length; i++) {
        await db
          .update(navItems)
          .set({ position: i, updatedAt: timestamp })
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- loop index guarantees element exists
          .where(eq(navItems.id, ids[i]!));
      }
    },
  };
}
