# 导出与导入

这些命令都应该在安装了 `@jant/core` 的 Jant 项目目录里运行。对于通过 `create-jant` 创建的站点来说，通常就是项目根目录。

## 先选对工具

| 需求                         | 使用这个                                         |
| ---------------------------- | ------------------------------------------------ |
| 把内容迁移到另一个 Jant 站点 | `site export` 和 `site import`                   |
| 生成一个可移植的静态归档     | `site export`                                    |
| 按原样恢复内部 ID 和存储键   | `site snapshot export` 和 `site snapshot import` |
| 导出原始数据库 SQL           | `db export`                                      |

`site export` 是为可移植性准备的。

`site snapshot` 是为恢复准备的。

它们不是同一回事。

## Site Export

`site export` 会生成一个兼容 Zola 的导出，格式可以是 ZIP 文件，也可以是目录。

适合用在这些场景：

- 把内容迁移到另一个 Jant 站点
- 本地检查一个静态导出
- 保留一个可移植的已发布结构归档

默认情况下，Jant 会把导出中引用到的媒体本地化进去，让归档尽量更自包含。

如果这个导出来自 Jant，`config.toml` 还会保留供 round-trip import 使用的 Jant 元数据，包括 header navigation 和 collections directory 结构（collection 顺序、divider、自定义 link）。

### 导出本地站点

```bash
npx jant site export --output ./jant-site-export.zip
```

如果你想直接查看生成出来的站点，也可以直接导出到目录：

```bash
npx jant site export --directory ./jant-site
cd ./jant-site && zola serve
```

### 导出远端站点

先在 **Settings > API Tokens** 里创建一个 API token，然后运行：

```bash
export JANT_API_TOKEN=jnt_your_token
npx jant site export --url https://your-site.example --output ./jant-site-export.zip
```

你也可以直接传 `--token`，但 `JANT_API_TOKEN` 更适合反复使用。

## Site Import

`site import` 会读取一个 site export 目录或 ZIP，并把它导入到 Jant。

适合用在这些场景：

- 从一个 Jant 站点迁移到另一个 Jant 站点
- 从一个可移植导出里恢复内容
- 在真正写入之前先预览一次导入结果

重要规则：

- 导入要求目标站点是空的
- slug 或 alias 冲突会让导入停止
- `--dry-run` 只做校验，不会真正写入

### 先做一次 Dry Run

```bash
npx jant site import --path ./jant-site-export.zip --dry-run
```

### 导入到本地站点

```bash
npx jant site import --path ./jant-site-export.zip
```

### 导入到远端站点

```bash
export JANT_API_TOKEN=jnt_your_token
npx jant site import --url https://your-site.example --path ./jant-site-export.zip
```

如果你只想导入帖子和 collection 数据，而不传媒体文件，可以跳过媒体：

```bash
npx jant site import --path ./jant-site-export.zip --skip-media
```

## Site Snapshots

`site snapshot export` 和 `site snapshot import` 会保留 Jant 内部的 IDs、存储键以及对象文件。

当你要的是“可往返恢复”的快照，而不是内容迁移时，就用 snapshot。

### Snapshot 包含什么

一个 snapshot 会包含 Jant 恢复已发布结构所需的内容和展示数据，包括：

- posts
- collections
- collection directory items
- navigation items
- media records
- path registry entries
- 它们所引用的存储对象本身

Snapshot import 不会替换认证和外壳层数据，比如 users、sessions 和 API tokens。

### 导出 Snapshot

本地：

```bash
npx jant site snapshot export --output ./jant-site-snapshot.zip
```

远端 Cloudflare D1：

```bash
npx jant site snapshot export --remote --config ./wrangler.toml --output ./jant-site-snapshot.zip
```

### 导入 Snapshot

目前 snapshot import 需要带上 `--replace`。

本地：

```bash
npx jant site snapshot import --path ./jant-site-snapshot.zip --replace
```

远端 Cloudflare D1：

```bash
npx jant site snapshot import --remote --config ./wrangler.toml --path ./jant-site-snapshot.zip --replace
```

### 重映射站点 ID

在 `single-site` 模式下，Jant 会自动把 snapshot 映射到数据库里唯一已经初始化的那个站点。

如果你明确要把一个站点的内容导入到另一个已存在的站点容器里，可以使用：

```bash
npx jant site snapshot import --path ./jant-site-snapshot.zip --replace --remap-site
```

只有在你真的理解后果、并且流程可信时，才使用 `--remap-site`。

## 数据库导出

`db export` 会把当前数据库写成原始 SQL。

适合用在这些场景：

- 检查数据库内容
- 和其他备份一起保存一个 SQL dump
- 把数据接入你自己的运维工具

本地：

```bash
npx jant db export --output ./jant-export.sql
```

远端 Cloudflare D1：

```bash
npx jant db export --remote --output ./jant-remote.sql
```

原始 SQL 导出本身并不是完整的 Jant 备份。你仍然需要媒体文件。

## 相关阅读

- [备份与恢复](backups.md)
- [API 参考（英文）](../API.md)
