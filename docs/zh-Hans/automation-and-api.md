# 自动化与 API

Jant 给站点自动化提供了三种入口：

- 本地 `npx jant` CLI
- HTTP JSON API
- 认证后的 MCP endpoint：`/api/mcp`

如果你是用 `create-jant` 新建的站点，脚手架默认还会带上这些文件：

- `AGENTS.md`
- `.agents/skills/`
- `.claude/skills/`
- `examples/agent-content-automation/README.md`

这意味着，一个 agent 或脚本在生成项目里拿到的不只是 API token，还能直接看到项目约定和现成样例。

## 先选哪条路

优先级建议很简单：

- 自动化和站点运行在同一台机器上：先用本地 CLI
- 你只是从外部脚本或服务调用站点：直接用 HTTP API
- 你的调用方本来就支持 MCP：用 `/api/mcp`

原因也很直接：

- CLI 最省事，不用自己拼 URL 和请求头
- HTTP API 最稳定，适合迁移脚本、后台任务和外部服务
- MCP 更适合 agent 工具调用，不适合拿来替代普通 shell 脚本

## 本地 CLI

目前和内容自动化直接相关的命令组有：

- `npx jant posts`
- `npx jant media`
- `npx jant collections`
- `npx jant settings`
- `npx jant search`

CLI 的站点解析规则：

- 传 `--url https://your-site.com`
- 或者让 CLI 从环境变量 / `wrangler.toml` 里的 `SITE_ORIGIN` 读取

认证规则：

- 传 `--token jnt_...`
- 或设置 `JANT_API_TOKEN`
- 本地开发时也可以用 `DEV_API_TOKEN`

最短示例：

```bash
npx jant posts create --input ./examples/agent-content-automation/note.json
npx jant media upload ./path/to/photo.webp --alt "封面图"
npx jant settings update --input ./examples/agent-content-automation/site-settings.json
npx jant search "quiet design"
```

如果你想看完整样例，先读生成项目里的：

```text
examples/agent-content-automation/README.md
```

## HTTP API

HTTP API 适合这些场景：

- 从别的系统导入内容
- 跑定时任务
- 把 Jant 接到外部后台或自动化平台

常用入口：

- `/api/posts`
- `/api/uploads`
- `/api/upload`
- `/api/attachments`
- `/api/collections`
- `/api/settings`
- `/api/search`

建议：

- 新的上传客户端优先用 `/api/uploads`
- 如果你只是需要文件上传后的元数据读写，可以用 `/api/upload`
- 文本附件内容通过 `/api/attachments/:id/content` 读取

完整字段、请求体和错误格式，请直接看英文 API 文档：

- [API 参考（英文）](../API.md)

## MCP

Jant 的 MCP endpoint 是一个很窄的 HTTP JSON-RPC 接口：

- 路径：`/api/mcp`
- 认证：session cookie 或 Bearer API token
- 请求头需要带：`MCP-Protocol-Version: 2025-06-18`
- 当前支持：`initialize`、`ping`、`tools/list`、`tools/call`

当前工具分组：

- posts
- media
- attachments
- collections
- settings
- search

适合 MCP 的场景：

- agent 已经有 MCP client
- 你希望把 Jant 暴露成一组工具，而不是手写 fetch

不适合 MCP 的场景：

- 简单 shell 脚本
- 本地内容批量导入
- 你并不需要工具发现或工具调用协议

最小初始化请求：

```bash
curl -X POST "$JANT_URL/api/mcp" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}'
```

## 一条现实建议

如果你的目标只是"让 agent 能稳定发帖、传图、改设置"，先把这三件事跑通就够了：

1. `npx jant posts create`
2. `npx jant media upload`
3. `npx jant settings update`

等这三条稳定了，再考虑 MCP、多工具编排，或者更复杂的内容工作流。

## 接下来

- [API 参考（英文）](../API.md) —— 完整字段、请求体和错误格式
- [常见问题](faq.md) —— 包括"能用 AI agent 发帖吗？"
