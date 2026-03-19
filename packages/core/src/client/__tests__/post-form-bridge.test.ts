// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import "../post-form-bridge.js";
import { QUEUED_TOAST_STORAGE_KEY } from "../toast.js";

type PostFormHarness = HTMLElement & {
  loading: boolean;
  clearDirty: () => void;
};

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("post form bridge", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toast-container"></div>';
    vi.restoreAllMocks();
    globalThis.sessionStorage.clear();
  });

  it("queues a success toast before redirecting after publish", async () => {
    const formEl = document.createElement("jant-post-form") as PostFormHarness;
    formEl.loading = false;
    formEl.clearDirty = vi.fn();
    document.body.appendChild(formEl);

    const locationSpy = vi.spyOn(window.location, "href", "set");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "redirect",
          url: "http://example.com/published-post",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    formEl.dispatchEvent(
      new CustomEvent("jant:post-submit", {
        bubbles: true,
        detail: {
          endpoint: "/api/posts/post-1",
          isEdit: false,
          data: {
            format: "note",
            title: "",
            body: "Published body",
            status: "published",
            visibility: "public",
            pinned: false,
            url: "",
            quoteText: "",
            rating: 0,
            collectionIds: [],
            mediaIds: [],
          },
          messages: {
            success: "Published!",
            error: "Could not publish.",
          },
        },
      }),
    );

    await flushAsyncWork();
    await flushAsyncWork();

    expect(formEl.clearDirty).toHaveBeenCalledTimes(1);
    expect(locationSpy).toHaveBeenCalledWith(
      "http://example.com/published-post",
    );
    expect(globalThis.sessionStorage.getItem(QUEUED_TOAST_STORAGE_KEY)).toBe(
      '{"message":"Published!","type":"success"}',
    );
  });
});
