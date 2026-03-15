import { Hono, type Context } from "hono";
import { I18nProvider } from "../../i18n/index.js";
import { parseIdParam } from "../../lib/errors.js";
import {
  assemblePostCardView,
  assemblePostPageDisplay,
} from "../../lib/post-display.js";
import { assembleTimelineItem } from "../../lib/timeline.js";
import { TimelineFeedItemContent } from "../../ui/feed/TimelineFeed.js";
import { TimelineItemFromPost } from "../../ui/feed/TimelineItem.js";
import { PostPage } from "../../ui/pages/PostPage.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const partialPageRoutes = new Hono<Env>();

async function getIsAuthenticated(c: Context<Env>): Promise<boolean> {
  try {
    const session = await c.var.auth.api.getSession({
      headers: c.req.raw.headers,
    });
    return !!session?.user;
  } catch {
    return false;
  }
}

partialPageRoutes.get("/_/timeline-item/:threadRootId", async (c) => {
  const threadRootId = parseIdParam(c.req.param("threadRootId"));
  const item = await assembleTimelineItem(c, threadRootId, {
    isAuthenticated: await getIsAuthenticated(c),
  });

  if (!item) {
    return c.notFound();
  }

  return c.html(
    <I18nProvider c={c}>
      <TimelineFeedItemContent item={item} />
    </I18nProvider>,
  );
});

partialPageRoutes.get("/_/post-card/:postId", async (c) => {
  const postId = parseIdParam(c.req.param("postId"));
  const postView = await assemblePostCardView(c, postId, {
    isAuthenticated: await getIsAuthenticated(c),
  });

  if (!postView) {
    return c.notFound();
  }

  return c.html(
    <I18nProvider c={c}>
      <TimelineItemFromPost post={postView} />
    </I18nProvider>,
  );
});

partialPageRoutes.get("/_/post-view/:postId", async (c) => {
  const postId = parseIdParam(c.req.param("postId"));
  const display = await assemblePostPageDisplay(c, postId, {
    isAuthenticated: await getIsAuthenticated(c),
  });

  if (!display) {
    return c.notFound();
  }

  return c.html(
    <I18nProvider c={c}>
      <PostPage post={display.postView} threadPosts={display.threadPostViews} />
    </I18nProvider>,
  );
});
