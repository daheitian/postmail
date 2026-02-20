# Jant 代码库重构计划

> 目标：让代码库与 AGENTS.md 的设计哲学保持一致。
> 分支：`feat/claude-reflactor`
> 创建日期：2026-02-20
> 状态：**计划阶段 — 待审批**

---

## 审计总结

对照 AGENTS.md 的设计原则，对 `packages/core/src/` 进行了全面审计。以下是结论：

| 原则                      | 现状            | 问题数               |
| ------------------------- | --------------- | -------------------- |
| No DB in routes           | ✅ 完全合规     | 0                    |
| Relative imports only     | ✅ 完全合规     | 0                    |
| Separation of concerns    | ⚠️ 有违规       | 9 处                 |
| Data flows down           | ⚠️ 部分不一致   | 3 处                 |
| Type safety (no `any`)    | ⚠️ 少量         | 5 处（均有合理原因） |
| Tokens over raw values    | ⚠️ 少量         | ~20 处骨架屏硬编码   |
| Cohesion over small files | ⚠️ lib/ 混杂    | 1 个结构性问题       |
| i18n（用户需求）          | ⚠️ 单一 catalog | 需要按功能拆分       |

---

## 重构轮次

### Round 0：i18n 按功能拆分 catalog

**优先级：最高（用户明确需求）**
**类型：refactor（调整结构，保留逻辑）**

#### 问题

当前所有 217 条翻译字符串在一个 `en.po` 文件中（1566 行）。多分支并行开发时，不同功能的翻译修改都集中在同一文件，导致频繁冲突。

#### 方案

将单一 catalog 拆分为按功能/页面划分的多个 catalog，利用 lingui 的 `{name}` 通配符自动匹配目录名。

**目标结构：**

```
src/i18n/locales/
├── en/
│   ├── auth.po          # routes/auth/ + 相关 UI
│   ├── compose.po       # routes/compose + ui/compose/
│   ├── dash.po          # routes/dash/ + ui/dash/
│   ├── pages.po         # routes/pages/ + ui/pages/
│   ├── feed.po          # routes/feed/
│   └── common.po        # ui/shared/ + ui/layouts/ + lib/ 中的公共字符串
├── zh-Hans/
│   └── (同上结构)
└── zh-Hant/
    └── (同上结构)
```

#### 具体步骤

1. **分析字符串归属**：根据 `@context:` 注释和使用文件，将 217 条字符串归类到对应 catalog
2. **修改 `lingui.config.ts`**：配置多 catalog，使用 `{name}` 通配符
   ```ts
   catalogs: [
     {
       path: "src/i18n/locales/{locale}/auth",
       include: ["src/routes/auth/**", "src/ui/auth/**"],
     },
     {
       path: "src/i18n/locales/{locale}/compose",
       include: ["src/routes/compose.*", "src/ui/compose/**"],
     },
     {
       path: "src/i18n/locales/{locale}/dash",
       include: ["src/routes/dash/**", "src/ui/dash/**"],
     },
     {
       path: "src/i18n/locales/{locale}/pages",
       include: ["src/routes/pages/**", "src/ui/pages/**"],
     },
     {
       path: "src/i18n/locales/{locale}/feed",
       include: ["src/routes/feed/**", "src/ui/feed/**"],
     },
     {
       path: "src/i18n/locales/{locale}/common",
       include: [
         "src/ui/shared/**",
         "src/ui/layouts/**",
         "src/lib/**",
         "src/middleware/**",
       ],
     },
   ];
   ```
3. **修改 i18n 运行时加载**：更新 `i18n.ts` 和 `middleware.ts`，将多个 catalog 合并加载（lingui 支持 `i18n.load(locale, mergedMessages)`）
4. **运行 `pnpm i18n:extract`** 验证字符串正确分布到各 catalog
5. **迁移现有翻译**：将 `zh-Hans.po` 和 `zh-Hant.po` 中的翻译按对应 ID 拆分到新文件
6. **运行 `pnpm i18n:compile`** 验证编译通过
7. **删除旧的单一 `.po` 和 `.ts` 文件**
8. **更新 AGENTS.md** 的 i18n 章节，说明新的 catalog 结构

#### 涉及文件

| 文件                     | 操作                                  |
| ------------------------ | ------------------------------------- |
| `lingui.config.ts`       | 重写 catalog 配置                     |
| `src/i18n/i18n.ts`       | 修改 catalog 加载逻辑，合并多 catalog |
| `src/i18n/middleware.ts` | 可能需要适配新加载方式                |
| `src/i18n/locales/*.po`  | 删除旧文件，生成新的分 catalog 文件   |
| `src/i18n/locales/*.ts`  | 删除旧编译文件，生成新文件            |
| `AGENTS.md`              | 更新 i18n 章节                        |

#### 风险

- lingui 的多 catalog 配置需要测试与当前 SWC 插件的兼容性
- 合并加载多个编译文件的性能影响（预计极小，只有 6 个小文件）
- 需要确认 hash-based message ID 在拆分后是否稳定（应该稳定，ID 基于消息内容生成）

---

### Round 1：路由层关注点分离

**优先级：高**
**类型：refactor**

#### 问题清单

路由层存在业务逻辑泄漏，违反 "routes handle HTTP, services own business logic" 原则。

| #    | 文件                       | 行号             | 问题                                       | 严重度 |
| ---- | -------------------------- | ---------------- | ------------------------------------------ | ------ |
| 1.1  | `routes/api/posts.ts`      | 141-147, 215-221 | media ID 验证逻辑在路由中重复两次          | 高     |
| 1.2  | `routes/dash/index.tsx`    | 91-93            | 获取 1000 条 post 后在内存中按 status 过滤 | 高     |
| 1.3  | `routes/feed/sitemap.ts`   | 31               | 获取全部 pages 后在内存中过滤 published    | 中     |
| 1.4  | `routes/dash/media.tsx`    | 63-93            | MIME 过滤 + URL 拼接在 JSX 中              | 高     |
| 1.5  | `routes/dash/pages.tsx`    | 261-265          | 获取全部 navItems 后 `.find()` 查找        | 高     |
| 1.6  | `routes/dash/pages.tsx`    | 235, 324         | slug 标准化逻辑重复                        | 中     |
| 1.7  | `routes/dash/settings.tsx` | 32-38            | `escapeHtml` 工具函数定义在路由中          | 中     |
| 1.8  | `routes/dash/settings.tsx` | 49-61            | `resolveAvatarUrl` 业务逻辑在路由中        | 高     |
| 1.9  | `routes/dash/settings.tsx` | 288-295          | storage key 生成逻辑在路由中               | 高     |
| 1.10 | `routes/dash/settings.tsx` | 442, 461         | theme/font 验证逻辑在路由中                | 中     |
| 1.11 | `routes/compose.tsx`       | 97-155           | PostView 构建逻辑重复 3 次                 | 高     |

#### 方案

**1.1** — 在 `services/post.ts` 的 `create()` 和 `update()` 内部验证 mediaIds，路由只传入 IDs。

**1.2** — 使用 service 的 status filter（`posts.list({ status: 'published' })`）或新增 `posts.count({ status })` 方法，避免全量拉取。

**1.3** — 在 `services/page.ts` 增加 `list({ status: 'published' })` 过滤参数。

**1.4** — 在 `services/media.ts` 增加 `listImages()` 方法或在现有 `list()` 增加 MIME 过滤。URL 拼接逻辑提取到 `lib/media-helpers.ts`（已有该文件，可扩展）。

**1.5** — 在 `services/navigation.ts` 增加 `deleteByPageId(pageId)` 方法。

**1.6** — 将 slug 标准化逻辑移到 `lib/url.ts`（已有 URL 工具函数）或 Zod schema 的 `.transform()`。

**1.7** — 将 `escapeHtml` 移到 `lib/` 中合适的工具文件。

**1.8** — 在 `services/settings.ts` 增加 `getAvatarUrl()` 方法，封装 storage key → URL 的转换。

**1.9** — 在 `services/media.ts` 或 `lib/storage.ts` 增加 `generateStorageKey(file)` 工具函数。

**1.10** — 将 theme/font 校验移到 Zod schema 的 `.refine()` 或 service 层。

**1.11** — 提取 `buildPostViewWithMedia(post, services, context)` 到 `lib/view.ts`（已有 view model 相关函数），compose 路由只调用一次。

#### 涉及文件

| 文件                       | 操作                             |
| -------------------------- | -------------------------------- |
| `services/post.ts`         | 增加 mediaId 验证、count 方法    |
| `services/page.ts`         | 增加 status 过滤参数             |
| `services/media.ts`        | 增加 MIME 过滤、storage key 生成 |
| `services/navigation.ts`   | 增加 `deleteByPageId()`          |
| `services/settings.ts`     | 增加 `getAvatarUrl()`            |
| `lib/view.ts`              | 提取 `buildPostViewWithMedia()`  |
| `lib/url.ts`               | 增加 slug 标准化函数             |
| `lib/` 某工具文件          | 增加 `escapeHtml`                |
| `routes/api/posts.ts`      | 删除 mediaId 验证逻辑            |
| `routes/dash/index.tsx`    | 改用 service 过滤                |
| `routes/dash/media.tsx`    | 改用 service 方法                |
| `routes/dash/pages.tsx`    | 改用 service 方法                |
| `routes/dash/settings.tsx` | 删除业务逻辑，改用 service       |
| `routes/compose.tsx`       | 消除重复，调用提取的函数         |
| `routes/feed/sitemap.ts`   | 改用 service 过滤                |

---

### Round 2：ViewModel 一致性

**优先级：中**
**类型：refactor**

#### 问题

AGENTS.md 定义数据流为 `DB → Service → ViewModel → Component`。部分 dashboard 路由将原始 DB entity 直接传给 UI 组件，跳过了 ViewModel 转换。

| #   | 文件                    | 问题                                     |
| --- | ----------------------- | ---------------------------------------- |
| 2.1 | `routes/dash/posts.tsx` | 传递 `Post[]` 给 UI，应该传 `PostView[]` |
| 2.2 | `routes/dash/index.tsx` | 直接使用原始 entity 做计数和过滤         |

#### 方案

- 对 dashboard 内的 post 列表，统一使用 `toPostViews()` 转换后再传给 UI 组件
- 如果 dashboard 组件不需要 PostView 的全部字段（如只需要计数），考虑在 service 层提供专门的统计方法，而非拉取全部数据再转换
- 审查所有 `ui/dash/` 组件的 props 类型，确保接收的是 View 类型而非 Entity 类型

#### 涉及文件

| 文件                    | 操作                               |
| ----------------------- | ---------------------------------- |
| `routes/dash/posts.tsx` | 增加 `toPostViews()` 转换          |
| `routes/dash/index.tsx` | 改用 service 统计方法或 ViewModel  |
| `ui/dash/PostList.tsx`  | 审查 props 类型是否为 `PostView[]` |
| `types/props.ts`        | 如需调整 props 类型                |

---

### Round 3：lib/ 目录内聚性

**优先级：中**
**类型：refactor**

#### 问题

`lib/` 目录有 36 个文件，混合了三种不同关注点：

1. **客户端 bridge 文件**（9 个）：`compose-bridge.ts`、`post-form-bridge.ts`、`settings-bridge.ts` 等
2. **服务端工具**（14+ 个）：`feed.ts`、`storage.ts`、`sse.ts`、`timeline.ts` 等
3. **纯工具函数**（9 个）：`sqid.ts`、`time.ts`、`url.ts` 等

此外，4 个 bridge 文件中各自独立实现了近乎相同的 `showToast()` 函数（重复代码）。

#### 方案

> 注意：遵循 "Cohesion over small files" 原则，不做过度拆分。只做有明确价值的调整。

**3.1 — 提取共享 toast 工具**（消除重复代码）

创建 `lib/toast.ts`，将 4 个 bridge 中重复的 `showToast()` 提取为共享函数。4 个 bridge 文件改为 import 该函数。

涉及文件：

- 新建 `lib/toast.ts`
- 修改 `lib/compose-bridge.ts`
- 修改 `lib/collection-form-bridge.ts`
- 修改 `lib/post-form-bridge.ts`
- 修改 `lib/settings-bridge.ts`

**3.2 — 不做子目录拆分**（遵循用户观点）

> 用户观点："代码行数不是大问题，重点是高内聚。若刻意要求代码行数，容易过度抽象。"

经评估，lib/ 中的文件虽然混合了客户端和服务端代码，但：

- 每个文件自身内聚性良好
- 客户端 bridge 文件不 import 服务端模块（已验证）
- `client.ts` 的 import 列表已经清晰标注了哪些是 bridge
- 创建 `lib/client/` 和 `lib/server/` 子目录会增加 import 路径深度，收益不明显

因此 **不建议** 将 lib/ 拆分为子目录。只做 toast 重复代码提取。

---

### Round 4：类型安全改进

**优先级：低**
**类型：refactor**

#### 问题

| #   | 文件               | 行号  | 问题                                     |
| --- | ------------------ | ----- | ---------------------------------------- |
| 4.1 | `lib/storage.ts`   | 88-94 | 4 个 `: any` 用于 AWS SDK 动态导入的类型 |
| 4.2 | `lib/storage.ts`   | 167   | `as any` 用于 AWS SDK 响应               |
| 4.3 | `i18n/context.tsx` | 20    | `Record<string, any>` 用于 i18n 变量插值 |

#### 方案

**4.1 + 4.2** — 为 AWS SDK 动态导入创建类型包装：

```ts
// 定义精确的 AWS SDK 子集类型
interface S3SendResult {
  Body: ReadableStream | null;
  ContentType?: string;
}
```

用 `typeof import(...)` 或手动接口替代 `any`。需要评估 AWS SDK 类型导出的可用性。

**4.3** — `Record<string, any>` 在 i18n 插值场景中是合理的（lingui 官方类型也如此定义）。**保持现状，不修改。**

#### 涉及文件

| 文件             | 操作              |
| ---------------- | ----------------- |
| `lib/storage.ts` | 改进 AWS SDK 类型 |

#### 风险

- AWS SDK 类型可能不支持 tree-shaking 友好的 `import type`
- 如果改进成本高于收益，保持现状并记录原因

---

### Round 5：CSS token 一致性

**优先级：低**
**类型：refactor**

#### 问题

多个表单组件的骨架屏（skeleton）使用硬编码的 inline style 尺寸值：

| 值                                     | 出现次数 | 使用场景        |
| -------------------------------------- | -------- | --------------- |
| `min-height:1.5rem` / `1.5em`          | ~8 次    | 骨架屏 label    |
| `height:2.75rem`                       | ~6 次    | 骨架屏 input    |
| `height:6rem`                          | ~2 次    | 骨架屏 textarea |
| `min-height:180px` / `200px` / `300px` | ~3 次    | 骨架屏大区块    |

#### 方案

在 `styles/tokens.css` 或 `styles/components.css` 中定义骨架屏相关的 CSS class：

```css
.skeleton-label {
  min-height: 1.5rem;
}
.skeleton-input {
  height: 2.75rem;
}
.skeleton-textarea {
  height: 6rem;
}
.skeleton-section-sm {
  min-height: 180px;
}
.skeleton-section-md {
  min-height: 200px;
}
.skeleton-section-lg {
  min-height: 300px;
}
```

将 JSX 中的 `style="..."` 替换为对应的 class。

#### 涉及文件

| 文件                                           | 操作              |
| ---------------------------------------------- | ----------------- |
| `styles/components.css` 或 `styles/tokens.css` | 增加骨架屏 class  |
| `ui/dash/posts/PostForm.tsx`                   | 替换 inline style |
| `ui/dash/collections/CollectionForm.tsx`       | 替换 inline style |
| `ui/dash/settings/GeneralContent.tsx`          | 替换 inline style |
| `ui/compose/ComposeDialog.tsx`                 | 替换 inline style |

---

## 执行顺序与依赖关系

```
Round 0 (i18n)
    ↓
Round 1 (路由关注点分离)  ←  独立于 Round 0
    ↓
Round 2 (ViewModel 一致性)  ←  依赖 Round 1（部分 service 方法在 Round 1 创建）
    ↓
Round 3 (lib/ toast 提取)  ←  独立
    ↓
Round 4 (类型安全)  ←  独立
    ↓
Round 5 (CSS tokens)  ←  独立
```

- Round 0 和 Round 1 可以并行推进（互不影响）
- Round 2 最好在 Round 1 之后（因为 Round 1 会修改路由和 service 接口）
- Round 3、4、5 互相独立，可以按任意顺序执行

---

## 每轮验证清单

每完成一轮，必须执行：

1. `mise run test` — 全部测试通过
2. `mise run lint` — 无 lint 错误
3. `mise run build` — 构建成功
4. 对于 Round 0：额外执行 `pnpm i18n:extract && pnpm i18n:compile` 验证 i18n 工具链

---

## 不在本次重构范围内

以下内容经审计确认合规，**不需要修改**：

- ✅ 路由中无直接 DB 访问
- ✅ 全部使用相对 import（无 `@/` alias）
- ✅ UI 层不 import services 或 db
- ✅ Services 不 import routes
- ✅ 所有 `eslint-disable` 注释都有合理解释
- ✅ `@ts-ignore` / `@ts-expect-error` — 不存在

---

## 进度追踪

| 轮次    | 状态      | 完成日期 | 备注 |
| ------- | --------- | -------- | ---- |
| Round 0 | ⬜ 待开始 |          |      |
| Round 1 | ⬜ 待开始 |          |      |
| Round 2 | ⬜ 待开始 |          |      |
| Round 3 | ⬜ 待开始 |          |      |
| Round 4 | ⬜ 待开始 |          |      |
| Round 5 | ⬜ 待开始 |          |      |

---

## 会话中断续接指令

如果一次会话无法完成全部重构，请在下次会话中使用以下指令：

```
阅读 .agents/plans/refactor-plan.md，继续执行下一个未完成的 Round。
当前进度已在文档的"进度追踪"表中标注。
```
