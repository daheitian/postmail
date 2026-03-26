import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  resolveWranglerAssetsDirectory,
  resolveWranglerVarString,
} from "../../../bin/lib/wrangler-config.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});

describe("wrangler config helpers", () => {
  it("reads vars from the selected environment scope", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-wrangler-vars-"));
    tempDirs.push(root);

    const configPath = join(root, "wrangler.toml");
    await writeFile(
      configPath,
      `
[vars]
R2_PUBLIC_URL = "https://default.example.com"

[env.preview.vars]
R2_PUBLIC_URL = "https://preview.example.com"
      `.trim(),
    );

    expect(
      resolveWranglerVarString({
        configPath,
        env: "preview",
        key: "R2_PUBLIC_URL",
      }),
    ).toBe("https://preview.example.com");
  });

  it("returns undefined for missing vars", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-wrangler-vars-empty-"));
    tempDirs.push(root);

    const configPath = join(root, "wrangler.toml");
    await writeFile(
      configPath,
      '[vars]\nSITE_ORIGIN = "https://example.com"\nSITE_PATH_PREFIX = ""\n',
    );

    expect(
      resolveWranglerVarString({
        configPath,
        key: "R2_PUBLIC_URL",
      }),
    ).toBeUndefined();
  });

  it("reads the assets directory from the selected scope", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-wrangler-assets-"));
    tempDirs.push(root);

    const configPath = join(root, "wrangler.toml");
    await writeFile(
      configPath,
      `
[assets]
directory = "./dist/client"

[env.preview.assets]
directory = "./dist/public"
      `.trim(),
    );

    expect(
      resolveWranglerAssetsDirectory({
        configPath,
        env: "preview",
      }),
    ).toBe("./dist/public");
  });
});
