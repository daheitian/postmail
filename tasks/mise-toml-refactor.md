# mise.toml 系统化重构计划

让 `mise.toml` 在"单次代码 × 多执行目标 × 多站点"的维度上变成一个可预测的矩阵，
同时把内联脚本抽到 `scripts/` 下，减少 toml 里的复杂逻辑。

## 原则

1. **不用 `--target` 参数化**——每个目标都有独立命令。宁可冗长也要可打、可补全、可 grep。
2. **命名系统化**——同一动词（migrate / clean / reset / bootstrap / load-demo）必须在
   所有执行目标上对称存在或明确缺席。
3. **别名清零**——只保留 `clean` → `db-wrangler-clean` 一个手打别名，其它（`ci` / `i18n` /
   `test` / `changeset` / `deploy-demo` / `db-local-*` / `db-demo-*` / `db-node-reset` 等）
   **全部删除**。先按标准命名落地，将来手肌肉记忆需要时再手动加回。
4. **复杂 bash 一律抽到 `scripts/`**，toml 里只剩一行 `run = "bash scripts/..."`。
5. **命令风格统一**——`packages/core` 内用 `dir = "packages/core"` + `node ./bin/jant.js`,
   跨包用 `pnpm --filter`；不再混搭。

---

## 1. 执行目标命名（需要你先决定）

现有三个目标命名不对称，`local` 一词被污染（Node 也是 local）：

| 当前前缀      | 含义               |
| ------------- | ------------------ |
| `db-local-*`  | 本地 Wrangler / D1 |
| `db-node-*`   | 本地 Node / SQLite |
| `db-remote-*` | 远端 D1            |

**你来选一个**：

- **方案 A（最小改动）**：保留 `db-local-*` 表示 Wrangler，在 section header 注释里
  明确写"local = local Wrangler/D1"。只改语义不改命令。优点是你的手肌肉记忆不变；
  缺点是"local"仍然语义模糊。
- **方案 B（推荐，系统化）**：
  - `db-local-*` → `db-wrangler-*`（本地 Wrangler/D1）
  - `db-node-*` 保持（本地 Node/SQLite）
  - `db-remote-*` 保持（远端 D1）
  - 后续如果再加 `db-pg-local-*` 也对齐。
- **方案 C**：三者都挂 runtime 名——`db-d1-local-*` / `db-sqlite-*` / `db-d1-remote-*`。
  最严格，但改得最多。

> **决定：方案 B。** `db-local-*` → `db-wrangler-*`，`db-node-*` 与 `db-remote-*` 保持。

---

## 2. DB 任务矩阵（对称化）

每个目标上哪些动词应该存在：

| 动词              | Wrangler (local)                   | Node (local)                                                               | Remote (D1)          |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------- |
| `migrate`         | `db-wrangler-migrate`              | `db-node-migrate`                                                          | `db-remote-migrate`  |
| `clean`           | `db-wrangler-clean`                | `db-node-clean` ⬅ **新增**                                                 | —（远端不自杀）      |
| `bootstrap-shell` | `db-wrangler-bootstrap-shell`      | `db-node-bootstrap-shell` ⬅ **新增**                                       | —                    |
| `load-demo`       | `db-wrangler-load-demo`            | `db-node-load-demo` ⬅ **新增**（现在叫 `db-node-import-demo-site-export`） | —                    |
| `reset`           | `db-wrangler-reset` = rebuild-demo | `db-node-reset` = rebuild-demo                                             | —                    |
| `rehearse-local`  | `db-wrangler-rehearse`             | —                                                                          | `db-remote-rehearse` |

补齐 Node 侧缺失的 `clean` / `bootstrap-shell` / `load-demo`，名字对齐 Wrangler 侧。

**唯一保留的别名**：

- `clean` → `db-wrangler-clean`

**全部删除的别名**（跨所有 section，不只 DB）：

- `ci` (→ `check-ci`)
- `i18n` (→ `i18n-refresh`)
- `test` / `check-tests` 只保留 `check-tests`，删掉 `test` 别名
- `changeset` (→ `release-changeset-create` 改名为 `changeset` 本身，看下一节)
- `deploy-demo` (→ `deploy-demo` 本身就是新标准名，见第 3 节)
- `db-local-migrate` / `db-local-reset` / `db-local-load-demo` / `db-local-load-demo-snapshot` / `db-local-load-demo-content`
- `db-node-reset` / `db-node-load-demo-site-export`
- `db-demo-clear-content` / `db-demo-clean` / `db-demo-bootstrap` / `db-demo-nuke`

---

## 3. 站点任务对称化

三个站点（`demo-source`, `demo`, `content-lab`）目前 task 形状各异。不合并，但
**强制命名对称**。站点前缀直接用 `demo`（不用 `demo-public`），和 `demo-source` 已经
天然区分，和 `jant-demo` 包名一致。

| 动词          | demo-source                 | demo                                                          | content-lab                     |
| ------------- | --------------------------- | ------------------------------------------------------------- | ------------------------------- |
| dev           | `dev-demo-source`           | `dev-demo` ⬅ 改名（现 `dev-demo-public`）                     | `dev-content-lab`               |
| deploy        | `deploy-demo-source`        | `deploy-demo` ⬅ 改名（现 `deploy-demo-public`）               | `deploy-content-lab`            |
| migrate       | `db-demo-source-migrate`    | `db-demo-migrate` ✓ 保持                                      | `db-content-lab-migrate` ⬅ 新增 |
| nuke          | `demo-source-nuke`          | `demo-nuke` ✓ 保持                                            | `db-content-lab-nuke`           |
| clear-storage | `demo-source-clear-storage` | `demo-clear-storage` ⬅ 改名（现 `demo-public-clear-storage`） | —                               |
| bootstrap     | —                           | `demo-bootstrap` ⬅ 改名（现 `demo-public-bootstrap`）         | —                               |
| reset         | `demo-source-reset`         | `demo-rebuild` ⬅ 改名（现 `demo-public-rebuild`）             | —                               |

**`demo` 独有的**（全部去掉 `-public-` 中缀）：

- `demo-public-clear-content` → `demo-clear-content`
- `demo-public-clear-api-tokens` → `demo-clear-api-tokens`
- `demo-public-verify` → `demo-verify`
- `demo-public-import-canonical` → `demo-import-canonical`

**无手打别名**（按原则 3，全删）。

---

## 4. 脚本抽取清单

把 toml 里 15 行以上的内联 bash 全部搬出去。落点：

| 目标脚本                            | 来源 task                                       | 行数 |
| ----------------------------------- | ----------------------------------------------- | ---- |
| `scripts/worktree/draft.sh`         | `draft`                                         | ~35  |
| `scripts/worktree/review.sh`        | `worktree-review`                               | ~30  |
| `scripts/worktree/remove.sh`        | `worktree-remove`                               | ~25  |
| `scripts/worktree/remove-all.sh`    | `worktree-remove-all`                           | ~15  |
| `scripts/example/create.sh`         | `example-create`                                | ~20  |
| `scripts/starter/generate.sh`       | `starter-generate`                              | ~10  |
| `scripts/clean/reset.sh`            | `clean-reset`                                   | ~35  |
| `scripts/site/import.sh`            | `import`                                        | ~15  |
| `scripts/i18n/translate-po.sh`      | `i18n-translate-zh-Hans` + `-zh-Hant` 共用      | 新   |
| `scripts/release/changeset-add.mjs` | `release-changeset-add`（内联 node -e）         | ~10  |
| `scripts/release/publish-local.sh`  | `release-publish-local`（顺便改用 themes 通配） | ~10  |

toml 里对应任务全部改成：

```toml
[tasks.draft]
description = "..."
usage = '''arg "<name>" ... '''
run = 'bash scripts/worktree/draft.sh "$usage_name" "$usage_base"'
```

---

## 5. 其它清理

1. **`release-publish-local`** 硬编码三个主题，改用 `pnpm -r --filter './themes/*' build`。
2. **`i18n-translate-zh-Hans` / `-zh-Hant`**：抽出 `scripts/i18n/translate-po.sh lang`，
   两个 task 各自一行 wrapper。
3. **命令风格统一**：
   - 所有 `cd packages/core && node ./bin/jant.js ...` 改成 `dir = "packages/core"` + `run = "node ./bin/jant.js ..."`。
   - 所有 `pnpm --filter @jant/core ...` 保留（跨包场景）。
4. **section header 改用统一格式**，按读者最常用的从上到下重排：
   ```
   Tools / Dev / Test / Lint / DB (wrangler) / DB (node) / DB (remote) /
   i18n / Preview / Site: demo-source / Site: demo-public / Site: content-lab /
   Docker / Worktree / Examples / Release / Utilities / Codegen
   ```
5. **AGENTS.md 里关于命令的段落同步更新**（Working with the Codebase → Tooling）。
6. **Bash tasks 统一 shebang + `set -euo pipefail`**。

---

## 6. 执行顺序

所有阶段独立可回滚。建议按顺序做，每个阶段一个 commit：

1. **阶段 1：脚本抽取**（最小风险，行为不变）
   - 把第 4 节列表里所有脚本抽出来，toml 改成 wrapper。
   - 运行 `mise run check-tests` 和 `mise run check-lint` 验证。

2. **阶段 2：DB 任务矩阵对称化**（按你选的方案 A/B/C 执行）
   - 重命名 + 补齐 Node 侧缺失动词 + 删化石别名 + 保留手打别名。
   - 单独验证每个目标：
     - `mise run db-wrangler-migrate && mise run db-wrangler-clean`
     - `mise run db-node-migrate && mise run db-node-clean`
   - 更新 AGENTS.md 里的命令引用。

3. **阶段 3：站点任务对称化**
   - 改名对齐 + 新增 `content-lab-migrate`。

4. **阶段 4：细节清理**
   - `release-publish-local` 通配主题。
   - i18n 翻译脚本合并。
   - 命令风格统一。
   - Section header 重排。

5. **阶段 5：AGENTS.md 同步**
   - 所有提到旧命令名的地方同步更新。
   - 更新 `## Working with the Codebase` → Tooling 段落，说明命名系统。

---

## 决策点（已确认）

1. **目标命名方案**：**B** — `db-wrangler-*` / `db-node-*` / `db-remote-*`
2. **别名**：只保留 `clean` → `db-wrangler-clean`，其余全删
3. **`clean`** → `db-wrangler-clean`（`.wrangler` 目录清理）
4. **站点前缀**：用 `demo` 不用 `demo-public`，和 `demo-source` 天然区分

---

## Review

- [x] 阶段 1 完成 — 11 个内联 bash 抽到 `scripts/` 下（worktree/example/starter/clean/site/i18n/release）
- [x] 阶段 2 完成 — `db-local-*` → `db-wrangler-*`，补齐 `db-node-{clean,bootstrap-shell,load-demo}`
- [x] 阶段 3 完成 — 站点任务去掉 `-public-` 中缀；新增 `db-content-lab-migrate`
- [x] 阶段 4 完成 — `release-publish-local` 主题通配、i18n 翻译脚本合并、changeset 命名对齐 `.claude/commands/release.md`、section 重排
- [x] 阶段 5 完成 — CONTRIBUTING.md / RELEASING.md / testing-guide.md / migration-rehearsal.md / operations.md / migrate.md / demo-source/README.md / content-lab/README.md / bootstrap-demo.mjs / clear-api-tokens.mjs / auth/dev.ts / reset-demo.yml / .env.repo.example / setup-remote.sh / reset-node-dev.ts / import-node-demo-site-export.ts 全部同步
- [x] `mise run check-lint` 通过
- [x] `mise run check-tests` 通过（2175 tests pass）
