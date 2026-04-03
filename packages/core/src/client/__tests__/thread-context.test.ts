// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __testOnly } from "../thread-context.js";

function renderThreadDetail(currentIndex: number): HTMLElement {
  document.body.innerHTML = `
    <div class="thread-group thread-group-detail" data-page="post">
      <div class="thread-item thread-detail-item">
        <article data-post>Root</article>
      </div>
      <div class="thread-item thread-detail-item" ${
        currentIndex === 1 ? "data-post-current" : ""
      }>
        <article data-post>Reply one</article>
      </div>
      <div class="thread-item thread-detail-item" ${
        currentIndex === 2 ? "data-post-current" : ""
      }>
        <article data-post>Reply two</article>
      </div>
    </div>
  `;

  if (currentIndex === 0) {
    const firstItem = document.querySelector<HTMLElement>(
      ".thread-detail-item",
    );
    firstItem?.setAttribute("data-post-current", "");
  }

  const current = document.querySelector<HTMLElement>("[data-post-current]");
  if (!current) {
    throw new Error("Expected current thread detail item");
  }

  return current;
}

describe("thread context", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    globalThis.history.replaceState(null, "", "/");
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: (time: number) => void): number => {
        callback(0);
        return 1;
      },
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    globalThis.history.replaceState(null, "", "/");
  });

  it("does not auto-scroll when the current post is the first thread item", () => {
    const current = renderThreadDetail(0);

    __testOnly.scrollCurrentDetailPostIntoView(document);

    expect(__testOnly.isFirstThreadDetailItem(current)).toBe(true);
    expect(current.scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls non-root thread detail posts to the top of the viewport", () => {
    const current = renderThreadDetail(2);

    __testOnly.scrollCurrentDetailPostIntoView(document);

    expect(__testOnly.isFirstThreadDetailItem(current)).toBe(false);
    expect(current.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("resets #continue hash navigation to the current reply start", () => {
    const current = renderThreadDetail(2);
    globalThis.history.replaceState(null, "", "/thread#continue");

    __testOnly.scrollCurrentDetailPostIntoView(document);

    expect(current.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
  });

  it("resets #continue hash navigation to the top when the current post is first", () => {
    const current = renderThreadDetail(0);
    globalThis.history.replaceState(null, "", "/thread#continue");

    __testOnly.scrollCurrentDetailPostIntoView(document);

    expect(current.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
  });

  it("does not override other explicit hash navigation", () => {
    const current = renderThreadDetail(2);
    globalThis.history.replaceState(null, "", "/thread#footnote-1");

    __testOnly.scrollCurrentDetailPostIntoView(document);

    expect(current.scrollIntoView).not.toHaveBeenCalled();
  });
});
