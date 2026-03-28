# 开始使用

开始一个新的 Jant 站点，最快的方式是 `create-jant`。它会为你生成一个可以部署到 Cloudflare 的项目，自动生成本地 `AUTH_SECRET`，默认安装依赖，并给你一个可直接运行的本地开发环境。

如果你想先体验 Jant，而不想先创建项目，可以直接跳到 [使用 Docker 部署](deployment-docker.md)。

## 前置条件

- [Node.js](https://nodejs.org/) 24 或更高版本
- 如果你打算部署到 Workers，需要一个 Cloudflare 账号

## 创建一个新站点

```bash
npm create jant@latest my-site
cd my-site
```

如果你更喜欢 `pnpm` 或 `yarn`，也可以使用它们的 `create` 命令。Jant 会根据你使用的包管理器调整脚手架中的脚本。

## 启动本地开发

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

如果你想换一个本地端口：

```bash
PORT=3030 npm run dev
```

## 在浏览器里完成初始设置

首次启动时，Jant 会引导你完成站点初始化。

1. 创建管理员账号
2. 设置站点名称
3. 选择语言

做完这些之后，你就可以立刻开始发布。

## 先理解默认的发布模型

在你写前几篇内容之前，有一个默认行为值得先知道：

- `/feed` 默认指向 `Featured`
- `/feed/latest` 单独提供最新公开内容
- `Hidden from Latest` 让一篇帖子保持公开，但不进入这条流

这个拆分是刻意设计的。在 Jant 里，发布某篇内容和把它广播出去，并不是自动绑定在一起的动作。

## 脚手架已经帮你做了什么

默认情况下，`create-jant` 还会：

- 生成带安全本地 `AUTH_SECRET` 的 `.dev.vars`
- 安装依赖
- 初始化一个 git 仓库
- 创建一个已经接好 D1 与 R2 绑定、可继续配置的 Cloudflare Workers 项目

如果你传了 `--no-install` 或 `--no-git`，这些步骤就需要你自己完成。

## 接下来读什么

- [写作与内容组织](writing-and-organizing.md)，了解 note、link、quote、threads 和 collections
- [部署到 Cloudflare](deployment.md)，把刚创建的站点发布出去
- [配置](configuration.md)，调整 URL、存储、feeds 和上传行为
- [主题定制](theming.md)，修改站点的视觉表现
