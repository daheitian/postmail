/**
 * Drizzle Schema
 *
 * Database schema for Jant v2
 */

import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  foreignKey,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const FORMATS = ["note", "link", "quote"] as const;
const STATUSES = ["draft", "published"] as const;
const VISIBILITIES = ["public", "unlisted", "private"] as const;
const SORT_ORDERS = ["newest", "oldest", "rating_desc", "rating_asc"] as const;
const NAV_ITEM_TYPES = ["link", "system"] as const;
const MEDIA_KINDS = ["image", "video", "audio", "text", "document"] as const;
const STORAGE_DRIVERS = ["r2", "s3"] as const;

function sqlTextEnum(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}

// =============================================================================
// Posts
// =============================================================================

export const posts = sqliteTable(
  "post",
  {
    id: text("id").primaryKey(),
    format: text("format", {
      enum: FORMATS,
    }).notNull(),
    status: text("status", {
      enum: STATUSES,
    })
      .notNull()
      .default("published"),
    visibility: text("visibility", {
      enum: VISIBILITIES,
    }).default("public"),
    pinnedAt: integer("pinned_at"),
    featuredAt: integer("featured_at"),
    title: text("title"),
    url: text("url"),
    body: text("body"),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    quoteText: text("quote_text"),
    summary: text("summary"),
    rating: integer("rating"),
    replyToId: text("reply_to_id"),
    threadId: text("thread_id").notNull(),
    deletedAt: integer("deleted_at"),
    publishedAt: integer("published_at"),
    lastActivityAt: integer("last_activity_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check("chk_post_format", sql`${table.format} IN (${sqlTextEnum(FORMATS)})`),
    check(
      "chk_post_status",
      sql`${table.status} IN (${sqlTextEnum(STATUSES)})`,
    ),
    check(
      "chk_post_visibility",
      sql`${table.visibility} IN (${sqlTextEnum(VISIBILITIES)})`,
    ),
    check(
      "chk_post_root_visibility_present",
      sql`(
        ${table.replyToId} IS NULL
        AND ${table.visibility} IS NOT NULL
      ) OR (
        ${table.replyToId} IS NOT NULL
        AND ${table.visibility} IS NULL
      )`,
    ),
    check(
      "chk_post_reply_to_not_self",
      sql`${table.replyToId} IS NULL OR ${table.replyToId} <> ${table.id}`,
    ),
    check(
      "chk_post_thread_shape",
      sql`(
        ${table.replyToId} IS NULL
        AND ${table.threadId} = ${table.id}
      ) OR (
        ${table.replyToId} IS NOT NULL
        AND ${table.threadId} <> ${table.id}
      )`,
    ),
    check(
      "chk_post_reply_not_pinned",
      sql`${table.pinnedAt} IS NULL OR ${table.replyToId} IS NULL`,
    ),
    check(
      "chk_post_format_shape",
      sql`(
        ${table.format} = 'note'
        AND (${table.url} IS NULL OR trim(${table.url}) = '')
        AND (${table.quoteText} IS NULL OR trim(${table.quoteText}) = '')
      ) OR (
        ${table.format} = 'link'
        AND ${table.url} IS NOT NULL
        AND trim(${table.url}) <> ''
        AND (${table.quoteText} IS NULL OR trim(${table.quoteText}) = '')
      ) OR (
        ${table.format} = 'quote'
        AND ${table.quoteText} IS NOT NULL
        AND trim(${table.quoteText}) <> ''
      )`,
    ),
    check(
      "chk_post_rating_range",
      sql`${table.rating} IS NULL OR ${table.rating} BETWEEN 1 AND 5`,
    ),
    check(
      "chk_post_status_published_at",
      sql`(
        ${table.status} = 'draft'
        AND ${table.publishedAt} IS NULL
      ) OR (
        ${table.status} = 'published'
        AND ${table.publishedAt} IS NOT NULL
      )`,
    ),
    foreignKey({
      columns: [table.replyToId],
      foreignColumns: [table.id],
    }),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [table.id],
    }),
    foreignKey({
      columns: [table.replyToId, table.threadId],
      foreignColumns: [table.id, table.threadId],
    }),
    uniqueIndex("uq_post_id_thread_id").on(table.id, table.threadId),
    index("idx_post_thread_id").on(table.threadId),
    index("idx_post_thread_live_created")
      .on(table.threadId, table.createdAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_post_status_deleted_published").on(
      table.status,
      table.deletedAt,
      table.publishedAt,
    ),
    index("idx_post_status_deleted_activity").on(
      table.status,
      table.deletedAt,
      table.lastActivityAt,
    ),
    index("idx_post_root_live_published_activity")
      .on(table.lastActivityAt, table.id)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.replyToId} IS NULL AND ${table.status} = 'published'`,
      ),
    index("idx_post_root_live_draft_updated")
      .on(table.updatedAt, table.id)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.replyToId} IS NULL AND ${table.status} = 'draft'`,
      ),
    index("idx_post_reply_live_thread_created")
      .on(table.threadId, table.createdAt, table.id)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.replyToId} IS NOT NULL AND ${table.status} = 'published'`,
      ),
  ],
);

// =============================================================================
// Media
// =============================================================================

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(), // UUIDv7
    postId: text("post_id").references(() => posts.id, {
      onDelete: "set null",
    }),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storageKey: text("storage_key").notNull(),
    provider: text("provider").notNull().default("r2"),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    position: text("position").notNull().default("a0"),
    blurhash: text("blurhash"),
    waveform: text("waveform"),
    posterKey: text("poster_key"),
    summary: text("summary"),
    chars: integer("chars"),
    mediaKind: text("media_kind").notNull().default("document"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "chk_media_provider",
      sql`${table.provider} IN (${sqlTextEnum(STORAGE_DRIVERS)})`,
    ),
    check(
      "chk_media_media_kind",
      sql`${table.mediaKind} IN (${sqlTextEnum(MEDIA_KINDS)})`,
    ),
    check("chk_media_size_positive", sql`${table.size} > 0`),
    check("chk_media_position_not_blank", sql`trim(${table.position}) <> ''`),
    check(
      "chk_media_dimensions_positive",
      sql`(
        ${table.width} IS NULL OR ${table.width} > 0
      ) AND (
        ${table.height} IS NULL OR ${table.height} > 0
      )`,
    ),
    check(
      "chk_media_chars_nonnegative",
      sql`${table.chars} IS NULL OR ${table.chars} >= 0`,
    ),
    index("idx_media_post_id_position").on(table.postId, table.position),
    uniqueIndex("uq_media_post_position")
      .on(table.postId, table.position)
      .where(sql`${table.postId} IS NOT NULL`),
    uniqueIndex("uq_media_provider_storage_key").on(
      table.provider,
      table.storageKey,
    ),
    index("idx_media_media_kind_post_id").on(table.mediaKind, table.postId),
  ],
);

// =============================================================================
// Collections
// =============================================================================

export const collections = sqliteTable(
  "collection",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: text("sort_order", {
      enum: SORT_ORDERS,
    })
      .notNull()
      .default("newest"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "chk_collection_sort_order",
      sql`${table.sortOrder} IN (${sqlTextEnum(SORT_ORDERS)})`,
    ),
  ],
);

// =============================================================================
// Path Registry (slug + alias + redirect)
// =============================================================================

export const pathRegistry = sqliteTable(
  "path_registry",
  {
    id: text("id").primaryKey(),
    path: text("path").notNull().unique(),
    kind: text("kind", {
      enum: ["slug", "alias", "redirect"],
    }).notNull(),
    postId: text("post_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    collectionId: text("collection_id").references(() => collections.id, {
      onDelete: "cascade",
    }),
    redirectToPath: text("redirect_to_path"),
    redirectType: integer("redirect_type"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "chk_path_registry_kind",
      sql`${table.kind} IN ('slug', 'alias', 'redirect')`,
    ),
    uniqueIndex("uq_path_registry_post_slug")
      .on(table.postId)
      .where(sql`${table.kind} = 'slug' AND ${table.postId} IS NOT NULL`),
    uniqueIndex("uq_path_registry_collection_slug")
      .on(table.collectionId)
      .where(sql`${table.kind} = 'slug' AND ${table.collectionId} IS NOT NULL`),
    index("idx_path_registry_post_id").on(table.postId),
    index("idx_path_registry_collection_id").on(table.collectionId),
    check(
      "chk_path_registry_shape",
      sql`(
        ${table.kind} IN ('slug', 'alias')
        AND (
          (${table.postId} IS NOT NULL AND ${table.collectionId} IS NULL)
          OR (${table.postId} IS NULL AND ${table.collectionId} IS NOT NULL)
        )
        AND ${table.redirectToPath} IS NULL
        AND ${table.redirectType} IS NULL
      ) OR (
        ${table.kind} = 'redirect'
        AND ${table.postId} IS NULL
        AND ${table.collectionId} IS NULL
        AND ${table.redirectToPath} IS NOT NULL
        AND ${table.redirectType} IN (301, 302)
      )`,
    ),
  ],
);

// =============================================================================
// Sidebar Items (unified ordering for collections + dividers)
// =============================================================================

export const sidebarItems = sqliteTable(
  "sidebar_item",
  {
    id: text("id").primaryKey(),
    type: text("type", { enum: ["collection", "divider"] }).notNull(),
    collectionId: text("collection_id").references(() => collections.id, {
      onDelete: "cascade",
    }),
    position: text("position").notNull().default("a0"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "chk_sidebar_item_type",
      sql`${table.type} IN ('collection', 'divider')`,
    ),
    index("idx_sidebar_item_collection_id").on(table.collectionId),
    uniqueIndex("uq_sidebar_item_position").on(table.position),
    uniqueIndex("uq_sidebar_item_collection_once")
      .on(table.collectionId)
      .where(
        sql`${table.type} = 'collection' AND ${table.collectionId} IS NOT NULL`,
      ),
    check(
      "chk_sidebar_item_shape",
      sql`(
        ${table.type} = 'collection' AND ${table.collectionId} IS NOT NULL
      ) OR (
        ${table.type} = 'divider' AND ${table.collectionId} IS NULL
      )`,
    ),
  ],
);

// =============================================================================
// Post-Collection Junction Table (M:N)
// =============================================================================

export const postCollections = sqliteTable(
  "post_collection",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.collectionId] }),
    index("idx_post_collection_collection_id").on(table.collectionId),
  ],
);

// =============================================================================
// Navigation Items
// =============================================================================

export const navItems = sqliteTable(
  "nav_item",
  {
    id: text("id").primaryKey(),
    type: text("type", {
      enum: NAV_ITEM_TYPES,
    })
      .notNull()
      .default("link"),
    label: text("label").notNull(),
    url: text("url").notNull(),
    position: text("position").notNull().default("a0"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "chk_nav_item_type",
      sql`${table.type} IN (${sqlTextEnum(NAV_ITEM_TYPES)})`,
    ),
    uniqueIndex("uq_nav_item_position").on(table.position),
  ],
);

// =============================================================================
// Settings (Key-Value)
// =============================================================================

export const settings = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// API Tokens
// =============================================================================

export const apiTokens = sqliteTable("api_token", {
  id: text("id").primaryKey(), // UUIDv7
  name: text("name").notNull(), // User-assigned label
  tokenHash: text("token_hash").notNull().unique(), // SHA-256 hex
  prefix: text("prefix").notNull(), // First 8 hex chars for display
  lastUsedAt: integer("last_used_at"), // Unix seconds, null if never used
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// better-auth tables
// Note: Using { mode: "timestamp" } so drizzle auto-converts Date <-> integer
// =============================================================================

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  role: text("role").default("member"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
  },
  (table) => [index("idx_session_user_id").on(table.userId)],
);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
