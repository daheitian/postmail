/**
 * Compose Route
 *
 * Handles post creation from the public-site compose dialog.
 * On publish the client reloads the page to pick up the new post.
 * Drafts close the dialog and show a confirmation toast.
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { requireAuth } from "../middleware/auth.js";
import { CreatePostSchema } from "../lib/schemas.js";
import { ValidationError } from "../lib/errors.js";
import { sse, dsToast } from "../lib/sse.js";
import { getI18n } from "../i18n/index.js";

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

composeRoutes.post("/", async (c) => {
  const i18n = getI18n(c);
  const raw = await c.req.json();
  const wantsJson = c.req.header("accept")?.includes("application/json");

  const result = CreatePostSchema.safeParse(raw);
  if (!result.success) {
    const firstError =
      result.error.issues[0]?.message ??
      i18n._(
        msg({
          message:
            "Something doesn't look right. Check the form and try again.",
          comment: "@context: Fallback validation error for compose form",
        }),
      );
    if (wantsJson) {
      return c.json({ status: "error" as const, error: firstError }, 422);
    }
    return dsToast(firstError, "error");
  }

  const data = result.data;

  // Validate media IDs
  if (data.mediaIds) {
    try {
      await c.var.services.media.validateIds(data.mediaIds);
    } catch (e) {
      if (e instanceof ValidationError) {
        if (wantsJson) {
          return c.json({ status: "error" as const, error: e.message }, 422);
        }
        return dsToast(e.message, "error");
      }
      throw e;
    }
  }

  const post = await c.var.services.posts.create(
    {
      format: data.format,
      title: data.title || undefined,
      body: data.body || undefined,
      status: data.status ?? "published",
      visibility: data.visibility || undefined,
      featured: data.featured,
      url: data.url || undefined,
      quoteText: data.quoteText || undefined,
      rating: data.rating || undefined,
      collectionIds: data.collectionIds,
      replyToId: data.replyToId,
    },
    {
      maxParagraphs: c.var.appConfig.summaryMaxParagraphs,
      maxChars: c.var.appConfig.summaryMaxChars,
    },
  );

  // Attach media if provided
  if (data.mediaIds && data.mediaIds.length > 0) {
    await c.var.services.media.attachToPost(post.id, data.mediaIds);

    // Save alt text for each media item
    if (data.mediaAlts) {
      const altEntries = Object.entries(data.mediaAlts).filter(
        ([id, alt]) => alt && (data.mediaIds ?? []).includes(id),
      );
      await Promise.all(
        altEntries.map(([id, alt]) => c.var.services.media.updateAlt(id, alt)),
      );
    }
  }

  const isDraft = (data.status ?? "published") === "draft";

  // ── JSON response mode (used by Lit compose bridge) ──────────────
  if (wantsJson) {
    if (isDraft) {
      return c.json({
        status: "draft" as const,
        toast: i18n._(
          msg({
            message: "Draft saved.",
            comment: "@context: Toast after saving a draft post",
          }),
        ),
      });
    }

    return c.json({ status: "published" as const, permalink: `/${post.slug}` });
  }

  // ── SSE response mode (used by Datastar) ─────────────────────────
  if (isDraft) {
    return sse(c, async (stream) => {
      await stream.patchElements(CLOSE_DIALOG_SCRIPT, {
        mode: "append",
        selector: "body",
      });
      await stream.patchSignals(INITIAL_SIGNALS);
      await stream.toast(
        i18n._(
          msg({
            message: "Draft saved.",
            comment: "@context: Toast after saving a draft post",
          }),
        ),
      );
    });
  }

  return sse(c, async (stream) => {
    await stream.patchElements(CLOSE_DIALOG_SCRIPT, {
      mode: "append",
      selector: "body",
    });
    await stream.patchSignals(INITIAL_SIGNALS);
  });
});
