# 常见问题

## 关于 Jant 本身

### 为什么不支持多作者？

Jant 是为单作者设计的。多作者意味着权限、审稿流、署名归属、通知系统——这些会让产品向 CMS 的方向漂移，而 CMS 不是 Jant 想成为的东西。

如果你需要多作者，WordPress 和 Ghost 都做得很好。

### 为什么默认 feed 是 Featured 而不是 Latest？

因为发布和广播是两件事。

`/feed` 是订阅者收到的内容流。`Latest` 意味着"我每写一句你都收到"，对大部分作者和读者都是负担。`Featured` 意味着"我挑出来的、我希望你看到的"——这才是 RSS 订阅本来的承诺。

`/feed/latest` 仍然存在。如果你想保留旧的全量订阅行为，把 `MAIN_RSS_FEED=latest` 设上就行。

### 我可以带着内容离开吗？

可以。两条路：

- [Hugo 导出](export-and-import.md) —— 一次性导出成可移植的静态站点结构
- [GitHub 同步](github-sync.md) —— 你的内容始终以标准 Markdown 存在于你自己的 Git 仓库里

没有专属格式。

### 支持评论吗？

不支持。这是有意的——Jant 想保持安静。

如果你确实需要评论，可以接入第三方系统（Disqus、giscus 等），通过 [主题定制](theming.md) 嵌入。

### 能不能迁移到 WordPress / Ghost / 静态站点？

`site export` 会生成一个 Hugo 兼容的目录。从那里到任何静态站点生成器都是一次格式转换。从 Hugo 到 WordPress / Ghost 没有现成路径，但 Markdown + YAML front matter 是行业标准，写一个转换脚本不难。

GitHub 同步也是一个出口——你的内容已经在 GitHub 上以 Markdown 存在，可以被任何工具消费。

## 选择和部署

### 自托管和托管怎么选？

| 你的情况                             | 选这个                                |
| ------------------------------------ | ------------------------------------- |
| 不想处理任何部署细节                 | [托管](hosted.md)                     |
| 写代码，喜欢有控制权，想要近乎零成本 | [Cloudflare 自托管](deployment.md)    |
| 已经有一台服务器                     | [Docker 自托管](deployment-docker.md) |

如果纠结，建议从托管开始——以后想自托管，所有内容都能 [带走](export-and-import.md)。

### Cloudflare 和 Docker 怎么选？

**Cloudflare**：

- 全球边缘部署
- 几乎零运维
- 大多数个人站点在免费额度内
- 需要用 Wrangler 和 D1 / R2

**Docker**：

- 跑在你已有的服务器上
- 可以选 SQLite 或 Postgres，本地媒体或 S3 兼容存储
- 你自己负责备份、HTTPS、反向代理
- 适合已经熟悉 Docker 运维的人

如果两边对你都新：先试 Cloudflare，它通常更省事。

### 数据会被锁定吗？

不会。这是有意设计的。

- 数据库随时可以 [导出 SQL](export-and-import.md#数据库导出)
- 内容随时可以 [导出成 Hugo 站点](export-and-import.md)
- 媒体放在你自己的 R2 / S3 / 本地文件系统
- [GitHub 同步](github-sync.md) 让内容始终以 Markdown 存在于你自己的 Git 仓库

托管和自托管使用完全相同的代码，没有"托管专属功能"。

## 实际使用

### 能用 AI agent 发帖吗？

可以。Jant 提供三种入口，详见 [自动化与 API](automation-and-api.md)：

- 本地 `npx jant` CLI
- HTTP JSON API
- `/api/mcp` MCP endpoint

`create-jant` 创建出来的项目自带 `AGENTS.md` 和示例脚本，agent 拿到 API token 之后就可以直接发帖、传图、改设置。

如果你启用了 [GitHub 同步](github-sync.md)，AI 也可以直接读写仓库里的 Markdown 文件——对很多 AI coding agent 来说，文件比 API 更顺手。

### 支持中文 / 多语言吗？

Jant UI 同时提供英文和中文。站点内容本身可以是任何语言。

`SITE_LANGUAGE` 控制站点的主要语言代码，影响 HTML `lang` 属性、RSS feed metadata 和 dashboard 默认语言。

### 能改主题吗？

可以，三层控制能力：

1. 内建颜色主题
2. 内建字型主题
3. 自定义 CSS（覆盖任何 CSS 变量或写选择器）

详见 [主题定制](theming.md)。

### 能用自定义域名吗？

可以。

- **托管**：在 dashboard 里加
- **Cloudflare 自托管**：在 Cloudflare Workers & Pages 里加 domain，并设置 `SITE_ORIGIN`
- **Docker 自托管**：在你的反向代理里指过来，并设置 `SITE_ORIGIN`

详见 [部署](deployment.md) 和 [部署 Docker](deployment-docker.md)。

## 关于项目本身

### Jant 是开源的吗？

是。完整源码在 GitHub 上。

### 有发展路线图吗？

Jant 处于 pre-1.0 阶段，路线图主要由作者本人的实际需求驱动。重大变更会先在 commit 和 changelog 里出现。

如果你在使用中遇到问题或有建议，可以通过 GitHub Issues 反馈，或者直接写信到 `owen#jant.me`。

### 为什么要叫 Jant？

来自 _Jantelagen_（扬特法则），一个北欧社会概念，大致是"别把自己看得太重，也别总想着把自己放在别人之上"。这个词很适合一个希望保持安静的产品。

### $10.46 这个价格是怎么定的？

参见 [托管](hosted.md#价格)。简短回答：来自 `.com` 域名的成本价，一个让人觉得"亲切又不是玩笑"的价格带。

## 接下来

- [简介](overview.md) —— 重新理解 Jant 想解决什么
- [开始使用](getting-started.md) —— 选一条路径
