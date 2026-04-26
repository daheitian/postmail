# 部署到 Cloudflare

本文介绍如何将 Jant 部署到 Cloudflare。最简单的方式是点击下方的「Deploy to Cloudflare」按钮完成一键部署，再按照「部署后必做清单」完成两项关键配置，即可得到一个稳定、适合长期运行的站点。

如果你熟悉命令行操作，也可以使用 `create-jant` 在本地初始化项目，再参考[本地开发后再部署](#本地开发后再部署)章节完成上线。

> 如果你希望将 Jant 部署在自己的服务器上，请参阅 [使用 Docker 部署](deployment-docker.md)。

## 前置条件

开始之前，请确认以下三项已准备好：

- **Cloudflare 账号**：前往 [dash.cloudflare.com](https://dash.cloudflare.com/) 注册或登录。
- **[GitHub 账号](http://github.com/)**：一键部署会将站点代码托管到 GitHub。如果你的 Cloudflare 账户尚未关联过 GitHub，在部署表单的 **Git account** 下拉菜单中点击 **New GitHub Connection** 完成授权即可。
- **在 Cloudflare 中[启用 R2](https://dash.cloudflare.com/?to=/:account/r2)**：R2 是 Cloudflare 提供的对象存储服务（类似于 AWS S3 或阿里云 OSS），Jant 用它来存储你上传的图片、视频等媒体文件。R2 提供免费额度（每月 10 GB 存储 + 100 万次读取），对个人博客完全够用，但首次使用前需要在控制台的 [R2 页面](https://dash.cloudflare.com/?to=/:account/r2) 同意一次服务条款。如果跳过这一步，部署时会出现「uses R2 which is only available with an R2 subscription」的错误提示。

## 一键部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

点击上方按钮后，无需在本地做任何准备。Cloudflare 会根据你在表单中填写的信息，自动完成以下所有操作：

- 在你的 GitHub 账号下创建一个新仓库
- 创建一个 D1 数据库（用于存储文章、用户等数据）
- 创建一个 R2 存储桶（用于存放媒体文件）
- 完成首次部署

### 部署表单填写说明

表单出现后，按以下建议填写即可：

| 字段                       | 说明                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Git account**            | 选择你的 GitHub 账号。Cloudflare 会自动为你创建新仓库。                                                                                                          |
| **Project name**           | 默认为 `my-site`。这个名称会成为你的站点子域名（格式为 `<project>.<account>.workers.dev`），同时也是 GitHub 仓库名。建议现在就改成你想要的名称，例如 `my-blog`。 |
| **D1 database**            | 保持默认的 **Create new**，数据库名称使用默认值即可。                                                                                                            |
| **Database location hint** | 可选择一个距离你较近的区域；保持默认也完全没问题。                                                                                                               |
| **R2 bucket**              | 保持默认的 **Create new**，存储桶名称使用默认值即可。                                                                                                            |
| **AUTH_SECRET**            | 保留自动生成的值，或替换为你自己的 32 位以上随机字符串。这是用于保护登录安全的密钥。                                                                             |

### 完成首次部署

1. 打开 Cloudflare 显示的站点地址，格式通常为 `https://<project>.<account>.workers.dev`
2. 按照页面提示完成初始化：创建管理员账号、设置站点名称

到这里，你的站点已经可以正常访问了。接下来请完成下方「部署后必做清单」中的两项配置——它们是让站点真正稳定运行的关键步骤。

### 将代码仓库克隆到本地（推荐）

一键部署完成后，Cloudflare 已经在你的 GitHub 账号下创建好了代码仓库。建议将它克隆到本地，这样你可以：

- 直接修改 `wrangler.toml` 文件来添加环境变量（下一节会用到）
- 在本地修改主题、添加页面、升级依赖
- 每次将代码推送到 `main` 分支时，自动触发重新部署

```bash
git clone git@github.com:<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

如果暂时不想克隆也没关系——下一节的所有配置都可以直接在 Cloudflare 控制台中完成。

## 部署后必做清单

以下两项配置不做也不影响站点基本运行，但**任何希望长期稳定运营的站点都强烈建议完成**。无论你使用的是一键部署还是本地部署，都应该完成这两步。

### ⚡ 1. 配置媒体文件公开访问（R2_PUBLIC_URL）

**为什么需要这一步？**

不配置的情况下，每次访问者加载图片或视频，请求都会先经过 Cloudflare Worker 中转一次，再从 R2 取回文件。这会明显拖慢媒体加载速度，同时每个媒体请求都会占用你的 Worker 免费配额。

配置 `R2_PUBLIC_URL` 后，媒体文件可以通过 R2 的公开地址直接返回给访问者，无需经过 Worker，加载速度更快，也不再消耗 Worker 配额。

#### 第一步：为 R2 存储桶开启公开访问

1. 打开 Cloudflare 控制台 → **[R2](https://dash.cloudflare.com/?to=/:account/r2)** → 点击你的存储桶
2. 进入 **Settings** → **Public access**，绑定自定义域名（例如 `media.yourdomain.com`）

记下上一步获取到的 URL，下一步会用到。

#### 第二步：将 URL 配置给 Worker

选择以下任意一种方式：

**方式 A：通过 Cloudflare 控制台配置（推荐给一键部署的用户）**

打开 **[Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)** → 选中你的 Worker → **Settings** → **Variables and Secrets** → **Add**，添加名为 `R2_PUBLIC_URL` 的环境变量，值为上一步获取的 URL。保存后 Cloudflare 会自动重新部署。

**方式 B：通过 `wrangler.toml` 配置（推荐给本地开发的用户）**

在 `wrangler.toml` 中添加：

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
```

然后将代码推送到 `main` 分支，或执行 `npm run deploy` 使配置生效。

#### 同时推荐开启图片自动缩放（IMAGE_TRANSFORM_URL）

配置好公开访问后，建议进一步启用 Cloudflare 的 [Image Transformations](https://developers.cloudflare.com/images/transform-images/) 功能。开启后，Jant 会根据访问者的设备屏幕尺寸和像素密度，自动提供合适大小的图片，而不是让手机用户也加载完整的 4000px 大图。这能显著提升页面加载速度，并节省流量，对图片较多的站点尤为明显。

Cloudflare 提供每月 5000 次独立变换的免费额度，对个人博客基本够用；超出后按实际用量计费，费用也非常低廉。

> **前置要求**：图片变换是域名（zone）级别的功能，需要你已按上一步配置了自定义域名（如 `media.yourdomain.com`）。

**第一步：在 Cloudflare 上启用图片变换**

1. 打开 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 在左侧列表中选中你绑定的域名
3. 左侧菜单 → **Images** → **Transformations**
4. 将对应域名的开关切换为 **On**（首次启用时会弹出条款确认）

**第二步：将 `IMAGE_TRANSFORM_URL` 配置给 Worker**

URL 格式为 `https://<你的 R2 公开域名>/cdn-cgi/image`：

```toml
[vars]
IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
```

也可以通过 **[Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)** → 选中你的 Worker → **Settings** → **Variables and Secrets** → **Add** 添加，字段名保持一致即可。

### 🌐 2. 绑定自定义域名

默认分配的 `*.workers.dev` 域名可以正常使用，但作为一个长期运营的站点，使用自己的域名体验会更好，也更专业。

1. 打开 **[Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)**
2. 选中你的 Worker
3. 进入 **Settings** → **Domains & Routes** → **Add**
4. 填入你想使用的域名（例如 `yourdomain.com`）。如果该域名已托管在同一 Cloudflare 账号下，DNS 会自动完成配置。

更多可配置项请参阅 [配置文档](configuration.md)。

## 本地开发后再部署

如果你希望先在本地搭建和调试站点，再推送上线，可以按照以下步骤操作。

> 需要 [Node.js](https://nodejs.org/) 24 或更高版本。

```bash
npm create jant@latest jant-site
cd jant-site
```

如果你使用 `pnpm` 或 `yarn`，也可以使用对应的 `create` 命令，Jant 会自动适配：

```bash
pnpm create jant@latest jant-site
# 或
yarn create jant@latest jant-site
```

`create-jant` 会自动完成以下操作：

- 安装依赖
- 初始化 Git 仓库
- 生成包含本地安全 `AUTH_SECRET` 的 `.dev.vars` 配置文件
- 创建一个已配置好 D1 数据库与 R2 存储桶绑定的 Cloudflare Workers 项目

### 启动本地开发服务器

依赖已由 `create-jant` 安装完毕，直接运行：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，按提示完成初始化（创建管理员账号、设置站点名称、选择语言）。

如需更改本地端口：

```bash
PORT=3030 npm run dev
```

### 准备部署到 Cloudflare

将本地站点部署到 Cloudflare 之前，需要先完成以下准备工作。

**登录 Cloudflare Wrangler**

```bash
npx wrangler login
```

**1. 创建 D1 数据库**

```bash
npx wrangler d1 create my-site-db
```

将输出中的 `database_id` 复制到 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-site-db"
database_id = "your-database-id"
```

如果脚手架中的 `database_name` 与此不同，可以保持原有名称不变，或统一修改为一致。

**2. 创建 R2 存储桶**

```bash
npx wrangler r2 bucket create my-site-media
```

确保 `wrangler.toml` 中的存储桶名称与之一致：

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "my-site-media"
```

**3. 设置生产环境的 Auth Secret**

本地 `.dev.vars` 中的密钥仅用于开发环境。首次部署前，需要单独为生产环境设置一个真正的密钥。

先生成一个 32 字节的随机字符串：

```bash
openssl rand -base64 32
```

复制输出结果，然后运行以下命令并将其粘贴：

```bash
npx wrangler secret put AUTH_SECRET
```

> **注意**：站点上线后请保持此密钥不变。修改密钥会导致所有已登录用户的会话立即失效。

### 执行部署

```bash
npm run deploy
```

默认的 `deploy` 脚本会运行 `jant deploy`，自动完成以下操作：

- 在远端应用数据库迁移（migrations）和数据补丁（data backfills）
- 将静态资源部署到正确的目录

部署完成后，Cloudflare 会提供一个 `*.workers.dev` 格式的访问地址。打开后完成初始化（创建管理员账号、确认站点名称、发布第一篇内容），然后回到上方的[部署后必做清单](#部署后必做清单)，补充配置 `R2_PUBLIC_URL` 和自定义域名。

## 进阶配置

### 通过 GitHub Actions 自动部署

使用 `create-jant` 创建的项目中，已内置 `.github/workflows/deploy.yml`。

如需在每次推送 `main` 分支时自动触发部署，只需在 GitHub 仓库中添加以下两个 Secrets：

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

该工作流会使用这两个凭据完成数据库迁移和 Worker 部署。

**如何获取这两个值：**

1. **`CF_ACCOUNT_ID`**：打开 [Cloudflare 控制台](https://dash.cloudflare.com/)，进入任意一个 Worker 或 Pages 项目，右侧边栏会显示 **Account ID**，点击即可复制。
2. **`CF_API_TOKEN`**：打开 [API Tokens 页面](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**，选择 **Edit Cloudflare Workers** 模板（该模板已包含部署 Worker、读写 D1 数据库、读写 R2 存储桶所需的全部权限）。按提示选择你的账号和域名（如果使用了自定义域名），生成后**请立即复制 Token**，关闭页面后将无法再次查看。

**添加到 GitHub：**

打开仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**，分别添加 `CF_API_TOKEN` 和 `CF_ACCOUNT_ID`。

### 部署在子路径下

如果你希望将 Jant 挂载在某个子路径下（例如 `/blog`），而主域名下还有其他服务，需要以下两步配合完成：

**1. 告知 Jant 子路径前缀**

```toml
[vars]
SITE_PATH_PREFIX = "/blog"
```

Jant 会在部署时自动将带前缀的静态资源准备到 `/blog/_assets/*` 目录下。

**2. 在 Cloudflare 中将该路径路由到 Worker**

打开 [Cloudflare 控制台](https://dash.cloudflare.com/)，在左侧选中你的域名 → **Workers Routes** → **Add route**，填写 `yourdomain.com/blog*`，Worker 选择你的 Jant Worker。这样 `/blog` 路径下的请求将由 Worker 处理，其他路径不受影响。

关于 `SITE_PATH_PREFIX` 与 `SITE_ORIGIN` 的详细说明，请参阅 [配置文档 → 公开 URL 和子路径](configuration.md#公开-url-和子路径)。

### 更新已有站点

升级 Jant 版本：

```bash
npm install @jant/core@latest
npm run deploy
```

## 接下来可以做什么

- [配置](configuration.md) —— 调整环境变量和站点行为
- [写作与内容组织](writing-and-organizing.md) —— 站点运行起来后，开始发布内容
- [备份与恢复](backups.md) —— 为长期运营做好数据保障
