# Identity Model

This document defines the long-term identity boundary for a site-aware Jant
core and a future hosted control plane.

The main rule is simple:

- Platform identity lives in `jant-cloud`
- Site permissions live in `@jant/core`

## Goals

- Keep self-hosted identity independent from any hosted control plane
- Support future multi-member sites
- Avoid mixing billing/platform concerns with site content permissions
- Keep a clean path to future hosted SSO without requiring duplicate signup

## Layers

### Core Identity

Core identity is the identity model required to operate one or more sites
inside a single Jant core instance.

Core tables:

- `user`
- `account`
- `session`
- `verification`
- `site_member`

### Platform Identity

Platform identity is the identity model for `jant-cloud`.

Future platform tables:

- `cloud_user`
- `cloud_account`
- `cloud_session`

Platform tables do not belong in `@jant/core`.

## Core User Model

`user` is global within one core instance.

Rules:

- one `user` may belong to multiple sites
- one site may have multiple users
- site-specific permissions are not stored on `user`

Do not add a required `site_id` column to `user`.

That would force the wrong cardinality and make future team support harder.

## Site Membership

`site_member` is the source of truth for site access.

Recommended shape:

- `site_id`
- `user_id`
- `role`
- `created_at`
- `updated_at`

Recommended roles:

- `owner`
- `admin`
- `editor`

Permission checks in core should always flow through membership, not through a
global `user.role`.

## Self-Hosted Behavior

For self-hosted mode:

- one default site is created automatically
- setup creates the first `user`
- setup creates one `site_member` row with role `owner`

Nothing in self-hosted mode depends on `jant-cloud`.

## Hosted Behavior

Hosted mode should not require users to sign up twice.

The user experience should be:

1. Sign in to `jant-cloud`
2. Create or open a site
3. Enter the site admin without a second registration form

This does not mean core and cloud share the same tables. It means the platform
hands off authenticated site access to core.

## Future Hosted SSO Shape

Core should be prepared for a future internal login handoff.

Recommended future flow:

1. `jant-cloud` authenticates the platform user
2. `jant-cloud` checks the user has access to a site
3. `jant-cloud` issues a short-lived signed token
4. Browser is redirected to the site's core app
5. Core verifies the token
6. Core finds or creates the corresponding `user`
7. Core verifies or creates the correct `site_member`
8. Core creates its own local session cookie

The core app should never depend on a cloud cookie being valid on the site
domain.

## Linking Core Users to Future Platform Users

Core should avoid adding hosted-only columns to `user` if the existing auth
model can represent the link.

Recommended approach:

- reuse the `account` table to store a future hosted identity mapping

Example:

- `provider_id = "credential"` for self-hosted email/password login
- `provider_id = "jant-cloud"` for hosted platform linkage
- `account_id = <cloud_user_id>` for the platform subject

This keeps `user` generic and uses the auth provider mapping table for what it
already represents.

## Why Team Support Belongs in Core

Site collaboration is a content-system concern, not a billing or platform-only
concern.

Reasons:

- self-hosted installations may also want multiple site members
- site export/import boundaries stay cleaner
- platform identity should not be required to authorize a local site action
- site permissions should be enforceable even without `jant-cloud`

Therefore:

- site teams belong in `site_member`
- platform staff and billing roles belong in `jant-cloud`

## Current Single-Author Assumptions That Must Change

The current core codebase assumes one admin per instance.

This must change in the site-aware redesign:

- registration can no longer be defined as "first user only"
- account deletion can no longer mean "wipe the entire blog"
- site ownership and site deletion must become site-scoped concepts

Recommended direction:

- deleting a user account removes that user's memberships and sessions
- deleting a site is a separate owner-only operation
- a site should never be left without an owner unless explicitly suspended or
  transferred

## Minimum Schema Work Required Now

This redesign phase should add:

- `site_member`

This redesign phase should preserve:

- `user`
- `account`
- `session`
- `verification`

This redesign phase should remove:

- hard assumptions that the first and only user is the site owner forever

## Decisions Locked By This Document

- Core users are global within one core instance
- Site access is defined by `site_member`
- Future hosted identity links should reuse `account` rather than adding a
  hosted-only user column first
- Team support is a core concern, not a cloud-only concern
- Product UX should remain single-signup even though core and cloud identities
  are logically separate
