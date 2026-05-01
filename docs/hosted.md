# Use Hosted Jant

If you'd rather not deal with deployment, upgrades, and backups, the official hosted service at [jant.me](https://jant.me) runs Jant for you. It runs the same open-source code as a self-hosted install.

## Pricing and limits

| Item                               | Limit         |
| ---------------------------------- | ------------- |
| First site                         | $10.46 / year |
| Each additional site               | $5 / year     |
| Media storage (shared per account) | 10 GB         |

The $10.46 figure comes from Cloudflare's at-cost (no markup) `.com` domain renewal price. Years ago I wrote on my blog that I liked the feel of a `.com` domain price — slightly above free, low enough that it felt like a steal. Cloudflare now sells them at cost, so I anchored the first site to that number.

Bandwidth is fair-use. Normal personal-blog traffic won't hit any limit.

Billed annually. After you cancel, the site keeps running until the end of the current paid period. Then it enters a 90-day retention window during which data can still be recovered. After 90 days, the site is permanently deleted.

## What's included

- **Full Jant feature set**: Threads, Collections, GitHub Sync, API/MCP, Hugo export — every feature works the same as on a self-hosted install.
- **Automatic HTTPS**: certificates are issued and renewed automatically for the default subdomain and any custom domain you bind.
- **Custom domain**: bind your own domain from the dashboard.
- **Database and media storage**: D1, R2, Postgres, S3 are all configured and operated by the hosted side. From your view it's just a site in the dashboard.

## Getting started

1. Sign up at [jant.me](https://jant.me).
2. Create a site. Each new site gets a `*.jant.blog` subdomain that works immediately.
3. (Optional) Bind your own domain: dashboard → select the site → **Domains** → add a domain, then configure DNS at your registrar as instructed. Certificates are issued and renewed automatically.

## Take your content with you

Hosted and self-hosted run the same open-source code:

- **[Hugo export](export-and-import.md)**: export every post, media file, and setting at once into a standard Hugo site directory you can run on any Hugo host.
- **[GitHub Sync](github-sync.md)**: have the site continuously sync content into your own GitHub repo. The repo itself is a complete Hugo site, so you always hold a current, independently runnable copy.

You can switch from hosted to self-hosted at any time, or back the other direction, through the same import flow.

## How it compares to self-hosting

| Item             | Hosted             | Self-hosted                                                                   |
| ---------------- | ------------------ | ----------------------------------------------------------------------------- |
| Setup cost       | Sign up and go     | Follow the [Cloudflare](deployment.md) or [Docker](deployment-docker.md) docs |
| Upgrades and ops | Automatic          | You run them                                                                  |
| Where data lives | Hosted environment | Your own environment                                                          |
| Cost             | From $10.46 / year | Usually within Cloudflare's free tier                                         |

Both paths run the same code. Self-hosting trades configuration and upgrade work for full control. Hosted trades $10.46 a year for sign-up-and-go.

## Contact

For technical or account questions, email `support#jant.me` (replace `#` with `@`).

## What's next

- [Writing and organizing](writing-and-organizing.md): start publishing
- [GitHub Sync](github-sync.md): continuously sync content to your repo
- [Export and import](export-and-import.md): move out of or into the hosted service
