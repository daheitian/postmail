/**
 * Search Service (v2)
 *
 * Full-text search using FTS5 trigram for queries ≥ 3 characters.
 * Falls back to LIKE for shorter queries (common in CJK languages where
 * 2-character words cannot form a trigram).
 */

import type { Post, Status, Format, SearchResult } from "../types.js";
import type { DatabaseDialect } from "../db/dialect.js";
import type { RawQueryClient } from "../db/raw-query.js";
import { escapeHtml } from "../lib/html.js";

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
  site_id: string;
  format: string;
  status: string;
  visibility: string | null;
  effective_visibility: string | null;
  pinned_at: number | null;
  featured_at: number | null;
  slug: string;
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
  thread_id: string;
  deleted_at: number | null;
  published_at: number | null;
  last_activity_at: number | null;
  created_at: number;
  updated_at: number;
  rank: number;
  snippet: string | null;
}

function mapRow(row: RawSearchRow): SearchResult {
  return {
    post: {
      id: row.id,
      siteId: row.site_id,
      format: row.format as Post["format"],
      status: row.status as Post["status"],
      visibility: (row.effective_visibility ??
        row.visibility) as Post["visibility"],
      pinnedAt: row.pinned_at,
      featuredAt: row.featured_at,
      slug: row.slug,
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
      lastActivityAt:
        row.last_activity_at ?? row.published_at ?? row.updated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    rank: row.rank,
    snippet: row.snippet
      ? escapeHtml(row.snippet)
          .replaceAll(String.fromCharCode(2), "<mark>")
          .replaceAll(String.fromCharCode(3), "</mark>")
      : undefined,
  };
}

export function createSearchService(
  rawQuery: RawQueryClient,
  siteId: string,
  databaseDialect: DatabaseDialect = "sqlite",
): SearchService {
  async function searchFts(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    if (databaseDialect !== "sqlite") {
      return [];
    }

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
    const formatFilter = options.format ? "AND post.format = ?" : "";
    const formatParams = options.format ? [options.format] : [];

    const stmt = rawQuery.prepare(`
      SELECT
        post.*,
        COALESCE(post.visibility, root_post.visibility) AS effective_visibility,
        path_registry.path AS slug,
        post_fts.rank AS rank,
        snippet(post_fts, 1, char(2), char(3), '...', 32) AS snippet
      FROM post_fts
      JOIN post ON post.rowid = post_fts.rowid
      JOIN post AS root_post ON root_post.id = post.thread_id
      JOIN path_registry
        ON path_registry.post_id = post.id
       AND path_registry.site_id = post.site_id
       AND path_registry.kind = 'slug'
      WHERE post_fts MATCH ?
        AND post.site_id = ?
        AND post.deleted_at IS NULL
        AND post.status IN (${statusPlaceholders})
        ${formatFilter}
      ORDER BY post_fts.rank
      LIMIT ? OFFSET ?
    `);

    const { results } = await stmt
      .bind(ftsQuery, siteId, ...status, ...formatParams, limit, offset)
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
    const likeOperator = databaseDialect === "pg" ? "ILIKE" : "LIKE";
    const likeOrderBy =
      databaseDialect === "pg"
        ? "ORDER BY post.published_at DESC NULLS LAST"
        : "ORDER BY post.published_at DESC";

    const statusPlaceholders = status.map(() => "?").join(", ");
    const formatFilter = options.format ? "AND post.format = ?" : "";
    const formatParams = options.format ? [options.format] : [];

    const stmt = rawQuery.prepare(`
      SELECT
        post.*,
        COALESCE(post.visibility, root_post.visibility) AS effective_visibility,
        path_registry.path AS slug,
        0 AS rank,
        NULL AS snippet
      FROM post
      JOIN post AS root_post ON root_post.id = post.thread_id
      JOIN path_registry
        ON path_registry.post_id = post.id
       AND path_registry.site_id = post.site_id
       AND path_registry.kind = 'slug'
      WHERE (
        post.title ${likeOperator} ? OR
        post.body_text ${likeOperator} ? OR
        post.quote_text ${likeOperator} ? OR
        post.url ${likeOperator} ?
      )
      AND post.site_id = ?
      AND post.deleted_at IS NULL
      AND post.status IN (${statusPlaceholders})
      ${formatFilter}
      ${likeOrderBy}
      LIMIT ? OFFSET ?
    `);

    const { results } = await stmt
      .bind(
        like,
        like,
        like,
        like,
        siteId,
        ...status,
        ...formatParams,
        limit,
        offset,
      )
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
      if (charCount < 3) {
        return searchLike(trimmed, options);
      }

      const ftsResults = await searchFts(trimmed, options);
      if (ftsResults.length > 0) return ftsResults;

      return searchLike(trimmed, options);
    },
  };
}
