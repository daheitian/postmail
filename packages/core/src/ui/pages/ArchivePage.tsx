/**
 * Archive Page
 *
 * Tumblr-style grid with 2-row filter bar, rich media tiles,
 * month-based grouping, and page-based pagination.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ArchivePageProps, ArchiveFilters } from "../../types.js";
import type { PostView } from "../../types/views.js";
import { FORMATS, ARCHIVE_MEDIA_TYPES } from "../../types.js";
import { getIconSvg } from "../../lib/icons.js";
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
  if (merged.mediaTypes && merged.mediaTypes.length > 0) {
    params.set("media", merged.mediaTypes.join(","));
  }
  if (merged.hasTitle !== undefined) {
    params.set("hasTitle", merged.hasTitle ? "1" : "0");
  }

  const qs = params.toString();
  return qs ? `/archive?${qs}` : "/archive";
}

/** Count active filters (for the "Clear" button). */
function countActiveFilters(filters: ArchiveFilters): number {
  let count = 0;
  if (filters.year) count++;
  if (filters.collectionSlug) count++;
  if (filters.format) count++;
  if (filters.mediaTypes && filters.mediaTypes.length > 0) count++;
  if (filters.hasTitle !== undefined) count++;
  return count;
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

/** Icon name mapping for media type prefixes. */
const MEDIA_TYPE_ICONS: Record<string, string> = {
  "image/": "image",
  "video/": "video",
  "audio/": "music",
  "application/": "file",
};

function getMediaTypeLabel(prefix: string): string {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    "image/": t({
      message: "Images",
      comment: "@context: Archive media filter - images",
    }),
    "video/": t({
      message: "Video",
      comment: "@context: Archive media filter - video",
    }),
    "audio/": t({
      message: "Audio",
      comment: "@context: Archive media filter - audio",
    }),
    "application/": t({
      message: "Files",
      comment: "@context: Archive media filter - files/documents",
    }),
  };
  return labels[prefix] ?? prefix;
}

/** Render a Lucide icon inline (sized for badges). */
const BadgeIcon: FC<{ name: string }> = ({ name }) => {
  const svg = getIconSvg(name);
  if (!svg) return null;
  return <span class="badge-icon" dangerouslySetInnerHTML={{ __html: svg }} />;
};

// =============================================================================
// Filter Bar
// =============================================================================

const FilterBar: FC<{
  filters: ArchiveFilters;
  availableYears: number[];
  availableCollections: { slug: string; title: string }[];
}> = ({ filters, availableYears, availableCollections }) => {
  const { t } = useLingui();
  const activeCount = countActiveFilters(filters);

  return (
    <div class="archive-filters">
      {/* Row 1: Year, Collection, Format chips, Clear */}
      <div class="archive-filters-row">
        {/* Year dropdown */}
        {availableYears.length > 0 && (
          <select
            class="archive-filter-select"
            onchange="window.location.href=this.value"
          >
            <option
              value={buildFilterUrl(
                { ...filters, year: undefined },
                { year: undefined },
              )}
              selected={!filters.year}
            >
              {t({
                message: "All years",
                comment: "@context: Archive filter - year dropdown default",
              })}
            </option>
            {availableYears.map((year) => (
              <option
                key={year}
                value={buildFilterUrl(filters, { year })}
                selected={filters.year === year}
              >
                {year}
              </option>
            ))}
          </select>
        )}

        {/* Collection dropdown */}
        {availableCollections.length > 0 && (
          <select
            class="archive-filter-select"
            onchange="window.location.href=this.value"
          >
            <option
              value={buildFilterUrl(
                {
                  ...filters,
                  collectionSlug: undefined,
                  collectionTitle: undefined,
                },
                { collectionSlug: undefined, collectionTitle: undefined },
              )}
              selected={!filters.collectionSlug}
            >
              {t({
                message: "All collections",
                comment:
                  "@context: Archive filter - collection dropdown default",
              })}
            </option>
            {availableCollections.map((col) => (
              <option
                key={col.slug}
                value={buildFilterUrl(filters, { collectionSlug: col.slug })}
                selected={filters.collectionSlug === col.slug}
              >
                {col.title}
              </option>
            ))}
          </select>
        )}

        {/* Format chips */}
        <a
          href={buildFilterUrl(
            { ...filters, format: undefined, hasTitle: undefined },
            { format: undefined, hasTitle: undefined },
          )}
          class={!filters.format ? "badge-secondary" : "badge-outline"}
        >
          {t({
            message: "All",
            comment: "@context: Archive filter - all formats",
          })}
        </a>
        {FORMATS.map((f) => (
          <a
            key={f}
            href={buildFilterUrl(filters, {
              format: f,
              // Clear hasTitle when switching away from note
              hasTitle: f === "note" ? filters.hasTitle : undefined,
            })}
            class={filters.format === f ? "badge-secondary" : "badge-outline"}
          >
            {getFormatLabelPlural(f)}
          </a>
        ))}

        {/* Clear filters */}
        {activeCount > 0 && (
          <a href="/archive" class="archive-filter-clear">
            {t({
              message: "Clear",
              comment: "@context: Archive filter - clear all filters",
            })}{" "}
            ({activeCount})
          </a>
        )}
      </div>

      {/* Divider + Row 2 (media chips and note sub-filters) */}
      {(ARCHIVE_MEDIA_TYPES.length > 0 || filters.format === "note") && (
        <>
          <div class="archive-filters-divider" />
          <div class="archive-filters-row">
            {/* Media type chips (multi-select toggle) */}
            {ARCHIVE_MEDIA_TYPES.map((mt) => {
              const isActive = filters.mediaTypes?.includes(mt) ?? false;
              let nextMediaTypes: string[];
              if (isActive) {
                nextMediaTypes = (filters.mediaTypes ?? []).filter(
                  (m) => m !== mt,
                );
              } else {
                nextMediaTypes = [...(filters.mediaTypes ?? []), mt];
              }
              return (
                <a
                  key={mt}
                  href={buildFilterUrl(filters, {
                    mediaTypes:
                      nextMediaTypes.length > 0 ? nextMediaTypes : undefined,
                  })}
                  class={isActive ? "badge-secondary" : "badge-outline"}
                >
                  <BadgeIcon name={MEDIA_TYPE_ICONS[mt] ?? "file"} />
                  {getMediaTypeLabel(mt)}
                </a>
              );
            })}

            {/* Note sub-filter: Has Title / No Title */}
            {filters.format === "note" && (
              <>
                <span class="text-muted-foreground text-xs">|</span>
                <a
                  href={buildFilterUrl(filters, {
                    hasTitle: filters.hasTitle === true ? undefined : true,
                  })}
                  class={
                    filters.hasTitle === true
                      ? "badge-secondary"
                      : "badge-outline"
                  }
                >
                  <BadgeIcon name="heading" />
                  {t({
                    message: "Titled",
                    comment:
                      "@context: Archive filter - notes that have a title",
                  })}
                </a>
                <a
                  href={buildFilterUrl(filters, {
                    hasTitle: filters.hasTitle === false ? undefined : false,
                  })}
                  class={
                    filters.hasTitle === false
                      ? "badge-secondary"
                      : "badge-outline"
                  }
                >
                  <BadgeIcon name="text" />
                  {t({
                    message: "Untitled",
                    comment: "@context: Archive filter - notes without a title",
                  })}
                </a>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// Archive Tile
// =============================================================================

/**
 * Determine tile variant based on post content:
 * - quote: centered italic text
 * - image: image fills tile (no text)
 * - mixed: image bg + text overlay
 * - text: plain text preview
 */
function getTileVariant(post: PostView): "text" | "image" | "mixed" | "quote" {
  const hasImage = post.media.some((m) => m.mimeType.startsWith("image/"));

  if (post.format === "quote") return "quote";
  if (hasImage && (post.title || post.excerpt)) return "mixed";
  if (hasImage) return "image";
  return "text";
}

/** Strip HTML tags to get plain text for tile previews. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getTileText(post: PostView): string {
  if (post.title) return post.title;
  if (post.format === "quote" && post.quoteText) return post.quoteText;
  // bodyHtml is rendered HTML; strip tags for a readable plain-text preview.
  // Avoid post.excerpt which is derived from raw Tiptap JSON.
  if (post.bodyHtml) return stripHtml(post.bodyHtml).slice(0, 200);
  if (post.url) return post.url;
  return getFormatLabel(post.format);
}

const ArchiveTile: FC<{ post: PostView }> = ({ post }) => {
  const variant = getTileVariant(post);
  const firstImage = post.media.find((m) => m.mimeType.startsWith("image/"));
  const text = getTileText(post);

  return (
    <a
      href={post.permalink}
      class={`archive-tile archive-tile-${variant}`}
      data-post
      data-format={post.format}
    >
      {/* Background image for image/mixed tiles */}
      {firstImage && (variant === "image" || variant === "mixed") && (
        <img
          class="archive-tile-bg"
          src={firstImage.thumbnailUrl}
          alt={firstImage.altText ?? ""}
          loading="lazy"
        />
      )}

      {/* Text content */}
      {variant !== "image" && (
        <div class="archive-tile-content">
          <span class="archive-tile-text-clamp">{text}</span>
        </div>
      )}
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
