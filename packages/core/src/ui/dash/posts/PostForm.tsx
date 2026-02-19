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
  postCollectionIds?: number[];
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
      message: "No media selected yet.",
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
    featuredLabel: t({
      message: "Featured",
      comment: "@context: Post form checkbox - mark as featured",
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
          message: "Post updated successfully.",
          comment: "@context: Toast after editing post",
        })
      : t({
          message: "Post published successfully.",
          comment: "@context: Toast after creating post",
        }),
    submitErrorMessage: t({
      message: "Failed to save post. Please try again.",
      comment: "@context: Toast when post save fails",
    }),
  }).replace(/</g, "\\u003c");

  const initial = JSON.stringify({
    format: post?.format ?? "note",
    title: post?.title ?? "",
    body: post?.body ?? "",
    url: post?.url ?? "",
    quoteText: post?.quoteText ?? "",
    status: post?.status ?? "published",
    featured: post?.featured === 1,
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
          <div class="label" style="min-height:1.5rem"></div>
          <div class="input" style="height:2.75rem"></div>
        </div>
        <div class="field">
          <div class="label" style="min-height:1.5rem"></div>
          <div class="textarea" style="height:6rem"></div>
        </div>
        <div class="field">
          <div class="label" style="min-height:1.5rem"></div>
          <div class="input" style="height:2.75rem"></div>
        </div>
        <div class="flex gap-2">
          <div class="btn" style="height:2.75rem;min-width:6rem"></div>
          <div class="btn-outline" style="height:2.75rem;min-width:5rem"></div>
        </div>
      </div>
    </jant-post-form>
  );
};
