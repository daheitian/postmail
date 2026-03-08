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
} from "drizzle-orm/sqlite-core";

// =============================================================================
// Posts
// =============================================================================

export const posts = sqliteTable(
  "post",
  {
    id: text("id").primaryKey(),
    format: text("format", {
      enum: ["note", "link", "quote"],
    }).notNull(),
    status: text("status", {
      enum: ["draft", "published"],
    })
      .notNull()
      .default("published"),
    visibility: text("visibility", {
      enum: ["public", "featured", "unlisted", "private"],
    })
      .notNull()
      .default("public"),
    pinnedAt: integer("pinned_at"),
    slug: text("slug").notNull().unique(),
    title: text("title"),
    url: text("url"),
    body: text("body"),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    quoteText: text("quote_text"),
    summary: text("summary"),
    rating: integer("rating"),
    replyToId: text("reply_to_id"),
    threadId: text("thread_id"),
    deletedAt: integer("deleted_at"),
    publishedAt: integer("published_at").notNull(),
    lastActivityAt: integer("last_activity_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.replyToId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    index("idx_post_thread_id").on(table.threadId),
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
    position: integer("position").notNull().default(0),
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
    index("idx_media_post_id_position").on(table.postId, table.position),
    index("idx_media_storage_key").on(table.storageKey),
    index("idx_media_media_kind").on(table.mediaKind),
  ],
);

// =============================================================================
// Collections
// =============================================================================

export const collections = sqliteTable("collection", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: text("sort_order", {
    enum: ["newest", "oldest", "rating_desc", "rating_asc"],
  })
    .notNull()
    .default("newest"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

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
  (table) => [index("idx_sidebar_item_collection_id").on(table.collectionId)],
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

export const navItems = sqliteTable("nav_item", {
  id: text("id").primaryKey(),
  type: text("type", {
    enum: ["link", "system"],
  })
    .notNull()
    .default("link"),
  label: text("label").notNull(),
  url: text("url").notNull(),
  position: text("position").notNull().default("a0"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// Custom URLs (replaces redirects + path_registry)
// =============================================================================

export const customUrls = sqliteTable(
  "custom_url",
  {
    id: text("id").primaryKey(),
    path: text("path").notNull().unique(),
    targetType: text("target_type", {
      enum: ["post", "collection", "redirect"],
    }).notNull(),
    targetId: text("target_id"),
    toPath: text("to_path"),
    redirectType: integer("redirect_type"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_custom_url_target_id").on(table.targetId)],
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
  role: text("role").default("admin"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
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
});

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
