# jant-cli

Zero-install `npx` entry point for the Jant CLI.

```sh
npx jant-cli --help
```

This package is a thin wrapper that forwards to [`@jant/core`](https://www.npmjs.com/package/@jant/core)'s bundled `jant` command. It exists so you can run Jant CLI tasks from anywhere — a cloned Hugo export repo, a scratch directory, a CI job — without first installing `@jant/core`.

## When to use which

- **Inside a Jant site project** (created with `create-jant`, `@jant/core` already installed): use `npx jant …` directly.
- **Anywhere else**: use `npx jant-cli …`. Every `jant` subcommand is available — `jant-cli` forwards argv unchanged.

## What it does not do

- It does not add any commands of its own.
- It does not pin an old `@jant/core` — the installed version always matches this package's version exactly.

For the full command reference, see the [`@jant/core` README](https://www.npmjs.com/package/@jant/core) or <https://jant.me>.
