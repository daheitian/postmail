# 备份与恢复

如果你只是想找常用命令，直接从这里开始。

这些命令要在安装了 `@jant/core` 的 Jant 项目目录里运行。下面的 shell 示例默认使用 macOS 或 Linux。

**先记住一条规则：** 一个完整的 Jant 备份，永远同时包含数据库和已上传媒体文件。

## 最常用命令

把远程站点导出成普通目录：

```bash
mkdir -p backups
export JANT_API_TOKEN=jnt_your_token
npx jant site export --url https://your-site.example --directory ./backups/jant-site-export-$(date +%F)
```

创建一个用于恢复的快照，保留内部 ID、存储键和被引用的对象文件：

```bash
mkdir -p backups
npx jant site snapshot export --output ./backups/jant-site-snapshot-$(date +%F).zip
```

导出当前数据库的原始 SQL：

```bash
mkdir -p backups
npx jant db export --output ./backups/jant-db-$(date +%F).sql
```

备份默认 Docker 或 Node 本地数据布局（`data/jant.sqlite` + `data/media/`）：

```bash
docker compose down
mkdir -p backups
tar -czf ./backups/jant-full-$(date +%F).tar.gz data/jant.sqlite data/media
docker compose up -d
```

把快照恢复到本地站点：

```bash
npx jant site snapshot import --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

把快照恢复到远程 Cloudflare 站点：

```bash
npx jant site snapshot import --remote --config ./wrangler.toml --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

## 先选对工具

Jant 有三种不同的备份与恢复工具，它们解决的问题不一样：

| 需求                       | 使用这个                                         |
| -------------------------- | ------------------------------------------------ |
| 把内容迁移到另一个站点     | `site export` 和 `site import`                   |
| 按原样恢复内部 ID 和存储键 | `site snapshot export` 和 `site snapshot import` |
| 应对生产环境数据丢失       | 真正的数据库备份，加上真正的媒体备份             |

一句话概括：

- `site export` 用来迁移和归档
- `site snapshot` 用来做可往返恢复的内容快照
- 数据库备份加媒体备份，才是真正的灾难恢复方案

## 什么才算完整备份

你必须同时备份：

- 数据库
- 媒体存储

如果你只备份数据库，你会保住 posts、collections、settings 和媒体元数据，但会丢掉真正的上传文件。

如果你只备份媒体存储，你会保住文件，但会丢掉指向这些文件的记录。

## 可移植导出

在这些场景里用 `site export`：

- 把内容迁移到另一个 Jant 站点
- 保留一个可移植归档
- 检查或直接使用导出的 Hugo 结构

这里直接用远程站点 URL，并导出成普通目录：

```bash
mkdir -p backups
export JANT_API_TOKEN=jnt_your_token
npx jant site export --url https://your-site.example --directory ./backups/jant-site-export-$(date +%F)
```

不要把 `site export` 当成生产环境灾难恢复的主要方案。

更多导入导出选项见 [导出与导入](export-and-import.md)。

## 恢复快照

在这些场景里用 `site snapshot`：

- 保留 post IDs 和存储键
- 在别处重建一份已知内容集
- 保留一个可以往返恢复的内容归档

常用命令：

本地导出快照：

```bash
mkdir -p backups
npx jant site snapshot export --output ./backups/jant-site-snapshot-$(date +%F).zip
```

从远程 Cloudflare 站点导出快照：

```bash
mkdir -p backups
npx jant site snapshot export --remote --config ./wrangler.toml --output ./backups/jant-site-snapshot-$(date +%F).zip
```

本地恢复快照：

```bash
npx jant site snapshot import --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

把快照恢复到远程 Cloudflare 站点：

```bash
npx jant site snapshot import --remote --config ./wrangler.toml --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

快照导入目前必须带 `--replace`。

快照导入不会覆盖内容范围之外的用户和认证壳数据，比如 users、sessions、API tokens。

## 仅数据库导出

在这些场景里用 `db export`：

- 检查数据库内容
- 和其他备份一起保留一份 SQL dump
- 接入你自己的数据工具链

本地：

```bash
mkdir -p backups
npx jant db export --output ./backups/jant-db-$(date +%F).sql
```

远程 Cloudflare D1：

```bash
mkdir -p backups
npx jant db export --remote --config ./wrangler.toml --output ./backups/jant-db-$(date +%F).sql
```

原始 SQL 导出本身不是完整的 Jant 备份。你仍然需要媒体文件。

## Docker 和 Node

### 默认 Docker Compose 部署

仓库自带的 `compose.yml` 默认把本地数据放在这里：

- `data/jant.sqlite`
- `data/media/`

最简单的完整备份方式，是先停服务，再复制文件，避免在 SQLite 正在写入时直接打包：

```bash
docker compose down
mkdir -p backups
tar -czf ./backups/jant-full-$(date +%F).tar.gz data/jant.sqlite data/media
docker compose up -d
```

恢复这个归档：

```bash
docker compose down
tar -xzf ./backups/jant-full-2026-03-30.tar.gz
docker compose up -d
```

### 直接跑 Node，使用 SQLite 和本地媒体

如果你是直接用 Node 跑 Jant，先停掉进程管理器，再打包同样的路径：

```bash
mkdir -p backups
tar -czf ./backups/jant-full-$(date +%F).tar.gz data/jant.sqlite data/media
```

如果你改过 `DATA_DIR` 或 `LOCAL_STORAGE_PATH`，就备份你自己配置的路径。

### 直接跑 Node，使用 Postgres

用 `pg_dump` 备份数据库：

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" > ./backups/jant-db-$(date +%F).sql
```

如果你仍然使用本地媒体存储，也要一起归档：

```bash
tar -czf ./backups/jant-media-$(date +%F).tar.gz data/media
```

恢复数据库：

```bash
psql "$DATABASE_URL" < ./backups/jant-db-2026-03-30.sql
```

### 直接跑 Node，使用 S3 兼容存储

如果媒体放在 S3、Backblaze B2、MinIO、兼容 R2 的工具链，或者其他 S3 兼容对象存储里，你仍然需要两部分：

- 一份数据库备份
- 一份对象存储备份或保留策略

数据库备份示例：

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" > ./backups/jant-db-$(date +%F).sql
```

使用 AWS CLI 同步媒体的示例：

```bash
aws s3 sync s3://your-bucket ./backups/media-$(date +%F)/
```

如果你的服务商需要自定义 endpoint、credentials 或 profile，就在同一条命令上补相应参数。

## Cloudflare Workers

如果你在 Cloudflare 上运行 Jant，并使用 D1 + R2，一个实用方案通常分成两层：

1. 在平台外保留近期的 Jant 快照或 SQL 导出
2. 为 D1 和 R2 本身准备明确的恢复方案

常用命令：

```bash
mkdir -p backups
npx jant db export --remote --config ./wrangler.toml --output ./backups/jant-db-$(date +%F).sql
npx jant site snapshot export --remote --config ./wrangler.toml --output ./backups/jant-site-snapshot-$(date +%F).zip
```

这些命令能给你什么：

- `db export` 会生成一份独立的数据库 SQL
- `site snapshot export` 会生成一个便于恢复的内容快照，并包含被引用的对象

这些命令不能替代什么：

- 你的 D1 恢复流程
- 你的 R2 保留策略或平台外对象备份方案

对象存储很耐用，不等于你真的有一套验证过的恢复流程。

## 恢复检查清单

### Cloudflare 恢复

1. 恢复数据库，或者导入快照。
2. 如果涉及对象存储丢失，恢复缺失的媒体对象。
3. 重新部署，或者让 Jant 指向恢复后的资源。
4. 检查首页、collections、媒体 URL 和 settings。

### Docker 或 Node 恢复

1. 停掉应用。
2. 恢复数据库文件或数据库服务。
3. 恢复媒体文件或媒体 bucket。
4. 启动应用。
5. 检查 posts、collections、uploads 和 feeds。

## 恢复演练

不要等到真的出问题时才第一次恢复。先在一套空白的 staging 环境里做一次演练。

清单：

1. 恢复数据库。
2. 恢复媒体。
3. 启动 Jant。
4. 打开首页、settings，以及若干条样本帖子 URL。
5. 检查附件和 collection 页面。
6. 记录恢复花了多久，以及丢了多少数据。

你至少要跟踪两个数字：

- **RPO**：你能接受丢失多少数据
- **RTO**：恢复最多能花多久

如果你连这两个数字都没法衡量，那你的备份方案还没完成。

如果你不能有把握地把一份备份恢复到一套空白环境里，那你其实还没有一个真正的备份。

## 接下来

- [自动化与 API](automation-and-api.md) —— 把备份脚本化定时执行
- [GitHub 同步](github-sync.md) —— 让内容额外有一份 Git 历史
