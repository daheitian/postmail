import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join, relative, extname } from "node:path";
import { parseArgs } from "node:util";
import { uuidv7 } from "uuidv7";
import { openNodeSqlite } from "../lib/node-sqlite.js";
import { loadNodeRuntime } from "../lib/load-node-runtime.js";

/**
 * Parse front matter from a Markdown file.
 * Supports both YAML (---...---) and TOML (+++...+++) delimiters.
 * Returns { frontMatter, body }.
 */
async function parseFrontMatter(content) {
  // Try YAML front matter (---...---)
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (yamlMatch) {
    const { parse } = await import("yaml");
    const frontMatter = parse(yamlMatch[1]) || {};
    return { frontMatter, body: yamlMatch[2] };
  }

  // Try TOML front matter (+++...+++)
  const tomlMatch = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?([\s\S]*)$/);
  if (tomlMatch) {
    const { parse } = await import("smol-toml");
    const frontMatter = parse(tomlMatch[1]);
    return { frontMatter, body: tomlMatch[2] };
  }

  return { frontMatter: {}, body: content };
}

async function parseToml(content) {
  const { parse } = await import("smol-toml");
  return parse(content);
}

function resolveImportUrl(url, siteConfig) {
  if (typeof url !== "string" || url.trim() === "" || url.startsWith("data:")) {
    return url;
  }

  const baseUrl =
    typeof siteConfig?.base_url === "string" ? siteConfig.base_url : "";
  if (!baseUrl) {
    return url;
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

/**
 * Parse reply markers from post body.
 * Returns array of { attrs, body } segments where the first is the root.
 */
function splitReplies(body) {
  const markerRegex = /<!-- jant:reply (.*?) -->/g;

  // Split body by markers, keeping the marker data
  const markers = [];
  let match;
  while ((match = markerRegex.exec(body)) !== null) {
    // Parse key="value" pairs from the marker
    const attrs = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    markers.push({
      index: match.index,
      endIndex: match.index + match[0].length,
      attrs,
    });
  }

  if (markers.length === 0) {
    return [{ attrs: null, body: body.trim() }];
  }

  const segments = [];

  // Root segment: everything before the first marker
  segments.push({ attrs: null, body: body.slice(0, markers[0].index).trim() });

  // Reply segments: between consecutive markers
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].endIndex;
    const end = i + 1 < markers.length ? markers[i + 1].index : body.length;
    segments.push({
      attrs: markers[i].attrs,
      body: body.slice(start, end).trim(),
    });
  }

  return segments;
}

/**
 * Find image URLs in markdown and return them.
 */
function findImageUrls(markdown) {
  const urls = new Set();
  const regex = /!\[[^\]]*\]\(([^)\s]+)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    urls.add(match[1]);
  }
  const htmlRegex = /<img\b[^>]*src="([^"]+)"/g;
  while ((match = htmlRegex.exec(markdown)) !== null) {
    urls.add(match[1]);
  }
  return [...urls];
}

/**
 * Remove exported Jant attachment blocks from markdown and return their metadata.
 */
function extractAttachmentBlocks(markdown) {
  const attachments = [];
  const blockRegex =
    /<div\s+data-jant-node="attachments">[\s\S]*?<\/div>/g;
  const figureRegex =
    /<figure\b[^>]*data-jant-node="attachment"[\s\S]*?<script\b[^>]*data-jant-meta[^>]*>([\s\S]*?)<\/script>[\s\S]*?<\/figure>/g;

  const stripped = markdown.replace(blockRegex, (block) => {
    let match;
    while ((match = figureRegex.exec(block)) !== null) {
      try {
        attachments.push(JSON.parse(match[1].trim()));
      } catch {
        // Ignore malformed attachment metadata and keep importing the rest.
      }
    }
    figureRegex.lastIndex = 0;
    return "";
  });

  return {
    markdown: stripped.replace(/\n{3,}/g, "\n\n").trim(),
    attachments,
  };
}

/**
 * Download a media file and upload it to the Jant API.
 * Returns the new URL, or null on failure.
 */
async function uploadRemoteMedia(media, apiUrl, token) {
  try {
    const response = await fetch(media.src);
    if (!response.ok) return null;

    const bytes = await response.arrayBuffer();
    const filename = media.originalName || getFilenameFromUrl(media.src);
    const fileType =
      media.mimeType ||
      response.headers.get("content-type")?.split(";")[0] ||
      guessMimeType(filename);
    const blob = new Blob([bytes], { type: fileType });

    const formData = new FormData();
    formData.append("file", blob, filename);
    if (media.alt) formData.append("alt", media.alt);
    if (media.summary) formData.append("summary", media.summary);
    if (media.width) formData.append("width", String(media.width));
    if (media.height) formData.append("height", String(media.height));
    if (media.blurhash) formData.append("blurhash", media.blurhash);
    if (media.waveform) formData.append("waveform", media.waveform);

    if (media.poster) {
      const posterResponse = await fetch(media.poster);
      if (posterResponse.ok) {
        const posterBytes = await posterResponse.arrayBuffer();
        const posterName = getFilenameFromUrl(media.poster);
        const posterType =
          posterResponse.headers.get("content-type")?.split(";")[0] ||
          guessMimeType(posterName);
        formData.append(
          "poster",
          new Blob([posterBytes], { type: posterType }),
          posterName,
        );
      }
    }

    const uploadResponse = await fetch(`${apiUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!uploadResponse.ok) return null;
    const data = await uploadResponse.json();
    return { url: data.url, id: data.id };
  } catch {
    return null;
  }
}

function getFilenameFromUrl(fileUrl) {
  try {
    const pathname = new URL(fileUrl).pathname;
    return pathname.split("/").pop() || "file";
  } catch {
    return fileUrl.split("/").pop() || "file";
  }
}

function guessMimeType(filename) {
  const ext = extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    case ".bmp":
      return "image/bmp";
    case ".ico":
      return "image/x-icon";
    case ".mp4":
      return "video/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".pdf":
      return "application/pdf";
    case ".json":
      return "application/json";
    case ".md":
      return "text/markdown";
    case ".csv":
      return "text/csv";
    case ".txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

function generateImportedStorageKey(originalName) {
  const id = uuidv7();
  const extension = extname(originalName) || "";
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const filename = `${id}${extension}`;
  return {
    id,
    filename,
    storageKey: `media/${year}/${month}/${filename}`,
  };
}

function getMediaPublicUrl(storageKey, provider, appConfig) {
  const base =
    provider === "s3"
      ? appConfig.s3PublicUrl
      : provider === "local"
        ? appConfig.localPublicUrl
        : appConfig.r2PublicUrl;

  if (base) {
    return `${base.replace(/\/+$/, "")}/${storageKey}`;
  }

  const prefix = appConfig.sitePathPrefix || "";
  return `${prefix}/${storageKey}`.replace(/\/{2,}/g, "/");
}

/**
 * Replace image URLs in markdown with newly uploaded URLs.
 */
function replaceImageUrls(markdown, urlMap) {
  let result = markdown;
  for (const [oldUrl, newUrl] of urlMap) {
    result = result.replaceAll(oldUrl, newUrl);
  }
  return result;
}

function normalizeMediaSpec(spec, siteConfig) {
  if (!spec || typeof spec.src !== "string" || spec.src.trim() === "") {
    return null;
  }

  return {
    kind: spec.kind,
    src: resolveImportUrl(spec.src, siteConfig),
    poster:
      typeof spec.poster === "string"
        ? resolveImportUrl(spec.poster, siteConfig)
        : null,
    mimeType: spec.mimeType || undefined,
    originalName: spec.originalName || undefined,
    size: typeof spec.size === "number" ? spec.size : undefined,
    width: typeof spec.width === "number" ? spec.width : undefined,
    height: typeof spec.height === "number" ? spec.height : undefined,
    alt: typeof spec.alt === "string" ? spec.alt : undefined,
    position: typeof spec.position === "string" ? spec.position : undefined,
    blurhash: typeof spec.blurhash === "string" ? spec.blurhash : undefined,
    waveform: typeof spec.waveform === "string" ? spec.waveform : undefined,
    summary: typeof spec.summary === "string" ? spec.summary : undefined,
    chars: typeof spec.chars === "number" ? spec.chars : undefined,
  };
}

async function uploadMediaList(mediaSpecs, target, siteConfig) {
  const urlMap = new Map();
  const mediaIds = [];
  let uploaded = 0;

  for (const spec of mediaSpecs) {
    const normalized = normalizeMediaSpec(spec, siteConfig);
    if (!normalized || normalized.src.startsWith("data:")) continue;
    const result = await target.uploadMedia(normalized);
    if (!result) continue;
    urlMap.set(normalized.src, result.url);
    mediaIds.push(result.id);
    uploaded += 1;
  }

  return { urlMap, mediaIds, uploaded };
}

function buildSettingsUpdatesFromConfig(siteConfig, customCss = "") {
  const jant = siteConfig?.extra?.jant || {};
  const themeId = String(jant.theme_id || "");
  const defaultThemeId = String(jant.default_theme_id || "");
  const fontThemeId = String(jant.font_theme_id || "");
  const themeMode = String(jant.theme_mode || "");
  const headerNavMaxVisible = Number(jant.header_nav_max_visible);

  return {
    SITE_NAME: String(siteConfig?.title || ""),
    SITE_DESCRIPTION: String(siteConfig?.description || ""),
    SITE_LANGUAGE: String(siteConfig?.default_language || "en"),
    SITE_FOOTER: String(jant.site_footer_markdown || ""),
    HOME_DEFAULT_VIEW:
      String(jant.home_default_view || "") === "featured" ? "featured" : "",
    HEADER_NAV_MAX_VISIBLE:
      Number.isFinite(headerNavMaxVisible) && headerNavMaxVisible !== 2
        ? String(headerNavMaxVisible)
        : "",
    SHOW_JANT_BRANDING_ON_HOME: jant.show_jant_branding_on_home ? "true" : "",
    NOINDEX: jant.noindex ? "true" : "",
    SHOW_HEADER_AVATAR: jant.show_header_avatar ? "true" : "",
    THEME: themeId && themeId !== defaultThemeId ? themeId : "",
    FONT_THEME: fontThemeId && fontThemeId !== "default" ? fontThemeId : "",
    THEME_MODE:
      themeMode === "light" || themeMode === "dark" ? themeMode : "",
    CUSTOM_CSS: customCss,
  };
}

function normalizeImportedNavItems(siteConfig) {
  const jant = siteConfig?.extra?.jant || {};
  const navItems = jant.nav;
  if (!Array.isArray(navItems)) {
    return {
      exported: Boolean(jant.nav_exported),
      items: [],
    };
  }

  return {
    exported: true,
    items: navItems
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const type = item.type === "system" ? "system" : "link";
        if (type === "system" && typeof item.system_key === "string") {
          return { type, systemKey: item.system_key };
        }
        if (
          type === "link" &&
          typeof item.label === "string" &&
          typeof item.url === "string"
        ) {
          return { type, label: item.label, url: item.url };
        }
        return null;
      })
      .filter(Boolean),
  };
}

function buildSiteAvatarImport(siteConfig) {
  const exportInfo = siteConfig?.extra?.jant_export || {};
  if (exportInfo.format !== "jant-site") {
    return null;
  }

  const jant = siteConfig?.extra?.jant || {};
  if (!jant.site_avatar_url || typeof jant.site_avatar_url !== "string") {
    return { mode: "remove" };
  }

  return {
    mode: "set",
    avatarUrl: resolveImportUrl(jant.site_avatar_url, siteConfig),
    appleTouchUrl:
      typeof jant.apple_touch_icon_url === "string"
        ? resolveImportUrl(jant.apple_touch_icon_url, siteConfig)
        : null,
  };
}

function createUploadFile(name, type, bytes) {
  return {
    name,
    type,
    size: bytes.byteLength,
    stream() {
      return new Blob([bytes], { type }).stream();
    },
  };
}

class ApiError extends Error {
  constructor(status, text) {
    super(`HTTP ${status}: ${text}`);
    this.status = status;
  }
}

async function apiCall(method, path, apiUrl, token, body) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const cause = err.cause?.code || err.cause?.message || err.message;
    if (
      cause === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      cause?.includes("certificate")
    ) {
      console.error(`\nSSL certificate error connecting to ${apiUrl}`);
      console.error("If using a local/self-signed certificate, run with:");
      console.error("  NODE_TLS_REJECT_UNAUTHORIZED=0 jant import-site ...");
      console.error("Or use: node --use-system-ca bin/jant.js import-site ...");
      process.exit(1);
    }
    throw new Error(
      `Network error calling ${method} ${apiUrl}${path}: ${cause}`,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text);
  }

  return response.json();
}

function createRemoteTarget(apiUrl, token) {
  return {
    async close() {},
    async updateSettings(updates) {
      return apiCall("PUT", "/api/settings", apiUrl, token, updates);
    },
    async listNavItems() {
      const result = await apiCall("GET", "/api/nav-items", apiUrl, token);
      return result.navItems || [];
    },
    async createNavItem(data) {
      return apiCall("POST", "/api/nav-items", apiUrl, token, data);
    },
    async deleteNavItem(id) {
      return apiCall("DELETE", `/api/nav-items/${id}`, apiUrl, token);
    },
    async removeSiteAvatar() {
      return apiCall("DELETE", "/api/settings/avatar", apiUrl, token);
    },
    async uploadSiteAvatar(data) {
      const avatarResponse = await fetch(data.avatarUrl);
      if (!avatarResponse.ok) {
        throw new Error(`Failed to fetch site avatar: ${data.avatarUrl}`);
      }

      const avatarBytes = await avatarResponse.arrayBuffer();
      const avatarName = getFilenameFromUrl(data.avatarUrl) || "avatar";
      const avatarType =
        avatarResponse.headers.get("content-type")?.split(";")[0] ||
        guessMimeType(avatarName);

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([avatarBytes], { type: avatarType }),
        avatarName,
      );

      if (data.appleTouchUrl) {
        const appleTouchResponse = await fetch(data.appleTouchUrl);
        if (appleTouchResponse.ok) {
          const appleTouchBytes = await appleTouchResponse.arrayBuffer();
          const appleTouchName =
            getFilenameFromUrl(data.appleTouchUrl) || "apple-touch-icon.png";
          const appleTouchType =
            appleTouchResponse.headers.get("content-type")?.split(";")[0] ||
            guessMimeType(appleTouchName);
          formData.append(
            "appleTouch",
            new Blob([appleTouchBytes], { type: appleTouchType }),
            appleTouchName,
          );
        }
      }

      const response = await fetch(`${apiUrl}/api/settings/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return response.json();
    },
    async syncSiteAvatar(data) {
      await this.removeSiteAvatar();
      if (!data) {
        return { success: true };
      }
      return this.uploadSiteAvatar(data);
    },
    async listCollections() {
      const existing = await apiCall("GET", "/api/collections", apiUrl, token);
      return existing.collections || [];
    },
    async createCollection(data) {
      return apiCall("POST", "/api/collections", apiUrl, token, data);
    },
    async createPost(data) {
      return apiCall("POST", "/api/posts", apiUrl, token, data);
    },
    async createAlias(path, targetSlug) {
      return apiCall("POST", "/api/custom-urls", apiUrl, token, {
        path,
        targetType: "post",
        targetId: targetSlug,
      });
    },
    async uploadMedia(media) {
      return uploadRemoteMedia(media, apiUrl, token);
    },
    async findPostBySlug() {
      return null;
    },
  };
}

async function createLocalTarget(env = process.env) {
  const { sqlite } = openNodeSqlite(env);
  const { createNodeCliRuntime, resolveConfig } = await loadNodeRuntime();
  const bindings = {
    ...(env ?? {}),
    NODE_SQLITE: sqlite,
  };
  const runtime = await createNodeCliRuntime(bindings);
  const allSettings = await runtime.services.settings.getAll();
  const appConfig = resolveConfig(bindings, allSettings);
  const summaryConfig = {
    maxParagraphs: appConfig.summaryMaxParagraphs,
    maxChars: appConfig.summaryMaxChars,
  };

  return {
    async close() {
      sqlite.close();
    },
    async updateSettings(updates) {
      await runtime.services.settings.setMany(updates);
      return { settings: updates };
    },
    async listNavItems() {
      return runtime.services.navItems.list();
    },
    async createNavItem(data) {
      return runtime.services.navItems.create(data);
    },
    async deleteNavItem(id) {
      return runtime.services.navItems.delete(id);
    },
    async removeSiteAvatar() {
      return runtime.services.settings.removeAvatar(runtime.storage);
    },
    async uploadSiteAvatar(data) {
      if (!runtime.storage) {
        throw new Error("Local import requires configured storage.");
      }

      const avatarResponse = await fetch(data.avatarUrl);
      if (!avatarResponse.ok) {
        throw new Error(`Failed to fetch site avatar: ${data.avatarUrl}`);
      }
      const avatarBytes = await avatarResponse.arrayBuffer();
      const avatarName = getFilenameFromUrl(data.avatarUrl) || "avatar";
      const avatarType =
        avatarResponse.headers.get("content-type")?.split(";")[0] ||
        guessMimeType(avatarName);

      let appleTouchIcon;
      if (data.appleTouchUrl) {
        const appleTouchResponse = await fetch(data.appleTouchUrl);
        if (appleTouchResponse.ok) {
          appleTouchIcon = await appleTouchResponse.arrayBuffer();
        }
      }

      await runtime.services.settings.uploadAvatar(
        {
          file: createUploadFile(
            avatarName,
            avatarType,
            new Uint8Array(avatarBytes),
          ),
          appleTouchIcon,
        },
        {
          media: runtime.services.media,
          storage: runtime.storage,
          storageProvider: appConfig.storageDriver,
          maxFileSizeMB: appConfig.uploadMaxFileSize,
        },
      );

      return { success: true };
    },
    async syncSiteAvatar(data) {
      await this.removeSiteAvatar();
      if (!data) {
        return { success: true };
      }
      return this.uploadSiteAvatar(data);
    },
    async listCollections() {
      return runtime.services.collections.list();
    },
    async createCollection(data) {
      return runtime.services.collections.create(data);
    },
    async createPost(data) {
      const post = await runtime.services.posts.create(data, summaryConfig);
      if (data.mediaIds && data.mediaIds.length > 0) {
        await runtime.services.media.attachToPost(post.id, data.mediaIds);
      }
      return post;
    },
    async createAlias(path, targetSlug) {
      const post = await runtime.services.posts.getBySlug(targetSlug);
      if (!post) {
        throw new Error(`Post with slug "${targetSlug}" not found`);
      }
      return runtime.services.customUrls.create({
        path,
        targetType: "post",
        targetId: post.id,
      });
    },
    async uploadMedia(mediaSpec) {
      if (!runtime.storage) {
        throw new Error("Local import requires configured storage.");
      }

      const response = await fetch(mediaSpec.src);
      if (!response.ok) return null;

      const originalName =
        mediaSpec.originalName || getFilenameFromUrl(mediaSpec.src) || "file";
      const bytes = new Uint8Array(await response.arrayBuffer());
      const { id, filename, storageKey } = generateImportedStorageKey(
        originalName,
      );
      const mimeType =
        mediaSpec.mimeType ||
        response.headers.get("content-type")?.split(";")[0] ||
        guessMimeType(originalName);
      let posterKey;

      if (mediaSpec.poster) {
        const posterResponse = await fetch(mediaSpec.poster);
        if (posterResponse.ok) {
          const posterName =
            getFilenameFromUrl(mediaSpec.poster) || "poster.webp";
          const posterExt = extname(posterName) || ".webp";
          posterKey = storageKey.replace(
            /(\.[^.]+)?$/,
            `-poster${posterExt}`,
          );
          await runtime.storage.put(
            posterKey,
            new Uint8Array(await posterResponse.arrayBuffer()),
            {
              contentType:
                posterResponse.headers.get("content-type")?.split(";")[0] ||
                guessMimeType(posterName),
            },
          );
        }
      }

      await runtime.storage.put(storageKey, bytes, {
        contentType: mimeType,
      });

      const createdMedia = await runtime.services.media.create({
        id,
        filename,
        originalName,
        mimeType,
        size: mediaSpec.size ?? bytes.byteLength,
        storageKey,
        provider: appConfig.storageDriver,
        width: mediaSpec.width ?? undefined,
        height: mediaSpec.height ?? undefined,
        alt: mediaSpec.alt ?? undefined,
        position: mediaSpec.position ?? undefined,
        blurhash: mediaSpec.blurhash ?? undefined,
        waveform: mediaSpec.waveform ?? undefined,
        posterKey,
        summary: mediaSpec.summary ?? undefined,
        chars: mediaSpec.chars ?? undefined,
        mediaKind: mediaSpec.kind ?? undefined,
      });

      return {
        id: createdMedia.id,
        url: getMediaPublicUrl(
          createdMedia.storageKey,
          createdMedia.provider,
          appConfig,
        ),
      };
    },
    async findPostBySlug(slug) {
      return runtime.services.posts.getBySlug(slug);
    },
  };
}

/**
 * Recursively walk a directory's content/ folder and collect post/collection files.
 */
async function walkContent(rootDir, postFiles, collectionFiles) {
  const contentDir = join(rootDir, "content");
  const contentStat = await stat(contentDir).catch(() => null);
  if (!contentStat?.isDirectory()) {
    console.error(`No content/ directory found in ${rootDir}`);
    process.exit(1);
  }

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name === "index.md" || entry.name === "_index.md") {
        const relPath = relative(rootDir, fullPath).replace(/\\/g, "/");
        const content = await readFile(fullPath, "utf-8");
        if (
          (relPath.startsWith("content/jant-collections/") ||
            relPath.startsWith("content/c/")) &&
          relPath.endsWith("/_index.md")
        ) {
          collectionFiles.push({ path: relPath, content });
        } else if (
          relPath.startsWith("content/") &&
          relPath.endsWith("/index.md") &&
          relPath !== "content/_index.md"
        ) {
          postFiles.push({ path: relPath, content });
        }
      }
    }
  }

  await walk(contentDir);
}

export const __test__ = {
  resolveImportUrl,
  normalizeMediaSpec,
  buildSettingsUpdatesFromConfig,
  normalizeImportedNavItems,
  buildSiteAvatarImport,
};

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      url: { type: "string" },
      token: { type: "string" },
      path: { type: "string", default: "." },
      "dry-run": { type: "boolean", default: false },
      "skip-media": { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log("Usage: jant site import [--url <url>] [options]");
    console.log("");
    console.log("Import a Zola export ZIP into a Jant instance.");
    console.log("");
    console.log("Modes:");
    console.log("  Local           No --url; imports into the local Node SQLite runtime");
    console.log("  Remote          --url requires JANT_TOKEN or --token");
    console.log("");
    console.log("Options:");
    console.log("  --url         Target remote Jant instance URL");
    console.log(
      "  --path        Path to export directory or ZIP file (default: .)",
    );
    console.log("  --dry-run     Parse and validate without making API calls");
    console.log("  --skip-media  Skip image download/upload");
    console.log("");
    console.log("Authentication:");
    console.log("  Set JANT_TOKEN env var (recommended):");
    console.log("    export JANT_TOKEN=jnt_your_token");
    console.log("    jant site import --url https://your-site.com");
    console.log("");
    console.log("Compatibility alias: jant import-site");
    process.exit(0);
  }

  const token = process.env.JANT_TOKEN || values.token;
  if (values.url && !token && !values["dry-run"]) {
    console.error(
      "Error: JANT_TOKEN env var is required for remote import (unless using --dry-run)",
    );
    console.error("");
    console.error("  export JANT_TOKEN=jnt_your_token");
    process.exit(1);
  }

  const apiUrl = values.url?.replace(/\/$/, "");
  const dryRun = values["dry-run"];
  const skipMedia = values["skip-media"];
  const target = dryRun
    ? null
    : values.url
      ? createRemoteTarget(apiUrl, token)
      : await createLocalTarget(process.env);

  // 1. Read source — directory or ZIP
  const inputPath = resolve(process.cwd(), values.path);
  const inputStat = await stat(inputPath).catch(() => null);

  if (!inputStat) {
    console.error(`Path not found: ${inputPath}`);
    process.exit(1);
  }

  const postFiles = [];
  const collectionFiles = [];
  let siteConfig = null;
  let customCss = "";

  if (inputStat.isDirectory()) {
    console.log(`Reading directory ${inputPath}...`);
    await walkContent(inputPath, postFiles, collectionFiles);
    const configPath = join(inputPath, "config.toml");
    const configContent = await readFile(configPath, "utf-8").catch(() => null);
    if (configContent) {
      siteConfig = await parseToml(configContent);
    }
    customCss = await readFile(join(inputPath, "static", "custom.css"), "utf-8")
      .catch(() => "");
  } else {
    console.log(`Reading ZIP ${inputPath}...`);
    const zipData = await readFile(inputPath);
    const { unzipSync } = await import("fflate");
    const files = unzipSync(new Uint8Array(zipData));
    const decoder = new TextDecoder();

    if (files["config.toml"]) {
      siteConfig = await parseToml(decoder.decode(files["config.toml"]));
    }
    if (files["static/custom.css"]) {
      customCss = decoder.decode(files["static/custom.css"]);
    }

    for (const [path, data] of Object.entries(files)) {
      if (
        (path.startsWith("content/jant-collections/") ||
          path.startsWith("content/c/")) &&
        path.endsWith("/_index.md")
      ) {
        collectionFiles.push({ path, content: decoder.decode(data) });
      } else if (
        path.startsWith("content/") &&
        path.endsWith("/index.md") &&
        path !== "content/_index.md"
      ) {
        postFiles.push({ path, content: decoder.decode(data) });
      }
    }
  }

  console.log(
    `Found ${postFiles.length} posts and ${collectionFiles.length} collections`,
  );

  if (siteConfig) {
    const settingsUpdates = buildSettingsUpdatesFromConfig(siteConfig, customCss);
    const importedNav = normalizeImportedNavItems(siteConfig);
    const avatarImport = buildSiteAvatarImport(siteConfig);

    if (dryRun) {
      console.log("[dry-run] Would apply exported site settings");
      if (importedNav.exported) {
        console.log(
          `[dry-run] Would replace navigation with ${importedNav.items.length} items`,
        );
      }
      if (avatarImport && !skipMedia) {
        if (avatarImport.mode === "remove") {
          console.log("[dry-run] Would remove existing site avatar");
        } else {
          console.log("[dry-run] Would import exported site avatar");
        }
      }
    } else {
      try {
        const result = await target.updateSettings(settingsUpdates);
        if (result?.rejectedKeys?.length) {
          console.warn(
            `Warning: Some site settings were rejected: ${result.rejectedKeys.join(", ")}`,
          );
        }
      } catch (err) {
        console.error(`Error applying exported site settings: ${err.message}`);
        process.exit(1);
      }

      if (importedNav.exported) {
        try {
          const existingNavItems = await target.listNavItems();
          for (const item of existingNavItems) {
            await target.deleteNavItem(item.id);
          }
          for (const item of importedNav.items) {
            await target.createNavItem(item);
          }
        } catch (err) {
          console.error(`Error importing navigation: ${err.message}`);
          process.exit(1);
        }
      }

      if (avatarImport && !skipMedia) {
        try {
          await target.syncSiteAvatar(
            avatarImport.mode === "set" ? avatarImport : null,
          );
        } catch (err) {
          console.error(`Error importing site avatar: ${err.message}`);
          process.exit(1);
        }
      }
    }
  }

  // 3. Fetch existing collections and create missing ones
  const collectionSlugToId = new Map();

  if (!dryRun) {
    try {
      const existingCollections = await target.listCollections();
      for (const col of existingCollections) {
        collectionSlugToId.set(col.slug, col.id);
      }
    } catch (err) {
      console.error(`Error fetching existing collections: ${err.message}`);
      process.exit(1);
    }
  }

  for (const { path, content } of collectionFiles) {
    const { frontMatter } = await parseFrontMatter(content);
    const slug = path
      .replace("content/jant-collections/", "")
      .replace("content/c/", "")
      .replace("/_index.md", "");

    if (collectionSlugToId.has(slug)) {
      console.log(`Skipped collection (exists): ${frontMatter.title || slug}`);
      continue;
    }

    if (dryRun) {
      console.log(
        `[dry-run] Would create collection: ${frontMatter.title || slug}`,
      );
      collectionSlugToId.set(slug, `dry-run-${slug}`);
      continue;
    }

    try {
      const collectionExtra = frontMatter.extra || {};
      const result = await target.createCollection({
        title: frontMatter.title || slug,
        slug,
        description: frontMatter.description || null,
        sortOrder:
          collectionExtra.sort_order || collectionExtra.sortOrder || undefined,
      });
      collectionSlugToId.set(slug, result.id);
      console.log(`Created collection: ${frontMatter.title || slug}`);
    } catch (err) {
      console.error(`Error creating collection "${slug}": ${err.message}`);
      process.exit(1);
    }
  }

  // 4. Process posts
  let postsCreated = 0;
  let repliesCreated = 0;
  let mediaUploaded = 0;
  let aliasesCreated = 0;
  let skipped = 0;

  for (const { path, content } of postFiles) {
    const { frontMatter, body } = await parseFrontMatter(content);

    const segments = splitReplies(body);
    const rootSegment = segments[0];
    const replySegments = segments.slice(1);

    // Resolve collection IDs from taxonomy slugs
    const collectionIds = [];
    const taxonomyCollections =
      frontMatter.taxonomies?.c || frontMatter.taxonomies?.collections || [];
    for (const colSlug of taxonomyCollections) {
      const id = collectionSlugToId.get(colSlug);
      if (id) collectionIds.push(id);
    }

    // Process images in root body
    let rootBody = rootSegment?.body || "";
    const {
      markdown: rootBodyWithoutAttachments,
      attachments: rootAttachments,
    } = extractAttachmentBlocks(rootBody);
    rootBody = rootBodyWithoutAttachments;
    let mediaIds = [];

    if (!skipMedia && !dryRun) {
      const imageMedia = findImageUrls(rootBody).map((src) => ({ src }));
      const uploadResult = await uploadMediaList(
        [...rootAttachments, ...imageMedia],
        target,
        siteConfig,
      );
      mediaIds = uploadResult.mediaIds;
      mediaUploaded += uploadResult.uploaded;

      if (uploadResult.urlMap.size > 0) {
        rootBody = replaceImageUrls(rootBody, uploadResult.urlMap);
      }
    }

    const extra = frontMatter.extra || {};
    const format = extra.format || "note";
    const postStatus =
      extra.status === "draft" || extra.status === "published"
        ? extra.status
        : frontMatter.draft
          ? "draft"
          : "published";
    const postVisibility =
      extra.visibility === "unlisted" || extra.visibility === "private"
        ? extra.visibility
        : undefined;

    const postData = {
      format,
      title: frontMatter.title != null ? String(frontMatter.title) : undefined,
      bodyMarkdown: rootBody || undefined,
      slug: frontMatter.slug != null ? String(frontMatter.slug) : undefined,
      path: frontMatter.path != null ? String(frontMatter.path) : undefined,
      status: postStatus,
      visibility: postVisibility,
      collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      publishedAt:
        postStatus === "published" && frontMatter.date
          ? Math.floor(new Date(frontMatter.date).getTime() / 1000)
          : undefined,
      pinned: extra.pinned || undefined,
      featured: extra.featured || undefined,
      rating: extra.rating || undefined,
    };

    if (format === "link" && extra.link_url) {
      postData.url = extra.link_url;
    }
    if (format === "quote" && extra.quote_text) {
      postData.quoteText = extra.quote_text;
    }

    if (dryRun) {
      console.log(
        `[dry-run] Would create post: ${frontMatter.title || frontMatter.slug || "(untitled)"} (${format})`,
      );
      if (replySegments.length > 0) {
        console.log(`  [dry-run] With ${replySegments.length} replies`);
      }
      postsCreated++;
      repliesCreated += replySegments.length;
      continue;
    }

    const postLabel = frontMatter.title || frontMatter.slug || "(untitled)";

    const progress = `[${postsCreated + skipped + 1}/${postFiles.length}]`;
    const existingPost =
      postData.slug && !dryRun ? await target.findPostBySlug(postData.slug) : null;

    let post;
    if (existingPost) {
      post = existingPost;
      console.log(`${progress} Skipped: ${postLabel}`);
      skipped++;
    } else {
      try {
        post = await target.createPost(postData);
        postsCreated++;
        const replyInfo =
          replySegments.length > 0 ? ` (+${replySegments.length} replies)` : "";
        console.log(`${progress} Created: ${postLabel}${replyInfo}`);
      } catch (err) {
        if (err.status === 409) {
          console.log(`${progress} Skipped: ${postLabel}`);
          skipped++;
        } else {
          console.error(`Error creating post "${postLabel}": ${err.message}`);
          process.exit(1);
        }
      }
    }

    // Create custom URL aliases from front matter (also for skipped posts)
    const aliases = frontMatter.aliases || [];
    const postSlug =
      frontMatter.slug != null ? String(frontMatter.slug) : post?.slug;
    for (const alias of aliases) {
      const aliasPath = alias.startsWith("/") ? alias : `/${alias}`;
      if (aliasPath === `/${postSlug}`) continue; // skip self-reference
      try {
        await target.createAlias(aliasPath, postSlug);
        aliasesCreated++;
      } catch (err) {
        if (err.status === 409) continue; // alias already exists
        console.warn(
          `  Warning: Failed to create alias "${aliasPath}": ${err.message}`,
        );
      }
    }

    // Create replies (only for newly created posts)
    if (!post) continue;
    for (const replySegment of replySegments) {
      const replyAttrs = replySegment.attrs || {};
      let replyBody = replySegment.body || "";
      const {
        markdown: replyBodyWithoutAttachments,
        attachments: replyAttachments,
      } = extractAttachmentBlocks(replyBody);
      replyBody = replyBodyWithoutAttachments;
      let replyMediaIds = [];

      if (!skipMedia && !dryRun) {
        const imageMedia = findImageUrls(replyBody).map((src) => ({ src }));
        const uploadResult = await uploadMediaList(
          [...replyAttachments, ...imageMedia],
          target,
          siteConfig,
        );
        replyMediaIds = uploadResult.mediaIds;
        mediaUploaded += uploadResult.uploaded;

        if (uploadResult.urlMap.size > 0) {
          replyBody = replaceImageUrls(replyBody, uploadResult.urlMap);
        }
      }

      const replyFormat = replyAttrs.format || "note";
      const replyStatus =
        replyAttrs.status === "draft" || replyAttrs.status === "published"
          ? replyAttrs.status
          : "published";
      const replyVisibility =
        replyAttrs.visibility === "unlisted" || replyAttrs.visibility === "private"
          ? replyAttrs.visibility
          : undefined;
      const replyData = {
        format: replyFormat,
        status: replyStatus,
        title: replyAttrs.title || undefined,
        bodyMarkdown: replyBody || undefined,
        replyToId: post.id,
        slug: replyAttrs.slug || undefined,
        visibility: replyVisibility,
        mediaIds: replyMediaIds.length > 0 ? replyMediaIds : undefined,
        publishedAt: replyAttrs.date
          ? Math.floor(new Date(replyAttrs.date).getTime() / 1000)
          : undefined,
        rating: replyAttrs.rating ? Number(replyAttrs.rating) : undefined,
      };

      if (replyFormat === "link" && replyAttrs.url) {
        replyData.url = replyAttrs.url;
      }
      if (replyFormat === "quote" && replyAttrs.quote_text) {
        replyData.quoteText = decodeURIComponent(replyAttrs.quote_text);
      }

      const existingReply =
        replyData.slug ? await target.findPostBySlug(replyData.slug) : null;
      if (existingReply) {
        console.log(`  Skipped reply (exists)`);
        skipped++;
        continue;
      }

      try {
        await target.createPost(replyData);
        repliesCreated++;
      } catch (err) {
        if (err.status === 409) {
          console.log(`  Skipped reply (exists)`);
          skipped++;
          continue;
        }
        console.error(`  Error creating reply: ${err.message}`);
        process.exit(1);
      }
    }
  }

  await target?.close();

  // 5. Summary
  console.log("");
  console.log("Import complete:");
  console.log(`  Posts created: ${postsCreated}`);
  console.log(`  Replies created: ${repliesCreated}`);
  console.log(`  Media uploaded: ${mediaUploaded}`);
  if (aliasesCreated > 0) {
    console.log(`  Aliases created: ${aliasesCreated}`);
  }
  if (skipped > 0) {
    console.log(`  Skipped (already exist): ${skipped}`);
  }
  if (dryRun) {
    console.log("  (dry-run mode — no changes were made)");
  }
}
