# Getting Started

Get your Jant site running in 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- A [Cloudflare](https://cloudflare.com/) account (free tier works)

## Create Your Site

```bash
pnpm create jant my-blog
cd my-blog
```

This scaffolds a new Jant project with everything configured.

## Local Development

```bash
pnpm run dev
```

Open [http://localhost:8787](http://localhost:8787). You'll see the setup page on first visit.

## First-time Setup

1. Create your admin account (email + password)
2. Set your site name
3. Choose your language

That's it. You're ready to write.

## Writing Content

### Notes

Quick thoughts. No title needed.

### Articles

Longer posts with titles. Supports Markdown.

### Links

Share external content with your commentary.

### Quotes

Attribute words to others.

### Images

Photos with optional captions.

## Visibility

Every post has a visibility level:

| Level        | What it means                                                                         |
| ------------ | ------------------------------------------------------------------------------------- |
| **Public**   | Normal publish, visible everywhere (default)                                          |
| **Unlisted** | Hidden from Latest and the main feeds, but still visible in collections you add it to |
| **Private**  | Only visible when logged in                                                           |
| **Draft**    | Work in progress, not published                                                       |

### Featured

Featured is an independent curation flag, not a visibility level. Any post (including thread replies) can be featured. Featured posts appear in the main RSS feed (`/feed`) and on the Featured page. Both are ordered by when you featured each post, while post cards still show the original publish date. Feature a post from the post menu or use "Post as Featured" in the compose dialog.

## Threads

Reply to your own posts to create connected threads. The thread shares the root post's visibility, but featured status is independent — you can feature individual replies.

## Collections

Organize posts into themed collections:

- `/c/reading-2024` - Book notes from this year
- `/c/recipes` - Your cooking experiments
- `/c/thoughts-on-ai` - A series on AI

Collection pages are for browsing and can use their own sort options. Collection feeds (`/c/{slug}/feed`) are ordered by when posts were added to the collection.

## Next Steps

- [Deploy to Cloudflare](deployment.md)
- [Plan backups and recovery](backups.md)
- [Configure your site](configuration.md)
- [Customize the theme](theming.md)
