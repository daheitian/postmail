# Jant Site

A personal website/blog powered by [Jant](https://github.com/jant-me/jant).

## Getting Started

```bash
pnpm dev
```

Visit http://localhost:9019 to see your site.

> Your `.dev.vars` file was automatically generated with a secure `AUTH_SECRET`. See `.dev.vars.example` for all available secret variables.

## Deploy to Cloudflare

### 1. Prerequisites

Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) and log in:

```bash
wrangler login
```

### 2. Create D1 Database

```bash
wrangler d1 create <your-project>-db
# Copy the database_id from the output!
```

Replace `<your-project>` with your project name (must match `database_name` in `wrangler.toml`).

### 3. Update Configuration

Edit `wrangler.toml`:

- Replace `database_id = "local"` with the ID from step 2
- Set `SITE_URL` to your production URL

> R2 bucket is automatically created on first deploy — no manual setup needed.

### 4. Set Production Secrets

```bash
wrangler secret put AUTH_SECRET
# Enter a random 32+ character string when prompted
# Generate one with: openssl rand -base64 32
```

### 5. Deploy

```bash
# Apply database migrations to production
pnpm db:migrate:remote

# Build and deploy
pnpm deploy
```

Your site is now live at `https://<your-project>.<your-subdomain>.workers.dev`!

### 6. GitHub Actions (CI/CD)

A workflow file is included at `.github/workflows/deploy.yml`. You just need to configure secrets.

#### Create API Token

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

#### Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name     | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| `CF_API_TOKEN`  | API token from above                                                     |
| `CF_ACCOUNT_ID` | Your Cloudflare Account ID (found in dashboard URL or `wrangler whoami`) |
| `AUTH_SECRET`   | Random 32+ character string (`openssl rand -base64 32`)                  |

Push to `main` to trigger deployment.

#### Using Environments (Optional)

For separate staging/production, update `.github/workflows/deploy.yml`:

```yaml
jobs:
  deploy:
    uses: jant-me/jant/.github/workflows/deploy.yml@v1
    with:
      environment: production # Uses [env.production] in wrangler.toml
    secrets:
      CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
      AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
```

### 7. Custom Domain (Optional)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Select your worker → Settings → Triggers
3. Click **Add Custom Domain** and enter your domain

## Commands

| Command                  | Description                        |
| ------------------------ | ---------------------------------- |
| `pnpm dev`               | Start development server           |
| `pnpm build`             | Build for production               |
| `pnpm deploy`            | Build and deploy to Cloudflare     |
| `pnpm preview`           | Preview production build           |
| `pnpm typecheck`         | Run TypeScript checks              |
| `pnpm db:migrate:remote` | Apply database migrations (remote) |

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
# Update @jant/core
pnpm update @jant/core

# Start dev server (auto-applies migrations locally)
pnpm dev

# Before deploying: apply migrations to production
pnpm db:migrate:remote

# Deploy
pnpm deploy
```

> New versions of `@jant/core` may include database migrations. Always run `pnpm db:migrate:remote` before deploying after an update. Check the [release notes](https://github.com/jant-me/jant/releases) for any breaking changes.

## Documentation

- [Jant Documentation](https://jant.me/docs)
- [GitHub Repository](https://github.com/jant-me/jant)
