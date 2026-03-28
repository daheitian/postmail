# Introduction to Jant

> **Pre-1.0**: Jant is still early. Expect rough edges, breaking changes, and docs that keep moving while the product settles.

Jant is a small blog system for one author. It handles notes, links, quotes, threads, and collections. Publishing feels more like posting than opening an admin panel.

No followers. No likes. No algorithmic feed.

The name comes from _Jantelagen_, a Nordic social concept — roughly, the idea that you shouldn't think too much of yourself or put yourself above others. I've always liked the word. It felt right for something that's meant to be quiet.

## Why Another Blog System

Maybe the honest answer is: because I couldn't find what I wanted.

I kept running into the same gaps. Here's what actually drove me to build this.

**Visibility and syndication aren't the same thing.** Most blogging tools treat "published" and "broadcast" as one decision. Post something, and it goes to your RSS feed, your subscribers, your timeline — all at once. I wanted to be able to put something on my site, give it a URL, maybe tuck it into a collection, without it becoming an announcement. Jant separates these. A post can be public without being in your default feed. `Featured` is the default feed, not `Latest`. `Hidden from Latest` exists for things that should live on your site without being pushed anywhere.

That sounds like a small thing. It isn't, if you care about it.

**I wanted publishing to feel modern.** Not WordPress, not Ghost, not another dashboard where you fill out a form and click Save and go back to the admin panel. Threads got something right about the experience of posting — you write something, then you add a follow-up, then a small correction, and the whole thing stays together as a sequence. That's actually how I think. I kept wondering why more blog systems aren't shaped around that. So Jant has threads.

**I've always liked Tumblr more than most blogging software.** Not the company, just the idea: note, link, and quote as first-class formats. Three shapes that together cover almost everything I've wanted to write over many years of blogging. When those are distinct formats instead of workarounds, you write differently. I don't fully understand why there are so few serious open-source alternatives to Tumblr's model. Maybe I'm wrong and they exist. But I looked, and I kept not finding them.

So I built the thing I wanted. I'm not arguing every other tool is wrong. This is just the one that fits the way I publish.

## How It Runs

Jant can run in two ways:

| Option             | Best for                                    | Default stack                                        |
| ------------------ | ------------------------------------------- | ---------------------------------------------------- |
| Cloudflare Workers | Cheap global hosting, almost no maintenance | D1 + R2                                              |
| Docker / Node.js   | Self-hosting on your own server             | SQLite or Postgres + S3 (recommended) or local media |

Cloudflare Workers is a first-class target because it can keep your blog running for a long time at basically no cost. A personal site should be cheap to keep alive. That matters more than it sounds.

That said, Jant isn't locked to any one runtime. If you'd rather run it on your own server, you can. SQLite, Postgres, Docker — all of it works.

## What Jant Has

- **Three post formats**: note, link, and quote — each a genuine first-class thing, not a workaround
- **Threads**: reply to your own posts when an idea needs a follow-up without becoming an essay
- **Collections**: group posts by topic — not tags, more like a curated shelf
- **Rich attachments**: images, video, audio, code blocks, documents — all in the same flow
- **Ratings**: rate the books, films, or articles you write about and keep that record on your site
- **Themes and fonts**: change how the site looks without turning it into a template marketplace
- **RSS feeds, archive pages, search**: so the site is actually browsable
- **Full API**: automate publishing, run imports, maintain your content without touching a UI
- **Export to Zola**: leave with your content anytime

## Hosted Option

I'd encourage you to self-host if you can. It's not complicated, and it keeps things simple on your end.

But I understand not wanting to deal with even one more deployment step than necessary. So there's a hosted option.

For now, I'm opening it gradually — mostly for friends, and for people who write to me directly. If that's you, send a note to `owen#jant.me`. I read those myself and can enable access case by case.

Pricing is simple:

|                        |                    |
| ---------------------- | ------------------ |
| One site               | $10.46/year        |
| Each additional site   | $5/year            |
| Included media storage | 10 GB shared       |
| Upgraded storage       | 50 GB for $25/year |

That base price isn't arbitrary. Years ago I wrote on my blog that I liked the feel of a `.com` domain price — low enough to be friendly, high enough to be real, in that small zone where it feels like you got away with something. When Cloudflare started offering `.com` registrations at cost with no markup, that became the obvious anchor. So that's what I used.

Most people will never come close to the 10 GB storage limit. But if you do, the upgrade path is there.

## Getting Started

If you're new here, read in this order:

1. [Getting Started](getting-started.md)
2. [Writing and Organizing Posts](writing-and-organizing.md)
3. One deployment guide: [Deploy on Cloudflare](deployment.md) or [Deploy with Docker](deployment-docker.md)
4. [Configuration](configuration.md)

Then as needed:

- [Export and Import](export-and-import.md)
- [Backups and Recovery](backups.md)
- [Theming](theming.md)
- [API Reference](API.md)
