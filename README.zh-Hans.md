# Jant

> **Pre-1.0**：Jant 仍处于早期阶段。请预期会有粗糙边角、破坏性变更，以及仍在持续调整的文档。
>
> 在线演示：[demo.jant.me](https://demo.jant.me)
>
> 演示账号：`demo@jant.me` / `jantdemodemojant`

Jant 是一个为单作者准备的小型博客系统。它把 note、link、quote、thread、collection 都当作正常的写作形态来对待，发布体验更像发帖，而不是打开一个后台管理面板。

没有关注者。没有点赞。没有算法信息流。

名字来自 _Jantelagen_，一个常被理解为“谦逊、别把自己看得太重”的北欧社会概念。我一直很喜欢这个词，所以就用它作为名字的灵感。

## 为什么会有 Jant

最诚实的答案也许是：因为我找不到自己真正想要的东西。

大多数博客系统都把“已发布”和“已广播”当成同一个决定。你发一篇东西，它就会同时进入 RSS、订阅者的 feed、时间线。我想要的是一种更安静的模型。一篇内容应该可以挂在站点上，拥有自己的 URL，属于某个 collection，或者作为某个 thread 的延续存在，但不必自动变成一次“公告”。在 Jant 里，`/feed` 默认指向 `Featured`，不是 `Latest`；而 `Hidden from Latest` 正是为这种中间地带准备的。

我也希望发布体验是现代的。不是另一个 WordPress 或 Ghost 式的后台，不是填表单、点保存、再回到控制台，而是更接近“发帖”。Threads 在这一点上做对了一部分。很多写作本来就是先写一句，再补一句，再修正一句，再加一点收尾。很少有博客系统把这种形态当作一等公民。

另外，我一直很喜欢 Tumblr 最核心的那个直觉：note、link、quote 应该是一等公民格式。这三种形态，基本覆盖了我这些年最想写的大部分东西。这个方向的开源替代品出奇地少，所以我就自己做了一个。

## Jant 包含什么

- 三种一等公民格式：note、link、quote
- 用于连续思考和自我回复的 threads
- 用于专题组织和长期归档的 collections
- 支持图片、视频、音频、文档和粘贴代码的富附件
- 给书、电影、文章等内容打分的 ratings
- 默认以 `Featured` 为主 feed，让发布和推送默认分离
- 搜索、归档页和 RSS feeds
- 内建主题、字型主题和自定义 CSS
- 完整 API、导入工具和 Zola 导出能力，保证可移植性

## 运行方式

| 方式               | 适合谁                                 | 默认组合                                  |
| ------------------ | -------------------------------------- | ----------------------------------------- |
| Cloudflare Workers | 希望用极低基础设施成本获得全球部署的人 | D1 + R2                                   |
| Docker / Node.js   | 希望在自己的服务器上自托管的人         | SQLite 或 Postgres + S3（推荐）或本地媒体 |

Cloudflare Workers 是一等公民部署目标，因为它可以让个人站点长期保持极低运行成本。

如果你更喜欢传统服务器路线，也完全可以自己运行 Jant。Docker 和裸 Node 都支持。

## 快速开始

### 部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

如果你想走最快的路径，就用 Cloudflare 的部署按钮。它会从 Jant starter 仓库开始，并引导你填写所需的 Cloudflare 字段。

完整的一键部署和手动部署说明见 [部署到 Cloudflare](docs/zh-Hans/deployment.md)。

### 用 CLI 创建

```bash
npm create jant@latest my-site
cd my-site
npm run dev
```

打开 `http://localhost:3000`，然后在浏览器里完成初始设置。

### 使用 Docker 运行

如果你想走传统服务器部署路线，可以使用官方镜像：

- Docker 镜像：[`owenyoung/jant`](https://hub.docker.com/r/owenyoung/jant)
- 指南：[使用 Docker 部署](docs/zh-Hans/deployment-docker.md)

### 托管选项

如果你不想自己部署，也有一个小规模开放的托管选项。开放是渐进式的。如果你需要这条路，可以写信到 `owen#jant.me`。

## 文档

- [Jant 简介](docs/zh-Hans/overview.md)
- [开始使用](docs/zh-Hans/getting-started.md)
- [写作与内容组织](docs/zh-Hans/writing-and-organizing.md)
- [部署到 Cloudflare](docs/zh-Hans/deployment.md)
- [使用 Docker 部署](docs/zh-Hans/deployment-docker.md)
- [配置](docs/zh-Hans/configuration.md)
- [导出与导入](docs/zh-Hans/export-and-import.md)
- [备份与恢复](docs/zh-Hans/backups.md)
- [主题定制](docs/zh-Hans/theming.md)
- [API 参考（英文）](docs/API.md)

## 开发

Jant 自己的仓库使用 [mise](https://mise.jdx.dev/) 管理 Node.js 和 pnpm。

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
