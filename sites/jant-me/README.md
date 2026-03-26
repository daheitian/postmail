# Jant Site

A personal website/blog powered by [Jant](https://github.com/jant-me/jant).

## Option A: One-Click Deploy

Deploy to Cloudflare instantly — no local setup required:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

### Deploy form fields

| Field                      | What to do                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Git account**            | Select your GitHub account. A new repo will be created for you.                                                                                            |
| **D1 database**            | Keep "Create new". The default name is fine.                                                                                                               |
| **Database location hint** | Pick a region close to you (optional, Cloudflare auto-selects).                                                                                            |
| **R2 bucket**              | Keep "Create new". The default name is fine. Used for media uploads.                                                                                       |
| **AUTH_SECRET**            | Used for login session encryption. Keep the pre-filled value or generate your own with `openssl rand -base64 32`.                                          |
| **SITE_ORIGIN**            | Optional. Set this when you want a fixed public origin such as `https://my-blog.example.com`. If you leave it empty, Jant uses the current request origin. |
| **SITE_PATH_PREFIX**       | Optional. Set this only when you mount the site under a subpath such as `/blog`. Leave it empty for normal root deploys.                                   |

### After deploy

1. Visit your site at the URL shown in the Cloudflare dashboard (e.g. `https://<project>.<account>.workers.dev`)
2. Go to `/setup` to set up your admin account
3. If you set `SITE_ORIGIN` to a custom domain, add it in: Cloudflare dashboard → Workers & Pages → your worker → Settings → Domains & Routes → Add Custom Domain
4. If you leave `SITE_ORIGIN` empty, Jant uses your current `*.workers.dev` or custom-domain request host automatically

If you deploy Jant under a subpath on Cloudflare, Jant will publish built assets under that same prefix, such as `/blog/_assets/*`. `jant deploy` prepares `dist/public/blog/_assets/*` automatically, so routing `/blog*` to the same Worker is enough.

### Develop locally

```bash
# Clone the repo that was created for you
git clone git@github.com:<your-username>/<your-repo>.git
cd <your-repo>
pnpm install
pnpm dev
```

Visit http://localhost:9020. Changes pushed to `main` will auto-deploy.

Other docs see [Docs](https://github.com/jant-me/jant)
