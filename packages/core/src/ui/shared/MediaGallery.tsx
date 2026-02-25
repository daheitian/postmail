/**
 * Media Gallery Component
 *
 * Renders media attachments in a horizontal scrollable row,
 * similar to an image carousel.
 */

import type { FC } from "hono/jsx";
import type { MediaView } from "../../types.js";

export interface MediaGalleryProps {
  attachments: MediaView[];
}

export const MediaGallery: FC<MediaGalleryProps> = ({ attachments }) => {
  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  if (images.length === 0) return null;

  const single = images.length === 1;

  const lightboxImages = images.map((img) => ({
    url: img.url,
    alt: img.altText || "",
    width: img.width,
    height: img.height,
  }));

  return (
    <div
      data-post-media
      data-lightbox-group={JSON.stringify(lightboxImages)}
      class={`mt-3 flex gap-2 ${single ? "" : "overflow-x-auto scroll-smooth snap-x snap-mandatory"}`}
      style={
        single ? undefined : "scrollbar-width: none; -ms-overflow-style: none;"
      }
    >
      {images.map((img, index) => {
        const aspectRatio =
          img.width && img.height ? img.width / img.height : 4 / 3;
        const itemWidth = single
          ? undefined
          : `${Math.round(320 * Math.min(Math.max(aspectRatio, 0.6), 1.6))}px`;

        return (
          <a
            key={img.id}
            href={img.url}
            data-lightbox-index={index}
            class={`${single ? "" : "shrink-0 snap-start"} block rounded-lg overflow-hidden`}
            style={single ? undefined : { width: itemWidth, maxWidth: "85%" }}
          >
            <img
              src={img.thumbnailUrl}
              alt={img.altText || ""}
              class={
                single
                  ? "rounded-lg max-w-full max-h-96 h-auto object-contain"
                  : "h-80 w-full object-cover"
              }
              loading="lazy"
            />
          </a>
        );
      })}
    </div>
  );
};
