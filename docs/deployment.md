# Deploy on Cloudflare

You can deploy Jant on Cloudflare in two ways:

- `Option A`: one-click deploy from the starter repo
- `Option B`: use a site repo created with `create-jant` and deploy manually

If you want to run Jant on your own server instead, use [Deploy with Docker](deployment-docker.md).

## Option A: One-Click Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

Deploy to Cloudflare instantly, without local setup.

In this flow, Cloudflare creates the new GitHub repo, D1 database, and R2 bucket for you from the form.

### Deploy Form Fields

Use these defaults when the form appears:

| Field                      | What to do                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Git account**            | Select your GitHub account. Cloudflare creates a new repo for you.                                                        |
| **D1 database**            | Keep **Create new**. The default name is fine.                                                                            |
| **Database location hint** | Pick a nearby region if you want. Leaving it alone is fine too.                                                           |
| **R2 bucket**              | Keep **Create new**. The default name is fine.                                                                            |
| **AUTH_SECRET**            | Keep the generated value, or replace it with your own 32+ character secret.                                               |
| **SITE_ORIGIN**            | Optional. Set this when you want a fixed public origin such as `https://my-blog.example.com`.                             |
| **SITE_PATH_PREFIX**       | Optional. Set this only when you mount the site under a subpath such as `/blog`. Leave it empty for a normal root deploy. |

### After Deploy

1. Open the site URL shown in Cloudflare, usually `https://<project>.<account>.workers.dev`
2. Go through the setup flow and create your admin account
3. If you set `SITE_ORIGIN` to a custom domain, add that domain in Cloudflare under **Workers & Pages**
4. If you leave `SITE_ORIGIN` empty, Jant uses the current request host automatically

### Develop Locally Later

Cloudflare creates a GitHub repo for you during one-click deploy. To keep working locally:

```bash
git clone git@github.com:<your-username>/<your-repo>.git
cd <your-repo>
npm install
npm run dev
```

Changes pushed to `main` will continue to deploy automatically.

## Option B: Manual Deploy from a Site Repo

Use this path when you want to start locally with `create-jant` and deploy from your own machine.

```bash
npm create jant@latest my-site
cd my-site
```

## Before You Begin

You need:

- a Cloudflare account
- a Jant site repo
- Wrangler access through `npx wrangler`

Log in first:

```bash
npx wrangler login
```

### 1. Create the D1 Database

Create a D1 database:

```bash
npx wrangler d1 create my-site-db
```

Copy the `database_id` from the output into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-site-db"
database_id = "your-database-id"
```

If your scaffold already has a different `database_name`, either keep that name in the command or update `wrangler.toml` to match.

### 2. Create the R2 Bucket

Create an R2 bucket for media uploads:

```bash
npx wrangler r2 bucket create my-site-media
```

Make sure the bucket name in `wrangler.toml` matches:

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "my-site-media"
```

### 3. Set the Production Auth Secret

Your local `.dev.vars` secret is only for development. Set a real production secret before the first deploy:

```bash
openssl rand -base64 32
npx wrangler secret put AUTH_SECRET
```

Keep this secret stable after launch. Changing it invalidates active sessions.

### 4. Optional but Recommended Media Settings

Jant works without extra media configuration, but most production sites should set `R2_PUBLIC_URL` so media is served directly from Cloudflare's edge instead of being proxied through the Worker.

1. Open your R2 bucket in the Cloudflare dashboard.
2. Enable public access with a custom domain or `r2.dev` URL.
3. Add the public URL to `wrangler.toml`:

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
```

If you also want Cloudflare image transformations, set:

```toml
[vars]
IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
```

See [Configuration](configuration.md) for when to use each variable.

### 5. Deploy

```bash
npm run deploy
```

The default deploy script runs `jant deploy`, which:

- applies remote migrations and data backfills
- detects whether `SITE_PATH_PREFIX` is set
- uses the right asset directory for root-path or subpath deploys

After deploy, Cloudflare gives you a `*.workers.dev` URL.

## Optional: Push-to-Deploy with GitHub Actions

A site created with `create-jant` already includes `.github/workflows/deploy.yml`.

If you want automatic deploys on every push to `main`, add these GitHub repository secrets:

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

The workflow uses them to apply remote migrations and deploy your Worker.

## Finish Setup in the Browser

Open the deployed site and complete setup if you have not already:

1. create the admin account
2. confirm the site name
3. publish your first post

## Custom Domain

Add a custom domain in Cloudflare after the first deploy:

1. open **Workers & Pages**
2. choose your Worker
3. open **Domains & Routes**
4. add the domain

Set `SITE_ORIGIN` in `wrangler.toml` when you want Jant to use a fixed canonical host for RSS, sitemaps, and other absolute URLs:

```toml
[vars]
SITE_ORIGIN = "https://yourdomain.com"
```

## Deploy Under a Subpath

Set `SITE_PATH_PREFIX` when the site should live under a subpath such as `/blog`:

```toml
[vars]
SITE_PATH_PREFIX = "/blog"
```

Then route that prefix to the Worker:

- `/blog*`

Jant automatically prepares prefixed static assets under `/blog/_assets/*` during deploy.

## Updating an Existing Site

Update the dependency, then redeploy:

```bash
npm install @jant/core@latest
npm run deploy
```

For configuration details, see [Configuration](configuration.md). For recovery planning, see [Backups and Recovery](backups.md).
