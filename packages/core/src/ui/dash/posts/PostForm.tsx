/**
 * Post Form
 *
 * Server-rendered wrapper that feeds data/labels to `<jant-post-form>`.
 * Provides SSR fallback skeleton while Lit hydrates.
 */

import { useLingui } from "@lingui/react/macro";
import type { FC } from "hono/jsx";
import type { Post, Media, Collection } from "../../../types.js";
import {
  getMediaUrl,
  getImageUrl,
  getPublicUrlForProvider,
} from "../../../lib/image.js";
import { renderCollectionIcon } from "../../../lib/icons.js";

export interface PostFormProps {
  post?: Post;
  action: string;
  mediaAttachments?: Media[];
  r2PublicUrl?: string;
  imageTransformUrl?: string;
  s3PublicUrl?: string;
  collections?: Collection[];
  postCollectionIds?: string[];
  cancelHref?: string;
}

export const PostForm: FC<PostFormProps> = ({
  post,
  action,
  mediaAttachments = [],
  r2PublicUrl,
  imageTransformUrl,
  s3PublicUrl,
  collections = [],
  postCollectionIds = [],
  cancelHref,
}) => {
  const { t } = useLingui();
  const isEdit = Boolean(post);

  const labels = JSON.stringify({
    formatLabel: t({
      message: "Format",
      comment: "@context: Post form field - post format",
    }),
    noteOption: t({
      message: "Note",
      comment: "@context: Post format option",
    }),
    linkOption: t({
      message: "Link",
      comment: "@context: Post format option",
    }),
    quoteOption: t({
      message: "Quote",
      comment: "@context: Post format option",
    }),
    titleLabel: t({
      message: "Title (optional)",
      comment: "@context: Post form field",
    }),
    titlePlaceholder: t({
      message: "Post title...",
      comment: "@context: Post title placeholder",
    }),
    bodyLabel: t({
      message: "Content",
      comment: "@context: Post form field",
    }),
    bodyPlaceholder: t({
      message: "What's on your mind?",
      comment: "@context: Post content placeholder",
    }),
    urlLabel: t({
      message: "URL (optional)",
      comment: "@context: Post form field - source URL",
    }),
    urlPlaceholder: "https://...",
    quoteTextLabel: t({
      message: "Quote Text",
      comment: "@context: Post form field - quoted text",
    }),
    quoteTextPlaceholder: t({
      message: "The text being quoted...",
      comment: "@context: Quote text placeholder",
    }),
    mediaLabel: t({
      message: "Media",
      comment: "@context: Post form field - media attachments",
    }),
    mediaAddButton: t({
      message: "Add Media",
      comment: "@context: Button to open media picker",
    }),
    mediaRemoveButton: t({
      message: "Remove",
      comment: "@context: Remove media attachment button",
    }),
    mediaEmptyLabel: t({
      message: "No media attached.",
      comment: "@context: Post form media empty state",
    }),
    statusLabel: t({
      message: "Status",
      comment: "@context: Post form field",
    }),
    statusPublished: t({
      message: "Published",
      comment: "@context: Post status option",
    }),
    statusDraft: t({
      message: "Draft",
      comment: "@context: Post status option",
    }),
    visibilityLabel: t({
      message: "Visibility",
      comment: "@context: Post form field - post visibility",
    }),
    visibilityPublic: t({
      message: "Public",
      comment: "@context: Visibility option - appears everywhere",
    }),
    visibilityFeatured: t({
      message: "Featured",
      comment: "@context: Visibility option - highlighted on featured page",
    }),
    visibilityUnlisted: t({
      message: "Unlisted",
      comment: "@context: Visibility option - hidden from feeds",
    }),
    pinnedLabel: t({
      message: "Pinned",
      comment: "@context: Post form checkbox - pin to top",
    }),
    collectionsLabel: t({
      message: "Collections (optional)",
      comment: "@context: Post form field - assign to collections",
    }),
    submitLabel: isEdit
      ? t({
          message: "Update",
          comment: "@context: Button to update existing post",
        })
      : t({
          message: "Publish",
          comment: "@context: Button to publish new post",
        }),
    cancelLabel: t({
      message: "Cancel",
      comment: "@context: Button to cancel form",
    }),
    mediaDialogTitle: t({
      message: "Select Media",
      comment: "@context: Media picker dialog title",
    }),
    mediaDialogDone: t({
      message: "Done",
      comment: "@context: Close media picker button",
    }),
    mediaDialogLoading: t({
      message: "Loading...",
      comment: "@context: Loading state for media picker",
    }),
    submitSuccessMessage: isEdit
      ? t({
          message: "Post updated.",
          comment: "@context: Toast after editing post",
        })
      : t({
          message: "Post published.",
          comment: "@context: Toast after creating post",
        }),
    submitErrorMessage: t({
      message: "Couldn't save your post. Try again in a moment.",
      comment: "@context: Toast when post save fails",
    }),
    draftFallbackMessage: t({
      message: "Couldn't publish. Saved as draft.",
      comment:
        "@context: Toast when publish fails and post is auto-saved as draft",
    }),
  }).replace(/</g, "\\u003c");

  const initial = JSON.stringify({
    format: post?.format ?? "note",
    title: post?.title ?? "",
    body: post?.body ?? "",
    url: post?.url ?? "",
    quoteText: post?.quoteText ?? "",
    status: post?.status ?? "published",
    visibility: post?.visibility ?? "public",
    pinned: post?.pinned === 1,
    rating: post?.rating ?? 0,
    collectionIds: postCollectionIds,
    mediaIds: mediaAttachments.map((m) => m.id),
  }).replace(/</g, "\\u003c");

  const media = JSON.stringify(
    mediaAttachments.map((m) => {
      const pUrl = getPublicUrlForProvider(
        m.provider,
        r2PublicUrl,
        s3PublicUrl,
      );
      const mediaUrl = getMediaUrl(m.storageKey, pUrl);
      const thumbUrl = getImageUrl(mediaUrl, imageTransformUrl, {
        width: 150,
        quality: 80,
        format: "auto",
        fit: "cover",
      });
      return {
        id: m.id,
        thumbUrl,
        alt: m.alt || m.originalName,
      };
    }),
  ).replace(/</g, "\\u003c");

  const collectionOptions = JSON.stringify(
    collections.map((col) => ({
      id: col.id,
      title: col.title,
      icon: col.icon,
      iconHtml: renderCollectionIcon(col.icon, { size: 18 }),
    })),
  ).replace(/</g, "\\u003c");

  const cancel = cancelHref ?? "/dash/posts";

  return (
    <jant-post-form
      labels={labels}
      initial={initial}
      action={action}
      cancel-href={cancel}
      media={media}
      collections={collectionOptions}
      media-picker-url="/dash/media/picker"
      is-edit={isEdit ? "true" : undefined}
    >
      <div class="flex flex-col gap-4 max-w-2xl">
        <div class="field">
          <div class="label skel-label"></div>
          <div class="input skel-input"></div>
        </div>
        <div class="field">
          <div class="label skel-label"></div>
          <div class="textarea skel-textarea"></div>
        </div>
        <div class="field">
          <div class="label skel-label"></div>
          <div class="input skel-input"></div>
        </div>
        <div class="flex gap-2">
          <div class="btn skel-input min-w-24"></div>
          <div class="btn-outline skel-input min-w-20"></div>
        </div>
      </div>
    </jant-post-form>
  );
};
