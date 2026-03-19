// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import {
  QUEUED_TOAST_STORAGE_KEY,
  consumeQueuedToast,
  queueToastForNextPage,
} from "../toast.js";

describe("toast", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toast-container"></div>';
    globalThis.sessionStorage.clear();
  });

  it("queues and consumes a toast on the next page load", () => {
    queueToastForNextPage("Published!");

    expect(globalThis.sessionStorage.getItem(QUEUED_TOAST_STORAGE_KEY)).toBe(
      '{"message":"Published!","type":"success"}',
    );

    expect(consumeQueuedToast()).toBe(true);
    expect(globalThis.sessionStorage.getItem(QUEUED_TOAST_STORAGE_KEY)).toBe(
      null,
    );
    expect(
      document.querySelector("#toast-container .toast span")?.textContent,
    ).toBe("Published!");
  });

  it("restores queued action toasts", () => {
    queueToastForNextPage("Published!", "success", {
      label: "View",
      href: "/published-post",
    });

    expect(consumeQueuedToast()).toBe(true);

    const action = document.querySelector<HTMLAnchorElement>(
      "#toast-container .toast .toast-action",
    );
    expect(action?.textContent).toBe("View");
    expect(action?.getAttribute("href")).toBe("/published-post");
  });
});
