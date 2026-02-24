# Jant - v2 执行计划

> 本文档是 v1 → v2 迁移的执行计划，分为一期（数据模型重构）和二期（新功能与 UI）。
>
> 前置条件：v1 MVP 已完成（认证、帖子 CRUD、前台展示、后台管理、RSS、搜索等）。

---

## v1 已完成功能（参考）

- 项目基础设施（pnpm workspace, TypeScript, Vite, Cloudflare Workers）
- 数据库（Drizzle ORM + D1, 迁移, FTS5 全文搜索）
- 服务层（posts, settings, redirects, media, collections, search, navigation）
- 认证（better-auth, 设置页面, 登录/登出）
- 国际化（Lingui, 语言检测, 中间件）
- 主题系统（BaseCoat + Tailwind, 颜色主题, 布局组件）
- 前台（首页, 单帖页, Collection 页, Archive 页, 搜索页）
- 后台（帖子管理, 页面管理, 媒体管理, Collection 管理, 导航管理, 设置, 重定向）
- Feed（RSS, Atom, Sitemap, robots.txt）
- 媒体上传（R2/S3 存储, Image Transform）
- Thread/回复链, 分页

---

## 一期：数据模型重构

> 目标：将 v1 数据模型迁移到 v2，所有现有功能在新模型下正常工作。

### 1.1 数据库迁移

创建新的 Drizzle 迁移文件，执行以下变更：

**posts 表重构**（使用创建新表 → 迁移数据 → 删除旧表 → 重命名策略）：

- [ ] 新增列：`format`（'note' | 'link' | 'quote'）, `status`（'draft' | 'published'）, `featured`（boolean）, `pinned`（boolean）, `rating`（integer 1-5）, `quote_text`, `collection_id`（FK）, `body`, `body_html`, `url`
- [ ] 数据迁移映射：
  - `type` → `format`：article → note, image → note, note → note, link → link, quote → quote
  - `visibility` → `status` + `featured`：featured → published + featured=1, quiet → published, unlisted → published, draft → draft
  - `content` → `body`, `content_html` → `body_html`
  - `source_url` → `url`
  - `source_name` → 丢弃（quote 的归属信息已在 title 中）
  - `source_domain` → 丢弃（渲染时从 URL 计算）
  - `path` → 丢弃（帖子不再支持自定义 slug）
  - `pinned` 默认全部为 0
  - `rating` 默认全部为 null
  - `collection_id`：从 post_collections 表迁移（取每个帖子的第一个 collection）
- [ ] 删除旧列：`type`, `visibility`, `path`, `content`, `content_html`, `source_url`, `source_name`, `source_domain`

**新建 pages 表**：

- [ ] 创建 `pages` 表（id, slug, title, body, body_html, status, created_at, updated_at）
- [ ] 从 posts 中迁移 type='page' 的数据到 pages
  - `path` → `slug`（去掉前导 `/`，仅保留第一级）
  - `content` → `body`, `content_html` → `body_html`
  - `visibility` → `status`：draft → draft，其他 → published
- [ ] 删除 posts 中 type='page' 的记录

**collections 表变更**：

- [ ] `path` 重命名为 `slug`
- [ ] 新增列：`icon`（text）, `sort_order`（text, default 'newest'）, `position`（integer, default 0）, `show_divider`（integer, default 0）

**navigation_links → nav_items**：

- [ ] 创建 `nav_items` 表（id, type, label, url, page_id, position, created_at, updated_at）
- [ ] 从 navigation_links 迁移数据（所有现有项标记为 type='link'）
- [ ] 删除 `navigation_links` 表

**清理**：

- [ ] 删除 `post_collections` 表
- [ ] 重建 FTS5 虚拟表（列名 content → body，新增 quote_text）
- [ ] 重建 FTS5 触发器

### 1.2 类型系统更新

`types.ts`：

- [ ] `POST_TYPES` → `FORMATS = ['note', 'link', 'quote'] as const`
- [ ] `VISIBILITY_LEVELS` → `STATUSES = ['draft', 'published'] as const`
- [ ] 删除 `PostType`, `Visibility` 类型，新增 `Format`, `Status`
- [ ] 更新 `Post` 接口：新字段（format, status, featured, pinned, url, body, bodyHtml, quoteText, rating, collectionId），删除旧字段
- [ ] 新增 `Page` 接口
- [ ] 更新 `Collection` 接口（slug, icon, sortOrder, position, showDivider）
- [ ] 新增 `NavItem` 接口，删除 `NavigationLink`
- [ ] 删除 `PostCollection` 接口
- [ ] 更新 `CreatePost`, `UpdatePost` 操作类型
- [ ] 新增 `CreatePage`, `UpdatePage` 操作类型
- [ ] 新增 `CreateNavItem`, `UpdateNavItem` 操作类型
- [ ] 更新 `PostView`：替换 sourceUrl/sourceName/sourceDomain 为 url，新增 quoteText/rating/featured/pinned/collectionId 等
- [ ] 新增 `PageView`
- [ ] 更新 `NavLinkView`：新增 type、pageId
- [ ] 更新 `ThemeComponents`：删除 ArticleCard/ImageCard，新增 FeaturedPage/CollectionsPage
- [ ] 更新 `POST_TYPE_MEDIA_RULES` → 所有 format 统一 [0, 20]

`lib/schemas.ts`：

- [ ] 更新 Zod schema（FormatSchema, StatusSchema, CreatePostSchema, CreatePageSchema 等）
- [ ] 删除旧的 PostTypeSchema, VisibilitySchema

### 1.3 Schema 文件更新

`db/schema.ts`：

- [ ] 更新 `posts` 表定义（新列、删除旧列）
- [ ] 新增 `pages` 表定义
- [ ] 更新 `collections` 表（slug, icon, sortOrder, position, showDivider）
- [ ] 新增 `navItems` 表，删除 `navigationLinks`
- [ ] 删除 `postCollections` 表

### 1.4 服务层更新

**PostService** (`services/post.ts`)：

- [ ] 所有查询改用 `format` 替代 `type`，`status`/`featured` 替代 `visibility`
- [ ] `create()`：接受 format/status/featured/pinned/url/body/quoteText/rating/collectionId
- [ ] `update()`：同上，body 变更时重新渲染 body_html
- [ ] `list()` 筛选参数：format, status, featured, pinned, collectionId
- [ ] Thread 继承逻辑：status + featured 继承，pinned 独立
- [ ] 删除 path 相关逻辑（帖子不再有自定义 slug）
- [ ] 删除 type='page' 相关分支

**新增 PageService** (`services/page.ts`)：

- [ ] CRUD（create, getById, getBySlug, list, update, delete）
- [ ] Slug 变更时创建 301 重定向
- [ ] body 变更时渲染 body_html
- [ ] 删除 Page 时级联删除关联的 nav_items

**CollectionService** (`services/collection.ts`)：

- [ ] 移除 addPost/removePost/syncPostCollections（M2M → 1:M）
- [ ] 添加排序逻辑（按 sort_order 字段排序帖子查询）
- [ ] 添加 reorder() 方法（批量更新 position）
- [ ] `path` → `slug`
- [ ] 新增 icon, sort_order, show_divider 字段处理
- [ ] Slug 变更时创建 301 重定向

**NavItemService**（替代 NavigationLinkService）：

- [ ] 重构为 nav_items 模型（type, label, url, page_id）
- [ ] create()：支持 page 和 link 两种类型
- [ ] Page slug 变更时同步更新关联 nav_item 的 url
- [ ] 删除 ensureDefaults()（v2 不预设导航项）

**SearchService** (`services/search.ts`)：

- [ ] 更新 FTS 查询（content → body，新增 quote_text）
- [ ] 更新筛选条件（format 替代 type，status 替代 visibility）

**MediaService** (`services/media.ts`)：

- [ ] 移除按 post type 的媒体数量限制（所有 format 统一 0-20）

### 1.5 工具函数更新

`lib/view.ts`：

- [ ] `toPostView()`：适配新字段（format, status, featured, pinned, url, bodyHtml, quoteText, rating）
- [ ] 新增 `toPageView()`
- [ ] `toNavLinkViews()` → `toNavItemViews()`：适配 type + pageId
- [ ] 删除 sourceUrl/sourceName/sourceDomain 处理

`lib/constants.ts`：

- [ ] 更新保留路径列表（新增 collections，删除 notes/articles/links/quotes）

`lib/schemas.ts`：

- [ ] 同 1.2 中 schemas 部分

`lib/navigation.ts`：

- [ ] 适配 nav_items 模型

### 1.6 路由层更新

**前台路由**（`routes/pages/`）：

- [ ] `home.tsx`：使用 format 替代 type，status 替代 visibility
- [ ] `post.tsx`：适配新字段
- [ ] `page.tsx`：改用 PageService 查询 pages 表，路由从 `/*path` 改为 `/:slug`
- [ ] `collection.tsx`：适配新字段，直接通过 collectionId 查询帖子
- [ ] `archive.tsx`：?format= 替代 ?type=，新增 ?featured= 支持
- [ ] `search.tsx`：适配新字段

**后台路由**（`routes/dash/`）：

- [ ] `posts.tsx`：format 替代 type，status/featured/pinned 替代 visibility，新增 rating/collection_id 字段
- [ ] `pages.tsx`：改用 PageService，整合 nav_items 管理 UI
- [ ] `collections.tsx`：新增 icon/sort_order/position/show_divider 编辑
- [ ] `navigation.tsx`：合并到 pages.tsx，删除此文件
- [ ] `settings.tsx`：移除社交链接配置（如有）

**API 路由**（`routes/api/`）：

- [ ] `posts.ts`：适配新字段和筛选参数
- [ ] 新增 `pages.ts`：Page CRUD API
- [ ] 新增 `nav-items.ts`：NavItem CRUD + reorder API
- [ ] `collections.ts`：新增 reorder API
- [ ] `search.ts`：适配新字段

**Feed 路由**（`routes/feed/`）：

- [ ] `rss.ts`：feed 默认只输出 featured，format 替代 type
- [ ] `sitemap.ts`：pages 从独立表查询

### 1.7 主题组件更新

**Theme Components**（`theme/components/`）：

- [ ] `PostForm.tsx`：format 选择替代 type 选择，新增 url/quoteText/rating 字段，collection 改为单选，status/featured/pinned 替代 visibility
- [ ] `PageForm.tsx`：改用 Page 模型（slug 替代 path，body 替代 content）
- [ ] 所有使用 PostView 的组件适配新字段名

**Default Theme**（`themes/threads/`）：

- [ ] 删除 `ArticleCard.tsx` 和 `ImageCard.tsx`
- [ ] `NoteCard.tsx`：有 title = 文章样式渲染，无 title = 短帖子样式渲染（合并原 ArticleCard 逻辑）
- [ ] `LinkCard.tsx`：适配 url 字段（替代 sourceUrl）
- [ ] `QuoteCard.tsx`：适配 quoteText + title（来源归属）+ url（来源链接）
- [ ] 更新 card 路由映射（去掉 article/image 分支）

`lib/view.ts` 中 card 选择逻辑：

- [ ] format='note' → NoteCard
- [ ] format='link' → LinkCard
- [ ] format='quote' → QuoteCard

### 1.8 测试更新

- [ ] 更新所有使用旧字段名的测试
- [ ] 更新 test helpers（createTestDatabase schema 适配）
- [ ] 新增 PageService 测试
- [ ] 更新 PostService 测试（format/status/featured/pinned）
- [ ] 更新 CollectionService 测试（1:M 关系）
- [ ] 运行 `mise run test` 确保全部通过

### 1.9 App 工厂更新

`app.tsx`：

- [ ] 注册 PageService
- [ ] 注册 NavItemService（替代 NavigationLinkService）
- [ ] 挂载新路由（pages API, nav-items API）
- [ ] 删除旧路由（/dash/navigation）
- [ ] 更新 ThemeComponents 默认值

---

## 二期：新功能与 UI 重设计

> 目标：实现 v2 新增功能和前台 UI 重设计。

### 2.1 前台单栏布局重设计

- [ ] `SiteLayout.tsx`：移除侧边栏，全站单栏布局
- [ ] 导航栏：作者名在左，nav_items 链接 + 搜索在右
- [ ] 登录后导航栏右侧出现头像，点击弹出菜单（Dashboard、New Post、Logout）
- [ ] 移动优先，桌面端窄栏居中
- [ ] 无限滚动，无 footer

### 2.2 首页 Timeline 重设计

- [ ] 所有 published 帖子按日期分组展示
- [ ] 置顶帖子（pinned）显示在日期分组之前
- [ ] 帖子卡片根据 format 和内容自动适配样式
- [ ] Thread 内联预览最近回复
- [ ] 登录后顶部出现发帖框（或发帖按钮）

### 2.3 发帖弹窗

- [ ] 弹窗形式（参考 Threads），独立于 /dash
- [ ] Format 切换（Note / Link / Quote）
- [ ] 通用工具栏：📎 媒体、⭐ 评分、📂 Collection
- [ ] 标题输入框（灰色小字弱化）
- [ ] 发布按钮下拉：精选、置顶选项
- [ ] 草稿逻辑：有内容时保存为草稿，空时展开草稿列表

### 2.4 置顶帖子

- [ ] 首页 timeline 置顶区域
- [ ] 最多 3 条，按 published_at 倒序
- [ ] 后台帖子列表中可快速切换 pinned 状态
- [ ] 超过 3 条时提示

### 2.5 /featured 页面

- [ ] 独立路由 `/featured`
- [ ] 展示所有 featured=true 的 published 帖子
- [ ] 分页（cursor-based）
- [ ] 可通过 nav_items 添加到导航

### 2.6 /c 列表页

- [ ] 独立路由 `/c`
- [ ] 展示所有 Collection（按 position 排序）
- [ ] 显示 Collection 图标、标题、描述、帖子数量
- [ ] show_divider 分组线

### 2.7 Collection 增强

**排序**：

- [ ] 每个 Collection 独立的 sort_order 配置
- [ ] 按 sort_order 排序帖子查询（newest/oldest/rating_desc/rating_asc）

**拖拽排序 + 分隔线**：

- [ ] `/dash/collections` 支持拖拽排序（SortableJS）
- [ ] show_divider 开关

**Collection RSS**：

- [ ] `/c/{slug}/feed` 路由
- [ ] 输出该 Collection 内的帖子 feed

**Collection 组合语法**：

- [ ] `/c/{a}+{b}` 路由
- [ ] 聚合多个 Collection 的帖子展示

**Collection 图标**：

- [ ] 后台编辑 Collection 时可设置图标（SVG 输入或 Lucide 选择器）
- [ ] 前台 Collection 列表和导航中展示图标

### 2.8 Archive 增强

- [ ] 支持 `?format=note|link|quote` 筛选
- [ ] 支持 `?featured=true` 筛选
- [ ] 支持组合筛选 `?format=note&featured=true`
- [ ] 按月份分组展示
- [ ] 筛选后展示对应的 RSS 订阅链接

### 2.9 Feed 增强

- [ ] `/feed` 仅输出 featured 帖子
- [ ] `/feed/all` 所有 published 帖子
- [ ] `/feed/all?format=note` 按 format 筛选
- [ ] `/c/{slug}/feed` Collection feed

### 2.10 /dash/pages 整合导航管理

参考 Pika.page 的导航管理设计：

- [ ] 上半区：已添加到导航的项目（page 和 link 类型混合），可拖拽排序
- [ ] 下半区：未添加到导航的 Page，可一键添加
- [ ] 支持添加任意外部链接
- [ ] 删除 `/dash/navigation` 路由

### 2.11 Link 富媒体渲染

- [ ] `lib/embed.ts`：URL 匹配规则引擎
- [ ] 支持平台：YouTube、Bilibili、Spotify、Twitter、Vimeo 等
- [ ] 支持各平台多种 URL 变体（标准链接、短链接、移动端链接）
- [ ] fallback 到普通链接展示
- [ ] LinkCard 组件集成 embed 渲染
- [ ] 渲染优先级：Embed → Body → Media

### 2.12 Rating UI

- [ ] 发帖/编辑表单中的评分组件（1-5 星）
- [ ] 帖子卡片中显示评分
- [ ] Collection 按评分排序

### 2.13 搜索弹窗

- [ ] 点击导航栏 🔍 弹出搜索框
- [ ] 实时搜索结果展示
- [ ] 同时保留 `/search` 直接访问

---

## 里程碑

| 里程碑 | 内容                | 验收标准                                                        |
| ------ | ------------------- | --------------------------------------------------------------- |
| M6     | 数据库迁移完成      | 新 schema 生效，旧数据正确迁移，`mise run dev` 正常启动         |
| M7     | 类型 + 服务层完成   | 所有 Service 适配 v2 模型，测试通过                             |
| M8     | 路由 + 主题适配完成 | 前后台所有页面在 v2 模型下正常工作                              |
| M9     | 一期完成            | v1 所有功能在 v2 模型下正常运行，无回归                         |
| M10    | 单栏布局 + 发帖弹窗 | 新前台布局上线，发帖弹窗可用                                    |
| M11    | 新功能全部完成      | 置顶、Collection 增强、Feed 筛选、Link embed、Rating 等全部可用 |
| M12    | 二期完成            | 所有 v2 功能实现，测试通过                                      |

---

## 执行建议

### 一期执行顺序

```
1. 数据库迁移文件 (1.1)
2. db/schema.ts (1.3) → types.ts (1.2) → lib/schemas.ts (1.2)
3. 服务层 (1.4)：PostService → PageService → CollectionService → NavItemService → SearchService
4. 工具函数 (1.5)：view.ts → constants.ts → navigation.ts
5. 路由层 (1.6)：API → dash → pages → feed
6. 主题组件 (1.7)
7. App 工厂 (1.9)
8. 测试 (1.8)
```

### 二期执行顺序

```
1. 前台布局重设计 (2.1) — 基础框架
2. 首页 Timeline (2.2) + 置顶 (2.4) — 核心体验
3. /featured (2.5) + /c (2.6) — 新页面
4. Collection 增强 (2.7) — 排序、RSS、组合语法
5. Archive + Feed 增强 (2.8, 2.9) — 筛选功能
6. /dash/pages 整合导航 (2.10) — 后台优化
7. 发帖弹窗 (2.3) — 发布体验
8. Link 富媒体 (2.11) + Rating (2.12) — 内容增强
9. 搜索弹窗 (2.13) — 搜索体验
```
