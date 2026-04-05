/**
 * Avatar settings page — extracted from GeneralContent
 *
 * Wraps the <jant-settings-avatar> Lit component with translated labels.
 */

import { msg } from "@lingui/core/macro";
import { useLingui } from "../../../i18n/context.js";

export function AvatarContent({
  siteAvatarUrl,
  showHeaderAvatar,
}: {
  siteAvatarUrl: string;
  showHeaderAvatar: boolean;
}) {
  const { i18n } = useLingui();

  const labels = JSON.stringify({
    blogAvatar: i18n._(
      msg({
        message: "Blog Avatar",
        comment: "@context: Settings section heading for avatar",
      }),
    ),
    uploadAvatar: i18n._(
      msg({
        message: "Upload Avatar",
        comment: "@context: Button to upload avatar image",
      }),
    ),
    remove: i18n._(
      msg({
        message: "Remove",
        comment: "@context: Button to remove the blog avatar",
      }),
    ),
    confirmRemoveAvatar: i18n._(
      msg({
        message:
          "Remove this avatar? Your favicon and header icon will go back to the default.",
        comment: "@context: Confirm dialog for removing the blog avatar",
      }),
    ),
    avatarHelp: i18n._(
      msg({
        message:
          "This is used for your favicon and apple-touch-icon. For best results, upload a square PNG with a solid background at least 512x512 pixels.",
        comment: "@context: Help text for avatar upload",
      }),
    ),
    displayInHeader: i18n._(
      msg({
        message: "Display avatar in my site header",
        comment: "@context: Checkbox to show avatar in the site header",
      }),
    ),
    processing: i18n._(
      msg({
        message: "Processing...",
        comment:
          "@context: Avatar upload button text while generating favicon variants",
      }),
    ),
    uploading: i18n._(
      msg({
        message: "Uploading...",
        comment: "@context: Avatar upload button text while uploading",
      }),
    ),
    uploadError: i18n._(
      msg({
        message: "Upload failed. Please try again.",
        comment: "@context: Error message when avatar upload fails",
      }),
    ),
    save: i18n._(
      msg({
        message: "Save",
        comment: "@context: Button to save settings changes",
      }),
    ),
    cancel: i18n._(
      msg({
        message: "Cancel",
        comment: "@context: Button to cancel settings changes",
      }),
    ),
  }).replace(/</g, "\\u003c");

  return (
    <div class="flex flex-col max-w-2xl">
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
