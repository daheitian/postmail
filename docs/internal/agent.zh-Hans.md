# Jant - 技术规格 v2

> 本文档用于指导 AI 实现。请先阅读 readme.zh-Hans.md 了解产品愿景。

---

## 一、技术栈

| 组件     | 选型                             |
| -------- | -------------------------------- |
| 运行时   | Cloudflare Workers               |
| 框架     | Hono                             |
| 前端交互 | Datastar                         |
| 模板     | hono/jsx                         |
| 样式     | BaseCoat UI + Tailwind（仅布局） |
| 数据库   | D1 + Drizzle                     |
| 认证     | better-auth                      |
| i18n     | @lingui/core                     |
| 包管理   | pnpm monorepo                    |
| 任务管理 | mise                             |

---

## 二、项目结构

```
jant/
├── packages/
│   ├── core/                   # @jant/core
│   │   └── src/
│   │       ├── index.ts        # 导出 createApp
│   │       ├── app.tsx         # Hono app 工厂
│   │       ├── types.ts        # 类型定义（单一真相源）
│   │       ├── db/
│   │       │   ├── schema.ts   # Drizzle schema
│   │       │   └── migrations/
│   │       ├── services/       # 业务逻辑
│   │       ├── routes/
│   │       │   ├── pages/      # 前台页面
│   │       │   ├── dash/       # 后台管理
│   │       │   ├── api/        # API 端点
│   │       │   ├── feed/       # RSS/Sitemap
│   │       │   └── auth/       # 认证
│   │       ├── theme/
│   │       │   ├── components/ # 可复用组件
│   │       │   ├── layouts/    # 布局组件
│   │       │   └── styles/     # CSS
│   │       ├── themes/         # 默认主题（threads）
│   │       ├── lib/            # 工具函数
│   │       ├── middleware/     # Hono 中间件
│   │       └── i18n/           # 国际化
│   │
│   └── create-jant/            # create-jant CLI
│
├── templates/jant-site/        # 开发 + 测试站点
├── mise.toml                   # 所有开发命令
└── pnpm-workspace.yaml
```

---

## 三、架构原则

1. **单文件单职责**：每文件 < 300 行
2. **显式依赖**：通过参数传入，不用全局状态
3. **类型即文档**：完整 TypeScript 类型 + Zod 验证
4. **约定优于配置**：固定目录结构，统一命名
5. **View Model 模式**：DB → Service → toXxxView() → Theme 组件（组件不导入 lib/）

---

## 四、数据模型

### 4.1 核心表概览

| 表                                  | 用途                                |
| ----------------------------------- | ----------------------------------- |
| `posts`                             | 帖子（note/link/quote 三种 format） |
| `pages`                             | 独立页面（与 Post 平级，单独存储）  |
| `media`                             | 媒体文件元数据                      |
| `collections`                       | 策展集合（一对多）                  |
| `nav_items`                         | 导航菜单项                          |
| `redirects`                         | URL 重定向                          |
| `settings`                          | 站点设置（Key-Value）               |
| `user/session/account/verification` | better-auth 表                      |

### 4.2 Posts 字段

```typescript
{
  id: integer,              // PK, 自增
  format: text,             // 'note' | 'link' | 'quote'
  status: text,             // 'draft' | 'published'，默认 'published'
  featured: integer,        // 布尔值，默认 0
  pinned: integer,          // 布尔值，默认 0

  // 通用内容字段
  title?: text,             // Note: 文章标题（可选）; Link: 链接描述; Quote: 引文来源
  url?: text,               // Link: 分享的链接（必填）; Quote: 引文出处链接（可选）
  body?: text,              // Markdown 正文
  body_html?: text,         // 写入时由 body 渲染生成
  quote_text?: text,        // Quote 专属：被引用的原文
  rating?: integer,         // 1-5 整数评分（可选）
  collection_id?: integer,  // FK → collections.id（一对多，可选）

  // Thread
  reply_to_id?: integer,    // 直接父帖 ID
  thread_id?: integer,      // 根帖 ID

  // 元数据
  deleted_at?: integer,     // 软删除时间戳
  published_at: integer,    // 用户可编辑的展示时间（用于排序和日期分组）
  created_at: integer,      // 真实创建时间（系统自动）
  updated_at: integer,
}
```

**字段语义（按 format）**：

| 字段         | Note             | Link                 | Quote                 |
| ------------ | ---------------- | -------------------- | --------------------- |
| `title`      | 文章标题（可选） | 链接描述（可选）     | 引文来源/归属（可选） |
| `url`        | —                | 分享链接（**必填**） | 出处链接（可选）      |
| `body`       | 正文             | 评论/说明            | 用户的评论            |
| `quote_text` | —                | —                    | 被引用的原文（可选）  |
| `rating`     | 可选             | 可选                 | 可选                  |
| `media`      | 0-20             | 0-20                 | 0-20                  |

**Note 的渲染规则**：有 title → 文章样式渲染；无 title → 短帖子样式渲染。不需要独立的 article 类型。

### 4.3 Pages 字段

```typescript
{
  id: integer,              // PK, 自增
  slug: text,               // UNIQUE, 必填。URL: /{slug}，仅单级
  title?: text,
  body?: text,              // Markdown
  body_html?: text,         // 渲染后 HTML
  status: text,             // 'draft' | 'published'，默认 'published'
  created_at: integer,
  updated_at: integer,
}
```

**Page 与 Post 的区别**：

- 不出现在时间线和 RSS
- 没有 format / featured / pinned / rating / collection 概念
- 有用户自定义 slug（必填）
- 示例：`/about`、`/now`、`/uses`

### 4.4 Media 字段

```typescript
{
  id: text,                 // UUIDv7, PK
  post_id?: integer,        // FK → posts.id（可选，先上传后关联）
  filename: text,
  original_name: text,
  mime_type: text,
  size: integer,            // 字节
  storage_key: text,        // R2/S3 对象键
  provider: text,           // 'r2' | 's3'，默认 'r2'
  width?: integer,          // 图片/视频宽度
  height?: integer,
  alt?: text,               // 无障碍描述
  position: integer,        // 排序位置，默认 0
  blurhash?: text,          // 加载占位符
  created_at: integer,
}
```

所有 format 都支持媒体。图片、视频、音频可混合上传，上限 20 个。

### 4.5 Collections 字段

```typescript
{
  id: integer,              // PK, 自增
  slug: text,               // UNIQUE, 必填。URL: /c/{slug}
  title: text,
  description?: text,
  icon?: text,              // SVG 字符串（Lucide 图标或用户上传的 SVG）
  sort_order: text,         // 'newest' | 'oldest' | 'rating_desc' | 'rating_asc'，默认 'newest'
  position: integer,        // 拖拽排序位置，默认 0
  show_divider: integer,    // 布尔值，默认 0。为 true 时在此 Collection 上方显示分隔线
  created_at: integer,
  updated_at: integer,
}
```

**关键变更**：

- **一对多**：一个帖子只属于一个 Collection（通过 `posts.collection_id` 外键）
- 不再有 `post_collections` 关联表
- Collection slug 修改时自动创建 301 重定向

### 4.6 Nav Items 字段

```typescript
{
  id: integer,              // PK, 自增
  type: text,               // 'page' | 'link'
  label: text,              // 显示文字
  url: text,                // 目标 URL
  page_id?: integer,        // FK → pages.id（仅 type='page' 时有值）
  position: integer,        // 拖拽排序位置，默认 0
  created_at: integer,
  updated_at: integer,
}
```

**规则**：

- `type='page'`：关联一个 Page，Page 删除时级联删除此 nav_item。URL 从 Page slug 派生（`/{slug}`），slug 变更时同步更新
- `type='link'`：任意 URL，`page_id` 为 null
- 管理界面在 `/dash/pages`（与 Page 管理合并）

### 4.7 Settings 字段

```typescript
{
  key: text,                // PRIMARY KEY
  value: text,              // JSON 序列化
  updated_at: integer,
}
// 例：SITE_NAME, SITE_DESCRIPTION, SITE_LANGUAGE, THEME, ONBOARDING_STATUS
```

### 4.8 Redirects 字段

```typescript
{
  id: integer,              // PK, 自增
  from_path: text,          // UNIQUE, 源路径
  to_path: text,            // 目标路径或完整 URL
  type: integer,            // 301 | 302
  created_at: integer,
}
```

用途：1) Page/Collection slug 变更时自动创建 2) 用户手动创建

### 4.9 ID 与 URL 方案

- 数据库使用自增 integer
- 帖子 URL 统一用 Sqids 短码：`/p/jR3k`（不支持自定义 path）
- Page URL 由用户定义 slug：`/{slug}`（仅单级）
- Collection URL：`/c/{slug}`

### 4.10 Thread 规则

```
创建回复时：
  reply_to_id = 父帖 ID
  thread_id = 父帖.thread_id ?? 父帖.id
  status = 复制 root 的 status（继承）
  featured = 复制 root 的 featured（继承）
  pinned = 独立设置（不继承）

删除时：
  删除 root → 整个 thread 软删除
  删除中间帖 → 子帖保留

继承规则（创建时复制 + 级联更新）：
  - status：创建子帖时复制 root，修改 root 时级联更新所有子帖
  - featured：创建子帖时复制 root，修改 root 时级联更新所有子帖
  - pinned：每个帖子独立设置，不继承不级联
```

### 4.11 全文搜索

使用 FTS5 trigram：

```sql
CREATE VIRTUAL TABLE posts_fts USING fts5(
  title, body, quote_text,
  content=posts, content_rowid=id,
  tokenize='trigram'
);
```

需要触发器保持同步（INSERT / UPDATE / DELETE）。

---

## 五、路由

### 5.1 前台

```
GET  /                    首页 timeline（所有 published，按日期分组 + 置顶）
GET  /featured            精选帖子（独立页面）
GET  /p/:id               单条帖子（sqid）
GET  /c/:slug             单个 Collection
GET  /c/:a+:b             Collection 组合查看
GET  /collections         Collection 列表页
GET  /archive             归档（支持 ?format= &featured= 筛选，按月份分组）
GET  /search              搜索（弹窗 + 直接访问）
GET  /feed                RSS（仅 featured）
GET  /feed/all            RSS（所有 published，支持 ?format= 筛选）
GET  /c/:slug/feed        Collection RSS
GET  /sitemap.xml         自动生成站点地图
GET  /:slug               独立页面（最低优先级，单级 slug）
```

**分页**：Cursor-based + 无限滚动，默认每页 20 项（可配置）

### 5.2 认证

```
GET  /setup               首次设置
GET  /signin              登录
GET  /signout             登出
ALL  /api/auth/*          better-auth
```

### 5.3 后台

```
GET  /dash                仪表盘
GET  /dash/posts          帖子管理
GET  /dash/pages          页面 + 导航管理（合并）
GET  /dash/collections    Collection 管理（拖拽排序 + 分隔线）
GET  /dash/media          媒体库
GET  /dash/redirects      重定向管理
GET  /dash/settings       站点设置（个人资料、主题）
```

### 5.4 API

```
# 帖子
GET    /api/posts                 帖子列表（支持 format/status/featured 筛选）
GET    /api/posts/:id             单条帖子
POST   /api/posts                 [auth] 创建帖子
PUT    /api/posts/:id             [auth] 更新帖子
DELETE /api/posts/:id             [auth] 删除帖子

# 页面
GET    /api/pages                 页面列表
POST   /api/pages                 [auth] 创建页面
PUT    /api/pages/:id             [auth] 更新页面
DELETE /api/pages/:id             [auth] 删除页面

# 导航
GET    /api/nav-items             导航项列表
POST   /api/nav-items             [auth] 创建导航项
PUT    /api/nav-items/:id         [auth] 更新导航项
DELETE /api/nav-items/:id         [auth] 删除导航项
POST   /api/nav-items/reorder     [auth] 重新排序

# Collection
GET    /api/collections           Collection 列表
POST   /api/collections           [auth] 创建
PUT    /api/collections/:id       [auth] 更新
DELETE /api/collections/:id       [auth] 删除
POST   /api/collections/reorder   [auth] 重新排序

# 其他
POST   /api/upload                [auth] 媒体上传
GET    /api/search?q=             搜索
GET    /api/settings              [auth] 获取设置
PUT    /api/settings              [auth] 更新设置
```

### 5.5 保留路径

```
featured, collections, signin, signout, setup, dash, api, feed,
search, archive, media, pages, p, c, static, assets, sitemap.xml
```

> Page 创建/更新时需验证 slug 不与保留路径冲突。

---

## 六、样式规范

### 6.1 BaseCoat 为主

```html
<!-- ✅ 使用 BaseCoat 组件类 -->
<button class="btn btn-primary">发布</button>
<input class="input" />
<div class="card">...</div>

<!-- ✅ Tailwind 仅用于布局 -->
<div class="flex gap-4 mt-2">...</div>

<!-- ❌ 不要用 Tailwind 重建组件 -->
<button class="bg-blue-500 px-4 py-2 rounded">...</button>
```

### 6.2 CSS 变量

颜色主题通过 CSS 变量实现，支持 light/dark mode。内置 14 种颜色方案。

### 6.3 布局

全站单栏布局，无侧边栏。移动优先，桌面端窄栏居中。参考 Pika.page 的简洁风格。

### 6.4 动画

```css
--transition-fast: 150ms ease-out;
--transition-base: 200ms ease-out;
```

场景：页面切换（淡入 + 轻微上移）、新内容加载（骨架屏）、按钮点击、展开/收起。

---

## 七、microformats2

所有帖子使用 `h-entry` 标记：

```html
<article class="h-entry">
  <h2 class="p-name">标题</h2>
  <div class="e-content">内容</div>
  <a class="u-url" href="...">永久链接</a>
  <time class="dt-published" datetime="...">时间</time>
  <a class="p-author h-card" href="/">作者</a>
</article>
```

- Link 格式额外加 `u-bookmark-of`
- Quote 格式用 `h-cite` 标记引文来源

---

## 八、开发命令

参考 `CLAUDE.md` 中的 Quick Reference 部分。核心命令：

```bash
mise run dev          # 开发服务器（自动运行迁移）
mise run dev-debug    # 调试端口 19019
mise run test         # 运行测试
mise run build        # Vite 构建
mise run db-generate  # 生成 Drizzle 迁移
mise run db-reset     # 删除数据库并重新迁移
```

---

## 九、环境变量

```bash
# wrangler.toml [vars]（非敏感，提交到 git）
SITE_URL = "https://example.com"
SITE_NAME = "My Blog"
R2_PUBLIC_URL = "https://..."
IMAGE_TRANSFORM_URL = "https://..."

# .dev.vars（敏感，不提交）
AUTH_SECRET = "..."           # 至少 32 字符
```

**存储策略**：

- 默认 R2（S3 兼容），可切换到 S3 兼容存储
- 图片处理：Cloudflare Image Transform
- 未配置存储时上传报错，/dash/settings 显示提示

**可在后台修改**（DB > ENV > Default）：`SITE_NAME`, `SITE_DESCRIPTION`, `SITE_LANGUAGE`, `THEME`

---

## 十、关键约定

1. **Service 模式**：所有数据库操作封装在 service 中
2. **Context 传递**：通过 `c.var.services` 访问
3. **软删除**：posts 使用 `deleted_at`
4. **时间戳**：Unix timestamp（秒），使用 `lib/time.ts`
5. **Slug 变更**：自动创建 301 重定向（Page、Collection）
6. **Admin 认证**：复用 better-auth 的 user 表
7. **View Model**：DB 实体通过 `toXxxView()` 转换为渲染就绪的 View 类型
8. **命名**：Routes 用 `xxxRoutes`，Services 用 `XxxService`

---

## 十一、Onboarding 流程

```
1. 首次访问任意页面 → 检查 settings.ONBOARDING_STATUS
2. 如果 'pending' 或不存在 → 重定向到 /setup
3. /setup 页面收集：
   - 管理员账号（邮箱 + 密码）
   - 站点语言
4. 完成后 → ONBOARDING_STATUS = 'completed'
5. /dash/settings 页面显示存储配置状态和提示
```

---

## 十二、时间显示

- **1 个月内**：相对时间（如「3小时前」），hover 显示本地时区具体时间
- **超过 1 个月**：服务端渲染 UTC 日期
- 使用 `<time datetime="...">` 语义化标签
- Timeline 按 `published_at` 排序和日期分组

---

## 十三、SEO 与社交分享

```html
<!-- 必须 -->
<title>{标题} | {站点名}</title>
<meta name="description" content="{描述}" />
<link rel="canonical" href="{完整 URL}" />

<!-- Open Graph -->
<meta property="og:title" content="{标题}" />
<meta property="og:description" content="{描述}" />
<meta property="og:image" content="{帖子第一张图}" />
<meta property="og:url" content="{完整 URL}" />

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image" />

<!-- JSON-LD 结构化数据 -->
<script type="application/ld+json">
  { "@context": "https://schema.org", "@type": "Article", ... }
</script>
```

**标题/描述回退**：若帖子无标题，取正文前 120 字。

---

## 十四、编辑器

### 14.1 发帖（弹窗形式，参考 Threads）

- 默认 Note 模式：最简单的文本输入
- 标题输入框始终可见，灰色小字弱化
- 工具栏图标切换 format（Note / Link / Quote），编辑器形态随之变化
- 📎 媒体和 ⭐ 评分作为通用能力
- 📂 Collection 选择集成在发布框内
- 发布默认 = published + 不 featured，精选和置顶通过发布按钮下拉勾选

### 14.2 各 Format 编辑器形态

| Format | 特有 UI 元素                  |
| ------ | ----------------------------- |
| Note   | 无（纯通用字段）              |
| Link   | URL 输入框（必填）            |
| Quote  | 引文输入框（quote_text 字段） |

### 14.3 Markdown 渲染

- body 字段使用 Markdown
- 支持直接粘贴图片（自动上传到 R2）
- 写入时渲染为 body_html，读取时直接使用

---

## 十五、Link 富媒体渲染

Link 格式帖子根据 URL 在渲染时计算（不入库）：

- 识别 YouTube、Bilibili、Spotify、Twitter 等平台
- 返回 embed URL、缩略图等渲染所需数据
- 不认识的 provider fallback 到普通链接展示
- 新增平台只需加一条 URL 匹配规则

**渲染优先级**（从上到下）：Embed → Body → Media

---

## 十六、Theme 组件覆盖

```typescript
export interface ThemeComponents {
  // 布局
  SiteLayout?: FC<SiteLayoutProps>;

  // 页面
  HomePage?: FC<HomePageProps>;
  PostPage?: FC<PostPageProps>;
  SinglePage?: FC<SinglePageProps>; // 独立页面
  FeaturedPage?: FC<FeaturedPageProps>;
  ArchivePage?: FC<ArchivePageProps>;
  SearchPage?: FC<SearchPageProps>;
  CollectionPage?: FC<CollectionPageProps>;
  CollectionsPage?: FC<CollectionsPageProps>;

  // Timeline 卡片（按 format）
  NoteCard?: FC<TimelineCardProps>; // 有标题 = 文章样式，无标题 = 短帖子
  LinkCard?: FC<TimelineCardProps>;
  QuoteCard?: FC<TimelineCardProps>;

  // Timeline 子组件
  ThreadPreview?: FC<ThreadPreviewProps>;
  TimelineFeed?: FC<TimelineFeedProps>;
  TimelineLoadMore?: FC<TimelineLoadMoreProps>;
}
```

**注意**：v2 移除了 `ArticleCard` 和 `ImageCard`，合并到 `NoteCard`。
