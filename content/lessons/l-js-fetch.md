---
id: l-js-fetch
slug: js-fetch
title: fetch 与真实接口：从拿数据到渲染页面
difficulty: 2
estMinutes: 75
tags: [JavaScript, fetch, 接口]
summary: fetch 是浏览器内置的 HTTP 客户端——两步 await 拿数据、resp.ok 检查状态码、POST 提交表单、三态渲染兜住加载/错误/空——前端接后端的最后一课。
updated: 2026-11-22
resources:
  - id: r-mdn-fetch
    title: MDN · Using the Fetch API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API/Using_Fetch
    type: doc
    difficulty: 2
    note: fetch 的权威用法，含错误处理细节。
  - id: r-jsonplaceholder
    title: JSONPlaceholder（免费假接口）
    url: https://jsonplaceholder.typicode.com/
    type: tool
    difficulty: 1
    note: 本课全部示例用它练手，无需自己搭后端。
---

> 一句话定义：fetch 是浏览器**内置的 HTTP 客户端**——一行发请求、两行拿数据，配上门 three 态渲染（加载/错误/空），前端接后端的闭环就通了。

## 概念讲解

**fetch 的基本形态是「两步 await」**：第一步等响应头（知道状态码、头信息），第二步把响应体解析成 JSON：

```js
const resp = await fetch("https://api.example.com/todos")   // ① 发出请求，等到响应头
const data = await resp.json()                              // ② 解析响应体（也是异步的）
```

为什么要两步？因为响应体可能很大、可能按流传输——`resp.json()` 把「读完字节流并解析」也做成了异步。除了 json() 还有 `resp.text()`（纯文本）、`resp.blob()`（文件）等。

**最重要的坑提前讲**：fetch **不会因为 404/500 而抛错**——它只在网络层失败（断网、DNS 失败）时 reject。所以「检查状态码」是手动动作：

```js
const resp = await fetch(url)
if (!resp.ok) {                       // resp.ok = 状态码在 200-299
  throw new Error(`HTTP ${resp.status}`)   // 手动把 HTTP 错误变成异常，交给 catch
}
```

状态码语义直接复用「网络课/后端课」的知识：2xx 成功、4xx 你的请求有问题、5xx 服务器问题——fetch 课的意义之一就是把两头的知识接通。

**写请求**比读请求多三样东西：方法、请求头、请求体：

```js
await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },   // 告诉后端：我发的是 JSON
  body: JSON.stringify({ title: "新待办", done: false }),  // 对象 → JSON 字符串
})
```

对照「后端开发入门/FastAPI 实战」：这里发的 JSON 会被后端的 Pydantic 模型校验；后端返回的 422 会在前端 catch 里收到——**REST 约定与错误结构，两课在此汇合**。

**三态渲染**是列表页的完整形态，新手项目最容易漏的就是「加载中」和「出错」两个态：

```text
loading（请求中：骨架屏/转圈）→ 成功（渲染数据）/ 空态（没数据）/ 错误（提示+重试按钮）
```

把「请求的状态」也当成数据管理，UI 就是状态的函数（呼应框架课的 UI=f(state)）。

**同源与跨域一句话**：浏览器默认禁止页面 JS 读取「不同源」接口的响应——开发时前端 5173、后端 8000 就是不同源，后端要加 CORS 响应头放行（FastAPI 的 CORSMiddleware 一行配置）；这是浏览器安全模型的一部分（呼应安全课），不是 fetch 的 bug。

## 代码示例

主线：一个消费真实接口（JSONPlaceholder）的「待办加载器」，从最简版进化到三态完整版：

**第 1 步：最小可用版**（Console 里就能跑）：

```js
const resp = await fetch("https://jsonplaceholder.typicode.com/todos?_limit=5")
const todos = await resp.json()
console.log(todos)      // 5 个 {userId, id, title, completed} 对象
```

**第 2 步：三态完整版**（todo-fetch.html + app.js）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>远程待办</title>
<style>
  .state { padding: 24px; color: #888; }
  li.done span { text-decoration: line-through; color: #999; }
</style></head>
<body>
  <h1>远程待办</h1>
  <div id="app"><p class="state">加载中…</p></div>
  <script src="app.js"></script>
</body>
</html>
```

```js
// app.js —— 三态：加载 / 错误 / 数据（空态留给练习）
const app = document.querySelector("#app")

function renderState(html) { app.innerHTML = html }   // 教学示例简化；生产请用 DOM 课的安全姿势

async function load() {
  renderState('<p class="state">加载中…</p>')
  try {
    const resp = await fetch("https://jsonplaceholder.typicode.com/todos?_limit=8")
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)      // 手动抛 HTTP 错误
    const todos = await resp.json()

    if (todos.length === 0) {
      renderState('<p class="state">暂无待办</p>')            // 空态
      return
    }
    renderState(
      `<ul>${todos.map(t =>
        `<li class="${t.completed ? "done" : ""}"><span>${t.title}</span></li>`
      ).join("")}</ul>`
    )
  } catch (err) {
    renderState(
      `<p class="state">加载失败：${err.message}
        <button onclick="load()">重试</button></p>`           // 错误态 + 重试出口
    )
  }
}

load()
```

**第 3 步：提交新数据**（POST 加到表单课的待办里）：

```js
async function addTodo(title) {
  const resp = await fetch("https://jsonplaceholder.typicode.com/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, completed: false, userId: 1 }),
  })
  if (!resp.ok) throw new Error(`提交失败 HTTP ${resp.status}`)
  return resp.json()      // 假接口会回显一个带新 id 的对象（不会真存库）
}
```

对照 curl 验证一遍同样的请求（呼应接口调试课）——「前端发的就是你在终端发的」，联调时两边对照是最快的排错路径。

## 进阶一课：搜索框的竞态——「慢回复覆盖快回复」

列表页接到搜索框（input 实时触发请求）后会遇到经典竞态：输入 "a" 发请求、又改成 "ab" 再发——**两个请求都在途，先发的可能后回**，旧结果把新结果覆盖，界面显示错数据：

```js
let searchId = 0                                  // 本次搜索的「号码牌」

inputEl.addEventListener("input", async (e) => {
  const ticket = ++searchId                       // 每次输入领新号
  const resp = await fetch(`/api/search?q=${e.target.value}`)
  if (ticket !== searchId) return                 // 回来时号码已过期 → 结果作废
  render(await resp.json())
})
```

进阶方案是 `AbortController`：发新请求前把旧的**真正取消**（省流量也省服务器）：

```js
let controller
inputEl.addEventListener("input", async (e) => {
  controller?.abort()                             // 上一单还没回来？直接取消
  controller = new AbortController()
  try {
    const resp = await fetch(`/api/search?q=${e.target.value}`, { signal: controller.signal })
    render(await resp.json())
  } catch (err) {
    if (err.name !== "AbortError") throw err      // 取消不算错误
  }
})
```

React 框架课请求骨架里的 `let ignore` 标志与本课的号码牌是同一思想——**异步结果的「作废机制」**是所有实时搜索、自动补全的地基。

## 常见坑

1. **坑 1：不检查 resp.ok**。404/500 在 fetch 里不抛错，错误页的 HTML 会被当 JSON 解析然后炸出 SyntaxError——每次 fetch 后第一件事就是 `if (!resp.ok) throw`。
2. **坑 2：忘 await resp.json()**。`const data = fetch(url)` 拿到的是 Promise/Response 不是数据——「两步 await」缺一不可。
3. **坑 3：POST 忘 Content-Type**。后端收到的 body 解析不出 JSON，返回 422/400——headers 与 body 是一对，写一个忘一个就联调失败（排查顺序呼应接口调试课：先看状态码→再看响应体→再看请求发对了没）。
4. **坑 4：JSON.stringify 与对象搞混**。`body: { title }` 直接传对象会变成 "[object Object]"——body 必须是字符串。
5. **坑 5：CORS 报错当成后端挂了**。Console 出现 `blocked by CORS policy` 是跨域限制——检查接口是否放行了你的源（开发环境给后端加 CORS 配置），而不是反复改前端代码。
6. **坑 6：loading 态不恢复**。重试成功后还转圈——把「每个渲染分支都覆盖所有状态」写进肌肉记忆（三态渲染的意义）。

## 小练习

1. 把第 2 步改造为「只显示未完成的」（`?completed=false` 查询参数，JSONPlaceholder 支持），并显示条数。
2. 给列表每项加「切换完成」按钮：POST 不支持真改就本地切换（用对象数组课的不可变更新 + DOM 课的 render），理解「乐观更新」的雏形。
3. 小项目：做一个「用户目录」——先 fetch `/users?_limit=5` 渲染用户列表，点击某个用户再 fetch `/users/{id}/posts` 显示其文章（请求间有依赖，串行 await）。做完这个，前后端联调的基本功就齐了。
4. 思考题：对照「接口调试课」的排查三步——fetch 报错时你在 DevTools Network 面板里分别看什么？
