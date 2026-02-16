# Jant - 产品设计文档 v2

> **Jant** = Jantelagen（詹代法则）缩写
> 强调低调、去社交化的个人表达

## 1. 产品定位

**一句话**：像 Threads.net 一样丝滑的个人微博客系统。

**核心特征**：

- 单博客，单作者
- 三种内容格式（Note, Link, Quote）
- Thread（帖子串）支持
- Collection 策展
- 极简部署

**非目标**：

- 没有社交功能（不关注、不点赞、不转发）
- 不支持多用户
- 不做复杂权限系统

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

| 字段     | 说明                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| `title`  | 可选。Note 有标题时按文章样式渲染；Link 中作为链接描述标题；Quote 中作为引文来源/出处 |
| `url`    | Link 中为分享的链接（必填）；Quote 中为引文出处链接（可选）；Note 中不使用            |
| `body`   | 可选正文，Markdown 格式                                                               |
| `media`  | 可选媒体，图片/视频/音频可混合上传                                                    |
| `rating` | 可选评分，1-5 整数                                                                    |

**设计理念**：三种 format 覆盖内容的三种来源——我创造的、我指向的、我引用的。所有其他变化通过通用字段和 Collection 来表达，不增加 format。

### 2.2 Page（独立页面）

与 Post 平级的独立内容类型，单独存储。

- 不出现在时间线和 RSS
- 不属于任何 Collection
- 没有 featured / rating / format 概念
- 有固定 URL：`/{slug}`，用户必须自定义 slug
- 在 `/dash` 后台创建和管理

**示例**：`/about`、`/now`、`/uses`

### 2.3 Status & Featured

| 字段       | 说明                                   |
| ---------- | -------------------------------------- |
| `status`   | `draft`（草稿）/ `published`（已发布） |
| `featured` | 布尔值，独立于 status                  |

**规则**：

- 默认发布 = published + 不 featured
- 只有 published 的帖子可以标记为 featured
- 默认 RSS 只输出 featured 帖子

**设计理念**：默认 published 但不 featured。减少发布焦虑——随手发的东西不会被推送到 RSS，只有主动标记精选的内容才进默认 feed。

### 2.4 Thread（帖子串）

**场景**：写着写着内容变长，想拆成多条但保持连贯。

**交互**：

- 发布时可选择「回复」某条帖子
- 回复会形成链式结构，用竖线连接
- 首页展示时，新帖会带上下文提示

**规则**：

- Thread 内所有帖子继承 root 的 status 和 featured
- 删除 root = 整个 Thread 软删除
- 删除中间帖 = 链断开，但子帖保留

### 2.5 Collection（策展）

**场景**：把零散帖子组织成主题集合。Collection 同时承担"子类型"的分类职责。

**示例**：

- `/c/reading` - 读过的书（Link + rating）
- `/c/movies` - 看过的电影（Link + rating）
- `/c/tools` - 好用的工具（Link）
- `/c/ai-chats` - AI 对话记录（Note）
- `/c/recipes` - 食谱合集（Note）

**规则**：

- 一个帖子只属于一个 Collection（一对多）
- Collection 有名称和图标（Lucide SVG 或用户上传图片）
- Collection 有自定义排序方式（最新/最早/评分最高/评分最低）
- Collection 有自定义 slug，地址为 `/c/{slug}`，创建时根据名称自动生成，用户可修改
- Collection 有独立的 RSS：`/c/{slug}/feed`
- 不预设任何 Collection，首次使用时引导创建
- 查看 Collection 时可通过 featured 筛选

### 2.6 Media（媒体）

- 所有 format 都支持媒体
- 图片、视频、音频可混合上传
- 展示方式：一排展示，像 Threads 一样滑动浏览

### 2.7 Link 富媒体渲染

Link 格式的帖子，后端根据 URL 在 API 返回时计算渲染信息（不入库）：

- 识别 YouTube、Bilibili、Spotify、Twitter 等平台
- 返回 embed URL、缩略图等渲染所需数据
- 支持各平台多种 URL 变体（标准链接、短链接、移动端链接）
- 新增平台只需后端加一条 URL 匹配规则，无需修改数据模型
- 不认识的 provider 自动 fallback 到普通链接展示

**渲染优先级**（从上到下）：Embed → Body → Media

---

## 3. UI/UX 设计

### 3.1 设计理念

**参考**：Threads.net 的丝滑 + 传统博客的内容深度

**关键词**：

- **极简**：大量留白，内容为王
- **流畅**：所有状态变化都有动画
- **移动优先**：单栏布局，桌面端最大 680px
- **即时反馈**：骨架屏、乐观更新

### 3.2 视觉规格

**间距**：宽松，给内容呼吸空间
**圆角**：柔和，8-16px
**边框**：极淡或无，用间距和阴影区分
**字体**：系统字体，15px 基准
**颜色**：单色主调，仅交互元素用强调色

### 3.3 帖子卡片设计

```
┌─────────────────────────────────────────────┐
│  [头像]  作者名 · 3小时前                    │
│    │                                        │
│    │     帖子正文内容...                     │
│    │                                        │
│    │     [图片/媒体区域]                     │
│    │                                        │
│    │     💬 回复                            │
│    │                                        │
│  (竖线连接 Thread)                          │
└─────────────────────────────────────────────┘
```

### 3.4 筛选栏

单层扁平，全部互斥：

```
All  ⭐Featured │ 📝Note  🔗Link  💬Quote
```

查看 Collection 和各 format 时，均可通过 Featured 进行交叉筛选。

**Home 按日期分组展示，其他筛选页面不按日期分组。**

### 3.5 发布框

**核心原则**：

- 默认就是最简单的文本输入（Note 模式）
- 标题输入框始终可见但以灰色小字弱化
- 通过工具栏图标切换 format，编辑器形态随之变化
- 📎 媒体和 ⭐ 评分作为可选的通用能力
- 📂 Collection 选择集成在发布框内，降低使用门槛
- 草稿逻辑参考 Threads / Bluesky：发布按钮旁有 drafts 图标，有内容时点击 = 存为草稿并清空，空输入框时点击 = 展开草稿列表
- 发布默认 = published + 不 featured，精选通过发布按钮下拉勾选

### 3.6 动画规格

- **时长**：150-300ms
- **缓动**：ease-out
- **场景**：
  - 页面切换：淡入 + 轻微上移
  - 新内容加载：骨架屏闪烁
  - 按钮点击：轻微缩放
  - 展开/收起：高度动画

---

## 4. 信息架构

### 4.1 URL 设计原则

> URL 是产品的一部分。应该简洁、美观、有意义。

### 4.2 核心路由

| URL              | 内容                                    |
| ---------------- | --------------------------------------- |
| `/`              | 首页，所有 published 帖子（按日期分组） |
| `/featured`      | 仅精选帖子                              |
| `/p/{id}`        | 单条帖子                                |
| `/{slug}`        | 独立页面（About, Now 等）               |
| `/c/{slug}`      | Collection                              |
| `/archive`       | 归档                                    |
| `/search`        | 搜索                                    |
| `/feed`          | RSS（仅 featured）                      |
| `/feed/all`      | RSS（所有 published）                   |
| `/c/{slug}/feed` | Collection RSS                          |

**Collection 支持 `+` 组合语法**：`/c/reading+tools+movies` 展示多个 Collection 的聚合内容。

### 4.3 后台路由

| URL                 | 功能            |
| ------------------- | --------------- |
| `/dash`             | 仪表盘          |
| `/dash/posts`       | 帖子管理        |
| `/dash/pages`       | 页面管理        |
| `/dash/collections` | Collection 管理 |
| `/dash/settings`    | 设置            |

---

## 5. RSS 订阅

**三级 feed**：

- `/feed` - 仅 featured，适合订阅精选内容
- `/feed/all` - 所有 published，不想错过任何东西
- `/c/{slug}/feed` - 单个 Collection 内的帖子

**Link 类型处理**：标题加 `↗` 前缀表示外链

**Thread 处理**：非 root 帖子在内容末尾附加上下文链接

---

## 6. 主题系统

### 6.1 颜色主题

预设：default, ocean, forest, sunset, lavender, rose, sand, slate, gameboy, terminal, notepad, nord, dracula, solarized

**切换**：后台设置，自动支持 light/dark mode

### 6.2 组件覆盖

用户可在自己的项目中覆盖任意组件，实现完全定制。

---

## 7. 技术约束

- **部署目标**：Cloudflare Workers（Phase 1 仅支持这个）
- **样式**：BaseCoat UI + 有限的 Tailwind
- **交互**：Datastar（Hypermedia）
- **语义标记**：microformats2

---

## 8. Phase 1 MVP 范围

**包含**：

- 3 种 Format（note, link, quote）+ Page
- Status（draft/published）+ Featured
- Rating 评分（通用可选字段）
- 混合媒体（图片、视频、音频）
- Thread 支持
- Collection 策展（一对多，自定义图标/排序/slug）
- Collection `+` 组合语法
- Link 富媒体渲染（YouTube, Bilibili 等）
- 搜索（全文）
- RSS（/feed + /feed/all + /c/{slug}/feed）
- 管理后台（帖子、页面、Collection、设置）
- 草稿系统
- 多语言（en/zh）
- 颜色主题
- 筛选栏（All, Featured, Note, Link, Quote）

**不包含**：

- 评论系统
- 统计分析
- 自定义帖子类型（预留扩展空间，暂不实现）
- API Token
- 自定义 CSS/JS 注入

---

## 附录：v1 → v2 变更摘要

### 内容类型

- 6 种类型 → 3 种 Format + 独立 Page
- `article` 合并到 `note`（有无 title 区分渲染）
- `image` 取消（媒体作为任何 format 的通用能力）
- `page` 从内容类型独立为单独数据表
- 新增 `rating` 通用字段（1-5 整数）
- 媒体支持混合上传（图片+视频+音频）
- `quote_source` 复用 `title` 字段
- Post 取消自定义 slug，统一用 `/p/{id}`
- `attachments` 改名为 `media`

### 可见性系统

- 4 级可见性 → `status` + `featured` 两个独立维度
- 取消 `quiet`，默认状态为 `published`
- 取消 `unlisted`（Page 承担此角色）
- `draft` 从可见性维度移到 `status` 维度
- `status` 使用字符串而非布尔值（预留 scheduled 等扩展）

### Collection

- 保持一对多关系
- 新增图标支持（Lucide SVG 或用户上传图片）
- 新增自定义排序（最新/最早/评分正序/倒序）
- 新增自定义 slug（根据名称自动生成，用户可改）
- 新增 Collection RSS（`/c/{slug}/feed`）
- 新增 `+` 组合语法
- 不预设任何 Collection
- Collection 承担原"子类型"的分类职责

### 发布框

- 标题输入框始终可见（可选）
- 评分通过 ⭐ 按钮展开
- Collection 选择集成在发布框内
- 草稿逻辑参考 Threads / Bluesky
