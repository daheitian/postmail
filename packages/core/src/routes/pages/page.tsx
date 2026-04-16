/**
 * Catch-all Route
 *
 * Resolves post slugs, aliases, redirects, and collection aliases.
 * Must be registered last.
 */

import { Hono, type Context } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { PostPage } from "../../ui/pages/PostPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { buildPostMeta } from "../../lib/post-meta.js";
import { assemblePostPageDisplay } from "../../lib/post-display.js";
import { toPublicHref, toPublicPath } from "../../lib/url.js";
import { isTextAttachment } from "../../services/media.js";
import type { Post } from "../../types.js";
import { renderArchivePage } from "./archive.js";
import { renderCollectionFeed, renderCollectionPage } from "./collection.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

interface TextPreviewAutoOpen {
  html: string;
  shareHref: string;
  postHref: string;
  /** Attachment summary used as page title for link previews */
  attachmentTitle: string;
  /** Media ID so the dialog can lazy-fetch the markdown source for Copy */
  mediaId: string;
}

async function renderPostWithTextPreview(
  c: Context<Env>,
  post: Post,
  autoOpen: TextPreviewAutoOpen,
) {
  const navDataPromise = getNavigationData(c);
  const display = await assemblePostPageDisplay(c, post, {
    isAuthenticated: true,
  });
  if (!display) {
    return c.notFound();
  }

  const navData = await navDataPromise;
  const meta = buildPostMeta(post, navData.siteName);

  // Use the attachment summary as the page title (for OG/link previews),
  // and pass the post title in the payload so the client can restore it
  // when the dialog closes.
  const pageTitle = autoOpen.attachmentTitle || meta.title;
  // Metadata only — the HTML content lives in the SSR dialog below.
  // JSON lives inside a <script>, so escape `<` / `>` to defuse any
  // attacker-controlled content that manages to land in post titles.
  const autoOpenMeta = JSON.stringify({
    shareHref: autoOpen.shareHref,
    postHref: autoOpen.postHref,
    postTitle: meta.title,
    mediaId: autoOpen.mediaId,
  })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

  return renderPublicPage(c, {
    title: pageTitle,
    description: meta.description,
    navData,
    content: (
      <>
        <PostPage
          post={display.postView}
          threadPosts={display.threadPostViews}
        />
        {/* SSR dialog — visible immediately before JS loads. The
            text-preview-dialog--ssr modifier provides a CSS-based backdrop
            and scroll lock since ::backdrop only works with showModal().
            The Lit component adopts content and removes this on hydration. */}
        <dialog class="text-preview-dialog text-preview-dialog--ssr" open>
          <div class="text-preview-content">
            <div class="text-preview-toolbar">
              <div class="text-preview-btn" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </div>
              <div class="text-preview-toolbar-actions" />
            </div>
            <div
              class="text-preview-body prose"
              dangerouslySetInnerHTML={{ __html: autoOpen.html }}
            />
          </div>
        </dialog>
        <script
          type="application/json"
          id="text-preview-autoopen"
          dangerouslySetInnerHTML={{ __html: autoOpenMeta }}
        />
      </>
    ),
  });
}

async function renderPost(c: Context<Env>, post: Post) {
  // Start navData fetch immediately — it's independent of thread/media queries
  const navDataPromise = getNavigationData(c);
  const display = await assemblePostPageDisplay(c, post, {
    // Private-post access is validated before renderPost() is called.
    isAuthenticated: true,
  });
  if (!display) {
    return c.notFound();
  }

  const navData = await navDataPromise;
  const meta = buildPostMeta(post, navData.siteName);

  return renderPublicPage(c, {
    title: meta.title,
    description: meta.description,
    navData,
    content: (
      <PostPage post={display.postView} threadPosts={display.threadPostViews} />
    ),
  });
}

// Catch-all for path-registry backed post URLs, aliases, and redirects
pageRoutes.get("/*", async (c) => {
  const fullPath = c.req.path.slice(1); // Remove leading /
  if (!fullPath) return c.notFound();
  const sitePathPrefix = c.var.appConfig.sitePathPrefix;

  if (fullPath.endsWith("/feed")) {
    const collectionPath = fullPath.slice(0, -"/feed".length);
    if (!collectionPath) return c.notFound();

    const resolvedCollection =
      await c.var.services.paths.resolve(collectionPath);
    if (resolvedCollection?.collectionId) {
      const collection = await c.var.services.collections.getById(
        resolvedCollection.collectionId,
      );
      if (!collection) return c.notFound();

      if (resolvedCollection.kind === "slug") {
        const alias = await c.var.services.customUrls.getByTarget(
          "collection",
          collection.id,
        );
        if (alias) {
          return c.redirect(
            toPublicPath(`/${alias.path}/feed`, sitePathPrefix),
            301,
          );
        }

        const result = await renderCollectionFeed(c, collection.slug);
        return result ?? c.notFound();
      }

      if (resolvedCollection.kind === "alias") {
        const result = await renderCollectionFeed(
          c,
          collection.slug,
          `/${resolvedCollection.path}/feed`,
        );
        return result ?? c.notFound();
      }
    }
  }

  // Text attachment deep-link: /{post-slug}/text/{media-id}
  const textMatch = fullPath.match(/^(.+)\/text\/([a-zA-Z0-9_-]+)$/);
  if (textMatch) {
    const slugPart = textMatch[1] ?? "";
    const mediaId = textMatch[2] ?? "";
    if (!slugPart || !mediaId) return c.notFound();
    const resolvedPost = await c.var.services.paths.resolve(slugPart);

    if (resolvedPost?.postId) {
      const post = await c.var.services.posts.getById(resolvedPost.postId);
      if (!post || post.status === "draft") return c.notFound();

      if (post.visibility === "private") {
        const navData = await getNavigationData(c);
        if (!navData.isAuthenticated) return c.notFound();
      }

      // Redirect slug → alias if one exists (same pattern as post pages)
      if (resolvedPost.kind === "slug") {
        const alias = await c.var.services.customUrls.getByTarget(
          "post",
          post.id,
        );
        if (alias) {
          return c.redirect(
            toPublicPath(`/${alias.path}/text/${mediaId}`, sitePathPrefix),
            301,
          );
        }
      }

      // Verify the media belongs to this post and is a Jant-composed text
      // attachment. Plain text-file uploads (.md, .txt, .csv) also carry
      // mediaKind === "text" but lack the split HTML/JSON sibling layout
      // that this page route expects — `isTextAttachment` excludes them.
      const media = await c.var.services.media.getById(mediaId);
      if (!media || media.postId !== post.id || !isTextAttachment(media)) {
        return c.notFound();
      }

      const attachment = await c.var.services.media.getTextAttachmentHtml(
        media.id,
        c.var.storage ?? null,
      );
      if (!attachment) return c.notFound();

      const postPermalink = toPublicPath(
        resolvedPost.path ? `/${resolvedPost.path}` : `/${post.slug}`,
        sitePathPrefix,
      );

      // Render the parent post page with auto-open data for the text preview dialog
      return renderPostWithTextPreview(c, post, {
        html: attachment.html,
        shareHref: c.req.path,
        postHref: postPermalink,
        attachmentTitle: attachment.summary ?? "",
        mediaId: media.id,
      });
    }
  }

  const resolved = await c.var.services.paths.resolve(fullPath);
  if (!resolved) return c.notFound();

  if (resolved.kind === "redirect" && resolved.redirectToPath) {
    return c.redirect(
      toPublicHref(`/${resolved.redirectToPath}`, sitePathPrefix),
      resolved.redirectType ?? 301,
    );
  }

  if (resolved.kind === "archive" && resolved.archiveQuery) {
    const overrides = Object.fromEntries(
      new URLSearchParams(resolved.archiveQuery),
    );
    return renderArchivePage(c, overrides);
  }

  if (resolved.postId) {
    const post = await c.var.services.posts.getById(resolved.postId);
    if (!post || post.status === "draft") return c.notFound();

    if (post.visibility === "private") {
      const navData = await getNavigationData(c);
      if (!navData.isAuthenticated) return c.notFound();
    }

    // If accessed via slug but an alias exists, redirect to the alias
    if (resolved.kind === "slug") {
      const alias = await c.var.services.customUrls.getByTarget(
        "post",
        post.id,
      );
      if (alias) {
        return c.redirect(toPublicPath(`/${alias.path}`, sitePathPrefix), 301);
      }
    }

    return renderPost(c, post);
  }

  if (resolved.collectionId) {
    const collection = await c.var.services.collections.getById(
      resolved.collectionId,
    );
    if (!collection) return c.notFound();

    if (resolved.kind === "slug") {
      const alias = await c.var.services.customUrls.getByTarget(
        "collection",
        collection.id,
      );
      if (alias) {
        return c.redirect(toPublicPath(`/${alias.path}`, sitePathPrefix), 301);
      }

      const result = await renderCollectionPage(c, collection.slug);
      return result ?? c.notFound();
    }

    if (resolved.kind === "alias") {
      const aliasPagePath = `/${resolved.path}`;
      const result = await renderCollectionPage(
        c,
        collection.slug,
        aliasPagePath,
      );
      return result ?? c.notFound();
    }
  }

  return c.notFound();
});
