---
id: l-js-scope
slug: js-scope
title: 函数、作用域与闭包
difficulty: 2
estMinutes: 70
tags: [JavaScript, 函数]
summary: 函数是 JS 的一等公民——作用域决定「变量在哪可见」，闭包让函数「记住」出生地——理解这两件事，异步课的回调和组件课的状态才不玄学。
updated: 2026-11-22
resources:
  - id: r-mdn-scope
    title: MDN · 闭包
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures
    type: doc
    difficulty: 2
    note: 闭包的权威讲解，本课学完再读一遍收获翻倍。
  - id: r-js-visualizer
    title: JavaScript Tutor（可视化执行）
    url: https://pythontutor.com/javascript.html
    type: tool
    difficulty: 1
    note: 逐行可视化作用域与调用栈，看懂闭包的利器。
---

> 一句话定义：函数是**可以反复执行的代码包**；作用域是变量的「可见范围」（内层能看外层、外层看不见内层）；闭包是函数把出生地的变量**随身带走**的能力。

## 概念讲解

**函数的三种写法**，语义有差别：

```js
function add(a, b) { return a + b }        // ① 函数声明：可提升，先调用后定义不报错
const sub = function (a, b) { return a - b }  // ② 函数表达式：像赋值一个变量
const mul = (a, b) => a * b                // ③ 箭头函数：现代默认写法
```

箭头函数还有一个「隐式返回」的短形态——本课程里到处都是：`x => x * 2` 等价于 `x => { return x * 2 }`。注意大括号的存在会**吞掉隐式返回**（对象数组课的坑 2 就是它）。参数的现代写法一并记了：默认值 `function f(x = 0)`、剩余参数 `function sum(...nums)`。

**作用域：变量能被谁看见。** JS 有三层，查找变量时由内向外（作用域链）：

```js
const global = "全局"

function outer() {
  const outerVar = "外层"
  function inner() {
    const innerVar = "内层"
    console.log(global, outerVar, innerVar)   // 三层都能访问——由内向外查找
  }
  inner()
  console.log(innerVar)                       // ReferenceError——外层看不见内层
}
```

块级作用域（`{}` 内的 let/const）是 let 时代的重要改进；`var` 声明的变量会「提升」到函数顶部且无视块——这就是「永远别用 var」的原理级理由：

```js
console.log(x)   // undefined —— var 提升了（声明被搬到顶上，赋值没有）
var x = 5

console.log(y)   // ReferenceError —— let 不提升，老老实实报错
let y = 5
```

**闭包：函数记住出生地。** 内层函数被「带出去」后，依然能访问出生时的外层变量——这个组合就叫闭包。最小例子：

```js
function makeCounter() {
  let count = 0                    // 私有变量：外面摸不到
  return function () {
    count += 1                     // 闭包：内层函数记住外层的 count
    return count
  }
}

const c1 = makeCounter()
c1()  // 1
c1()  // 2 —— count 没有被重置，它活在闭包里
const c2 = makeCounter()
c2()  // 1 —— 另一次调用产生独立的闭包，互不影响
```

两个直接来自它的真实用法：**私有状态**（上面的 count 外部无法直接篡改）和**预设参数**（`const logError = makeLogger("ERROR")`——把前缀记进闭包）。反面教材也来自它：不小心把大对象关进闭包且长期持有，就是内存泄漏的一种来源。

**模块化的动机**在此浮现：把相关函数 + 闭包状态写进一个文件，用 `export` 露出接口、`import` 使用——工程化课的 Vite 项目里全是这种文件。

## 代码示例

主线：用闭包写一个「购物车函数库」——对外只暴露四个方法，内部状态外人改不了：

```js
// cart.js —— 一个最小模块（后续可拆成独立文件）
export function createCart() {
  let items = []                              // 闭包私有状态

  return {
    add(name, price) {
      items = [...items, { name, price }]     // 不可变更新（呼应对象数组课）
    },
    remove(name) {
      items = items.filter(it => it.name !== name)
    },
    total() {
      return items.reduce((s, it) => s + it.price, 0)
    },
    list() {
      return [...items]                       // 返回拷贝，防止外部改动内部状态
    },
  }
}
```

```html
<!-- demo.html -->
<script type="module">
  import { createCart } from "./cart.js"

  const cart = createCart()
  cart.add("键盘", 199)
  cart.add("鼠标垫", 39)
  cart.remove("键盘")
  console.log(cart.total())                   // 39
  console.log(cart.list())                    // [{name: "鼠标垫", price: 39}]
</script>
```

注意 `<script type="module">`：模块模式允许 import/export，且自动严格模式——现代工程的标准起点（工程化课的 Vite 项目全是它）。

再体会一次「每次调用独立闭包」——两辆购物车互不干扰：

```js
const cartA = createCart(), cartB = createCart()
cartA.add("A 车商品", 10)
console.log(cartB.total())                    // 0
```

## 闭包的两个高光用法与一个代价

**用法一：预设参数（偏函数）。** 把「公共参数」关进闭包，产出专用函数——事件课的委托、请求层的封装都靠它：

```js
function makeRequester(baseURL) {
  return function (path, options) {           // baseURL 被闭包记住
    return fetch(baseURL + path, options)
  }
}
const api = makeRequester("https://api.example.com")
api("/todos")                                  // 实际请求 https://api.example.com/todos
```

**用法二：一次性初始化。** 昂贵的结果算一次、后续调用直接用缓存——「记忆化」的最小雏形（呼应 DSA 课的 lru_cache）：

```js
function createLazyConfig() {
  let cache = null                             // 算过一次就记住
  return function getConfig() {
    if (!cache) {
      console.log("计算一次…")                 // 只会出现一次
      cache = { theme: "blueprint", lang: "zh-CN" }
    }
    return cache
  }
}
```

**代价：闭包会让变量「活得比函数久」。** 普通局部变量在函数返回后就被回收；被闭包引用的变量要等闭包本身不再被使用。所以别把巨大的数据随手关进闭包——用完置 `cache = null` 释放，是长生命周期页面的基本卫生。

## 常见坑

1. **坑 1：循环里 var + 回调**。`for (var i=0; i<3; i++) setTimeout(() => console.log(i))` 打出 3 3 3——var 无块级作用域，三次回调共享同一个 i；改 let 每轮生成独立绑定，打出 0 1 2。这是闭包最经典的面试题。
2. **坑 2：箭头函数没有自己的 this**。本课不深入 this，但记住结论：写组件与普通函数用箭头准没错；只有在对象方法里需要「指向调用者」时才用普通函数（框架课会再遇到）。
3. **坑 3：把「闭包能记住变量」当成魔法**。闭包持有的是**变量本身**（的引用）不是当时的值快照——`count += 1` 才有累积效果；想要快照要自己复制一份。
4. **坑 4：export 忘写或 import 路径错**。模块报 `does not provide an export named 'X'`——先核对 export 名与 import 的大括号拼写；相对路径 `./cart.js` 的 `.js` 后缀在浏览器原生模块里不能省。

## 小练习

1. 写 `makeLogger(prefix)`：返回一个函数，调用时打印 `[ERROR] 消息` 格式（prefix 被闭包记住）；分别造出 ERROR 和 INFO 两个 logger。
2. 给购物车加 `count()`（商品种数）与 `contains(name)`，并在 Console 里验证两个购物车互不影响。
3. 小项目：把购物车函数库改成「限额购物车」——超过 500 元时 `add` 返回 false 且不添加；体会「规则收敛在闭包内部，调用方无法绕过」。
4. 思考题：闭包和「全局变量」都能让函数共享状态，闭包好在哪？从「谁能改它」的角度想。
