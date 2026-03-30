// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import "../compose-bridge.js";
import { QUEUED_TOAST_STORAGE_KEY } from "../toast.js";

type ComposeHarness = HTMLElement & {
  refreshCollections: () => Promise<boolean>;
  pageMode?: boolean;
  preparePageLeave?: () => void;
  labels?: {
    uploadFailedDraft?: string;
    publishFailedDraft?: string;
    published?: string;
    view?: string;
  };
};

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("compose bridge", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    globalThis.sessionStorage.clear();
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
          attachments: [],
          pendingAttachments: [],
        },
      }),
    );

    await flushAsyncWork();
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalled();
    expect(refreshCollections).toHaveBeenCalledTimes(1);
  });

  it("queues a success toast before navigating away after page-mode publish", async () => {
    const composeEl = document.createElement(
      "jant-compose-dialog",
    ) as ComposeHarness;
    composeEl.refreshCollections = vi.fn(async () => true);
    composeEl.pageMode = true;
    composeEl.preparePageLeave = vi.fn();
    composeEl.labels = {
      published: "Published!",
      view: "View",
    };
    document.body.appendChild(composeEl);

    const assignSpy = vi
      .spyOn(globalThis.location, "assign")
      .mockImplementation(() => {});

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const raw =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(raw, "http://localhost");

      if (url.pathname === "/compose") {
        return new Response(
          JSON.stringify({
            status: "published",
            permalink: "/published-post",
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
          body: "Published body",
          url: "",
          quoteText: "",
          quoteAuthor: "",
          slug: "",
          status: "published",
          visibility: "public",
          rating: 0,
          collectionIds: [],
          attachments: [],
          pendingAttachments: [],
        },
      }),
    );

    await flushAsyncWork();
    await flushAsyncWork();

    expect(composeEl.preparePageLeave).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledWith("/published-post");
    expect(globalThis.sessionStorage.getItem(QUEUED_TOAST_STORAGE_KEY)).toBe(
      '{"message":"Published!","type":"success"}',
    );
  });

  it("submits inline text attachments through the attachments API shape", async () => {
    const composeEl = document.createElement(
      "jant-compose-dialog",
    ) as ComposeHarness;
    composeEl.refreshCollections = vi.fn(async () => true);
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
          expect(JSON.parse(String(init?.body))).toMatchObject({
            attachments: [
              {
                type: "text",
                contentFormat: "markdown",
                content: "Attached body",
                summary: "Attached body",
              },
            ],
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
          attachments: [
            {
              type: "text",
              clientId: "t1",
              bodyJson: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Attached body" }],
                  },
                ],
              },
              summary: "Attached body",
            },
          ],
          pendingAttachments: [],
        },
      }),
    );

    await flushAsyncWork();
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalled();
  });

  it("sends publishedAt on publish and omits it when retrying as draft", async () => {
    const composeEl = document.createElement(
      "jant-compose-dialog",
    ) as ComposeHarness;
    composeEl.refreshCollections = vi.fn(async () => true);
    composeEl.pageMode = false;
    document.body.appendChild(composeEl);

    let requestCount = 0;
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
          requestCount += 1;
          const body = JSON.parse(String(init?.body)) as {
            status: string;
            publishedAt?: number;
          };

          if (requestCount === 1) {
            expect(body).toMatchObject({
              status: "published",
              publishedAt: 1705311000,
            });
            return new Response(JSON.stringify({ error: "Publish failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          expect(body.status).toBe("draft");
          expect(body.publishedAt).toBeUndefined();
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
          body: "Backdated publish",
          url: "",
          quoteText: "",
          quoteAuthor: "",
          slug: "",
          status: "published",
          publishedAt: 1705311000,
          visibility: "public",
          rating: 0,
          collectionIds: [],
          attachments: [],
          pendingAttachments: [],
        },
      }),
    );

    await flushAsyncWork();
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("sends nulls for cleared quote attribution fields when editing", async () => {
    const composeEl = document.createElement(
      "jant-compose-dialog",
    ) as ComposeHarness;
    composeEl.refreshCollections = vi.fn(async () => true);
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

        if (url.pathname === "/api/posts/pst_123") {
          expect(init?.method).toBe("PUT");

          const body = JSON.parse(String(init?.body)) as {
            format: string;
            body: null;
            sourceName: null;
            sourceUrl: null;
            quoteText: string;
            rating: null;
          };

          expect(body).toMatchObject({
            format: "quote",
            body: null,
            sourceName: null,
            sourceUrl: null,
            quoteText: "The obstacle is the way.",
            rating: null,
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
          format: "quote",
          title: "",
          body: "",
          url: "",
          quoteText: "The obstacle is the way.",
          quoteAuthor: "",
          slug: "",
          status: "draft",
          visibility: "public",
          rating: 0,
          collectionIds: [],
          attachments: [],
          pendingAttachments: [],
          editPostId: "pst_123",
        },
      }),
    );

    await flushAsyncWork();
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
