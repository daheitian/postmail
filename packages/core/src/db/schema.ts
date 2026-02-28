/**
 * Drizzle Schema
 *
 * Database schema for Jant v2
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// =============================================================================
// Posts
// =============================================================================

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  format: text("format", {
    enum: ["note", "link", "quote"],
  }).notNull(),
  status: text("status", {
    enum: ["draft", "published"],
  })
    .notNull()
    .default("published"),
  visibility: text("visibility", {
    enum: ["listed", "featured", "unlisted"],
  })
    .notNull()
    .default("listed"),
  pinned: integer("pinned").notNull().default(0),
  path: text("path").unique(),
  title: text("title"),
  url: text("url"),
  body: text("body"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  quoteText: text("quote_text"),
  summary: text("summary"),
  rating: integer("rating"),
  replyToId: integer("reply_to_id"),
  threadId: integer("thread_id"),
  deletedAt: integer("deleted_at"),
  publishedAt: integer("published_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// Pages
// =============================================================================

export const pages = sqliteTable("pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title"),
  body: text("body"),
  bodyHtml: text("body_html"),
  status: text("status", {
    enum: ["draft", "published"],
  })
    .notNull()
    .default("published"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// Media
// =============================================================================

export const media = sqliteTable("media", {
  id: text("id").primaryKey(), // UUIDv7
  postId: integer("post_id").references(() => posts.id),
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
  createdAt: integer("created_at").notNull(),
});

// =============================================================================
// Collections
// =============================================================================

export const collections = sqliteTable("collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: text("sort_order", {
    enum: ["newest", "oldest", "rating_desc", "rating_asc"],
  })
    .notNull()
    .default("newest"),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// Collection Dividers (standalone sortable separators)
// =============================================================================

export const collectionDividers = sqliteTable("collection_dividers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// Post-Collection Junction Table (M:N)
// =============================================================================

export const postCollections = sqliteTable("post_collections", {
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  collectionId: integer("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
});

// =============================================================================
// Navigation Items
// =============================================================================

export const navItems = sqliteTable("nav_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", {
    enum: ["page", "link", "system"],
  })
    .notNull()
    .default("link"),
  label: text("label").notNull(),
  url: text("url").notNull(),
  pageId: integer("page_id").references(() => pages.id, {
    onDelete: "cascade",
  }),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// =============================================================================
// Redirects
// =============================================================================

export const redirects = sqliteTable("redirects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  type: integer("type", { mode: "number" }).notNull().default(301),
  createdAt: integer("created_at").notNull(),
});

// =============================================================================
// Path Registry (URL path ownership)
// =============================================================================

export const pathRegistry = sqliteTable("path_registry", {
  path: text("path").primaryKey(),
  ownerType: text("owner_type").notNull(),
  ownerId: integer("owner_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

// =============================================================================
// Settings (Key-Value)
// =============================================================================

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
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
