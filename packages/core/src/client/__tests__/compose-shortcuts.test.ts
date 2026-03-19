// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import "../compose-shortcuts.js";

type ComposeHarness = HTMLElement & {
  openNew: (options?: unknown) => Promise<void>;
  openReply: (...args: unknown[]) => Promise<void>;
};

function dispatchShortcut(
  target: globalThis.Document | globalThis.Element,
  key: string,
): globalThis.KeyboardEvent {
  const event = new globalThis.KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function createComposeHarness(): ComposeHarness {
  const composeEl = document.createElement(
    "jant-compose-dialog",
  ) as ComposeHarness;
  composeEl.openNew = vi.fn(async () => {});
  composeEl.openReply = vi.fn(async () => {});
  document.body.appendChild(composeEl);
  return composeEl;
}

describe("compose shortcuts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("opens a collection-scoped composer on collection pages with n", () => {
    const composeEl = createComposeHarness();

    const collectionPage = document.createElement("div");
    collectionPage.dataset.page = "collection";
    collectionPage.dataset.collectionId = "col-2";
    document.body.appendChild(collectionPage);

    const event = dispatchShortcut(document, "n");

    expect(event.defaultPrevented).toBe(true);
    expect(composeEl.openNew).toHaveBeenCalledWith({ collectionId: "col-2" });
  });

  it("ignores n while focus is inside an input", () => {
    const composeEl = createComposeHarness();

    const input = document.createElement("textarea");
    document.body.appendChild(input);

    dispatchShortcut(input, "n");

    expect(composeEl.openNew).not.toHaveBeenCalled();
  });

  it("opens a reply composer for the current post on detail pages with r", () => {
    const composeEl = createComposeHarness();

    const postView = document.createElement("div");
    postView.dataset.postView = "";
    postView.dataset.postViewId = "post-current";

    const current = document.createElement("div");
    current.dataset.postCurrent = "";

    const article = document.createElement("article");
    article.dataset.post = "";
    article.dataset.postId = "post-current";
    article.dataset.threadRootId = "thread-root";
    article.innerHTML = `
      <div data-post-meta>meta</div>
      <div class="post-status-badges">badges</div>
      <time class="dt-published">Mar 19</time>
      <div data-post-body>Reply body</div>
    `;

    current.appendChild(article);
    postView.appendChild(current);
    document.body.appendChild(postView);

    const event = dispatchShortcut(document, "r");

    expect(event.defaultPrevented).toBe(true);
    expect(composeEl.openReply).toHaveBeenCalledTimes(1);

    const [postId, replyData, threadRootId, refreshTarget] = vi.mocked(
      composeEl.openReply,
    ).mock.calls[0] ?? [null, null, null, null];

    expect(postId).toBe("post-current");
    expect(threadRootId).toBe("thread-root");
    expect(refreshTarget).toEqual({ kind: "post-view", id: "post-current" });
    expect(replyData).toMatchObject({ dateText: "Mar 19" });
    expect((replyData as { contentHtml: string }).contentHtml).toContain(
      "Reply body",
    );
    expect((replyData as { contentHtml: string }).contentHtml).not.toContain(
      "meta",
    );
    expect((replyData as { contentHtml: string }).contentHtml).not.toContain(
      "badges",
    );
  });
});
