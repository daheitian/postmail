import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("jant deploy", () => {
  const tempDirs: string[] = [];
  const originalCwd = process.cwd();

  afterEach(async () => {
    process.chdir(originalCwd);
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("reuses the configured assets directory for root-path deploys", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-deploy-root-"));
    tempDirs.push(root);

    await writeFile(
      join(root, "wrangler.toml"),
      `
[assets]
directory = "./static-assets"
      `.trim(),
    );

    process.chdir(root);

    const runMigrate = vi.fn(async () => {});
    const preparePublicAssets = vi.fn(async () => ({
      outputDir: join(root, "dist/public"),
    }));
    const spawnSync = vi.fn(() => ({ status: 0 }));

    vi.doMock("../../../bin/commands/migrate.js", () => ({
      run: runMigrate,
    }));
    vi.doMock("../../../bin/lib/public-assets.js", () => ({
      DEFAULT_PUBLISH_DIR: "dist/public",
      preparePublicAssets,
      resolvePackageClientRoot: vi.fn(() => join(root, "fallback-client")),
    }));
    vi.doMock("node:child_process", () => ({ spawnSync }));

    const { run } = await import("../../../bin/commands/deploy.js");
    await run([]);

    expect(runMigrate).toHaveBeenCalledWith([
      "--remote",
      "--database",
      "DB",
      "--config",
      "wrangler.toml",
    ]);
    expect(preparePublicAssets).not.toHaveBeenCalled();
    const [wranglerBin, wranglerArgs, spawnOptions] = spawnSync.mock.calls[0];
    expect(wranglerBin).toMatch(/^wrangler/);
    expect(wranglerArgs).toEqual([
      "deploy",
      "--assets",
      expect.stringMatching(/\/static-assets$/),
      "--config",
      "wrangler.toml",
    ]);
    expect(spawnOptions).toEqual(expect.objectContaining({ stdio: "inherit" }));
  });

  it("prepares a publish directory for subpath deploys and forwards wrangler args", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-deploy-prefix-"));
    tempDirs.push(root);

    await writeFile(
      join(root, "wrangler.toml"),
      `
[assets]
directory = "./static-assets"

[vars]
SITE_PATH_PREFIX = "/blog"
      `.trim(),
    );

    process.chdir(root);

    const preparePublicAssets = vi.fn(async () => ({
      outputDir: join(root, "dist/public"),
    }));
    const spawnSync = vi.fn(() => ({ status: 0 }));

    vi.doMock("../../../bin/commands/migrate.js", () => ({
      run: vi.fn(async () => {}),
    }));
    vi.doMock("../../../bin/lib/public-assets.js", () => ({
      DEFAULT_PUBLISH_DIR: "dist/public",
      preparePublicAssets,
      resolvePackageClientRoot: vi.fn(() => join(root, "fallback-client")),
    }));
    vi.doMock("node:child_process", () => ({ spawnSync }));

    const { run } = await import("../../../bin/commands/deploy.js");
    await run(["--skip-migrate", "--", "--dry-run"]);

    expect(preparePublicAssets).toHaveBeenCalledWith({
      outputDir: "dist/public",
      sitePathPrefix: "/blog",
    });
    const [wranglerBin, wranglerArgs, spawnOptions] = spawnSync.mock.calls[0];
    expect(wranglerBin).toMatch(/^wrangler/);
    expect(wranglerArgs).toEqual([
      "deploy",
      "--assets",
      expect.stringMatching(/\/dist\/public$/),
      "--config",
      "wrangler.toml",
      "--dry-run",
    ]);
    expect(spawnOptions).toEqual(expect.objectContaining({ stdio: "inherit" }));
  });
});
