#!/usr/bin/env node
//
// Create a changeset non-interactively.
//
// Usage: node scripts/release/changeset-add.mjs <patch|minor|major> "<summary>"

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const [, , bump, summary] = process.argv;

if (!bump || !summary) {
  console.error(
    'Usage: node scripts/release/changeset-add.mjs <patch|minor|major> "<summary>"',
  );
  process.exit(1);
}

const cliPath = require.resolve("@changesets/cli");
const writeModule = require(
  require.resolve("@changesets/write", { paths: [cliPath] }),
);

const write = writeModule.default;

const id = await write(
  {
    summary,
    releases: [
      { name: "@jant/core", type: bump },
      { name: "create-jant", type: bump },
    ],
  },
  process.cwd(),
);

console.log("Created changeset:", id);
