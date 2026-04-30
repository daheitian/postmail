# 常见问题

## 为什么默认 `/feed` 是 Featured 而不是 Latest？

Jant 把"发布到站点"和"广播给订阅者"看成两件事。`/feed` 默认指向 `Featured`，是为了让你可以放心地写细碎记录而不打扰订阅者。要恢复传统行为，进入 **Settings → General → Feeds → Main RSS feed**，切换为 `Latest` 即可。详见 [写作与内容组织 § 为什么默认 feed 是 Featured](writing-and-organizing.md#为什么默认-feed-是-featured)。

三条 feed 各管一段，可以按需要订阅：

| Feed             | 内容                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/feed/featured` | 只有标记为 Featured 的帖子。被默认 `/feed` 指向时，相当于"作者亲自挑选的推送"                                                              |
| `/feed/latest`   | 出现在首页 Latest 流的帖子，不含 `Hidden from Latest`                                                                                      |
| `/archive/feed`  | 全量公开帖子的 feed，包含 `Hidden from Latest`，与 `/archive` 页面一致；支持 `?year=`、`?format=`、`?collection=`、`?media=` 等 query 过滤 |

## Jant 是开源的吗？

是。完整源码在 [GitHub](https://github.com/jant-me/jant)。托管和自托管运行的是同一份代码，没有"托管专属功能"。

## 支持评论吗？

目前不支持。这是一项仍在评估的能力——保留 Jant"安静记录"与引入轻量讨论之间的平衡需要继续观察真实需求，未来不排除内置。在此之前，可以通过 [代码注入](code-injection.md) 嵌入第三方系统（giscus、Disqus 等）。

## 支持多作者吗？

不支持。多作者需要权限、审稿、署名、通知等一整套机制，会让产品方向偏向 CMS。需要这些能力，建议考虑 WordPress 或 Ghost。

## 支持多语言吗？

站点内容本身可以是任何语言。**Settings → General → Language** 可以设置语言。这个设置驱动两件事：

- **内容元数据**：`<html lang>` 和 RSS feed 的 `<language>` 字段会原样使用你填的标签——这是给搜索引擎、屏幕阅读器、订阅器看的
- **Settings 界面语言**：目前仅支持 English/简体中文/繁体中文, 其他语言会 Fallback 到 English.

Public 页面（首页、Featured、Latest 等导航文案）当前固定为 English.

## 可以带着内容离开吗？

可以：

- [`site export`](export-and-import.md#site-export) —— 一次性导出为标准 Hugo 站点目录（ZIP 或目录），可直接 `hugo serve` 预览。
- [GitHub 同步](github-sync.md) —— 内容始终以 Markdown 持续同步到你自己的 Git 仓库，仓库本身就是一个完整的 Hugo 站点。

## 自托管和托管怎么选？

| 你的情况                               | 选这个                                |
| -------------------------------------- | ------------------------------------- |
| 想要近乎零成本，能跟着文档配置 15 分钟 | [Cloudflare 自托管](deployment.md)    |
| 已经有自己的服务器和 Docker 经验       | [Docker 自托管](deployment-docker.md) |
| 不想处理任何部署细节                   | [Jant 托管](hosted.md)                |

三条路径运行的是同一份代码。先选托管再迁出，或反过来，都通过 [导出/导入](export-and-import.md) 完成。

## Cloudflare 和 Docker 怎么选？

| 维度     | Cloudflare               | Docker                        |
| -------- | ------------------------ | ----------------------------- |
| 运行环境 | Workers + D1 + R2        | 你自己的服务器                |
| 数据库   | D1（SQLite）             | SQLite 或 Postgres            |
| 媒体存储 | R2 或 S3                 | 本地文件系统或 S3             |
| 运维负担 | 几乎为零                 | HTTPS、反向代理、备份都自己来 |
| 成本     | 多数个人站点在免费额度内 | 你的服务器成本                |

如果两边都是新手，建议选择 Cloudflare。

## Cloudflare 免费额度真的够吗？

对一个普通个人博客通常够用。Workers 免费层每天 100,000 次请求，R2 免费层 10 GB 存储 + 每月 100 万次 Class A 操作。需要注意：媒体如果不配 `R2_PUBLIC_URL`，每次图片加载都会走 Worker 中转，免费额度会消耗得更快。配置方式见 [部署到 Cloudflare](deployment.md) 中的"部署后必做清单"。

## 自定义域名怎么配？

- **托管**：Dashboard → 选中站点 → **域名** → 添加，按提示配置 DNS。证书自动签发与续期。
- **Cloudflare 自托管**：Workers & Pages → 你的 Worker → Settings → Domains & Routes → Add，详见 [部署到 Cloudflare](deployment.md) 中的"绑定自定义域名"。
- **Docker 自托管**：在反向代理里指过来。

## AI agent 能发帖吗？

可以。两种入口，按场景选：

- **HTTP JSON API**：默认推荐——`POST /api/posts` + Bearer token，外部脚本、定时任务、第三方集成都用它
- **MCP endpoint**（`/api/mcp`）：调用方本身就是 MCP client 时

`create-jant` 生成的项目自带 `AGENTS.md`、`.claude/skills/` 和 `examples/agent-content-automation/`，里面有可以直接 copy 的 curl 示例。详见 [自动化与 API](automation-and-api.md)。

启用 [GitHub 同步](github-sync.md) 后，AI 也可以直接读写 Git 仓库里的 Markdown——对很多 coding agent 来说比 API 更自然。

## 能改主题/外观吗？

三层控制：内建颜色主题、内建字型主题、Custom CSS。Custom CSS 直接覆盖 CSS 变量即可，不需要 fork 主题或重启站点。完整变量列表见 [主题定制](theming.md)。

## 如何升级到新版本？

- **托管**：自动，无需操作。
- **Cloudflare**：`npm install @jant/core@latest && npm run deploy`，迁移会在部署时自动跑。
- **Docker**：`docker compose pull && docker compose up -d`，这个命令会先运行数据库迁移，再启动应用。

升级前建议先做一次完整备份，见 [备份与恢复](backups.md)。

## 媒体上传有大小限制吗？

非图片默认 500 MB，可通过 `UPLOAD_MAX_FILE_SIZE_MB` 调整。详见 [配置 § 上传大小限制](configuration.md#上传大小限制可选)。

## SQLite 和 Postgres 怎么选（Docker 部署）？

单机部署直接用 SQLite，性能足够、备份只需打包一个文件。已有 Postgres 基础设施时可考虑换 Postgres。切换通过 `DATABASE_URL` 的 scheme 控制（`file:` 或 `postgres:`），见 [配置 § Node 和 Docker](configuration.md#node-和-docker)。

## 能挂在子路径下吗（例如 `example.com/blog`）？

可以。设置 `SITE_PATH_PREFIX=/blog`。Cloudflare 还需要在 Workers Routes 里把 `yourdomain.com/blog*` 路由到 Worker。详见 [部署 § 部署在子路径下](deployment.md#部署在子路径下)。

## 备份多久做一次？

按 RPO（可接受的数据丢失量）决定。建议启用 [GitHub 同步](github-sync.md) 作为内容层的实时副本。其他关于备份的完整方案见 [备份与恢复](backups.md)。

## 改了 `AUTH_SECRET` 会怎样？

所有已登录会话立即失效，所有人需要重新登录。生产环境上线后**不要轻易更换**——除非怀疑泄露。生成方式：`openssl rand -base64 32`。

## 删除的帖子能恢复吗？

不能。删除是永久的——帖子行、对应的路径、所属 Collection 关联以及附件 media 都会被一起清理（正文里嵌入的 inline media 不动）。删帖前 UI 会有二次确认，做好这一步就行。

## 能在托管和自托管之间互相迁移吗？

可以，方向都支持。流程：源站点 `site snapshot export` → 目标站点用空账号 `site snapshot import --replace`。Snapshot 会保留原始 IDs 与存储键，URL 不会变。详见 [导出与导入 § Site Snapshots](export-and-import.md#site-snapshots)。

## 在 GitHub 上删了文件，为什么 Jant 里没删？

这是有意的。GitHub 上的文件删除会被同步层忽略，避免误操作导致数据丢失。删帖只能在 Jant UI 里完成，删除后下一次同步会自动从仓库移除对应的 bundle。详见 [GitHub 同步 § 在 GitHub 上编辑](github-sync.md#在-github-上编辑)。

## 在 GitHub 上新建一个 `.md` 文件能创建新帖子吗？

不能。GitHub → Jant 方向只支持更新已有帖子，按 front matter 里的 `slug` 匹配。新增、删除都通过 Jant UI 进行。

## 能迁回 WordPress / Ghost 吗？

没有现成路径，但 `site export` 输出的是标准 Markdown + YAML front matter，写一个一次性转换脚本到 WordPress WXR 或 Ghost JSON 都不复杂。

## Pre-1.0，破坏性变更会很多吗？

会有，但每次都会在 commit 和 changelog 里记录。建议升级前看一眼变更记录，并保留一份近期备份。

## 有发展路线图吗？

主要由作者本人的实际需求驱动。重大变更通过 commit 和 changelog 公开。建议和功能请求走 GitHub Issues。

## 反馈渠道？

- GitHub Issues —— bug 和功能请求
- 邮件 `owen#jant.me` —— 一般咨询（把 `#` 换成 `@`）
- 邮件 `support#jant.me` —— 托管账户问题

## 为什么叫 Jant？

来自 _Jantelagen_（扬特法则），北欧文化中"别把自己看得太重"的概念。设计动机见 [简介](overview.md#一种无压力的公开写作)。

## 托管为什么定价 $10.46/年？

来自 `.com` 域名的成本价，一个让人觉得"亲切又不是玩笑"的价格带。详见 [托管](hosted.md#价格)。

## 接下来

- [简介](overview.md) —— 重新理解 Jant 想解决什么
- [开始使用](getting-started.md) —— 选一条部署路径
- [写作与内容组织](writing-and-organizing.md) —— 站点跑起来之后
