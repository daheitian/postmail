import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadDemoWorkflowEnv,
  resolveDemoEnvFiles,
} from "../../../../../scripts/demo-shared/env.mjs";

const tempDirs: string[] = [];
const originalEnv = {
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  JANT_DEMO_EMAIL: process.env.JANT_DEMO_EMAIL,
  JANT_DEMO_PUBLIC_URL: process.env.JANT_DEMO_PUBLIC_URL,
};

afterEach(async () => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});

describe("demo env loader", () => {
  it("prefers site files, then repo env files, while preserving shell overrides", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-demo-env-"));
    tempDirs.push(root);

    await mkdir(join(root, "sites/demo"), { recursive: true });
    await writeFile(
      join(root, ".env.repo"),
      [
        "CLOUDFLARE_API_TOKEN=repo-token",
        "CLOUDFLARE_ACCOUNT_ID=repo-account",
      ].join("\n"),
    );
    await writeFile(
      join(root, ".env.repo.local"),
      "CLOUDFLARE_API_TOKEN=repo-local-token\n",
    );
    await writeFile(
      join(root, ".env.local"),
      "CLOUDFLARE_API_TOKEN=legacy-root-local-token\n",
    );
    await writeFile(
      join(root, ".env"),
      "CLOUDFLARE_ACCOUNT_ID=legacy-root-account\n",
    );
    await writeFile(
      join(root, "sites/demo/.env"),
      [
        "JANT_DEMO_EMAIL=site-demo@example.com",
        "JANT_DEMO_PUBLIC_URL=https://demo.example.com",
      ].join("\n"),
    );
    await writeFile(
      join(root, "sites/demo/.env.local"),
      "JANT_DEMO_EMAIL=site-local-demo@example.com\n",
    );

    process.env.CLOUDFLARE_ACCOUNT_ID = "shell-account";
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.JANT_DEMO_EMAIL;
    delete process.env.JANT_DEMO_PUBLIC_URL;

    const { loadedFiles } = loadDemoWorkflowEnv({
      rootDir: root,
      sites: ["demo"],
    });

    expect(loadedFiles).toEqual(
      resolveDemoEnvFiles({ rootDir: root, sites: ["demo"] }),
    );
    expect(process.env.CLOUDFLARE_API_TOKEN).toBe("repo-local-token");
    expect(process.env.CLOUDFLARE_ACCOUNT_ID).toBe("shell-account");
    expect(process.env.JANT_DEMO_EMAIL).toBe("site-local-demo@example.com");
    expect(process.env.JANT_DEMO_PUBLIC_URL).toBe("https://demo.example.com");
  });

  it("falls back to legacy root env files when repo env files are absent", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-demo-env-legacy-"));
    tempDirs.push(root);

    await mkdir(join(root, "sites/demo"), { recursive: true });
    await writeFile(
      join(root, ".env.local"),
      "CLOUDFLARE_API_TOKEN=legacy-root-local-token\n",
    );
    await writeFile(
      join(root, ".env"),
      "CLOUDFLARE_ACCOUNT_ID=legacy-root-account\n",
    );

    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;

    loadDemoWorkflowEnv({
      rootDir: root,
      sites: ["demo"],
    });

    expect(process.env.CLOUDFLARE_API_TOKEN).toBe("legacy-root-local-token");
    expect(process.env.CLOUDFLARE_ACCOUNT_ID).toBe("legacy-root-account");
  });
});
