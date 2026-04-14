# Jant

> **Pre-1.0**: Jant is still early. Expect rough edges, breaking changes, and docs that keep moving while the product settles.
>
> Live demo: [demo.jant.me](https://demo.jant.me)
>
> Demo login: `demo@jant.me` / `jantdemodemojant`

Jant is a small blog system for one author. It treats notes, links, quotes, threads, and collections as normal parts of writing, with a publishing flow that feels closer to posting than opening an admin panel.

No followers. No likes. No algorithmic feed.

The name comes from _Jantelagen_, a Nordic social concept often associated with humility. I liked the word, so I used it as the inspiration for the name.

## Why Jant Exists

Maybe the honest answer is: because I couldn't find what I wanted.

Most blog systems treat "published" and "broadcast" as the same decision. Post something, and it goes to your RSS feed, your subscribers, and your timeline all at once. I wanted a quieter model. A post should be able to live on the site, have its own URL, belong to a collection, or continue a thread without automatically becoming an announcement. In Jant, `/feed` defaults to `Featured`, not `Latest`, and `Hidden from Latest` exists for exactly that middle ground.

I also wanted publishing to feel modern. Not another WordPress or Ghost-style dashboard, but something closer to posting. Threads matter here. A lot of writing happens as one note, then a follow-up, then a correction, then one more addition. Very few blog systems treat that as a first-class shape.

And I have always liked Tumblr's core instinct: note, link, and quote should be first-class formats. Those three cover most of what I have wanted from blogging for years. Open-source alternatives in that space still seem surprisingly rare, so I built the one I wanted.

## What Jant Includes

- Three post formats: note, link, and quote
- Threads for connected thoughts and self-replies
- Collections for curated topics and ongoing series
- Rich attachments for images, video, audio, documents, and pasted code
- Ratings for books, films, articles, and other posts you want to keep a record of
- Featured-first feeds, so publishing and syndication stay separate by default
- Search, archive pages, and RSS feeds
- Theme customization with built-in themes, fonts, and custom CSS
- GitHub Sync for automatic content backup, bidirectional editing, and a file-based interface for AI tools
- Full API, import tools, and Zola export for portability

## How It Runs

| Option             | Best for                                         | Default stack                                        |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------- |
| Cloudflare Workers | Cheap global hosting with minimal infrastructure | D1 + R2                                              |
| Docker / Node.js   | Self-hosting on your own server                  | SQLite or Postgres + S3 (recommended) or local media |

Cloudflare Workers is a first-class target because it can keep a personal site online for a long time at very low cost.

If you prefer to run Jant yourself on a more traditional server, that works too. Docker and bare Node are both supported.

## Quick Start

### Deploy on Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

Use the Cloudflare deploy button for the fastest path. It starts from the Jant starter repo and walks you through the required Cloudflare fields.

See [Deploy on Cloudflare](docs/deployment.md) for the full one-click and manual guide.

### Create with CLI

```bash
npm create jant@latest my-site
cd my-site
npm run dev
```

Open `http://localhost:3000` and complete the first-run setup in the browser.

### Run with Docker

Use the official image when you want a traditional server deployment:

- Docker image: [`owenyoung/jant`](https://hub.docker.com/r/owenyoung/jant)
- Guide: [Deploy with Docker](docs/deployment-docker.md)

### Hosted Option

If you would rather not self-host, there is also a small hosted option. Access opens gradually. Write to `owen#jant.me` if you want help getting set up.

## Documentation

- [Introduction to Jant](docs/overview.md)
- [Getting Started](docs/getting-started.md)
- [Writing and Organizing Posts](docs/writing-and-organizing.md)
- [Deploy on Cloudflare](docs/deployment.md)
- [Deploy with Docker](docs/deployment-docker.md)
- [Configuration](docs/configuration.md)
- [GitHub Sync](docs/github-sync.md)
- [Export and Import](docs/export-and-import.md)
- [Backups and Recovery](docs/backups.md)
- [Theming](docs/theming.md)
- [API Reference](docs/API.md)

## Development

Jant's own repo uses [mise](https://mise.jdx.dev/) to manage Node.js and pnpm.

```bash
git clone https://github.com/jant-me/jant.git
cd jant
mise install
pnpm install
mise run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor workflow.

## License

AGPL-3.0-or-later
