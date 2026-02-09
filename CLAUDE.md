# Jant - Development Guide

## Development Principles

**Core Principle: Simplicity and Best Practices**

This is an open source project. Code quality and maintainability are paramount.

1. **Use best practices over custom solutions**
   - Prefer standard tools and patterns from the ecosystem
   - Use established libraries correctly - don't reinvent the wheel
   - Follow official documentation and community standards

2. **Keep code simple and readable**
   - Simple code > clever code
   - Clear intent > maximum abstraction
   - Rethink overly complex solutions

3. **Avoid unnecessary abstraction**
   - Use standard tools instead of custom scripts
   - Use library features as intended
   - Question solutions that require "working around" tools

4. **Reuse and compose**
   - Extract components when patterns repeat 3+ times
   - Compose from small, focused components
   - Keep components single-purpose and well-documented

5. **Vite for everything**
   - **Development**: `vite dev` (NOT `wrangler dev`)
   - **Build**: `vite build` (NOT custom scripts)
   - **Preview**: `vite preview`
   - @cloudflare/vite-plugin handles Cloudflare Workers integration

## Critical Rules

- **BaseCoat components first**: Use BaseCoat semantic CSS classes (`.alert`, `.btn`, `.badge`, `.card`, `.input`, `.field`) instead of manually composing Tailwind utilities. Use Tailwind only for layout (flex, grid, gap), spacing (p, m), and typography (text-size, font-weight) not covered by BaseCoat. See `references/basecoat/` for available components.
- **Node.js version: 24** - Always use Node 24 LTS. Do NOT use older versions (20, 22).
- **Verify before changing**: Never assume CLI flags, API options, or library interfaces exist based on training data. Always run `--help`, check docs, or test the command BEFORE making changes. Training data may be outdated or incorrect.
- **Latest package versions**: Always use `@latest` when installing. Do NOT use outdated versions from training data.
- **Use mise tasks**: Wrap all dev commands in mise. Never require `cd` - use `dir` parameter.
- **Manual workflow triggers**: Always add `workflow_dispatch:` to GitHub Actions.
- **Stop dev after debugging**: Stop background processes when done so user can restart manually.
- **Debug port**: Use `mise run dev-debug` (port 19019) for testing, leaving 9019 free.
- **NO auto-publishing**: Do NOT run publish commands. User handles releases via `mise run version` and `mise run release`.
- **NEVER edit `packages/create-jant/template/` directly**: This directory is auto-generated from `templates/jant-site` during publish. Edit `templates/jant-site` and use `@monorepo-only` / `@user-project-only` markers for monorepo vs. user project differences. See Package Architecture section for details.

## Quick Reference

```bash
# Development
mise run dev          # Start Vite dev server (auto-runs migrations first)
mise run dev-debug    # Start dev server on port 19019 (for Claude debugging)
mise run typecheck    # Run TypeScript checks (strict mode)
mise run lint         # Run ESLint
mise run format       # Format code with Prettier

# Build & Deploy
mise run build        # Build with Vite
mise run deploy       # Build + deploy to Cloudflare Workers
mise run preview      # Preview production build with Vite

# Database
mise run db-generate  # Generate Drizzle migrations
mise run db-migrate   # Apply migrations (local D1) - usually not needed, dev auto-runs this

# i18n
mise run i18n         # Extract + compile translations
mise run i18n-extract # Extract messages from source
mise run i18n-compile # Compile PO files to JS
mise run translate    # Auto-translate using AI (needs OPENAI_API_KEY)

# Release (Changesets)
mise run changeset    # Create a changeset for your changes
mise run cs:status    # Check pending changesets
mise run version      # Apply changesets (bump versions)
mise run release      # Publish packages to npm
mise run release:dry  # Dry run publish

# First-time Publish (manual, before Trusted Publishing)
mise run publish:core   # Publish @jant/core to npm
mise run publish:create # Publish create-jant to npm

# Utilities
mise run clean          # Clean build artifacts (dist, .wrangler)
mise run nuke           # Remove node_modules and reinstall
mise run fresh          # Nuclear reset - delete everything and start fresh
mise run db-clean       # Delete local D1 database (.wrangler)
mise run db-reset       # Delete database and re-run migrations
mise run reset-password # Generate password reset link (local)
```

**Important Notes:**

- **`mise run dev` auto-runs migrations** - You don't need to manually run `db-migrate` before starting development
- **`mise run fresh` for fresh start** - After running this, just do `mise run dev` (migrations included)
- **Database is auto-migrated** - Both `dev` and `dev-debug` run migrations before starting the server

## Package Architecture

**Core principle: `packages/core` is a pure library - NOT for direct development or deployment.**

| Package                         | Purpose                                 | Has Vite/Wrangler? |
| ------------------------------- | --------------------------------------- | ------------------ |
| `packages/core`                 | Pure library - exports components/utils | ❌ No              |
| `templates/jant-site`           | Development + testing + deployment      | ✅ Yes             |
| `packages/create-jant/template` | User project starter template           | ✅ Yes             |

### `packages/core` (Library)

**Includes**: Source (`src/`), build config (`.swcrc`, `tsconfig.build.json`), quality tools (`eslint.config.js`), DB migrations, i18n extraction.

**Excludes**: ~~`vite.config.ts`~~, ~~`wrangler.toml`~~, ~~`src/style.css`~~, ~~`tailwind.config.ts`~~ (development happens in jant-site).

### `templates/jant-site` (Development environment)

**Purpose**: Develop/test `@jant/core` in monorepo, demo site, deployment to Cloudflare.

**Monorepo-only feature**: `vite.config.ts` has alias `"@jant/core": "../../packages/core/src"` for HMR.

### `packages/create-jant/template` (User template)

**IMPORTANT: This directory is auto-generated - DO NOT manually edit files here!**

The `template/` directory is generated from `templates/jant-site` during `prepublishOnly`:

1. **Copy**: `pnpm copy-template` copies `templates/jant-site` → `packages/create-jant/template`
2. **Transform**: `pnpm prepare-template` (script) + runtime (in `src/index.ts`) transforms files:
   - Remove `@monorepo-only-start/end` blocks
   - Keep `@user-project-only-start/end` content (remove markers only)
   - Merge tsconfig.json (remove extends, inline parent config)
   - Replace `@jant/core/src/*.ts` → `@jant/core/dist/*.js`

**When adding new config that differs between monorepo and user projects:**

Use marker comments in `templates/jant-site`:

```typescript
// Example: vite.config.ts
resolve: {
  alias: {
    // @monorepo-only-start
    "@jant/core": resolve(__dirname, "../../packages/core/src"),
    "@lingui/react/macro": resolve(__dirname, "../../packages/core/src/i18n/index.ts"),
    // @monorepo-only-end
    // @user-project-only-start
    "@lingui/react/macro": "@jant/core/i18n",
    // @user-project-only-end
  }
}
```

The `@monorepo-only` block is removed for user projects, `@user-project-only` content is kept.

## Project Structure

```
packages/core/              # Library (@jant/core)
├── src/
│   ├── index.ts           # Entry point (exports createApp)
│   ├── preset.css         # CSS preset (basecoat + @source auto-scan)
│   ├── app.tsx            # Hono app factory
│   ├── types.ts           # Single source of truth for types
│   ├── db/                # Drizzle schema & migrations
│   ├── services/          # Business logic (service layer)
│   ├── routes/            # Route handlers (xxxRoutes naming)
│   ├── theme/             # UI (components, layouts)
│   ├── lib/               # Utilities (100% JSDoc documented)
│   ├── i18n/              # Internationalization
│   └── middleware/        # Hono middleware

templates/jant-site/        # Development + demo site
├── src/
│   ├── style.css          # CSS entry (@import)
│   ├── client.ts          # Client JS entry
│   └── app.ts             # App entry
├── vite.config.ts         # Vite config (monorepo alias)
└── wrangler.toml          # Cloudflare config

packages/create-jant/       # CLI scaffolding
└── template/              # User project template (no alias)
```

### Reusable Components (`src/theme/components/`)

**CRUD**: CrudPageHeader, EmptyState, ListItemRow, ActionButtons, DangerZone
**Badges**: TypeBadge, VisibilityBadge
**Forms**: PostForm, PageForm
**Display**: PostList, ThreadView, Pagination

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (v4)
- **Build**: Vite + SWC + @cloudflare/vite-plugin
- **CSS**: Tailwind CSS v4 (@tailwindcss/vite) + BaseCoat
- **Database**: D1 + Drizzle ORM
- **Auth**: better-auth
- **i18n**: @lingui/core + @lingui/swc-plugin (macros)
- **Interactions**: Datastar v1.0.0-RC.7 (vendored in `src/vendor/datastar.js`)
- **Code Quality**: ESLint + Prettier + husky + lint-staged
- **Validation**: Zod

### Build Process

**All workflows use Vite - never run `wrangler dev` or custom build scripts.**

- **Development**: `vite dev` → port 9019, HMR, reads `.dev.vars`
- **Build**: `vite build` → Worker code to `dist/jant/`, client assets to `dist/client/`
- **Deploy**: `vite build && wrangler deploy`

### CSS Architecture

**Problem**: Tailwind v4 ignores `node_modules` by default.

**Solution**: Use `@source "./"` in `@jant/core/preset.css` to auto-scan core package.

```css
/* @jant/core/src/preset.css */
@source "./"; /* Scans @jant/core/src/ */
@import "basecoat-css";
```

```css
/* User's src/style.css */
@import "tailwindcss";
@import "@jant/core/preset.css"; /* Auto-brings @source scanning */
```

**Key**: `@source` path resolves relative to CSS file location - works in both monorepo and npm installs. No `tailwind.config.ts` needed.

## Architecture Conventions

### 1. Type System

**Single Source of Truth: `types.ts`**

- All type definitions live in `types.ts`
- Use `const` assertions for enums: `POST_TYPES = [...] as const`
- Export derived types: `type PostType = (typeof POST_TYPES)[number]`

**Validation: `lib/schemas.ts`**

- Zod schemas import constants from `types.ts`
- Used only for runtime validation (forms, API requests)
- Example: `PostTypeSchema = z.enum(POST_TYPES)`

### 2. Route Naming

**Convention: Use `xxxRoutes` suffix consistently**

```typescript
// ✅ Correct
export const postsRoutes = new Hono<Env>();
export const homeRoutes = new Hono<Env>();
export const dashIndexRoutes = new Hono<Env>();

// ❌ Incorrect (inconsistent)
export const postRoute = new Hono<Env>();
export const homeroute = new Hono<Env>();
```

### 3. Service Layer

- All database operations go through services
- Services are stateless and accept database connection
- Located in `src/services/`
- Export both service functions and types

### 4. Component Reuse

**When to extract a component:**

- Pattern repeats 3+ times across files
- Component has single, clear responsibility
- Benefits code consistency and maintenance

**Component guidelines:**

- Use TypeScript interfaces for props
- Add JSDoc comments for complex components
- Export both component and prop types
- Keep components focused and composable

### 5. Utility Functions

- Located in `src/lib/`
- **100% JSDoc documentation coverage**
- Include `@param`, `@returns`, and `@example` tags
- Pure functions when possible
- Thorough TypeScript typing

## Code Quality Standards

### TypeScript

- Strict mode enabled
- No `any` types (use proper types or `unknown`)
- All exports are typed
- 100% type coverage

### ESLint

- Zero errors policy
- Warnings are acceptable for console.log, non-null assertions (with comments)
- Configuration in `eslint.config.js`

### Prettier

- Auto-format on save
- Pre-commit hook formatting
- Configuration in `.prettierrc`

### Pre-commit Hooks

- **husky**: Git hooks management
- **lint-staged**: Format staged files
- Runs: ESLint --fix + Prettier --write

## Internationalization (i18n)

```tsx
import { useLingui } from "@/i18n";
const { t } = useLingui();
return <h1>{t({ message: "Dashboard", comment: "@context: Page title" })}</h1>;
```

**Language Detection**: Site-wide setting from database (`settings.SITE_LANGUAGE`), defaults to "en". NOT per-user - all visitors see the same language.

**Rules**: All user-facing strings use `t()`, always include `comment` with `@context:` prefix.

**Workflow**: Add `t()` → `mise run i18n-extract` → `mise run translate` (AI, optional) → `mise run i18n-compile`

### Lingui + Hono JSX Integration (IMPORTANT)

**Why source code uses `@lingui/react/macro` (even though we don't use React):**

Jant uses **Hono JSX** (not React), but Lingui's SWC plugin only recognizes imports from `@lingui/react/macro` and `@lingui/macro`. We use a clever workaround:

```typescript
// Source code (what Lingui SWC plugin sees)
import { useLingui } from "@lingui/react/macro";

// ↓ SWC compiles and rewrites imports ↓

// Runtime code (what actually executes)
import { useLingui } from "@jant/core/i18n";
```

**How it works:**

```typescript
// vite.config.ts / .swcrc
{
  plugins: [
    [
      "@lingui/swc-plugin",
      {
        runtimeModules: {
          useLingui: ["@jant/core/i18n", "useLingui"], // Rewrite import path
          trans: ["@jant/core/i18n", "Trans"],
        },
      },
    ],
  ];
}
```

**Vite configuration:**

```typescript
// Exclude @lingui/react from Vite's dependency scanner
optimizeDeps: {
  exclude: ['@lingui/react'],
}
```

**DO NOT change `@lingui/react/macro` to `@lingui/macro`** - the SWC rewrite is intentional.

See `src/i18n/README.md` for details.

## Datastar Usage

**Version: v1.0.0-RC.7** (vendored in `src/vendor/datastar.js`). See `references/datastar/` for full docs.

### Core Concepts

- **Signals**: `data-signals="{title: '', _loading: false}"` (use `_` prefix for private)
- **Binding**: `data-bind="title"` for two-way form binding
- **Actions**: `data-on:submit__prevent="@post('/url')"` for server communication
- **Display**: `data-show="$_loading"` for conditional rendering
- **Expressions only**: Use `x && fn()` not `if (x) fn()` in attributes

### Form Pattern

```tsx
<form
  data-signals={JSON.stringify({ title: "" })}
  data-on:submit__prevent="@post('/dash/posts')"
>
  <input data-bind="title" class="input" />
  <div id="form-message"></div>
  <button type="submit" class="btn">
    Save
  </button>
</form>
```

### Server Response

**Default: Use non-SSE helpers** for single-operation responses (most cases):

```typescript
import { dsRedirect, dsToast, dsSignals } from "@/lib/sse";

// Redirect (Datastar detects text/html → patch-elements)
return dsRedirect("/dash/posts");

// Redirect with cookie forwarding (e.g. auth)
return dsRedirect("/dash", { headers: { "Set-Cookie": cookie } });

// Toast notification
return dsToast("Settings saved successfully.");
return dsToast("Something went wrong.", "error");

// Signal patch (Datastar detects application/json → patch-signals)
return dsSignals({ _uploadError: "File too large" });
```

**SSE: Only when you need multiple operations** in one response:

```typescript
import { sse } from "@/lib/sse";

return sse(c, async (stream) => {
  await stream.patchElements('<div id="msg">Success!</div>');
  await stream.toast("Saved!");
});
```

### Key Rules

- `@post` sends non-private signals as JSON body
- Define signals on parent element containing all children that need access
- Use `throwIfNamespace: false` in SWC config for colon syntax (`data-on:click`)
- For complex interactions (file uploads), use plain JS instead of Datastar
- Prefer `dsRedirect`/`dsToast`/`dsSignals` over `sse()` for single-event responses

## Configuration Strategy

**Core Principle: Separate Runtime Config from Build-time Customization**

Following the [12-factor app methodology](https://12factor.net/config), Jant strictly separates:

### 1. Runtime Configuration (Environment Variables)

Jant uses a **two-tier configuration system** with different priority modes:

**Configuration Types:**

1. **User-Configurable** (`envOnly: false` → **Database > Environment > Default**)
   - `SITE_NAME`, `SITE_DESCRIPTION`, `SITE_LANGUAGE`
   - Users can modify these in `/dash/settings`
   - Environment variables serve as **initial/default values**
   - Database values take precedence (user's choice is final)

2. **Environment-Only** (`envOnly: true` → **Environment > Default**)
   - `SITE_URL`, `AUTH_SECRET`, `R2_PUBLIC_URL`, `IMAGE_TRANSFORM_URL`, `DEMO_EMAIL`, `DEMO_PASSWORD`
   - Infrastructure/deployment config and optional features
   - Cannot be modified in dashboard
   - Only set via environment variables or Cloudflare secrets

**Configuration Registry - Single Source of Truth:**

All configuration fields are defined in `CONFIG_FIELDS` (types.ts):

```typescript
export const CONFIG_FIELDS = {
  // User-configurable (can be modified in dashboard)
  SITE_NAME: {
    defaultValue: "Jant",
    envOnly: false, // DB > ENV > Default
  },

  // Environment-only (deployment/infrastructure)
  SITE_URL: {
    defaultValue: "",
    envOnly: true, // ENV > Default
  },
  // ...
} as const;

export type ConfigKey = keyof typeof CONFIG_FIELDS;
```

**Adding New Configuration:**

To add a new config field, simply add it to `CONFIG_FIELDS`:

```typescript
// Want to allow UI configuration for R2 URL?
R2_PUBLIC_URL: {
  defaultValue: "",
  envOnly: false, // Change from true to false
},
```

**Usage:**

```typescript
// Use unified config helpers (lib/config.ts)
import {
  getSiteName,
  getSiteDescription,
  getSiteLanguage,
  getConfig,
} from "@/lib/config";

// For user-configurable configs:
const siteName = await getSiteName(c); // DB > ENV > "Jant"

// For environment-only configs:
const siteUrl = c.env.SITE_URL; // ENV only

// Generic getter (type-safe):
const value = await getConfig(c, "SITE_NAME"); // ConfigKey type ensures safety
```

**Where to configure:**

- **Non-sensitive values**: `wrangler.toml` `[vars]` section (committed to git)
- **Secrets (sensitive)**: `.dev.vars` file (local, not committed) or `wrangler secret put` (production)
- **Runtime override**: Dashboard settings (stored in DB)

**Configuration File Principles:**

Following Cloudflare Workers best practices:

1. **`wrangler.toml [vars]`** - Non-sensitive environment variables (committed to git)
   - Public configuration values that differ per deployment
   - Example: `SITE_URL`, `SITE_NAME`, `R2_PUBLIC_URL`, `IMAGE_TRANSFORM_URL`
   - Should include all optional variables as commented examples for discoverability

2. **`.dev.vars.example`** - Only sensitive secrets template (committed to git)
   - Template for secrets that should NEVER be committed
   - Example: `AUTH_SECRET`
   - Users copy to `.dev.vars` and fill in actual values

3. **`.dev.vars`** - Actual secrets for local development (NOT committed, in .gitignore)
   - Contains real secret values
   - Auto-generated by `create-jant` CLI with secure random values

4. **Production secrets** - Set via `wrangler secret put` or Cloudflare dashboard
   - Never stored in version control or configuration files
   - Managed through Cloudflare's secret management system

### 2. Build-time Customization (Code Config)

Use `createApp({ ... })` parameters ONLY for things that require compilation:

- **Theme components**: UI component overrides
- **CSS customization**: Theme variables and styles
- **Build-time extensions**: Things that must be bundled

```typescript
// ✅ Correct usage
export default createApp({
  theme: {
    components: {
      PostCard: MyCustomPostCard, // Requires compilation
    },
  },
});

// ❌ NEVER do this
export default createApp({
  site: { name: "My Blog" }, // ❌ Use env vars instead
  features: { search: false }, // ❌ Use env vars instead
});
```

**Configuration Priority Table:**

| Setting          | envOnly | Priority           | Database | Environment | Default            | Dashboard Editable |
| ---------------- | ------- | ------------------ | -------- | ----------- | ------------------ | ------------------ |
| Site Name        | false   | DB > ENV > Default | ✅       | ✅          | `"Jant"`           | ✅ Yes             |
| Site Description | false   | DB > ENV > Default | ✅       | ✅          | `"A microblog..."` | ✅ Yes             |
| Site Language    | false   | DB > ENV > Default | ✅       | ✅          | `"en"`             | ✅ Yes             |
| Site URL         | true    | ENV > Default      | ❌       | ✅          | `""`               | ❌ No              |
| Auth Secret      | true    | ENV > Default      | ❌       | ✅          | `""`               | ❌ No              |

**Important Rules:**

1. **NEVER add feature flags to `createApp()`** - all features (search, RSS, sitemap) are enabled by default. If you need to disable features, use Cloudflare Workers routing rules or environment variables.
2. **NEVER add site settings to `createApp()`** - they belong in environment variables or the database.
3. **DO use `createApp()` for theme/UI customization** - components and styles need to be compiled.

## Key Conventions

1. **Configuration**: Environment variables first (see Configuration Strategy above)
2. **Services**: All DB operations go through service layer
3. **Types**: Single source of truth in `types.ts`, Zod for validation
4. **Time**: Unix timestamps (seconds), use `lib/time.ts` utilities
5. **IDs**: Sqids for URLs (`/p/jR3k`), integers in DB
6. **Soft delete**: Posts use `deleted_at` field
7. **Routes**: Use `xxxRoutes` naming convention consistently
8. **Components**: Extract when pattern repeats 3+ times

## Releasing

Uses [Changesets](https://github.com/changesets/changesets) for version management. See `docs/RELEASING.md` for details.

**Workflow**: Make changes → `mise run changeset` → Open PR → Merge → Auto-created Release PR publishes to npm.

**Packages**: `@jant/core` (framework), `create-jant` (scaffolding CLI).

## Local Development

Dev server on port 9019, accessible via localhost, network IP, or custom domain (Caddy reverse proxy to `local.jant.me`).

**Required in `.dev.vars`**: `AUTH_SECRET=your-secret-at-least-32-chars`

### Quick Start

```bash
# First time or after fresh clone
mise run fresh          # Nuclear reset (optional, only if needed)
mise run dev            # Start dev server (auto-runs migrations)
```

**Important**: `mise run dev` automatically runs database migrations before starting the server, so you don't need to manually run `mise run db-migrate`.
