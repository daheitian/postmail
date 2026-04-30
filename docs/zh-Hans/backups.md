# 备份与恢复

本文针对生产部署的备份与恢复策略。`@jant/core` 提供的导出/导入命令本身的语法、参数与归档结构请参阅 [导出与导入](export-and-import.md)。下文 shell 示例默认在 macOS 或 Linux 下、于已安装 `@jant/core` 的 Jant 项目目录执行。

一项核心约束：**完整的 Jant 备份必须同时覆盖数据库与媒体存储**。缺少数据库则丢失 posts、collections、settings 与媒体元数据；缺少媒体则保留指向文件的记录但失去文件本身。两者均不可独立恢复站点。

## 选择合适的工具

| 需求                    | 使用                                            |
| ----------------------- | ----------------------------------------------- |
| 跨 Jant 站点迁移内容    | `site export` / `site import`                   |
| 按原样恢复 IDs 与存储键 | `site snapshot export` / `site snapshot import` |
| 应对生产环境数据丢失    | 数据库备份 + 媒体备份                           |

`site export` 面向可移植性，`site snapshot` 面向可恢复性。两者均为内容层备份，**不替代**底层数据库与对象存储自身的备份方案。

## 命令的运行环境

Jant 提供的 CLI 命令分为两类，所需环境不同：

**HTTP API 类**：`jant site export <url>`、`jant site import <url>`、`jant site pull-media`

通过站点公开 URL 调用 HTTP API，**不连接数据库**。需要 `JANT_API_TOKEN` 环境变量（或 `--token`）作为认证凭证，token 在站点的 **Settings → API Tokens** 中创建。

**直连数据存储类**：`jant site snapshot export/import`、`jant db export`

直接访问数据库与媒体存储，运行目标按以下规则解析：

| 标志       | 目标                  | 所需环境                                  |
| ---------- | --------------------- | ----------------------------------------- |
| `--remote` | 远端 Cloudflare D1/R2 | `wrangler.toml`（可经 `--config` 指定）   |
| `--local`  | 本地 D1（wrangler）   | `wrangler.toml`                           |
| `--node`   | Node runtime          | `DATABASE_URL`（必填），相关 storage 变量 |
| 不传标志   | 自动推导              | 见下                                      |

自动推导规则：若进程环境中已设置 `DATABASE_URL` 或 `DATA_DIR`，使用 Node runtime；否则回落到本地 D1。CLI 启动时会输出一行 `[jant] target = ...` banner，可用于核对实际选中的目标。

CLI 在执行前会从 `<cwd>/.env.node` 自动加载环境变量（仅赋值尚未存在的键，已 export 的 shell 变量优先），因此项目目录下放置 `.env.node` 即可，不必每次手动 source。

**第三方工具**：`pg_dump`、`psql`、`aws s3 sync`

各自读取其原生环境变量。`pg_dump` 与 `psql` 直接读取 shell 中的 `$DATABASE_URL`；`aws s3` 使用 AWS 标准凭据链（`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `~/.aws/credentials`），与 Jant 自身的 `S3_*` 配置变量是两套，备份脚本中需独立提供。

完整的环境变量列表见 [配置](configuration.md)。

## Site Snapshot

Snapshot 与底层部署解耦，可作为跨环境的恢复归档使用。Snapshot 命令直连数据存储，运行目标按上一节规则解析；下例分别对应自动推导（D1 或 Node，按环境变量决定）与远端 Cloudflare D1：

```bash
mkdir -p backups
npx jant site snapshot export --output ./backups/jant-site-snapshot-$(date +%F).zip
npx jant site snapshot export --remote --config ./wrangler.toml --output ./backups/jant-site-snapshot-$(date +%F).zip
```

Node + Postgres 部署应显式指定目标，避免依赖自动推导：

```bash
DATABASE_URL=postgres://... npx jant site snapshot export --node --output ./backups/jant-site-snapshot-$(date +%F).zip
```

恢复必须显式传入 `--replace`：

```bash
npx jant site snapshot import --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
npx jant site snapshot import --remote --config ./wrangler.toml --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

Snapshot import 不会替换内容范围之外的 users、sessions、API tokens。归档结构、`--skip-objects`、`--allow-missing-objects` 等选项详见 [导出与导入 § Site Snapshots](export-and-import.md#site-snapshots)。

## Docker 与 Node

### Docker Compose 默认布局

仓库自带的 `compose.yml` 将本地数据存放于：

- `data/jant.sqlite`
- `data/media/`

直接归档运行中的 SQLite 文件可能产生不一致快照。应先停服务再打包：

```bash
docker compose down
mkdir -p backups
tar -czf ./backups/jant-full-$(date +%F).tar.gz data/jant.sqlite data/media
docker compose up -d
```

恢复：

```bash
docker compose down
tar -xzf ./backups/jant-full-2026-03-30.tar.gz
docker compose up -d
```

### Bare Node + SQLite + 本地媒体

默认布局下，SQLite 文件位于 `DATA_DIR`（默认 `./data`），媒体目录为 `LOCAL_STORAGE_PATH`（默认 `<DATA_DIR>/media`）。停止进程管理器后归档实际配置的路径：

```bash
set -a; source .env; set +a   # 加载 DATA_DIR / LOCAL_STORAGE_PATH
mkdir -p backups
tar -czf "./backups/jant-full-$(date +%F).tar.gz" \
  "${DATA_DIR:-./data}/jant.sqlite" \
  "${LOCAL_STORAGE_PATH:-${DATA_DIR:-./data}/media}"
```

若 `DATABASE_URL` 显式覆盖了 SQLite 路径（例如 `DATABASE_URL=file:/var/lib/jant/custom.sqlite`），归档对象应跟随 URL 中的路径。

### Node + Postgres

`pg_dump` 与 `psql` 直接读取 shell 中的 `$DATABASE_URL`。备份脚本应当从站点 `.env` 或 secrets 管理读取，使其与 Jant 运行时使用的连接字符串保持一致：

```bash
set -a; source .env; set +a   # 或显式 export DATABASE_URL=...
mkdir -p backups
pg_dump "$DATABASE_URL" > ./backups/jant-db-$(date +%F).sql
```

若仍使用本地媒体存储，单独归档 `LOCAL_STORAGE_PATH` 指向的目录（默认 `<DATA_DIR>/media`）：

```bash
tar -czf ./backups/jant-media-$(date +%F).tar.gz data/media
```

恢复：

```bash
psql "$DATABASE_URL" < ./backups/jant-db-2026-03-30.sql
```

### Node + S3 兼容存储

媒体托管于 S3、Backblaze B2、MinIO、Cloudflare R2 或其他 S3 兼容对象存储时，备份分为数据库与对象两部分。

注意 Jant 运行时使用 `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` 等变量，而 AWS CLI 使用 `AWS_*` 凭据链或 `~/.aws/credentials`，两者**不会互通**，备份脚本需为 AWS CLI 单独提供凭据，或用 `--profile` 指定一个预配置 profile。

```bash
set -a; source .env; set +a
mkdir -p backups

# 数据库
pg_dump "$DATABASE_URL" > ./backups/jant-db-$(date +%F).sql

# 对象（AWS S3）
aws s3 sync "s3://$S3_BUCKET" "./backups/media-$(date +%F)/"

# 对象（S3 兼容服务，如 R2、B2、MinIO）
aws s3 sync "s3://$S3_BUCKET" "./backups/media-$(date +%F)/" \
  --endpoint-url "$S3_ENDPOINT" \
  --profile your-s3-compatible-profile
```

生产环境优先使用对象存储自身的版本控制或跨区域复制，本地 `sync` 仅作为离线副本补充。

## Cloudflare Workers

D1 + R2 部署的备份策略应分两层组织：

1. **平台外副本**：定期导出 SQL 与 snapshot，确保平台层故障时仍持有可恢复归档
2. **平台内恢复**：D1 的 time-travel / point-in-time restore 流程，以及 R2 的 lifecycle 与跨桶复制策略

平台外副本通过 `--remote` 调用，目标 D1 与 R2 binding 从 `wrangler.toml` 读取（脚本化场景下用 `--config` 指定具体文件）：

```bash
mkdir -p backups
npx jant db export --remote --config ./wrangler.toml --output ./backups/jant-db-$(date +%F).sql
npx jant site snapshot export --remote --config ./wrangler.toml --output ./backups/jant-site-snapshot-$(date +%F).zip
```

`--remote` 调用本质上经由 `wrangler` CLI，因此当前 shell 必须已通过 `wrangler login` 完成认证，或设置了 `CLOUDFLARE_API_TOKEN`。

`db export` 提供独立的数据库 SQL，`site snapshot export` 提供包含被引用对象的内容归档。两者均不替代 D1 的恢复流程，也不替代 R2 的对象保留策略。对象存储的耐用性不等同于已具备经过验证的恢复流程。

## 恢复清单

### Cloudflare

1. 恢复数据库或导入 snapshot
2. 若涉及对象存储丢失，补齐缺失的媒体对象
3. 重新部署，或将 Jant 指向恢复后的资源
4. 验证首页、collections、媒体 URL 与 settings

### Docker 或 Node

1. 停止应用
2. 恢复数据库文件或数据库服务
3. 恢复媒体文件或媒体 bucket
4. 启动应用
5. 验证 posts、collections、uploads 与 feeds

## 恢复演练

在 staging 环境执行至少一次完整恢复，记录两项关键指标：

- **RPO**（Recovery Point Objective）：可接受的数据丢失量
- **RTO**（Recovery Time Objective）：可接受的恢复耗时

演练步骤：

1. 在干净环境恢复数据库
2. 恢复媒体
3. 启动 Jant
4. 打开首页、settings 与若干样本 post URL
5. 验证附件与 collection 页面
6. 记录耗时与丢失量，对照 RPO / RTO 调整方案

未在空白环境完整验证过的备份不应视为可用备份。

## 延伸阅读

- [导出与导入](export-and-import.md) —— 导出/导入命令的语法、flag 与归档结构
- [自动化与 API](automation-and-api.md) —— 备份脚本化与定时执行
- [GitHub 同步](github-sync.md) —— 内容层的 Git 历史副本
