// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import "../compose-bridge.js";

type ComposeHarness = HTMLElement & {
  refreshCollections: () => Promise<boolean>;
  pageMode?: boolean;
  labels?: { uploadFailedDraft?: string; publishFailedDraft?: string };
};

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("compose bridge", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("keeps empty collectionIds in the request and refreshes compose collections after draft save", async () => {
    const composeEl = document.createElement(
      "jant-compose-dialog",
    ) as ComposeHarness;
    const refreshCollections = vi.fn(async () => true);
    composeEl.refreshCollections = refreshCollections;
    composeEl.pageMode = false;
    document.body.appendChild(composeEl);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const raw =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const url = new URL(raw, "http://localhost");

        if (url.pathname === "/compose") {
          expect(init?.method).toBe("POST");
          expect(JSON.parse(String(init?.body))).toMatchObject({
            collectionIds: [],
            status: "draft",
          });

          return new Response(
            JSON.stringify({
              status: "draft",
              toast: "Draft saved.",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        throw new Error(`Unexpected fetch: ${url.pathname}`);
      });

    composeEl.dispatchEvent(
      new CustomEvent("jant:compose-submit-deferred", {
        bubbles: true,
        detail: {
          format: "note",
          title: "",
          body: "Draft body",
          url: "",
          quoteText: "",
          quoteAuthor: "",
          slug: "",
          status: "draft",
          visibility: "public",
          rating: 0,
          collectionIds: [],
          mediaIds: [],
          mediaAlts: {},
          attachedTexts: [],
          attachmentOrder: [],
          mediaClientMap: {},
          pendingAttachments: [],
        },
      }),
    );

    await flushAsyncWork();
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalled();
    expect(refreshCollections).toHaveBeenCalledTimes(1);
  });
});
