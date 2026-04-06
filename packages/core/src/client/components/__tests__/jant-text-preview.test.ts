// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import "../jant-text-preview.js";
import type { JantTextPreview } from "../jant-text-preview.js";

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

async function flush(el?: JantTextPreview) {
  await Promise.resolve();
  await Promise.resolve();
  if (el) {
    await el.updateComplete;
  }
}

async function createElement(): Promise<JantTextPreview> {
  const el = document.createElement("jant-text-preview") as JantTextPreview;
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function createTrigger() {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.dataset.textPreviewId = "med_123";
  document.body.appendChild(trigger);
  return trigger;
}

describe("JantTextPreview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    installDialogShim();
  });

  it("focuses the preview content instead of the close button when opened", async () => {
    const el = await createElement();
    let resolveFetch!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const trigger = createTrigger();

    trigger.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );
    await flush(el);

    const content = el.querySelector<HTMLElement>(".text-preview-content");
    const closeButton = el.querySelector<HTMLButtonElement>(
      ".text-preview-toolbar .text-preview-btn",
    );

    expect(content).not.toBeNull();
    expect(document.activeElement).toBe(content);
    expect(document.activeElement).not.toBe(closeButton);

    resolveFetch(
      new Response(JSON.stringify({ html: "<p>Hello</p>" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await flush(el);
  });

  it("returns focus to the trigger after closing", async () => {
    const el = await createElement();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ html: "<p>Hello</p>" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const trigger = createTrigger();
    trigger.focus();

    trigger.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );
    await flush(el);

    el.querySelector<HTMLButtonElement>(
      ".text-preview-toolbar .text-preview-btn",
    )?.click();
    await flush(el);

    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("escapes plain-text fallback content before rendering", async () => {
    const el = await createElement();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Fish & <chips>", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const trigger = createTrigger();

    trigger.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );
    await flush(el);
    await flush(el);

    const pre = el.querySelector(".text-preview-body pre");
    expect(pre?.innerHTML).toBe("Fish &amp; &lt;chips&gt;");
  });
});
