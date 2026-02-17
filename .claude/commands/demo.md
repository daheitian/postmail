# Generate a visual demo proving the current work

Create a Showboat demo document with Rodney screenshots to demonstrate
that the feature or fix you just built actually works.

## Steps

1. Run `uvx showboat --help` and `uvx rodney --help` to learn current usage.
2. Create `.demos/` directory if it doesn't exist.
3. Determine the demo filename from the current branch name (e.g., `feat-login` → `.demos/feat-login.md`).
4. Use `showboat init` to create (overwrite) the demo file.
5. Start rodney, navigate to the relevant pages, interact with the feature, and take screenshots.
6. Use showboat commands (`note`, `exec`, `image`) to assemble the demo. Do NOT edit the .md file directly.
7. Stop rodney when done.
8. Report: "Demo generated: `.demos/{name}.md`"

## Rules

- **Always overwrite** — the demo reflects final state only, not debug history.
- **All evidence must be real** — screenshots and command outputs from actual execution. Never fabricate.
- **Use `mise run dev-debug`** (port 19019) if you need a running dev server for screenshots.
- **Stop the dev server** when the demo is complete.
