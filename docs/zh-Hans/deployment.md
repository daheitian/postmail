# 部署到 Cloudflare

你可以通过两种方式把 Jant 部署到 Cloudflare：

- **Option A**：从 starter 仓库一键部署
- **Option B**：使用 `create-jant` 创建站点仓库，然后手动部署

如果你想把 Jant 跑在自己的服务器上，请看 [使用 Docker 部署](deployment-docker.md)。

## 前置条件

- 一个 Cloudflare 账号
- 如果走 Option B，需要 [Node.js](https://nodejs.org/) 24 或更高版本

## Option A：一键部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

你可以直接一键部署到 Cloudflare，不需要先做本地环境准备。

在这条路径里，Cloudflare 会根据表单为你创建新的 GitHub 仓库、D1 数据库和 R2 bucket。

### 部署表单字段

表单出现时，通常按下面这些默认值走就可以：

| 字段                       | 应该怎么填                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------- |
| **Git account**            | 选择你的 GitHub 账号。Cloudflare 会为你创建一个新仓库。                             |
| **D1 database**            | 保持 **Create new**。默认名字即可。                                                 |
| **Database location hint** | 如果你愿意，可以选一个离你更近的区域；保持默认也完全没问题。                        |
| **R2 bucket**              | 保持 **Create new**。默认名字即可。                                                 |
| **AUTH_SECRET**            | 保留自动生成的值，或者换成你自己的 32+ 字符 secret。                                |
| **SITE_ORIGIN**            | 可选。如果你希望固定公开 origin，比如 `https://my-blog.example.com`，就在这里设置。 |
| **SITE_PATH_PREFIX**       | 可选。只有在把站点挂到 `/blog` 这种子路径下时才需要。普通根路径部署就留空。         |

### 部署后

1. 打开 Cloudflare 显示给你的站点 URL，通常会是 `https://<project>.<account>.workers.dev`
2. 走完初始化流程，创建管理员账号
3. 如果你把 `SITE_ORIGIN` 设成了自定义域名，就去 Cloudflare 的 **Workers & Pages** 里把这个域名加上
4. 如果你把 `SITE_ORIGIN` 留空，Jant 会自动使用当前请求的 host

### 之后再做本地开发

一键部署时，Cloudflare 会帮你创建 GitHub 仓库。以后如果你想在本地继续开发：

```bash
git clone git@github.com:<your-username>/<your-repo>.git
cd <your-repo>
npm install
npm run dev
```

之后继续往 `main` 推送，部署会自动进行。

## Option B：从站点仓库手动部署

如果你希望先在本地通过 `create-jant` 开始，再从自己的机器手动部署，就走这条路径。

```bash
npm create jant@latest my-site
cd my-site
```

如果你更喜欢 `pnpm` 或 `yarn`，也可以使用它们的 `create` 命令。Jant 会根据你使用的包管理器调整脚手架中的脚本。

`create-jant` 会自动：

- 安装依赖
- 初始化 git 仓库
- 生成带安全本地 `AUTH_SECRET` 的 `.dev.vars`
- 创建一个已经接好 D1 与 R2 绑定、可继续配置的 Cloudflare Workers 项目

如果你传了 `--no-install` 或 `--no-git`，这些步骤需要你自己完成。

### 先在本地跑一下

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，完成初始化（创建管理员账号、设置站点名称、选择语言）。

如果你想换一个本地端口：

```bash
PORT=3030 npm run dev
```

## 部署准备

Option B 创建好本地站点之后，把它推到 Cloudflare 之前，需要再准备几样：

- 一个 Jant 站点仓库（`create-jant` 已经为你创建）
- 可用的 Wrangler，命令通过 `npx wrangler` 运行

先登录：

```bash
npx wrangler login
```

### 1. 创建 D1 数据库

创建一个 D1 数据库：

```bash
npx wrangler d1 create my-site-db
```

把输出里的 `database_id` 复制到 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-site-db"
database_id = "your-database-id"
```

如果脚手架里的 `database_name` 不是这个名字，你可以在命令里继续用现有名字，或者把 `wrangler.toml` 改成一致。

### 2. 创建 R2 Bucket

为媒体上传创建一个 R2 bucket：

```bash
npx wrangler r2 bucket create my-site-media
```

确保 `wrangler.toml` 里的 bucket 名称和它一致：

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "my-site-media"
```

### 3. 设置生产环境的 Auth Secret

你本地 `.dev.vars` 里的 secret 只用于开发。第一次部署之前，要先设置一个真正的生产 secret：

```bash
openssl rand -base64 32
npx wrangler secret put AUTH_SECRET
```

站点上线后请保持这个 secret 不变。改掉它会让现有会话全部失效。

### 4. 可选但推荐的媒体设置

Jant 即使不额外配置媒体也能工作，但对大多数生产站点来说，最好设置 `R2_PUBLIC_URL`，让媒体直接从 Cloudflare 边缘提供，而不是每次都经过 Worker 代理。

1. 打开 Cloudflare 控制台里的 R2 bucket
2. 用自定义域名或 `r2.dev` URL 开启公开访问
3. 把公开 URL 加到 `wrangler.toml`：

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
```

如果你还想用 Cloudflare 的图片变换能力，可以再加：

```toml
[vars]
IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
```

什么时候该用哪些变量，见 [配置](configuration.md)。

### 5. 部署

```bash
npm run deploy
```

默认的 deploy 脚本会运行 `jant deploy`，它会：

- 应用远端 migrations 和 data backfills
- 检测是否设置了 `SITE_PATH_PREFIX`
- 为根路径部署或子路径部署使用正确的静态资源目录

部署完成后，Cloudflare 会给你一个 `*.workers.dev` URL。

## 可选：通过 GitHub Actions 自动部署

用 `create-jant` 创建出来的站点，已经自带 `.github/workflows/deploy.yml`。

如果你想让每次推送到 `main` 都自动部署，就给 GitHub 仓库加上这些 secrets：

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

这个 workflow 会用它们来应用远端 migrations 并部署 Worker。

## 在浏览器里完成设置

如果你还没有做初始化，就打开部署好的站点，完成这些步骤：

1. 创建管理员账号
2. 确认站点名称
3. 发布第一篇内容

## 自定义域名

第一次部署完成后，可以在 Cloudflare 里加自定义域名：

1. 打开 **Workers & Pages**
2. 选择你的 Worker
3. 打开 **Domains & Routes**
4. 添加域名

如果你希望 Jant 在 RSS、sitemap 和其他绝对 URL 中使用固定 canonical host，请在 `wrangler.toml` 里设置 `SITE_ORIGIN`：

```toml
[vars]
SITE_ORIGIN = "https://yourdomain.com"
```

## 部署在子路径下

如果站点需要挂在 `/blog` 这样的子路径下，请设置 `SITE_PATH_PREFIX`：

```toml
[vars]
SITE_PATH_PREFIX = "/blog"
```

然后把这个前缀路由到 Worker：

- `/blog*`

Jant 会在部署时自动把带前缀的静态资源准备到 `/blog/_assets/*`。

## 更新已有站点

更新依赖，然后重新部署：

```bash
npm install @jant/core@latest
npm run deploy
```

## 接下来

- [配置](configuration.md) —— 调整环境变量和站点行为
- [写作与内容组织](writing-and-organizing.md) —— 站点跑起来后开始写
- [备份与恢复](backups.md) —— 长期运行需要的恢复规划
