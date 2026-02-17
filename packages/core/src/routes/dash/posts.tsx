import { getSiteName } from "../../lib/config.js";
/**
 * Dashboard Posts Routes
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, Post, Media, Collection } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import {
  PostForm,
  PostList,
  CrudPageHeader,
  ActionButtons,
} from "../../ui/dash/index.js";
import * as sqid from "../../lib/sqid.js";
import { dsRedirect } from "../../lib/sse.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const postsRoutes = new Hono<Env>();

function PostsListContent({ posts }: { posts: Post[] }) {
  const { t } = useLingui();
  return (
    <>
      <CrudPageHeader
        title={t({ message: "Posts", comment: "@context: Dashboard heading" })}
        ctaLabel={t({
          message: "New Post",
          comment: "@context: Button to create new post",
        })}
        ctaHref="/dash/posts/new"
      />
      <PostList posts={posts} />
    </>
  );
}

function NewPostContent({ collections }: { collections: Collection[] }) {
  const { t } = useLingui();
  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">
        {t({ message: "New Post", comment: "@context: Page heading" })}
      </h1>
      <PostForm action="/dash/posts" collections={collections} />
    </>
  );
}

// List posts
postsRoutes.get("/", async (c) => {
  const posts = await c.var.services.posts.list({
    excludeReplies: true,
  });
  const siteName = await getSiteName(c);

  return c.html(
    <DashLayout
      c={c}
      title="Posts"
      siteName={siteName}
      currentPath="/dash/posts"
    >
      <PostsListContent posts={posts} />
    </DashLayout>,
  );
});

// New post form
postsRoutes.get("/new", async (c) => {
  const siteName = await getSiteName(c);
  const collections = await c.var.services.collections.list();

  return c.html(
    <DashLayout
      c={c}
      title="New Post"
      siteName={siteName}
      currentPath="/dash/posts"
    >
      <NewPostContent collections={collections} />
    </DashLayout>,
  );
});

// Create post
postsRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    format: string;
    title?: string;
    body: string;
    status: string;
    featured?: boolean;
    pinned?: boolean;
    url?: string;
    quoteText?: string;
    rating?: number;
    collectionId?: number;
    mediaIds?: string[];
  }>();

  const post = await c.var.services.posts.create({
    format: body.format as Post["format"],
    title: body.title || undefined,
    body: body.body,
    status: body.status as Post["status"],
    featured: body.featured,
    pinned: body.pinned,
    url: body.url || undefined,
    quoteText: body.quoteText || undefined,
    rating: body.rating || undefined,
    collectionId: body.collectionId || undefined,
  });

  // Attach media if provided
  if (body.mediaIds && body.mediaIds.length > 0) {
    await c.var.services.media.attachToPost(post.id, body.mediaIds);
  }

  return dsRedirect(`/dash/posts/${sqid.encode(post.id)}`);
});

function ViewPostContent({ post }: { post: Post }) {
  const { t } = useLingui();
  const defaultTitle = t({
    message: "Post",
    comment: "@context: Default post title",
  });
  const permalink = post.path ? `/${post.path}` : `/p/${sqid.encode(post.id)}`;

  return (
    <>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold">{post.title || defaultTitle}</h1>
        <ActionButtons
          editHref={`/dash/posts/${sqid.encode(post.id)}/edit`}
          editLabel={t({
            message: "Edit",
            comment: "@context: Button to edit post",
          })}
          viewHref={permalink}
          viewLabel={t({
            message: "View",
            comment: "@context: Button to view post",
          })}
        />
      </div>

      <div class="card">
        <section>
          <div
            class="prose"
            dangerouslySetInnerHTML={{ __html: post.bodyHtml || "" }}
          />
        </section>
      </div>
    </>
  );
}

function EditPostContent({
  post,
  mediaAttachments,
  r2PublicUrl,
  imageTransformUrl,
  s3PublicUrl,
  collections,
}: {
  post: Post;
  mediaAttachments: Media[];
  r2PublicUrl?: string;
  imageTransformUrl?: string;
  s3PublicUrl?: string;
  collections: Collection[];
}) {
  const { t } = useLingui();
  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">
        {t({ message: "Edit Post", comment: "@context: Page heading" })}
      </h1>
      <PostForm
        post={post}
        action={`/dash/posts/${sqid.encode(post.id)}`}
        mediaAttachments={mediaAttachments}
        r2PublicUrl={r2PublicUrl}
        imageTransformUrl={imageTransformUrl}
        s3PublicUrl={s3PublicUrl}
        collections={collections}
      />
    </>
  );
}

// View single post
postsRoutes.get("/:id", async (c) => {
  const id = sqid.decode(c.req.param("id"));
  if (!id) return c.notFound();

  const post = await c.var.services.posts.getById(id);
  if (!post) return c.notFound();

  const siteName = await getSiteName(c);
  const pageTitle = post.title || "Post";

  return c.html(
    <DashLayout
      c={c}
      title={pageTitle}
      siteName={siteName}
      currentPath="/dash/posts"
    >
      <ViewPostContent post={post} />
    </DashLayout>,
  );
});

// Edit post form
postsRoutes.get("/:id/edit", async (c) => {
  const id = sqid.decode(c.req.param("id"));
  if (!id) return c.notFound();

  const post = await c.var.services.posts.getById(id);
  if (!post) return c.notFound();

  const siteName = await getSiteName(c);
  const mediaAttachments = await c.var.services.media.getByPostId(post.id);
  const r2PublicUrl = c.env.R2_PUBLIC_URL;
  const imageTransformUrl = c.env.IMAGE_TRANSFORM_URL;
  const s3PublicUrl = c.env.S3_PUBLIC_URL;
  const collections = await c.var.services.collections.list();

  return c.html(
    <DashLayout
      c={c}
      title={`Edit: ${post.title || "Post"}`}
      siteName={siteName}
      currentPath="/dash/posts"
    >
      <EditPostContent
        post={post}
        mediaAttachments={mediaAttachments}
        r2PublicUrl={r2PublicUrl}
        imageTransformUrl={imageTransformUrl}
        s3PublicUrl={s3PublicUrl}
        collections={collections}
      />
    </DashLayout>,
  );
});

// Update post
postsRoutes.post("/:id", async (c) => {
  const id = sqid.decode(c.req.param("id"));
  if (!id) return c.notFound();

  const body = await c.req.json<{
    format: string;
    title?: string;
    body?: string;
    status: string;
    featured?: boolean;
    pinned?: boolean;
    url?: string;
    quoteText?: string;
    rating?: number;
    collectionId?: number;
    mediaIds?: string[];
  }>();

  await c.var.services.posts.update(id, {
    format: body.format as Post["format"],
    title: body.title || null,
    body: body.body || null,
    status: body.status as Post["status"],
    featured: body.featured,
    pinned: body.pinned,
    url: body.url || null,
    quoteText: body.quoteText || null,
    rating: body.rating || null,
    collectionId: body.collectionId || null,
  });

  // Update media attachments if provided
  if (body.mediaIds !== undefined) {
    await c.var.services.media.attachToPost(id, body.mediaIds);
  }

  return dsRedirect(`/dash/posts/${sqid.encode(id)}`);
});

// Delete post
postsRoutes.post("/:id/delete", async (c) => {
  const id = sqid.decode(c.req.param("id"));
  if (!id) return c.notFound();

  await c.var.services.media.detachFromPost(id);
  await c.var.services.posts.delete(id);

  return dsRedirect("/dash/posts");
});
