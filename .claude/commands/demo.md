# Generate a visual demo proving the current work

Create a Showboat demo document with Rodney screenshots to demonstrate
that the feature or fix you just built actually works. The document is
streamed in real-time to a remote datasette-showboat instance via the
`SHOWBOAT_REMOTE_URL` environment variable.

## Steps

1. Run `uvx showboat --help` and `uvx rodney --help` to learn current usage.
2. Verify `SHOWBOAT_REMOTE_URL` is set. If not, stop and ask the user to configure it.
3. Determine the demo filename from the current branch name (e.g., `feat-login` → `/tmp/demos/feat-login.md`).
4. Create `/tmp/demos/` directory if it doesn't exist.
5. Use `showboat init` to create (overwrite) the demo file. This assigns a UUID and streams the title to the remote instance.
6. Start rodney, navigate to the relevant pages, interact with the feature, and take screenshots to `/tmp/`.
7. Use showboat commands (`note`, `exec`, `image`) to assemble the demo. Each command automatically streams to the remote instance. Do NOT edit the .md file directly.
8. Stop rodney and the dev server when done.
9. Report the remote viewer URL so the user can open it in a browser. The URL format is `{SHOWBOAT_REMOTE_URL_origin}/-/showboat/{showboat-id}` (extract the UUID from the `<!-- showboat-id: ... -->` line in the demo file).

## Rules

- **All output to `/tmp/`** — never write demo files or images into the project directory.
- **Always overwrite** — the demo reflects final state only, not debug history.
- **All evidence must be real** — screenshots and command outputs from actual execution. Never fabricate.
- **Use `mise run dev-debug`** (port 19019) if you need a running dev server for screenshots.
- **Stop the dev server** when the demo is complete.
