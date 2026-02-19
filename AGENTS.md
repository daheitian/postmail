# Jant - Development Guide

## Critical Rules

- **BaseCoat components first**: Use BaseCoat semantic CSS classes (`.alert`, `.btn`, `.badge`, `.card`, `.input`, `.field`) instead of Tailwind utilities. Tailwind only for layout, spacing, and typography not covered by BaseCoat. See `references/basecoat/`.
- **BaseCoat button variants are standalone**: `.btn-outline`, `.btn-secondary`, `.btn-ghost`, `.btn-destructive`, `.btn-link` are self-contained. NEVER combine with `.btn` (e.g., `class="btn btn-outline"` is WRONG).
- **Node.js 24** - Do NOT use older versions.
- **Tests required**: Every feature, fix, or logic change MUST include tests. Run `mise run test` before finishing.
- **Verify before changing**: Never assume CLI flags or API options exist. Run `--help` or check docs first.
- **Latest packages**: Always `@latest` when installing.
- **Vite only**: NEVER run `wrangler dev`. Use mise tasks (`mise run dev` / `mise run build`).
- **Use mise tasks**: All dev commands via mise. Run `mise tasks` to see available commands.
- **NEVER edit `packages/create-jant/template/`**: Auto-generated from `templates/jant-site`.
- **Releasing**: Only publish via the `/release` command. Never run publish/release commands ad-hoc.
- **Debug port**: Use `mise run dev-debug` (port 19019), not `mise run dev`.
- **Stop dev after debugging**: Stop background processes when done.
- **GitHub Actions**: Always add `workflow_dispatch:` trigger.
- **DO NOT change `@lingui/react/macro` to `@lingui/macro`** in source.
- **NEVER add feature flags or site settings to `createApp()`** - use env vars or database.
- **Data attributes are stable public API**: Don't rename/remove `data-page`, `data-post`, `data-format`, etc. without major version bump.
- **CSS tokens**: Never hardcode colors, fonts, spacing, or radii - use tokens in `styles/tokens.css`.
- **Organic Minimalism**: All UI must follow the Soft UI design language — soft corners, gentle shadows, generous whitespace, muted colors, minimal noise. See `docs/theming.md` for full guidelines.

## Tech Stack

Cloudflare Workers, Hono v4, Vite + SWC, Tailwind v4 + BaseCoat, D1 + Drizzle ORM, better-auth, @lingui/core, Datastar v1.0.0-RC.7 (vendored), Lit (Web Components), Zod, ESLint + Prettier

## Architecture

- `packages/core`: Pure library (not runnable). `templates/jant-site`: Dev environment. `packages/create-jant/template`: Auto-generated (never edit).
- **Types**: All definitions in `types.ts`. Zod schemas in `lib/schemas.ts`.
- **Routes**: Use `xxxRoutes` suffix (`postsRoutes`, `dashIndexRoutes`).
- **Services**: All DB operations go through `src/services/`.
- **Time**: Unix timestamps (seconds), use `lib/time.ts`.
- **IDs**: Sqids for URLs (`/p/jR3k`), integers in DB.
- **Media URLs from storage keys**: `getMediaUrl(storageKey, publicUrl?)` is the only way to build media URLs. Proxy and CDN use the same path (`/media/YYYY/MM/uuid.ext`) — only the domain differs. Never store a media ID just to look up a storage key for URL construction; store the storage key directly (e.g., `SITE_AVATAR` stores `storageKey`, not media ID).
- **Soft delete**: Posts use `deleted_at` field.
- **Lib functions**: 100% JSDoc with `@param`, `@returns`, `@example`.
- **TypeScript**: Strict mode, no `any`, all exports typed.

## Lit Web Components

Lit handles high-complexity client components (complex data staging, high-frequency state, third-party lib wrappers). Datastar remains the default for server-driven state, simple toggles, and SSE streams.

- **When to use Datastar vs Lit**: Datastar for server-driven state, simple toggles, SSE; Lit for high-frequency client state, complex data staging (e.g., compose dialog), third-party library wrappers.
- **Light DOM only**: Override `createRenderRoot() { return this; }`. No Shadow DOM, no `static styles`. BaseCoat and Tailwind classes work directly.
- **Data flow**: Hono renders `<jant-xxx attr="...">` with initial data as attributes. Lit receives via static `properties`. Output via `jant:`-prefixed CustomEvents (e.g., `jant:submit`, `jant:change`).
- **No fetch() inside Lit**: Components emit events only. Datastar or other server-communication layers handle network requests.
- **State**: Use static `properties` with `{ type: String }` for attributes, `{ state: true }` for internal reactive state. Plain class fields for non-reactive data.
- **Static properties pattern** (not decorators): Avoids SWC decorator config issues. Use `static properties = { ... }` with `declare` field declarations. This is a first-class Lit pattern.
- **classMap**: Use `classMap()` from `lit/directives/class-map.js` for dynamic classes.
- **disconnectedCallback**: Always clean up event listeners, timers, and observers.
- **Naming**: `<jant-xxx>` element tags, `jant:xxx` custom events, files in `src/ui/components/`.
- **SSR fallback**: Server renders a skeleton or static content inside the custom element tag. Lit upgrades it on hydration.
- **300-line max**: Split large components into sub-components (e.g., `<jant-compose-dialog>` → `<jant-compose-editor>`, `<jant-compose-toolbar>`).

```typescript
// Example Lit component pattern
import { LitElement, html } from "lit";
import { classMap } from "lit/directives/class-map.js";

export class JantExample extends LitElement {
  static properties = {
    label: { type: String },
    _active: { state: true },
  };

  declare label: string;
  declare _active: boolean;

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.label = "";
    this._active = false;
  }

  render() {
    return html`<div class=${classMap({ active: this._active })}>
      ${this.label}
    </div>`;
  }
}

customElements.define("jant-example", JantExample);
```

## Principles

- **File-level readability**: Any single file should be understandable without jumping elsewhere. 300-line max, single responsibility.
- **Strict boundaries, free internals**: Validate and type-convert at system boundaries (HTTP entry, DB). Internal code trusts clean data.
- **Data flows down**: DB → Service → ViewModel → Component. Each layer depends only on the layer above; never reach back.
- **Fail fast & loud**: Missing config? Error at startup with a clear message. Never defer to a cryptic runtime error.
- **Smooth upgrades**: DB migrations run automatically and are forward-compatible. Config keys are append-only. `git pull` + redeploy = done.

## Testing

Vitest v4, configured in `packages/core/vitest.config.ts`. Tests colocated in `__tests__/` next to source.

```typescript
// Service tests - in-memory SQLite
import { createTestDatabase } from "../../__tests__/helpers/db.js";
const { db } = createTestDatabase(); // without FTS
const { db } = createTestDatabase({ fts: true }); // with FTS5

// Route tests - test Hono app
import { createTestApp } from "../../__tests__/helpers/app.js";
const { app, services } = createTestApp({ authenticated: true });
app.route("/api/posts", postsApiRoutes);
const res = await app.request("/api/posts");
```

Each test gets a fresh database via `beforeEach`. Don't test third-party internals or JSX rendering.

## Dev Login

After `mise run db-seed`, the database has user/account rows but the password hash is from an export and unusable. Run `mise run dev-password <password>` to set a known password via better-auth's `hashPassword()`. Credentials after setup:

- **Email**: `demo@jant.me`
- **Password**: whatever you passed to `dev-password`
- **Login page**: `/signin` → then `/dash` for the dashboard
- **Remote sessions**: `scripts/setup-remote.sh` auto-runs `db-seed` + `dev-password testtest`, so credentials are `demo@jant.me / testtest`

## i18n

```tsx
import { useLingui } from "@/i18n";
const { t } = useLingui();
return <h1>{t({ message: "Dashboard", comment: "@context: Page title" })}</h1>;
```

All user-facing strings use `t()` with `comment` including `@context:` prefix. Pre-commit hook auto-runs extract + compile.

## Worktrees

This project uses git worktrees for parallel development. Each worktree is a sibling directory (e.g., `../feat-login/`). Use `mise run draft feat/name` to create, `mise run trash feat-name` to remove, `mise run wt-list` to list.

## Reference Docs

- Datastar patterns & API: `docs/datastar.md`, `references/datastar/`
- Configuration: `docs/configuration.md`
- Theming & CSS: `docs/theming.md`
- Releasing: `docs/RELEASING.md`
