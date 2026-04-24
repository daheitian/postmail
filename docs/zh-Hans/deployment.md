# 部署到 Cloudflare

最快的方式是点一下按钮，把 Jant 一键部署到 Cloudflare。完成后再按 "部署后必做清单" 配置两项关键设置，就能得到一个真正适合长期运行的站点。

如果你更喜欢先在本地 `create-jant` 把玩一下再部署，也可以走后面的 [本地开发后再部署](#本地开发后再部署) 路线。

> 如果你想把 Jant 跑在自己的服务器上，请看 [使用 Docker 部署](deployment-docker.md)。

## 前置条件

- 一个 [Cloudflare 账号](https://dash.cloudflare.com/)
- 一个 [GitHub 账号](https://github.com/)。一键部署会把站点代码托管到 GitHub。如果你的 Cloudflare 还没接过 GitHub，部署表单的 **Git account** 下拉里点 **New GitHub Connection** 授权一次即可。
- 在 Cloudflare 账号里启用 R2。R2 是 Cloudflare 的对象存储服务，和 AWS S3、阿里云 OSS 是同一类东西，专门用来存图片、视频这类文件。Jant 用它来放你上传的媒体文件。R2 有免费额度（每月 10 GB 存储 + 100 万次读取，对个人博客足够），但第一次使用前需要在 dashboard 的 [R2 页面](https://dash.cloudflare.com/?to=/:account/r2) 里同意一次条款。没有启用的话，部署的时候会提示 "uses R2 which is only available with an R2 subscription"。

## 一键部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

点击上面按钮，你不需要做任何本地环境准备。Cloudflare 会根据你在表单里填的信息，替你创建一个新的 GitHub 仓库、一个 D1 数据库和一个 R2 bucket，然后自动完成首次部署。

### 部署表单字段

表单出现时，通常按下面这些默认值走就可以：

| 字段                       | 应该怎么填                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Git account**            | 选择你的 GitHub 账号。Cloudflare 会为你创建一个新仓库。                                                                                         |
| **Project name**           | 默认是 `my-site`。这个名字会变成 `<project>.<account>.workers.dev` 的子域名，也会作为 GitHub 仓库名，建议现在就改成你想要的，比如 `owen-blog`。 |
| **D1 database**            | 保持 **Create new**。默认名字即可。                                                                                                             |
| **Database location hint** | 如果你愿意，可以选一个离你更近的区域；保持默认也完全没问题。                                                                                    |
| **R2 bucket**              | 保持 **Create new**。默认名字即可。                                                                                                             |
| **AUTH_SECRET**            | 保留自动生成的值，或者换成你自己的 32+ 字符 secret。                                                                                            |

### 完成首次部署

1. 打开 Cloudflare 显示给你的站点 URL，通常是 `https://<project>.<account>.workers.dev`
2. 走完初始化流程，创建管理员账号、设置站点名称

到这一步你的站点已经能用了。接下来请按下面的「部署后必做清单」把最关键的两项配置补上——它们才是让站点真正适合长期运行的关键。

### 把仓库 clone 到本地（推荐）

一键部署时，Cloudflare 已经在你的 GitHub 账号下创建好了仓库。把它 clone 下来，之后你就可以：

- 在本地直接改 `wrangler.toml` 添加环境变量（下一节会用到）
- 继续迭代主题、添加页面、升级依赖
- 往 `main` 推送时自动触发重新部署

```bash
git clone git@github.com:<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

如果暂时不想 clone 也没问题——下一节的所有配置都可以直接在 Cloudflare 控制台完成。

## 部署后必做清单

这一节里的配置，Jant 不做也能跑，但**任何希望长期运行、访问流畅的站点都强烈建议配置**。不论你走的是一键部署还是本地部署，都应该完成这两步。

### ⚡ 1. 配置媒体公开访问（R2_PUBLIC_URL）

**为什么要做这一步？**
不配置的话，所有媒体（图片、视频等）都会经过 Worker 代理一次再返回给访问者。每个图片请求都要进 Worker 走一圈再回 R2 取文件，访问者拿到图片的速度会明显变慢，同时每次请求都会计入你的 Worker 请求配额。

配置 `R2_PUBLIC_URL` 之后，媒体文件会直接从 Cloudflare 的 R2 公开边缘地址返回给访问者，跳过 Worker，速度更快，也不再消耗 Worker 配额。

**第一步：在 R2 bucket 上开启公开访问**

1. 打开 Cloudflare 控制台 → **R2** → 选中你的 bucket
2. 进入 **Settings** → **Public access**，选一种方式开启：
   - **自定义域名**（推荐，比如 `media.yourdomain.com`）：需要你把这个域名托管在 Cloudflare 上
   - **`r2.dev` URL**：Cloudflare 直接给你一个 `https://pub-xxxxx.r2.dev` 公开地址，零配置即可

把上一步拿到的 URL 记下来，下一步要用。

**第二步：把这个 URL 配置给 Worker**

有两种方式，选一种即可：

- **方式 A：Cloudflare 控制台（推荐给一键部署的用户）**

  打开 **Workers & Pages** → 选中你的 Worker → **Settings** → **Variables and Secrets** → **Add**，添加一个名为 `R2_PUBLIC_URL` 的环境变量，值就是上一步拿到的 URL。保存后 Cloudflare 会自动重新部署一次。

- **方式 B：`wrangler.toml`（推荐给本地开发的用户）**

  在 `wrangler.toml` 里加：

  ```toml
  [vars]
  R2_PUBLIC_URL = "https://media.yourdomain.com"
  ```

  然后推送到 `main` 或执行 `npm run deploy` 生效。

**推荐同时开启图片变换（IMAGE_TRANSFORM_URL）**

配置好公开访问之后，建议再开一项 Cloudflare 的 [Image Transformations](https://developers.cloudflare.com/images/transform-images/)。开启之后，Jant 会按访问者的屏幕尺寸和设备像素比自动生成合适大小的缩略图，而不是让手机用户也加载 4000px 的原图。页面加载更快、流量更省，对图片多的站点尤其明显。

Cloudflare 提供每月 5000 次独立变换的免费额度，对个人博客基本够用；超出后按量计费（也非常便宜）。

> **前置要求**：这一步需要你上一步用的是**自定义域名**（比如 `media.yourdomain.com`），因为图片变换是 zone 级功能，`r2.dev` URL 不支持。

**第一步：在 Cloudflare 上启用图片变换**

1. 打开 Cloudflare 控制台
2. 左侧列表里选中你绑的那个域名（zone）
3. 左侧菜单 → **Images** → **Transformations**
4. 把对应 zone 的开关切到 **On**（首次启用会弹出条款确认）

**第二步：把 `IMAGE_TRANSFORM_URL` 配给 Worker**

URL 的格式是 `https://<你的 R2 公开域名>/cdn-cgi/image`：

```toml
[vars]
IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
```

通过控制台 **Variables and Secrets** 添加也可以，字段名一致即可。

### 🌐 2. 绑定自定义域名（SITE_ORIGIN）

默认给你的 `*.workers.dev` 域名能跑，但作为一个打算长期写下去的站点，换成自己的域名体验会好非常多。

**第一步：在 Cloudflare 绑定域名**

1. 打开 **Workers & Pages**
2. 选中你的 Worker
3. 进入 **Settings** → **Domains & Routes** → **Add**
4. 填入你想用的域名（例如 `yourdomain.com`）。如果这个域名已经托管在同一个 Cloudflare 账号下，DNS 会自动配好。

**第二步：告诉 Jant 这个就是你的 canonical host**

这一步让 Jant 在 RSS、sitemap 以及其它绝对 URL 中使用固定的域名：

```toml
[vars]
SITE_ORIGIN = "https://yourdomain.com"
```

同样可以通过 Cloudflare 控制台的 **Variables and Secrets** 添加。

更多可配置变量见 [配置](configuration.md)。

## 本地开发后再部署

如果你希望先在本地通过 `create-jant` 把玩过再部署，就走这条路径。

> 需要 [Node.js](https://nodejs.org/) 24 或更高版本。

```bash
npm create jant@latest jant-site
cd jant-site
```

如果你更喜欢 `pnpm` 或 `yarn`，也可以使用它们的 `create` 命令。Jant 会根据你使用的包管理器调整脚手架中的脚本。

```bash
pnpm create jant@latest jant-site
# 或
yarn create jant@latest jant-site
```

`create-jant` 会自动：

- 安装依赖
- 初始化 git 仓库
- 生成带安全本地 `AUTH_SECRET` 的 `.dev.vars`
- 创建一个已经接好 D1 与 R2 绑定、可继续配置的 Cloudflare Workers 项目

### 启动本地开发服务器

依赖已经由 `create-jant` 装好了，直接启动：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，完成初始化（创建管理员账号、设置站点名称、选择语言）。

如果你想换一个本地端口：

```bash
PORT=3030 npm run dev
```

### 准备部署

把本地站点推到 Cloudflare 之前，先登录 Cloudflare Wrangler：

```bash
npx wrangler login
```

**1. 创建 D1 数据库**

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

**2. 创建 R2 Bucket**

```bash
npx wrangler r2 bucket create my-site-media
```

确保 `wrangler.toml` 里的 bucket 名称和它一致：

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "my-site-media"
```

**3. 设置生产环境的 Auth Secret**

你本地 `.dev.vars` 里的 secret 只用于开发。第一次部署之前，要先设置一个真正的生产 secret。

先生成一个 32 字节的随机字符串：

```bash
openssl rand -base64 32
```

复制输出的结果，然后运行：

```bash
npx wrangler secret put AUTH_SECRET
```

命令会提示你输入值，把刚才复制的字符串粘贴进去并回车。

站点上线后请保持这个 secret 不变。改掉它会让现有会话全部失效。

### 部署

```bash
npm run deploy
```

默认的 deploy 脚本会运行 `jant deploy`，它会：

- 应用远端 migrations 和 data backfills
- 检测是否设置了 `SITE_PATH_PREFIX`
- 为根路径部署或子路径部署使用正确的静态资源目录

部署完成后，Cloudflare 会给你一个 `*.workers.dev` URL。打开它完成初始化（创建管理员账号、确认站点名称、发布第一篇内容），然后回到上面的 [部署后必做清单](#部署后必做清单) 补上 `R2_PUBLIC_URL` 和自定义域名。

## 进阶

### 通过 GitHub Actions 自动部署

用 `create-jant` 创建出来的站点，已经自带 `.github/workflows/deploy.yml`。

如果你想让每次推送到 `main` 都自动部署，就给 GitHub 仓库加上这两个 secrets：

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

这个 workflow 会用它们来应用远端 migrations 并部署 Worker。

**怎么拿到这两个值：**

1. **`CF_ACCOUNT_ID`** —— 打开 [Cloudflare 控制台](https://dash.cloudflare.com/)，随便进入一个 Worker 或 Pages 项目，右侧栏有一块 **Account ID**，点一下就能复制。
2. **`CF_API_TOKEN`** —— 打开 [API Tokens 页面](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**，选 **Edit Cloudflare Workers** 模板（这个模板已经包含部署 Worker、读写 D1、读写 R2 需要的全部权限）。按提示选中你的账号和 zone（如果用了自定义域名），生成后**立刻复制 token**，页面关闭后就看不到了。

**添加到 GitHub：**

打开仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**，分别添加 `CF_API_TOKEN` 和 `CF_ACCOUNT_ID` 两项。

### 部署在子路径下

如果你希望站点挂在 `/blog` 这样的子路径下（比如主域名还有其他服务），需要两步配合：

**1. 告诉 Jant 前缀是什么**

```toml
[vars]
SITE_PATH_PREFIX = "/blog"
```

Jant 会在部署时自动把带前缀的静态资源准备到 `/blog/_assets/*`。

**2. 在 Cloudflare 上把这个前缀路由到 Worker**

打开你的域名（zone）→ **Workers Routes** → **Add route**，填 `yourdomain.com/blog*`，Worker 选你的 Jant Worker。这样 `/blog` 下的请求就会命中 Worker，`/` 下的其它请求不受影响。

`SITE_PATH_PREFIX` 和常搭配的 `SITE_ORIGIN` 的详细说明见 [配置 → 公开 URL 和子路径](configuration.md#公开-url-和子路径)。

### 更新已有站点

更新依赖，然后重新部署：

```bash
npm install @jant/core@latest
npm run deploy
```

## 接下来

- [配置](configuration.md) —— 调整环境变量和站点行为
- [写作与内容组织](writing-and-organizing.md) —— 站点跑起来后开始写
- [备份与恢复](backups.md) —— 长期运行需要的恢复规划
