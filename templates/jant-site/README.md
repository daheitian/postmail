# Jant Site

A personal website/blog powered by [Jant](https://github.com/jant-me/jant).

## Local Development

```bash
pnpm dev
```

Visit http://localhost:9019 to see your site.

## Deploy to Cloudflare

### Option A: One-Click Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

Click the button, name your Worker, D1 database, and R2 bucket, set `AUTH_SECRET` (32+ random characters), and you're done!

After deploying, set `SITE_URL` in Cloudflare dashboard → your Worker → Settings → Variables.

> If you deployed via the button, skip to [Custom Domain](#custom-domain-optional).

### Option B: Manual Deployment

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

> **Important:** This is separate from the `AUTH_SECRET` in `.dev.vars` (which is for local development only). Do not change the production secret after your site is live — it will invalidate all sessions. If you get locked out, use `pnpm reset-password` to generate a password reset link.

#### 5. Deploy

```bash
# Apply database migrations and deploy
pnpm run deploy
```

Your site is now live at `https://<your-project>.<your-subdomain>.workers.dev`!

### Custom Domain (Optional)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Select your worker → Settings → Domains & Routes
3. Click **Add -> Custom domain** and enter your domain

## GitHub Actions (CI/CD)

A workflow file is included at `.github/workflows/deploy.yml`. Complete the [manual deployment](#option-b-manual-deployment) first, then set up CI for automatic deployments.

> Runtime secrets (`AUTH_SECRET`, S3 keys, etc.) are already stored in Cloudflare from the manual deployment step. CI only needs deployment credentials.

### 1. Push to GitHub

Create a new repository on [GitHub](https://github.com/new), then commit and push your project:

```bash
git add -A
git commit -m "Initial setup"
git remote add origin git@github.com:<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Create API Token

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

### 3. Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name     | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| `CF_API_TOKEN`  | API token from above                                                     |
| `CF_ACCOUNT_ID` | Your Cloudflare Account ID (found in dashboard URL or `wrangler whoami`) |

### 4. Enable Auto-Deploy

Uncomment the push trigger in `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

Now every push to `main` will auto-deploy.

### Using Environments (Optional)

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

### Cloudflare Workers Builds (Alternative CI/CD)

Workers Builds is auto-configured if you used the [One-Click Deploy](#option-a-one-click-deploy) button. To enable auto-deploy on push, go to Cloudflare dashboard → Workers → your worker → Settings → Builds.

## Commands

| Command                  | Description                        |
| ------------------------ | ---------------------------------- |
| `pnpm dev`               | Start development server           |
| `pnpm build`             | Build for production               |
| `pnpm run deploy`        | Migrate, build, and deploy         |
| `pnpm preview`           | Preview production build           |
| `pnpm typecheck`         | Run TypeScript checks              |
| `pnpm db:migrate:remote` | Apply database migrations (remote) |

> `deploy` uses `pnpm run deploy` because `pnpm deploy` is a built-in pnpm command. All other scripts work with or without `run`.

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
pnpm add @jant-themes/minimal
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
pnpm add @jant/core@latest

# Start dev server (auto-applies migrations locally)
pnpm dev

# Deploy (includes remote migrations)
pnpm run deploy
```

> New versions of `@jant/core` may include database migrations. Check the [release notes](https://github.com/jant-me/jant/releases) for any breaking changes.
>
> **Dev dependencies** (vite, wrangler, tailwindcss, etc.) may also need updating. Compare your `devDependencies` with the [latest template](https://github.com/jant-me/jant/blob/main/templates/jant-site/package.json) and update if needed.

## Documentation

- [Jant Documentation](https://jant.me/docs)
- [GitHub Repository](https://github.com/jant-me/jant)
