# 配置

Jant 从两个地方读取配置：

- 环境变量，用于基础设施和运行时行为
- dashboard 设置，用于站点级的发布行为

大多数单站点安装，只需要少量几个值：

- `AUTH_SECRET`
- 当你需要固定 canonical host 时使用 `SITE_ORIGIN`
- 选择一种存储方案：R2、S3 或本地文件

## 环境变量

使用：

- `wrangler.toml` 存放 Cloudflare 的非敏感配置
- `.dev.vars` 存放本地 Cloudflare secrets
- `.env` 或进程环境变量，供 Node 和 Docker 使用

### 必需项

所有运行时都必须设置这个变量：

| 变量          | 说明                                     |
| ------------- | ---------------------------------------- |
| `AUTH_SECRET` | 随机字符串，至少 32 个字符，用于会话签名 |

不要把 `AUTH_SECRET` 提交进版本库。

- Cloudflare 本地开发：放进 `.dev.vars`
- Cloudflare 生产环境：用 `npx wrangler secret put AUTH_SECRET` 作为 Worker secret 设置
- Node 和 Docker：放进 `.env` 或进程环境变量

### 公开 URL 和子路径

这些变量在 `single-site` 模式下才有意义：

| 变量               | 说明                                              |
| ------------------ | ------------------------------------------------- |
| `SITE_ORIGIN`      | 可选的固定公开 origin，例如 `https://example.com` |
| `SITE_PATH_PREFIX` | 可选的公开路径前缀，例如 `/blog`                  |

常见组合：

- 根路径部署，并根据请求 host 推导：两个都留空
- 固定 host：设置 `SITE_ORIGIN=https://example.com`
- 子路径部署：设置 `SITE_PATH_PREFIX=/blog`
- 固定 host 且挂在子路径下：两个都设置

`SITE_ORIGIN` 会影响 RSS、sitemap、exports、auth callbacks 等绝对 URL。

`SITE_PATH_PREFIX` 会影响路由和构建出的静态资源，包括前缀下的 `/_assets`。

在 `host-based` 模式下，Jant 会忽略这两个值，直接从请求 host 解析站点。

### 站点解析模式

| 变量                   | 取值                          | 说明                       |
| ---------------------- | ----------------------------- | -------------------------- |
| `SITE_RESOLUTION_MODE` | `single-site` 或 `host-based` | 控制 Jant 如何解析当前站点 |

- `single-site` 是普通的自托管模式
- `host-based` 用于托管型多站点场景
- 在 `single-site` 模式下，Node 启动时期望数据库里恰好只有一个已初始化站点

大多数自托管用户都应该保持 `single-site`。

### Node 和 Docker

在 Node 和 Docker 下，Jant 通过 `DATABASE_URL` 判断数据库运行时：

- `file:` 表示 SQLite
- `postgres:` 或 `postgresql:` 表示 Postgres

最小 SQLite 示例：

```env
AUTH_SECRET=your-32-plus-character-secret
SITE_ORIGIN=https://your-jant.example
DATABASE_URL=file:./data/jant.sqlite
```

最小 Postgres 示例：

```env
AUTH_SECRET=your-32-plus-character-secret
SITE_ORIGIN=https://your-jant.example
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
```

Node 和 Docker 的常用变量：

| 变量                   | 默认值                   | 说明                                                                          |
| ---------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `DATA_DIR`             | `./data`                 | 默认 SQLite 和本地媒体路径的基础目录                                          |
| `LOCAL_STORAGE_PATH`   | `<DATA_DIR>/media`       | 覆盖本地媒体目录                                                              |
| `LOCAL_PUBLIC_URL`     | 未设置                   | 供 Jant 外部直接提供媒体的公开基地址；留空时，Jant 使用自己的 `/media/*` 路由 |
| `HOST`                 | 裸 Node 下是 `127.0.0.1` | `jant start` 的绑定地址                                                       |
| `PORT`                 | `3000`                   | `jant start` 的绑定端口                                                       |
| `TRUST_PROXY`          | `false`                  | 是否信任反向代理传来的转发头                                                  |
| `SITE_RESOLUTION_MODE` | `single-site`            | 站点解析模式                                                                  |

官方 Docker 镜像默认把 `DATA_DIR` 设为 `/var/lib/jant`，而 Docker Compose 通常会把 `TRUST_PROXY=true`。

### 托管控制平面集成变量

只有在 `SITE_RESOLUTION_MODE=host-based` 时才使用这些变量。

| 变量                                       | 说明                                                     |
| ------------------------------------------ | -------------------------------------------------------- |
| `HOSTED_CONTROL_PLANE_BASE_URL`            | 公开的托管控制平面 URL，用于托管登录、重置密码和账号跳转 |
| `HOSTED_CONTROL_PLANE_INTERNAL_BASE_URL`   | 可选的控制平面内部 URL，供服务间调用                     |
| `HOSTED_CONTROL_PLANE_PROVIDER_NAME`       | 可选的 provider 名称标签，显示在托管账号 UI 中           |
| `HOSTED_CONTROL_PLANE_INTERNAL_TOKEN`      | 托管控制平面内部 API 使用的共享 bearer token             |
| `INTERNAL_ADMIN_TOKEN`                     | 内部管理路由使用的共享 bearer token                      |
| `HOSTED_CONTROL_PLANE_DOMAIN_CHECK_SECRET` | 域名校验响应使用的 32+ 字符 secret                       |
| `HOSTED_CONTROL_PLANE_SSO_SECRET`          | 托管后台接力 token 使用的 32+ 字符 secret                |

启用 `host-based` 模式后，如果缺少必需变量，启动会直接失败。这是刻意设计的。

### Feed 默认值（可选）

| 变量            | 默认值     | 说明                                       |
| --------------- | ---------- | ------------------------------------------ |
| `MAIN_RSS_FEED` | `featured` | 控制 `/feed` 返回 `featured` 还是 `latest` |

`featured` 默认开启是有意为之。Jant 假设很多帖子应该留在站点上，但不一定要自动成为默认订阅 feed 的内容。

### 分页（可选）

| 变量                | 默认值           | 说明                             |
| ------------------- | ---------------- | -------------------------------- |
| `PAGE_SIZE`         | `50`             | timelines 和 APIs 的默认分页大小 |
| `SEARCH_PAGE_SIZE`  | 继承 `PAGE_SIZE` | 只覆盖搜索页分页                 |
| `ARCHIVE_PAGE_SIZE` | 继承 `PAGE_SIZE` | 只覆盖归档页分页                 |

只有在搜索页或归档页真的需要和全站不同的分页大小时，才去设置 `SEARCH_PAGE_SIZE` 和 `ARCHIVE_PAGE_SIZE`。

### 存储

存储方式取决于运行时：

| 运行时             | 默认值  | 支持的驱动    |
| ------------------ | ------- | ------------- |
| Cloudflare Workers | `r2`    | `r2`, `s3`    |
| Node 和 Docker     | `local` | `local`, `s3` |

Node 不支持 `r2`。

Cloudflare 不支持 `local`。

对 Node 和 Docker 来说，`local` 是最快起步的方式；`s3` 通常是更适合长期生产环境的选择。

#### 本地存储（Node / Docker 下最快起步）

本地存储不需要额外驱动配置。

适合这些场景：

- 想用最简单的方式跑起来
- 本地测试
- 单机的小型安装

默认值：

- `DATA_DIR=./data`
- `LOCAL_STORAGE_PATH=<DATA_DIR>/media`

如果你想把媒体文件放在别处，可以覆盖这个路径：

```env
LOCAL_STORAGE_PATH=/absolute/path/to/jant-media
```

只有在另一个 Web 服务器会直接托管这些文件时，才设置 `LOCAL_PUBLIC_URL`。

#### R2（默认）

Cloudflare Workers 默认使用 R2。

| 变量            | 说明                       |
| --------------- | -------------------------- |
| `R2_PUBLIC_URL` | 直接提供媒体文件的公开 URL |

R2 本身通过 `wrangler.toml` 中的 `[[r2_buckets]]` 绑定来配置。

强烈建议设置 `R2_PUBLIC_URL`。不设置也能工作，但 Jant 就必须通过 Worker 代理每一次媒体请求。

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
```

#### S3 兼容存储

适合在这些场景下使用 S3 兼容存储：

- 你想在 Node 或 Docker 下使用更推荐的长期存储方案
- 你想在 Cloudflare 和 Node 之间共用同一套存储后端
- 你更偏好 S3、Backblaze B2、MinIO、DigitalOcean Spaces 或其他兼容服务
- 你需要通过预签名 URL 做浏览器直传

| 变量                   | 说明                       |
| ---------------------- | -------------------------- |
| `STORAGE_DRIVER`       | 设为 `s3`                  |
| `S3_ENDPOINT`          | S3 API endpoint            |
| `S3_BUCKET`            | Bucket 名称                |
| `S3_REGION`            | Bucket 区域，默认是 `auto` |
| `S3_PUBLIC_URL`        | 上传文件对外提供的公开 URL |
| `S3_ACCESS_KEY_ID`     | 访问密钥，必须保密         |
| `S3_SECRET_ACCESS_KEY` | Secret key，必须保密       |

示例：

```toml
[vars]
STORAGE_DRIVER = "s3"
S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com"
S3_BUCKET = "my-bucket"
S3_REGION = "us-east-1"
S3_PUBLIC_URL = "https://cdn.example.com"
```

这些凭证应该放进 secrets 存储，不要提交进版本库。

### 浏览器直传的 CORS

如果你使用 `STORAGE_DRIVER=s3`，bucket 必须为实际上传来源的站点 origin 开启 CORS。

推荐的 CORS 策略：

```json
[
  {
    "AllowedOrigins": ["https://your-site.example"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Disposition",
      "Cache-Control",
      "x-amz-checksum-sha256"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

如果你会从多个 origin 上传，就把每个 origin 都显式列出来。

### 图片变换（可选）

| 变量                  | 说明                   |
| --------------------- | ---------------------- |
| `IMAGE_TRANSFORM_URL` | 图片变换服务的基础 URL |

如果你使用 Cloudflare 图片变换，请把它指向真正提供图片的域名，并在后面加上 `/cdn-cgi/image`。

示例：

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
```

或者，当图片仍然通过站点域名代理时：

```toml
[vars]
IMAGE_TRANSFORM_URL = "https://yourdomain.com/cdn-cgi/image"
```

### 临时上传清理

Jant 会把进行中的上传暂存在一个临时存储前缀下，并在新的上传初始化过程中顺带清理过期的上传会话。

如果你确实需要手动清理路径，可以使用内部维护端点：

```bash
curl -X POST https://your-site.example/api/internal/uploads/cleanup \
  -H "Authorization: Bearer $INTERNAL_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

或者使用 CLI 包装命令：

```bash
export INTERNAL_ADMIN_TOKEN=your-internal-admin-token
npx jant uploads cleanup --url https://your-site.example --limit 50
```

### Slug（可选）

| 变量             | 默认值 | 说明                                       |
| ---------------- | ------ | ------------------------------------------ |
| `SLUG_ID_LENGTH` | `5`    | 对无标题帖子自动生成随机 slug 时使用的长度 |

### 上传大小限制（可选）

| 变量                      | 默认值 | 说明                       |
| ------------------------- | ------ | -------------------------- |
| `UPLOAD_MAX_FILE_SIZE_MB` | `500`  | 非图片上传的最大大小（MB） |

图片本身还有更严格的专用限制。这个设置主要影响视频、音频和 PDF 上传。

### 内容摘要和 RSS 限制（可选）

| 变量                     | 默认值 | 说明                         |
| ------------------------ | ------ | ---------------------------- |
| `SUMMARY_MAX_PARAGRAPHS` | `5`    | 自动生成摘要时的最大段落数   |
| `SUMMARY_MAX_CHARS`      | `500`  | 自动生成摘要时的最大字符数   |
| `RSS_FEED_LIMIT`         | `50`   | RSS feeds 中包含的最大帖子数 |

## Dashboard 设置

这些设置可以在初始化完成后，通过 Jant dashboard 修改。其中一些也可以从环境变量预置进去。

| 设置                         | 用途                                     |
| ---------------------------- | ---------------------------------------- |
| `SITE_NAME`                  | 站点显示名称                             |
| `SITE_DESCRIPTION`           | Meta description 和 feed description     |
| `SITE_LANGUAGE`              | 主要语言代码                             |
| `TIME_ZONE`                  | 显示时区，例如 `UTC` 或 `Asia/Shanghai`  |
| `HOME_DEFAULT_VIEW`          | 决定首页默认从 Latest 还是 Featured 开始 |
| `MAIN_RSS_FEED`              | 决定 `/feed` 返回什么                    |
| `SITE_FOOTER`                | 自定义页脚文本                           |
| `SHOW_JANT_BRANDING_ON_HOME` | 是否在首页显示 Jant 品牌标识             |
| `NOINDEX`                    | 请求搜索引擎不要收录这个站点             |

颜色主题、字型主题、自定义 CSS、头像以及其他外观细节，也都在 dashboard 里管理。

## 保留路径

这些顶层路径是保留的，不能作为 post 或自定义页面的 slug：

```text
featured, latest, collections, signin, signout, setup, settings, posts, dash,
api, feed, search, archive, media, pages, reset, c, compose, static, assets,
_assets, health
```

在 `/c/*` 命名空间内部，collection slug `new` 也是保留的。

## 配置文件

### wrangler.toml

把 Cloudflare 的非敏感配置写进 `wrangler.toml`：

```toml
name = "my-jant-site"
main = "index.js"

[vars]
SITE_ORIGIN = "https://myblog.com"
# SITE_PATH_PREFIX = "/blog"
# R2_PUBLIC_URL = "https://media.myblog.com"
# IMAGE_TRANSFORM_URL = "https://media.myblog.com/cdn-cgi/image"

[[d1_databases]]
binding = "DB"
database_name = "my-jant-site-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "my-jant-site-media"
```

### .env（Node 和 Docker）

Node 和 Docker 下，把这些值放进 `.env`，或者交给你的进程管理器注入：

```env
AUTH_SECRET=your-32-plus-character-secret
SITE_ORIGIN=https://your-jant.example
DATABASE_URL=file:./data/jant.sqlite
# SITE_PATH_PREFIX=/blog
# TRUST_PROXY=true
```

有用的模板：

- 仓库根目录下的 Docker / Node 示例：[`../../.env.example`](../../.env.example)
- package 内部的 Node 示例：[`../../packages/core/.env.node.example`](../../packages/core/.env.node.example)

### .dev.vars（本地开发）

本地 Cloudflare secrets 放进 `.dev.vars`：

```env
AUTH_SECRET=your-32-plus-character-secret
DEV_API_TOKEN=local-debug-token
DEMO_EMAIL=debug@jant.test
DEMO_PASSWORD=jant-dev-debug-login
DEMO_MODE=false
```

`DEV_API_TOKEN`、`DEMO_EMAIL` 和 `DEMO_PASSWORD` 都是本地调试辅助项，不属于正常生产环境配置。

### Demo Mode

只有在公开共享的 demo 环境里，才把 `DEMO_MODE=true` 打开。

效果：

- 强制开启 `noindex`
- 禁用删除账号、修改密码以及一些账号管理操作
- 仅仅设置 `DEMO_EMAIL` 或 `DEMO_PASSWORD` 并不会自动开启 demo mode

### 生产环境 Secrets

Cloudflare 生产环境可以通过 Wrangler 或 Dashboard 设置 secrets：

```bash
openssl rand -base64 32
npx wrangler secret put AUTH_SECRET
```
