# Contributing to Jant

Thanks for your interest in contributing to Jant! This guide covers everything you need to get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Commands Reference](#commands-reference)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Database](#database)
- [Internationalization (i18n)](#internationalization-i18n)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- [mise](https://mise.jdx.dev/) — manages Node.js (v24) and pnpm automatically

```bash
# Install mise (macOS/Linux)
curl https://mise.run | sh
```

### Getting Started

```bash
# Clone the repo
git clone https://github.com/jant-me/jant.git
cd jant

# Install toolchain (Node.js + pnpm, versions defined in mise.toml)
mise install

# Install dependencies
pnpm install

# Start development server (http://localhost:9019)
mise run dev
```

`mise run dev` automatically runs database migrations before starting the server — no manual migration step needed.

### Environment Setup

Create `.dev.vars` in `packages/core/`:

```
AUTH_SECRET=your-secret-at-least-32-chars
```

You can also copy `.dev.vars.example` and fill in the values.

## Project Structure

```
jant/
├── packages/
│   ├── core/                  # @jant/core — main framework library
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point (exports createApp)
│   │   │   ├── preset.css     # CSS preset (basecoat + @source auto-scan)
│   │   │   ├── app.tsx        # Hono app factory
│   │   │   ├── types.ts       # Single source of truth for types
│   │   │   ├── db/            # Drizzle schema & migrations
│   │   │   ├── services/      # Business logic (service layer)
│   │   │   ├── routes/        # Route handlers
│   │   │   ├── theme/         # UI (components, layouts)
│   │   │   ├── lib/           # Utilities
│   │   │   ├── i18n/          # Internationalization
│   │   │   └── middleware/    # Hono middleware
│   │   └── vitest.config.ts
│   └── create-jant/           # create-jant — CLI scaffolding tool
│       └── template/          # ⚠️ Auto-generated, do NOT edit directly
├── templates/
│   └── worker-starter/        # Minimal user template (3 files)
│       ├── index.js           # App entry
│       ├── package.json       # Dependencies
│       └── wrangler.toml      # Cloudflare config
├── docs/                      # Documentation
└── .changeset/                # Changesets for versioning
```

### Packages

| Package                         | Purpose                                   | Has Vite/Wrangler? |
| ------------------------------- | ----------------------------------------- | ------------------ |
| `packages/core`                 | Library + dev environment (Vite HMR)      | Yes                |
| `templates/worker-starter`      | Minimal user template (3 files, no build) | No                 |
| `packages/create-jant/template` | User project starter (auto-generated)     | No                 |

**Important**: Development and testing happens in `packages/core`, which has a Vite dev server with HMR. The `templates/worker-starter` is the minimal template for end users — just `index.js`, `package.json`, and `wrangler.toml`.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (v4)
- **Build**: Vite library mode + SWC + @cloudflare/vite-plugin
- **CSS**: Tailwind CSS v4 + [BaseCoat](https://basecoat.dev)
- **Database**: D1 (SQLite) + Drizzle ORM
- **Auth**: better-auth
- **i18n**: @lingui/core + @lingui/swc-plugin
- **Interactions**: Datastar v1.0.0-RC.7 (vendored)
- **Code Quality**: ESLint + Prettier + husky + lint-staged
- **Validation**: Zod
- **Testing**: Vitest + better-sqlite3 (in-memory)

### Key Architecture Decisions

- **Service layer**: All database operations go through `src/services/`. Services are stateless and accept a database connection.
- **Type system**: All types defined in `types.ts`. Use `const` assertions for enums, Zod schemas in `lib/schemas.ts` for runtime validation only.
- **Route naming**: Always use `xxxRoutes` suffix (e.g., `postsRoutes`, `homeRoutes`).
- **IDs**: Sqids for URLs (`/p/jR3k`), integers in the database.
- **Time**: Unix timestamps (seconds), utilities in `lib/time.ts`.
- **Soft delete**: Posts use a `deleted_at` field.
- **CSS**: Use BaseCoat semantic classes (`.btn`, `.card`, `.input`, etc.) before reaching for Tailwind utilities. Tailwind is for layout, spacing, and typography only.
- **Configuration**: Environment variables for runtime config, `createApp()` only for build-time theme/UI customization.

## Commands Reference

All commands are run via `mise run <command>`. You never need to `cd` into subdirectories.

### Development

```bash
mise run dev              # Start Vite dev server on port 9019 (auto-runs migrations)
mise run dev-debug        # Start dev server on port 19019 (for debugging)
mise run build            # Build @jant/core (lib + client assets)
mise run site-dev         # Build @jant/core + start jant.me dev server
mise run site-deploy      # Build @jant/core + deploy jant.me to Workers
```

### Code Quality

```bash
mise run lint             # Run ESLint
mise run typecheck        # Run TypeScript type checking (all packages)
mise run format           # Format code with Prettier
mise run format-check     # Check formatting without writing
```

### Testing

```bash
mise run test             # Run all tests (must pass before committing)
mise run test:watch       # Run tests in watch mode
mise run test:coverage    # Run tests with coverage report
```

### Database

```bash
mise run db-generate      # Generate Drizzle migrations (from core schema)
mise run db-migrate       # Apply migrations (local D1) — usually not needed, dev auto-runs this
mise run db-export        # Export current local D1 data to seed-local.sql
mise run db-reset         # Reset local database and load dev seed data
mise run db-clean         # Delete local D1 database (.wrangler)
```

### i18n

```bash
mise run i18n             # Extract + AI translate + compile (needs OPENAI_API_KEY)
mise run i18n-extract     # Extract messages from source
mise run i18n-compile     # Compile PO files to JS
mise run i18n-no-translate # Extract and compile only (without AI translation)
mise run translate        # Auto-translate all locales using AI (needs OPENAI_API_KEY)
```

### Release

```bash
mise run changeset        # Create a changeset for your changes
mise run changeset-status # Show pending changesets
mise run version          # Apply changesets (bump versions, generate CHANGELOG)
mise run release          # Build and publish packages to npm (CI only)
mise run release-dry      # Dry run publish
```

### Utilities

```bash
mise run clean            # Clean build artifacts (dist, .wrangler)
mise run nuke             # Remove all node_modules and reinstall
mise run fresh            # Nuclear reset — delete everything and start fresh
mise run reset-password   # Generate password reset link (local)
```

### CI

```bash
mise run ci               # Run all CI checks (lint + typecheck + test + build + i18n + template)
```

## Development Workflow

### Making Changes

1. **Create a branch:**

   ```bash
   git checkout -b feat/my-feature
   ```

2. **Start the dev server:**

   ```bash
   mise run dev
   ```

3. **Make your changes** — edit files in `packages/core/src/` (the library) or `packages/core/` (the dev environment).

4. **Write tests** for any new functionality or bug fixes (see [Testing](#testing)).

5. **Run checks:**

   ```bash
   mise run test && mise run lint && mise run typecheck
   ```

6. **Create a changeset** (if your changes affect published packages):

   ```bash
   mise run changeset
   ```

7. **Commit and push:**

   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feat/my-feature
   ```

The pre-commit hook automatically runs ESLint, Prettier, and i18n extraction/compilation on staged files.

### Worktree Workflow (Optional)

Instead of switching branches, you can use git worktrees to work on multiple features simultaneously. Each worktree is a sibling directory of `main/`:

```
/Users/you/project/jant/
├── main/              # Main worktree (main branch)
├── feat-login/        # Feature worktree
├── fix-auth/          # Bugfix worktree
└── review-feat-login/ # Review worktree
```

#### Creating a Feature Worktree

```bash
mise run draft feat/login         # Creates ../feat-login/ on feat/login branch
mise run draft fix/auth develop   # Creates ../fix-auth/ branched from develop
```

This creates the worktree, copies `.dev.vars`, and runs `pnpm install`.

#### Reviewing a Remote Branch

```bash
mise run review feat/login        # Creates ../review-feat-login/ from origin/feat/login
```

Fetches the latest remote state, creates a worktree, and installs dependencies.

#### Listing Worktrees

```bash
mise run wt-list                  # Lists all git worktrees
```

#### Cleaning Up

```bash
mise run trash feat-login         # Removes ../feat-login/ worktree (keeps the branch)
git branch -d feat/login          # Optionally delete the branch too
```

#### Port Conflicts

Each worktree is a full copy of the project. If you run `mise run dev` in multiple worktrees, you'll get port conflicts. Use `mise run dev-debug` (port 19019) in one of them, or stop one before starting another.

## Testing

Every new feature, bug fix, or logic change must include tests. Run `mise run test` to verify all tests pass.

### Framework

- **Vitest** — configured in `packages/core/vitest.config.ts`
- **better-sqlite3** — in-memory SQLite for service integration tests (matches D1 in production)

### Test Structure

Tests are colocated with source code in `__tests__/` directories:

```
packages/core/src/
├── lib/
│   ├── time.ts
│   └── __tests__/
│       └── time.test.ts          ← unit tests next to source
├── services/
│   ├── post.ts
│   └── __tests__/
│       └── post.test.ts          ← service integration tests
├── routes/api/
│   ├── posts.ts
│   └── __tests__/
│       └── posts.test.ts         ← route handler tests
└── __tests__/helpers/
    ├── db.ts                     ← in-memory SQLite with migrations
    └── app.ts                    ← test Hono app with mock services/auth
```

### What to Test

| Layer                 | What to test                                            | Test helper            |
| --------------------- | ------------------------------------------------------- | ---------------------- |
| `lib/` pure functions | Input/output, edge cases, boundary values               | None needed            |
| `lib/schemas.ts` Zod  | Valid inputs, invalid inputs, error messages            | None needed            |
| `services/`           | CRUD operations, business logic, relationships          | `createTestDatabase()` |
| `routes/api/`         | HTTP status codes, request validation, auth enforcement | `createTestApp()`      |
| `middleware/`         | Auth redirect/401 behavior, error handling              | Hono `app.request()`   |

### Test Helpers

```typescript
// In-memory SQLite database for service tests
import { createTestDatabase } from "../../__tests__/helpers/db.js";
const { db } = createTestDatabase(); // without FTS
const { db } = createTestDatabase({ fts: true }); // with FTS5 for search tests

// Test Hono app with real services for route tests
import { createTestApp } from "../../__tests__/helpers/app.js";
const { app, services } = createTestApp({ authenticated: true });
app.route("/api/posts", postsApiRoutes);
const res = await app.request("/api/posts");
```

### Testing Rules

1. Each test gets a **fresh database** — use `beforeEach` with `createTestDatabase()` for isolation.
2. Test happy paths, edge cases, and error cases.
3. Don't test third-party library internals (better-auth, Drizzle ORM, etc.).
4. Don't test JSX rendering — focus on logic.
5. `mise run test` must pass before submitting a PR.

## Code Style

### General Principles

- **TypeScript strict mode**: No `any` types, all exports are typed.
- **Simple over clever**: Prefer readable code.
- **Single responsibility**: Keep files focused.
- **Zero ESLint warnings**: All warnings must be resolved.

### Naming Conventions

- Routes: `xxxRoutes` (e.g., `postsRoutes`)
- Services: `xxxService` functions
- Components: PascalCase (e.g., `PostList`)

### UI Guidelines

- Use [BaseCoat](https://basecoat.dev) semantic CSS classes (`.btn`, `.card`, `.input`, `.alert`, `.badge`, `.field`) for components.
- Use Tailwind only for layout (flex, grid, gap), spacing (p, m), and typography (text-size, font-weight).
- All user-facing strings must use the i18n `t()` function.

### Documentation

- JSDoc comments for all utility functions in `src/lib/`.
- Include `@param`, `@returns`, and `@example` tags.
- Comments in English.

### Pre-commit Hooks

The project uses **husky** + **lint-staged** to automatically:

- Run ESLint --fix and Prettier --write on staged files.
- Run i18n extract + compile when `.ts`/`.tsx` files are staged (keeps locale files in sync).

## Database

### Migrations

Migrations are managed by Drizzle ORM. The schema lives in `packages/core/src/db/`.

```bash
# After changing the schema:
mise run db-generate      # Generate migration files
mise run dev              # Migrations auto-apply on dev server start
```

You rarely need to run `mise run db-migrate` manually — both `dev` and `dev-debug` auto-apply migrations.

### Seeding (Development Data)

The project includes a workflow for maintaining development seed data:

1. **Set up your data** in the running dev instance (create posts, pages, etc.).

2. **Export the data:**

   ```bash
   mise run db-export
   ```

   This saves the current local D1 data to `packages/core/scripts/seed-local.sql`.

3. **Load seed data** (on a fresh clone or after reset):

   ```bash
   mise run db-reset
   ```

   This resets the local database, runs migrations, clears existing data, and loads `seed-local.sql`.

### Reset

```bash
mise run db-clean         # Delete local D1 database only
mise run fresh            # Nuclear reset — everything (node_modules, dist, db, cache, lockfile)
```

After any reset, just run `mise run dev` — migrations are applied automatically.

## Internationalization (i18n)

Jant uses [Lingui](https://lingui.dev/) for i18n with an SWC plugin for compile-time macro transforms.

### Adding Translatable Strings

Wrap user-facing strings with the `t()` function and always include a context comment:

```tsx
import { useLingui } from "@lingui/react/macro";

const { t } = useLingui();
return <h1>{t({ message: "Dashboard", comment: "@context: Page title" })}</h1>;
```

**Important**: The import from `@lingui/react/macro` is intentional — the SWC plugin rewrites it to `@jant/core/i18n` at compile time, which Vite resolves to source during bundling. Do not change this import path.

### Workflow

The i18n workflow is mostly automatic:

1. Add `t()` calls in your code.
2. Commit — the pre-commit hook automatically extracts and compiles messages, then stages the updated locale files.
3. For AI-powered translation to other languages, run `mise run i18n` (requires `OPENAI_API_KEY`).

### Language

The site language is a site-wide setting (from `settings.SITE_LANGUAGE` in the database), defaulting to `"en"`. It is not per-user — all visitors see the same language.

## Pull Request Process

### Before Submitting

1. Run all checks:

   ```bash
   mise run test && mise run lint && mise run typecheck
   ```

2. If changing published packages, add a changeset:

   ```bash
   mise run changeset
   ```

3. Update documentation if needed.

### PR Guidelines

- Use clear, descriptive titles.
- Reference related issues.
- Include screenshots for UI changes.
- Keep PRs focused on a single concern.

### CI Checks

All PRs must pass:

- ESLint (no errors or warnings)
- TypeScript (no errors)
- Tests (all passing)
- Build (successful)
- i18n catalogs in sync

### Review Process

1. Submit PR to `main` branch.
2. Wait for CI checks to pass.
3. Address review feedback.
4. Merge when approved.

## Release Process

We use [Changesets](https://github.com/changesets/changesets) for version management.

### Creating a Changeset

After making changes that should be released:

```bash
mise run changeset
```

This will prompt you to:

1. Select changed packages
2. Choose bump type (major/minor/patch)
3. Write a change summary

### Version Types (SemVer)

| Type    | When to use                         | Example           |
| ------- | ----------------------------------- | ----------------- |
| `patch` | Bug fixes, typos                    | `1.0.0` → `1.0.1` |
| `minor` | New features (backwards compatible) | `1.0.0` → `1.1.0` |
| `major` | Breaking changes                    | `1.0.0` → `2.0.0` |

### Release Workflow

1. Make changes and create a changeset (`mise run changeset`).
2. Open a PR and merge to `main`.
3. A Release PR is auto-created (or updated) by the bot.
4. Merge the Release PR to publish to npm automatically.

```bash
# Check pending changesets
mise run changeset-status

# Dry run publish (no actual publish)
mise run release-dry
```

For detailed release documentation, see [docs/RELEASING.md](docs/RELEASING.md).

**Packages published**: `@jant/core` (framework), `create-jant` (scaffolding CLI).

## Getting Help

- [GitHub Issues](https://github.com/jant-me/jant/issues) — Bug reports and feature requests
- [Documentation](https://jant.me/docs) — Guides and API reference

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.
