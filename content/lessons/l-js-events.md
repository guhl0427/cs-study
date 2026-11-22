---
id: l-js-events
slug: js-events
title: 事件：让页面听用户的话
difficulty: 2
estMinutes: 75
tags: [JavaScript, 事件]
summary: 用户点、敲、输入，浏览器都会发「事件」——addEventListener 是唯一的现代监听姿势，事件冒泡与委托是列表交互的必修功。
updated: 2026-11-22
resources:
  - id: r-mdn-events
    title: MDN · 事件介绍
    url: https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Building_blocks/Events
    type: doc
    difficulty: 1
    note: 事件学习的官方路径，含大量可交互示例。
  - id: r-mdn-eventref
    title: MDN · 事件参考字典
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Document#事件
    type: doc
    difficulty: 2
    note: 所有事件类型的字典，用到来查。
---

> 一句话定义：事件是浏览器在「用户点了、敲了、输入了」时发出的**通知**——addEventListener 把通知和你的函数绑在一起，页面从此能响应一切交互。

## 概念讲解

**监听的标准姿势**只有一个：

```js
const btn = document.querySelector("#save")
btn.addEventListener("click", () => {
  console.log("被点了")
})
```

三个要素：**目标元素 + 事件类型 + 处理函数**。过时的 `onclick="..."` 内联写法把行为混进 HTML（呼应语言基础课的三种引入），别用。

**高频事件类型**，按场景记：

| 类型 | 触发时机 | 典型用途 |
| ---- | ---- | ---- |
| `click` | 点击 | 按钮、删除、切换 |
| `input` | 输入框每敲一下 | 实时搜索、字数统计 |
| `change` | 值改变并「确认」（失焦/选择） | 下拉、开关 |
| `submit` | 表单提交 | 拦截默认刷新、校验 |
| `keydown` / `keyup` | 按下/抬起键盘键 | 回车提交、快捷键 |
| `DOMContentLoaded` | HTML 解析完成 | 初始化代码的安全时机 |

**事件对象**：处理函数的第一个参数携带现场信息，最常用两个字段：

```js
inputEl.addEventListener("input", (e) => {
  console.log(e.target.value)       // e.target：事件发生在谁身上；value：输入框的当前值
})
```

**键盘事件**让快捷键成为可能——`keydown` 的事件对象带按键信息：

```js
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") console.log("按了 ESC")           // e.key：键名（"Enter"/"a"/"Escape"）
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {          // 组合键：Ctrl+K / Cmd+K
    e.preventDefault()
    console.log("打开搜索")
  }
})
```

一个反直觉点：数字键按下的 `e.key` 是 `"1"`（字符串）不是数字；中文输入法组合期间会触发 `compositionstart/end` 而不是一串 keydown——做「回车提交」时中文用户敲回车选字也会触发 keydown，严谨的判断是监听 `keydown` 且 `e.isComposing === false`。

`e.preventDefault()` 是表单课的续集——`submit` 事件的默认行为是「整页刷新跳转」，拦截它才能留在页面内做 JS 提交：

```js
formEl.addEventListener("submit", (e) => {
  e.preventDefault()                // 不拦：页面刷新、输入全丢（新手最困惑的现象）
  // …JS 校验与提交
})
```

**冒泡与委托**是这一课的进阶核心。点了一个 `<li>`，浏览器会先触发 li 的监听，再逐层向外触发父级 ul、body 的监听——这叫**冒泡**（水泡从深处浮上来）：

```text
点击 <li> → li 的 click → ul 的 click → body 的 click   （由内向外逐层冒泡）
```

它催生了**事件委托**：100 个列表项不绑 100 个监听，只在父级绑一个，用 `e.target` 分辨点的是谁——增删列表项后新元素自动被覆盖，因为监听在父亲身上：

```js
listEl.addEventListener("click", (e) => {
  const item = e.target.closest("li")     // 从实际点击处向上找 li
  if (!item) return
  const id = Number(item.dataset.id)      // 呼应 DOM 课：业务数据挂 dataset
  console.log("点了第", id, "项")
})
```

对照 DOM 课结尾的坑——「每次改数据手动重绑事件」在委托下不复存在。

## 代码示例

主线：给 DOM 课的待办列表装上完整交互——输入、添加、完成、删除：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>待办</title>
<style>
  .done span { text-decoration: line-through; color: #999; }
  .del { margin-left: 12px; color: crimson; cursor: pointer; }
</style></head>
<body>
  <form id="add-form">
    <input id="todo-input" placeholder="要做什么？" autocomplete="off">
    <button type="submit">添加</button>
  </form>
  <ul id="list"></ul>
  <script src="todo.js"></script>
</body>
</html>
```

```js
// todo.js
let todos = [{ id: 1, text: "读完 DOM 课", done: true }, { id: 2, text: "写事件课练习", done: false }]
let nextId = 3

const listEl = document.querySelector("#list")
const formEl = document.querySelector("#add-form")
const inputEl = document.querySelector("#todo-input")

function render() {
  listEl.innerHTML = ""
  for (const t of todos) {
    const li = document.createElement("li")
    li.dataset.id = t.id
    li.className = t.done ? "done" : ""
    li.innerHTML = `<span>${t.text}</span><span class="del">✕</span>`
    listEl.append(li)
  }
}

// ① 表单提交：拦截默认刷新 + 读输入框 + 加数据
formEl.addEventListener("submit", (e) => {
  e.preventDefault()
  const text = inputEl.value.trim()          // trim 去掉首尾空格
  if (!text) return                          // 空输入直接忽略
  todos = [...todos, { id: nextId++, text, done: false }]   // 不可变更新
  inputEl.value = ""                         // 清空输入框（用户体验的关键一步）
  render()
})

// ② 事件委托：一个监听管「完成」和「删除」两种点击
listEl.addEventListener("click", (e) => {
  const li = e.target.closest("li")
  if (!li) return
  const id = Number(li.dataset.id)

  if (e.target.classList.contains("del")) {
    todos = todos.filter(t => t.id !== id)           // 删除
  } else {
    todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t)  // 切换完成
  }
  render()
})

render()
```

打开页面：回车添加、点击文字切换完成、点 ✕ 删除——**一个真正能用的待办应用**。它的架构（数据数组 + render + 委托）就是后续框架课「状态驱动视图」的原始形态。

## 进阶一课：防抖——「等用户停下来再动手」

`input` 事件每敲一个字符就触发一次。把它接到搜索请求上，输入 "javascript" 会发 10 个请求，前 9 个是浪费还可能竞态（fetch 课会正面处理）。**防抖（debounce）**的思路：每次触发先取消上一次的定时器，等用户「停下来」N 毫秒才真正执行：

```js
function debounce(fn, delay = 300) {
  let timer = null                     // 闭包记住定时器（呼应作用域课）
  return function (...args) {
    clearTimeout(timer)                // 又动了？上次安排作废
    timer = setTimeout(() => fn(...args), delay)
  }
}

inputEl.addEventListener("input", debounce((e) => {
  console.log("停止输入 300ms 才打印：", e.target.value)   // 输入一串只打印一次
}, 300))
```

区分一对兄弟概念：**防抖**要「最后一次」（搜索框、窗口 resize 结束后的重排），**节流**要「按频率保证」（滚动监听每 200ms 最多一次）——都是「高频事件 + 昂贵回调」的标准药方，fetch 课的竞态处理是它们的搭档。

## 常见坑

1. **坑 1：表单里的按钮忘了 type**。`<button>` 在表单内默认 type="submit"——「预览」按钮一点页面就刷新（呼应表单课），非提交按钮显式写 `type="button"`。
2. **坑 2：submit 监听绑在按钮上**。回车提交不点按钮时监听不触发——submit 事件绑在 `<form>` 上才完整覆盖两种提交方式。
3. **坑 3：重复绑定**。render 里每次都 addEventListener 会叠罗汉（点一次触发 N 次）——监听绑一次（初始化时），数据变了只重渲染，不重绑。
4. **坑 4：委托里用 e.target 直接当目标**。点中 span 时 target 是 span 不是 li——`closest("li")` 向上找才是稳妥姿势。
5. **坑 5：input 事件里做重活**。每敲一个字符跑一次昂贵逻辑会卡——用上面的 debounce 包一层，或至少等到 `change`（失焦确认）再处理。

## 小练习

1. 给待办加「双击 li 进入编辑」：dblclick 事件 + prompt 改文本后重渲染（先做出功能，体验优先）。
2. 加「全部清除」按钮，并统计剩余未完成数显示在页尾——每次 render 时一起更新。
3. 小项目：把事件课与 DOM 课合并成「记账本」——输入金额与备注添加记录、点击行删除、实时合计余额（reduce 呼应对象数组课）。做完这个，你就有了不用框架写交互页面的完整基本功。
4. 思考题：委托为什么还能顺带解决「新增元素自动有事件」？监听到底绑在谁身上？
