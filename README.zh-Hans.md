# Jant

> **Pre-1.0**：Jant 仍处于早期阶段。请预期会有粗糙边角、破坏性变更，以及仍在持续调整的文档。
>
> 在线演示：[demo.jant.me](https://demo.jant.me)（演示账号已自动填充，数据每日清空）
>
> 你也可以查看作者的博客作为参考：[owen.jant.blog](https://owen.jant.blog/)

Jant 是一个为单作者设计的小型博客系统，支持 **Note、Link、Quote** 三种内容格式。帖子之间可以串成 Thread，也可以用 Collection 归类整理。它的发布体验更接近 Twitter / Threads，而不是 WordPress / Ghost 那样的后台管理面板。

![Jant Home](https://jant-me-media.jant.me/assets/jant-home.png)

名字来自 _Jantelagen_（詹代法则）——出自一部 1933 年的北欧讽刺小说，常被概括为"别炫耀、别攀比"。Jant 想把这种"无压力"的默契带回个人写作里。

## 一种"无压力"的公开写作

大多数博客系统把"已发布"和"已广播"当成同一个决定——你发一篇东西，它就同时进入 RSS、订阅者的 feed、首页时间线。Jant 想要更安静的模型：一篇内容可以挂在站点上，拥有自己的 URL，归入某个 collection，或者作为某个 thread 的延续，而不必每次都变成一次"公告"。

具体落到产品上：

- **静默式记录**：发布时可选择从首页（Latest）隐藏，仅保留在指定 collection 和 `/archive` 中。零碎的表达不必打乱首页节奏。
- **非侵扰式更新**：即使内容出现在首页 Latest 中，也不会自动触发 RSS 推送。
- **策展式分发**：只有标记为 Featured 的内容才进入 `/feed` 和订阅者的 RSS。`/feed` 默认就指向 Featured，不是 Latest。

如果你还没想好要不要写博客，[这篇文章](docs/zh-Hans/why-blog.md)或许能给你一个理由。

## 博客的发布体验，应该是现代的

传统博客给你一个后台。进去是一张表单：标题、正文、分类、标签、摘要、SEO、封面图……填完，才能发布。这套界面是为管理内容设计的，不是为写东西设计的。

Twitter 和 Threads 证明了另一条路：没有后台，没有表单，没有标题。想到就写，写完就发。Jant 想把这种低摩擦还给个人博客——标题可选，随时可以追加成 Thread，发布只需要一个动作。

![Jant 撰写界面](https://jant-me-media.jant.me/assets/new.png)

另外，Jant 沿用了 Tumblr 的一个核心直觉：**Note、Link、Quote 应该是一等公民格式**。这三种形态基本覆盖了大部分日常想表达的内容。

## Jant 包含什么

- **三种一等公民格式**：Note、Link、Quote
- **Threads**：连续的想法可以延续，不必凑成长文
- **Collections**：按主题策展，更像书架而不是标签
- **多种媒体附件**：图片、视频、音频、Markdown、文档、粘贴代码
- **评分**：给书、电影、播客、文章打分
- **Featured / Latest 分离**：发布默认不等于推送
- 搜索、归档页和 RSS feeds
- 内建主题、字型主题和自定义 CSS
- **GitHub 双向同步**：每次编辑[自动同步到你自己的 GitHub 仓库](docs/zh-Hans/github-sync.md)，在 GitHub 上修改文件也会同步回站点；同步后的仓库本身就是一个完整的 Hugo 静态站点
- **完整 API 与 MCP**：自动化发布、导入、维护，[适合 AI agent 调用](docs/zh-Hans/automation-and-api.md)
- **完整的 Hugo 静态站点导出**：你随时可以[带着内容](docs/zh-Hans/export-and-import.md)离开

## 开始使用

| 方式                                                   | 适合谁                   | 成本             |
| ------------------------------------------------------ | ------------------------ | ---------------- |
| **[Cloudflare 自托管](docs/zh-Hans/deployment.md)**    | 想用极低维护成本运行的人 | 通常在免费额度内 |
| **[Docker 自托管](docs/zh-Hans/deployment-docker.md)** | 有自己服务器的人         | 你的服务器成本   |
| **[Jant 托管](docs/zh-Hans/hosted.md)**                | 不想处理部署的人         | $10.46 / 年起    |

三种方式跑的是同一份开源代码，内容随时可以通过 [导入导出](docs/zh-Hans/export-and-import.md) 或 [GitHub 同步](docs/zh-Hans/github-sync.md) 迁移。

## 快速开始

### 部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

最快的路径是用 Cloudflare 一键部署按钮——它会从 Jant starter 仓库开始，引导你填写所需字段。完整说明见 [使用 Cloudflare 部署](docs/zh-Hans/deployment.md)。

### 用 CLI 创建

```bash
npm create jant@latest my-site
cd my-site
npm run dev
```

打开 `http://localhost:3000`，在浏览器里完成初始设置。

### 使用 Docker 部署

如果你想走传统服务器路线，可以使用官方镜像：

- Docker 镜像：[`owenyoung/jant`](https://hub.docker.com/r/owenyoung/jant)
- 指南：[使用 Docker 部署](docs/zh-Hans/deployment-docker.md)

### 使用 Jant 托管

不想处理部署、升级、备份的话，可以直接使用 [jant.me](https://jant.me) 上的官方托管。和自托管运行的是同一份代码，包含自动 HTTPS、自定义域名和媒体存储。详见 [使用 Jant 托管](docs/zh-Hans/hosted.md)。

## 文档

### 开始

- [为什么今天仍然值得写博客？](docs/zh-Hans/why-blog.md)
- [简介](docs/zh-Hans/overview.md)
- [开始使用](docs/zh-Hans/getting-started.md)

### 运行你的站点

- [使用 Cloudflare 部署](docs/zh-Hans/deployment.md)
- [使用 Docker 部署](docs/zh-Hans/deployment-docker.md)
- [使用 Jant 托管](docs/zh-Hans/hosted.md)
- [配置](docs/zh-Hans/configuration.md)

### 使用你的站点

- [写作与内容组织](docs/zh-Hans/writing-and-organizing.md)
- [GitHub 同步](docs/zh-Hans/github-sync.md)
- [主题定制](docs/zh-Hans/theming.md)
- [代码注入](docs/zh-Hans/code-injection.md)

### 数据与集成

- [导出与导入](docs/zh-Hans/export-and-import.md)
- [备份与恢复](docs/zh-Hans/backups.md)
- [自动化与 API](docs/zh-Hans/automation-and-api.md)

### 参考

- [常见问题](docs/zh-Hans/faq.md)
- [API 参考（英文）](docs/API.md)

## 开发

Jant 自己的仓库使用 [mise](https://mise.jdx.dev/) 管理开发环境依赖和 Task.

```bash
git clone https://github.com/jant-me/jant.git
cd jant
mise install
pnpm install
mise run dev
```

贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

AGPL-3.0-or-later
