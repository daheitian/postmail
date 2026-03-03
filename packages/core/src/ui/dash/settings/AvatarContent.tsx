/**
 * Avatar settings page — extracted from GeneralContent
 *
 * Wraps the <jant-settings-avatar> Lit component with translated labels.
 */

import { useLingui } from "@lingui/react/macro";

export function AvatarContent({
  siteAvatarUrl,
  showHeaderAvatar,
}: {
  siteAvatarUrl: string;
  showHeaderAvatar: boolean;
}) {
  const { t } = useLingui();

  const labels = JSON.stringify({
    blogAvatar: t({
      message: "Blog Avatar",
      comment: "@context: Settings section heading for avatar",
    }),
    uploadAvatar: t({
      message: "Upload Avatar",
      comment: "@context: Button to upload avatar image",
    }),
    remove: t({
      message: "Remove",
      comment: "@context: Button to remove the blog avatar",
    }),
    avatarHelp: t({
      message:
        "This is used for your favicon and apple-touch-icon. For best results, upload a square image at least 180x180 pixels.",
      comment: "@context: Help text for avatar upload",
    }),
    displayInHeader: t({
      message: "Display avatar in my site header",
      comment: "@context: Checkbox to show avatar in the site header",
    }),
    processing: t({
      message: "Processing...",
      comment:
        "@context: Avatar upload button text while generating favicon variants",
    }),
    uploading: t({
      message: "Uploading...",
      comment: "@context: Avatar upload button text while uploading",
    }),
    uploadError: t({
      message: "Upload failed. Please try again.",
      comment: "@context: Error message when avatar upload fails",
    }),
    save: t({
      message: "Save",
      comment: "@context: Button to save settings changes",
    }),
    cancel: t({
      message: "Cancel",
      comment: "@context: Button to cancel settings changes",
    }),
  }).replace(/</g, "\\u003c");

  return (
    <div class="flex flex-col max-w-lg">
      <jant-settings-avatar
        avatar-url={siteAvatarUrl}
        show-in-header={showHeaderAvatar || undefined}
        labels={labels}
      >
        {/* SSR fallback skeleton */}
        <div>
          <h2 class="skel-label" />
          <div class="skel-section-sm" />
        </div>
      </jant-settings-avatar>
    </div>
  );
}
