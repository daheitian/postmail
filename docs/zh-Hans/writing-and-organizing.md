# 写作与内容组织

Jant 刻意把发布模型保持得很小。你写帖子，需要的时候把它们串成 thread，在有帮助时再用 collection 组织起来，方便读者浏览。

## 帖子格式

### Note

当你想写原创内容时，用 note。

- note 可以很短，也可以很长
- 标题是可选的
- 如果 note 有标题，Jant 会用它生成 URL slug
- 如果没有标题，Jant 会生成一个简短的随机 slug

notes 很适合用来写日记、随笔、状态更新，或者以图片为主的帖子。

### Link

当目标链接和你的评论同样重要时，用 link post。

- `url` 是关键字段
- `title` 是可选的
- 你自己的文字可以写在正文里

link posts 适合分享文章、视频、工具、播客，或者任何你想指给别人看的东西。

### Quote

当你想保存带出处的引文时，用 quote post。

- `quoteText` 保存引用内容
- `sourceName` 保存出处名称
- `sourceUrl` 是可选的，但如果来源在线可访问，通常很有用

quote posts 适合整理读书摘录、访谈片段，或者你想和自己正文分开的引用资料。

## 附件

帖子可以按固定顺序包含附件。

- 媒体附件：图片、视频、音频，以及 PDF 之类的文档
- 文本附件：额外的 Markdown 内容块，包括粘贴的代码，以及那些应该附着在帖子上的补充说明

附件列表属于帖子本身。调整附件顺序，会影响这篇帖子在所有地方的展示方式。

## 评分

帖子可以带一个可选的 1 到 5 分评分。

当你想给下面这些内容保留一个轻量记录时，可以使用评分：

- 书
- 电影
- 文章
- 专辑
- 以及其他任何你想在自己站点上评价的东西

评分会附着在帖子上，而不是散落在第三方服务里。

## Threads

Threads 是“回复自己”的结构。每条回复都属于根帖所在的同一个 thread。

关键规则：

- 可见性跟随根帖
- 你不能单独置顶一条回复
- `Featured` 状态是独立的，所以某条回复可以是 featured，即使根帖不是

当你想把一串连续的想法放在一起，而不是把一切都压成一篇文章时，就用 threads。

## Collections

Collections 是按 `/{slug}` 组织的策展式内容分组。

你可以用它来做：

- 持续更新的主题
- 阅读清单
- 旅行记录
- 项目日志
- 从旧帖里挑出来的一组专题内容

Collections 有自己的页面和 feed。当你想要编辑控制时，它们比 tags 更合适。

你也可以在 URL 里组合多个 collections。例如：

- `/collections/reading+movies`
- `/collections/notes+links+quotes`

Jant 会把它当成一个跨多个 collection 的组合视图。

- 它展示的是这些 collections 中帖子的并集
- 如果同一个 thread 同时属于多个 collections，只会出现一次
- 同样的写法也适用于 feed：`/collections/{slug1}+{slug2}/feed`

## 可见性与策展

### 发布状态

| 状态                 | 是否出现在 Latest | 是否出现在 collections | 是否需要登录 |
| -------------------- | ----------------- | ---------------------- | ------------ |
| `Public`             | 是                | 是                     | 否           |
| `Hidden from Latest` | 否                | 是                     | 否           |
| `Private`            | 否                | 对公开访客不可见       | 是           |
| `Draft`              | 否                | 否                     | 是           |

### Featured

`Featured` 是一个独立的策展标记。

- featured 帖子会出现在 Featured 页面
- featured feed 位于 `/feed/featured`
- 主 `/feed` 可以指向 `Featured` 或 `Latest`
- 默认情况下，`/feed` 指向的是 `Featured`，不是 `Latest`

当你想标出自己的代表作、编辑精选，或者那一小部分你真的希望订阅者默认收到的内容时，就用 `Featured`。

### 为什么默认 feed 是 Featured

Jant 的核心假设之一是：发布一篇内容和广播一篇内容，不是同一个动作。

在默认设置里：

- **`Featured`** 帖子会进入 `/feed`
- **`Public`** 帖子仍然可以出现在站点上，也会进入 `/feed/latest`
- **`Hidden from Latest`** 帖子仍然是已发布状态，但不会出现在 Latest 中

这给了你一个很好用的中间地带：

- 把内容发布到自己的站点上
- 让它可以通过直链访问
- 把它放进某个 collection
- 把它继续写在线程里
- 同时避免它进入默认的订阅者 feed

这是 Jant 核心的编辑选择之一，不是某个次级设置技巧。

### 默认行为一览

这个表假设你使用默认配置 `MAIN_RSS_FEED=featured`。

| 帖子状态             | 直链可访问   | Latest | 默认 `/feed` | Collections  |
| -------------------- | ------------ | ------ | ------------ | ------------ |
| `Public` 且 featured | 是           | 是     | 是           | 是           |
| `Public`             | 是           | 是     | 否           | 是           |
| `Hidden from Latest` | 是           | 否     | 否           | 是           |
| `Private`            | 仅登录后可见 | 否     | 否           | 仅登录后可见 |
| `Draft`              | 否           | 否     | 否           | 否           |

如果你后来把 `MAIN_RSS_FEED` 改成 `latest`，默认 `/feed` 的行为会跟着变化，但 `Hidden from Latest` 仍然会让这些帖子留在那条流之外。

## URLs 与浏览页面

Jant 使用可读 URL：

- 帖子使用 `/{slug}`
- collections 使用 `/{slug}`
- 组合 collection 视图使用 `/collections/{slug1}+{slug2}+{slug3}`
- 搜索在 `/search`
- 归档在 `/archive`
- Featured 页面在 `/featured`

Feeds：

- `/feed` 使用你当前配置的主 feed
- `/feed/latest` 永远返回最新公开帖子
- `/feed/featured` 永远返回 featured 帖子
- `/{slug}/feed` 返回单个 collection 的 feed
- `/collections/{slug1}+{slug2}/feed` 返回组合 collection 的 feed

## 什么时候用 Thread、Collection 和 Featured

当多篇帖子属于同一个连续对话时，用 thread。

当多篇帖子共享同一个主题，但并不是按顺序写出来时，用 collection。

当你想让内容获得额外可见性，并进入默认 feed 分发时，用 featured。
