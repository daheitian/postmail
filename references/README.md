# References

Third-party source code checked in as read-only reference for AI agents (Claude Code).
These are NOT runtime dependencies - they exist so the agent can look up API docs and component examples without web access.

## Contents

| Directory              | Source                                              | Version    | Commit    |
| ---------------------- | --------------------------------------------------- | ---------- | --------- |
| `basecoat/`            | https://github.com/hunvreus/basecoat                | 0.3.10     | `713c163` |
| `datastar/`            | https://github.com/starfederation/datastar          | 1.0.0-RC.7 | `812cbe9` |
| `lingui-po-translate/` | https://github.com/theowenyoung/lingui-po-translate | 1.0.10     | `9af94cf` |

## Updating

```bash
# Remove old version and clone fresh (from project root)
rm -rf references/basecoat
git clone --depth 1 https://github.com/hunvreus/basecoat.git references/basecoat
rm -rf references/basecoat/.git

rm -rf references/datastar
git clone --depth 1 https://github.com/starfederation/datastar.git references/datastar
rm -rf references/datastar/.git

rm -rf references/lingui-po-translate
git clone --depth 1 https://github.com/theowenyoung/lingui-po-translate.git references/lingui-po-translate
rm -rf references/lingui-po-translate/.git
```

After updating, update the version and commit in the table above.
