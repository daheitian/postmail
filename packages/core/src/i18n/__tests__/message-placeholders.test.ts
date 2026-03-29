import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOTS = [
  "/Users/green/project/jant/main/packages/core/src/ui",
  "/Users/green/project/jant/main/packages/core/src/routes",
];

const SOURCE_FILE_RE = /\.[cm]?[jt]sx?$/;
const SKIP_SEGMENTS = new Set(["__tests__", "dist"]);
const DYNAMIC_LINGUI_MESSAGE_RE = /message:\s*`[^`]*\$\{/;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return SKIP_SEGMENTS.has(entry.name) ? [] : collectSourceFiles(fullPath);
    }

    if (!SOURCE_FILE_RE.test(entry.name) || entry.name.includes(".test.")) {
      return [];
    }

    return [fullPath];
  });
}

describe("Lingui message descriptors", () => {
  it("do not bake runtime values into message template literals", () => {
    const offenders = SOURCE_ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return DYNAMIC_LINGUI_MESSAGE_RE.test(source) ? [filePath] : [];
      }),
    );

    expect(offenders).toEqual([]);
  });
});
