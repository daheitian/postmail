# Quick visual check

Take a screenshot of the page the user describes and show it.

## Steps

1. Run `uvx rodney --help` to learn current usage.
2. Start rodney if not already running (`uvx rodney status` to check).
3. If a dev server is needed, start it with `mise run dev-debug` (port 19019).
4. Navigate to the requested page on `http://localhost:19019/`.
5. Wait for the page to stabilize (`rodney waitstable`).
6. Take a screenshot to `/tmp/look-screenshot.png` (overwrite if exists).
7. Read the screenshot image file so the user can see it inline.
8. Stop rodney and the dev server when done.

## Rules

- **Screenshots to `/tmp/` only** — never write images into the project directory.
- **Always read the image** — use the Read tool on the screenshot so it displays in the client.
- **Stop processes when done** — stop rodney and kill the dev server after the check.
