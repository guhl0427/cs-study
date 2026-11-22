---
id: l-js-dom
slug: js-dom
title: DOM：用 JavaScript 操作页面
difficulty: 1
estMinutes: 80
tags: [JavaScript, DOM]
summary: 浏览器把 HTML 解析成 DOM 树，JS 通过它读写页面——查询、改内容、改样式、增删节点四板斧，是所有前端框架底层的原始动作。
updated: 2026-11-22
resources:
  - id: r-mdn-dom
    title: MDN · DOM 入门
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Document_object_model/Getting_started
    type: doc
    difficulty: 1
    note: DOM 的官方入门，配 DevTools 练最好。
  - id: r-dom-manipulation
    title: MDN · 操作文档
    url: https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Client-side_web_APIs/Manipulating_documents
    type: doc
    difficulty: 1
    note: 本课的官方平行章节，例子更多。
---

> 一句话定义：DOM（Document Object Model）是浏览器把 HTML 解析成的**可编程对象树**——JS 找到树上的节点，就能改它的文字、样式、属性，增删整个元素。

## 概念讲解

**浏览器加载 HTML 时做了一次「翻译」**：每个标签变成树上的一个节点对象。你在 Elements 面板看到的树就是 DOM——改它的任何节点，页面立即跟着变（这就是 JS「能改页面」的机制）：

```text
document（根）
└── <html>
    ├── <head> → <title>、<meta>…
    └── <body>
        ├── <h1>
        ├── <ul id="list">
        │   ├── <li>（多次）
        │   └── …
        └── <script>
```

**查询：找到你要的节点。** 现代只用一对 API——它们直接吃 CSS 选择器（呼应 CSS 课）：

```js
document.querySelector("#list")        // 第一个匹配（拿不到返回 null）
document.querySelector(".card > h3")   // 任意复杂选择器
document.querySelectorAll(".item")     // 所有匹配（NodeList，可 for...of）
```

旧代码里的 `getElementById` / `getElementsByClassName` 等价于它们——看到不用慌，写新代码一律 querySelector。

**读改：四种高频操作**：

```js
const el = document.querySelector("#title")

el.textContent = "新标题"        // ① 文字内容（纯文本，安全）
el.innerHTML = "<b>加粗</b>"     // ② HTML 内容（能解析标签，有注入风险）
el.classList.add("active")       // ③ 类名：add/remove/toggle——改样式首选
el.style.color = "crimson"       // ④ 内联样式（单点微调，批量样式走 class）
```

textContent 与 innerHTML 的选择是**安全问题**：innerHTML 会把字符串当 HTML 解析，若内容来自用户输入，`<img onerror=...>` 就被执行（XSS，呼应安全课）——用户数据一律 textContent。

**创建与删除**：动态内容（列表、卡片）不是写死在 HTML 里，而是由数据生成：

```js
const li = document.createElement("li")     // 造节点（此时还不在页面上）
li.textContent = "新条目"
li.classList.add("item")
document.querySelector("#list").append(li)  // 挂到树上——此刻才显示

li.remove()                                 // 从树上摘掉
```

`createElement → 配置 → append` 的三步节奏，配合上一课的对象数组，就是「数据驱动页面」的最小闭环：

```text
数据数组 → map 生成 HTML 字符串/节点 → 一次 append → 页面同步
```

**属性与数据**：`el.setAttribute("href", url)` 改任意属性；`el.dataset.id` 读 `data-id="42"` 这类自定义数据——把业务 id 挂在 DOM 上，事件课会靠它找到对应数据。

**表单元素的取值与赋值**是交互页面的高频动作——input/textarea/select 都用 `.value`：

```js
const input = document.querySelector("#todo-input")
input.value                  // 读：用户当前输入的文本
input.value = ""             // 写：清空输入框（提交后必做）
input.disabled = true        // 禁用输入（提交中防重复点）
input.focus()                // 把光标放进去（体验细节）
```

`select` 用 `selectEl.value` 直接拿到选中项的 value；`checkbox` 看 `checked` 布尔属性。记住这条对照：**内容看 textContent、表单看 value、开关看 checked**——三种「读取状态」的口子别混。

**节点关系导航**——拿到一个节点后可以按「亲缘关系」移动：

```js
li.parentElement              // 父节点
ul.children                   // 子元素集合（HTMLCollection，可 for...of）
ul.firstElementChild          // 第一个子元素
li.nextElementSibling         // 下一个兄弟
li.closest("ul")              // 向上找最近的匹配祖先（事件课的主力）
```

`closest` 值得单独记住：在事件委托里，你拿到的往往是最深处的点击目标（如 span），`closest("li")` 沿祖先向上找最近的列表项——「从点击点向上找容器」的通用解法。

## 代码示例

主线：把「图书数据」渲染成页面——每个真实列表页的最内核：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>书架</title>
<style>
  .book { padding: 8px; border-bottom: 1px solid #eee; }
  .book .price { color: crimson; }
</style></head>
<body>
  <h1>我的书架</h1>
  <ul id="shelf"></ul>
  <p id="count"></p>
  <script src="shelf.js"></script>
</body>
</html>
```

```js
// shelf.js
const books = [
  { id: 1, title: "深入浅出 CSS", price: 79 },
  { id: 2, title: "图解 HTTP", price: 65 },
]

const shelf = document.querySelector("#shelf")

// 把数据渲染成 DOM（核心三步：清空 → 生成 → 挂载）
function render() {
  shelf.innerHTML = ""                                  // 清空旧内容
  for (const b of books) {
    const li = document.createElement("li")
    li.className = "book"                               // 挂 class 走样式
    li.dataset.id = b.id                                // 业务数据挂在 DOM 上

    const title = document.createElement("span")
    title.textContent = b.title                         // 用户可见数据走 textContent
    const price = document.createElement("span")
    price.className = "price"
    price.textContent = ` ¥${b.price}`

    li.append(title, price)
    shelf.append(li)
  }
  document.querySelector("#count").textContent = `共 ${books.length} 本`
}

render()

// 增删数据后重渲染——「数据变 → 页面跟着变」
books.push({ id: 3, title: "算法图解", price: 89 })
render()
```

浏览器打开后能看到三本书与计数；把 push 注释掉再刷新，列表回到两本——**数据和视图的联动已经由你亲手实现了**（框架课的「响应式」就是把这个重复动作自动化）。

## 进阶一课：批量插入用 DocumentFragment

`append` 每调一次都可能触发一次渲染层面的 recalculating——100 个条目逐个 append 就抖 100 下。`DocumentFragment` 是「看不见的临时容器」：先把节点攒在内存里，最后一次挂载：

```js
function renderFast() {
  shelf.innerHTML = ""
  const frag = document.createDocumentFragment()     // 内存中的暂存区
  for (const b of books) {
    const li = document.createElement("li")
    li.className = "book"
    li.dataset.id = b.id
    li.innerHTML = `<span>${b.title}</span><span class="price"> ¥${b.price}</span>`
    frag.append(li)                                  // 先攒着（页面无变化）
  }
  shelf.append(frag)                                 // 一次性挂载，只抖一下
}
```

另一个高频场景是**生成 HTML 字符串一次赋值**——数据是自己可控的、没有用户输入时最省事：

```js
shelf.innerHTML = books.map(b =>
  `<li class="book" data-id="${b.id}">
     <span>${b.title}</span><span class="price"> ¥${b.price}</span>
   </li>`
).join("")
```

两条路线的选型：**数据可控（自己写的文案/数字）→ 字符串一次性赋值；数据含用户输入 → createElement + textContent**（安全第一，呼应常见坑 3）。框架课的虚拟 DOM diff 做的是同一件事的自动化版本：算出最小变更，避免整块重刷。

## 常见坑

1. **坑 1：script 在 head 里，元素还不存在**。querySelector 返回 null，后面全炸——script 放 body 末尾，或用 `defer` 属性（呼应语言基础课）。
2. **坑 2：拿 null 就继续用**。选择器拼错时 querySelector 返回 null，`null.textContent` 直接 TypeError——报错第一行往往写着「Cannot read properties of null」，去 Elements 面板核对选择器。
3. **坑 3：innerHTML 拼用户输入**。`li.innerHTML = "标题：" + userInput`——用户提交 `<img onerror=...>` 就是 XSS。用户内容一律 textContent 或先转义。
4. **坑 4：innerHTML += 在循环里**。每轮都让浏览器重新解析整段 HTML，慢且丢事件绑定——循环里攒字符串/节点，最后一轮一次性赋值/append。
5. **坑 5：手改 style 一大堆**。`el.style.color/size/…` 十几行——样式逻辑归 CSS（class 切换），JS 只负责「什么时候切换」（呼应 CSS 课的分工）。

## 小练习

1. 给书架加「点击书名变灰色」：渲染时给每个 li 绑定后续（事件课之前先允许你用 `li.onclick = () => ...` 最简形式）。
2. 渲染加「没有书时显示空态」：books 为空时显示 `<p id="empty">书架空空如也</p>`——想想 render() 里该插在哪。
3. 小项目：把渲染函数改成「按价格排序后渲染」——页面上加两个按钮「价格升序/降序」，点击后重新 render。做完你会发现：改数据 + 重渲染 = 一切交互的雏形。
4. 思考题：本课的「每次改动数据后手动调 render()」在数据多了之后会出现什么问题？（Vue/React 课会回答。）
