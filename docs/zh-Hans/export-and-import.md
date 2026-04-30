# 导出与导入

本文涉及的所有命令应在已安装 `@jant/core` 的 Jant 项目目录中运行。通过 `create-jant` 创建的站点，通常即为项目根目录。

## 选择合适的工具

| 需求                       | 使用                                             |
| -------------------------- | ------------------------------------------------ |
| 跨 Jant 站点迁移内容       | `site export` 与 `site import`                   |
| 生成可移植的静态归档       | `site export`                                    |
| 按原样恢复内部 ID 与存储键 | `site snapshot export` 与 `site snapshot import` |
| 导出原始数据库 SQL         | `db export`                                      |

`site export` 面向可移植性，`site snapshot` 面向可恢复性。两者用途不同，请勿混用。

## 运行环境

本文档涉及的命令分为两类，所需环境差异显著。运行前需确认所处类别与对应配置。

### HTTP API 类

`site export <url>`、`site import <url>`、`site pull-media`

通过站点公开 URL 调用 HTTP API，**不直接访问数据库或对象存储**，因此可在任意机器上对任意可达的 Jant 站点运行，无须站点的 `wrangler.toml` 或 `DATABASE_URL`。

需要一个 API token：

```bash
export JANT_API_TOKEN=jnt_your_token
```

Token 在站点的 **Settings → API Tokens** 中生成，亦可通过 `--token` 直接传入。

### 直连数据存储类

`site snapshot export/import`、`db export`

直接读写 Jant 的数据库与媒体存储，因此必须在站点对应的部署环境中运行（持有该站点的 `wrangler.toml`，或与该站点共享 `DATABASE_URL`、`LOCAL_STORAGE_PATH`、`S3_*` 等运行时变量）。

运行目标按以下规则解析：

| 标志       | 目标                  | 所需环境                                               |
| ---------- | --------------------- | ------------------------------------------------------ |
| `--remote` | 远端 Cloudflare D1/R2 | `wrangler.toml`，wrangler 已认证                       |
| `--local`  | 本地 D1（wrangler）   | `wrangler.toml`                                        |
| `--node`   | Node runtime          | `DATABASE_URL`，对应 storage 配置变量                  |
| 不传标志   | 自动推导              | 有 `DATABASE_URL` 或 `DATA_DIR` → Node；否则 → 本地 D1 |

`--remote` 经由本地 `wrangler` CLI 调用，需先 `wrangler login` 或设置 `CLOUDFLARE_API_TOKEN`；`--config` 用于指定非默认的 wrangler 配置文件路径。

CLI 启动时会输出一行 `[jant] target = ...` banner，用于核对实际选中的目标。

CLI 在执行前会从 `<cwd>/.env.node` 自动加载环境变量，仅赋值尚未存在的键（已 export 的 shell 变量优先），项目目录下放置 `.env.node` 即可，不必每次手动 source。

完整的环境变量列表见 [配置](configuration.md)。

## Site Export

`site export` 生成兼容 Hugo 的站点导出，输出格式为 ZIP 归档或目录。典型用途包括跨 Jant 站点迁移内容、在本地使用 Hugo 构建预览、长期保留可移植的已发布结构归档。

导出默认会将引用的媒体文件下载至 `static/media/`，使归档自包含。若导出由 Jant 生成，`data/jant.toml` 同时保留 round-trip 导入所需的元数据，包括 header navigation 与 collections directory 结构（collection 顺序、divider、自定义 link）。

### 导出结构

导出本质是一个标准 Hugo 站点。模板与静态资源被打包为 `themes/jant/` 主题，`hugo.toml` 中设置 `theme = "jant"`：

```
hugo.toml
content/                  posts、collections、sections
  {slug}/
    _index.md             thread root（branch bundle）
    {reply-slug}/
      index.md            reply（leaf bundle，build.render = "never"）
data/
  jant.toml               nav items、品牌、显示偏好、collections directory
themes/jant/              打包后的 Jant 主题（layouts + static）
README.md
.gitignore
layouts/                  用户自定义覆盖（可选）
static/                   用户自有静态文件 + 下载的媒体
```

根目录下的 `layouts/` 与 `static/` 由用户自由维护。Hugo 优先加载根目录 `layouts/<name>.html` 而非 `themes/jant/layouts/<name>.html`，因此可在不 fork 主题的前提下单独覆盖任意模板。

### URL 方案

| URL                   | 渲染内容                                          |
| --------------------- | ------------------------------------------------- |
| `/`                   | 首页：pinned posts 优先，随后是非 pinned 的第一页 |
| `/page/N/`            | 非 pinned 旧 posts 的分页（N ≥ 2）                |
| `/archive/`           | 归档：所有已发布 posts，按时间倒序                |
| `/archive/page/N/`    | 归档分页（N ≥ 2）                                 |
| `/featured/`          | 精选：标记为 featured 的 posts，最新优先          |
| `/{slug}/`            | 单条 thread（root post 与内联 replies）           |
| `/{reply-slug}/`      | Alias，重定向至 `/{root-slug}/#{reply-slug}`      |
| `/{collection-slug}/` | 单个 collection                                   |
| `/collections/`       | Collections directory                             |

每页条数由 Jant **Settings > Posts per page** 设置控制。

### Round-trip 保真

`site export` → `site import` 的一次往返会完整保留每个 post 的 featured、pinned 与 collection 归属信息：

- `featured_at` 与 `pinned_at` 在 front matter 中以 ISO 时间戳写入，而非布尔值；重新导入后会恢复至该 post 当时被 feature 或 pin 的具体时刻。
- Front matter 顶层的 `collections` 数组中，每条 entry 携带 `collected_at`、`position` 以及 per-collection `pinned_at`；每个 reply 的 leaf bundle 在自身 front matter 中保留同等信息。

未在文档中列出的字段属于 Jant 内部使用，请勿手动修改：修改后再次导入会直接覆盖存储中的原值。

### 导出站点

需要 `JANT_API_TOKEN` 环境变量（或 `--token`），见 [运行环境 § HTTP API 类](#http-api-类)。

```bash
JANT_API_TOKEN=jnt_your_token npx jant site export https://your-site.example --output ./jant-site-export.zip
```

若需直接查看生成的站点结构，可导出至目录：

```bash
npx jant site export https://your-site.example --directory ./jant-site
cd ./jant-site && hugo serve
```

### 单独拉取媒体

`site export` 默认下载媒体，但拉取步骤也可针对已存在的导出（目录或 ZIP）单独执行。常见场景包括：先前以 `--no-pull-media` 导出、导出后新增了媒体、或上一次拉取过程中断。

```bash
# 针对已解压目录
npx jant site pull-media --path ./jant-site

# 针对 ZIP（默认覆盖原文件）
npx jant site pull-media --path ./jant-site-export.zip

# 针对 ZIP 并输出至新文件
npx jant site pull-media --path ./jant-site-export.zip --output ./pulled.zip
```

该命令扫描所有 markdown 文件与 `hugo.toml`，将每个远程媒体引用下载至 `static/media/` 并重写为本地路径。操作是幂等的：`static/media/` 中已存在的文件会直接复用，不重复下载。下载失败的引用保留原 URL，不影响 Hugo 构建。

### 自定义导出

`themes/jant/` 是打包后的 Jant 主题。当导出被同步至 GitHub 时，每次 push Jant 都会覆盖 `themes/jant/**` 与 `content/**`，以及 `data/jant.toml`、`hugo.toml`、`.gitignore`、`README.md`，并删除上述 managed paths 下 Jant 不再生成的文件（例如已在 Jant 中删除的 post）。其余文件由用户自行维护，会被完整保留，包括 `data/` 下用户自定义的 Hugo data files。

支持的自定义方式：

- **覆盖单个模板**：将 `themes/jant/layouts/<name>.html` 复制至根目录 `layouts/<name>.html`，对根目录副本进行编辑。Hugo 优先加载根目录模板，无需 fork 整个主题。
- **新增静态文件**：放置于根目录 `static/`，将以对应 URL 提供服务，并优先于 `themes/jant/static/` 下的同名文件。
- **调整颜色、字体或布局细节**：使用 Jant 中的 **Settings > Custom CSS**。该值在每次 export 时写入 `themes/jant/static/custom.css`，应通过 dashboard 修改，而非直接编辑 repo。

直接编辑 `themes/jant/**` 不受支持，下次 sync 或 export 会覆盖修改。站点级配置请通过 Jant 的 **Settings** 调整，不要手动编辑 `hugo.toml`。

## Site Import

`site import` 读取 site export 目录或 ZIP 并将其导入 Jant。典型用途包括 Jant 站点之间的迁移、从可移植导出中恢复内容、以及在写入前预览导入结果。

需注意以下约束：

- 目标站点必须为空
- slug 或 alias 冲突会中止导入
- `--dry-run` 仅执行校验，不写入数据

若目标站点非空（通常是上一次导入未完成留下的残留），可通过 Dashboard 的 **Settings → Account → Delete Account** 进行重置。该流程会强制先下载一份 `site export`，要求输入确认短语，然后一次性清除 posts、media、collections、settings 与账号本身；重新注册即可获得干净的目标站点。目前不提供"仅清除内容、保留账号"的轻量入口。

### 先执行 Dry Run

Dry-run 不会连接目标站点，但 URL 仍为必填项，以保持参数形态一致：

```bash
npx jant site import https://your-site.example --path ./jant-site-export.zip --dry-run
```

### 导入到站点

与 `site export` 同样需要 `JANT_API_TOKEN`（或 `--token`）：

```bash
JANT_API_TOKEN=jnt_your_token npx jant site import https://your-site.example --path ./jant-site-export.zip
```

### 跳过 body 中的远程图片

默认情况下，import 会将所有媒体重新托管至目标站点：front matter `media:` 中声明的资源、body 中 `![](...)` 引用的图片（包括远程 URL）以及头像均会被抓取上传，body 中的 URL 也会重写至新地址。这样目标站点完全独立于源站点，源站点后续下线不会影响目标站点的图片可用性。

若不希望将 body 中**指向第三方 URL 的图片**（如 imgur、Wikipedia 等任意 https 链接）镜像至自有存储——出于带宽、版权或必要性的考量——可加 `--skip-remote-media`：

```bash
npx jant site import https://your-site.example --path ./jant-site-export.zip --skip-remote-media
```

启用后：

- **相对路径**（`/media/...`、`./foo.png`）：仍会上传，属于源站点自有文件
- **绝对 URL**（任意 `https://...`、`//cdn...`）：不抓取、不上传，body 中保留原值

Front matter `media:` 声明的资源、头像与文本附件不受此 flag 影响，始终会被迁移。

> **注意**：若源站点将媒体托管于独立存储域名（如 R2 公开域名 `media.yourdomain.com`、S3 CDN 等），body 中的此类图片也会被识别为绝对 URL。仅在确定该域名长期可用（例如源站点与目标站点共用同一存储桶）时启用此 flag，否则源站点 R2 失效后，相关图片将全部不可用。

## Site Snapshots

`site snapshot export` 与 `site snapshot import` 会完整保留 Jant 内部的 IDs、存储键以及对象文件。当目标是可往返恢复的快照而非内容迁移时，应使用 snapshot。

### Snapshot 包含的内容

Snapshot 包含 Jant 恢复已发布结构所需的全部内容与展示数据：

- posts
- collections
- collection directory items
- navigation items
- media records
- path registry entries
- 上述记录引用的存储对象本身（默认全量下载，归档大小约等于媒体总量）

Snapshot import 不会替换认证与外壳层数据，例如 users、sessions、API tokens。

归档结构由三部分组成：

```
jant-site-snapshot.zip
├── meta.json                  // { format, version, site }
├── db.sql                     // 完整 SQL，包含 favicon.ico 的 base64
└── objects/<storage-key>/...  // 所有 media 引用的对象
```

### 导出 Snapshot

默认目标（按 [运行环境](#运行环境) 自动推导，本地 D1 或 Node）：

```bash
npx jant site snapshot export --output ./jant-site-snapshot.zip
```

显式 Node runtime（如 SQLite 或 Postgres 部署）：

```bash
DATABASE_URL=postgres://... npx jant site snapshot export --node --output ./jant-site-snapshot.zip
```

远端 Cloudflare D1：

```bash
npx jant site snapshot export --remote --config ./wrangler.toml --output ./jant-site-snapshot.zip
```

### 跳过媒体文件下载

若源与目标共用同一个 R2 / S3 存储桶（例如仅需将数据库状态迁移至另一个 Worker，而媒体文件已存在于目标桶中），可使用 `--skip-objects` 跳过 `objects/` 目录的填充：

```bash
npx jant site snapshot export --output ./jant-site-snapshot.zip --skip-objects
```

此时归档仅包含 `meta.json` 与 `db.sql`，体积显著缩小。

> **注意**：这是一项有风险的优化，仅当目标 storage 已包含 db.sql 引用的所有 storage key 时才安全。否则导入完成后，站点上的图片、头像与 apple-touch 图标将全部返回 404。
>
> 导入端需配合使用 `--allow-missing-objects`（见下文）；import 默认会对目标 storage 执行预检，遇到缺失对象时会中止运行并输出缺失列表。

### 导入 Snapshot

当前 snapshot import 必须显式传入 `--replace`。

默认目标：

```bash
npx jant site snapshot import --path ./jant-site-snapshot.zip --replace
```

远端 Cloudflare D1：

```bash
npx jant site snapshot import --remote --config ./wrangler.toml --path ./jant-site-snapshot.zip --replace
```

### 允许缺失对象

Import 默认执行一次预检：从 db.sql 中提取所有 `storage_key` 与 `poster_key`，与 `objects/` 目录中的文件进行比对。任何缺失都会触发中止，并输出缺失 key 的完整列表。

若已确认目标 storage 中存在这些文件（例如将 `--skip-objects` 归档导入至与源共用 R2 桶的 Worker），可使用 `--allow-missing-objects` 跳过该校验：

```bash
npx jant site snapshot import \
  --path ./jant-site-snapshot.zip \
  --replace \
  --allow-missing-objects
```

即使启用该 flag，缺失列表仍会输出至 stderr，可重定向保存以便后续审计。

## 数据库导出

`db export` 将当前数据库导出为原始 SQL。典型用途包括检查数据库内容、与其他备份一同留存 SQL dump、以及接入自有运维工具链。

默认目标（按 [运行环境](#运行环境) 自动推导）：

```bash
npx jant db export --output ./jant-export.sql
```

显式 Node runtime：

```bash
DATABASE_URL=postgres://... npx jant db export --node --output ./jant-export.sql
```

远端 Cloudflare D1：

```bash
npx jant db export --remote --config ./wrangler.toml --output ./jant-remote.sql
```

原始 SQL 导出本身并非完整的 Jant 备份，仍需另行处理媒体文件。Postgres 部署亦可直接使用 `pg_dump`（详见 [备份与恢复 § Node + Postgres](backups.md#node--postgres)）。

## 延伸阅读

- [备份与恢复](backups.md) —— 完整的备份与恢复策略
- [GitHub Sync](github-sync.md) —— 通过 GitHub 仓库实现内容备份与双向编辑
- [自动化与 API](automation-and-api.md) —— 将上述操作脚本化
- [API 参考（英文）](../API.md)
