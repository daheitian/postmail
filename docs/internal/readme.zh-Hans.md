# Jant - 产品设计文档

> **Jant** = Jantelagen（詹代法则）缩写
> 强调低调、去社交化的个人表达
> 简单低摩擦的发布体验，同时强调不打扰 RSS 订阅用户(默认的 RSS 仅输出 Featured 内容)

## 1. 产品定位

**一句话**：像 Threads.net 一样丝滑的个人轻博客系统。

**核心特征**：

- 单博客，单作者
- 三种内容格式（Note, Link, Quote）类似 Tumblr
- Thread（帖子串）——把想法串联成连贯的对话
- Collection（策展）——把零散帖子组织成主题集合
- 可定制的颜色方案
- 极简部署（Cloudflare Workers，一键启动）

---

## 2. 内容模型

### 2.1 Format（格式）

系统固定 3 种，不可增删。每种对应不同的编辑器形态和用户意图。

| Format    | 用户意图     | 专属字段             | 示例                        |
| --------- | ------------ | -------------------- | --------------------------- |
| **note**  | 我创造的内容 | —（纯通用字段）      | 短想法、长文、图片、AI 对话 |
| **link**  | 我指向的内容 | `url`（必填）        | 分享好文、推荐工具、YouTube |
| **quote** | 我引用的内容 | `quote_text`（可选） | 名言警句、书摘、截图式引用  |

**通用字段**（所有 format 共享）：

| 字段        | 说明                                                           |
| ----------- | -------------------------------------------------------------- |
| `title`     | 可选。Note 中为文章标题；Link 中为链接描述；Quote 中为引文来源 |
| `url`       | Link 中为分享的链接（必填）；Quote 中为引文出处链接（可选）    |
| `body`      | 可选正文，Markdown 格式                                        |
| `body_html` | 写入时由 body 渲染生成，读取时直接使用，避免重复计算           |
| `media`     | 可选媒体，图片/视频/音频可混合上传                             |
| `rating`    | 可选评分，1-5 整数                                             |

**设计理念**：三种 format 覆盖内容的三种来源——我创造的、我指向的、我引用的。Note 有标题时按文章样式渲染，无标题时按短帖子渲染，不需要独立的 article 类型。图片、视频作为任何 format 的通用媒体能力，不需要独立的 image 类型。Rating 是通用字段，任何帖子都可以评分，不需要独立的 review 类型。所有细分分类的需求交给 Collection。

### 2.2 Page（独立页面）

与 Post 平级的独立内容类型，单独存储。

- 不出现在时间线和 RSS
- 不属于任何 Collection
- 没有 featured / rating / format / pinned 概念
- 有固定 URL：`/{slug}`，用户必须自定义 slug，仅支持单级
- 在 `/dash` 后台创建和管理
- 同样存储 `body` 和 `body_html`

**示例**：`/about`、`/now`、`/uses`

### 2.3 Status、Featured & Pinned

| 字段       | 说明                                   |
| ---------- | -------------------------------------- |
| `status`   | `draft`（草稿）/ `published`（已发布） |
| `featured` | 布尔值，独立于 status，标记精选内容    |
| `pinned`   | 布尔值，置顶帖子，显示在时间流最顶部   |

**规则**：

- 默认发布 = published + 不 featured + 不 pinned
- 只有 published 的帖子可以标记为 featured 或 pinned
- 置顶帖子最多 3 条，之间按 created_at 倒序
- `status` 使用字符串而非布尔值，预留 `scheduled` 等未来扩展

**设计理念**：默认 published 但不 featured。减少发布焦虑——随手发的东西不会被推送到 RSS，只有主动标记精选的内容才进默认 feed。

### 2.4 Thread（帖子串）

**场景**：写着写着内容变长，想拆成多条但保持连贯。

**交互**：

- 发布时可选择「回复」某条帖子
- 回复会形成链式结构
- 首页 timeline 中，Thread 会内联预览最近的回复

**规则**：

- Thread 内所有帖子继承 root 的 status 和 featured
- 删除 root = 整个 Thread 软删除
- 删除中间帖 = 子帖保留

### 2.5 Collection（策展）

**场景**：把零散帖子组织成主题集合。Collection 同时承担"子类型"的分类职责——用户通过 Collection 来区分书评、影评、产品推荐等，而非通过内容类型。

**示例**：

- `/c/reading` - 读过的书（Link + rating）
- `/c/movies` - 看过的电影（Link + rating）
- `/c/tools` - 好用的工具（Link）
- `/c/ai-chats` - AI 对话记录（Note）

**规则**：

- 一个帖子可以属于多个 Collectio
- Collection 有名称和图标（Lucide SVG 或用户上传图片）
- Collection 有自定义排序方式（最新/最早/评分最高/评分最低）
- Collection 有自定义 slug，地址为 `/c/{slug}`，创建时根据名称自动生成，用户可修改
- Collection 有独立的 RSS：`/c/{slug}/feed`
- Collection 有 `position` 字段，后台支持拖拽排序
- 不预设任何 Collection，首次使用时引导创建

### 2.6 Media（媒体）

- 所有 format 都支持媒体
- 图片、视频、音频可混合上传
- 图片上传时客户端预处理：EXIF 方向校正、缩放、隐私元数据剥离、WebP 转换
- 服务端存储到 R2 或 S3 兼容存储，生成 blurhash 用于加载占位

### 2.7 Link 富媒体渲染

Link 格式的帖子，后端根据 URL 在 API 返回时计算渲染信息（不入库）：

- 识别 YouTube、Bilibili、Spotify、Twitter 等平台
- 返回 embed URL、缩略图等渲染所需数据
- 支持各平台多种 URL 变体（标准链接、短链接、移动端链接）
- 新增平台只需后端加一条 URL 匹配规则，无需修改数据模型
- 不认识的 provider 自动 fallback 到普通链接展示

**渲染优先级**（从上到下）：Embed → Body → Media

---

## 3. 用户体验

### 3.1 设计理念

**参考**：Pika.page 的简洁 + Threads.net 的丝滑

**关键词**：

- **极简**：大量留白，内容为王。单栏布局，无侧边栏
- **流畅**：所有状态变化都有动画
- **移动优先**：单栏布局，桌面端窄栏居中
- **即时反馈**：骨架屏、加载状态

### 3.2 前台布局

单栏设计，无侧边栏，参考 Pika.page 的简洁风格。顶部导航栏 + 帖子流。

**导航栏**：作者名在左，nav_items 链接和搜索在右。典型配置：

```
作者名       About  Featured  Archive  Collections  📡  🔍
```

- 导航链接完全由用户通过 nav_items 自定义配置（📡 RSS 链接也是一个普通的 link 类型 nav_item）
- 🔍 点击弹出搜索弹窗
- 登录后导航栏右侧出现头像，点击弹出菜单（Dashboard、New Post、Logout）
- 未登录的博主直接访问 `/dash` 进入登录页

### 3.3 首页 Timeline

- 展示所有 published 帖子
- 置顶帖子（pinned）显示在日期分组之前
- 帖子卡片根据 format 和内容自动适配不同样式
- 无限滚动加载更多，基于 cursor 分页，无 footer
- 登录后顶部出现发帖框

### 3.4 发帖

弹窗形式，参考 Threads。

**核心原则**：

- 默认就是最简单的文本输入（Note 模式）
- 标题输入框始终可见但以灰色小字弱化
- 通过工具栏图标切换 format，编辑器形态随之变化
- 📎 媒体和 ⭐ 评分作为可选的通用能力
- 📂 Collection 选择集成在发布框内，降低使用门槛
- 草稿逻辑参考 Threads / Bluesky：发布按钮旁有 drafts 图标，有内容时点击 = 存为草稿并清空，空输入框时点击 = 展开草稿列表
- 发布默认 = published + 不 featured，精选和置顶通过发布按钮下拉勾选

### 3.5 搜索

弹窗形式。点击导航栏 🔍 弹出搜索框 + 实时结果。

### 3.6 Archive

独立页面，承担所有筛选功能。使用 query parameter 进行筛选：

- `/archive` — 全部
- `/archive?format=note` — 仅 Note
- `/archive?format=link` — 仅 Link
- `/archive?format=quote` — 仅 Quote
- `/archive?featured=true` — 仅精选
- 支持组合：`/archive?format=note&featured=true`
- 按时间浏览（按月份分组）

首页保持干净，所有高级筛选收到 Archive 里。

### 3.7 Collections 页面

`/collections` 展示所有 Collection 的列表页，点击进入单个 Collection 的帖子列表（`/c/{slug}`）。Collections 页面为双栏布局，左侧边栏展示所有的 Collection，右侧栏展示当前 Collection 的帖子列表。

### 3.8 首次使用（Onboarding）

首次访问时自动引导到设置页面，收集管理员账号（邮箱 + 密码）和站点语言。完成后即可开始发布。

### 3.9 动画规格

- **时长**：150-300ms
- **缓动**：ease-out
- **场景**：页面切换（淡入 + 轻微上移）、新内容加载（骨架屏）、按钮点击（轻微缩放）、展开/收起（高度动画）

---

## 4. 导航系统

### 4.1 nav_items

站点顶部导航完全由用户自定义，参考 Pika.page 的导航管理设计。通过拖拽排序。

**类型**：

- `page` — 指向一个 Page（自动关联，Page 删除时 nav_item 也删除）
- `link` — 任意 URL（/collections、/featured、/archive、/c/reading、外部链接，都是 link）

**后台管理**（`/dash/pages`，与 Page 管理合并，参考 Pika.page）：

- 上半区：已添加到导航的项目（Page 和 Link 混合），可拖拽排序
- 下半区：未添加到导航的 Page，可一键添加
- 支持添加任意外部链接

---

## 5. 信息架构

### 5.1 URL 设计

> URL 是产品的一部分。应该简洁、美观、有意义。

帖子默认使用短 ID（如 `/p/jR3k`），也支持可选的自定义 `path`（仅通过 API 设置，支持多级路径如 `2024/01/my-post`，用于博客迁移场景）。Page 和 Collection 由用户自定义 slug。

### 5.2 前台路由

| URL              | 内容                                      |
| ---------------- | ----------------------------------------- |
| `/`              | 首页 timeline（所有 published）           |
| `/featured`      | 仅精选帖子                                |
| `/p/{id}`        | 单条帖子                                  |
| `/{slug}`        | 独立页面（最低优先级）                    |
| `/{path}`        | 帖子自定义路径（支持多级，API 设置）      |
| `/c/{slug}`      | Collection                                |
| `/c/{a}+{b}`     | Collection 组合查看                       |
| `/collections`   | Collection 列表页                         |
| `/archive`       | 归档（支持 ?format= &featured= 筛选）     |
| `/search`        | 搜索（弹窗，也支持直接访问）              |
| `/feed`          | RSS（仅 featured）                        |
| `/feed/all`      | RSS（所有 published，支持 ?format= 筛选） |
| `/c/{slug}/feed` | Collection RSS                            |
| `/sitemap.xml`   | 自动生成的站点地图                        |

### 5.3 后台路由

| URL                 | 功能                                 |
| ------------------- | ------------------------------------ |
| `/dash`             | 仪表盘                               |
| `/dash/posts`       | 帖子管理                             |
| `/dash/pages`       | 页面 + 导航管理（参考 Pika.page）    |
| `/dash/collections` | Collection 管理（拖拽排序 + 分隔线） |
| `/dash/media`       | 媒体库                               |
| `/dash/settings`    | 站点设置（个人资料、主题）           |

### 5.4 重定向

支持 301（永久）和 302（临时）重定向。两种来源：

- **自动**：Page 或 Collection 修改 slug 时，系统自动为旧路径创建 301 重定向
- **手动**：用户在后台自行创建，用于短链接、旧站迁移等场景

---

## 6. RSS 与 SEO

**三级 feed**：

- `/feed` — 仅 featured，适合订阅精选内容
- `/feed/all` — 所有 published，不想错过任何东西
- `/c/{slug}/feed` — 单个 Collection 内的帖子

**Feed 支持 query parameter 筛选**（与 Archive 一致）：

- `/feed/all?format=note` — 所有 Note
- `/feed/all?format=link` — 所有 Link
- `/feed/all?format=quote` — 所有 Quote

Archive 页面筛选后可展示对应的 RSS 订阅链接。

**Sitemap**：自动生成，包含所有公开帖子和页面。

**SEO**：Open Graph、Twitter Cards、JSON-LD 结构化数据、microformats2 语义标记。

---

## 7. 主题系统

内置 14 种颜色方案：default, ocean, forest, sunset, lavender, rose, sand, slate, gameboy, terminal, notepad, nord, dracula, solarized。

通过 CSS 变量实现，自动支持 light/dark mode。在后台设置中切换。

## 8. 技术选型

- **部署**：Cloudflare Workers
- **框架**：Hono + Hono JSX
- **交互**：Datastar（Hypermedia，服务端渲染 + 增量更新） + Lit
- **样式**：Tailwind CSS v4 + BaseCoat 组件
- **数据库**：D1 + Drizzle ORM
- **存储**：Cloudflare R2 或 S3 兼容存储
- **认证**：better-auth
- **多语言**：Lingui
- **语义标记**：microformats2
