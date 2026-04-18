/**
 * Export Service
 *
 * Generates a ready-to-use Hugo static site as a ZIP archive.
 *
 * Content layout:
 *   - Each thread root is a Hugo branch bundle
 *     (`content/{root-slug}/_index.md`).
 *   - Each reply is a nested leaf bundle
 *     (`content/{root-slug}/{reply-slug}/index.md`) with
 *     `build: { render: never, list: local }` so only the parent thread
 *     page renders it while it still appears in `.Pages`.
 *   - `/{reply-slug}/` URLs redirect to the parent thread via Hugo's
 *     `aliases:` mechanism and a custom `_default/alias.html` that injects
 *     the reply anchor at runtime.
 *   - Media is emitted next to each bundle as Hugo page resources.
 *
 * Real Hugo templates and CSS are scaffolded as placeholders here and
 * filled in by Commit 5.
 */

import type { PostService } from "./post.js";
import type { PathService } from "./path.js";
import type { CollectionService } from "./collection.js";
import type { MediaService } from "./media.js";
import {
  getDefaultJantAppleTouchIconBytes,
  getDefaultJantFaviconIcoBytes,
} from "../lib/jant-branding.js";
import { tiptapJsonToMarkdown } from "../lib/tiptap-to-markdown.js";
import { getMediaUrl, getPublicUrlForProvider } from "../lib/image.js";
import { render as renderMarkdown } from "../lib/markdown.js";
import { toISOString } from "../lib/time.js";
import {
  formatFrontMatter,
  type HugoCollectionRef,
  type HugoFrontMatter,
  type HugoResource,
} from "../lib/hugo-markdown.js";
// Shared design tokens — single source of truth for colors, typography,
// and layout variables. Consumed verbatim by both the main site (via
// Tailwind) and the Hugo export (written to static/tokens.css). Using
// ?raw inlines the file contents as a string at build time so the
// Worker bundle ships without any filesystem access.
import TOKENS_CSS from "../styles/tokens.css?raw";

// Placeholder Hugo theme files — real templates and styles land in Commit 5.
// We import them as Vite `?raw` strings so the Worker bundle has no runtime
// filesystem dependency.
import THEME_TOML from "./export-theme/theme.toml?raw";
import THEME_STYLE_MAIN_CSS from "./export-theme/styles/main.css?raw";
import LAYOUT_BASEOF from "./export-theme/layouts/_default/baseof.html?raw";
import LAYOUT_SINGLE from "./export-theme/layouts/_default/single.html?raw";
import LAYOUT_LIST from "./export-theme/layouts/_default/list.html?raw";
import LAYOUT_ALIAS from "./export-theme/layouts/_default/alias.html?raw";
import LAYOUT_INDEX from "./export-theme/layouts/index.html?raw";
import LAYOUT_POST_LIST from "./export-theme/layouts/post/list.html?raw";
import LAYOUT_FEATURED_LIST from "./export-theme/layouts/featured/list.html?raw";
import LAYOUT_ARCHIVE_LIST from "./export-theme/layouts/archive/list.html?raw";
import LAYOUT_COLLECTIONS_LIST from "./export-theme/layouts/collections/list.html?raw";
import LAYOUT_COLLECTION_SINGLE from "./export-theme/layouts/collection/single.html?raw";
import PARTIAL_HEAD from "./export-theme/layouts/partials/head.html?raw";
import PARTIAL_HEADER from "./export-theme/layouts/partials/header.html?raw";
import PARTIAL_FOOTER from "./export-theme/layouts/partials/footer.html?raw";
import PARTIAL_PAGINATION from "./export-theme/layouts/partials/pagination.html?raw";
import PARTIAL_POST_CARD from "./export-theme/layouts/partials/post-card.html?raw";
import PARTIAL_REPLY from "./export-theme/layouts/partials/reply.html?raw";
import PARTIAL_THREAD_PREVIEW from "./export-theme/layouts/partials/thread-preview.html?raw";
import PARTIAL_THREAD_PREVIEW_CONTEXT from "./export-theme/layouts/partials/thread-preview-context.html?raw";

import type { StorageDriver } from "../lib/storage.js";
import { base64ToUint8Array } from "../lib/favicon.js";
import type { Post, Collection, Media, NavItem } from "../types.js";

/** A file entry in the exported Hugo site. */
export interface ExportFile {
  path: string;
  content: string | Uint8Array;
}

export interface ExportService {
  /** Generate a flat list of files for a complete Hugo site. */
  generateHugoFiles(): Promise<ExportFile[]>;
  /** Generate a ZIP archive of the Hugo site. */
  generateHugoSite(): Promise<Uint8Array>;
}

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  siteLanguage: string;
  showJantBrandingOnHome: boolean;
  homeDefaultView: string;
  siteFooter: string;
  showHeaderAvatar: boolean;
  siteAvatarUrl: string;
  faviconIcoBase64?: string;
  appleTouchIconStorageKey?: string;
  faviconVersion?: string;
  themeId: string;
  defaultThemeId: string;
  fontThemeId: string;
  themeMode: string;
  noindex: boolean;
  themeCss?: string;
  customCss?: string;
  r2PublicUrl?: string;
  s3PublicUrl?: string;
  localPublicUrl?: string;
  imageTransformUrl?: string;
  sitePathPrefix?: string;
  navItems: Pick<
    NavItem,
    "type" | "systemKey" | "label" | "url" | "position" | "placement"
  >[];
  /** Items per page for Hugo pagination — kept in sync with the main site's PAGE_SIZE. */
  pageSize: number;
  /** Items per archive page — kept in sync with the main site's ARCHIVE_PAGE_SIZE. */
  archivePageSize: number;
}

type IconExportMode = "default" | "custom";

type ExportedCollectionDirectoryItem =
  | {
      type: "collection";
      slug: string;
      title: string;
      entryCount?: number;
      recentActivityLabel?: string | null;
    }
  | {
      type: "divider";
      label: string | null;
    }
  | {
      type: "link";
      label: string;
      url: string;
    };

interface ExportCollectionDirectorySourceItem {
  type: "collection" | "divider" | "link";
  label?: string | null;
  url?: string | null;
  collection?: {
    id: string;
    slug: string;
    title: string;
    postCount?: number;
    recentActivityAt?: number;
  };
}

interface SiteIconAssets {
  faviconBytes: Uint8Array;
  faviconMode: IconExportMode;
  appleTouchBytes: Uint8Array;
  appleTouchMode: IconExportMode;
}

interface ExportedCollectionMetrics {
  postCount: number;
  recentActivityAt: number;
}

/**
 * A single `collections:` front-matter entry, already resolved to its
 * Hugo-visible slug. Assembled from
 * `collectionService.getCollectionEntriesByPostIds` + `collectionSlugMap`.
 */
interface ExportedCollectionEntry {
  slug: string;
  /** Unix seconds. */
  collectedAt: number;
  position: number;
  /** Unix seconds, or null when not pinned in this collection. */
  pinnedAt: number | null;
}

function buildDefaultAppleTouchAsset(): Pick<
  SiteIconAssets,
  "appleTouchBytes" | "appleTouchMode"
> {
  return {
    appleTouchBytes: getDefaultJantAppleTouchIconBytes(),
    appleTouchMode: "default",
  };
}

export function createExportService(
  services: {
    posts: PostService;
    paths: PathService;
    collections: CollectionService;
    media: MediaService;
  },
  siteConfig: SiteConfig,
  deps: { storage?: StorageDriver | null } = {},
): ExportService {
  return {
    async generateHugoFiles() {
      const collectionDirectoryDataPromise =
        typeof services.collections.listDirectoryData === "function"
          ? services.collections.listDirectoryData()
          : Promise.resolve(null);

      // 1. Query all data
      const [allPosts, allCollections, collectionDirectoryData] =
        await Promise.all([
          services.posts.list({
            excludeReplies: false,
            limit: 10000,
          }),
          services.collections.list(),
          collectionDirectoryDataPromise,
        ]);

      const allPostIds = allPosts.map((p) => p.id);
      const roots = allPosts.filter((p) => p.replyToId === null);
      const replies = allPosts.filter((p) => p.replyToId !== null);
      const rootPostIds = roots.map((p) => p.id);

      const [
        collectionsByPost,
        collectionEntriesByPost,
        rawMediaByPost,
        slugMap,
        aliasMap,
        collectionSlugMap,
      ] = await Promise.all([
        services.collections.getCollectionsByPostIds(allPostIds),
        services.collections.getCollectionEntriesByPostIds(allPostIds),
        services.media.getByPostIds(allPostIds),
        services.paths.getPostSlugMap(allPostIds),
        services.paths.getPostAliases(rootPostIds),
        services.paths.getCollectionSlugMap(allCollections.map((c) => c.id)),
      ]);
      const iconAssets = await buildSiteIconAssets(siteConfig, deps.storage);
      const collectionMetrics = buildExportedCollectionMetrics(
        allCollections,
        allPosts,
        collectionsByPost,
      );
      const exportedCollectionDirectoryItems =
        buildExportedCollectionDirectoryItems(
          collectionDirectoryData?.items ??
            allCollections.map((collection) => ({
              id: collection.id,
              type: "collection" as const,
              collection,
            })),
          collectionSlugMap,
          collectionMetrics,
        );

      // 2. Group replies by threadId
      const repliesByThread = new Map<string, Post[]>();
      for (const reply of replies) {
        const list = repliesByThread.get(reply.threadId) ?? [];
        list.push(reply);
        repliesByThread.set(reply.threadId, list);
      }
      // Sort replies by createdAt within each thread
      for (const list of repliesByThread.values()) {
        list.sort((a, b) => a.createdAt - b.createdAt);
      }

      // 3. Build file list
      const exportFiles: ExportFile[] = [];

      // Generate thread bundles (root _index.md + per-reply index.md).
      for (const root of roots) {
        const slug = slugMap.get(root.id) ?? root.slug;
        const threadReplies = repliesByThread.get(root.id) ?? [];
        const rootAliases = [...(aliasMap.get(root.id) ?? [])];

        const rootCollectionEntries = buildExportedCollectionEntriesForPost(
          root.id,
          collectionEntriesByPost,
          collectionSlugMap,
        );

        const bundleFiles = await buildThreadBundle(
          root,
          threadReplies,
          slug,
          rootAliases,
          rootCollectionEntries,
          slugMap,
          collectionEntriesByPost,
          collectionSlugMap,
          rawMediaByPost,
          siteConfig,
          deps.storage ?? null,
        );
        exportFiles.push(...bundleFiles);
      }

      // Collection landing pages (`content/{slug}/_index.md`).
      for (const collection of allCollections) {
        const slug = collectionSlugMap.get(collection.id) ?? collection.slug;
        const entryCount = collectionMetrics.get(collection.id)?.postCount ?? 0;
        exportFiles.push({
          path: `content/${slug}/_index.md`,
          content: await buildCollectionSection(collection, slug, entryCount),
        });
      }

      // Section + home scaffolding.
      exportFiles.push({
        path: "hugo.toml",
        content: buildHugoToml(siteConfig),
      });
      exportFiles.push({
        path: "content/_index.md",
        content: await buildHomeSection(siteConfig),
      });
      exportFiles.push({
        path: "content/collections/_index.md",
        content: await buildCollectionsSection(),
      });
      exportFiles.push({
        path: "content/archive/_index.md",
        content: await buildArchiveSection(),
      });

      const usedSlugs = new Set<string>();
      for (const s of slugMap.values()) usedSlugs.add(s);
      for (const s of collectionSlugMap.values()) usedSlugs.add(s);
      if (!usedSlugs.has("featured")) {
        exportFiles.push({
          path: "content/featured/_index.md",
          content: await buildFeaturedSection(),
        });
      }

      // Data files consumed by templates via `.Site.Data.jant` /
      // `.Site.Data.collection_directory`.
      exportFiles.push({
        path: "data/jant.toml",
        content: buildJantDataToml(siteConfig, iconAssets),
      });
      exportFiles.push({
        path: "data/collection_directory.toml",
        content: buildCollectionDirectoryDataToml(
          exportedCollectionDirectoryItems,
        ),
      });

      // Theme scaffolding (real templates + styles land in Commit 5).
      exportFiles.push({
        path: "themes/jant/theme.toml",
        content: THEME_TOML,
      });
      exportFiles.push({
        path: "themes/jant/layouts/_default/baseof.html",
        content: LAYOUT_BASEOF,
      });
      exportFiles.push({
        path: "themes/jant/layouts/_default/single.html",
        content: LAYOUT_SINGLE,
      });
      exportFiles.push({
        path: "themes/jant/layouts/_default/list.html",
        content: LAYOUT_LIST,
      });
      exportFiles.push({
        path: "themes/jant/layouts/_default/alias.html",
        content: LAYOUT_ALIAS,
      });
      exportFiles.push({
        path: "themes/jant/layouts/index.html",
        content: LAYOUT_INDEX,
      });
      exportFiles.push({
        path: "themes/jant/layouts/post/list.html",
        content: LAYOUT_POST_LIST,
      });
      exportFiles.push({
        path: "themes/jant/layouts/featured/list.html",
        content: LAYOUT_FEATURED_LIST,
      });
      exportFiles.push({
        path: "themes/jant/layouts/archive/list.html",
        content: LAYOUT_ARCHIVE_LIST,
      });
      exportFiles.push({
        path: "themes/jant/layouts/collections/list.html",
        content: LAYOUT_COLLECTIONS_LIST,
      });
      exportFiles.push({
        path: "themes/jant/layouts/collection/single.html",
        content: LAYOUT_COLLECTION_SINGLE,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/head.html",
        content: PARTIAL_HEAD,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/header.html",
        content: PARTIAL_HEADER,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/footer.html",
        content: PARTIAL_FOOTER,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/pagination.html",
        content: PARTIAL_PAGINATION,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/post-card.html",
        content: PARTIAL_POST_CARD,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/reply.html",
        content: PARTIAL_REPLY,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/thread-preview.html",
        content: PARTIAL_THREAD_PREVIEW,
      });
      exportFiles.push({
        path: "themes/jant/layouts/partials/thread-preview-context.html",
        content: PARTIAL_THREAD_PREVIEW_CONTEXT,
      });

      // Static assets. Load order in the template's <head> is
      // tokens → main → theme → custom (wired up by the Commit 5 partial).
      exportFiles.push({
        path: "themes/jant/static/tokens.css",
        content: TOKENS_CSS,
      });
      exportFiles.push({
        path: "themes/jant/static/main.css",
        content: THEME_STYLE_MAIN_CSS,
      });
      exportFiles.push({
        path: "themes/jant/static/theme.css",
        content: siteConfig.themeCss ?? "",
      });
      exportFiles.push({
        path: "themes/jant/static/custom.css",
        content: siteConfig.customCss ?? "",
      });
      exportFiles.push({
        path: "themes/jant/static/favicon.ico",
        content: iconAssets.faviconBytes,
      });
      exportFiles.push({
        path: "themes/jant/static/apple-touch-icon.png",
        content: iconAssets.appleTouchBytes,
      });

      exportFiles.push({
        path: "README.md",
        content: buildReadme(siteConfig.siteName),
      });
      exportFiles.push({
        path: ".gitignore",
        content: buildGitignore(),
      });

      return exportFiles;
    },

    async generateHugoSite() {
      const exportFiles = await this.generateHugoFiles();
      const { zipSync } = await import("fflate");
      const encoder = new TextEncoder();
      const files: Record<string, Uint8Array> = {};
      for (const file of exportFiles) {
        files[file.path] =
          typeof file.content === "string"
            ? encoder.encode(file.content)
            : file.content;
      }
      return zipSync(files);
    },
  };
}

async function readStorageObjectBytes(
  storage: StorageDriver,
  storageKey: string,
): Promise<Uint8Array | null> {
  const object = await storage.get(storageKey);
  if (!object?.body) {
    return null;
  }

  return new Uint8Array(await new Response(object.body).arrayBuffer());
}

async function buildSiteIconAssets(
  config: SiteConfig,
  storage?: StorageDriver | null,
): Promise<SiteIconAssets> {
  const faviconMode: IconExportMode = config.faviconIcoBase64
    ? "custom"
    : "default";
  const faviconBytes = config.faviconIcoBase64
    ? base64ToUint8Array(config.faviconIcoBase64)
    : getDefaultJantFaviconIcoBytes();

  if (!config.appleTouchIconStorageKey) {
    return {
      faviconBytes,
      faviconMode,
      ...buildDefaultAppleTouchAsset(),
    };
  }

  if (!storage) {
    return {
      faviconBytes,
      faviconMode,
      ...buildDefaultAppleTouchAsset(),
    };
  }

  let appleTouchBytes: Uint8Array | null;
  try {
    appleTouchBytes = await readStorageObjectBytes(
      storage,
      config.appleTouchIconStorageKey,
    );
  } catch {
    return {
      faviconBytes,
      faviconMode,
      ...buildDefaultAppleTouchAsset(),
    };
  }

  if (!appleTouchBytes) {
    return {
      faviconBytes,
      faviconMode,
      ...buildDefaultAppleTouchAsset(),
    };
  }

  return {
    faviconBytes,
    faviconMode,
    appleTouchBytes,
    appleTouchMode: "custom",
  };
}

// ---------------------------------------------------------------------------
// Thread bundle generation
// ---------------------------------------------------------------------------

function buildExportedCollectionEntriesForPost(
  postId: string,
  collectionEntriesByPost: Map<
    string,
    {
      collectionId: string;
      createdAt: number;
      position: number;
      pinnedAt: number | null;
    }[]
  >,
  collectionSlugMap: Map<string, string>,
): ExportedCollectionEntry[] {
  const entries = collectionEntriesByPost.get(postId) ?? [];
  const resolved: ExportedCollectionEntry[] = [];
  for (const entry of entries) {
    const slug = collectionSlugMap.get(entry.collectionId);
    if (!slug) continue;
    resolved.push({
      slug,
      collectedAt: entry.createdAt,
      position: entry.position,
      pinnedAt: entry.pinnedAt,
    });
  }
  return resolved;
}

function collectionEntriesToRefs(
  entries: readonly ExportedCollectionEntry[],
): HugoCollectionRef[] {
  return entries.map((entry) => ({
    slug: entry.slug,
    collected_at: toISOString(entry.collectedAt),
    position: entry.position,
    pinned_at: entry.pinnedAt !== null ? toISOString(entry.pinnedAt) : null,
  }));
}

/**
 * Derive a Hugo `resources:` entry from a Media record plus the bundle-
 * relative filename the bytes will live at on disk.
 */
function mediaToResource(media: Media, resourceName: string): HugoResource {
  const params: NonNullable<HugoResource["params"]> = {
    kind: media.mediaKind === "text" ? "file" : media.mediaKind,
    position: parsePositionForSort(media.position),
  };
  if (media.alt !== null && media.alt !== "") params.alt = media.alt;
  if (media.width !== null) params.width = media.width;
  if (media.height !== null) params.height = media.height;
  if (media.blurhash !== null && media.blurhash !== "")
    params.blurhash = media.blurhash;
  if (media.originalName) params["original_name"] = media.originalName;
  if (media.mimeType) params["mime_type"] = media.mimeType;
  if (media.posterKey) params["poster_key"] = media.posterKey;
  const posterSrc = posterResourceNameForMedia(media);
  if (posterSrc) params["poster_src"] = posterSrc;
  if (typeof media.size === "number") params.size = media.size;
  if (media.waveform) params.waveform = media.waveform;
  if (media.summary) params.summary = media.summary;
  if (typeof media.chars === "number") params.chars = media.chars;
  if (media.durationSeconds !== null && media.durationSeconds !== undefined) {
    params["duration_seconds"] = media.durationSeconds;
  }
  params["media_id"] = media.id;
  params["storage_key"] = media.storageKey;
  params["provider"] = media.provider;

  return {
    src: resourceName,
    name: media.id,
    params,
  };
}

function parsePositionForSort(position: string): number {
  // Fractional indexing keys sort lexicographically, but downstream
  // consumers (and the UI) expect a numeric fallback. Keep a stable
  // ordering by hashing the string into an integer.
  let hash = 0;
  for (let i = 0; i < position.length; i++) {
    hash = (hash * 31 + position.charCodeAt(i)) | 0;
  }
  return hash;
}

function resourceFileNameForMedia(media: Media): string {
  // Hugo looks up resources by `src`, so keep the filename stable per
  // media id. The original filename is preserved in params.original_name.
  const dot = media.filename.lastIndexOf(".");
  const ext = dot >= 0 ? media.filename.slice(dot) : "";
  return `${media.id}${ext}`;
}

/**
 * Derive a stable bundle-relative filename for a video/audio media's
 * poster frame. Returns null when the media has no poster. The ext is
 * derived from the stored `posterKey` so PNG posters stay PNG and WebP
 * posters stay WebP round-trip.
 */
function posterResourceNameForMedia(media: Media): string | null {
  if (!media.posterKey) return null;
  const dot = media.posterKey.lastIndexOf(".");
  const ext = dot >= 0 ? media.posterKey.slice(dot + 1) : "webp";
  return `${media.id}-poster.${ext}`;
}

/**
 * Build a complete set of ExportFile entries for a single thread bundle:
 * the root `_index.md`, one `index.md` per reply, and resource blobs for
 * attached media when the storage driver can fetch them.
 */
async function buildThreadBundle(
  root: Post,
  threadReplies: Post[],
  rootSlug: string,
  rootAliases: string[],
  rootCollectionEntries: ExportedCollectionEntry[],
  slugMap: Map<string, string>,
  collectionEntriesByPost: Map<
    string,
    {
      collectionId: string;
      createdAt: number;
      position: number;
      pinnedAt: number | null;
    }[]
  >,
  collectionSlugMap: Map<string, string>,
  mediaByPost: Map<string, Media[]>,
  siteConfig: SiteConfig,
  storage: StorageDriver | null,
): Promise<ExportFile[]> {
  const files: ExportFile[] = [];

  // Root aliases = historical root slugs + every reply slug (so
  // /{reply-slug}/ gets a Hugo alias page that redirects/anchors to
  // the thread root).
  const aliases = [...rootAliases];
  for (const reply of threadReplies) {
    const replySlug = slugMap.get(reply.id) ?? reply.slug;
    aliases.push(`/${replySlug}/`);
  }

  // Root front matter.
  const rootMedia = mediaByPost.get(root.id) ?? [];
  const rootMediaFiles = rootMedia.map((m) => ({
    media: m,
    resourceName: resourceFileNameForMedia(m),
    posterResourceName: posterResourceNameForMedia(m),
  }));
  const rootResources = rootMediaFiles.map(({ media, resourceName }) =>
    mediaToResource(media, resourceName),
  );
  const rootFrontMatter: HugoFrontMatter = {
    id: root.id,
    title: root.format !== "quote" ? (root.title ?? undefined) : undefined,
    date:
      root.publishedAt !== null
        ? toISOString(root.publishedAt)
        : toISOString(root.createdAt),
    updated:
      root.updatedAt && root.updatedAt !== root.publishedAt
        ? toISOString(root.updatedAt)
        : undefined,
    slug: rootSlug,
    type: "post",
    draft:
      root.status === "draft" || root.visibility === "private"
        ? true
        : undefined,
    aliases: aliases.length > 0 ? aliases : undefined,
    format: root.format,
    status: root.status,
    visibility: root.visibility,
    summary_text: getArchiveSummaryText(root) ?? undefined,
    link_url: root.format === "link" && root.url ? root.url : undefined,
    source_name: root.format === "quote" && root.title ? root.title : undefined,
    source_url: root.format === "quote" && root.url ? root.url : undefined,
    quote_text: root.quoteText ?? undefined,
    rating: root.rating ?? undefined,
    featured_at:
      root.featuredAt !== null ? toISOString(root.featuredAt) : undefined,
    pinned_at: root.pinnedAt !== null ? toISOString(root.pinnedAt) : undefined,
    root_aliases: rootAliases.length > 0 ? rootAliases : undefined,
    collections:
      rootCollectionEntries.length > 0
        ? collectionEntriesToRefs(rootCollectionEntries)
        : undefined,
    resources: rootResources.length > 0 ? rootResources : undefined,
  };

  const rootBody = root.body ? tiptapJsonToMarkdown(root.body) : "";
  files.push({
    path: `content/${rootSlug}/_index.md`,
    content: `${await formatFrontMatter(rootFrontMatter)}\n${rootBody}${rootBody.endsWith("\n") ? "" : "\n"}`,
  });

  // Root media as sibling page-resource files. When storage is reachable
  // we emit the bytes directly into the bundle dir so Hugo's page-resource
  // lookup (`.Resources.GetMatch`) works without any extra localization
  // step. The CLI's site-localize step still handles media URLs embedded
  // in the post body (via `<img>` / markdown image syntax) by rewriting
  // them into `static/media/`.
  void siteConfig;
  for (const { media, resourceName, posterResourceName } of rootMediaFiles) {
    const mediaFile = await readMediaResourceFile(
      storage,
      media.storageKey,
      `content/${rootSlug}/${resourceName}`,
    );
    if (mediaFile) files.push(mediaFile);
    if (media.posterKey && posterResourceName) {
      const posterFile = await readMediaResourceFile(
        storage,
        media.posterKey,
        `content/${rootSlug}/${posterResourceName}`,
      );
      if (posterFile) files.push(posterFile);
    }
  }

  // Replies as nested leaf bundles.
  for (const reply of threadReplies) {
    const replySlug = slugMap.get(reply.id) ?? reply.slug;
    const replyMedia = mediaByPost.get(reply.id) ?? [];
    const replyMediaFiles = replyMedia.map((m) => ({
      media: m,
      resourceName: resourceFileNameForMedia(m),
      posterResourceName: posterResourceNameForMedia(m),
    }));
    const replyResources = replyMediaFiles.map(({ media, resourceName }) =>
      mediaToResource(media, resourceName),
    );
    const replyCollectionEntries = buildExportedCollectionEntriesForPost(
      reply.id,
      collectionEntriesByPost,
      collectionSlugMap,
    );

    const replyFrontMatter: HugoFrontMatter = {
      id: reply.id,
      title: reply.format !== "quote" ? (reply.title ?? undefined) : undefined,
      date:
        reply.publishedAt !== null
          ? toISOString(reply.publishedAt)
          : toISOString(reply.createdAt),
      updated:
        reply.updatedAt && reply.updatedAt !== reply.publishedAt
          ? toISOString(reply.updatedAt)
          : undefined,
      slug: replySlug,
      type: "post",
      draft:
        reply.status === "draft" || reply.visibility === "private"
          ? true
          : undefined,
      build: { render: "never", list: "local" },
      format: reply.format,
      status: reply.status,
      visibility: reply.visibility,
      summary_text: getArchiveSummaryText(reply) ?? undefined,
      link_url: reply.format === "link" && reply.url ? reply.url : undefined,
      source_name:
        reply.format === "quote" && reply.title ? reply.title : undefined,
      source_url: reply.format === "quote" && reply.url ? reply.url : undefined,
      quote_text: reply.quoteText ?? undefined,
      rating: reply.rating ?? undefined,
      featured_at:
        reply.featuredAt !== null ? toISOString(reply.featuredAt) : undefined,
      pinned_at:
        reply.pinnedAt !== null ? toISOString(reply.pinnedAt) : undefined,
      collections:
        replyCollectionEntries.length > 0
          ? collectionEntriesToRefs(replyCollectionEntries)
          : undefined,
      resources: replyResources.length > 0 ? replyResources : undefined,
    };

    const replyBody = reply.body ? tiptapJsonToMarkdown(reply.body) : "";
    files.push({
      path: `content/${rootSlug}/${replySlug}/index.md`,
      content: `${await formatFrontMatter(replyFrontMatter)}\n${replyBody}${replyBody.endsWith("\n") ? "" : "\n"}`,
    });

    for (const { media, resourceName, posterResourceName } of replyMediaFiles) {
      const mediaFile = await readMediaResourceFile(
        storage,
        media.storageKey,
        `content/${rootSlug}/${replySlug}/${resourceName}`,
      );
      if (mediaFile) files.push(mediaFile);
      if (media.posterKey && posterResourceName) {
        const posterFile = await readMediaResourceFile(
          storage,
          media.posterKey,
          `content/${rootSlug}/${replySlug}/${posterResourceName}`,
        );
        if (posterFile) files.push(posterFile);
      }
    }
  }

  return files;
}

/**
 * Read a media record's bytes from storage and return an ExportFile so
 * they can be bundled next to the post as a Hugo page resource. Returns
 * null when storage is unavailable or the object cannot be read, in
 * which case the front matter entry still points at the resource name
 * and the CLI's localize step (or a later sync) can fill it in.
 */
async function readMediaResourceFile(
  storage: StorageDriver | null,
  storageKey: string,
  bundlePath: string,
): Promise<ExportFile | null> {
  if (!storage) return null;
  try {
    const bytes = await readStorageObjectBytes(storage, storageKey);
    if (!bytes) return null;
    return { path: bundlePath, content: bytes };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Section + landing pages
// ---------------------------------------------------------------------------

async function buildHomeSection(siteConfig: SiteConfig): Promise<string> {
  const frontMatter: HugoFrontMatter = {
    title: siteConfig.siteName,
    type: "home",
  };
  return `${await formatFrontMatter(frontMatter)}\n`;
}

async function buildCollectionsSection(): Promise<string> {
  const frontMatter: HugoFrontMatter = {
    title: "Collections",
    type: "collections",
  };
  return `${await formatFrontMatter(frontMatter)}\n`;
}

async function buildArchiveSection(): Promise<string> {
  const frontMatter: HugoFrontMatter = {
    title: "Archive",
    type: "archive",
  };
  return `${await formatFrontMatter(frontMatter)}\n`;
}

async function buildFeaturedSection(): Promise<string> {
  const frontMatter: HugoFrontMatter = {
    title: "Featured",
    type: "featured",
  };
  return `${await formatFrontMatter(frontMatter)}\n`;
}

async function buildCollectionSection(
  collection: Collection,
  slug: string,
  entryCount: number,
): Promise<string> {
  const frontMatter: HugoFrontMatter = {
    title: collection.title,
    slug,
    type: "collection",
    summary_text: collection.description ?? undefined,
    sort_order: collection.sortOrder,
    entry_count: entryCount,
  };
  return `${await formatFrontMatter(frontMatter)}\n`;
}

// ---------------------------------------------------------------------------
// Summary extraction (kept from the previous exporter)
// ---------------------------------------------------------------------------

function normalizeArchiveText(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function getArchiveSummaryText(post: Post): string | null {
  const candidates =
    post.format === "quote"
      ? [post.summary, post.quoteText, post.bodyText, post.url]
      : [post.summary, post.bodyText, post.quoteText, post.url];

  for (const candidate of candidates) {
    const normalized = normalizeArchiveText(candidate);
    if (normalized) return normalized;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Collection metrics + directory items (kept from the previous exporter)
// ---------------------------------------------------------------------------

function formatCollectionActivityLabel(
  timestamp: number | undefined,
): string | null {
  if (typeof timestamp !== "number") {
    return null;
  }

  return toISOString(timestamp).slice(0, 10);
}

function buildExportedCollectionDirectoryItems(
  items: readonly ExportCollectionDirectorySourceItem[],
  collectionSlugMap: Map<string, string>,
  collectionMetrics: Map<string, ExportedCollectionMetrics>,
): ExportedCollectionDirectoryItem[] {
  const exportedItems: ExportedCollectionDirectoryItem[] = [];

  for (const item of items) {
    if (item.type === "divider") {
      exportedItems.push({
        type: "divider",
        label: item.label ?? null,
      });
      continue;
    }

    if (item.type === "link") {
      if (!item.label || !item.url) {
        continue;
      }

      exportedItems.push({
        type: "link",
        label: item.label,
        url: item.url,
      });
      continue;
    }

    const collection = item.collection;
    if (!collection?.id) {
      continue;
    }

    const slug = collectionSlugMap.get(collection.id) ?? collection.slug;
    if (!slug) {
      continue;
    }
    const metrics = collectionMetrics.get(collection.id);

    exportedItems.push({
      type: "collection",
      slug,
      title: collection.title || slug,
      entryCount:
        metrics?.postCount ??
        (typeof collection.postCount === "number"
          ? collection.postCount
          : undefined),
      recentActivityLabel: formatCollectionActivityLabel(
        metrics?.recentActivityAt ?? collection.recentActivityAt,
      ),
    });
  }

  return exportedItems;
}

function buildExportedCollectionMetrics(
  collections: readonly Collection[],
  posts: readonly Post[],
  collectionsByPost: ReadonlyMap<string, readonly Collection[]>,
): Map<string, ExportedCollectionMetrics> {
  const metrics = new Map<string, ExportedCollectionMetrics>();

  for (const collection of collections) {
    metrics.set(collection.id, {
      postCount: 0,
      recentActivityAt: collection.updatedAt,
    });
  }

  for (const post of posts) {
    if (post.deletedAt !== null) {
      continue;
    }
    // Drafts and private posts are excluded — they won't reach Hugo.
    if (post.status === "draft" || post.visibility === "private") {
      continue;
    }
    // Replies roll up into their thread root for directory metrics.
    if (post.replyToId !== null) {
      continue;
    }

    const activityAt =
      post.lastActivityAt ??
      post.publishedAt ??
      post.updatedAt ??
      post.createdAt;
    const postCollections = collectionsByPost.get(post.id) ?? [];

    for (const collection of postCollections) {
      const current = metrics.get(collection.id);
      if (!current) {
        continue;
      }

      if (current.postCount === 0) {
        current.recentActivityAt = activityAt;
      } else {
        current.recentActivityAt = Math.max(
          current.recentActivityAt,
          activityAt,
        );
      }
      current.postCount += 1;
    }
  }

  return metrics;
}

// ---------------------------------------------------------------------------
// Nav item resolution
// ---------------------------------------------------------------------------

/**
 * System nav items on the main site store an empty `label` in the DB and
 * resolve their display text at render time through i18n
 * (`getNavItemDisplayLabel`). The Hugo export has no i18n runtime, so fall
 * back to these English defaults when serializing to `data/jant.toml`.
 * Users can still override by setting a custom label on the nav item.
 */
const SYSTEM_NAV_FALLBACK_LABELS: Record<string, string> = {
  latest: "Latest",
  featured: "Featured",
  collections: "Collections",
  archive: "Archive",
  rss: "RSS",
  settings: "Settings",
};

function resolveNavItemLabel(item: SiteConfig["navItems"][number]): string {
  if (item.label) return item.label;
  if (item.systemKey) {
    const fallback = SYSTEM_NAV_FALLBACK_LABELS[item.systemKey];
    if (fallback) return fallback;
  }
  return item.label;
}

/**
 * Resolve a nav item's final href for the Hugo export.
 *
 * Mirrors the runtime logic in `lib/view.ts:toNavItemView`. System URLs
 * stored in the DB ("/latest", "/featured") are not real routes — they get
 * rewritten to "/" when they match `homeDefaultView`, otherwise they
 * resolve to the dedicated path.
 */
function resolveNavItemUrl(
  item: SiteConfig["navItems"][number],
  homeDefaultView: string,
): string {
  if (item.systemKey === "latest") {
    return homeDefaultView === "latest" ? "/" : "/latest/";
  }
  if (item.systemKey === "featured") {
    return homeDefaultView === "featured" ? "/" : "/featured/";
  }
  if (item.systemKey === "collections") return "/collections/";
  if (item.systemKey === "archive") return "/archive/";
  if (item.systemKey === "rss") return "/index.xml";
  return item.url;
}

// ---------------------------------------------------------------------------
// hugo.toml + data TOMLs
// ---------------------------------------------------------------------------

/** Escape a string for use inside a TOML double-quoted value. */
function escapeTomlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function buildHugoToml(config: SiteConfig): string {
  const baseUrl = (config.siteUrl || "https://example.com").replace(/\/+$/, "");
  // Hugo requires language codes to be all lowercase (it rejects the BCP-47
  // casing `zh-Hant` / `zh-Hans` with "must be all lower case and no spaces").
  const language = config.siteLanguage.toLowerCase();
  const parts: string[] = [
    `baseURL = "${escapeTomlString(baseUrl)}/"`,
    `title = "${escapeTomlString(config.siteName)}"`,
    `languageCode = "${escapeTomlString(language)}"`,
    `defaultContentLanguage = "${escapeTomlString(language)}"`,
    'theme = "jant"',
    `paginate = ${config.pageSize}`,
    "enableRobotsTXT = true",
    "",
    "[permalinks]",
    '  post = "/:slug/"',
    "",
    "[markup]",
    "  [markup.goldmark]",
    "    [markup.goldmark.renderer]",
    "      unsafe = true",
    "",
    "[params]",
    `  description = "${escapeTomlString(config.siteDescription)}"`,
    `  home_default_view = "${escapeTomlString(config.homeDefaultView)}"`,
    `  show_jant_branding_on_home = ${config.showJantBrandingOnHome}`,
    `  show_header_avatar = ${config.showHeaderAvatar}`,
    `  noindex = ${config.noindex}`,
    `  theme_id = "${escapeTomlString(config.themeId)}"`,
    `  default_theme_id = "${escapeTomlString(config.defaultThemeId)}"`,
    `  font_theme_id = "${escapeTomlString(config.fontThemeId)}"`,
    `  theme_mode = "${escapeTomlString(config.themeMode)}"`,
    `  page_size = ${config.pageSize}`,
    `  archive_page_size = ${config.archivePageSize}`,
  ];
  if (config.siteAvatarUrl) {
    parts.push(
      `  site_avatar_url = "${escapeTomlString(config.siteAvatarUrl)}"`,
    );
  }
  if (config.faviconVersion) {
    parts.push(
      `  favicon_version = "${escapeTomlString(config.faviconVersion)}"`,
    );
  }

  return `${parts.join("\n")}\n`;
}

function buildJantDataToml(
  config: SiteConfig,
  iconAssets: SiteIconAssets,
): string {
  const footerHtml = config.siteFooter ? renderMarkdown(config.siteFooter) : "";
  const parts: string[] = [
    'format = "jant-site"',
    "version = 1",
    `generated_at = "${escapeTomlString(toISOString(Math.floor(Date.now() / 1000)))}"`,
    `site_name = "${escapeTomlString(config.siteName)}"`,
    `site_description = "${escapeTomlString(config.siteDescription)}"`,
    `site_language = "${escapeTomlString(config.siteLanguage)}"`,
    `home_default_view = "${escapeTomlString(config.homeDefaultView)}"`,
    `show_jant_branding_on_home = ${config.showJantBrandingOnHome}`,
    `show_header_avatar = ${config.showHeaderAvatar}`,
    `noindex = ${config.noindex}`,
    `site_avatar_mode = "${config.siteAvatarUrl ? "custom" : "none"}"`,
    `favicon_mode = "${iconAssets.faviconMode}"`,
    `apple_touch_mode = "${iconAssets.appleTouchMode}"`,
    `theme_id = "${escapeTomlString(config.themeId)}"`,
    `default_theme_id = "${escapeTomlString(config.defaultThemeId)}"`,
    `font_theme_id = "${escapeTomlString(config.fontThemeId)}"`,
    `theme_mode = "${escapeTomlString(config.themeMode)}"`,
    `page_size = ${config.pageSize}`,
    `archive_page_size = ${config.archivePageSize}`,
    'favicon_path = "/favicon.ico"',
    'apple_touch_icon_path = "/apple-touch-icon.png"',
  ];
  if (config.siteAvatarUrl) {
    parts.push(`site_avatar_url = "${escapeTomlString(config.siteAvatarUrl)}"`);
  }
  if (config.faviconVersion) {
    parts.push(
      `favicon_version = "${escapeTomlString(config.faviconVersion)}"`,
    );
  }
  if (footerHtml) {
    parts.push(`site_footer_html = "${escapeTomlString(footerHtml)}"`);
  }
  if (config.siteFooter) {
    parts.push(
      `site_footer_markdown = "${escapeTomlString(config.siteFooter)}"`,
    );
  }

  for (const item of config.navItems) {
    parts.push("");
    parts.push("[[nav]]");
    parts.push(`type = "${escapeTomlString(item.type)}"`);
    parts.push(`label = "${escapeTomlString(resolveNavItemLabel(item))}"`);
    parts.push(
      `url = "${escapeTomlString(resolveNavItemUrl(item, config.homeDefaultView))}"`,
    );
    parts.push(`system_key = "${escapeTomlString(item.systemKey ?? "")}"`);
    parts.push(`placement = "${escapeTomlString(item.placement ?? "header")}"`);
  }

  return `${parts.join("\n")}\n`;
}

function buildCollectionDirectoryDataToml(
  items: readonly ExportedCollectionDirectoryItem[],
): string {
  if (items.length === 0) {
    return "# Collection directory (empty)\n";
  }
  const parts: string[] = [];
  for (const item of items) {
    parts.push("[[items]]");
    parts.push(`type = "${escapeTomlString(item.type)}"`);
    if (item.type === "collection") {
      parts.push(`slug = "${escapeTomlString(item.slug)}"`);
      parts.push(`title = "${escapeTomlString(item.title)}"`);
      if (typeof item.entryCount === "number") {
        parts.push(`entry_count = ${item.entryCount}`);
      }
      if (item.recentActivityLabel) {
        parts.push(
          `recent_activity_label = "${escapeTomlString(item.recentActivityLabel)}"`,
        );
      }
    } else if (item.type === "divider") {
      if (item.label !== null) {
        parts.push(`label = "${escapeTomlString(item.label)}"`);
      }
    } else {
      parts.push(`label = "${escapeTomlString(item.label)}"`);
      parts.push(`url = "${escapeTomlString(item.url)}"`);
    }
    parts.push("");
  }
  return `${parts.join("\n").trimEnd()}\n`;
}

// ---------------------------------------------------------------------------
// README + .gitignore
// ---------------------------------------------------------------------------

function buildGitignore(): string {
  return `# Hugo build output
public/
resources/
.hugo_build.lock

# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/
*.swp
`;
}

function buildReadme(siteName: string): string {
  return `# ${siteName} — Hugo Export

This is a static site exported from [Jant](https://github.com/jant-me/jant), ready to build with [Hugo](https://gohugo.io/).

## Install Hugo

This export targets Hugo **extended 0.160.1+**.

**macOS (Homebrew):**

\`\`\`sh
brew install hugo
\`\`\`

**Windows (Scoop):**

\`\`\`sh
scoop install hugo-extended
\`\`\`

**Linux:**

Download the extended build from <https://github.com/gohugoio/hugo/releases>.

See the [Hugo installation docs](https://gohugo.io/installation/) for more options.

## Quick start

Preview locally:

\`\`\`sh
hugo serve
\`\`\`

Then open <http://localhost:1313> in your browser.

Build the site for deployment:

\`\`\`sh
hugo --minify
\`\`\`

The output goes to the \`public/\` directory. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

## Project structure

\`\`\`
hugo.toml                 — Site configuration (baseURL, title, theme, params)
content/
  _index.md               — Home section
  archive/_index.md       — Archive section
  collections/_index.md   — Collections directory section
  featured/_index.md      — Featured section
  {slug}/
    _index.md             — Thread root (branch bundle)
    {reply-slug}/
      index.md            — Reply (leaf bundle, not rendered as its own URL)
data/
  jant.toml               — Nav items, branding, display preferences
  collection_directory.toml — Ordered directory with dividers and links
themes/jant/              — Bundled Hugo theme (overrideable via layouts/ at the site root)
static/                   — Copy files here to add them to the published site
\`\`\`

## Customizing

- **Site settings** — edit \`hugo.toml\` to change the baseURL, title, or pagination.
- **Jant metadata** — \`data/jant.toml\` and \`data/collection_directory.toml\` drive nav and the collections directory, and are preserved across round-trip import.
- **Styles** — edit \`themes/jant/static/main.css\`, or drop a \`static/main.css\` at the site root to override.
- **Templates** — add files under \`layouts/\` at the site root to override the bundled theme.
- **Debugging** — export to a directory with \`jant site export --directory ./my-site\`, then run \`cd my-site && hugo serve\`.

## Notes

- Each thread is a Hugo branch bundle. Replies live as nested leaf bundles with \`build.render = "never"\` so they do not produce standalone URLs; they render inside the thread page.
- \`/{reply-slug}/\` URLs are preserved via \`aliases:\` on the root post, so old links still land on the right thread anchor.
- Media is exported as Hugo page resources (\`resources:\` front matter); their bytes are localized by the Jant CLI when you pass the default \`--localize-media\` flag.
- Posts with \`draft: true\` in front matter are only built when you pass \`--buildDrafts\` to \`hugo\` / \`hugo serve\`.
`;
}

// ---------------------------------------------------------------------------
// Re-exports for consumers (kept so existing entry points compile)
// ---------------------------------------------------------------------------

export {
  buildSiteIconAssets,
  buildExportedCollectionMetrics,
  buildExportedCollectionDirectoryItems,
  readStorageObjectBytes,
  getArchiveSummaryText,
  getMediaUrl,
  getPublicUrlForProvider,
};
