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
import type { Post } from "../../types.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

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

  const resolved = await c.var.services.paths.resolve(fullPath);
  if (!resolved) return c.notFound();

  if (resolved.kind === "redirect" && resolved.redirectToPath) {
    return c.redirect(
      `/${resolved.redirectToPath}`,
      resolved.redirectType ?? 301,
    );
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
        return c.redirect(`/${alias.path}`, 301);
      }
    }

    return renderPost(c, post);
  }

  if (resolved.collectionId) {
    const collection = await c.var.services.collections.getById(
      resolved.collectionId,
    );
    if (!collection) return c.notFound();

    if (resolved.kind === "alias") {
      return c.redirect(`/c/${collection.slug}`, 301);
    }
  }

  return c.notFound();
});
