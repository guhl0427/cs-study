---
id: l-js-basics
slug: js-basics
title: JavaScript 语言基础：变量、类型与控制流
difficulty: 1
estMinutes: 75
tags: [JavaScript, 入门]
summary: JS 是唯一活在浏览器里的编程语言——这一课把变量、类型、控制流的地基打牢，并养成 === 的纪律，后面所有课都站在这上面。
updated: 2026-11-22
resources:
  - id: r-mdn-js
    title: MDN · JavaScript 第一波入门
    url: https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/First_steps
    type: doc
    difficulty: 1
    note: MDN 官方学习路径，与本课平行阅读。
  - id: r-js-console
    title: 浏览器开发者工具 Console
    url: https://developer.mozilla.org/zh-CN/docs/Learn/Common_questions/Tools_and_setup/What_are_browser_devtools
    type: doc
    difficulty: 1
    note: 本课全部示例都在 Console 里练，F12 打开即用。
---

> 一句话定义：JavaScript 是**唯一内置于浏览器**的编程语言——HTML 是骨架、CSS 是外观，JS 负责「响应用户、改页面、发请求」的全部行为。

## 概念讲解

**JS 代码住在哪里？** 三种方式，日常只用后两种：

```html
<!-- 1. 内联（过时，别学坏榜样） -->
<button onclick="alert('hi')">点我</button>

<!-- 2. 页内脚本：小实验可以用 -->
<script>
  console.log("页面加载时执行")
</script>

<!-- 3. 外部文件（标准姿势）：结构与行为分离 -->
<script src="app.js"></script>
```

`console.log()` 是 JS 世界的 print——按 F12 打开 DevTools 的 Console 面板，所有输出都印在那里，学 JS 的前两周你就住在里面。

**变量：三个声明关键字，只用两个。** `let` 声明可变变量，`const` 声明常量（引用不可重新赋值）；`var` 是历史遗留——它无视块级作用域、允许重复声明，是无数诡异 bug 的来源，现代代码里见到它就该改成 let/const：

```js
let score = 92          // 会变的量
score = 95              // OK
const NAME = "小明"      // 不会重新赋值的量
NAME = "小红"            // TypeError: Assignment to constant variable
```

经验法则：**默认写 const，确实需要重新赋值才用 let**——让代码自己声明意图。

**类型系统：七种原始类型 + 对象。** JS 是动态类型（变量不绑定类型，值才有类型），常用的一眼能记住：

| 类型 | 例子 | typeof 结果 |
| ---- | ---- | ---- |
| string | `"小明"` | `"string"` |
| number | `42`、`3.14`、`NaN` | `"number"`（不区分整数小数） |
| boolean | `true` / `false` | `"boolean"` |
| undefined | 声明了没赋值 | `"undefined"` |
| null | 故意的「空」 | `"object"`（历史 bug，记住它） |
| object | `{}`、`[]` | `"object"` |

**类型转换与 `===` 纪律**是 JS 第一坑区。`==` 会先隐式转换再比较，产生一堆反直觉结果；`===` 不转换，类型不同直接 false：

```js
1 == "1"      // true  —— 字符串被悄悄转成了数字！
1 === "1"     // false —— 纪律：永远用 === 和 !==
null == undefined   // true
NaN === NaN         // false —— NaN 连自己都不等于自己，判断用 Number.isNaN()
```

**模板字符串**是拼接文本的现代标准——反引号 + `${}` 嵌变量，多行直接写：

```js
const name = "小明", score = 92
console.log(`${name} 考了 ${score} 分`)     // 小明 考了 92 分
console.log(score >= 60 ? "及格" : "不及格") // 三元表达式：一行 if
```

**控制流**与 Python/C 高度相似，语法是 C 系的大括号风：

```js
if (score >= 90) {
  console.log("A")
} else if (score >= 60) {
  console.log("C")
} else {
  console.log("F")
}

for (let i = 1; i <= 3; i++) {    // 三段式：初值；条件；步进
  console.log(i)
}

for (const ch of "abc") {          // for...of 逐个取值（数组、字符串都行）
  console.log(ch)
}
```

`switch` 适合「同一变量的多路分发」，别忘了每段 `break`；`&&`、`||` 除了逻辑判断还有短路求值的妙用（`name || "匿名"` 给默认值）。

**字符串与数字的随身工具箱**——处理输入和展示时每天都要用：

```js
// 字符串
const s = "  Hello, JS  "
s.trim()                    // "Hello, JS"——去掉首尾空白（表单输入必做）
s.toLowerCase()             // 搜索比较前先统一小写
"2026-11-22".split("-")     // ["2026", "11", "22"]——按分隔符切开
"ab".repeat(3)              // "ababab"
"价格: 42".includes("42")   // true——包含判断

// 数字
parseInt("42px")            // 42——从字符串开头解析整数（"abc" → NaN）
Number("3.14")              // 3.14——严格转换（"abc" → NaN，比 parseInt 严格）
(2.345).toFixed(2)          // "2.35"——注意返回字符串！展示用，别再参与计算
Number.isNaN(NaN)           // true——判断 NaN 的唯一正确姿势
```

`prompt()` 收到的输入永远是字符串——「输入 5 + 2 得 52」这种灵异现象，就是忘了先 `Number()` 转换。数字方法返回字符串（toFixed）、字符串方法返回数组（split）这类「返回类型变化」值得每次都停一秒确认。

## 代码示例

从 Console 小实验到「嵌进网页」的完整主线——一个成绩判定器：

**第 1 步：在 Console 里把逻辑跑通**（F12 → Console，逐行粘贴）：

```js
const scores = [92, 75, 58, 83]

function judge(score) {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 60) return "C"
  return "F"
}

for (const s of scores) {
  console.log(`${s} 分 → ${judge(s)}`)
}
// 92 分 → A
// 75 分 → C
// 58 分 → F
// 83 分 → B
```

**第 2 步：放进真正的网页**。新建 `grade.html` 和 `app.js`（同目录）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>成绩判定器</title>
</head>
<body>
  <h1>成绩判定器</h1>
  <ul id="result"></ul>
  <script src="app.js"></script>
</body>
</html>
```

```js
// app.js
const scores = [92, 75, 58, 83]

function judge(score) {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 60) return "C"
  return "F"
}

const list = document.querySelector("#result")   // 先记住这行，DOM 课细讲
for (const s of scores) {
  list.innerHTML += `<li>${s} 分 → ${judge(s)}</li>`
}
```

浏览器打开 `grade.html`：四行判定结果出现在页面上——**这就是 JS 的意义**：逻辑跑在用户的浏览器里，实时改变他们看到的页面。

## 常见坑

1. **坑 1：用 `==` 比较**。`0 == ""`、`null == undefined` 都是真的——隐式转换规则背不完，唯一解法是永远 `===`。ESLint 的 eqeqeq 规则就是干这个的（呼应工程化课）。
2. **坑 2：const 的「不可变」只防重新赋值**。`const arr = []; arr.push(1)` 完全合法——const 锁的是「变量名到值的绑定」，对象内部照样能改。要真冻结用 `Object.freeze`。
3. **坑 3：number 精度**。`0.1 + 0.2 === 0.3` 是 false（IEEE 754 浮点，呼应组成原理课）；金额计算要么用整数分，要么上专门的库。
4. **坑 4：忘了 script 放的位置**。`<script src>` 放在 `<head>` 里时，元素还没渲染就执行，`querySelector("#result")` 拿到 null——放 `</body>` 前，或学 `defer` 属性。
5. **坑 5：`for...in` 遍历数组**。它遍历的是键（会给出 "0","1" 字符串还可能带上原型属性）——数组用 `for...of` 或 `forEach`，对象才轮到 `for...in`。

## 小练习

1. 在 Console 里把本课的判定器改造成「输入一个分数弹判定」：用 `prompt()` 接收输入（它返回字符串，记得转数字），故意输入 "abc" 观察 NaN 出现的位置。
2. 写一个 9×9 乘法表：双层 for 循环 + 模板字符串，输出到 Console；再用 `\n` 与 `padEnd` 把它对齐成表格。
3. 小项目：把成绩判定器升级成「平均分 + 最高分 + 班级等级」，全部逻辑写在 app.js，页面只留一个 `<div id="report">`——体会「逻辑全在 JS、HTML 只是容器」。
4. 思考题：`const` 声明的数组还能 push，这和 Python 入门课讲的「b = a 是引用」有什么共同的底层原因？
