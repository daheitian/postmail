import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadDemoWorkflowEnv } from "./env.mjs";

const args = [...process.argv.slice(2)];
const sites = [];
let cwd;
let separatorIndex = -1;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === "--") {
    separatorIndex = index;
    break;
  }

  if (arg === "--site") {
    const site = args[index + 1];
    if (!site) {
      console.error("Missing value after --site.");
      process.exit(1);
    }
    sites.push(site);
    index += 1;
    continue;
  }

  if (arg === "--cwd") {
    const value = args[index + 1];
    if (!value) {
      console.error("Missing value after --cwd.");
      process.exit(1);
    }
    cwd = resolve(process.cwd(), value);
    index += 1;
    continue;
  }

  console.error(`Unknown option: ${arg}`);
  process.exit(1);
}

if (separatorIndex === -1 || separatorIndex === args.length - 1) {
  console.error(
    "Usage: node scripts/demo-shared/run-with-env.mjs [--site demo] [--cwd path] -- <command> [...args]",
  );
  process.exit(1);
}

loadDemoWorkflowEnv({ sites });

const command = args[separatorIndex + 1];
const commandArgs = args.slice(separatorIndex + 2);

const result = spawnSync(command, commandArgs, {
  cwd,
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
