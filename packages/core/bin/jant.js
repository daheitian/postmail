#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsDir = join(__dirname, "commands");

async function listCommands() {
  const files = await readdir(commandsDir);
  return files
    .filter((f) => f.endsWith(".js"))
    .map((f) => basename(f, ".js"));
}

async function showHelp() {
  const commands = await listCommands();
  console.log("Usage: jant <command> [options]");
  console.log("");
  console.log("Commands:");
  for (const cmd of commands) {
    console.log(`  ${cmd}`);
  }
  console.log("");
  console.log("Run 'jant <command> --help' for command-specific help.");
}

// First non-flag argument is the command name
const argv = process.argv.slice(2);
const command = argv.find((arg) => !arg.startsWith("-"));

if (!command) {
  await showHelp();
  process.exit(0);
}

const commands = await listCommands();
if (!commands.includes(command)) {
  console.error(`Unknown command: ${command}`);
  console.error("");
  await showHelp();
  process.exit(1);
}

// Pass everything after the command name to the subcommand
const commandIndex = argv.indexOf(command);
const mod = await import(join(commandsDir, `${command}.js`));
await mod.run(argv.slice(commandIndex + 1));
