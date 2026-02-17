# Create a release for all packages

Create a changeset and prepare a release commit for `@jant/core` and `create-jant` (fixed versioning — both packages always release together).

## Steps

1. Run `mise run changeset-status` to check if there are already pending changesets.
2. Ask the user what kind of version bump this release is: **patch**, **minor**, or **major**. Show them a summary of unreleased changes (commits since last tag) using `git log $(git describe --tags --abbrev=0)..HEAD --oneline` to help them decide.
3. Run `mise run changeset` — this is interactive. When prompted:
   - Select **both** packages (`@jant/core` and `create-jant`)
   - Use the bump type the user chose
   - Write a clear, concise summary of the changes for the changelog
4. Run `mise run version` to apply the changeset and bump versions.
5. Stage and commit all changed files (changeset files, `package.json`, `CHANGELOG.md`) with message: `release: v{version}`
6. Report the new version and remind the user to push and let CI handle publishing.

## Rules

- **Both packages always release together** — they use `fixed` versioning.
- **Never run `mise run release` or `mise run release-local`** — publishing is handled by CI after the release PR is merged.
- **Always show the user what changed** before asking for bump type.
