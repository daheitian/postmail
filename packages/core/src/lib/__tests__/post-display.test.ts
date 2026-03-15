import { describe, expect, it, beforeEach } from "vitest";
import type { Context } from "hono";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createCollectionService } from "../../services/collection.js";
import { createMediaService } from "../../services/media.js";
import { createPathService } from "../../services/path.js";
import { createPostService } from "../../services/post.js";
import {
  assemblePostCardView,
  assemblePostPageDisplay,
} from "../post-display.js";
import type { Database } from "../../db/index.js";
import type { AppConfig, Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

describe("post display assembly", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;
  let mediaService: ReturnType<typeof createMediaService>;
  let collectionService: ReturnType<typeof createCollectionService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    const pathService = createPathService(db);
    postService = createPostService(db, { slugIdLength: 5 }, pathService);
    mediaService = createMediaService(db);
    collectionService = createCollectionService(db, pathService);
  });

  function createContext(): Context<Env> {
    return {
      var: {
        services: {
          posts: postService,
          media: mediaService,
          collections: collectionService,
        },
        appConfig: {
          pageSize: 20,
        } as unknown as AppConfig,
      },
    } as unknown as Context<Env>;
  }

  it("assembles a single feed card with up-to-date last-in-thread state", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Root",
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Reply",
      replyToId: root.id,
    });

    const view = await assemblePostCardView(createContext(), root.id, {
      isAuthenticated: true,
    });

    expect(view?.id).toBe(root.id);
    expect(view?.isLastInThread).toBe(false);
    expect(view?.threadRootPermalink).toBe(view?.permalink);
  });

  it("assembles permalink thread data for partial post view refreshes", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Root",
    });
    const reply = await postService.create({
      format: "note",
      bodyMarkdown: "Reply",
      replyToId: root.id,
    });

    const display = await assemblePostPageDisplay(createContext(), root.id, {
      isAuthenticated: true,
    });

    expect(display?.postView.id).toBe(root.id);
    expect(display?.threadPostViews).toHaveLength(2);
    expect(display?.threadPostViews?.[1]?.id).toBe(reply.id);
  });
});
