/**
 * Media Gallery Component
 *
 * Renders media attachments on public post pages.
 * Layout adapts based on the number of images.
 */

import type { FC } from "hono/jsx";
import type { MediaView } from "../../types.js";

export interface MediaGalleryProps {
  attachments: MediaView[];
}

export const MediaGallery: FC<MediaGalleryProps> = ({ attachments }) => {
  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  if (images.length === 0) return null;

  if (images.length === 1) {
    const [img] = images;
    if (!img) return null;
    return (
      <div class="mt-3">
        <a href={img.url} target="_blank" rel="noopener noreferrer">
          <img
            src={img.thumbnailUrl}
            alt={img.altText || ""}
            width={img.width ?? undefined}
            height={img.height ?? undefined}
            class="rounded-lg max-w-full h-auto"
            loading="lazy"
          />
        </a>
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div class="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {images.map((img) => (
          <a
            key={img.id}
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            class="aspect-square"
          >
            <img
              src={img.thumbnailUrl}
              alt={img.altText || ""}
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    const [first, ...rest] = images;
    if (!first) return null;
    return (
      <div class="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        <a
          href={first.url}
          target="_blank"
          rel="noopener noreferrer"
          class="row-span-2"
        >
          <img
            src={first.thumbnailUrl}
            alt={first.altText || ""}
            class="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
        {rest.map((img) => (
          <a
            key={img.id}
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            class="aspect-square"
          >
            <img
              src={img.thumbnailUrl}
              alt={img.altText || ""}
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    );
  }

  // 4+ images: 2-column grid, show first 4 with remaining count
  const shown = images.slice(0, 4);
  const remaining = images.length - 4;

  return (
    <div class="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
      {shown.map((img, i) => (
        <a
          key={img.id}
          href={img.url}
          target="_blank"
          rel="noopener noreferrer"
          class="relative aspect-square"
        >
          <img
            src={img.thumbnailUrl}
            alt={img.altText || ""}
            class="w-full h-full object-cover"
            loading="lazy"
          />
          {i === 3 && remaining > 0 && (
            <div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-semibold">
              +{remaining}
            </div>
          )}
        </a>
      ))}
    </div>
  );
};
