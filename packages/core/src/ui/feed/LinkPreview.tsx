/**
 * Link Preview
 *
 * Renders a preview thumbnail for link posts with recognized external content.
 * For video providers (YouTube, etc.) shows a play button overlay and provider badge.
 */

import type { FC } from "hono/jsx";

interface LinkPreviewProps {
  imageUrl: string;
  linkUrl: string;
  kind?: string;
  provider?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  bilibili: "Bilibili",
};

export const LinkPreview: FC<LinkPreviewProps> = ({
  imageUrl,
  linkUrl,
  kind,
  provider,
}) => {
  const isVideo = kind === "video";
  const providerLabel = provider ? PROVIDER_LABELS[provider] : undefined;

  return (
    <a
      href={linkUrl}
      class="link-preview"
      target="_blank"
      rel="noopener noreferrer"
      data-preview-kind={kind}
      data-preview-provider={provider}
    >
      <img src={imageUrl} alt="" class="link-preview-image" loading="lazy" />
      {isVideo && (
        <div class="link-preview-play" aria-hidden="true">
          <svg
            class="link-preview-play-icon"
            viewBox="0 0 68 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              class="link-preview-play-bg"
              d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
              fill="rgba(0,0,0,.65)"
            />
            <path d="M45 24L27 14v20" fill="#fff" />
          </svg>
        </div>
      )}
      {providerLabel && (
        <span class="link-preview-badge" aria-hidden="true">
          {isVideo && (
            <svg
              class="link-preview-badge-icon"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
            >
              <path d="M5.5 3.5v9l7-4.5z" />
            </svg>
          )}
          {providerLabel}
        </span>
      )}
    </a>
  );
};
