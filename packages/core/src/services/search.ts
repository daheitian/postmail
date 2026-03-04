/**
 * Search Service (v2)
 *
 * Full-text search using FTS5 trigram for queries ≥ 3 characters.
 * Falls back to LIKE for shorter queries (common in CJK languages where
 * 2-character words cannot form a trigram).
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
  id: string;
  format: string;
  status: string;
  visibility: string;
  pinned: number;
  path: string | null;
  title: string | null;
  url: string | null;
  body: string | null;
  body_html: string | null;
  body_text: string | null;
  quote_text: string | null;
  summary: string | null;
  rating: number | null;
  collection_id: string | null;
  reply_to_id: string | null;
  thread_id: string | null;
  deleted_at: number | null;
  published_at: number;
  created_at: number;
  updated_at: number;
  rank: number;
  snippet: string | null;
}

function mapRow(row: RawSearchRow): SearchResult {
  return {
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
      bodyText: row.body_text,
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
    snippet: row.snippet || undefined,
  };
}

export function createSearchService(d1: D1Database): SearchService {
  async function searchFts(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const status = options.status ?? ["published"];

    const ftsQuery = query
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .map((term) => `"${term.replace(/"/g, '""')}"*`)
      .join(" ");

    if (!ftsQuery) return [];

    const statusPlaceholders = status.map(() => "?").join(", ");
    const formatFilter = options.format ? "AND posts.format = ?" : "";
    const formatParams = options.format ? [options.format] : [];

    const stmt = d1.prepare(`
      SELECT
        posts.*,
        posts_fts.rank AS rank,
        snippet(posts_fts, 1, '<mark>', '</mark>', '...', 32) AS snippet
      FROM posts_fts
      JOIN posts ON posts.rowid = posts_fts.rowid
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

    return (results || []).map(mapRow);
  }

  async function searchLike(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const status = options.status ?? ["published"];
    const like = `%${query}%`;

    const statusPlaceholders = status.map(() => "?").join(", ");
    const formatFilter = options.format ? "AND posts.format = ?" : "";
    const formatParams = options.format ? [options.format] : [];

    const stmt = d1.prepare(`
      SELECT posts.*, 0 AS rank, NULL AS snippet
      FROM posts
      WHERE (
        title LIKE ? OR
        body_text LIKE ? OR
        quote_text LIKE ? OR
        url LIKE ?
      )
      AND posts.deleted_at IS NULL
      AND posts.status IN (${statusPlaceholders})
      ${formatFilter}
      ORDER BY posts.published_at DESC
      LIMIT ? OFFSET ?
    `);

    const { results } = await stmt
      .bind(like, like, like, like, ...status, ...formatParams, limit, offset)
      .all<RawSearchRow>();

    return (results || []).map(mapRow);
  }

  return {
    async search(query, options = {}) {
      const trimmed = query.trim();
      if (!trimmed) return [];

      // Trigram FTS requires at least 3 characters.
      // For shorter queries (common in CJK), fall back to LIKE.
      const charCount = [...trimmed].length;
      return charCount < 3
        ? searchLike(trimmed, options)
        : searchFts(trimmed, options);
    },
  };
}
