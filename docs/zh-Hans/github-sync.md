# GitHub 同步

GitHub 同步把你的帖子以 Markdown 文件备份到一个 GitHub 仓库，并且可以把 GitHub 上的修改同步回来。每次帖子变动都会产生一个 commit，让你的内容拥有完整的 Git 版本历史。

你照常在 Jant 里写。GitHub 是备份和版本控制层。

GitHub 仓库同时也是一个对 AI 工具友好的文件接口。Jant 提供了 [API](../API.md) 和 MCP server，但许多 AI agent 和 coding 助手在面对纯文件时最自然。一个同步好的仓库给它们一个 Markdown 目录，可读、可改、可提交——不需要 API 客户端。

## 工作原理

**Jant → GitHub**：当你创建、编辑或删除一篇帖子，Jant 把这次变更以带 YAML front matter 的 Markdown 文件推送到你的仓库。Thread 回复各自成为独立文件，嵌套在根帖目录下。媒体不会被复制进仓库，仅以 URL 引用。

**GitHub → Jant**：当你在 GitHub 上编辑一个 Markdown 文件并 push，webhook 会通知 Jant。Jant 解析文件，按 slug 匹配到已有帖子，然后更新内容。在 GitHub 上删除文件不会产生任何效果——文件删除操作被故意忽略，删帖必须通过 Jant UI 操作。

Jant 自己产生的 commit 会带上 `[jant-sync]` 标记。带这个标记的 webhook 会被忽略，所以变更不会来回反弹。

### 哪些东西会同步

- 帖子正文（Markdown）
- 标题、URL、引文文本以及其他 front matter 字段
- Thread 回复（各自作为独立文件嵌套在根帖目录下）

### 哪些东西不会从 GitHub 同步过来

- 在 GitHub 上新增一个 `.md` 文件**不会**创建一篇新帖子。你只能通过修改 Git 仓库中现有的文件来更新 Post。
- 设置、导航、collections、主题不会被 webhook 影响

## 两种连接方式

自托管用户默认使用 **Personal Access Token（PAT）**——创建一个 token 粘贴进 Jant 即可，无需额外配置。

如果部署配置了 GitHub App，设置页会额外显示 App 连接选项，并推荐使用——用户一键安装到自己的仓库，Jant 永远不需要接触长期 token，更适合托管平台。

## 方式 A —— Personal Access Token

你需要一个 GitHub **fine-grained Personal Access Token**，对目标仓库授予以下权限：

| 权限         | 访问级别   | 用途                     |
| ------------ | ---------- | ------------------------ |
| **Contents** | Read/Write | 推送和读取 Markdown 文件 |
| **Webhooks** | Read/Write | 自动创建 push webhook    |

在 [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) 创建 token。最小权限原则：把 token 限定到单个仓库。

### 设置步骤

1. 在 GitHub 上创建一个仓库（公开私有都行）
2. 在 Jant dashboard 里打开 **Settings > Data > GitHub Sync**
3. 粘贴 token，输入仓库 `owner/repo`
4. 点击 **Connect**

Jant 会校验 token、保存配置，并在仓库里创建 webhook。不需要手动设置 webhook。

## 方式 B —— GitHub App

当 Jant 部署设置了以下环境变量时，GitHub App 连接流程会启用：

| 变量                        | 必需 | 说明                                                                                                                                                                 |
| --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_APP_ID`             | 是   | GitHub App 设置页里的数字 App ID                                                                                                                                     |
| `GITHUB_APP_PRIVATE_KEY`    | 是   | 在 GitHub App 设置里生成的 PKCS#8 PEM 私钥。`\n` 转义会自动展开，所以你可以单行存放                                                                                  |
| `GITHUB_APP_SLUG`           | 是   | App slug（`github.com/apps/<slug>` 的最后一段）。用于构造安装 URL                                                                                                    |
| `GITHUB_APP_WEBHOOK_SECRET` | 否   | GitHub App webhook 的共享 secret。两个 endpoint 会用：单仓库 push webhook（优先级高于站点级 secret）和 App 级 webhook `/api/github-sync/app-webhook`（响应安装事件） |

### 创建 GitHub App

进入 **Settings > Developer settings > GitHub Apps > New GitHub App**（个人或组织都行）。下面记录了两种配置——按你的部署模式选一种。

> **Setup URL vs Callback URL**：GitHub App 有两个名字相近、容易混淆的字段。安装流程使用 **Setup URL**——用户安装完成后，GitHub 会带着 `installation_id` 和 `state` 把浏览器跳转到这里。**Callback URL** 用于 OAuth 用户身份识别（"Sign in with GitHub"），Jant 不使用。永远设置 **Setup URL**，留空 Callback URL。

#### 自托管（单站点，单一 host）

1. **Homepage URL**：你的 Jant 站点
2. **Setup URL (optional)**：`https://<your-jant-site>/settings/github-sync/app/callback`
3. **Redirect on update**：✅ 勾选
4. **Callback URL**：留空
5. **Webhook**：勾选 **Active**，URL 设为 `https://<your-jant-site>/api/github-sync/app-webhook`，**Secret** 填 `GITHUB_APP_WEBHOOK_SECRET` 的值。这样在 App 被卸载、暂停或仓库被移除时，Jant 的安装状态能保持同步。单仓库 push webhook 仍然在站点 host 上自动注册
6. **Repository permissions**：`Contents: Read & write`、`Metadata: Read-only`、`Webhooks: Read & write`
7. **Subscribe to events**：`Push`、`Installation`、`Installation repositories`
8. **Where can this GitHub App be installed**："Only on this account"
9. 生成一个私钥（PKCS#8 PEM），并复制 App ID

#### 托管 / 多站点（一个控制平面，多个站点 host）

GitHub App 只支持一个 Setup URL，但托管站点分布在不同 host 上。控制平面（`jant-cloud`）在 `/api/github/install-callback` 提供了一个 dispatcher，验证签名过的安装 state 后，把浏览器 302 跳转回原始站点。

1. **Homepage URL**：控制平面 URL
2. **Setup URL (optional)**：`https://<your-control-plane>/api/github/install-callback`
3. **Redirect on update**：✅ 勾选
4. **Callback URL**：留空
5. **Webhook**：勾选 **Active**，URL 设为 `https://<your-control-plane>/api/github-app-webhook`。控制平面会把每次投递转发到所有受影响站点的 `/api/github-sync/app-webhook`。**Secret** 填 `GITHUB_APP_WEBHOOK_SECRET` 的值。每个站点仍在自己的 host 上注册自己的仓库级 push webhook
6. **Repository permissions**：和自托管相同——`Contents: Read & write`、`Metadata: Read-only`、`Webhooks: Read & write`
7. **Subscribe to events**：`Push`、`Installation`、`Installation repositories`
8. **Where can this GitHub App be installed**："Any account"
9. 生成一个私钥（PKCS#8 PEM），并复制 App ID

在这个模式下，安装 `state` 用 `HOSTED_CONTROL_PLANE_SSO_SECRET` 签名——和托管部署在 core 与控制平面之间共享的是同一个 secret。两端必须看到相同的值；不需要额外的环境变量。

### 用户操作

1. 在 Jant dashboard 打开 **Settings > Data > GitHub Sync**
2. 点击 **Install GitHub App**。你会被跳转到 GitHub 选择 App 可访问的仓库
3. 安装完成后，GitHub 把你跳转回来。选要同步的仓库，点 **Connect**

Jant 用 installation 按需签发短期 token——任何 token 都不会被长期保存。

## 推送一次完整同步

连接好之后，点 **Push Full Sync** 把所有帖子写入仓库。这会产生一个单独的 commit，把每个 thread 作为 Hugo branch bundle 写入 `content/` 下，同时附上能让 [Hugo](https://gohugo.io) 构建站点所需的主题和配置。

你可以随时重新执行完整同步。它会用一次原子 commit 替换仓库内容。Git 把没变的文件视为 no-op，所以未变更文件的 blame 历史会保留。

### Jant 在仓库里管理哪些路径

下面这些路径完全由 Jant 管理，每次 push 都会被覆盖：

- `content/**` —— posts、collections、sections
- `themes/jant/**` —— 打包好的 Jant 主题（layouts 和 static assets）
- `data/jant.toml` —— 导航、品牌、collections directory
- `hugo.toml` —— 站点配置，包括 `theme = "jant"` 这一行
- `.gitignore`、`README.md` —— Jant 生成的脚手架
- `.jant-sync` —— 所有权标记

这些路径里 Jant 不再生成的文件会在下一次 push 时被删除。例如，在 Jant 里删除一篇帖子，下一次同步时 GitHub 上对应的 bundle 也会被删掉。

其他一切都是你的。Jant 不会跨 push 修改它们。如果你想自定义站点，编辑根目录下的 `layouts/<name>.html` 或 `static/<name>`——Hugo 会优先选用它们而不是主题里的版本。`data/` 下其他位置也归你自由使用（`menu.toml`、`authors.toml` 等）。不要直接编辑 `themes/jant/**`，下一次 push 会覆盖你的改动。详见 [导出与导入](export-and-import.md)。

## 增量同步

连接之后，每次在 Jant 里创建、编辑或删除帖子，都会自动把变更推送到 GitHub。每次变动产生独立的 commit。

- **创建或更新根帖**：写 `content/{slug}/_index.md`
- **创建或更新回复**：写 `content/{root-slug}/{reply-slug}/index.md`
- **删除**：从仓库里移除对应的 bundle

增量同步在后台运行，不会阻塞 Jant UI。

## 在 GitHub 上编辑

你可以直接在 GitHub 上编辑任何 Jant 管理的 Markdown 文件（或者本地修改后 push）。当 push 到达 GitHub，webhook 触发，Jant 更新对应的帖子。

匹配规则按 slug 进行：Jant 读取 YAML front matter 里的 `slug` 字段，找到对应帖子。匹配不到的文件会被跳过。

只有以下字段会被 GitHub 编辑更新：

- `body`（front matter 下方的 Markdown 内容）
- `title`
- `link_url`（link 帖子）
- `quote_text`（quote 帖子）

在 GitHub 上删除文件不会有任何效果——文件删除操作被忽略，以防止意外数据丢失。

## 断开连接

打开 **Settings > Data > GitHub Sync**，点 **Disconnect**。Jant 会从 GitHub 移除 webhook，并清除同步配置。仓库和它的内容不会被删除。

## 文件格式

帖子以 Hugo 兼容的 Markdown 存储，使用扁平的 YAML front matter，和 [Site Export](export-and-import.md) 用的是同一种格式。

根帖位于 `content/{slug}/_index.md`：

```markdown
---
title: "Hello World"
date: 2025-01-15T12:00:00Z
slug: hello-world
type: post
format: note
status: published
visibility: public
---

帖子正文写在这里。
```

Thread 回复作为嵌套的 leaf bundle 位于 `content/{root-slug}/{reply-slug}/index.md`：

```markdown
---
title: ""
date: 2025-01-15T13:00:00Z
slug: reply-abc
type: post
build:
  render: never
  list: local
format: note
status: published
visibility: public
---

回复内容写在这里。
```

## 后台处理

同步操作在后台运行，编辑和发布永远不会等 GitHub。当帖子变动时，同步通过 Worker 的 `waitUntil` 生命周期内联调度——HTTP 响应立即返回，push 在响应之后完成。不需要 queue binding，也不需要单独的 consumer worker。

push 进行中时，settings 页会显示一个实时的 "Syncing…" 指示器，push 完成后切换回 "Last synced"。如果 push 失败，错误信息会显示在状态卡片上，你不必翻日志就能知道出了什么问题。

快速连续编辑会被合并：如果一次 push 进行中又来了新的变更，它会被记录为待处理编辑，当前 push 落地之后立即接力——既不会丢内容，也不会引发并发 push。

## 限制

- **每个站点一个仓库**：不支持多仓库同步
- **不能从 GitHub 创建或删除帖子**：在 GitHub 上新增或删除 `.md` 文件在 Jant 里不会产生任何效果，只能通过编辑文件内容来更新已有帖子
- **文本附件不同步**：媒体和文本附件内容仅以 URL 引用
- **速率限制**：GitHub 对认证用户每小时允许 5,000 次 API 请求。一次 1,000 篇帖子的完整同步大约用掉 1,000 次请求（每个文件一个 blob）。增量同步每次用 1-2 次

## 接下来

- [主题定制](theming.md) —— 调整站点外观
- [导出与导入](export-and-import.md) —— Hugo 导出和站点迁移
- [备份与恢复](backups.md) —— 完整备份策略
- [配置](configuration.md) —— 相关环境变量
