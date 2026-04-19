#!/usr/bin/env node

// Thin wrapper that forwards to @jant/core's bin/jant.js.
//
// Exists only so `npx jant-cli ...` works in contexts that don't have
// @jant/core installed locally (standalone Hugo export repos, fresh
// tmp dirs, notebooks). Inside a Jant site project, use `npx jant ...`
// directly — @jant/core already wires `node_modules/.bin/jant`.
//
// `process.argv` and exit codes flow through naturally because we
// dynamic-import the bin in the same process.

await import("@jant/core/bin/jant.js");
