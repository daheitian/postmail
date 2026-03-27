# 快速开始

在 5 分钟内把你的 Jant 站点跑起来。

## 准备工作

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- 一个 [Cloudflare](https://cloudflare.com/) 账户（免费层也可以）

## 创建站点

```bash
pnpm create jant my-blog
cd my-blog
```

这会生成一个已经完成基础配置的 Jant 项目。

## 本地开发

```bash
pnpm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。第一次访问时，你会看到初始化页面。

如果你想换一个本地端口：

```bash
PORT=3030 pnpm run dev
```

## 首次初始化

1. 创建管理员账户（邮箱 + 密码）
2. 设置站点名称
3. 选择语言

这样就可以开始写了。

## 发布内容

### Notes

快速记录想法，不需要标题。

### Articles

更长的正文，支持 Markdown。

### Links

分享外部内容，并加上你的说明。

### Quotes

引用别人的内容并标明出处。

### Images

上传图片，并可选添加说明文字。

## 可见性

每篇内容都有一个可见性级别：

| 级别                   | 含义                                          |
| ---------------------- | --------------------------------------------- |
| **Public**             | 正常发布，所有地方都可见（默认）              |
| **Hidden from Latest** | 不会出现在 Latest，但仍会出现在你加入的合集里 |
| **Private**            | 只有登录后可见                                |
| **Draft**              | 草稿，尚未发布                                |

### Featured

Featured 是一个独立的精选标记，不属于可见性级别。任何内容（包括 thread 回复）都可以标记为精选。精选内容会始终出现在 Featured 页面，以及专门的精选 feeds（`/feed/featured` 和 `/feed/featured/atom.xml`）。主 feed（`/feed`）默认指向 Featured，也可以在 General settings 里改成 Latest。你可以在内容菜单里把一篇内容设为 featured。

## Threads

回复你自己的内容，就可以创建一个连续的 thread。thread 会继承根内容的可见性，但 featured 状态是独立的，你可以单独把某一条回复设为精选。

## Collections

你可以把内容整理到不同主题的合集里：

- `/c/reading-2024` - 今年的读书笔记
- `/c/recipes` - 你的做饭实验
- `/c/thoughts-on-ai` - 关于 AI 的一组想法

合集页面更适合浏览，也可以使用自己的排序方式。合集 feed（`/c/{slug}/feed`）会按内容加入合集的时间排序。

## 下一步

- [部署到 Cloudflare](deployment.md)
- [规划备份与恢复](backups.md)
- [配置你的站点](configuration.md)
- [自定义主题](theming.md)
