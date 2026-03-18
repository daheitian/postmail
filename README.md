# Jant

> **Work in Progress**: This project is still under active development and not yet ready for use. See the latest build at [demo.jant.me](https://demo.jant.me).
>
> Demo login: `demo@jant.me` / `jantdemodemojant` — Settings: [demo.jant.me/settings](https://demo.jant.me/settings)

A personal microblogging system as smooth as <https://threads.com>.

> **Jant** = Jantelagen (Law of Jante)
> Low-key, de-socialized personal expression.

## What is Jant?

Jant is a single-author microblog for people who want to share thoughts without the noise of social media. No followers, no likes, no retweets—just your words.

**Features**:

- Multiple content types: notes, articles, links, quotes, images
- Thread support for longer thoughts
- Collections for curated topics
- Beautiful, themeable design
- Deploys on Cloudflare Workers or as a self-hosted Node/Docker app

## Quick Start

### One-Click Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

### Developer Setup

```bash
# Create a new Jant site
npm create jant my-blog

# Start development
cd my-blog
npm run dev
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Deployment](docs/deployment.md)
- [Docker Deployment](docs/deployment-docker.md)
- [Configuration](docs/configuration.md)
- [Theming](docs/theming.md)
- [API Reference](docs/API.md)

### Recommended Configuration

After deploying, configure these in `wrangler.toml` for the best experience:

| Variable                   | Why                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `JANT_R2_PUBLIC_URL`       | Serve media directly from CDN instead of proxying through Worker (faster, lower cost) |
| `JANT_IMAGE_TRANSFORM_URL` | Enable automatic thumbnail generation and image optimization                          |

See [Configuration](docs/configuration.md) for full details and setup instructions.

## Development

Requires [mise](https://mise.jdx.dev/) — it manages Node.js and pnpm automatically.

```bash
# Install mise (macOS/Linux)
curl https://mise.run | sh

# Clone and setup
git clone https://github.com/jant-me/jant.git
cd jant
mise install   # installs Node.js and pnpm
pnpm install   # installs dependencies

# Start development server (defaults to http://localhost:9020)
mise run dev

# Recreate the local D1 database with dev auth + canonical demo content
mise run db-local-reset

# Reload just the canonical demo content into the current local DB
mise run db-local-load-demo

# Override the dev port
PORT=9030 mise run dev
```

For authenticated browser or agent debugging, run `mise run dev-debug`. It uses the first free port starting at `19020` and prints the exact `http://localhost:19xxx/...` login URL to use. Prefer `localhost` for browser debugging because some environments upgrade `*.localtest.me` to HTTPS, which breaks local HTTP dev ports.

See [CONTRIBUTING.md](CONTRIBUTING.md) for code style, PR process, and release workflow.

### Translation Reference

Jant keeps [`references/lingui-po-translate/`](references/lingui-po-translate/) as a checked-in copy of [lingui-po-translate](https://github.com/theowenyoung/lingui-po-translate). This is the CLI tool we use for AI-assisted Lingui PO translation, and we keep it locally so the team can check its supported options and integration details without leaving the repo.

The most relevant options for our workflow are `--service`, `--serviceConfig`, `--model`, `--baseUrl`, `--prompt`, and `--sourceOverride`. Its README also documents how Lingui `@context` comments are passed through to translation prompts, which matches Jant's `t({ comment: "@context:..." })` convention.

## Philosophy

Jant is built on the idea that not everything needs to be optimized for engagement. Write for yourself. Share if you want. No metrics, no pressure.

## License

AGPL-3.0
