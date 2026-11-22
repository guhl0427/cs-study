---
id: l-js-objects-arrays
slug: js-objects-arrays
title: 对象与数组：组织数据的双手
difficulty: 1
estMinutes: 70
tags: [JavaScript, 数据结构]
summary: 对象管「一个东西的多个属性」，数组管「一排同类东西」——map/filter/reduce 三板斧是 JS 数据处理的通用语，后面每一课都在用。
updated: 2026-11-22
resources:
  - id: r-mdn-array
    title: MDN · Array 全部方法
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array
    type: doc
    difficulty: 1
    note: 方法字典，忘了来这里查。
  - id: r-array-explorer
    title: Array Explorer（可视化选方法）
    url: https://arrayexplorer.netlify.app/
    type: tool
    difficulty: 1
    note: 回答「我想对数组做什么」帮你选方法的小工具。
---

> 一句话定义：对象（`{}`）把**一个东西的多项属性**打包，数组（`[]`）把**一排同类东西**排队——真实数据永远是「对象数组」`[{...}, {...}]`，学会操作它就学会了 JS 的数据层。

## 概念讲解

**对象：属性的名值对**。三种读法里最常用前两种：

```js
const book = {
  title: "深入浅出 CSS",        // 属性名: 值（名可不加引号）
  price: 79,
  tags: ["前端", "CSS"],
  author: { name: "李工", city: "杭州" },   // 嵌套对象
}

book.title                 // 点号：最常用
book["price"]              // 方括号：属性名存在变量里时用
book.author.name           // 链式深入嵌套
book.pages                 // undefined —— 不存在的属性不报错，返回 undefined
book.pages ?? 0            // ?? 空值合并：undefined/null 时用默认值
```

增删改都是赋值与 `delete`；`Object.keys(obj)` / `Object.values(obj)` / `Object.entries(obj)` 把对象转成可遍历的数组——「对象不方便遍历？先转成数组」是常用思路。

**数组：有序列表 + 一大批现成方法**。索引从 0 开始，`length` 是属性不是方法：

```js
const nums = [3, 1, 4, 1, 5]
nums[0]          // 3
nums.length      // 5
nums.push(9)     // 尾部加（改原数组）
nums.pop()       // 尾部删
nums.indexOf(4)  // 2；找不到返回 -1
```

**map / filter / reduce 是数据处理的三板斧**，它们的共同点是「不改变原数组、返回新数组/值」——这是函数式的心智：数据像流水线一样过一道道工序：

```text
原始数组 ──filter──► 留下合格的 ──map──► 变换形状 ──reduce──► 汇总成一个值
```

| 方法 | 干什么 | 返回 |
| ---- | ---- | ---- |
| `filter(fn)` | 按条件筛 | 新数组（子集） |
| `map(fn)` | 逐个变换 | 新数组（同长度） |
| `find(fn)` | 找第一个满足的 | 元素或 undefined |
| `some(fn)` / `every(fn)` | 有一个满足吗 / 全部满足吗 | boolean |
| `sort(fn)` | 排序（**改原数组**，比较函数必写） | 排好的原数组 |
| `reduce(fn, 初值)` | 聚合成一个值 | 累计结果 |
| `includes(x)` | 包含吗 | boolean |

`sort` 的比较函数 `(a, b) => a - b` 升序、`b - a` 降序——不写它时 sort 按字符串排序，`[10, 2, 1].sort()` 会得到 `[1, 10, 2]`。

**解构与展开**是现代 JS 的语法糖，读别人代码一定会遇到：

```js
const { title, price } = book            // 解构对象：按名取
const [first, second] = nums             // 解构数组：按位取
const newer = [...nums, 6]               // 展开数组：不可变更新（呼应 React 课）
const { tags, ...rest } = book           // rest 收集剩余属性
```

**JSON 是对象字面量的字符串形态**——前后端传数据的通用语：`JSON.stringify(obj)` 打包发出、`JSON.parse(text)` 解包回来（呼应 fetch 课）。

## 代码示例

主线：一个「图书清单」的数据层——真实项目里任何列表页的内核都是它：

```js
const books = [
  { id: 1, title: "深入浅出 CSS", price: 79, category: "前端" },
  { id: 2, title: "JS 权威指南", price: 129, category: "前端" },
  { id: 3, title: "图解 HTTP", price: 65, category: "网络" },
  { id: 4, title: "算法图解", price: 89, category: "算法" },
]

// ① 筛选：价格 80 以下的前端书
const cheap = books.filter(b => b.category === "前端" && b.price < 80)
console.log(cheap.map(b => b.title))            // ['深入浅出 CSS']

// ② 变换：只留标题与价格（页面渲染前的「裁剪」）
const brief = books.map(b => `${b.title}（¥${b.price}）`)
console.log(brief)

// ③ 汇总：总价
const total = books.reduce((sum, b) => sum + b.price, 0)
console.log(total)                              // 362

// ④ 查找与判断
console.log(books.find(b => b.id === 3)?.title)  // 图解 HTTP（?. 防不存在）
console.log(books.some(b => b.price > 100))      // true

// ⑤ 排序（不可变姿势：先拷贝再排）
const byPrice = [...books].sort((a, b) => a.price - b.price)
console.log(byPrice[0].title)                    // 图解 HTTP

// ⑥ 增删改（不可变姿势：呼应 React 课）
const withNew = [...books, { id: 5, title: "新书", price: 0, category: "其他" }]
const withoutId3 = books.filter(b => b.id !== 3)
const updated = books.map(b => b.id === 2 ? { ...b, price: 99 } : b)
```

把 ⑥ 里三个操作封装成函数，你就有了任何「待办/购物车/列表」应用的数据层雏形——DOM 课会把它渲染到页面。

## 链式调用：把三板斧串成流水线

三个方法都返回数组，所以可以**直接接着调下一个**——真实项目里最常见的形态就是一条链解决「筛选+变换+排序」：

```js
const result = books
  .filter(b => b.category === "前端")          // 只留前端书
  .sort((a, b) => b.price - a.price)           // 按价格降序（改的是 filter 产出的新数组，原数据无恙）
  .slice(0, 2)                                 // 取前两本
  .map(b => `${b.title} ¥${b.price}`)          // 变成展示文本
console.log(result)                             // ['JS 权威指南 ¥129', '深入浅出 CSS ¥79']
```

读链的技巧：**从上往下念成一句话**——「筛出前端的、按价格倒排、取两本、变成文案」。写链的纪律：每一步都该有明确的输入输出类型，链太长（超过 4-5 节）就拆成有名字的中间变量，可读性优先。

分组（reduce 的进阶形态）值得单独记一次——统计类需求的通用骨架：

```js
const byCategory = books.reduce((acc, b) => {
  ;(acc[b.category] ??= []).push(b)            // 没有这个分类就先建空数组
  return acc
}, {})
console.log(Object.keys(byCategory))            // ['前端', '网络', '算法']
```

## 常见坑

1. **坑 1：sort 默认按字符串排**。数字排序必须给比较函数：`sort((a,b) => a-b)`；想不改原数组先 `[...arr]` 拷贝。
2. **坑 2：map/filter 里写错返回**。箭头函数 `b => { b.price }` 返回 undefined（大括号吞掉了返回值）——要么去掉大括号，要么显式 `return`。
3. **坑 3：浅拷贝的陷阱**。`[...books]` 只拷贝一层，里面的对象仍是同一个引用——改 `copy[0].title` 原数组也变；深场景用 `structuredClone` 或逐层展开。
4. **坑 4：undefined 属性直接调方法**。`book.author.city` 在 author 缺失时直接 TypeError——链式取值用可选链 `book.author?.city`，兜底用 `??`。
5. **坑 5：把 JSON 字符串当对象用**。接口拿到的若没 `.json()` 解析就是字符串——`typeof` 一下先确认类型（呼应 fetch 课）。

## 小练习

1. 给图书清单加「按分类分组」：用 reduce 产出 `{ 前端: [...], 网络: [...] }` 形态的对象。
2. 实现一个 `search(books, keyword)`：标题包含关键字（不分大小写）的都返回——用到 filter + toLowerCase + includes。
3. 小项目：写 `cart` 数组的四个纯函数（addItem/removeItem/updatePrice/calcTotal），全部用不可变姿势，写死几组调用验证输入输出——这就是 fetch 课「提交表单」前端的完整数据逻辑。
4. 思考题：为什么「map/filter/reduce 不改原数组」的设计让代码更可预测？和 React「setArr 要给新数组」的纪律是什么关系？
