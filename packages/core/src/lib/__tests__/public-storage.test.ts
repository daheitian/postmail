import { describe, expect, it } from "vitest";
import { isPublicStorageKeyAllowed } from "../public-storage.js";

const SITE_ID = "sit_test00000000000000000000000";
const OTHER_SITE_ID = "sit_other000000000000000000000";

describe("isPublicStorageKeyAllowed", () => {
  it("allows current-site file keys in the new media namespace", () => {
    expect(
      isPublicStorageKeyAllowed(
        `media/${SITE_ID}/files/2026/03/example.webp`,
        SITE_ID,
      ),
    ).toBe(true);
  });

  it("allows current-site poster and asset keys in the new media namespace", () => {
    expect(
      isPublicStorageKeyAllowed(
        `media/${SITE_ID}/posters/example.webp`,
        SITE_ID,
      ),
    ).toBe(true);
    expect(
      isPublicStorageKeyAllowed(
        `media/${SITE_ID}/assets/avatar/example.webp`,
        SITE_ID,
      ),
    ).toBe(true);
  });

  it("rejects new media keys for a different site", () => {
    expect(
      isPublicStorageKeyAllowed(
        `media/${OTHER_SITE_ID}/files/2026/03/example.webp`,
        SITE_ID,
      ),
    ).toBe(false);
  });

  it("allows legacy unscoped media keys", () => {
    expect(isPublicStorageKeyAllowed("media/example.webp", SITE_ID)).toBe(true);
    expect(
      isPublicStorageKeyAllowed("media/2026/03/example.webp", SITE_ID),
    ).toBe(true);
  });

  it("allows legacy site-scoped keys for the current site only", () => {
    expect(
      isPublicStorageKeyAllowed(
        `sites/${SITE_ID}/media/2026/03/example.webp`,
        SITE_ID,
      ),
    ).toBe(true);
    expect(
      isPublicStorageKeyAllowed(
        `sites/${SITE_ID}/site-assets/avatar/example.webp`,
        SITE_ID,
      ),
    ).toBe(true);
    expect(
      isPublicStorageKeyAllowed(
        `sites/${OTHER_SITE_ID}/media/2026/03/example.webp`,
        SITE_ID,
      ),
    ).toBe(false);
  });

  it("rejects unsafe traversal-like keys", () => {
    expect(isPublicStorageKeyAllowed("../secret.txt", SITE_ID)).toBe(false);
    expect(isPublicStorageKeyAllowed("/media/example.webp", SITE_ID)).toBe(
      false,
    );
    expect(isPublicStorageKeyAllowed("media/../secret.txt", SITE_ID)).toBe(
      false,
    );
  });
});
