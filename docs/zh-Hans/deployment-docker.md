# 使用 Docker 部署

官方 Docker 镜像是 `owenyoung/jant`。

它会运行 Node 版本的运行时，应用待执行的 migrations，然后启动 Jant。

Docker Hub：<https://hub.docker.com/r/owenyoung/jant>

## 开始前

你需要准备：

- Docker Engine 27 或更新版本，或者其他较新的 Docker 发行版
- Docker Compose v2
- 一个足够长、足够随机的 `AUTH_SECRET`

## 用 Docker Compose 快速开始

下载官方 Compose 文件：

```bash
curl -O https://raw.githubusercontent.com/jant-me/jant/main/compose.yml
curl -o .env https://raw.githubusercontent.com/jant-me/jant/main/.env.example
mkdir -p data/media
```

编辑 `.env`，至少设置：

```env
AUTH_SECRET=replace-with-a-long-random-secret
```

如果你需要生成一个 secret，可以用：

```bash
openssl rand -base64 32
```

启动整个栈：

```bash
docker compose up -d
```

打开 `http://127.0.0.1:3000`。

## 默认 Compose 配置会给你什么

自带的 `compose.yml` 使用的是一个简单的单节点布局：

- 官方镜像 `owenyoung/jant:latest`
- SQLite 数据库存放在 `./data/jant.sqlite`
- 上传媒体存放在 `./data/media/`
- 容器数据挂载到 `/var/lib/jant`
- `TRUST_PROXY=true`，适合放在你自己控制的反向代理之后

这是在 VPS 或家用服务器上自托管 Jant 最简单的方式。

默认 Compose 之所以使用本地媒体，是因为它可以让站点最快跑起来。但如果你打算长期运行，一个 S3 兼容存储通常会是更好的选择。

## 重要环境变量

把这些值写进 `.env`：

| 变量               | 是否必需           | 用途                                                                   |
| ------------------ | ------------------ | ---------------------------------------------------------------------- |
| `AUTH_SECRET`      | 是                 | 会话签名与认证                                                         |
| `SITE_ORIGIN`      | 通常需要           | 用于 RSS、sitemap、导出和认证回调的 canonical URL                      |
| `SITE_PATH_PREFIX` | 仅子路径部署时需要 | 公开挂载路径，例如 `/blog`                                             |
| `TRUST_PROXY`      | 视情况而定         | 如果运行在 Caddy、Nginx、Traefik 或其他可信反向代理之后，就设为 `true` |

示例：

```env
AUTH_SECRET=replace-with-a-long-random-secret
SITE_ORIGIN=https://your-jant.example
# SITE_PATH_PREFIX=/blog
TRUST_PROXY=true
```

Node 和 Docker 的完整变量列表见 [配置](configuration.md)。

## 本地媒体还是 S3？

如果你想要最简单的配置，或者只是在单机上测试，就用本地媒体。

如果你想要 Docker / Node 路线下更推荐的长期方案，就用 S3 兼容存储。它能把媒体文件放在应用主机之外，也让以后迁移或重建应用更容易，而不必把上传文件当成容器本地状态来处理。

## 不用 Compose 运行

如果你只想起一个容器，其他部分自己管，也可以用 `docker run`：

```bash
docker run -d \
  --name jant \
  -p 3000:3000 \
  -e AUTH_SECRET=replace-with-a-long-random-secret \
  -e TRUST_PROXY=false \
  -v "$(pwd)/data:/var/lib/jant" \
  owenyoung/jant:latest
```

如果容器运行在你自己的反向代理之后，请把 `TRUST_PROXY=true`。

## 更新站点

拉取最新镜像并重启：

```bash
docker compose pull
docker compose up -d
```

如果你想获得可重复部署，可以固定具体版本：

```env
IMAGE=owenyoung/jant:<version>
```

## 常用命令

查看日志：

```bash
docker compose logs -f
```

停止整个栈：

```bash
docker compose down
```

修改公开端口：

```env
HOST_PORT=8080
```

## 备份

在默认 Docker 配置下，一个完整备份至少包含这两样：

- `data/jant.sqlite`
- `data/media/`

如果你后来切换到 Postgres 或 S3 兼容存储，你的备份模型也要跟着变化。详见 [备份与恢复](backups.md)。

## 接下来

- [配置](configuration.md) —— 调整环境变量和站点行为
- [写作与内容组织](writing-and-organizing.md) —— 站点跑起来后开始写
- [备份与恢复](backups.md) —— 长期运行需要的恢复规划
