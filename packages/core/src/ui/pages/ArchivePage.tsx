/**
 * Archive Page
 *
 * Tumblr-style grid with 2-row filter bar, rich media tiles,
 * month-based grouping, and page-based pagination.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type {
  ArchivePageProps,
  ArchiveFilters,
  ArchiveVisibility,
  MediaKind,
} from "../../types.js";
import type { PostView } from "../../types/views.js";
import { FORMATS, MEDIA_KINDS } from "../../types.js";
import { getIconSvg } from "../../lib/icons.js";
import { toMediaKind } from "../../lib/upload.js";
import { PagePagination } from "../shared/Pagination.js";

// =============================================================================
// URL Builder
// =============================================================================

/** Build an archive URL preserving existing filter params, overriding with updates. */
function buildFilterUrl(
  current: ArchiveFilters,
  updates: Partial<ArchiveFilters & { clear?: boolean }>,
): string {
  if (updates.clear) return "/archive";

  const merged = { ...current, ...updates };
  const params = new URLSearchParams();

  if (merged.year) params.set("year", String(merged.year));
  if (merged.collectionSlug) params.set("collection", merged.collectionSlug);
  if (merged.format) params.set("format", merged.format);
  if (merged.mediaKinds && merged.mediaKinds.length > 0) {
    params.set("media", merged.mediaKinds.join(","));
  }
  if (merged.hasTitle !== undefined) {
    params.set("hasTitle", merged.hasTitle ? "1" : "0");
  }
  if (merged.visibility) params.set("visibility", merged.visibility);

  const qs = params.toString();
  return qs ? `/archive?${qs}` : "/archive";
}

// =============================================================================
// Format Labels
// =============================================================================

function getFormatLabel(format: string): string {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    note: t({ message: "Note", comment: "@context: Post format label - note" }),
    link: t({ message: "Link", comment: "@context: Post format label - link" }),
    quote: t({
      message: "Quote",
      comment: "@context: Post format label - quote",
    }),
  };
  return labels[format] ?? format;
}

function getFormatLabelPlural(format: string): string {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    note: t({
      message: "Notes",
      comment: "@context: Post format label plural - notes",
    }),
    link: t({
      message: "Links",
      comment: "@context: Post format label plural - links",
    }),
    quote: t({
      message: "Quotes",
      comment: "@context: Post format label plural - quotes",
    }),
  };
  return labels[format] ?? format + "s";
}

/** Icon name mapping for media kinds. */
const MEDIA_KIND_ICONS: Record<MediaKind, string> = {
  image: "image",
  video: "video",
  audio: "music",
  text: "file-text",
  document: "file",
};

function getMediaKindLabel(kind: MediaKind): string {
  const { t } = useLingui();
  const labels: Record<MediaKind, string> = {
    image: t({
      message: "Images",
      comment: "@context: Archive media filter - images",
    }),
    video: t({
      message: "Video",
      comment: "@context: Archive media filter - video",
    }),
    audio: t({
      message: "Audio",
      comment: "@context: Archive media filter - audio",
    }),
    text: t({
      message: "Text",
      comment: "@context: Archive media filter - text files",
    }),
    document: t({
      message: "Files",
      comment: "@context: Archive media filter - files/documents",
    }),
  };
  return labels[kind] ?? kind;
}

// =============================================================================
// Select Components
// =============================================================================

/** Chevron indicator for select triggers. */
const SelectChevron: FC = () => {
  const svg = getIconSvg("chevron-down");
  if (!svg) return null;
  return (
    <span
      class="text-muted-foreground opacity-50 shrink-0 [&>svg]:size-3.5"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

/** Icon inside a select option (muted color, fixed size). */
const OptionIcon: FC<{ name: string }> = ({ name }) => {
  const svg = getIconSvg(name);
  if (!svg) return null;
  return (
    <span
      class="text-muted-foreground [&>svg]:size-4 shrink-0"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

interface NavSelectOption {
  label: string;
  value: string;
  icon?: string;
  /** Indent level for sub-items (e.g. "Titled Notes" under "Notes"). */
  indent?: boolean;
}

/**
 * BaseCoat select that navigates to a URL on change.
 * Each option's data-value is the target URL.
 * Requires client/archive-nav.js for the change → navigate bridge.
 */
const NavSelect: FC<{
  id: string;
  options: NavSelectOption[];
  currentValue: string;
  /** Extra class on the trigger button (e.g. a fixed width like "w-32"). */
  triggerClass?: string;
}> = ({ id, options, currentValue, triggerClass }) => {
  // Always falls back to first option; options array is never empty in practice.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guaranteed by caller
  const current = options.find((o) => o.value === currentValue) ?? options[0]!;

  const renderContent = (opt: NavSelectOption) =>
    opt.icon ? (
      <span class="flex items-center gap-2">
        <OptionIcon name={opt.icon} />
        {opt.label}
      </span>
    ) : (
      opt.label
    );

  return (
    <div id={id} class="select archive-nav-select">
      <button
        type="button"
        class={`btn-outline${triggerClass ? ` ${triggerClass}` : ""}`}
        id={`${id}-trigger`}
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls={`${id}-listbox`}
      >
        <span class="truncate">{renderContent(current)}</span>
        <SelectChevron />
      </button>
      <div id={`${id}-popover`} data-popover aria-hidden="true">
        <div
          role="listbox"
          id={`${id}-listbox`}
          aria-orientation="vertical"
          aria-labelledby={`${id}-trigger`}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              role="option"
              data-value={opt.value}
              aria-selected={opt.value === currentValue ? "true" : undefined}
              class={opt.indent ? "pl-4" : undefined}
            >
              {renderContent(opt)}
            </div>
          ))}
        </div>
      </div>
      <input type="hidden" name={`${id}-value`} value={currentValue} />
    </div>
  );
};

// =============================================================================
// Filter Bar
// =============================================================================

const ARCHIVE_VISIBILITIES: ArchiveVisibility[] = [
  "public",
  "unlisted",
  "private",
  "featured",
];

function getVisibilityLabel(v: ArchiveVisibility): string {
  const { t } = useLingui();
  const labels: Record<ArchiveVisibility, string> = {
    public: t({
      message: "Public",
      comment: "@context: Archive visibility filter - public posts",
    }),
    unlisted: t({
      message: "Unlisted",
      comment: "@context: Archive visibility filter - unlisted posts",
    }),
    private: t({
      message: "Private",
      comment: "@context: Archive visibility filter - private posts",
    }),
    featured: t({
      message: "Featured",
      comment: "@context: Archive visibility filter - featured posts",
    }),
  };
  return labels[v];
}

const VISIBILITY_ICONS: Record<ArchiveVisibility, string> = {
  public: "globe",
  unlisted: "eye-off",
  private: "lock",
  featured: "star",
};

const FilterBar: FC<{
  filters: ArchiveFilters;
  availableYears: number[];
  availableCollections: { slug: string; title: string }[];
  isAuthenticated: boolean;
}> = ({ filters, availableYears, availableCollections, isAuthenticated }) => {
  const { t } = useLingui();
  const currentUrl = buildFilterUrl(filters, {});

  // --- Year options ---------------------------------------------------------

  const yearOptions: NavSelectOption[] = [
    {
      label: t({
        message: "All years",
        comment: "@context: Archive filter - year dropdown default",
      }),
      value: buildFilterUrl(
        { ...filters, year: undefined },
        { year: undefined },
      ),
    },
    ...availableYears.map((year) => ({
      label: String(year),
      value: buildFilterUrl(filters, { year }),
    })),
  ];

  // --- Collection options ---------------------------------------------------

  const collectionOptions: NavSelectOption[] = [
    {
      label: t({
        message: "All collections",
        comment: "@context: Archive filter - collection dropdown default",
      }),
      value: buildFilterUrl(
        {
          ...filters,
          collectionSlug: undefined,
          collectionTitle: undefined,
        },
        { collectionSlug: undefined, collectionTitle: undefined },
      ),
    },
    ...availableCollections.map((col) => ({
      label: col.title,
      value: buildFilterUrl(filters, { collectionSlug: col.slug }),
    })),
  ];

  // --- Format options (Notes split into All / Titled / Untitled) -----------

  const formatOptions: NavSelectOption[] = [
    {
      label: t({
        message: "All formats",
        comment: "@context: Archive filter - all formats select option",
      }),
      value: buildFilterUrl(
        { ...filters, format: undefined, hasTitle: undefined },
        { format: undefined, hasTitle: undefined },
      ),
    },
    // Notes — parent + two indented sub-options
    {
      label: getFormatLabelPlural("note"),
      value: buildFilterUrl(filters, {
        format: "note",
        hasTitle: undefined,
      }),
    },
    {
      label: t({
        message: "Titled",
        comment: "@context: Archive filter - notes that have a title",
      }),
      icon: "type",
      indent: true,
      value: buildFilterUrl(filters, {
        format: "note",
        hasTitle: true,
      }),
    },
    {
      label: t({
        message: "Untitled",
        comment: "@context: Archive filter - notes without a title",
      }),
      icon: "text",
      indent: true,
      value: buildFilterUrl(filters, {
        format: "note",
        hasTitle: false,
      }),
    },
    // Links, Quotes
    ...FORMATS.filter((f) => f !== "note").map((f) => ({
      label: getFormatLabelPlural(f),
      value: buildFilterUrl(filters, { format: f, hasTitle: undefined }),
    })),
  ];

  // --- Visibility options (authenticated only) --------------------------------

  const visibilityOptions: NavSelectOption[] = [
    {
      label: t({
        message: "All visibility",
        comment: "@context: Archive filter - all visibility select option",
      }),
      value: buildFilterUrl(
        { ...filters, visibility: undefined },
        { visibility: undefined },
      ),
    },
    ...ARCHIVE_VISIBILITIES.map((v) => ({
      label: getVisibilityLabel(v),
      icon: VISIBILITY_ICONS[v],
      value: buildFilterUrl(filters, { visibility: v }),
    })),
  ];

  const activeKinds = filters.mediaKinds ?? [];
  const mediaPlaceholder = t({
    message: "All media",
    comment: "@context: Archive filter - all media types select option",
  });

  return (
    <div class="archive-filters">
      {/* Content filters */}
      {availableYears.length > 0 && (
        <NavSelect
          id="af-year"
          options={yearOptions}
          currentValue={currentUrl}
          triggerClass="w-28"
        />
      )}
      {availableCollections.length > 0 && (
        <NavSelect
          id="af-collection"
          options={collectionOptions}
          currentValue={currentUrl}
          triggerClass="w-36"
        />
      )}
      <NavSelect
        id="af-format"
        options={formatOptions}
        currentValue={currentUrl}
        triggerClass="w-28"
      />

      {isAuthenticated && (
        <NavSelect
          id="af-visibility"
          options={visibilityOptions}
          currentValue={currentUrl}
          triggerClass="w-32"
        />
      )}

      {/* Separator */}
      <div class="archive-filters-sep" aria-hidden="true" />

      {/* Media kind multi-select */}
      <div
        id="af-media"
        class="select archive-nav-multiselect"
        data-placeholder={mediaPlaceholder}
        data-filter-key="media"
      >
        <button
          type="button"
          class="btn-outline w-32"
          id="af-media-trigger"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls="af-media-listbox"
        >
          <span class="truncate">
            {activeKinds.length > 0
              ? activeKinds.map((k) => getMediaKindLabel(k)).join(", ")
              : mediaPlaceholder}
          </span>
          <SelectChevron />
        </button>
        <div id="af-media-popover" data-popover aria-hidden="true">
          <div
            role="listbox"
            id="af-media-listbox"
            aria-orientation="vertical"
            aria-labelledby="af-media-trigger"
            aria-multiselectable="true"
          >
            {MEDIA_KINDS.map((kind) => {
              const label = getMediaKindLabel(kind);
              const icon = MEDIA_KIND_ICONS[kind];
              return (
                <div
                  key={kind}
                  role="option"
                  data-value={kind}
                  data-label={label}
                  aria-selected={
                    activeKinds.includes(kind) ? "true" : undefined
                  }
                >
                  <span class="flex items-center gap-2">
                    <OptionIcon name={icon} />
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <input
          type="hidden"
          name="af-media-value"
          value={JSON.stringify(activeKinds)}
        />
      </div>
    </div>
  );
};

// =============================================================================
// Archive Tile
// =============================================================================

/**
 * Determine tile variant based on post content and media.
 *
 * Background image priority:
 * 1. First attachment is video → video poster/thumbnail as bg
 * 2. Otherwise, if post has any image → first image as bg
 * 3. No visual media → text-only
 *
 * Combined with quote format detection and text overlay logic.
 */
function getTileVariant(post: PostView): "text" | "image" | "mixed" | "quote" {
  const firstMedia = post.media[0];
  const firstKind = firstMedia ? toMediaKind(firstMedia.mimeType) : undefined;
  const hasImage = post.media.some((m) => m.mimeType.startsWith("image/"));

  // Video first attachment → use poster as visual bg
  const hasVisualBg =
    firstKind === "video" && firstMedia
      ? !!(firstMedia.posterUrl || firstMedia.thumbnailUrl)
      : hasImage;

  if (post.format === "quote") {
    return hasVisualBg ? "mixed" : "quote";
  }
  if (hasVisualBg && (post.title || post.excerpt)) return "mixed";
  if (hasVisualBg) return "image";
  return "text";
}

/**
 * Resolve the background image URL for a tile.
 *
 * Priority:
 * 1. First attachment is video → posterUrl or thumbnailUrl
 * 2. Otherwise → first image attachment's thumbnailUrl
 */
function getTileBgImage(
  post: PostView,
): { url: string; alt: string } | undefined {
  const firstMedia = post.media[0];
  if (firstMedia) {
    const firstKind = toMediaKind(firstMedia.mimeType);
    if (firstKind === "video") {
      const src = firstMedia.posterUrl ?? firstMedia.thumbnailUrl;
      if (src) return { url: src, alt: firstMedia.altText ?? "" };
    }
  }
  // Fallback: first image in media list
  const firstImage = post.media.find((m) => m.mimeType.startsWith("image/"));
  if (firstImage)
    return { url: firstImage.thumbnailUrl, alt: firstImage.altText ?? "" };
  return undefined;
}

/**
 * Resolve a media-kind badge icon for the tile corner.
 *
 * - Video → circle-play (centered, large)
 * - Audio/text/document (first attachment) → small corner icon
 * - Image-only → no badge
 */
function getTileBadge(
  post: PostView,
): { icon: string; position: "center" | "corner" } | undefined {
  const firstMedia = post.media[0];
  if (!firstMedia) return undefined;
  const kind = toMediaKind(firstMedia.mimeType);

  if (kind === "video") return { icon: "circle-play", position: "center" };
  if (kind === "audio")
    return { icon: MEDIA_KIND_ICONS.audio, position: "corner" };
  if (kind === "text")
    return { icon: MEDIA_KIND_ICONS.text, position: "corner" };
  if (kind === "document")
    return { icon: MEDIA_KIND_ICONS.document, position: "corner" };
  return undefined;
}

/** Strip HTML tags to get plain text for tile previews. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getTileText(post: PostView): { title?: string; summary: string } {
  if (post.title) {
    // Titled note: show title + body summary
    const summary = post.bodyHtml
      ? stripHtml(post.bodyHtml).slice(0, 200)
      : (post.url ?? "");
    return { title: post.title, summary };
  }
  if (post.format === "quote" && post.quoteText)
    return { summary: post.quoteText };
  // bodyHtml is rendered HTML; strip tags for a readable plain-text preview.
  // Avoid post.excerpt which is derived from raw Tiptap JSON.
  if (post.bodyHtml) return { summary: stripHtml(post.bodyHtml).slice(0, 200) };
  if (post.url) return { summary: post.url };
  return { summary: getFormatLabel(post.format) };
}

const ArchiveTile: FC<{ post: PostView }> = ({ post }) => {
  const variant = getTileVariant(post);
  const bgImage = getTileBgImage(post);
  const badge = getTileBadge(post);
  const { title, summary } = getTileText(post);
  const hasBg = variant === "image" || variant === "mixed";
  const cornerBadge = badge?.position === "corner" ? badge : undefined;
  const hasContent = variant !== "image" || cornerBadge;

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener"
      class={`archive-tile archive-tile-${variant}`}
      data-post
      data-format={post.format}
    >
      {/* Background image (from image or video poster) */}
      {bgImage && hasBg && (
        <img
          class="archive-tile-bg"
          src={bgImage.url}
          alt={bgImage.alt}
          loading="lazy"
        />
      )}

      {/* Content: title + summary + badge row */}
      {hasContent && (
        <div class="archive-tile-content">
          {variant !== "image" && title && (
            <span class="archive-tile-title">
              {post.format === "link" && (
                <span
                  class="archive-tile-link-indicator"
                  dangerouslySetInnerHTML={{
                    __html: getIconSvg("external-link") ?? "",
                  }}
                />
              )}
              {title}
            </span>
          )}
          {variant !== "image" && summary && (
            <span class="archive-tile-summary">{summary}</span>
          )}
          {cornerBadge && (
            <span
              class="archive-tile-badge-row"
              dangerouslySetInnerHTML={{
                __html: getIconSvg(cornerBadge.icon) ?? "",
              }}
            />
          )}
        </div>
      )}

      {/* Centered video play overlay */}
      {badge?.position === "center" && (
        <span
          class="archive-tile-badge archive-tile-badge-center"
          dangerouslySetInnerHTML={{ __html: getIconSvg(badge.icon) ?? "" }}
        />
      )}

      {/* Hover date label */}
      <span class="archive-tile-date">{post.publishedAtFormatted}</span>
    </a>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const ArchivePage: FC<ArchivePageProps> = ({
  groups,
  currentPage,
  totalPages,
  filters,
  availableYears,
  availableCollections,
  isAuthenticated,
}) => {
  const { t } = useLingui();

  // Build the pagination base URL preserving filter params
  const paginationBaseUrl = buildFilterUrl(filters, {});

  return (
    <div class="py-6" data-page="archive">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold mb-4">
          {t({ message: "Archive", comment: "@context: Archive page title" })}
        </h1>

        <FilterBar
          filters={filters}
          availableYears={availableYears}
          availableCollections={availableCollections}
          isAuthenticated={isAuthenticated}
        />
      </header>

      <main>
        {groups.length === 0 ? (
          <p class="text-muted-foreground py-8 text-center">
            {t({
              message:
                "No posts match these filters. Try adjusting your selection or clear all filters.",
              comment: "@context: Archive empty state with filters",
            })}
          </p>
        ) : (
          <div class="archive-grid-wrapper">
            <div class="archive-grid">
              {groups.map((group) => (
                <>
                  <div
                    key={`header-${group.year}-${group.month}`}
                    class="archive-month-header"
                  >
                    {group.label}
                  </div>
                  {group.posts.map((post) => (
                    <ArchiveTile key={post.id} post={post} />
                  ))}
                </>
              ))}
            </div>
          </div>
        )}
      </main>

      <PagePagination
        baseUrl={paginationBaseUrl}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
};
