# Jant - Development Guide

## Critical Rules

- **BaseCoat components first**: Use BaseCoat semantic CSS classes (`.alert`, `.btn`, `.badge`, `.card`, `.input`, `.field`) instead of manually composing Tailwind utilities. Use Tailwind only for layout (flex, grid, gap), spacing (p, m), and typography (text-size, font-weight) not covered by BaseCoat. See `references/basecoat/` for available components.
- **BaseCoat button variants are standalone classes**: Each variant (`.btn-outline`, `.btn-secondary`, `.btn-ghost`, `.btn-destructive`, `.btn-link`) is a complete, self-contained class. NEVER combine them with `.btn` (e.g., `class="btn btn-outline"` is WRONG). Use `class="btn-outline"` directly. The `.btn` class alone means the primary variant.
- **Node.js version: 24** - Always use Node 24 LTS. Do NOT use older versions (20, 22).
- **Tests are required**: Every new feature, bug fix, or logic change MUST include corresponding tests. Run `mise run test` before considering any task complete.
- **Verify before changing**: Never assume CLI flags, API options, or library interfaces exist based on training data. Always run `--help`, check docs, or test the command BEFORE making changes.
- **Latest package versions**: Always use `@latest` when installing. Do NOT use outdated versions from training data.
- **Vite for everything**: Use `vite dev` / `vite build` / `vite preview`. NEVER run `wrangler dev` or custom build scripts. @cloudflare/vite-plugin handles Workers integration.
- **Use mise tasks**: Wrap all dev commands in mise. Never require `cd` - use `dir` parameter.
- **NEVER edit `packages/create-jant/template/` directly**: Auto-generated from `templates/jant-site` during publish. Use `@create-jant` markers for monorepo vs. user project differences.
- **NO auto-publishing**: Do NOT run publish commands. User handles releases via `mise run version` and `mise run release`.
- **Debug port**: Use `mise run dev-debug` (port 19019) for testing, leaving 9019 free.
- **Stop dev after debugging**: Stop background processes when done so user can restart manually.
- **Manual workflow triggers**: Always add `workflow_dispatch:` to GitHub Actions.

## Commands

```bash
# Development
mise run dev                # Start dev server (auto-runs migrations)
mise run dev-debug          # Dev server on port 19019 (for Claude debugging)
mise run typecheck
mise run lint
mise run format

# Testing
mise run test
mise run test:watch
mise run test:coverage

# Build & Deploy
mise run build
mise run deploy
mise run preview

# Database
mise run db-generate        # Generate Drizzle migrations
mise run db-migrate         # Apply migrations (dev auto-runs this)
mise run db-export
mise run db-seed
mise run db-clean
mise run db-reset

# Demo
mise run demo-export
mise run demo-seed
mise run demo-reset

# i18n (pre-commit hook auto-handles extraction/compilation)
mise run i18n               # Extract + AI translate + compile
mise run i18n-extract
mise run i18n-compile
mise run translate          # AI translate (needs OPENAI_API_KEY)

# Release (Changesets) - see docs/RELEASING.md
mise run changeset
mise run cs:status
mise run version
mise run release
mise run release:dry

# Utilities
mise run clean
mise run nuke               # Remove node_modules and reinstall
mise run fresh              # Nuclear reset - delete everything and start fresh
mise run reset-password

# Worktrees
mise run draft feat/name    # Create feature worktree (../feat-name/)
mise run review feat/name   # Create review worktree from remote branch
mise run trash feat-name    # Remove worktree directory (keeps branch)
mise run wt-list            # List all worktrees
mise run import name        # Move project from ~/Inbox/ into workspace
```

## Project Structure

```
packages/core/              # Library (@jant/core) - pure library, no vite/wrangler config
├── src/
│   ├── index.ts            # Entry point (exports createApp)
│   ├── app.tsx             # Hono app factory
│   ├── types.ts            # Single source of truth for types
│   ├── db/                 # Drizzle schema & migrations
│   ├── services/           # Business logic (service layer)
│   ├── routes/             # Route handlers (xxxRoutes naming)
│   ├── ui/                 # Components, layouts, pages, feed
│   ├── styles/             # CSS tokens (tokens.css) + component styles (ui.css)
│   ├── lib/                # Utilities (100% JSDoc documented)
│   ├── i18n/               # Internationalization
│   └── middleware/         # Hono middleware

templates/jant-site/        # Development + demo site (has vite.config.ts + wrangler.toml)
packages/create-jant/       # CLI scaffolding (template/ is auto-generated, never edit)
```

## Tech Stack

- **Runtime**: Cloudflare Workers | **Framework**: Hono (v4) | **Build**: Vite + SWC + @cloudflare/vite-plugin
- **CSS**: Tailwind CSS v4 + BaseCoat | **Database**: D1 + Drizzle ORM | **Auth**: better-auth
- **i18n**: @lingui/core + @lingui/swc-plugin | **Interactions**: Datastar v1.0.0-RC.7 (vendored)
- **Validation**: Zod | **Code Quality**: ESLint + Prettier + husky + lint-staged

## Architecture

### Type System

- All type definitions live in `types.ts` (single source of truth)
- Use `const` assertions for enums: `POST_TYPES = [...] as const`
- Export derived types: `type PostType = (typeof POST_TYPES)[number]`
- Zod schemas in `lib/schemas.ts` import constants from `types.ts` for runtime validation

### Routes

- Use `xxxRoutes` suffix: `postsRoutes`, `homeRoutes`, `dashIndexRoutes`

### Service Layer

- All database operations go through `src/services/`
- Services are stateless and accept database connection

### Package Architecture

- `packages/core`: Pure library - NOT for direct development or deployment
- `templates/jant-site`: Monorepo dev/test environment with `@jant/core` alias for HMR
- `packages/create-jant/template`: Auto-generated from `templates/jant-site` during publish

**`@create-jant` markers** in `templates/jant-site`:

```toml
account_id = "abc123" # @create-jant: @remove
name = "jant-site" # @create-jant: "${name}"
// @create-jant: @remove-start
"@jant/core": resolve(__dirname, "../../packages/core/src"),
// @create-jant: @remove-end
```

### Worktrees

The project uses git worktrees for parallel development. Each worktree is a sibling directory of `main/` (e.g., `../feat-login/`, `../fix-auth/`). Worktrees share the same git history but have independent working directories and `node_modules`. Use `mise run draft` to create, `mise run trash` to remove.

### Code Quality

- **TypeScript**: Strict mode, no `any` types, all exports typed
- **ESLint**: Zero warnings policy
- **Prettier**: Auto-format via pre-commit hook
- **i18n auto-sync**: Pre-commit hook auto-runs `i18n:build` when `.ts`/`.tsx` files are staged

## Testing

**Every change must include tests. No exceptions.**

### Framework & Helpers

- **Vitest** (v4) - configured in `packages/core/vitest.config.ts`
- **better-sqlite3** - in-memory SQLite for service integration tests

```typescript
// In-memory database for service tests
import { createTestDatabase } from "../../__tests__/helpers/db.js";
const { db } = createTestDatabase(); // without FTS
const { db } = createTestDatabase({ fts: true }); // with FTS5 for search tests

// Test Hono app with real services for route tests
import { createTestApp } from "../../__tests__/helpers/app.js";
const { app, services } = createTestApp({ authenticated: true });
app.route("/api/posts", postsApiRoutes);
const res = await app.request("/api/posts");
```

### What to Test

- **`lib/` functions**: Input/output, edge cases, boundary values
- **`services/`**: CRUD operations, business logic, relationships (use `createTestDatabase()`)
- **`routes/api/`**: HTTP status codes, request validation, auth enforcement (use `createTestApp()`)
- **`middleware/`**: Auth redirect/401 behavior, error handling

### Rules

1. Each test gets a fresh database - use `beforeEach` with `createTestDatabase()` for isolation
2. Don't test third-party libraries (better-auth internals, Drizzle ORM, etc.)
3. Don't test JSX rendering - no DOM testing, focus on logic
4. Tests are colocated in `__tests__/` directories next to source files
5. Shared test helpers live in `src/__tests__/helpers/`
6. Run `mise run test` before finishing any task

## Internationalization (i18n)

```tsx
import { useLingui } from "@/i18n";
const { t } = useLingui();
return <h1>{t({ message: "Dashboard", comment: "@context: Page title" })}</h1>;
```

- All user-facing strings use `t()`, always include `comment` with `@context:` prefix
- Site-wide language setting from database (`settings.SITE_LANGUAGE`), defaults to "en" - NOT per-user
- **Workflow**: Add `t()` -> commit -> pre-commit hook auto-runs extract + compile. Manual `mise run i18n` only needed for AI translation.
- **DO NOT change `@lingui/react/macro` to `@lingui/macro`** in source - the SWC plugin rewrites `@lingui/react/macro` imports to `@jant/core/i18n` at build time. This is intentional because Lingui's SWC plugin only recognizes `@lingui/react/macro`. See `src/i18n/README.md` for details.

## Datastar

**Version: v1.0.0-RC.7** (vendored in `src/vendor/datastar.js`). See `references/datastar/` for full API docs, `docs/datastar.md` for patterns.

### Key Rules

- **Loading states required**: Every form with `@post`/`@put`/`@patch`/`@delete` MUST use `data-indicator` + `data-attr-disabled` on the submit button
- `@post` sends non-private signals as JSON body; use `_` prefix for private signals (not sent to server)
- Define signals on parent element containing all children that need access
- Use `throwIfNamespace: false` in SWC config for colon syntax (`data-on:click`)
- For complex interactions (file uploads), use plain JS instead of Datastar
- Prefer `dsRedirect`/`dsToast`/`dsSignals` over `sse()` for single-event responses
- Use `sse()` only when you need multiple operations in one response

### Server Response Helpers

```typescript
import { dsRedirect, dsToast, dsSignals } from "@/lib/sse";

return dsRedirect("/dash/posts"); // redirect
return dsToast("Settings saved."); // success toast
return dsToast("Something went wrong.", "error"); // error toast
return dsSignals({ _uploadError: "File too large" }); // signal patch
```

## Configuration

**Two-tier system**: user-configurable settings (DB > ENV > Default) and environment-only settings (ENV > Default). All fields defined in `CONFIG_FIELDS` (`types.ts`).

- **User-configurable** (`envOnly: false`): `SITE_NAME`, `SITE_DESCRIPTION`, `SITE_LANGUAGE` - editable in `/dash/settings`
- **Environment-only** (`envOnly: true`): `SITE_URL`, `AUTH_SECRET`, `R2_PUBLIC_URL`, etc.

```typescript
import { getSiteName, getConfig } from "@/lib/config";
const siteName = await getSiteName(c); // DB > ENV > "Jant"
const value = await getConfig(c, "SITE_NAME"); // generic type-safe getter
```

- **NEVER add feature flags or site settings to `createApp()`** - use env vars or database
- **DO use `createApp()` for**: CSS variable overrides, custom color themes, custom feed renderers

See `docs/configuration.md` for full details on configuration files, priority, and best practices.

## CSS & Theming

- One built-in UI; customization is CSS-only via design tokens (`styles/tokens.css`)
- Data attributes (`data-page`, `data-post`, `data-format`, etc.) are a **stable public API** for CSS targeting - do not rename/remove without a major version bump
- Users can inject custom CSS via Dashboard > Settings > Appearance
- Never hardcode colors, fonts, spacing, or radii - always use tokens

See `docs/theming.md` for the full customization architecture, data attributes reference, and CSS priority chain.

## Key Conventions

1. **Configuration**: Environment variables first (see Configuration section)
2. **Services**: All DB operations go through service layer
3. **Types**: Single source of truth in `types.ts`, Zod for validation
4. **Time**: Unix timestamps (seconds), use `lib/time.ts` utilities
5. **IDs**: Sqids for URLs (`/p/jR3k`), integers in DB
6. **Soft delete**: Posts use `deleted_at` field
7. **Routes**: Use `xxxRoutes` naming convention
8. **Components**: Extract when pattern repeats 3+ times
9. **Lib functions**: 100% JSDoc with `@param`, `@returns`, `@example`
10. **Releasing**: Changesets workflow - see `docs/RELEASING.md`
