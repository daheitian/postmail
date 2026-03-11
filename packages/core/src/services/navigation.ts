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

const POSITION_RETRY_ATTEMPTS = 5;

function isUniqueConstraintError(err: unknown): boolean {
  let current: unknown = err;
  while (current) {
    const msg = String(current);
    if (
      msg.includes("UNIQUE constraint") ||
      msg.includes("SQLITE_CONSTRAINT")
    ) {
      return true;
    }
    current =
      current instanceof Error && current.cause !== current
        ? current.cause
        : undefined;
  }
  return false;
}

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

  async function listOrderedPositions(excludeId?: string) {
    const rows = await db
      .select({ id: navItems.id, position: navItems.position })
      .from(navItems)
      .orderBy(asc(navItems.position));
    return excludeId ? rows.filter((row) => row.id !== excludeId) : rows;
  }

  async function getAppendPosition(): Promise<string> {
    const lastPos = await getLastPosition();
    return generateKeyBetween(lastPos, null);
  }

  async function getMovePosition(
    id: string,
    afterId: string | null,
    beforeId: string | null,
  ): Promise<string> {
    const rows = await listOrderedPositions(id);
    const afterIndex = afterId
      ? rows.findIndex((row) => row.id === afterId)
      : -1;
    if (afterIndex >= 0) {
      return generateKeyBetween(
        rows[afterIndex]?.position ?? null,
        rows[afterIndex + 1]?.position ?? null,
      );
    }

    const beforeIndex = beforeId
      ? rows.findIndex((row) => row.id === beforeId)
      : -1;
    if (beforeIndex >= 0) {
      return generateKeyBetween(
        rows[beforeIndex - 1]?.position ?? null,
        rows[beforeIndex]?.position ?? null,
      );
    }

    return generateKeyBetween(rows.at(-1)?.position ?? null, null);
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

      if (data.position !== undefined) {
        const result = await db
          .insert(navItems)
          .values({
            id,
            type: data.type,
            label: data.label,
            url: data.url,
            position: data.position,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .returning();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
        return toNavItem(result[0]!);
      }

      for (let attempt = 0; attempt < POSITION_RETRY_ATTEMPTS; attempt += 1) {
        try {
          const result = await db
            .insert(navItems)
            .values({
              id,
              type: data.type,
              label: data.label,
              url: data.url,
              position: await getAppendPosition(),
              createdAt: timestamp,
              updatedAt: timestamp,
            })
            .returning();

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
          return toNavItem(result[0]!);
        } catch (err) {
          if (
            !isUniqueConstraintError(err) ||
            attempt === POSITION_RETRY_ATTEMPTS - 1
          ) {
            throw err;
          }
        }
      }

      throw new Error("Failed to assign a unique nav item position");
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

      const timestamp = now();
      for (let attempt = 0; attempt < POSITION_RETRY_ATTEMPTS; attempt += 1) {
        try {
          const result = await db
            .update(navItems)
            .set({
              position: await getMovePosition(id, afterId, beforeId),
              updatedAt: timestamp,
            })
            .where(eq(navItems.id, id))
            .returning();

          return result[0] ? toNavItem(result[0]) : null;
        } catch (err) {
          if (
            !isUniqueConstraintError(err) ||
            attempt === POSITION_RETRY_ATTEMPTS - 1
          ) {
            throw err;
          }
        }
      }

      throw new Error("Failed to assign a unique nav item position");
    },
  };
}
