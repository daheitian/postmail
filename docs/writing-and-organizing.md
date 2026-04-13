# Writing and Organizing Posts

Jant keeps the publishing model intentionally small. You write posts, connect them into threads when needed, and group them into collections when that helps readers browse.

## Post Formats

### Note

Use a note for original writing.

- A note can be short or long
- A title is optional
- If a note has a title, Jant uses it to generate the URL slug
- If it does not have a title, Jant generates a short random slug

Use notes for journal entries, essays, status updates, or image-led posts.

### Link

Use a link post when the destination matters as much as your commentary.

- `url` is the key field
- `title` is optional
- Your own text can live in the body

Use link posts for articles, videos, tools, podcasts, or anything else you want to point people toward.

### Quote

Use a quote post for cited text.

- `quoteText` stores the quoted passage
- `sourceName` stores the attribution
- `sourceUrl` is optional but useful when a source exists online

Use quote posts for book notes, interview excerpts, or references you want to keep separate from your own prose.

## Attachments

Posts can include attachments in a fixed order.

- Media attachments for images, video, audio, and documents such as PDFs
- Text attachments for additional markdown content blocks, including pasted code and notes that should stay attached to the post

The attachment list belongs to the post. Reordering attachments changes how the post is presented everywhere.

## Ratings

Posts can carry an optional 1 to 5 rating.

Use ratings when you want to keep a lightweight record of how you felt about:

- books
- films
- articles
- albums
- anything else you review on your own site

Ratings stay attached to the post instead of disappearing into a third-party service.

## Threads

Threads are self-replies. Each reply belongs to the same thread as the root post.

Key rules:

- Visibility follows the root post
- You cannot pin a reply directly
- Featured state is independent, so a reply can be featured even if the root post is not

Use threads when you want to keep a sequence of thoughts together without collapsing everything into one post.

## Collections

Collections are curated groupings of posts under `/{slug}`.

Use them for:

- Ongoing topics
- Reading lists
- Travel logs
- Project journals
- Themed selections from older posts

Collections have their own pages and feeds. They are better than tags when you want editorial control.

You can also combine collections in the URL. For example:

- `/collections/reading+movies`
- `/collections/notes+links+quotes`

Jant treats that as one combined view across multiple collections.

- It shows the union of posts from all included collections
- Shared threads are deduped, so the same thread does not appear twice
- The same pattern works for feeds at `/collections/{slug1}+{slug2}/feed`

## Visibility and Curation

### Publishing States

| State              | Appears on Latest | Appears in collections | Needs login |
| ------------------ | ----------------- | ---------------------- | ----------- |
| Public             | Yes               | Yes                    | No          |
| Hidden from Latest | No                | Yes                    | No          |
| Private            | No                | No for public visitors | Yes         |
| Draft              | No                | No                     | Yes         |

### Featured

Featured is a separate curation flag.

- Featured posts appear on the Featured page
- Featured feeds live at `/feed/featured`
- The main `/feed` URL can point to either Featured or Latest
- By default, `/feed` points to Featured, not Latest

Use Featured for your best work, an editor's pick, or the small set of posts you want subscribers to receive by default.

### Why the Default Feed Is Featured

Jant is built around the idea that publishing a post and broadcasting a post are not the same action.

In the default setup:

- **Featured** posts go into `/feed`
- **Public** posts can still appear on the site and in `/feed/latest`
- **Hidden from Latest** posts stay published, but do not appear in Latest

This gives you a useful middle ground:

- publish something on your site
- keep it visible by direct link
- place it in a collection
- continue a thread
- avoid pushing it into the default subscriber feed

That is one of Jant's core editorial choices, not a secondary settings trick.

### Default Behavior at a Glance

This table assumes the default configuration where `MAIN_RSS_FEED=featured`.

| Post state          | Direct URL | Latest | Default `/feed` | Collections |
| ------------------- | ---------- | ------ | --------------- | ----------- |
| Public and featured | Yes        | Yes    | Yes             | Yes         |
| Public              | Yes        | Yes    | No              | Yes         |
| Hidden from Latest  | Yes        | No     | No              | Yes         |
| Private             | Login only | No     | No              | Login only  |
| Draft               | No         | No     | No              | No          |

If you later switch `MAIN_RSS_FEED` to `latest`, the default `/feed` behavior changes, but `Hidden from Latest` still keeps those posts out of that stream.

## URLs and Browse Pages

Jant uses readable URLs:

- Posts use `/{slug}`
- Collections use `/{slug}`
- Combined collection views use `/collections/{slug1}+{slug2}+{slug3}`
- Search lives at `/search`
- Archive lives at `/archive`
- Featured lives at `/featured`

Feeds:

- `/feed` uses your configured main feed
- `/feed/latest` always returns the latest public posts
- `/feed/featured` always returns featured posts
- `/{slug}/feed` returns a collection feed
- `/collections/{slug1}+{slug2}/feed` returns a combined collection feed

## Keyboard Shortcuts

Shortcuts are available on any page when the cursor is not inside an input field, editor, or open dialog.

### Creating Posts

| Key | Action         |
| --- | -------------- |
| `N` | New note       |
| `L` | New link post  |
| `Q` | New quote post |

If you are viewing a collection page, the new post is automatically added to that collection.

### Working with Posts

These shortcuts apply to the post you are viewing or hovering over.

| Key | Action                |
| --- | --------------------- |
| `R` | Reply (add to thread) |
| `E` | Edit post             |
| `C` | Add to collection     |
| `F` | Toggle featured       |

### Command Palette

| Key                | Action               |
| ------------------ | -------------------- |
| `Cmd+K` / `Ctrl+K` | Open command palette |

Inside the palette:

- Type to filter pages and posts
- Prefix with `>` to run a command
- Prefix with `?` to search

## Choosing Between Thread, Collection, and Featured

Use a thread when posts are part of one conversation.

Use a collection when posts share a topic but were not written as a sequence.

Use featured when you want extra visibility and default feed distribution.
