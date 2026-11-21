---
id: l-js-syntax-dom
slug: syntax-dom
title: 语法、变量与 DOM
difficulty: 1
estMinutes: 50
tags: [JavaScript, DOM]
summary: 用 const/let 声明数据，用函数组织行为，再用 DOM API 让页面响应点击——这三件事构成 JS 的主干。
updated: 2026-11-21
resources:
  - id: r-js-mdn
    title: MDN · JavaScript 第一印象
    url: https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/First_steps
    type: doc
    difficulty: 1
    note: 系统过语法基础，比碎片化教程完整。
  - id: r-js-console
    title: 浏览器控制台速成
    url: https://developer.mozilla.org/zh-CN/docs/Learn/Common_questions/Tools_and_setup/What_are_browser_devtools
    type: doc
    difficulty: 1
    note: 学 JS 的前提是会用控制台：F12 → Console，本节所有示例都能贴进去跑。
---

> 一句话定义：JavaScript 是网页的「行为层」——数据放在变量里，逻辑写在函数里，再通过 DOM API 把行为接到页面上。

## 概念讲解

**声明变量**，现代 JS 只用两个关键字：

- `const`：声明后就不再指向别处的（默认用它）；
- `let`：确实需要重新赋值的（比如循环计数）。

`var` 是历史遗产，作用域规则反直觉，新代码禁止使用。

**函数**是一段可复用的行为，箭头函数是现在的主流写法：

```js
const add = (a, b) => a + b;
```

**DOM**（Document Object Model）：浏览器把 HTML 解析成一棵树，JS 通过这棵树读页面、改页面。最常用的四个 API 记牢就够用：

| API | 作用 |
| ---- | ---- |
| `document.querySelector('.cls')` | 按选择器找第一个元素 |
| `el.textContent = 'x'` | 读/写文字内容 |
| `el.addEventListener('click', fn)` | 绑定事件 |
| `document.createElement('div')` | 创建新元素 |

心智模型：**页面状态变了 → 你手动改 DOM**。这是原生 JS 的写法；框架（Vue/React）做的事，就是把这个「手动同步」自动化——这正是后面框架概览课的伏笔。

## 代码示例

一个「点击计数器」，把变量、函数、事件串起来：

```html
<button id="btn">点我 +1</button>
<p>当前次数：<span id="count">0</span></p>
```

```js
const btn = document.querySelector('#btn');
const counterEl = document.querySelector('#count');

let count = 0; // 会重新赋值，所以用 let

const render = () => {
  counterEl.textContent = count;
};

btn.addEventListener('click', () => {
  count += 1;   // 改数据
  render();     // 手动同步到页面
});

render();
```

保存为 HTML 打开（script 放在 `</body>` 前），每点一次按钮数字 +1。注意代码里数据和视图是两个东西，`render` 负责把它们对齐。

## 常见坑

1. **坑 1：script 放在 `<head>` 里就查不到元素**。执行时 DOM 还没生成，`querySelector` 返回 `null`，后面全报错。排查：script 放 body 末尾，或用 `defer` 属性。
2. **坑 2：`const` 重新赋值报错却以为是常量**。`const` 冻结的是「指向」，对象内部还是可以改（`const arr = []; arr.push(1)` 合法）。需要彻底不可变时用 `Object.freeze`。
3. **坑 3：`==` 与 `===` 混用**。`==` 会做类型转换（`'1' == 1` 为 true），坑极多。永远用 `===`，代码规范工具（ESLint）也会强制。

## 小练习

1. 改造计数器：加一个「清零」按钮，点击后 count 归 0 并渲染。
2. 给页面加一个 `<input>`，输入内容实时（`input` 事件）同步显示在 `<p>` 里。
3. 用 `document.createElement` + `appendChild` 动态往列表 `<ul>` 里插入 5 个 `<li>`（用循环）。
