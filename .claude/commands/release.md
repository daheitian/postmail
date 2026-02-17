# Create a changeset for releasing all packages

Create a changeset file for `@jant/core` and `create-jant` (fixed versioning — both packages always release together). This ONLY creates the changeset file — it does NOT bump versions, modify package.json, or update CHANGELOG.md.

## Steps

1. Run `mise run changeset-status` to check if there are already pending changesets.
2. Show the user a summary of unreleased changes (commits since last tag) using `git log $(git describe --tags --abbrev=0)..HEAD --oneline`. Ask what kind of version bump: **patch** (default), **minor**, or **major**. If the user doesn't specify, use **patch**.
3. Run `mise run changeset` — this is interactive. When prompted:
   - Select **both** packages (`@jant/core` and `create-jant`)
   - Use the bump type the user chose
   - Write a clear, concise summary of the changes for the changelog
4. Stage and commit ONLY the new changeset file (the `.changeset/*.md` file) with message: `chore: add changeset`
5. Report done. Remind the user to create a PR — version bumps and publishing are handled by CI.

## Rules

- **Both packages always release together** — they use `fixed` versioning.
- **ONLY create the changeset file** — NEVER run `mise run version`, `mise run release`, or `mise run release-local`. Version bumping, CHANGELOG generation, and publishing are all handled by CI.
- **Do NOT modify** `package.json`, `CHANGELOG.md`, or any file other than the new `.changeset/*.md` file.
- **Always show the user what changed** before asking for bump type.
