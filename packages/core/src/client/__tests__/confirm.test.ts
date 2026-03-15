// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

function installDialogShim() {
  Object.defineProperty(HTMLDialogElement.prototype, "open", {
    configurable: true,
    get(this: HTMLDialogElement) {
      return this.hasAttribute("open");
    },
    set(this: HTMLDialogElement, value: boolean) {
      if (value) {
        this.setAttribute("open", "");
      } else {
        this.removeAttribute("open");
      }
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
}

describe("showConfirmDialog", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    installDialogShim();
  });

  it("renders a shared dialog and resolves true after confirmation", async () => {
    const { showConfirmDialog } = await import("../confirm.js");

    const resultPromise = showConfirmDialog({
      message: "Delete this post permanently? This can't be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    const host = document.querySelector<HTMLElement>("jant-confirm-dialog");
    expect(host).not.toBeNull();
    await (host as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;

    const title = host?.querySelector(".confirm-dialog-title");
    const confirmButton = host?.querySelector<HTMLButtonElement>(
      ".confirm-dialog-actions .btn-destructive",
    );
    const panel = host?.querySelector<HTMLElement>(".confirm-dialog-panel");

    expect(title?.textContent).toContain(
      "Delete this post permanently? This can't be undone.",
    );
    expect(document.activeElement).toBe(panel);

    confirmButton?.click();

    await expect(resultPromise).resolves.toBe(true);
  });

  it("resolves false when dismissed with Escape", async () => {
    const { showConfirmDialog } = await import("../confirm.js");

    const resultPromise = showConfirmDialog({
      title: "Discard changes?",
      message: "Your edits will be lost.",
      confirmLabel: "Discard",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    const host = document.querySelector<HTMLElement>("jant-confirm-dialog");
    await (host as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;

    const dialog = host?.querySelector<HTMLDialogElement>(".confirm-dialog");
    dialog?.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      }),
    );

    await expect(resultPromise).resolves.toBe(false);
  });
});
