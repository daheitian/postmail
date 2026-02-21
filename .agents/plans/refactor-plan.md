# Jant 代码库重构计划

> 目标：让代码库与 AGENTS.md 的设计哲学保持一致。
> 分支：`feat/claude-reflactor`
> 创建日期：2026-02-20
> 更新日期：2026-02-21
> 状态：**计划阶段 — 待审批**

---

## 审计总结

对照 AGENTS.md 的设计原则，对 `packages/core/src/` 进行了两轮审计（自审 + 交叉验证）。以下是修正后的结论：

| 原则                      | 现状            | 问题数                                                          |
| ------------------------- | --------------- | --------------------------------------------------------------- |
| No DB in routes           | ❌ **存在违规** | 1 处（`auth/reset.tsx` 含 raw SQL）                             |
| Relative imports only     | ✅ 完全合规     | 0                                                               |
| Separation of concerns    | ⚠️ 有违规       | 13 处（含 AppVariables 反向依赖、schema 重复、upload 管线重复） |
| Data flows down           | ⚠️ 部分不一致   | 3 处                                                            |
| Type safety (no `any`)    | ⚠️ 少量         | 5 处（均有合理原因）                                            |
| Typed domain errors       | ❌ **未实现**   | coding-standards.md 定义了 error taxonomy 但代码中未落地        |
| Tokens over raw values    | ⚠️ 少量         | ~20 处骨架屏硬编码                                              |
| Cohesion over small files | ⚠️ lib/ 混杂    | 1 个结构性问题（toast 重复 4 次）                               |
| Transaction safety        | ⚠️ 缺失         | 10+ 处多步写入无事务保护                                        |
| 文档一致性                | ⚠️ 漂移         | `docs/datastar.md` 含 `@/` 别名示例                             |

---

## 重构轮次

### Round 1：硬约束修复

**优先级：最高（非协商约束）**
**类型：rewrite（`auth/reset`）+ refactor（其余）**

#### 问题清单

| #   | 文件                               | 问题                                                                                          | 严重度   |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------- | -------- |
| 1.1 | `routes/auth/reset.tsx` 行 206-228 | 路由内含 raw SQL（`SELECT`/`UPDATE`/`DELETE`）+ 密码重置业务逻辑                              | **致命** |
| 1.2 | `app.tsx` 行 64-75                 | `AppVariables` 定义在组合根，35 个文件反向 import，违反 coding-standards.md "Forbidden Edges" | 高       |
| 1.3 | `docs/datastar.md` 行 47, 66       | 文档示例使用 `@/` 别名，违反 "Relative imports only" 硬约束                                   | 中       |

#### 方案

**1.1 — `auth/reset.tsx` rewrite**

将密码重置的业务逻辑和 DB 访问全部下沉到 service 层：

- 在现有 `services/` 中处理（可以放在与 auth 相关的 service 中，或新建 service）
- Service 方法封装：`validateResetToken(token)`、`resetPassword(userId, newPassword)`、`clearUserSessions(userId)`
- 路由只负责：解析请求 → 调用 service → 返回响应

**1.2 — `AppVariables` 迁移**

- 将 `AppVariables` interface 从 `app.tsx` 移到 `src/types/app-context.ts`（coding-standards.md 已指定该位置）
- `app.tsx` 改为从 `types/app-context.ts` import
- 批量更新 35 个文件的 import 路径

这是纯机械性的 import 路径变更，不涉及逻辑修改，但影响面广（35 个文件），需要仔细验证。

**1.3 — 文档修复**

将 `docs/datastar.md` 中的 `@/lib/sse` 改为相对路径 `../lib/sse.js`。

#### 涉及文件

| 文件                            | 操作                                     |
| ------------------------------- | ---------------------------------------- |
| `routes/auth/reset.tsx`         | rewrite，删除所有 raw SQL 和业务逻辑     |
| 新增 service 方法               | 封装密码重置 + token 验证 + session 清理 |
| `types/app-context.ts`          | 新建，接收 `AppVariables` 定义           |
| `app.tsx`                       | 删除 `AppVariables` 定义，改为 import    |
| 35 个 route/middleware/lib 文件 | 更新 import 路径                         |
| `docs/datastar.md`              | 修复 `@/` 别名为相对路径                 |

---

### Round 2：路由层关注点分离 + Schema 统一

**优先级：高**
**类型：refactor**

#### 问题清单

路由层存在业务逻辑泄漏、schema 重复、upload 管线重复。

| #    | 文件                                                                            | 行号              | 问题                                                        | 严重度 |
| ---- | ------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------- | ------ |
| 2.1  | `routes/api/posts.ts`                                                           | 141-147, 215-221  | media ID 验证逻辑在路由中重复两次                           | 高     |
| 2.2  | `routes/dash/index.tsx`                                                         | 91-93             | 获取 1000 条 post 后在内存中按 status 过滤                  | 高     |
| 2.3  | `routes/feed/sitemap.ts`                                                        | 31                | 获取全部 pages 后在内存中过滤 published                     | 中     |
| 2.4  | `routes/dash/media.tsx`                                                         | 63-93             | MIME 过滤 + URL 拼接在 JSX 中                               | 高     |
| 2.5  | `routes/dash/pages.tsx`                                                         | 261-265           | 获取全部 navItems 后 `.find()` 查找                         | 高     |
| 2.6  | `routes/dash/pages.tsx`                                                         | 235, 324          | slug 标准化逻辑重复                                         | 中     |
| 2.7  | `routes/dash/settings.tsx`                                                      | 32-38             | `escapeHtml` 工具函数定义在路由中                           | 中     |
| 2.8  | `routes/dash/settings.tsx`                                                      | 49-61             | `resolveAvatarUrl` 业务逻辑在路由中                         | 高     |
| 2.9  | `routes/dash/settings.tsx` + `routes/api/upload.ts`                             | 288-295 / 176-182 | storage key 生成逻辑重复实现                                | 高     |
| 2.10 | `routes/dash/settings.tsx`                                                      | 442, 461          | theme/font 验证逻辑在路由中                                 | 中     |
| 2.11 | `routes/compose.tsx`                                                            | 97-155            | PostView 构建逻辑重复 3 次                                  | 高     |
| 2.12 | `routes/api/pages.ts` / `routes/api/collections.ts` / `routes/api/nav-items.ts` | 多处              | Schema 与 `lib/schemas.ts` 重复定义，且丢失 slug regex 验证 | 高     |
| 2.13 | `routes/dash/settings.tsx` + `routes/api/upload.ts`                             | 272-286 / 152-173 | 文件类型校验、大小校验逻辑重复                              | 高     |

#### 方案

**2.1** — 在 `services/post.ts` 的 `create()` 和 `update()` 内部验证 mediaIds，路由只传入 IDs。

**2.2** — 使用 service 的 status filter（`posts.list({ status: 'published' })`）或新增 `posts.count({ status })` 方法，避免全量拉取。

**2.3** — 在 `services/page.ts` 增加 `list({ status: 'published' })` 过滤参数。

**2.4** — 在 `services/media.ts` 增加 `listImages()` 方法或在现有 `list()` 增加 MIME 过滤。URL 拼接逻辑提取到 `lib/media-helpers.ts`（已有该文件，可扩展）。

**2.5** — 在 `services/navigation.ts` 增加 `deleteByPageId(pageId)` 方法。

**2.6** — 将 slug 标准化逻辑移到 Zod schema 的 `.transform()` 中（Schema 统一时一并处理）。

**2.7** — 将 `escapeHtml` 移到 `lib/` 中合适的工具文件。

**2.8** — 在 `services/settings.ts` 增加 `getAvatarUrl()` 方法，封装 storage key → URL 的转换。

**2.9 + 2.13** — **统一 upload 管线**：提取共享的 `validateUploadFile(file)` 和 `generateStorageKey(file)` 到 `lib/storage.ts` 或 `lib/media-helpers.ts`。两处上传路由改为调用共享函数。

**2.10** — 将 theme/font 校验移到 Zod schema 的 `.refine()` 或 service 层。

**2.11** — 提取 `buildPostViewWithMedia(post, services, context)` 到 `lib/view.ts`（已有 view model 相关函数），compose 路由只调用一次。

**2.12** — **Schema 所有权统一**：

- 共享域 schema（slug 格式、post 格式等）保留在 `lib/schemas.ts`，作为 single source of truth
- route-specific schema（仅 HTTP 层关心的字段组合）从 `lib/schemas.ts` 组合而来，不重新定义基础验证规则
- 修复 route 中丢失的 slug regex 验证

#### 涉及文件

| 文件                                       | 操作                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| `services/post.ts`                         | 增加 mediaId 验证、count 方法                        |
| `services/page.ts`                         | 增加 status 过滤参数                                 |
| `services/media.ts`                        | 增加 MIME 过滤                                       |
| `services/navigation.ts`                   | 增加 `deleteByPageId()`                              |
| `services/settings.ts`                     | 增加 `getAvatarUrl()`                                |
| `lib/view.ts`                              | 提取 `buildPostViewWithMedia()`                      |
| `lib/media-helpers.ts` 或 `lib/storage.ts` | 提取 `validateUploadFile()` + `generateStorageKey()` |
| `lib/schemas.ts`                           | 确认为 schema 权威来源                               |
| `lib/` 某工具文件                          | 增加 `escapeHtml`                                    |
| `routes/api/posts.ts`                      | 删除 mediaId 验证逻辑                                |
| `routes/api/pages.ts`                      | 改用 `lib/schemas.ts` 的 schema 组合                 |
| `routes/api/collections.ts`                | 同上                                                 |
| `routes/api/nav-items.ts`                  | 同上                                                 |
| `routes/api/upload.ts`                     | 改用共享 upload 函数                                 |
| `routes/dash/index.tsx`                    | 改用 service 过滤                                    |
| `routes/dash/media.tsx`                    | 改用 service 方法                                    |
| `routes/dash/pages.tsx`                    | 改用 service 方法                                    |
| `routes/dash/settings.tsx`                 | 删除业务逻辑，改用 service + 共享 upload             |
| `routes/compose.tsx`                       | 消除重复，调用提取的函数                             |
| `routes/feed/sitemap.ts`                   | 改用 service 过滤                                    |

---

### Round 3：ViewModel 一致性 + Typed Domain Errors

**优先级：中**
**类型：refactor**

#### 问题 A：ViewModel 不一致

AGENTS.md 定义数据流为 `DB → Service → ViewModel → Component`。部分 dashboard 路由将原始 DB entity 直接传给 UI 组件。

| #   | 文件                    | 问题                                     |
| --- | ----------------------- | ---------------------------------------- |
| 3.1 | `routes/dash/posts.tsx` | 传递 `Post[]` 给 UI，应该传 `PostView[]` |
| 3.2 | `routes/dash/index.tsx` | 直接使用原始 entity 做计数和过滤         |

#### 方案 A

- 对 dashboard 内的 post 列表，统一使用 `toPostViews()` 转换后再传给 UI 组件
- 如果 dashboard 组件不需要 PostView 的全部字段（如只需要计数），考虑在 service 层提供专门的统计方法
- 审查所有 `ui/dash/` 组件的 props 类型，确保接收的是 View 类型而非 Entity 类型

#### 问题 B：缺少 Typed Domain Errors

`docs/internal/coding-standards.md` 定义了明确的 error taxonomy：

- `ValidationError → 400`
- `UnauthorizedError → 401`
- `ForbiddenError → 403`
- `NotFoundError → 404`
- `ConflictError → 409`

但代码中完全未实现。所有错误处理都是 ad-hoc 的字符串响应：

```ts
// 当前模式（散布在各个路由中）
return c.json({ error: "Not found" }, 404);
return dsToast("Passwords do not match.", "error");
```

#### 方案 B

1. 在 `src/lib/` 或 `src/types/` 中定义 typed error classes（按 coding-standards.md 规范）
2. Service 层抛出 typed errors 而不是返回 null/undefined
3. 在路由层建立统一的 error → HTTP response 映射（可以是 Hono middleware 或 helper function）
4. 逐步迁移现有的 ad-hoc 错误处理

> 注意：不需要一次性全部迁移。先建立基础设施（error classes + mapping），然后在 Round 2 的路由修改过程中顺带使用新模式。

#### 涉及文件

| 文件                                         | 操作                               |
| -------------------------------------------- | ---------------------------------- |
| `src/types/errors.ts` 或 `src/lib/errors.ts` | 新建，定义 domain error classes    |
| `src/middleware/` 或 route helper            | 统一 error → HTTP response mapping |
| `routes/dash/posts.tsx`                      | 增加 ViewModel 转换                |
| `routes/dash/index.tsx`                      | 改用 service 统计方法或 ViewModel  |
| `ui/dash/PostList.tsx`                       | 审查 props 类型                    |
| `types/props.ts`                             | 如需调整 props 类型                |
| 各 service 文件                              | 逐步改为抛出 typed errors          |

---

### Round 4：lib/ 内聚性 + CSS Token 一致性

**优先级：中-低**
**类型：refactor**

#### 问题 A：Toast 重复代码

4 个 bridge 文件中各自独立实现了近乎相同的 `showToast()` 函数（含 inline SVG icons）。

#### 方案 A

创建 `lib/toast.ts`，将 4 个 bridge 中重复的 `showToast()` 提取为共享函数。

> 遵循用户观点 "代码行数不是大问题，重点是高内聚"：不对 lib/ 做子目录拆分。客户端 bridge 和服务端工具混合存放经验证不存在交叉 import 问题，保持现状。

涉及文件：

- 新建 `lib/toast.ts`
- 修改 `lib/compose-bridge.ts`
- 修改 `lib/collection-form-bridge.ts`
- 修改 `lib/post-form-bridge.ts`
- 修改 `lib/settings-bridge.ts`

#### 问题 B：骨架屏硬编码

多个表单组件的骨架屏使用硬编码的 inline style 尺寸值：

| 值                                     | 出现次数 | 使用场景        |
| -------------------------------------- | -------- | --------------- |
| `min-height:1.5rem` / `1.5em`          | ~8 次    | 骨架屏 label    |
| `height:2.75rem`                       | ~6 次    | 骨架屏 input    |
| `height:6rem`                          | ~2 次    | 骨架屏 textarea |
| `min-height:180px` / `200px` / `300px` | ~3 次    | 骨架屏大区块    |

#### 方案 B

在 `styles/components.css` 中定义骨架屏相关的 CSS class，将 JSX 中的 `style="..."` 替换为对应的 class。

涉及文件：

- `styles/components.css` — 增加骨架屏 class
- `ui/dash/posts/PostForm.tsx` — 替换 inline style
- `ui/dash/collections/CollectionForm.tsx` — 替换 inline style
- `ui/dash/settings/GeneralContent.tsx` — 替换 inline style
- `ui/compose/ComposeDialog.tsx` — 替换 inline style

---

### Round 5：Service 事务安全 + 类型安全

**优先级：中**
**类型：refactor**

#### 问题 A：多步写入无事务保护

Service 层存在大量多步写入操作，全部无 `db.batch()` 或 `db.transaction()` 保护。部分失败会留下不一致状态。

| 风险等级 | 函数                    | 文件                     | 问题                                                       |
| -------- | ----------------------- | ------------------------ | ---------------------------------------------------------- |
| **严重** | `update()`              | `services/post.ts`       | check-then-act + thread cascade + collection sync 无原子性 |
| 高       | `create()`              | `services/post.ts`       | post insert + collection insert 非原子                     |
| 高       | `reorderAll()`          | `services/collection.ts` | 循环单条 UPDATE，部分失败导致位置混乱                      |
| 高       | `syncPostCollections()` | `services/collection.ts` | delete all + insert new 非原子                             |
| 高       | `reorder()`             | `services/navigation.ts` | 同 reorderAll                                              |
| 高       | `attachToPost()`        | `services/media.ts`      | clear + re-insert 非原子                                   |
| 中       | `create()`              | `services/collection.ts` | MAX position 并发竞争                                      |
| 中       | `createDivider()`       | `services/collection.ts` | 同上                                                       |
| 中       | `create()`              | `services/navigation.ts` | 同上                                                       |

#### 方案 A

1. **对 D1 batch 操作（多条 SQL 原子执行）**：Drizzle + D1 支持 `db.batch([...])` 将多条操作打包。适用于 reorder、syncPostCollections 等场景。
2. **对 check-then-act 模式**：在 service 方法内部合并"读 + 写"为单个事务，或使用 D1 的 `batch` 确保原子性。
3. **对 position 竞争**：考虑在 batch 内完成 "MAX query + insert"，或使用 UNIQUE 约束 + 冲突处理。

> 注意：遵循 "先修正确性，再谈形态" 原则。`collection.ts` 作为聚合服务结构合理，不因事务改造而拆分文件。

涉及文件：

- `services/post.ts` — `create()` 和 `update()` 包裹 batch/transaction
- `services/collection.ts` — `reorderAll()`、`syncPostCollections()`、`create()`、`createDivider()` 加事务
- `services/navigation.ts` — `reorder()`、`create()` 加事务
- `services/media.ts` — `attachToPost()` 加事务

#### 问题 B：AWS SDK 类型

| #   | 文件             | 行号  | 问题                               |
| --- | ---------------- | ----- | ---------------------------------- |
| 5.1 | `lib/storage.ts` | 88-94 | 4 个 `: any` 用于 AWS SDK 动态导入 |
| 5.2 | `lib/storage.ts` | 167   | `as any` 用于 AWS SDK 响应         |

#### 方案 B

为 AWS SDK 动态导入定义精确的子集类型接口，替代 `any`。如果 AWS SDK 类型不便 tree-shake，手动定义使用到的方法签名即可。

`i18n/context.tsx` 的 `Record<string, any>` 保持现状（lingui 官方类型定义一致）。

涉及文件：

- `lib/storage.ts` — 改进 AWS SDK 类型

---

## 执行顺序与依赖关系

```
Round 1 (硬约束修复)
        ↓
Round 2 (路由分离 + Schema)
        ↓
Round 3 (ViewModel + Errors)
        ↓
  ┌─────┴─────┐
  ↓           ↓
Round 4    Round 5
(lib/CSS)  (事务+类型)
```

- **Round 1 必须最先执行**（修复硬约束违规，AppVariables 迁移后再改路由避免重复修改 import）
- **Round 2 依赖 Round 1**
- **Round 3 依赖 Round 2**（service 方法在 Round 2 创建后，Round 3 添加 error typing）
- **Round 4 和 Round 5 互相独立**，均依赖 Round 3 完成

---

## 每轮验证清单

每完成一轮，必须执行：

1. `mise run test` — 全部测试通过
2. `mise run lint` — 无 lint 错误
3. `mise run build` — 构建成功

---

## 判定原则（共识版）

以下原则指导每次具体决策，确保重构方向一致：

### 聚合边界优先于文件大小

同一业务聚合（如 collection + divider + collection-post relation）可以放在同一 service。不因"文件大"强行拆分。

### 先修正确性，再谈形态

优先处理事务、并发、一致性问题。结构优化排在其后。用户可见故障来自"部分成功/部分失败"，而不是文件是否 300 行或 600 行。

### 拆分触发条件是"职责跨层混杂"

只有当一个模块同时承担 HTTP 处理、业务编排、数据访问、协议渲染（JSON/SSE/HTML）等多层职责时，才判定为拆分候选。单一职责的大文件可以接受。

### `refactor` 与 `rewrite` 的选择标准

- **refactor**：边界基本正确，主要是可维护性/一致性增强
- **rewrite**：存在硬约束违背或架构方向错误（如 route 直连 DB）

重写成本高、回归面大，仅用于"方向错了"的模块。

### 评审检查项（每个改动逐项确认）

- [ ] 是否提升了边界清晰度（而非仅减少行数）？
- [ ] 是否降低了并发/事务风险？
- [ ] 是否保持或增强了类型与错误语义一致性？
- [ ] 是否补齐了对应测试与文档更新？

---

## 不在本次重构范围内

以下内容经审计确认合规或不适合本次处理：

- ✅ **i18n** — 已独立解决
- ✅ 全部使用相对 import（无 `@/` alias）— 代码中合规，仅文档有漂移（Round 1 修复）
- ✅ UI 层不 import services 或 db
- ✅ Services 不 import routes
- ✅ 所有 `eslint-disable` 注释都有合理解释
- ✅ `@ts-ignore` / `@ts-expect-error` — 不存在
- ⏳ 测试覆盖补齐（关键路径如 auth/reset、upload 缺少测试）— 随各 Round 的代码修改同步补充，不单独设轮次

---

## 进度追踪

| 轮次    | 状态      | 完成日期   | 备注                     |
| ------- | --------- | ---------- | ------------------------ |
| Round 1 | ✅ 已完成 | 2026-02-21 | 硬约束修复               |
| Round 2 | ✅ 已完成 | 2026-02-21 | 路由分离 + Schema 统一   |
| Round 3 | ✅ 已完成 | 2026-02-21 | ViewModel + Typed Errors |
| Round 4 | ✅ 已完成 | 2026-02-21 | lib/ toast + CSS tokens  |
| Round 5 | ✅ 已完成 | 2026-02-21 | 事务安全 + 类型改进      |

---

## 会话中断续接指令

如果一次会话无法完成全部重构，请在下次会话中使用以下指令：

```
阅读 .agents/plans/refactor-plan.md，继续执行下一个未完成的 Round。
当前进度已在文档的"进度追踪"表中标注。
```
