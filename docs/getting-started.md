# Getting Started

The fastest way to start a new Jant site is `create-jant`. It scaffolds a Cloudflare-ready project, generates a local `AUTH_SECRET`, installs dependencies by default, and gives you a working local development setup.

If you want to evaluate Jant without creating a project first, skip to [Deploy with Docker](deployment-docker.md).

## Prerequisites

- [Node.js](https://nodejs.org/) 24 or newer
- A Cloudflare account if you plan to deploy on Workers

## Create a New Site

```bash
npm create jant@latest my-site
cd my-site
```

If you prefer `pnpm` or `yarn`, use their `create` command instead. Jant adapts the scaffolded scripts to the package manager you used.

## Start Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To use a different local port:

```bash
PORT=3030 npm run dev
```

## Complete Setup in the Browser

On first launch, Jant walks you through the initial site setup.

1. Create your admin account
2. Set your site name
3. Choose your language

After that, you can start publishing immediately.

## Understand the Default Publishing Model

Before you write the first few posts, one default is worth knowing:

- `/feed` points to `Featured` by default
- `/feed/latest` exists separately for the latest public posts
- `Hidden from Latest` lets a post stay public on your site without entering that stream

That split is intentional. In Jant, publishing something and broadcasting it are not automatically the same action.

## What the Scaffold Already Did

By default, `create-jant` also:

- generated `.dev.vars` with a secure local `AUTH_SECRET`
- installed dependencies
- initialized a git repository
- created a Cloudflare Workers project with D1 and R2 bindings ready to configure

If you passed `--no-install` or `--no-git`, do those steps yourself.

## What to Read Next

- [Writing and Organizing Posts](writing-and-organizing.md) to understand notes, links, quotes, threads, and collections
- [Deploy on Cloudflare](deployment.md) to publish the site you just created
- [Configuration](configuration.md) to tune URLs, storage, feeds, and uploads
- [Theming](theming.md) to change how the site looks
