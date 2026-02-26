/**
 * Search Service (v2)
 *
 * Full-text search using FTS5
 */

import type { Post, Status, Format, SearchResult } from "../types.js";

export type { SearchResult };

export interface SearchOptions {
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by status */
  status?: Status[];
  /** Filter by format */
  format?: Format;
}

export interface SearchService {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

interface RawSearchRow {
  id: number;
  format: string;
  status: string;
  visibility: string;
  pinned: number;
  path: string | null;
  title: string | null;
  url: string | null;
  body: string | null;
  body_html: string | null;
  quote_text: string | null;
  summary: string | null;
  rating: number | null;
  collection_id: number | null;
  reply_to_id: number | null;
  thread_id: number | null;
  deleted_at: number | null;
  published_at: number;
  created_at: number;
  updated_at: number;
  rank: number;
  snippet: string;
}

export function createSearchService(d1: D1Database): SearchService {
  return {
    async search(query, options = {}) {
      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;
      const status = options.status ?? ["published"];

      // Escape and prepare the query for FTS5
      const ftsQuery = query
        .trim()
        .split(/\s+/)
        .filter((term) => term.length > 0)
        .map((term) => `"${term.replace(/"/g, '""')}"*`)
        .join(" ");

      if (!ftsQuery) {
        return [];
      }

      // Build status placeholders
      const statusPlaceholders = status.map(() => "?").join(", ");

      // Build format filter
      const formatFilter = options.format ? "AND posts.format = ?" : "";
      const formatParams = options.format ? [options.format] : [];

      const stmt = d1.prepare(`
        SELECT
          posts.*,
          posts_fts.rank AS rank,
          snippet(posts_fts, 1, '<mark>', '</mark>', '...', 32) AS snippet
        FROM posts_fts
        JOIN posts ON posts.id = posts_fts.rowid
        WHERE posts_fts MATCH ?
          AND posts.deleted_at IS NULL
          AND posts.status IN (${statusPlaceholders})
          ${formatFilter}
        ORDER BY posts_fts.rank
        LIMIT ? OFFSET ?
      `);

      const { results } = await stmt
        .bind(ftsQuery, ...status, ...formatParams, limit, offset)
        .all<RawSearchRow>();

      return (results || []).map((row) => ({
        post: {
          id: row.id,
          format: row.format as Post["format"],
          status: row.status as Post["status"],
          visibility: row.visibility as Post["visibility"],
          pinned: row.pinned,
          path: row.path,
          title: row.title,
          url: row.url,
          body: row.body,
          bodyHtml: row.body_html,
          quoteText: row.quote_text,
          summary: row.summary,
          rating: row.rating,
          replyToId: row.reply_to_id,
          threadId: row.thread_id,
          deletedAt: row.deleted_at,
          publishedAt: row.published_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        rank: row.rank,
        snippet: row.snippet,
      }));
    },
  };
}
