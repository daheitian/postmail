/**
 * Archive Page Route
 *
 * Shows all posts, optionally filtered by format or visibility
 */

import { Hono } from "hono";
import type { Bindings, Format, Visibility } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { FORMATS, VISIBILITIES } from "../../types.js";
import { ArchivePage } from "../../ui/pages/ArchivePage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toArchiveGroups } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const PAGE_SIZE = 50;

export const archiveRoutes = new Hono<Env>();

// Archive page - all posts
archiveRoutes.get("/", async (c) => {
  const formatParam = c.req.query("format") as Format | undefined;
  const format =
    formatParam && FORMATS.includes(formatParam) ? formatParam : undefined;
  const visibilityParam = c.req.query("visibility") as Visibility | undefined;
  const visibility =
    visibilityParam &&
    (VISIBILITIES as readonly string[]).includes(visibilityParam)
      ? visibilityParam
      : undefined;

  // Parse cursor
  const cursorParam = c.req.query("cursor");
  const cursor = cursorParam ? parseInt(cursorParam, 10) : undefined;

  const navData = await getNavigationData(c);

  // Fetch one extra to check for more
  const posts = await c.var.services.posts.list({
    format,
    status: "published",
    visibility,
    excludeReplies: true,
    cursor,
    limit: PAGE_SIZE + 1,
  });

  const hasMore = posts.length > PAGE_SIZE;
  const displayPosts = hasMore ? posts.slice(0, PAGE_SIZE) : posts;

  // Get next cursor
  const nextCursor =
    hasMore && displayPosts.length > 0
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Length check above guarantees element exists
        displayPosts[displayPosts.length - 1]!.id
      : undefined;

  // Group posts by year-month
  const grouped = new Map<string, typeof displayPosts>();
  for (const post of displayPosts) {
    const date = new Date(post.publishedAt * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Map.set() above guarantees key exists
    grouped.get(key)!.push(post);
  }

  // Transform to View Models
  const mediaCtx = createMediaContext(c.var.appConfig);
  const groups = toArchiveGroups(grouped, mediaCtx);

  return renderPublicPage(c, {
    title: `Archive - ${navData.siteName}`,
    navData,
    content: (
      <ArchivePage
        groups={groups}
        hasMore={hasMore}
        nextCursor={nextCursor}
        format={format}
        visibility={visibility}
      />
    ),
  });
});
