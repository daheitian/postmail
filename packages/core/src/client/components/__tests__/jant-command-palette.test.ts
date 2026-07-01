// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPathCommandSearchQuery,
  getPathCommandTarget,
} from "../jant-command-palette.js";
import type { JantCommandPalette } from "../jant-command-palette.js";

function mockPaletteApi() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ items: [] }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function renderPalette(query: string) {
  mockPaletteApi();
  const el = document.createElement(
    "jant-command-palette",
  ) as JantCommandPalette;
  el._open = true;
  el._query = query;
  document.body.appendChild(el);
  await Promise.resolve();
  await el.updateComplete;
  return el;
}

function resultTitles(root: globalThis.Element): string[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(".command-palette-result-title"),
  ).map((item) => item.textContent?.trim() ?? "");
}

describe("JantCommandPalette slash path mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    globalThis.localStorage.clear();
  });

  it("shows go-to-path first and search second for slash queries", async () => {
    const el = await renderPalette("/draft-123");

    expect(resultTitles(el)).toEqual([
      "Go to /draft-123",
      'Search for "draft-123"',
    ]);
  });

  it("normalizes repeated leading slashes into a local path", () => {
    expect(getPathCommandTarget("//example.com")).toBe("/example.com");
    expect(getPathCommandSearchQuery("//example.com")).toBe("example.com");
  });

  it("accepts fullwidth slash input", async () => {
    const el = await renderPalette("／notes");

    expect(resultTitles(el)).toEqual(["Go to /notes", 'Search for "notes"']);
  });
});
