/**
 * Export Service
 *
 * Generates a ready-to-use Zola static site as a ZIP archive.
 * Threads are merged into single pages with reply marker comments.
 * Media URLs point to the original site (not exported).
 */

import type { PostService } from "./post.js";
import type { PathService } from "./path.js";
import type { CollectionService } from "./collection.js";
import type { MediaService } from "./media.js";
import {
  buildJantLogoSvgMarkup,
  HOME_BRANDING_LINK_LABEL,
  HOME_BRANDING_PREFIX,
  JANT_REPO_URL,
} from "../lib/jant-branding.js";
import { tiptapJsonToMarkdown } from "../lib/tiptap-to-markdown.js";
import { getMediaUrl, getPublicUrlForProvider } from "../lib/image.js";
import { escapeHtml } from "../lib/html.js";
import { render as renderMarkdown } from "../lib/markdown.js";
import { toISOString } from "../lib/time.js";
import type { Post, Collection, Media, NavItem } from "../types.js";

export interface ExportService {
  generateZolaSite(): Promise<Uint8Array>;
}

interface SiteConfig {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  siteLanguage: string;
  showJantBrandingOnHome: boolean;
  homeDefaultView: string;
  headerNavMaxVisible: number;
  siteFooter: string;
  showHeaderAvatar: boolean;
  siteAvatarUrl: string;
  appleTouchIconUrl?: string;
  faviconUrl?: string;
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
    "type" | "systemKey" | "label" | "url" | "position"
  >[];
}

interface AttachmentExportMeta {
  kind: Media["mediaKind"];
  src: string;
  poster: string | null;
  mimeType: string;
  originalName: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  position: string;
  blurhash: string | null;
  waveform: string | null;
  summary: string | null;
  chars: number | null;
}

export function createExportService(
  services: {
    posts: PostService;
    paths: PathService;
    collections: CollectionService;
    media: MediaService;
  },
  siteConfig: SiteConfig,
): ExportService {
  return {
    async generateZolaSite() {
      // 1. Query all data
      const [allPosts, allCollections] = await Promise.all([
        services.posts.list({
          excludeReplies: false,
          limit: 10000,
        }),
        services.collections.list(),
      ]);

      const allPostIds = allPosts.map((p) => p.id);
      const roots = allPosts.filter((p) => p.replyToId === null);
      const replies = allPosts.filter((p) => p.replyToId !== null);
      const rootPostIds = roots.map((p) => p.id);

      const [
        collectionsByPost,
        rawMediaByPost,
        slugMap,
        aliasMap,
        collectionSlugMap,
      ] = await Promise.all([
        services.collections.getCollectionsByPostIds(allPostIds),
        services.media.getByPostIds(allPostIds),
        services.paths.getPostSlugMap(allPostIds),
        services.paths.getPostAliases(rootPostIds),
        services.paths.getCollectionSlugMap(allCollections.map((c) => c.id)),
      ]);

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

      // 3. Build ZIP file structure
      const { zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {};

      // Generate post files
      for (const root of roots) {
        const slug = slugMap.get(root.id) ?? root.slug;
        const threadReplies = repliesByThread.get(root.id) ?? [];
        const postCollections = collectionsByPost.get(root.id) ?? [];
        const aliases = aliasMap.get(root.id) ?? [];
        const rootMedia = rawMediaByPost.get(root.id) ?? [];

        // Collect reply slugs as aliases
        for (const reply of threadReplies) {
          const replySlug = slugMap.get(reply.id) ?? reply.slug;
          aliases.push(`/${replySlug}`);
        }

        const markdown = buildPostMarkdown(
          root,
          threadReplies,
          postCollections,
          aliases,
          slugMap,
          collectionSlugMap,
          rootMedia,
          rawMediaByPost,
          siteConfig,
        );

        files[`content/${slug}/index.md`] = new TextEncoder().encode(markdown);
      }

      for (const collection of allCollections) {
        const slug = collectionSlugMap.get(collection.id) ?? collection.slug;
        const section = buildCollectionSection(collection);
        files[`content/jant-collections/${slug}/_index.md`] =
          new TextEncoder().encode(section);
      }

      // Generate scaffold
      files["config.toml"] = new TextEncoder().encode(
        buildConfigToml(siteConfig),
      );
      files["content/_index.md"] = new TextEncoder().encode(buildRootSection());
      files["templates/base.html"] = new TextEncoder().encode(TEMPLATE_BASE);
      files["templates/index.html"] = new TextEncoder().encode(TEMPLATE_INDEX);
      files["templates/page.html"] = new TextEncoder().encode(TEMPLATE_PAGE);
      files["templates/section.html"] = new TextEncoder().encode(
        TEMPLATE_SECTION,
      );
      files["templates/taxonomy_list.html"] = new TextEncoder().encode(
        TEMPLATE_TAXONOMY_LIST,
      );
      files["templates/taxonomy_single.html"] = new TextEncoder().encode(
        TEMPLATE_TAXONOMY_SINGLE,
      );
      files["templates/atom.xml"] = new TextEncoder().encode(TEMPLATE_ATOM);
      files["templates/macros.html"] = new TextEncoder().encode(
        TEMPLATE_MACROS,
      );
      files["static/style.css"] = new TextEncoder().encode(STYLE_CSS);
      files["static/theme.css"] = new TextEncoder().encode(
        siteConfig.themeCss ?? "",
      );
      files["static/custom.css"] = new TextEncoder().encode(
        siteConfig.customCss ?? "",
      );
      files["README.md"] = new TextEncoder().encode(
        buildReadme(siteConfig.siteName),
      );

      return zipSync(files);
    },
  };
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

/** Escape a string for use inside a TOML double-quoted value */
function escapeToml(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

/** Escape a string for use in YAML (wrap in quotes if needed) */
function yamlString(value: string): string {
  // If value contains characters that need quoting in YAML
  if (
    /[:#{}[\],&*?|>!%@`"'\n\\]/.test(value) ||
    value.startsWith(" ") ||
    value.endsWith(" ") ||
    value === "" ||
    value === "true" ||
    value === "false" ||
    value === "null"
  ) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return value;
}

function buildPostMarkdown(
  root: Post,
  threadReplies: Post[],
  postCollections: Collection[],
  aliases: string[],
  slugMap: Map<string, string>,
  collectionSlugMap: Map<string, string>,
  rootMedia: Media[],
  mediaByPost: Map<string, Media[]>,
  siteConfig: SiteConfig,
): string {
  const parts: string[] = [];

  // Front matter (YAML)
  parts.push("---");
  if (root.title) {
    parts.push(`title: ${yamlString(root.title)}`);
  }
  const date = root.publishedAt ?? root.createdAt;
  if (date) {
    parts.push(`date: ${toISOString(date)}`);
  }
  if (root.updatedAt && root.updatedAt !== root.publishedAt) {
    parts.push(`updated: ${toISOString(root.updatedAt)}`);
  }
  if (root.status === "draft" || root.visibility === "private") {
    parts.push("draft: true");
  }

  const slug = slugMap.get(root.id) ?? root.slug;
  parts.push(`slug: ${yamlString(slug)}`);

  if (aliases.length > 0) {
    parts.push("aliases:");
    for (const a of aliases) {
      parts.push(`  - ${yamlString(a)}`);
    }
  }

  // Taxonomies
  if (postCollections.length > 0) {
    parts.push("taxonomies:");
    parts.push("  c:");
    for (const c of postCollections) {
      const colSlug = collectionSlugMap.get(c.id) ?? c.slug;
      parts.push(`    - ${yamlString(colSlug)}`);
    }
  }

  // Extra metadata
  parts.push("extra:");
  parts.push(`  format: ${root.format}`);
  parts.push(`  status: ${root.status}`);
  parts.push(`  visibility: ${root.visibility}`);
  if (root.url) {
    parts.push(`  link_url: ${yamlString(root.url)}`);
  }
  if (root.quoteText) {
    parts.push(`  quote_text: ${yamlString(root.quoteText)}`);
  }
  if (root.rating !== null) {
    parts.push(`  rating: ${root.rating}`);
  }
  if (root.pinnedAt !== null) {
    parts.push("  pinned: true");
  }
  if (root.featuredAt !== null) {
    parts.push("  featured: true");
  }

  parts.push("---");
  parts.push("");

  // Root body
  const rootBlocks = [
    root.body ? tiptapJsonToMarkdown(root.body) : "",
    buildAttachmentBlock(rootMedia, siteConfig),
  ].filter(Boolean);
  if (rootBlocks.length > 0) {
    parts.push(rootBlocks.join("\n\n"));
  }

  // Thread replies
  for (const reply of threadReplies) {
    parts.push("");

    // Reply marker comment
    const replySlug = slugMap.get(reply.id) ?? reply.slug;
    const esc = escapeCommentAttribute;
    let marker = `<!-- jant:reply date="${reply.publishedAt ? toISOString(reply.publishedAt) : ""}" slug="${esc(replySlug)}" format="${reply.format}" status="${reply.status}" visibility="${reply.visibility}"`;

    if (reply.format === "link" && reply.url) {
      marker += ` url="${esc(reply.url)}"`;
    }
    if (reply.format === "quote" && reply.quoteText) {
      marker += ` quote_text="${encodeURIComponent(reply.quoteText)}"`;
    }
    if (reply.rating !== null) {
      marker += ` rating="${reply.rating}"`;
    }
    if (reply.title) {
      marker += ` title="${esc(reply.title)}"`;
    }
    marker += " -->";

    parts.push(marker);
    parts.push("");

    const replyBlocks = [
      reply.body ? tiptapJsonToMarkdown(reply.body) : "",
      buildAttachmentBlock(mediaByPost.get(reply.id) ?? [], siteConfig),
    ].filter(Boolean);
    if (replyBlocks.length > 0) {
      parts.push(replyBlocks.join("\n\n"));
    }
  }

  return parts.join("\n");
}

function buildCollectionSection(collection: Collection): string {
  const parts: string[] = ["+++"];
  parts.push(`title = "${escapeToml(collection.title)}"`);
  parts.push("render = false");
  if (collection.description) {
    parts.push(`description = "${escapeToml(collection.description)}"`);
  }
  parts.push("[extra]");
  if (collection.icon) {
    parts.push(`icon = "${escapeToml(collection.icon)}"`);
  }
  parts.push(`sort_order = "${escapeToml(collection.sortOrder)}"`);
  parts.push("jant_collection = true");
  parts.push("+++");
  parts.push("");
  return parts.join("\n");
}

function buildAttachmentBlock(
  mediaList: Media[],
  siteConfig: SiteConfig,
): string {
  if (mediaList.length === 0) return "";

  const figures = mediaList
    .map((media) => buildAttachmentFigure(media, siteConfig))
    .join("\n");

  return `<div data-jant-node="attachments">\n${figures}\n</div>`;
}

function buildAttachmentFigure(media: Media, siteConfig: SiteConfig): string {
  const meta = buildAttachmentMeta(media, siteConfig);
  const metaJson = safeJsonForHtml(meta);
  const name = escapeHtml(meta.originalName);
  const caption =
    media.summary && media.summary !== media.originalName
      ? `<figcaption>${escapeHtml(media.summary)}</figcaption>`
      : "";

  if (meta.kind === "image") {
    const alt = media.alt ? ` alt="${escapeHtml(media.alt)}"` : ' alt=""';
    return `<figure data-jant-node="attachment" data-jant-kind="image">
  <script type="application/json" data-jant-meta>${metaJson}</script>
  <img src="${escapeHtml(meta.src)}"${alt}>
  ${caption}
</figure>`;
  }

  if (meta.kind === "video") {
    const posterAttr = meta.poster
      ? ` poster="${escapeHtml(meta.poster)}"`
      : "";
    return `<figure data-jant-node="attachment" data-jant-kind="video">
  <script type="application/json" data-jant-meta>${metaJson}</script>
  <video controls preload="metadata"${posterAttr}>
    <source src="${escapeHtml(meta.src)}" type="${escapeHtml(meta.mimeType)}">
  </video>
  ${caption}
</figure>`;
  }

  if (meta.kind === "audio") {
    return `<figure data-jant-node="attachment" data-jant-kind="audio">
  <script type="application/json" data-jant-meta>${metaJson}</script>
  <audio controls preload="metadata" src="${escapeHtml(meta.src)}"></audio>
  ${caption}
</figure>`;
  }

  const description = buildAttachmentTextDescription(media);
  const figcaption = description
    ? `<figcaption>${escapeHtml(description)}</figcaption>`
    : "";
  return `<figure data-jant-node="attachment" data-jant-kind="${escapeHtml(meta.kind)}">
  <script type="application/json" data-jant-meta>${metaJson}</script>
  <a href="${escapeHtml(meta.src)}">${name}</a>
  ${figcaption}
</figure>`;
}

function buildAttachmentTextDescription(media: Media): string {
  if (media.mediaKind === "text") {
    const summary = media.summary?.trim();
    if (summary) return summary;
    if (media.chars) return `${media.chars} chars`;
  }

  if (media.summary?.trim()) {
    return media.summary.trim();
  }

  return media.mimeType;
}

function buildAttachmentMeta(
  media: Media,
  siteConfig: SiteConfig,
): AttachmentExportMeta {
  const publicUrl = getPublicUrlForProvider(
    media.provider,
    siteConfig.r2PublicUrl,
    siteConfig.s3PublicUrl,
    siteConfig.localPublicUrl,
  );

  return {
    kind: media.mediaKind,
    src: getMediaUrl(media.storageKey, publicUrl, siteConfig.sitePathPrefix),
    poster: media.posterKey
      ? getMediaUrl(media.posterKey, publicUrl, siteConfig.sitePathPrefix)
      : null,
    mimeType: media.mimeType,
    originalName: media.originalName,
    size: media.size,
    width: media.width,
    height: media.height,
    alt: media.alt,
    position: media.position,
    blurhash: media.blurhash,
    waveform: media.waveform,
    summary: media.summary,
    chars: media.chars,
  };
}

function escapeCommentAttribute(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

function safeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function buildConfigToml(config: SiteConfig): string {
  const footerHtml = config.siteFooter ? renderMarkdown(config.siteFooter) : "";
  const parts = [
    `base_url = "${escapeToml(config.siteUrl || "https://example.com")}"`,
    `title = "${escapeToml(config.siteName)}"`,
    `description = "${escapeToml(config.siteDescription)}"`,
    `default_language = "${escapeToml(config.siteLanguage)}"`,
    "generate_feeds = true",
    "compile_sass = false",
    "",
    'feed_filenames = ["atom.xml"]',
    "",
    "[extra.jant_export]",
    'format = "jant-site"',
    "version = 1",
    "",
    "[extra.jant]",
    `home_default_view = "${escapeToml(config.homeDefaultView)}"`,
    `header_nav_max_visible = ${config.headerNavMaxVisible}`,
    `show_jant_branding_on_home = ${config.showJantBrandingOnHome}`,
    `show_header_avatar = ${config.showHeaderAvatar}`,
    `noindex = ${config.noindex}`,
    "nav_exported = true",
    `theme_id = "${escapeToml(config.themeId || config.defaultThemeId)}"`,
    `default_theme_id = "${escapeToml(config.defaultThemeId)}"`,
    `font_theme_id = "${escapeToml(config.fontThemeId)}"`,
    `theme_mode = "${escapeToml(config.themeMode)}"`,
  ];

  if (config.siteAvatarUrl) {
    parts.push(`site_avatar_url = "${escapeToml(config.siteAvatarUrl)}"`);
  }
  if (config.faviconUrl || config.siteAvatarUrl) {
    parts.push(
      `favicon_url = "${escapeToml(config.faviconUrl || config.siteAvatarUrl)}"`,
    );
  }
  if (config.appleTouchIconUrl) {
    parts.push(
      `apple_touch_icon_url = "${escapeToml(config.appleTouchIconUrl)}"`,
    );
  }
  if (config.faviconVersion) {
    parts.push(`favicon_version = "${escapeToml(config.faviconVersion)}"`);
  }
  if (footerHtml) {
    parts.push(`site_footer_html = "${escapeToml(footerHtml)}"`);
  }
  if (config.siteFooter) {
    parts.push(`site_footer_markdown = "${escapeToml(config.siteFooter)}"`);
  }

  for (const item of config.navItems) {
    parts.push("");
    parts.push("[[extra.jant.nav]]");
    parts.push(`type = "${escapeToml(item.type)}"`);
    parts.push(`label = "${escapeToml(item.label)}"`);
    parts.push(`url = "${escapeToml(item.url)}"`);
    if (item.systemKey) {
      parts.push(`system_key = "${escapeToml(item.systemKey)}"`);
    }
  }

  parts.push("");
  parts.push("[[taxonomies]]");
  parts.push('name = "c"');
  parts.push("feed = true");
  parts.push("");
  parts.push("[markdown]");
  parts.push("highlight_code = true");
  parts.push('highlight_theme = "css"');

  return `${parts.join("\n")}
`;
}

function buildRootSection(): string {
  return `+++
sort_by = "date"
paginate_by = 20
+++
`;
}

function buildReadme(siteName: string): string {
  return `# ${siteName} — Zola Export

This is a static site exported from [Jant](https://github.com/jant-me/jant), ready to build with [Zola](https://www.getzola.org/).

## Install Zola

**macOS (Homebrew):**

\`\`\`sh
brew install zola
\`\`\`

**Windows (Scoop):**

\`\`\`sh
scoop install zola
\`\`\`

**Linux (Snap):**

\`\`\`sh
snap install zola --edge
\`\`\`

Or download a binary from <https://github.com/getzola/zola/releases>.

See the [Zola installation docs](https://www.getzola.org/documentation/getting-started/installation/) for more options.

## Quick start

Preview locally:

\`\`\`sh
zola serve
\`\`\`

Then open <http://127.0.0.1:1111> in your browser.

Build the site for deployment:

\`\`\`sh
zola build
\`\`\`

The output goes to the \`public/\` directory. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

## Project structure

\`\`\`
config.toml          — Site configuration (title, URL, language)
content/
  _index.md          — Root section (homepage settings)
  {slug}/index.md    — Individual posts (threads are merged into one page)
  jant-collections/{slug}/_index.md — Hidden collection metadata for round-trip import
templates/           — Tera templates (Zola's template engine)
static/
  style.css          — Base exported stylesheet
  theme.css          — Resolved Jant theme variables
  custom.css         — Exported custom CSS overrides
\`\`\`

## Customizing

- **Site settings** — edit \`config.toml\` to change the title, URL, or language.
- **Jant metadata** — \`config.toml\` stores \`[extra.jant_export]\` and \`[extra.jant]\` for round-trip import.
- **Styles** — edit \`static/style.css\`. The theme supports light and dark modes via \`prefers-color-scheme\`.
- **Templates** — edit files in \`templates/\`. Zola uses the [Tera](https://keats.github.io/tera/) template engine.
- **Collections** — posts are tagged with collections via the \`c\` taxonomy. Browse them at \`/c/\`.

## Notes

- Media files are **not localized** in the export ZIP. Structured attachment blocks still point at the original site until you localize them.
- Thread replies are merged into the root post as a single page. Reply metadata is preserved in HTML comments (\`<!-- jant:reply ... -->\`).
- Attachments are preserved as Jant HTML blocks (\`data-jant-node="attachments"\`) so \`jant site import\` can reconstruct them.
- Posts with \`draft: true\` in front matter are only built when you pass the \`--drafts\` flag to \`zola build\` or \`zola serve\`.
`;
}

// ---------------------------------------------------------------------------
// Zola theme templates
// ---------------------------------------------------------------------------

const TEMPLATE_BASE = `<!DOCTYPE html>
<html lang="{{ config.default_language }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{% block title %}{{ config.title }}{% endblock %}</title>
  <meta name="description" content="{{ config.description }}">
  {% if config.extra.jant.noindex %}
  <meta name="robots" content="noindex">
  {% endif %}
  {% set favicon_url = config.extra.jant.favicon_url | default(value="") %}
  {% if favicon_url %}
  <link rel="icon" href="{{ favicon_url }}">
  {% endif %}
  {% if config.extra.jant.apple_touch_icon_url %}
  <link rel="apple-touch-icon" href="{{ config.extra.jant.apple_touch_icon_url }}">
  {% endif %}
  <link rel="stylesheet" href="{{ get_url(path='style.css') }}">
  <link rel="stylesheet" href="{{ get_url(path='theme.css') }}">
  <link rel="stylesheet" href="{{ get_url(path='custom.css') }}">
  <link rel="alternate" type="application/atom+xml" title="{{ config.title }}" href="{{ get_url(path='atom.xml') }}">
</head>
<body>
  <header class="site-header">
    <a href="{{ config.base_url }}" class="site-title">
      {% if config.extra.jant.show_header_avatar and config.extra.jant.site_avatar_url %}
      <img src="{{ config.extra.jant.site_avatar_url }}" class="site-logo-avatar" alt="">
      {% endif %}
      <span>{{ config.title }}</span>
    </a>
    <nav>
      {% if config.extra.jant.nav and config.extra.jant.nav | length > 0 %}
        {% for item in config.extra.jant.nav %}
        <a href="{{ item.url }}">{{ item.label }}</a>
        {% endfor %}
      {% else %}
      <a href="{{ config.base_url }}/c/">Collections</a>
      <a href="{{ get_url(path='atom.xml') }}">RSS</a>
      {% endif %}
    </nav>
  </header>
  <main class="site-main">
    {% block content %}{% endblock %}
  </main>
  {% if config.extra.jant.site_footer_html %}
  <footer class="site-footer">{{ config.extra.jant.site_footer_html | safe }}</footer>
  {% endif %}
</body>
</html>
`;

const TEMPLATE_INDEX = `{% extends "base.html" %}
{% import "macros.html" as macros %}

{% block title %}{{ config.title }}{% endblock %}

{% block content %}
<div class="post-list">
  {% for page in paginator.pages %}
    {% if page.extra.visibility | default(value="public") != "unlisted" %}
    {{ macros::post_card(page=page) }}
    {% endif %}
  {% endfor %}
</div>

{% if paginator.previous or paginator.next %}
<nav class="pagination">
  {% if paginator.previous %}<a href="{{ paginator.previous }}">&larr; Newer</a>{% endif %}
  {% if paginator.next %}<a href="{{ paginator.next }}">Older &rarr;</a>{% endif %}
</nav>
{% endif %}
{% if config.extra.jant.show_jant_branding_on_home %}
<div class="jant-branding">
  <p>${HOME_BRANDING_PREFIX} <a href="${JANT_REPO_URL}">${buildJantLogoSvgMarkup("positive")}<span>${HOME_BRANDING_LINK_LABEL}</span></a></p>
</div>
{% endif %}
{% endblock %}
`;

const TEMPLATE_PAGE = `{% extends "base.html" %}
{% import "macros.html" as macros %}

{% block title %}{% if page.title %}{{ page.title }} &mdash; {% endif %}{{ config.title }}{% endblock %}

{% block content %}
{{ macros::post_card(page=page, detail=true) }}
{% endblock %}
`;

const TEMPLATE_SECTION = `{% extends "base.html" %}
{% import "macros.html" as macros %}

{% block title %}{{ section.title }} &mdash; {{ config.title }}{% endblock %}

{% block content %}
<h1>{{ section.title }}</h1>
{% if section.description %}
<p class="section-description">{{ section.description }}</p>
{% endif %}

<div class="post-list">
  {% for page in section.pages %}
    {% if page.extra.visibility | default(value="public") != "unlisted" %}
    {{ macros::post_card(page=page) }}
    {% endif %}
  {% endfor %}
</div>
{% endblock %}
`;

const TEMPLATE_TAXONOMY_LIST = `{% extends "base.html" %}

{% block title %}Collections &mdash; {{ config.title }}{% endblock %}

{% block content %}
<h1>Collections</h1>
<ul class="collection-list">
  {% for term in terms %}
  <li>
    <a href="{{ term.permalink }}">{{ term.name }}</a>
    <span class="count">({{ term.pages | length }})</span>
  </li>
  {% endfor %}
</ul>
{% endblock %}
`;

const TEMPLATE_TAXONOMY_SINGLE = `{% extends "base.html" %}
{% import "macros.html" as macros %}

{% block title %}{{ term.name }} &mdash; {{ config.title }}{% endblock %}

{% block content %}
<h1>{{ term.name }}</h1>
<div class="post-list">
  {% for page in term.pages %}
    {% if page.extra.visibility | default(value="public") != "unlisted" %}
    {{ macros::post_card(page=page) }}
    {% endif %}
  {% endfor %}
</div>
{% endblock %}
`;

const TEMPLATE_ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="{{ lang }}">
  <title>{% if section is defined and section.title %}{{ section.title }} · {% elif term is defined and term.name %}{{ term.name }} · {% endif %}{{ config.title }}</title>
  {% if config.description %}
  <subtitle>{{ config.description }}</subtitle>
  {% endif %}
  <link rel="self" type="application/atom+xml" href="{{ feed_url | safe }}">
  <link rel="alternate" type="text/html" href="{% if section is defined %}{{ section.permalink }}{% elif term is defined %}{{ term.permalink }}{% else %}{{ config.base_url }}{% endif %}">
  <id>{{ feed_url | safe }}</id>
  <updated>{{ last_updated | date(format="%+") }}</updated>
  {% set author_name = config.author | default(value="") %}
  {% if author_name %}
  <author><name>{{ author_name }}</name></author>
  {% endif %}
  {% for page in pages %}
    {% if page.extra.visibility | default(value="public") == "public" %}
  <entry>
    <title>{{ page.title | default(value="Untitled") }}</title>
    <link rel="alternate" type="text/html" href="{{ page.permalink | safe }}">
    <published>{{ page.date | date(format="%+") }}</published>
    <updated>{{ page.updated | default(value=page.date) | date(format="%+") }}</updated>
    <id>{{ page.permalink | safe }}</id>
    {% if page.summary %}
    <summary type="html">{{ page.summary | safe }}</summary>
    {% endif %}
    <content type="html">{{ page.content | safe }}</content>
  </entry>
    {% endif %}
  {% endfor %}
</feed>
`;

// ---------------------------------------------------------------------------
// Shared macro — single post card used by all list/detail templates
// ---------------------------------------------------------------------------

const TEMPLATE_MACROS = `{% macro post_card(page, detail=false) %}
<article class="{% if detail %}post-detail{% else %}post-card{% endif %}{% if page.extra.pinned %} pinned{% endif %}" data-format="{{ page.extra.format | default(value='note') }}">
  {% if page.extra.format == "link" and page.extra.link_url %}
  <div class="post-meta link-domain">
    <a href="{{ page.extra.link_url }}" rel="noopener noreferrer" target="_blank">{{ page.extra.link_url | split(pat="//") | nth(n=1) | split(pat="/") | first }}</a>
  </div>
  {% endif %}

  {% if page.title %}
    {% if detail %}
    <h1 class="post-title">
      {% if page.extra.format == "link" and page.extra.link_url %}
        <a href="{{ page.extra.link_url }}" rel="noopener noreferrer" target="_blank">{{ page.title }}</a>
      {% else %}
        {{ page.title }}
      {% endif %}
    </h1>
    {% else %}
    <h2 class="post-title">
      {% if page.extra.format == "link" and page.extra.link_url %}
        <a href="{{ page.extra.link_url }}" rel="noopener noreferrer" target="_blank">{{ page.title }}</a>
      {% else %}
        <a href="{{ page.permalink }}">{{ page.title }}</a>
      {% endif %}
    </h2>
    {% endif %}
  {% endif %}

  {% if page.extra.format == "quote" and page.extra.quote_text %}
  <blockquote class="feed-quote">
    <p>{{ page.extra.quote_text }}</p>
  </blockquote>
  {% endif %}

  {% if not detail and page.summary %}
  <div class="post-body prose">{{ page.summary | safe }}</div>
  {% elif page.content %}
  <div class="post-body prose">{{ page.content | safe }}</div>
  {% endif %}

  {% if page.extra.rating %}
  <div class="star-rating">
    {% for i in range(end=page.extra.rating) %}<span class="star filled">&#9733;</span>{% endfor %}{% for i in range(start=page.extra.rating, end=5) %}<span class="star">&#9734;</span>{% endfor %}
  </div>
  {% endif %}

  <footer class="post-footer">
    <a href="{{ page.permalink }}" class="post-date"><time datetime="{{ page.date }}">{{ page.date | date(format="%b %e, %Y") }}</time></a>
    {% if page.taxonomies.c %}
    <span class="post-collections">
      {% for col in page.taxonomies.c %}
        <a href="{{ get_taxonomy_url(kind='c', name=col) }}" class="collection-tag">{{ col }}</a>
      {% endfor %}
    </span>
    {% endif %}
  </footer>
</article>
{% endmacro %}
`;

// ---------------------------------------------------------------------------
// CSS — Jant "Organic Minimalism" approximation
// ---------------------------------------------------------------------------

const STYLE_CSS = `/* Jant Export Theme — Organic Minimalism */

:root {
  --site-width: 500px;
  --font-body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace;

  --bg: #fafaf9;
  --fg: #1c1917;
  --muted: #78716c;
  --border: #e7e5e4;
  --accent: #292524;
  --accent-fg: #fff;
  --card-bg: #fff;
  --quote-border: #d6d3d1;
  --star-color: #f59e0b;
  --link-color: #292524;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1c1917;
    --fg: #e7e5e4;
    --muted: #a8a29e;
    --border: #44403c;
    --accent: #e7e5e4;
    --accent-fg: #1c1917;
    --card-bg: #292524;
    --quote-border: #57534e;
    --star-color: #fbbf24;
    --link-color: #e7e5e4;
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 15px;
  line-height: 1.5;
}

body {
  font-family: var(--font-body);
  color: var(--fg);
  background: var(--bg);
  max-width: var(--site-width);
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

a {
  color: var(--link-color);
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

a:hover {
  text-decoration: none;
}

/* Header */
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2rem;
}

.site-title {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 1.125rem;
  text-decoration: none;
  color: var(--fg);
}

.site-logo-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  object-fit: cover;
}

.site-header nav {
  display: flex;
  gap: 1rem;
}

.site-header nav a {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.875rem;
}

.site-header nav a:hover {
  color: var(--fg);
}

/* Post list */
.post-list {
  display: flex;
  flex-direction: column;
}

.post-card {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
}

.post-card:last-child {
  border-bottom: none;
}

.post-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.post-title a {
  text-decoration: none;
  color: var(--fg);
}

.post-title a:hover {
  text-decoration: underline;
}

/* Link format domain indicator */
.link-domain {
  font-size: 0.8125rem;
  color: var(--muted);
  margin-bottom: 0.25rem;
}

.link-domain a {
  color: var(--muted);
  text-decoration: none;
}

/* Quote format */
.feed-quote {
  border-left: 2px solid var(--quote-border);
  padding-left: 1rem;
  margin: 0.5rem 0;
  font-style: italic;
  color: var(--fg);
}

/* Body / prose */
.post-body {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--fg);
}

.post-body p {
  margin: 0.75rem 0;
}

.post-body p:first-child {
  margin-top: 0;
}

.post-body img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

.post-body figure {
  margin: 1rem 0;
}

.post-body figure figcaption {
  margin-top: 0.5rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.post-body [data-jant-node="attachments"] {
  display: grid;
  gap: 1rem;
  margin-top: 1.25rem;
}

.post-body [data-jant-node="attachment"] {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--card-bg);
}

.post-body [data-jant-node="attachment"] audio,
.post-body [data-jant-node="attachment"] video {
  width: 100%;
}

.post-body [data-jant-node="attachment"] > a {
  font-weight: 600;
}

.post-body pre {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.post-body code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--card-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.post-body pre code {
  background: none;
  padding: 0;
}

.post-body blockquote {
  border-left: 2px solid var(--quote-border);
  padding-left: 1rem;
  color: var(--muted);
  margin: 0.75rem 0;
}

.post-body h1, .post-body h2, .post-body h3,
.post-body h4, .post-body h5, .post-body h6 {
  margin: 1.5rem 0 0.5rem;
  line-height: 1.3;
}

.post-body ul, .post-body ol {
  padding-left: 1.5rem;
  margin: 0.75rem 0;
}

.post-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.875rem;
}

.post-body th, .post-body td {
  border: 1px solid var(--border);
  padding: 0.375rem 0.75rem;
  text-align: left;
}

.post-body th {
  font-weight: 600;
  background: var(--card-bg);
}

/* Star rating */
.star-rating {
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

.star-rating .star {
  color: var(--border);
}

.star-rating .star.filled {
  color: var(--star-color);
}

/* Post footer */
.post-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted);
}

.post-date {
  color: var(--muted);
  text-decoration: none;
}

.post-date:hover {
  color: var(--fg);
}

.collection-tag {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.75rem;
  border: 1px solid var(--border);
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
}

.collection-tag:hover {
  color: var(--fg);
  border-color: var(--fg);
}

/* Detail page */
.post-detail {
  padding: 1rem 0;
}

.post-detail .post-title {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.post-detail .post-body {
  margin: 1rem 0;
}

/* Section / Collection */
.section-description {
  color: var(--muted);
  margin-bottom: 1.5rem;
}

.collection-list {
  list-style: none;
  padding: 0;
}

.collection-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.collection-list .count {
  color: var(--muted);
  font-size: 0.8125rem;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  padding: 2rem 0 1rem;
  font-size: 0.875rem;
}

/* Footer */
.site-footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 0.8125rem;
  color: var(--muted);
}

.jant-branding {
  margin-top: 2rem;
  color: var(--muted);
  font-size: 0.8125rem;
.jant-branding a {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.jant-branding a svg {
  width: 1rem;
  height: 1rem;
  flex: none;
}
`;
