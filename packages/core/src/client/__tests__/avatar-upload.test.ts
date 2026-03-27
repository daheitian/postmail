// @vitest-environment happy-dom

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../toast.js", () => ({
  showToast: vi.fn(),
}));

vi.mock("../../lib/favicon.js", () => ({
  encodeIco: vi.fn(() => new Blob(["ico"], { type: "image/x-icon" })),
  FAVICON_SIZES: {
    APPLE_TOUCH: 180,
  },
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalImage = globalThis.Image;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function installImageAndCanvasMocks() {
  URL.createObjectURL = vi.fn(() => "blob:avatar-preview");
  URL.revokeObjectURL = vi.fn();

  class MockImage {
    width = 1024;
    height = 1024;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    private _src = "";

    set src(value: string) {
      this._src = value;
      queueMicrotask(() => {
        this.onload?.();
      });
    }

    get src() {
      return this._src;
    }
  }

  globalThis.Image = MockImage as unknown as typeof Image;
  const canvasContext = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "high",
    drawImage: vi.fn(),
  };
  const toBlobMock: typeof HTMLCanvasElement.prototype.toBlob = (callback) => {
    callback?.(new Blob(["png"], { type: "image/png" }));
  };

  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => canvasContext,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = vi.fn(
    toBlobMock,
  ) as typeof HTMLCanvasElement.prototype.toBlob;
}

function createMarkup() {
  document.documentElement.dataset.sitePathPrefix = "/base";
  document.body.innerHTML = `
    <div id="toast-container" popover="manual"></div>
    <form>
      <label>
        Upload avatar
        <input
          type="file"
          data-avatar-upload
          data-text-processing="Processing..."
          data-text-uploading="Uploading..."
          data-text-error="Upload failed. Please try again."
        />
      </label>
    </form>
  `;
}

async function dispatchAvatarChange(fileName = "avatar.png") {
  const input = document.querySelector<HTMLInputElement>(
    "[data-avatar-upload]",
  );
  if (!input) {
    throw new Error("Missing avatar upload input.");
  }

  const file = new File([new Uint8Array([1, 2, 3])], fileName, {
    type: "image/png",
  });
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });

  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flushMicrotasks();
  await flushMicrotasks();
  await flushMicrotasks();
}

describe("avatar-upload", () => {
  beforeAll(async () => {
    await import("../avatar-upload.js");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    createMarkup();
    installImageAndCanvasMocks();
    window.location.href = "http://localhost/base/settings/avatar";
  });

  it("posts avatar uploads to the prefixed settings path and follows JSON redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "redirect",
          url: "/base/settings/avatar?saved",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await dispatchAvatarChange();

    expect(fetchMock).toHaveBeenCalledWith("/base/settings/avatar", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: expect.any(FormData),
    });
    expect(window.location.pathname).toBe("/base/settings/avatar");
    expect(window.location.search).toBe("?saved");
  });

  it("shows the server error toast when the upload endpoint returns JSON validation errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "File too large. Try a smaller image.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { showToast } = await import("../toast.js");
    await dispatchAvatarChange("too-large.png");

    expect(showToast).toHaveBeenCalledWith(
      "File too large. Try a smaller image.",
      "error",
    );
  });
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  globalThis.Image = originalImage;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toBlob = originalToBlob;
});
