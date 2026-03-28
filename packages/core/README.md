# @jant/core

A self-hosted, single-author microblogging platform for Cloudflare Workers, Docker, and Node.js.

> Still in development

## What is Jant?

Jant is a place to publish notes, links, and quotes on your own site, without followers, likes, or algorithmic feeds.

## Recommended Starting Points

For a new site, start with `create-jant`:

```bash
npm create jant@latest my-site
cd my-site
npm run dev
```

For a traditional server deployment, use the official Docker image:

- [`owenyoung/jant`](https://hub.docker.com/r/owenyoung/jant)
- [Docker deployment guide](https://github.com/jant-me/jant/blob/main/docs/deployment-docker.md)

## Tech Stack

- **Runtime**: Cloudflare Workers or Node.js 24
- **Framework**: [Hono](https://hono.dev)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Auth**: [better-auth](https://better-auth.com)
- **ORM**: [Drizzle](https://orm.drizzle.team)
- **CSS**: Tailwind CSS v4 + [BaseCoat](https://basecoat.dev)

## Documentation

- [Overview](https://github.com/jant-me/jant/blob/main/docs/overview.md)
- [Getting Started](https://github.com/jant-me/jant/blob/main/docs/getting-started.md)
- [Writing and Organizing Posts](https://github.com/jant-me/jant/blob/main/docs/writing-and-organizing.md)
- [Deploy on Cloudflare](https://github.com/jant-me/jant/blob/main/docs/deployment.md)
- [Deploy with Docker](https://github.com/jant-me/jant/blob/main/docs/deployment-docker.md)
- [Configuration](https://github.com/jant-me/jant/blob/main/docs/configuration.md)
- [Export and Import](https://github.com/jant-me/jant/blob/main/docs/export-and-import.md)
- [Backups and Recovery](https://github.com/jant-me/jant/blob/main/docs/backups.md)
- [Theming](https://github.com/jant-me/jant/blob/main/docs/theming.md)
- [API Reference](https://github.com/jant-me/jant/blob/main/docs/API.md)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](https://github.com/jant-me/jant/blob/main/CONTRIBUTING.md) for guidelines.

## License

AGPL-3.0-or-later
