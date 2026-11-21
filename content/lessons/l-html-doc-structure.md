---
id: l-html-doc-structure
slug: doc-structure
title: 文档结构与常用标签
difficulty: 1
estMinutes: 30
tags: [HTML, 入门]
summary: 理解 HTML 文档的固定骨架，学会用语义化标签描述页面结构，而不是堆砌 div。
updated: 2026-11-21
resources:
  - id: r-html-mdn
    title: MDN · HTML 基础
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML
    type: doc
    difficulty: 1
    note: 权威参考，配合本节查漏补缺，遇到不认识的标签直接搜。
  - id: r-html-validator
    title: W3C Markup Validator
    url: https://validator.w3.org/
    type: tool
    difficulty: 1
    note: 把你写的 HTML 丢进去检查，能揪出很多不规范的写法。
---

> 一句话定义：HTML 是给内容「贴结构标签」的语言——它不负责好看，只负责告诉浏览器「这一块是什么」。

## 概念讲解

每个 HTML 文件都有一个**固定骨架**，像填表格一样往里写内容：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>页面标题（显示在浏览器标签上）</title>
  </head>
  <body>
    <!-- 用户真正看到的内容都在 body 里 -->
  </body>
</html>
```

把 `<body>` 想象成一篇**作文的结构提纲**：页头、导航、正文、页脚。HTML5 提供了一组**语义化标签**来对应这些部位：

| 标签 | 语义 | 类比 |
| ---- | ---- | ---- |
| `<header>` | 页头 / 区块头 | 书的封面与章节名 |
| `<nav>` | 导航 | 目录 |
| `<main>` | 页面主内容（每页只能有一个） | 正文 |
| `<section>` | 一个主题区块 | 一节 |
| `<article>` | 独立成篇的内容 | 一篇短文 |
| `<footer>` | 页脚 | 版权页 |

**为什么要语义化，而不是全用 `<div>`？** 三个理由：屏幕阅读器靠语义朗读页面（可访问性）；搜索引擎靠语义理解页面权重（SEO）；半年后的你自己靠语义读懂代码（可维护性）。这是「结构即信息」——标签本身就是信息。

## 代码示例

一个语义化的最小页面骨架，可以直接保存为 `index.html` 双击打开：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>我的第一张网页</title>
  </head>
  <body>
    <header>
      <h1>我的学习笔记</h1>
      <nav>
        <a href="#notes">笔记</a>
        <a href="#about">关于</a>
      </nav>
    </header>

    <main>
      <article>
        <h2>今天学了 HTML 骨架</h2>
        <p>每个页面都有固定的 head + body 结构。</p>
      </article>

      <section id="notes">
        <h2>历史笔记</h2>
        <ul>
          <li>周一：VS Code 安装</li>
          <li>周二：HTML 骨架</li>
        </ul>
      </section>
    </main>

    <footer>
      <p>© 2026 我自己</p>
    </footer>
  </body>
</html>
```

注意两个细节：`<h1>` 一页只出现一次（页面主标题），`<section>` 的 `id` 让导航链接能跳转锚点。

## 常见坑

1. **坑 1：`<div>` 满天飞**。新手的页面全是 div 套 div。排查思路：写每个容器前先问「这块内容是什么角色」，能换成 header/nav/main/section 的就换。
2. **坑 2：忘了 `<meta name="viewport">`**。手机打开会按桌面宽度缩放，字小得看不清。这是响应式的第一行配置，不是可选项。
3. **坑 3：`<h3>` 直接跳过 `<h2>` 当「小字标题」用**。标题标签是文档大纲，不是字号工具——想要小字请用 CSS，标题层级必须连续。

## 小练习

1. 把上面示例抄进一个 `index.html` 并用浏览器打开，然后给 `<main>` 里再加一个 `<article>`，内容写「本周计划」。
2. 故意删掉 `<!DOCTYPE html>` 再打开，用浏览器开发者工具（F12）观察页面渲染模式有什么不同。
3. 用 W3C Validator 检查你写的页面，把报错全部清零。
