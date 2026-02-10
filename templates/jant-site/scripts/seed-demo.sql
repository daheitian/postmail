-- =============================================================================
-- Demo seed data for Jant (demo.jant.me)
-- Exported from remote demo D1 database via: mise run demo-backup
-- Usage: mise run demo-reset
-- =============================================================================

-- settings
INSERT INTO settings VALUES('ONBOARDING_STATUS','completed',1770657027);
INSERT INTO settings VALUES('SITE_LANGUAGE','zh-Hans',1770673922);
INSERT INTO settings VALUES('siteName','Jant Demo',1770689095);
INSERT INTO settings VALUES('siteDescription','A demo site for Jant - Modern microblog for Cloudflare Workers',1770689095);
INSERT INTO settings VALUES('siteUrl','https://demo.jant.me',1770689095);
INSERT INTO settings VALUES('postsPerPage','10',1770689095);
INSERT INTO settings VALUES('timezone','UTC',1770689095);
INSERT INTO settings VALUES('language','en',1770689095);

-- user
INSERT INTO user VALUES('cV9uL2nAhiFTPKgJnoiKVKyesEoWBdkY','Demo User','demo@jant.me',0,NULL,'admin',1770657027,1770657027);

-- account
INSERT INTO account VALUES('ARFNGzzGCjXacVOYu9vVbq4dwL2XuecG','cV9uL2nAhiFTPKgJnoiKVKyesEoWBdkY','credential','cV9uL2nAhiFTPKgJnoiKVKyesEoWBdkY',NULL,NULL,NULL,NULL,NULL,NULL,'2f0586376d6b21415b93d39aa00b31c3:f7adf50ededaaf477b27eb095035dc38f20ed8baa349bd10762eb5a916602342f32ac21bc8e384047361d2c67d82dbd922c906cc8fa1c43da68d8fa76e414562',1770657027,1770657027);

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
INSERT INTO posts VALUES(3,'link','quiet','Jant on GitHub',NULL,'Check out the source code and documentation for Jant.','<p>Check out the source code and documentation for Jant.</p>','https://github.com/nicepkg/jant','GitHub','github.com',NULL,NULL,NULL,1770681895,1770681895,1770681895);
INSERT INTO posts VALUES(4,'quote','quiet',NULL,NULL,'The best way to predict the future is to invent it.','<p>The best way to predict the future is to invent it.</p>',NULL,'Alan Kay',NULL,NULL,NULL,NULL,1770678295,1770678295,1770678295);

-- collections
INSERT INTO collections VALUES(1,'getting-started','Getting Started','Resources for getting started with Jant',1770689095,1770689095);

-- post_collections
INSERT INTO post_collections VALUES(1,1,1770689095);
