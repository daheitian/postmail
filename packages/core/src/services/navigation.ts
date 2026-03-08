/**
 * Nav Item Service (v2)
 *
 * Manages navigation items (external links and system links)
 * with fractional indexing for efficient reordering.
 */

import { eq, asc, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { uuidv7 } from "uuidv7";
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
  getById(id: string): Promise<NavItem | null>;
  create(data: CreateNavItem): Promise<NavItem>;
  update(id: string, data: UpdateNavItem): Promise<NavItem | null>;
  delete(id: string): Promise<boolean>;
  move(
    id: string,
    afterId: string | null,
    beforeId: string | null,
  ): Promise<NavItem | null>;
}

export function createNavItemService(db: Database): NavItemService {
  function toNavItem(row: typeof navItems.$inferSelect): NavItem {
    return {
      id: row.id,
      type: row.type as NavItemType,
      label: row.label,
      url: row.url,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async function getLastPosition(): Promise<string | null> {
    const rows = await db
      .select({ position: navItems.position })
      .from(navItems)
      .orderBy(sql`${navItems.position} DESC`)
      .limit(1);
    return rows[0]?.position ?? null;
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
      const id = uuidv7();
      const timestamp = now();

      let position = data.position;
      if (position === undefined) {
        const lastPos = await getLastPosition();
        position = generateKeyBetween(lastPos, null);
      }

      const result = await db
        .insert(navItems)
        .values({
          id,
          type: data.type,
          label: data.label,
          url: data.url,
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

    async move(id, afterId, beforeId) {
      // Look up the item
      const items = await db
        .select()
        .from(navItems)
        .where(eq(navItems.id, id))
        .limit(1);
      if (!items[0]) return null;

      // Look up neighbor positions
      let afterPos: string | null = null;
      let beforePos: string | null = null;

      if (afterId) {
        const afterRows = await db
          .select({ position: navItems.position })
          .from(navItems)
          .where(eq(navItems.id, afterId))
          .limit(1);
        afterPos = afterRows[0]?.position ?? null;
      }

      if (beforeId) {
        const beforeRows = await db
          .select({ position: navItems.position })
          .from(navItems)
          .where(eq(navItems.id, beforeId))
          .limit(1);
        beforePos = beforeRows[0]?.position ?? null;
      }

      const newPosition = generateKeyBetween(afterPos, beforePos);
      const timestamp = now();

      const result = await db
        .update(navItems)
        .set({ position: newPosition, updatedAt: timestamp })
        .where(eq(navItems.id, id))
        .returning();

      return result[0] ? toNavItem(result[0]) : null;
    },
  };
}
