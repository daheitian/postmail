/**
 * Post display assembly helpers.
 *
 * Reusable server-side assembly for single-post cards and permalink thread
 * views so full-page renders and partial refreshes stay in sync.
 */

import type { Context } from "hono";
import type { Bindings, Post, PostView } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { buildMediaMap } from "./media-helpers.js";
import { createMediaContext, toPostView } from "./view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export interface PostPageDisplayData {
  postView: PostView;
  threadPostViews?: PostView[];
}

function canViewPost(post: Post, isAuthenticated: boolean): boolean {
  if (post.status !== "published") {
    return false;
  }

  if (post.visibility === "private" && !isAuthenticated) {
    return false;
  }

  return true;
}

/**
 * Assembles a single post card view with thread metadata.
 *
 * @param c - Hono context (provides services + appConfig)
 * @param postId - TypeID of the post to render
 * @param options - Auth state used to enforce private post visibility
 * @returns Render-ready post card view, or null when it should not be shown
 */
export async function assemblePostCardView(
  c: Context<Env>,
  postId: string,
  options?: { isAuthenticated?: boolean },
): Promise<PostView | null> {
  const post = await c.var.services.posts.getById(postId);
  const isAuthenticated = options?.isAuthenticated ?? false;
  if (!post || !canViewPost(post, isAuthenticated)) {
    return null;
  }

  const mediaCtx = createMediaContext(c.var.appConfig);
  const [rawMediaMap, collectionsMap, lastPostMap] = await Promise.all([
    c.var.services.media.getByPostIds([post.id]),
    c.var.services.collections.getCollectionsByPostIds([post.id]),
    c.var.services.posts.getLastPostIdsByThread([post.threadId]),
  ]);

  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
    mediaCtx.localPublicUrl,
    mediaCtx.sitePathPrefix,
  );
  const view = toPostView(
    { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
    mediaCtx,
    collectionsMap.get(post.id),
    lastPostMap.get(post.threadId) === post.id,
  );

  return view;
}

/**
 * Assembles the post permalink view, including the full thread when needed.
 *
 * @param c - Hono context (provides services + appConfig)
 * @param postOrId - TypeID of the post or a preloaded post record
 * @param options - Auth state used to enforce private post visibility
 * @returns Render-ready permalink view data, or null when it should not be shown
 */
export async function assemblePostPageDisplay(
  c: Context<Env>,
  postOrId: string | Post,
  options?: { isAuthenticated?: boolean },
): Promise<PostPageDisplayData | null> {
  const post =
    typeof postOrId === "string"
      ? await c.var.services.posts.getById(postOrId)
      : postOrId;
  const isAuthenticated = options?.isAuthenticated ?? false;

  if (!post || !canViewPost(post, isAuthenticated)) {
    return null;
  }

  const mediaCtx = createMediaContext(c.var.appConfig);
  const threadPosts = (
    await c.var.services.posts.getThread(post.threadId)
  ).filter((threadPost) => threadPost.status === "published");

  const allPostIds =
    threadPosts.length > 1 ? threadPosts.map((p) => p.id) : [post.id];
  const [rawMediaMap, collectionsMap] = await Promise.all([
    c.var.services.media.getByPostIds(allPostIds),
    c.var.services.collections.getCollectionsByPostIds(allPostIds),
  ]);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
    mediaCtx.localPublicUrl,
    mediaCtx.sitePathPrefix,
  );

  const postView = toPostView(
    { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
    mediaCtx,
    collectionsMap.get(post.id),
  );

  const threadPostViews =
    threadPosts.length > 1
      ? threadPosts.map((threadPost, index) =>
          toPostView(
            {
              ...threadPost,
              mediaAttachments: mediaMap.get(threadPost.id) ?? [],
            },
            mediaCtx,
            collectionsMap.get(threadPost.id),
            index === threadPosts.length - 1,
          ),
        )
      : undefined;

  return { postView, threadPostViews };
}
