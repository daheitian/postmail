import { describe, it, expect } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { attachmentsApiRoutes } from "../attachments.js";

function createMockStorage() {
  const files = new Map<string, { body: Uint8Array; contentType?: string }>();

  return {
    files,
    async put(
      key: string,
      body: Uint8Array | ReadableStream,
      opts?: { contentType?: string },
    ) {
      const bytes =
        body instanceof Uint8Array
          ? body
          : new Uint8Array(await new Response(body).arrayBuffer());
      files.set(key, { body: bytes, contentType: opts?.contentType });
    },
    async get(key: string) {
      const file = files.get(key);
      if (!file) return null;
      return {
        body: new Response(file.body).body as ReadableStream,
        contentType: file.contentType,
      };
    },
    async delete(key: string) {
      files.delete(key);
    },
  };
}

describe("Attachments API Routes", () => {
  it("returns 401 when not authenticated", async () => {
    const storage = createMockStorage();
    const { app } = createTestApp({ authenticated: false, storage });
    app.route("/api/attachments", attachmentsApiRoutes);

    const res = await app.request(
      "/api/attachments/00000000-0000-0000-0000-000000000001/content",
    );
    expect(res.status).toBe(401);
  });

  it("returns markdown content for text attachments", async () => {
    const storage = createMockStorage();
    const { app, services } = createTestApp({ authenticated: true, storage });
    app.route("/api/attachments", attachmentsApiRoutes);

    const attachment = await services.media.createTextAttachment(
      {
        contentFormat: "markdown",
        content: "# Heading\n\nBody text",
      },
      {
        storage,
        storageDriver: "local",
        maxFileSizeMB: 1,
      },
    );

    const res = await app.request(`/api/attachments/${attachment.id}/content`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      id: attachment.id,
      type: "text",
      contentFormat: "markdown",
      content: "# Heading\n\nBody text",
      summary: "Heading Body text",
      chars: 17,
    });
  });

  it("returns 404 for non-text attachments", async () => {
    const storage = createMockStorage();
    const { app, services } = createTestApp({ authenticated: true, storage });
    app.route("/api/attachments", attachmentsApiRoutes);

    const media = await services.media.create({
      filename: "photo.jpg",
      originalName: "photo.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      storageKey: "media/photo.jpg",
    });

    const res = await app.request(`/api/attachments/${media.id}/content`);
    expect(res.status).toBe(404);
  });
});
