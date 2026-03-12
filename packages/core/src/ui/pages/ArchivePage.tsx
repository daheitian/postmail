/**
 * Archive Page
 *
 * Tumblr-style grid/list with compact chip filter bar,
 * month-based grouping, and page-based pagination.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type {
  ArchivePageProps,
  ArchiveFilters,
  ArchiveView,
  ArchiveVisibility,
  MediaKind,
} from "../../types.js";
import type { PostView } from "../../types/views.js";
import { FORMATS, MEDIA_KINDS } from "../../types.js";
import { getIconSvg } from "../../lib/icons.js";
import { toMediaKind } from "../../lib/upload.js";
import { PagePagination } from "../shared/Pagination.js";
import { TimelineItemFromPost } from "../feed/TimelineItem.js";

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
  if (merged.hasMedia !== undefined) {
    params.set("hasMedia", merged.hasMedia ? "1" : "0");
  }
  if (merged.hasTitle !== undefined) {
    params.set("hasTitle", merged.hasTitle ? "1" : "0");
  }
  if (merged.visibility) params.set("visibility", merged.visibility);
  if (merged.view && merged.view !== "grid") params.set("view", merged.view);

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
// Shared Icon Helpers
// =============================================================================

/** Inline SVG icon with specified size class. */
const Icon: FC<{ name: string; class?: string }> = ({
  name,
  class: cls = "[&>svg]:size-4",
}) => {
  const svg = getIconSvg(name);
  if (!svg) return null;
  return (
    <span
      class={`shrink-0 inline-flex ${cls}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

/** Chevron indicator for chip triggers. */
const ChipChevron: FC = () => (
  <Icon name="chevron-down" class="[&>svg]:size-3 opacity-40" />
);

// =============================================================================
// Chip Select Components
// =============================================================================

interface ChipSelectOption {
  label: string;
  value: string;
  icon?: string;
  indent?: boolean;
}

/**
 * Compact chip-style dropdown.
 *
 * Default state: icon + chevron (no text).
 * Active state: icon + selected label + ✕ clear button.
 */
const ChipSelect: FC<{
  id: string;
  icon: string;
  options: ChipSelectOption[];
  currentValue: string;
  clearUrl: string;
  activeLabel?: string;
}> = ({ id, icon, options, currentValue, clearUrl, activeLabel }) => {
  const isActive = !!activeLabel;

  return (
    <div
      id={id}
      class="archive-chip-select archive-chip-dropdown select"
      data-select-initialized
    >
      <button
        type="button"
        class={`archive-chip${isActive ? " archive-chip-active" : ""}`}
        id={`${id}-trigger`}
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls={`${id}-listbox`}
      >
        <Icon name={icon} class="[&>svg]:size-4 text-muted-foreground" />
        {isActive && <span class="archive-chip-label">{activeLabel}</span>}
        {isActive ? (
          <a
            href={clearUrl}
            class="archive-chip-clear"
            aria-label="Clear filter"
          >
            <Icon name="x" class="[&>svg]:size-3" />
          </a>
        ) : (
          <ChipChevron />
        )}
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
              {opt.icon ? (
                <span class="flex items-center gap-2">
                  <Icon
                    name={opt.icon}
                    class="[&>svg]:size-4 text-muted-foreground"
                  />
                  {opt.label}
                </span>
              ) : (
                opt.label
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Chip-style multi-select for media kinds.
 *
 * "Text only" at the top navigates immediately (mutually exclusive with kinds).
 * Media kind options are multi-toggle; navigation happens on popover close.
 * Shows count when multiple kinds are selected.
 */
const ChipMediaSelect: FC<{
  id: string;
  icon: string;
  filters: ArchiveFilters;
  activeLabel?: string;
  clearUrl: string;
}> = ({ id, icon, filters: f, activeLabel, clearUrl }) => {
  const { t } = useLingui();
  const isActive = !!activeLabel;
  const activeKinds = f.mediaKinds ?? [];

  const textOnlyUrl = buildFilterUrl(
    { ...f, mediaKinds: undefined, hasMedia: undefined },
    { hasMedia: false, mediaKinds: undefined },
  );

  return (
    <div
      id={id}
      class="archive-chip-select archive-chip-dropdown archive-chip-media select"
      data-select-initialized
      data-filter-key="media"
    >
      <button
        type="button"
        class={`archive-chip${isActive ? " archive-chip-active" : ""}`}
        id={`${id}-trigger`}
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls={`${id}-listbox`}
      >
        <Icon name={icon} class="[&>svg]:size-4 text-muted-foreground" />
        {isActive && <span class="archive-chip-label">{activeLabel}</span>}
        {isActive ? (
          <a
            href={clearUrl}
            class="archive-chip-clear"
            aria-label="Clear filter"
          >
            <Icon name="x" class="[&>svg]:size-3" />
          </a>
        ) : (
          <ChipChevron />
        )}
      </button>
      <div id={`${id}-popover`} data-popover aria-hidden="true">
        <div
          role="listbox"
          id={`${id}-listbox`}
          aria-orientation="vertical"
          aria-labelledby={`${id}-trigger`}
          aria-multiselectable="true"
        >
          <div
            role="option"
            data-value={textOnlyUrl}
            data-navigate="true"
            aria-selected={f.hasMedia === false ? "true" : undefined}
          >
            <span class="flex items-center gap-2">
              <Icon name="text" class="[&>svg]:size-4 text-muted-foreground" />
              {t({
                message: "Text only",
                comment:
                  "@context: Archive media filter - posts without any media attachments",
              })}
            </span>
          </div>
          <hr class="archive-chip-sep" />
          {MEDIA_KINDS.filter((k) => k !== "text").map((kind) => {
            const label = getMediaKindLabel(kind);
            const kindIcon = MEDIA_KIND_ICONS[kind];
            return (
              <div
                key={kind}
                role="option"
                data-value={kind}
                data-label={label}
                aria-selected={activeKinds.includes(kind) ? "true" : undefined}
              >
                <span class="flex items-center gap-2">
                  <Icon
                    name={kindIcon}
                    class="[&>svg]:size-4 text-muted-foreground"
                  />
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// View Toggle
// =============================================================================

const ViewToggle: FC<{ filters: ArchiveFilters }> = ({ filters }) => {
  const currentView: ArchiveView = filters.view ?? "grid";
  const gridUrl = buildFilterUrl(filters, { view: undefined });
  const listUrl = buildFilterUrl(filters, { view: "list" });

  return (
    <div class="archive-view-toggle" role="radiogroup" aria-label="View mode">
      <a
        href={gridUrl}
        class={`archive-view-btn${currentView === "grid" ? " archive-view-btn-active" : ""}`}
        role="radio"
        aria-checked={currentView === "grid" ? "true" : "false"}
        aria-label="Grid view"
      >
        <Icon name="layout-grid" class="[&>svg]:size-4" />
      </a>
      <a
        href={listUrl}
        class={`archive-view-btn${currentView === "list" ? " archive-view-btn-active" : ""}`}
        role="radio"
        aria-checked={currentView === "list" ? "true" : "false"}
        aria-label="List view"
      >
        <Icon name="list" class="[&>svg]:size-4" />
      </a>
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

/** Chip icon for each filter dimension. */
const FILTER_ICONS = {
  year: "calendar",
  collection: "monitor",
  format: "shapes",
  media: "video",
  visibility: "scan-eye",
} as const;

const FilterBar: FC<{
  filters: ArchiveFilters;
  availableYears: number[];
  availableCollections: { slug: string; title: string }[];
  isAuthenticated: boolean;
}> = ({ filters, availableYears, availableCollections, isAuthenticated }) => {
  const { t } = useLingui();
  const currentUrl = buildFilterUrl(filters, {});

  // --- Year options ---------------------------------------------------------

  const yearOptions: ChipSelectOption[] = [
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

  const collectionOptions: ChipSelectOption[] = [
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

  const formatActiveLabel = filters.format
    ? filters.hasTitle === true
      ? t({
          message: "Titled",
          comment: "@context: Archive filter - notes that have a title",
        })
      : filters.hasTitle === false
        ? t({
            message: "Untitled",
            comment: "@context: Archive filter - notes without a title",
          })
        : getFormatLabelPlural(filters.format)
    : undefined;

  const formatOptions: ChipSelectOption[] = [
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
    ...FORMATS.filter((f) => f !== "note").map((f) => ({
      label: getFormatLabelPlural(f),
      value: buildFilterUrl(filters, { format: f, hasTitle: undefined }),
    })),
  ];

  // --- Visibility options (authenticated only) --------------------------------

  // "All visibility" needs the explicit ?visibility=all param so the route
  // doesn't default back to "public". Build its URL by appending to the
  // base URL (which has no visibility param since we merge undefined).
  const allVisibilityBaseUrl = buildFilterUrl(
    { ...filters, visibility: undefined },
    { visibility: undefined },
  );
  const allVisibilityUrl = allVisibilityBaseUrl.includes("?")
    ? `${allVisibilityBaseUrl}&visibility=all`
    : `${allVisibilityBaseUrl}?visibility=all`;

  const visibilityOptions: ChipSelectOption[] = [
    {
      label: t({
        message: "All visibility",
        comment: "@context: Archive filter - all visibility select option",
      }),
      value: allVisibilityUrl,
    },
    ...ARCHIVE_VISIBILITIES.map((v) => ({
      label: getVisibilityLabel(v),
      icon: VISIBILITY_ICONS[v],
      value: buildFilterUrl(filters, { visibility: v }),
    })),
  ];

  const activeKinds = filters.mediaKinds ?? [];
  const mediaActiveLabel =
    filters.hasMedia === false
      ? t({
          message: "Text only",
          comment:
            "@context: Archive media filter - posts without any media attachments",
        })
      : activeKinds.length === 1
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check guarantees element exists
          getMediaKindLabel(activeKinds[0]!)
        : activeKinds.length > 1
          ? String(activeKinds.length)
          : undefined;
  const mediaClearUrl = buildFilterUrl(
    { ...filters, mediaKinds: undefined, hasMedia: undefined },
    { mediaKinds: undefined, hasMedia: undefined },
  );

  return (
    <div class="archive-filters">
      <div class="archive-filters-chips">
        {availableYears.length > 0 && (
          <ChipSelect
            id="af-year"
            icon={FILTER_ICONS.year}
            options={yearOptions}
            currentValue={currentUrl}
            clearUrl={buildFilterUrl(
              { ...filters, year: undefined },
              { year: undefined },
            )}
            activeLabel={filters.year ? String(filters.year) : undefined}
          />
        )}
        {availableCollections.length > 0 && (
          <ChipSelect
            id="af-collection"
            icon={FILTER_ICONS.collection}
            options={collectionOptions}
            currentValue={currentUrl}
            clearUrl={buildFilterUrl(
              {
                ...filters,
                collectionSlug: undefined,
                collectionTitle: undefined,
              },
              { collectionSlug: undefined, collectionTitle: undefined },
            )}
            activeLabel={filters.collectionTitle}
          />
        )}
        <ChipSelect
          id="af-format"
          icon={FILTER_ICONS.format}
          options={formatOptions}
          currentValue={currentUrl}
          clearUrl={buildFilterUrl(
            { ...filters, format: undefined, hasTitle: undefined },
            { format: undefined, hasTitle: undefined },
          )}
          activeLabel={formatActiveLabel}
        />

        <ChipMediaSelect
          id="af-media"
          icon={FILTER_ICONS.media}
          filters={filters}
          activeLabel={mediaActiveLabel}
          clearUrl={mediaClearUrl}
        />

        {isAuthenticated && (
          <ChipSelect
            id="af-visibility"
            icon={FILTER_ICONS.visibility}
            options={visibilityOptions}
            currentValue={currentUrl}
            clearUrl={allVisibilityUrl}
            activeLabel={
              filters.visibility
                ? getVisibilityLabel(filters.visibility)
                : undefined
            }
          />
        )}
      </div>

      <ViewToggle filters={filters} />
    </div>
  );
};

// =============================================================================
// Archive Tile (Grid View)
// =============================================================================

/**
 * Determine tile variant based on post content and media.
 */
function getTileVariant(post: PostView): "text" | "image" | "mixed" | "quote" {
  const firstMedia = post.media[0];
  const firstKind = firstMedia ? toMediaKind(firstMedia.mimeType) : undefined;
  const hasImage = post.media.some((m) => m.mimeType.startsWith("image/"));

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
  const firstImage = post.media.find((m) => m.mimeType.startsWith("image/"));
  if (firstImage)
    return { url: firstImage.thumbnailUrl, alt: firstImage.altText ?? "" };
  return undefined;
}

/**
 * Resolve a media-kind badge icon for the tile corner.
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
    const summary = post.bodyHtml
      ? stripHtml(post.bodyHtml).slice(0, 200)
      : (post.url ?? "");
    return { title: post.title, summary };
  }
  if (post.format === "quote" && post.quoteText)
    return { summary: post.quoteText };
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
      {bgImage && hasBg && (
        <img
          class="archive-tile-bg"
          src={bgImage.url}
          alt={bgImage.alt}
          loading="lazy"
        />
      )}

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
          {variant !== "image" && !title && summary && (
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

      {badge?.position === "center" && (
        <span
          class="archive-tile-badge archive-tile-badge-center"
          dangerouslySetInnerHTML={{ __html: getIconSvg(badge.icon) ?? "" }}
        />
      )}

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
  const currentView: ArchiveView = filters.view ?? "grid";
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
        ) : currentView === "grid" ? (
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
        ) : (
          <div data-feed>
            <div class="flex flex-col">
              {groups.map((group, gi) => (
                <div key={`list-${group.year}-${group.month}`}>
                  <div class="archive-list-month-header">{group.label}</div>
                  {group.posts.map((post, pi) => (
                    <div key={post.id}>
                      {(gi > 0 || pi > 0) && <hr class="feed-divider" />}
                      <TimelineItemFromPost post={post} />
                    </div>
                  ))}
                </div>
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
