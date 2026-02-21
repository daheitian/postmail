/**
 * Compose Route
 *
 * Handles post creation from the public-site compose dialog.
 * Published posts are prepended to the homepage timeline via SSE.
 * Drafts close the dialog and show a confirmation toast.
 */

import { Hono, type Context } from "hono";
import type { Bindings, Post } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { requireAuth } from "../middleware/auth.js";
import { CreatePostSchema, validateMediaCount } from "../lib/schemas.js";
import { sse, dsToast } from "../lib/sse.js";
import {
  toPostView,
  toPostViewFromPost,
  createMediaContext,
} from "../lib/view.js";
import { buildMediaMap } from "../lib/media-helpers.js";
import { TimelineItemFromPost } from "../ui/feed/TimelineItem.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const composeRoutes = new Hono<Env>();

// All compose routes require authentication
composeRoutes.use("*", requireAuth());

/** Reset compose form signals to initial values */
const INITIAL_SIGNALS = {
  format: "note",
  title: "",
  body: "",
  url: "",
  quoteText: "",
  status: "published",
  rating: 0,
  collectionIds: [],
  mediaIds: [],
  _composeLoading: false,
  _showRating: false,
  _showCollection: false,
};

/** Script fragment that closes the compose dialog and self-removes */
const CLOSE_DIALOG_SCRIPT =
  "<script data-effect=\"el.remove()\">document.getElementById('compose-dialog').close()</script>";

/** Build a timeline card HTML string for a newly created post */
async function buildTimelineCard(
  c: Context<Env>,
  post: Post,
  mediaIds: string[] | undefined,
): Promise<string> {
  const mediaCtx = createMediaContext(c);
  let postView;

  if (mediaIds && mediaIds.length > 0) {
    const rawMediaMap = await c.var.services.media.getByPostIds([post.id]);
    const mediaMap = buildMediaMap(
      rawMediaMap,
      mediaCtx.r2PublicUrl,
      mediaCtx.imageTransformUrl,
      mediaCtx.s3PublicUrl,
    );
    postView = toPostView(
      { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
      mediaCtx,
    );
  } else {
    postView = toPostViewFromPost(post, mediaCtx);
  }

  return (
    <div>
      <TimelineItemFromPost post={postView} />
      <hr class="feed-divider" />
    </div>
  ).toString();
}

composeRoutes.post("/", async (c) => {
  const raw = await c.req.json();
  const wantsJson = c.req.header("accept")?.includes("application/json");

  const result = CreatePostSchema.safeParse(raw);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? "Invalid input";
    if (wantsJson) {
      return c.json({ status: "error" as const, error: firstError }, 422);
    }
    return dsToast(firstError, "error");
  }

  const data = result.data;

  // Validate media count
  if (data.mediaIds) {
    const mediaError = validateMediaCount(data.mediaIds);
    if (mediaError) {
      return dsToast(mediaError, "error");
    }
  }

  const post = await c.var.services.posts.create({
    format: data.format,
    title: data.title || undefined,
    body: data.body || undefined,
    status: data.status ?? "published",
    url: data.url || undefined,
    quoteText: data.quoteText || undefined,
    rating: data.rating || undefined,
    collectionIds: data.collectionIds?.length ? data.collectionIds : undefined,
  });

  // Attach media if provided
  if (data.mediaIds && data.mediaIds.length > 0) {
    await c.var.services.media.attachToPost(post.id, data.mediaIds);
  }

  const isDraft = (data.status ?? "published") === "draft";

  // ── JSON response mode (used by Lit compose bridge) ──────────────
  if (wantsJson) {
    if (isDraft) {
      return c.json({ status: "draft" as const, toast: "Draft saved." });
    }

    const cardHtml = await buildTimelineCard(c, post, data.mediaIds);
    return c.json({ status: "published" as const, cardHtml });
  }

  // ── SSE response mode (used by Datastar) ─────────────────────────
  if (isDraft) {
    return sse(c, async (stream) => {
      await stream.patchElements(CLOSE_DIALOG_SCRIPT, {
        mode: "append",
        selector: "body",
      });
      await stream.patchSignals(INITIAL_SIGNALS);
      await stream.toast("Draft saved.");
    });
  }

  const cardHtml = await buildTimelineCard(c, post, data.mediaIds);

  return sse(c, async (stream) => {
    await stream.patchElements(cardHtml, {
      mode: "prepend",
      selector: "#timeline-items",
    });
    await stream.patchElements(CLOSE_DIALOG_SCRIPT, {
      mode: "append",
      selector: "body",
    });
    await stream.patchSignals(INITIAL_SIGNALS);
  });
});
