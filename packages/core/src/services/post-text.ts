/**
 * Post Text Service
 *
 * Manages attached text content for posts. Each post can have multiple
 * attached texts rendered from Tiptap JSON to HTML.
 */

import { eq, inArray, asc } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { postTexts } from "../db/schema.js";
import { now } from "../lib/time.js";
import { renderTiptapJson } from "../lib/tiptap-render.js";
import type { PostText } from "../types.js";

export interface PostTextService {
  getByPostId(postId: number): Promise<PostText[]>;
  getByPostIds(postIds: number[]): Promise<Map<number, PostText[]>>;
  /**
   * Replace all attached texts for a post (delete + re-insert).
   * Renders bodyJson → bodyHtml server-side.
   *
   * @param postId - The post to attach texts to
   * @param texts - Array of { bodyJson, summary } to persist
   */
  replaceForPost(
    postId: number,
    texts: Array<{ bodyJson: string; summary: string }>,
  ): Promise<void>;
  deleteByPostId(postId: number): Promise<void>;
}

export function createPostTextService(db: Database): PostTextService {
  function toPostText(row: typeof postTexts.$inferSelect): PostText {
    return {
      id: row.id,
      postId: row.postId,
      bodyJson: row.bodyJson,
      bodyHtml: row.bodyHtml,
      summary: row.summary,
      position: row.position,
      createdAt: row.createdAt,
    };
  }

  return {
    async getByPostId(postId) {
      const rows = await db
        .select()
        .from(postTexts)
        .where(eq(postTexts.postId, postId))
        .orderBy(asc(postTexts.position));
      return rows.map(toPostText);
    },

    async getByPostIds(postIds) {
      const result = new Map<number, PostText[]>();
      if (postIds.length === 0) return result;

      const rows = await db
        .select()
        .from(postTexts)
        .where(inArray(postTexts.postId, postIds))
        .orderBy(asc(postTexts.position));

      for (const row of rows) {
        const pt = toPostText(row);
        const list = result.get(pt.postId);
        if (list) {
          list.push(pt);
        } else {
          result.set(pt.postId, [pt]);
        }
      }

      return result;
    },

    async replaceForPost(postId, texts) {
      // Delete existing attached texts
      await db.delete(postTexts).where(eq(postTexts.postId, postId));

      if (texts.length === 0) return;

      const timestamp = now();
      const values = texts.map((t, i) => ({
        postId,
        bodyJson: t.bodyJson,
        bodyHtml: renderTiptapJson(t.bodyJson),
        summary: t.summary,
        position: i,
        createdAt: timestamp,
      }));

      await db.insert(postTexts).values(values);
    },

    async deleteByPostId(postId) {
      await db.delete(postTexts).where(eq(postTexts.postId, postId));
    },
  };
}
