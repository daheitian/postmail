# Jant Site

A personal website/blog powered by [Jant](https://github.com/jant-me/jant).

## Option A: One-Click Deploy

Deploy to Cloudflare instantly — no local setup required:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

### Deploy form fields

| Field                      | What to do                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Git account**            | Select your GitHub account. A new repo will be created for you.                                                                                                                                                            |
| **D1 database**            | Keep "Create new". The default name is fine.                                                                                                                                                                               |
| **Database location hint** | Pick a region close to you (optional, Cloudflare auto-selects).                                                                                                                                                            |
| **R2 bucket**              | Keep "Create new". The default name is fine. Used for media uploads.                                                                                                                                                       |
| **AUTH_SECRET**            | Used for login session encryption. Keep the pre-filled value or generate your own with `openssl rand -base64 32`.                                                                                                          |
| **SITE_URL**               | Change this to your production URL (e.g. `https://my-blog.example.com`). If you don't have a custom domain yet, leave it empty — you can set it later in the Cloudflare dashboard after you know your `*.workers.dev` URL. |

### After deploy

1. Visit your site at the URL shown in the Cloudflare dashboard (e.g. `https://<project>.<account>.workers.dev`)
2. Go to `/dash` to set up your admin account
3. If you set `SITE_URL` to a custom domain, add it in: Cloudflare dashboard → Workers & Pages → your worker → Settings → Domains & Routes → Add Custom Domain
4. If you left `SITE_URL` empty, set it to your `*.workers.dev` URL: Cloudflare dashboard → Workers & Pages → your worker → Settings → Variables and Secrets

### Develop locally

```bash
# Clone the repo that was created for you
git clone git@github.com:<your-username>/<your-repo>.git
cd <your-repo>
npm install
npm run dev
```

Visit http://localhost:9019. Changes pushed to `main` will auto-deploy.

## Option B: Create with CLI

Set up a new project locally, then deploy manually:

```bash
npm create jant my-site
cd my-site
npm run dev
```

Visit http://localhost:9019. When you're ready to go live, continue with [Deploy to Cloudflare](#deploy-to-cloudflare) below.

### Deploy to Cloudflare

#### 1. Prerequisites

Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) and log in:

```bash
wrangler login
```

#### 2. Create D1 Database

Check the `database_name` in your `wrangler.toml` (defaults to `<your-project>-db`), then create it:

```bash
wrangler d1 create <your-project>-db
# Copy the database_id from the output!
```

#### 3. Update Configuration

Edit `wrangler.toml`:

- Replace `database_id = "local"` with the ID from step 2
- Set `SITE_URL` to your production URL (e.g. `https://example.com`)

> R2 bucket is automatically created on first deploy — no manual setup needed.
>
> **Note:** Changing `database_id` resets your local development database (local data is stored per database ID). If you've already started local development, you'll need to go through the setup wizard again to create your admin account.

#### 4. Set Production Secrets

Generate a production secret and save it somewhere safe (you'll need it again for CI):

```bash
# Generate a secret
openssl rand -base64 32

# Set it in Cloudflare
wrangler secret put AUTH_SECRET
# Paste the generated value when prompted
```

> **Important:** This is separate from the `AUTH_SECRET` in `.dev.vars` (which is for local development only). Do not change the production secret after your site is live — it will invalidate all sessions. If you get locked out, use `npm run reset-password` to generate a password reset link.

#### 5. Deploy

```bash
# Apply database migrations and deploy
npm run deploy
```

Your site is now live at `https://<your-project>.<your-subdomain>.workers.dev`!

#### 6. Custom Domain (Optional)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Select your worker → Settings → Domains & Routes
3. Click **Add -> Custom domain** and enter your domain

### GitHub Actions (CI/CD)

A workflow file is included at `.github/workflows/deploy.yml`. Complete the [deployment](#deploy-to-cloudflare) first, then set up CI for automatic deployments.

> Runtime secrets (`AUTH_SECRET`, S3 keys, etc.) are already stored in Cloudflare from the manual deployment step. CI only needs deployment credentials.

#### 1. Push to GitHub

Create a new repository on [GitHub](https://github.com/new), then commit and push your project:

```bash
git add -A
git commit -m "Initial setup"
git remote add origin git@github.com:<your-username>/<your-repo>.git
git push -u origin main
```

#### 2. Create API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token** → **Use template** next to **Edit Cloudflare Workers**
3. **Add D1 permission** (not in template by default):
   - Click **+ Add more** → **Account** → **D1** → **Edit**

Your permissions should include:

| Scope   | Permission         | Access                        |
| ------- | ------------------ | ----------------------------- |
| Account | Workers Scripts    | Edit                          |
| Account | Workers R2 Storage | Edit                          |
| Account | **D1**             | **Edit** ← Must add manually! |
| Zone    | Workers Routes     | Edit                          |

4. Set **Account Resources** → **Include** → your account
5. Set **Zone Resources** → **Include** → **All zones from an account** → your account
6. **Create Token** and copy it

#### 3. Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name     | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| `CF_API_TOKEN`  | API token from above                                                     |
| `CF_ACCOUNT_ID` | Your Cloudflare Account ID (found in dashboard URL or `wrangler whoami`) |

#### 4. Enable Auto-Deploy

Uncomment the push trigger in `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

Now every push to `main` will auto-deploy.

#### Using Environments (Optional)

For separate staging/production, update `.github/workflows/deploy.yml`:

```yaml
jobs:
  deploy:
    uses: jant-me/jant/.github/workflows/deploy.yml@main
    with:
      environment: production # Uses [env.production] in wrangler.toml
    secrets:
      CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

## Commands

| Command                     | Description                        |
| --------------------------- | ---------------------------------- |
| `npm run dev`               | Start development server           |
| `npm run build`             | Build for production               |
| `npm run deploy`            | Migrate, build, and deploy         |
| `npm run preview`           | Preview production build           |
| `npm run typecheck`         | Run TypeScript checks              |
| `npm run db:migrate:remote` | Apply database migrations (remote) |

## Environment Variables

| Variable      | Description                               | Location         |
| ------------- | ----------------------------------------- | ---------------- |
| `AUTH_SECRET` | Secret key for authentication (32+ chars) | `.dev.vars` file |
| `SITE_URL`    | Your site's public URL                    | `wrangler.toml`  |

For all available variables (site name, language, R2 storage, image optimization, S3, demo mode, etc.), see the **[Configuration Guide](https://github.com/jant-me/jant/blob/main/docs/configuration.md)**.

## Customization

### Theme Components

Override theme components by creating files in `src/theme/components/`:

```typescript
// src/theme/components/PostCard.tsx
import type { PostCardProps } from "@jant/core";
import { PostCard as OriginalPostCard } from "@jant/core/theme";

export function PostCard(props: PostCardProps) {
  return (
    <div class="my-wrapper">
      <OriginalPostCard {...props} />
    </div>
  );
}
```

Then register it in `src/index.ts`:

```typescript
import { createApp } from "@jant/core";
import { PostCard } from "./theme/components/PostCard";

export default createApp({
  theme: {
    components: {
      PostCard,
    },
  },
});
```

### Custom Styles

Add custom CSS in `src/theme/styles/`:

```css
/* src/theme/styles/custom.css */
@import "@jant/core/theme/styles/main.css";

/* Your custom styles */
.my-custom-class {
  /* ... */
}
```

### Using Third-Party Themes

```bash
npm install @jant-themes/minimal
```

```typescript
import { createApp } from "@jant/core";
import { theme as MinimalTheme } from "@jant-themes/minimal";

export default createApp({
  theme: MinimalTheme,
});
```

## Updating

```bash
# Update @jant/core to latest version
npm install @jant/core@latest

# Start dev server (auto-applies migrations locally)
npm run dev

# Deploy (includes remote migrations)
npm run deploy
```

> New versions of `@jant/core` may include database migrations. Check the [release notes](https://github.com/jant-me/jant/releases) for any breaking changes.
>
> **Dev dependencies** (vite, wrangler, tailwindcss, etc.) may also need updating. Compare your `devDependencies` with the [latest template](https://github.com/jant-me/jant/blob/main/templates/jant-site/package.json) and update if needed.

## Documentation

- [Jant Documentation](https://jant.me/docs)
- [GitHub Repository](https://github.com/jant-me/jant)
