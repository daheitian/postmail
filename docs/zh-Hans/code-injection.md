# 代码注入

代码注入用于把第三方脚本、统计代码、字体、评论组件这类外部 HTML 嵌进站点。位置在 **Settings → 外观 → 代码注入**。

两个注入槽，按用途选：

| 槽位     | 注入位置       | 适合放什么                                                |
| -------- | -------------- | --------------------------------------------------------- |
| 站点头部 | `</head>` 之前 | 必须早加载的内容：网站统计、自定义 meta 标签、字体、CSS   |
| 网站页脚 | `</body>` 之前 | 不能阻塞渲染的内容：聊天 widget、评论组件、延迟加载的脚本 |

注入的内容会出现在站点的**每个公开页面**，也就是 settings 之外的所有路由。它直接以原样写入 HTML——这意味着：

- 任何脚本都拥有访客浏览器的完整访问权限。只放你信任来源的代码。
- 错写的标签会破坏页面结构。改完后建议在浏览器里看一眼控制台。
- 注入的脚本会影响首屏性能。能延迟加载的就别放头部。

> Jant 默认对公开页面设置严格的 Content Security Policy，禁止内联 `<script>` 执行。当你保存了非空的代码注入内容后，公开页面 CSP 的 `script-src` 会自动加上 `'unsafe-inline'`，让你贴的内联脚本能跑；清空两个注入框后会自动恢复到严格策略。Settings、API 和静态资源路径不受这条放宽影响。

## Jant 与第三方组件的几个关键事实

写注入脚本前，先了解 Jant 的页面模型——这会直接影响 giscus、Disqus 这类组件的配置选择。

- **Thread 内每个 child post 都有独立 URL**。`/parent-slug` 和 `/child-slug` 渲染同一条 thread 的完整内容，但浏览器地址栏不同。
- **每个 URL 的 `<title>` / `og:title` 不同**，按当前 post 计算。
- **`<link rel="canonical">` 始终指向 thread 根帖**。Thread 内任意 child URL 的 canonical 都是 `/{root-slug}`。
- **可以通过 `[data-page="post"]` 判断当前是否在帖子详情页**，避免把评论挂到首页或 archive。

也就是说：如果你直接复制第三方平台官方生成器给的代码，多数情况下 thread 的每个 child URL 会被识别成不同页面，各自起一份独立讨论。要让一条 thread 共用一份讨论，需要让组件读 `<link rel="canonical">` 而不是 `location.pathname`。

## 配方：giscus（GitHub Discussions 评论）

在 [giscus.app](https://giscus.app) 配置时，**Page ↔ Discussions Mapping** 选 **"Discussion title contains a specific term"**，term 框随便填一个占位符——下面的脚本会动态覆盖它。记下 giscus 给的 `data-repo`、`data-repo-id`、`data-category`、`data-category-id`。

把下面的代码贴进 **网站页脚**：

```html
<script>
  (function () {
    if (!document.querySelector('[data-page="post"]')) return;

    var canonical = document.querySelector('link[rel="canonical"]');
    var term = canonical
      ? new URL(canonical.href, location.origin).pathname
      : location.pathname;

    var mount = document.createElement("div");
    mount.style.maxWidth = "var(--content-max-width, 42rem)";
    mount.style.margin = "3rem auto";
    mount.style.padding = "0 var(--site-padding, 1.5rem)";
    (document.querySelector("main") || document.body).appendChild(mount);

    var s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    s.setAttribute("data-repo", "OWNER/REPO");
    s.setAttribute("data-repo-id", "R_xxx");
    s.setAttribute("data-category", "Announcements");
    s.setAttribute("data-category-id", "DIC_xxx");
    s.setAttribute("data-mapping", "specific");
    s.setAttribute("data-term", term);
    s.setAttribute("data-strict", "1");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-input-position", "bottom");
    s.setAttribute("data-theme", "preferred_color_scheme");
    s.setAttribute("data-lang", "zh-CN");
    mount.appendChild(s);
  })();
</script>
```

要点：

- `[data-page="post"]` 守卫只在帖子详情页加载评论。
- `data-mapping="specific"` 配合动态 term，把 giscus 的"按术语搜讨论"模式当成精确匹配用。
- `data-strict="1"` 关闭 GitHub 模糊搜索，避免把不同 thread 误匹配到一起。
- `data-theme="preferred_color_scheme"` 跟随 Jant 的浅/深色模式自动切换。

第一次访问某条 thread 时，giscus 找不到匹配的 Discussion，会显示 "This post has no discussions yet"。第一个评论提交后 GitHub 自动创建一条 Discussion，标题就是 canonical 路径，之后访问命中。

## 配方：Disqus

把下面的代码贴进 **网站页脚**，把 `YOUR-SHORTNAME` 换成你的 Disqus shortname：

```html
<script>
  (function () {
    if (!document.querySelector('[data-page="post"]')) return;

    var canonical = document.querySelector('link[rel="canonical"]');
    var canonicalUrl = canonical ? canonical.href : location.href;
    var canonicalPath = new URL(canonicalUrl, location.origin).pathname;

    var mount = document.createElement("div");
    mount.id = "disqus_thread";
    mount.style.maxWidth = "var(--content-max-width, 42rem)";
    mount.style.margin = "3rem auto";
    mount.style.padding = "0 var(--site-padding, 1.5rem)";
    (document.querySelector("main") || document.body).appendChild(mount);

    window.disqus_config = function () {
      this.page.url = canonicalUrl;
      this.page.identifier = canonicalPath;
    };

    var s = document.createElement("script");
    s.src = "https://YOUR-SHORTNAME.disqus.com/embed.js";
    s.setAttribute("data-timestamp", String(+new Date()));
    s.async = true;
    document.head.appendChild(s);
  })();
</script>
```

`page.identifier` 用 canonical 路径而不是 `location.pathname`，让 thread 内的所有 child URL 共享同一份评论。

## 配方：网站统计

统计代码通常对加载时机敏感，放 **站点头部**。

**Plausible**：

```html
<script
  defer
  data-domain="yoursite.com"
  src="https://plausible.io/js/script.js"
></script>
```

**Umami**：

```html
<script
  defer
  src="https://YOUR-UMAMI-HOST/script.js"
  data-website-id="YOUR-WEBSITE-ID"
></script>
```

**Google Analytics 4**：

```html
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "G-XXXXXXXXXX");
</script>
```

把 `G-XXXXXXXXXX` 换成 GA4 后台 → 管理 → 数据流里的 Measurement ID。GA4 比 Plausible / Umami 重一些，并且会在访客浏览器里设置第三方 Cookie——如果你的站点在欧盟可访问，需要自己再加一层 cookie consent。

上面这些都不需要单独配置事件——`pageview` 在每次完整页面加载时自动上报，Jant 是服务端渲染的多页站，默认就工作。

如果只想统计公开页面、跳过 settings，可以加一层守卫：

```html
<script>
  if (!location.pathname.startsWith("/settings")) {
    var s = document.createElement("script");
    s.defer = true;
    s.src = "https://plausible.io/js/script.js";
    s.setAttribute("data-domain", "yoursite.com");
    document.head.appendChild(s);
  }
</script>
```

## 配方：自定义字体

如果内建字型主题不够用，可以从 Google Fonts 或自托管字体加载。**站点头部** 放字体声明：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Source+Serif+4:wght@400;600&display=swap"
/>
```

然后在 **Custom CSS** 里把字体应用到 Jant 的排版变量上：

```css
:root {
  --font-body: "Inter", sans-serif;
  --font-heading: "Source Serif 4", serif;
}
```

变量列表见 [主题定制](theming.md#排版变量)。

## 接下来

- [主题定制](theming.md) —— CSS 变量与样式系统
- [常见问题](faq.md) —— 包括评论、多语言等常被问到的话题
