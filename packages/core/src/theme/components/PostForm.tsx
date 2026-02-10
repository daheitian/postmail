/**
 * Post Creation/Edit Form
 */

import type { FC } from "hono/jsx";
import type { Post, Media, Collection } from "../../types.js";
import { useLingui } from "@lingui/react/macro";
import { getMediaUrl, getImageUrl } from "../../lib/image.js";

export interface PostFormProps {
  post?: Post;
  action: string;
  mediaAttachments?: Media[];
  r2PublicUrl?: string;
  imageTransformUrl?: string;
  collections?: Collection[];
  postCollectionIds?: number[];
}

export const PostForm: FC<PostFormProps> = ({
  post,
  action,
  mediaAttachments,
  r2PublicUrl,
  imageTransformUrl,
  collections,
  postCollectionIds,
}) => {
  const { t } = useLingui();
  const isEdit = !!post;

  const existingMediaIds = (mediaAttachments ?? []).map((m) => m.id);

  const signals = JSON.stringify({
    type: post?.type ?? "note",
    title: post?.title ?? "",
    content: post?.content ?? "",
    sourceUrl: post?.sourceUrl ?? "",
    sourceName: post?.sourceName ?? "",
    visibility: post?.visibility ?? "quiet",
    path: post?.path ?? "",
    mediaIds: existingMediaIds,
    collectionIds: postCollectionIds ?? [],
  }).replace(/</g, "\\u003c");

  return (
    <form
      data-signals={signals}
      data-on:submit__prevent={`@post('${action}')`}
      class="flex flex-col gap-4"
    >
      <div id="post-form-message"></div>

      {/* Type selector */}
      <div class="field">
        <label class="label">
          {t({
            message: "Type",
            comment: "@context: Post form field - post type",
          })}
        </label>
        <select data-bind="type" class="select" required>
          <option value="note" selected={post?.type === "note"}>
            {t({ message: "Note", comment: "@context: Post type option" })}
          </option>
          <option value="article" selected={post?.type === "article"}>
            {t({ message: "Article", comment: "@context: Post type option" })}
          </option>
          <option value="link" selected={post?.type === "link"}>
            {t({ message: "Link", comment: "@context: Post type option" })}
          </option>
          <option value="quote" selected={post?.type === "quote"}>
            {t({ message: "Quote", comment: "@context: Post type option" })}
          </option>
          <option value="image" selected={post?.type === "image"}>
            {t({ message: "Image", comment: "@context: Post type option" })}
          </option>
        </select>
      </div>

      {/* Title (optional) */}
      <div class="field">
        <label class="label">
          {t({
            message: "Title (optional)",
            comment: "@context: Post form field",
          })}
        </label>
        <input
          type="text"
          data-bind="title"
          class="input"
          placeholder={t({
            message: "Post title...",
            comment: "@context: Post title placeholder",
          })}
        />
      </div>

      {/* Content */}
      <div class="field">
        <label class="label">
          {t({ message: "Content", comment: "@context: Post form field" })}
        </label>
        <textarea
          data-bind="content"
          class="textarea min-h-32"
          placeholder={t({
            message: "What's on your mind?",
            comment: "@context: Post content placeholder",
          })}
          required
        >
          {post?.content ?? ""}
        </textarea>
      </div>

      {/* Media attachments */}
      <div class="field" data-show="$type !== 'page'">
        <label class="label">
          {t({
            message: "Media",
            comment: "@context: Post form field - media attachments",
          })}
        </label>
        <p
          class="text-xs text-muted-foreground mb-2"
          data-show="$type === 'image'"
        >
          {t({
            message: "At least 1 image required for image posts.",
            comment: "@context: Hint for image post type media requirement",
          })}
        </p>
        {mediaAttachments && mediaAttachments.length > 0 && (
          <div class="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
            {mediaAttachments.map((m) => {
              const url = getMediaUrl(m.id, m.r2Key, r2PublicUrl);
              const thumbUrl = getImageUrl(url, imageTransformUrl, {
                width: 150,
                quality: 80,
                format: "auto",
                fit: "cover",
              });
              return (
                <div
                  key={m.id}
                  class="relative group aspect-square"
                  data-show={`$mediaIds.includes('${m.id}')`}
                >
                  <img
                    src={thumbUrl}
                    alt={m.alt || m.originalName}
                    class="w-full h-full object-cover rounded-lg border"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    class="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    data-on:click={`$mediaIds = $mediaIds.filter(id => id !== '${m.id}')`}
                    title={t({
                      message: "Remove",
                      comment: "@context: Remove media attachment button",
                    })}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <button
          type="button"
          class="btn-outline text-sm"
          data-on:click="document.getElementById('media-picker-dialog').showModal(); fetch('/dash/media/picker').then(r => r.text()).then(html => document.getElementById('media-picker-grid').innerHTML = html)"
        >
          {t({
            message: "Add Media",
            comment: "@context: Button to open media picker",
          })}
        </button>
      </div>

      {/* Source URL (for link/quote types) */}
      <div class="field">
        <label class="label">
          {t({
            message: "Source URL (optional)",
            comment: "@context: Post form field",
          })}
        </label>
        <input
          type="url"
          data-bind="sourceUrl"
          class="input"
          placeholder="https://..."
        />
      </div>

      {/* Source Name (for link/quote types) */}
      <div class="field">
        <label class="label">
          {t({
            message: "Source Name (optional)",
            comment:
              "@context: Post form field - name of the source website or author",
          })}
        </label>
        <input
          type="text"
          data-bind="sourceName"
          class="input"
          placeholder={t({
            message: "e.g. The Verge, John Doe",
            comment: "@context: Source name placeholder",
          })}
        />
      </div>

      {/* Visibility */}
      <div class="field">
        <label class="label">
          {t({ message: "Visibility", comment: "@context: Post form field" })}
        </label>
        <select data-bind="visibility" class="select">
          <option
            value="quiet"
            selected={post?.visibility === "quiet" || !post}
          >
            {t({
              message: "Quiet (normal)",
              comment: "@context: Post visibility option",
            })}
          </option>
          <option value="featured" selected={post?.visibility === "featured"}>
            {t({
              message: "Featured",
              comment: "@context: Post visibility option",
            })}
          </option>
          <option value="unlisted" selected={post?.visibility === "unlisted"}>
            {t({
              message: "Unlisted",
              comment: "@context: Post visibility option",
            })}
          </option>
          <option value="draft" selected={post?.visibility === "draft"}>
            {t({
              message: "Draft",
              comment: "@context: Post visibility option",
            })}
          </option>
        </select>
      </div>

      {/* Collections */}
      {collections && collections.length > 0 && (
        <fieldset class="field">
          <legend class="label">
            {t({
              message: "Collections (optional)",
              comment: "@context: Post form field - assign to collections",
            })}
          </legend>
          <div class="flex flex-col gap-1">
            {collections.map((col) => (
              <label key={col.id} class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="checkbox"
                  data-attr:checked={`$collectionIds.includes(${col.id})`}
                  data-on:change={`$collectionIds.includes(${col.id}) ? $collectionIds = $collectionIds.filter(id => id !== ${col.id}) : $collectionIds = [...$collectionIds, ${col.id}]`}
                />
                {col.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Custom path (optional) */}
      <div class="field">
        <label class="label">
          {t({
            message: "Custom Path (optional)",
            comment: "@context: Post form field",
          })}
        </label>
        <input
          type="text"
          data-bind="path"
          class="input"
          placeholder="my-custom-url"
        />
      </div>

      {/* Submit */}
      <div class="flex gap-2">
        <button type="submit" class="btn">
          {isEdit
            ? t({
                message: "Update",
                comment: "@context: Button to update existing post",
              })
            : t({
                message: "Publish",
                comment: "@context: Button to publish new post",
              })}
        </button>
        <a href="/dash/posts" class="btn-outline">
          {t({ message: "Cancel", comment: "@context: Button to cancel form" })}
        </a>
      </div>

      {/* Media picker dialog */}
      <dialog
        id="media-picker-dialog"
        class="p-6 rounded-lg max-w-2xl w-full backdrop:bg-black/50"
        onclick="event.target === this && this.close()"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">
            {t({
              message: "Select Media",
              comment: "@context: Media picker dialog title",
            })}
          </h2>
          <button
            type="button"
            class="btn-outline text-sm"
            onclick="this.closest('dialog').close()"
          >
            {t({
              message: "Done",
              comment: "@context: Close media picker button",
            })}
          </button>
        </div>
        <div
          id="media-picker-grid"
          class="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto"
        >
          <p class="text-muted-foreground text-sm col-span-4">
            {t({
              message: "Loading...",
              comment: "@context: Loading state for media picker",
            })}
          </p>
        </div>
      </dialog>
    </form>
  );
};
