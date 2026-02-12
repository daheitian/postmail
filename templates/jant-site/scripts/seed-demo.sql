-- =============================================================================
-- Demo seed data for Jant (demo.jant.me)
-- Exported from remote demo D1 database via: mise run demo-backup
-- Usage: mise run demo-reset
-- =============================================================================

-- posts
INSERT INTO posts VALUES(1,'article','featured','Welcome to Jant',NULL,'# Welcome to Jant Demo

Jant is a modern microblog platform built for Cloudflare Workers. This demo site resets daily at 00:00 UTC.

## Features

- **Multiple post types**: Notes, articles, links, quotes, images, and pages
- **Collections**: Organize posts into collections
- **Full-text search**: Search across all your content
- **Internationalization**: Built-in i18n support
- **Fast**: Edge-deployed on Cloudflare Workers

## Getting Started

```bash
pnpm create jant my-blog
cd my-blog
pnpm install
pnpm dev
```

Visit the [dashboard](/dash) to create your own posts!','<h1>Welcome to Jant Demo</h1>
<p>Jant is a modern microblog platform built for Cloudflare Workers. This demo site resets daily at 00:00 UTC.</p>
<h2>Features</h2>
<ul>
<li><strong>Multiple post types</strong>: Notes, articles, links, quotes, images, and pages</li>
<li><strong>Collections</strong>: Organize posts into collections</li>
<li><strong>Full-text search</strong>: Search across all your content</li>
<li><strong>Internationalization</strong>: Built-in i18n support</li>
<li><strong>Fast</strong>: Edge-deployed on Cloudflare Workers</li>
</ul>
<h2>Getting Started</h2>
<pre><code class="language-bash">pnpm create jant my-blog
cd my-blog
pnpm install
pnpm dev
</code></pre>
<p>Visit the <a href="/dash">dashboard</a> to create your own posts!</p>',NULL,NULL,NULL,NULL,NULL,NULL,1770689095,1770689095,1770689095);
INSERT INTO posts VALUES(2,'note','quiet',NULL,NULL,'This is a demo note. Notes are short posts without titles, perfect for quick thoughts and updates.','<p>This is a demo note. Notes are short posts without titles, perfect for quick thoughts and updates.</p>',NULL,NULL,NULL,NULL,NULL,NULL,1770685495,1770685495,1770685495);
INSERT INTO posts VALUES(3,'link','quiet','Jant on GitHub',NULL,'Check out the source code and documentation for Jant.','<p>Check out the source code and documentation for Jant.</p>','https://github.com/jant-me/jant','GitHub','github.com',NULL,NULL,NULL,1770681895,1770681895,1770681895);
INSERT INTO posts VALUES(4,'quote','quiet',NULL,NULL,'The best way to predict the future is to invent it.','<p>The best way to predict the future is to invent it.</p>',NULL,'Alan Kay',NULL,NULL,NULL,NULL,1770678295,1770678295,1770678295);
INSERT INTO posts VALUES(5,'image','quiet',NULL,NULL,'Image 1','<p>Image 1</p>
',NULL,NULL,NULL,NULL,NULL,NULL,1770758516,1770758516,1770758516);
INSERT INTO posts VALUES(6,'image','quiet',NULL,NULL,'Image 2','<p>Image 2</p>
',NULL,NULL,NULL,NULL,NULL,NULL,1770758537,1770758537,1770759299);
INSERT INTO posts VALUES(7,'page','unlisted','About','about','> **Work in Progress**: This project is still under active development and not yet ready for use. See the latest build at [demo.jant.me](https://demo.jant.me).
>
> Demo login: `demo@jant.me` / `demodemo` — Dashboard: [demo.jant.me/dash](https://demo.jant.me/dash)

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
- Deploys to Cloudflare Workers in minutes

## Quick Start

```bash
# Create a new Jant site
pnpm create jant my-blog

# Start development
cd my-blog
pnpm dev

# Deploy to Cloudflare
pnpm deploy
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Deployment](docs/deployment.md)
- [Configuration](docs/configuration.md)
- [Theming](docs/theming.md)
- [API Reference](docs/API.md)

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

# Start development server (http://localhost:9019)
mise run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for code style, PR process, and release workflow.

## Philosophy

Jant is built on the idea that not everything needs to be optimized for engagement. Write for yourself. Share if you want. No metrics, no pressure.

## License

AGPL-3.0
','<blockquote>
<p><strong>Work in Progress</strong>: This project is still under active development and not yet ready for use. See the latest build at <a href="https://demo.jant.me">demo.jant.me</a>.</p>
<p>Demo login: <code>demo@jant.me</code> / <code>demodemo</code> — Dashboard: <a href="https://demo.jant.me/dash">demo.jant.me/dash</a></p>
</blockquote>
<p>A personal microblogging system as smooth as <a href="https://threads.com">https://threads.com</a>.</p>
<blockquote>
<p><strong>Jant</strong> = Jantelagen (Law of Jante)<br>Low-key, de-socialized personal expression.</p>
</blockquote>
<h2>What is Jant?</h2>
<p>Jant is a single-author microblog for people who want to share thoughts without the noise of social media. No followers, no likes, no retweets—just your words.</p>
<p><strong>Features</strong>:</p>
<ul>
<li>Multiple content types: notes, articles, links, quotes, images</li>
<li>Thread support for longer thoughts</li>
<li>Collections for curated topics</li>
<li>Beautiful, themeable design</li>
<li>Deploys to Cloudflare Workers in minutes</li>
</ul>
<h2>Quick Start</h2>
<pre><code class="language-bash"># Create a new Jant site
pnpm create jant my-blog

# Start development
cd my-blog
pnpm dev

# Deploy to Cloudflare
pnpm deploy
</code></pre>
<h2>Documentation</h2>
<ul>
<li><a href="docs/getting-started.md">Getting Started</a></li>
<li><a href="docs/deployment.md">Deployment</a></li>
<li><a href="docs/configuration.md">Configuration</a></li>
<li><a href="docs/theming.md">Theming</a></li>
<li><a href="docs/API.md">API Reference</a></li>
</ul>
<h2>Development</h2>
<p>Requires <a href="https://mise.jdx.dev/">mise</a> — it manages Node.js and pnpm automatically.</p>
<pre><code class="language-bash"># Install mise (macOS/Linux)
curl https://mise.run | sh

# Clone and setup
git clone https://github.com/jant-me/jant.git
cd jant
mise install   # installs Node.js and pnpm
pnpm install   # installs dependencies

# Start development server (http://localhost:9019)
mise run dev
</code></pre>
<p>See <a href="CONTRIBUTING.md">CONTRIBUTING.md</a> for code style, PR process, and release workflow.</p>
<h2>Philosophy</h2>
<p>Jant is built on the idea that not everything needs to be optimized for engagement. Write for yourself. Share if you want. No metrics, no pressure.</p>
<h2>License</h2>
<p>AGPL-3.0</p>
',NULL,NULL,NULL,NULL,NULL,NULL,1770759271,1770759271,1770759271);

-- collections
INSERT INTO collections VALUES(1,'getting-started','Getting Started','Resources for getting started with Jant',1770689095,1770689095);
INSERT INTO collections VALUES(2,'inspires','Inspires',NULL,1770758555,1770758555);

-- post_collections
INSERT INTO post_collections VALUES(1,1,1770689095);
INSERT INTO post_collections VALUES(6,2,1770758568);

-- media
INSERT INTO media VALUES('019c496c-46bd-7954-bd6a-77b1b8f1d451',NULL,'019c496c-46bd-7954-bd6a-77b1b8f1d451.webp','tegan-conway-KaFfNTw8OYQ-unsplash.webp','image/webp',715364,'media/2026/02/019c496c-46bd-7954-bd6a-77b1b8f1d451.webp',NULL,NULL,NULL,1770758358,0,NULL,'r2');
INSERT INTO media VALUES('019c496c-5e44-70d2-ac8a-c0c0bdaab65c',6,'019c496c-5e44-70d2-ac8a-c0c0bdaab65c.webp','land-o-lakes-inc-9w6Qb-dqBwE-unsplash.webp','image/webp',306042,'media/2026/02/019c496c-5e44-70d2-ac8a-c0c0bdaab65c.webp',NULL,NULL,NULL,1770758364,3,NULL,'r2');
INSERT INTO media VALUES('019c496d-5011-7981-89a0-b4373a695d78',6,'019c496d-5011-7981-89a0-b4373a695d78.webp','land-o-lakes-inc-k71TQkbVIgI-unsplash.webp','image/webp',597680,'media/2026/02/019c496d-5011-7981-89a0-b4373a695d78.webp',NULL,NULL,NULL,1770758426,2,NULL,'r2');
INSERT INTO media VALUES('019c496d-630c-70b4-9004-51a194746566',6,'019c496d-630c-70b4-9004-51a194746566.webp','thingsneverchange-CgHNmQ0c2w4-unsplash.webp','image/webp',358320,'media/2026/02/019c496d-630c-70b4-9004-51a194746566.webp',NULL,NULL,NULL,1770758431,1,NULL,'r2');
INSERT INTO media VALUES('019c496d-720f-70d2-98b8-3779457de73c',6,'019c496d-720f-70d2-98b8-3779457de73c.webp','willian-justen-de-vasconcellos-7jg7Y_Mlf2Q-unsplash.webp','image/webp',478956,'media/2026/02/019c496d-720f-70d2-98b8-3779457de73c.webp',NULL,NULL,NULL,1770758435,0,NULL,'r2');
INSERT INTO media VALUES('019c496e-6904-7f61-b14f-080035ffe23f',5,'019c496e-6904-7f61-b14f-080035ffe23f.webp','richard-stachmann-Es--yoQocSM-unsplash.webp','image/webp',381534,'media/2026/02/019c496e-6904-7f61-b14f-080035ffe23f.webp',NULL,NULL,NULL,1770758498,0,NULL,'r2');
