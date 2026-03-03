# Jant - Development Guide

## What is Jant

Jant (short for Jantelagen) is a personal microblogging system — self-hosted, single-author, and stripped of all social mechanics. No followers, no likes, no algorithmic feed. It combines Tumblr-style multi-format posts (notes, links, quotes), Threads-style threading for connected thoughts, and curated Collections to organize content by topic. Just a clean space for one person to think out loud.

It runs on Cloudflare Workers with minimal infrastructure. The UI follows an "Organic Minimalism" aesthetic: generous whitespace, single-column layout, smooth animations, mobile-first. Content comes in three formats — Note (), Link (shared reference), Quote (cited text) — organized through Threads and Collections.

The project is in **pre-1.0 development**. Breaking changes are expected and welcome when they improve the design. Always follow best practices over minimal-change conservatism. Update all references in the same change and document what changed in the commit message.

## Development Philosophy

These principles explain _why_ the codebase is structured the way it is. When you encounter a situation not covered by a specific rule, use these to guide your judgment.

- **Challenge before complying**: when the user proposes an approach that conflicts with best practices or this document, push back with a clear explanation of the trade-offs and ask for confirmation before proceeding. Silently following a suboptimal instruction is worse than a brief discussion.

- **Separation of concerns**: routes handle HTTP, services own business logic and all DB access, UI renders data. Each layer should be replaceable without affecting the others. Module dependency direction: `routes → services → db`, `routes → viewmodels → ui`. Detailed rules in `docs/internal/coding-standards.md`.

- **Routes are thin adapters**: a route handler should only parse/validate the request, call one or more service methods, and format the response. Multi-service orchestration (e.g. "delete a post and clean up its media files") belongs in the service layer, not in routes. **Litmus test**: if two routes need the same sequence of service calls, that sequence must be extracted into a service method. Cross-cutting concerns like storage file cleanup are passed to services via optional dependency parameters (e.g. `storage?: StorageDriver | null`) rather than being handled in routes.

- **Type safety as communication**: TypeScript strict mode with no `any` and fully typed exports prevents silent contract drift between layers. When a service return type changes, the compiler should catch every consumer.

- **Tokens and components over raw values**: CSS tokens (`styles/tokens.css`) and BaseCoat semantic classes (`.alert`, `.btn`, `.badge`, `.card`, `.input`, `.field`) encode design decisions in one place. Hardcoding a color or spacing value means it can't evolve with the theme. See `docs/theming.md` and `references/basecoat/`.

- **Cohesion over small files**: organize code by responsibility and keep related logic together. A well-structured 400-line file is better than four fragmented 100-line files that constantly import each other.

- **Strict boundaries, free internals**: validate and convert at boundaries (HTTP entry, DB queries). Once data is inside a layer, trust the types.

- **Data flows down**: DB → Service → ViewModel → Component. Never in the other direction.

- **Fail fast**: missing required config should crash at startup with a clear error, not silently degrade at runtime.

- **Keyboard-first interactions**: every dialog, panel, and overlay must support standard keyboard shortcuts — `Escape` to close/cancel, `Enter` to confirm the primary action, `Tab` for focus navigation. Never rely solely on mouse/touch. Note that `<dialog>` native cancel events may not fire when inner elements (e.g. TipTap/ProseMirror) intercept `Escape` at the keydown level; always handle keyboard events directly on the component in addition to native dialog events.

### Hard Constraints

Non-negotiable regardless of context:

- **No DB in routes**: routes must never contain direct DB calls, raw SQL, or import DB drivers. All data access goes through `src/services/`.
- **No business logic in routes**: routes must not orchestrate multi-service operations, coordinate side effects, or duplicate logic that belongs in a service. If two routes would need the same logic, it must live in a service method.
- **Relative imports only**: no `@/` path aliases anywhere in the codebase.
- **Data attributes with care**: `data-page`, `data-post`, `data-format`, etc. are consumed by themes and external scripts. Design them thoughtfully and update all references when changing.

## Working with the Codebase

### Tooling

- **Use mise tasks** for all commands (`mise tasks` to list). Never run `wrangler dev`; use `mise run dev` / `mise run build`.
- **Debug**: `mise run dev-debug` (port `19020`). Stop background processes when done.
- **Verify before changing**: never assume CLI flags; confirm with `--help` or docs.
- **Latest packages**: use `@latest` when installing.
- **Generated template is read-only**: never edit `packages/create-jant/template/`.
- **GitHub Actions**: always add `workflow_dispatch:`.
- **After every change**: run `mise run test`, then `mise run lint`, and fix all issues.

### Conventions

- `packages/core`: library + dev environment (Vite HMR). `sites/demo`: demo site + user template source (via `@create-jant` annotations).
- **Types**: public exports in `src/types.ts`; definitions in `src/types/`.
- **Schemas**: shared domain schemas in `src/lib/schemas.ts`; route-specific schemas colocated with routes.
- **Routes**: `xxxRoutes` suffix (`postsRoutes`, `dashIndexRoutes`).
- **Time**: Unix timestamps (seconds) via `lib/time.ts`. **IDs**: Sqids for URLs (`/p/jR3k`), integers in DB.
- **Soft delete**: posts use `deleted_at`.
- **Library functions**: include JSDoc with `@param`, `@returns`, `@example`.

### i18n

All user-facing strings use `t()` with a `@context:` comment for translators:

```tsx
import { useLingui } from "@lingui/react/macro";

const { t } = useLingui();
return <h1>{t({ message: "Dashboard", comment: "@context: Page title" })}</h1>;
```

### Tech Stack

Cloudflare Workers, Hono v4, Vite + SWC, Tailwind v4 + BaseCoat, D1 + Drizzle ORM, better-auth, @lingui/core, Datastar v1.0.0-RC.7 (vendored — version matters, APIs vary between releases), Lit (Web Components), Zod, ESLint + Prettier

## UX Copy Guidelines

All user-facing text follows a consistent voice. When writing or reviewing copy, apply these rules.

### Voice & Tone

- Write like a knowledgeable friend — warm but not cute, confident but not arrogant.
- Use plain English. If you can say it in 5 words, don't use 10.
- Avoid filler words: "please", "simply", "just", "easily", "feel free to".
- Never say "successfully" — if it worked, the user knows.

### Empty States

- Never show "No [thing] found" or "No [thing] yet" alone. Always pair it with a next action or brief reason the space is empty.
- Good: `"Nothing published yet. Write your first post to get started."`
- Bad: `"No posts."`

### Buttons & CTAs

- Verb-first, action-specific labels. Avoid generic text.
- Good: `"Publish"`, `"Write your first post"`, `"Delete Media"`
- Bad: `"Submit"`, `"OK"`, `"Confirm"`

### Error Messages

- Always tell the user (1) what went wrong, (2) what they can do about it. Never blame the user.
- Good: `"Wrong email or password. Check your credentials and try again."`
- Bad: `"Invalid input"`

### Success & Confirmation

- Acknowledge the action briefly. Don't say "Success" or "[action] successfully."
- Good: `"Post published."`, `"Settings updated."`, `"Password changed."`
- Bad: `"Operation completed successfully."`

### Destructive Actions

- Be specific about what will be lost. Make it irreversible-sounding if it is.
- Good: `"Delete this post permanently? This can't be undone."`
- Bad: `"Are you sure?"`

### Settings Descriptions

- Describe what a setting **does**, not what it **is**.
- Good: `"Hide this post from search engines and RSS feeds"`
- Bad: `"Visibility: Private"`

## Reference

If you notice code contradicting this document, think about which side is correct, then update whichever is wrong.

### Common Pitfalls

- Combining `.btn` with variant classes (`.btn-outline`, `.btn-ghost`, etc.) — BaseCoat variants are self-contained and combining produces broken styles.
- Importing from `@lingui/react` instead of `@lingui/react/macro` — the macro enables compile-time message extraction.
- Editing `packages/create-jant/template/` — this is auto-generated and will be overwritten.
- Putting multi-service orchestration in route handlers — if two routes need the same sequence of service calls, extract it into a service method. Routes should be thin adapters: parse request → call service → format response.

### Docs Index

- **Coding standards** (module deps, error handling, testing): `docs/internal/coding-standards.md`
- **Lit/Datastar conventions**: `docs/internal/lit-guide.md`
- **Testing guide**: `docs/internal/testing-guide.md`
- **Datastar patterns and API**: `docs/datastar.md`, `references/datastar/`
- **BaseCoat components**: `references/basecoat/`
- **Configuration**: `docs/configuration.md`
- **Theming and CSS tokens**: `docs/theming.md`
- **Releasing**: `docs/RELEASING.md`
- **Developer onboarding**: `README.md`, `mise tasks`
