---
id: l-ts-basics
slug: ts-basics
title: TypeScript 入门：给 JS 加上类型
difficulty: 2
estMinutes: 80
tags: [TypeScript, 前端]
summary: TS 是 JS 的超集：类型只活在编译期，编译成 JS 后全部消失。主线把三件套课的 todo 数据层从 JS 重写为 TS，逐个体验编译期抓错，并训练「逐段读懂一条真实报错」。
updated: 2026-11-22
resources:
  - id: r-ts-doc
    title: TypeScript 官方手册 · TS for JS Programmers
    url: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html
    type: doc
    difficulty: 1
    note: 写给 JS 开发者的官方入门，超集关系与本文口径一致。
  - id: r-ts-everyday
    title: TypeScript 官方手册 · Everyday Types
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
    type: doc
    difficulty: 2
    note: 基础类型、对象类型、联合类型的权威细节，当字典查。
  - id: r-ts-playground
    title: TypeScript Playground
    url: https://www.typescriptlang.org/play
    type: tool
    difficulty: 1
    note: 网页里写 TS 看报错，本文每个报错都能在这里复现。
---

> 一句话定义：TypeScript = JavaScript + **静态类型**——写代码时多花 10% 精力标注类型，换来编译期报错、编辑器补全和大重构的信心；类型只存在于编译期，编译成 JS 后全部消失。

## 概念讲解

### 超集关系：TS 不是新语言，是 JS + 一层「校对」

先澄清最大的误解：**TS 不是一门新语言**。它是 JS 的**超集**——所有合法 JS 都是合法 TS，TS 只额外加了两样东西：**类型标注的语法**和**编译期检查**。你三件套课学的 JS 知识 100% 有效，学习成本只落在新加的这一层上。

```text
┌──────────────────────────────────────────┐
│  TypeScript                              │
│  ┌────────────────────────────────────┐  │
│  │  JavaScript（你已会的全部语法）      │  │
│  └────────────────────────────────────┘  │
│  ＋ 类型标注（interface、: string …）      │
│  ＋ 编译期检查（tsc / 编辑器红线）          │
└──────────────────────────────────────────┘
          ↓ tsc 编译：类型层整个剥掉
┌──────────────────────────────────────────┐
│  JavaScript（浏览器实际运行的）             │
└──────────────────────────────────────────┘
```

类比：JS 是手写稿，TS 是「手写稿 + 一位校对员」。校对员（编译器）在你的稿子付印（交给浏览器）之前把错挑出来；付印后的成品是纯 JS，上面没有校对员的笔迹——**类型标注与检查不会带到运行时**。

### 编译期 vs 运行时：本课最重要的一张分界表

这张表值得抄在笔记本第一页，本课程后面所有 TS 内容都建立在它上面：

| 问题 | 归谁管 | 典型例子 |
| ---- | ---- | ---- |
| 拼错属性名 `user.totle` | **编译期** ✅ | Property 'totle' does not exist. Did you mean 'title'? |
| 函数少传/多传参数 | **编译期** ✅ | Expected 2 arguments, but got 1. |
| `string` 当 `number` 用 | **编译期** ✅ | Type 'string' is not assignable to type 'number'. |
| 不在允许清单里的取值 | **编译期** ✅ | Argument of type '"higher"' is not assignable… |
| 接口返回的数据结构对不对 | **运行时** ❌ | 编译器看不到网络那头，JSON 校验要另外做 |
| 数组越界、null 取属性 | **运行时** ❌ | Cannot read properties of undefined 照样炸 |
| 业务逻辑对不对 | **运行时** ❌ | 类型与逻辑正误无关，那是测试的事 |

一句话记住：**类型系统是「编译期的守门员」，不是「运行时的保镖」**。它守的是「代码写得合不合声明的形状」，守不了「网络来的数据真的长什么样」和「逻辑对不对」。

### 类型标注的两个位置

TS 的标注语法只有两个入口，记住位置就掌握了日常 80% 的写法：

```ts
let count: number = 0                    // ① 变量：冒号写在名字后面
function greet(name: string): string {   // ② 函数：参数与返回值各一个冒号
  return `你好，${name}`
}
```

两个实用细节：其一，类型能**自动推导**——`let count = 0` 不写标注，TS 也知道它是 number，所以实践中只在「函数签名、空数组、先声明后赋值」这些推导不出的地方写；其二，标注不必 everywhere，**边界处强制**（函数的入参与出参）、内部交给推导，这是官方推荐姿势。

### 常用类型速查表

| 类别 | 写法 | 对应 JS 值 | 例子 |
| ---- | ---- | ---- | ---- |
| 基础类型 | `string` / `number` / `boolean` | 字符串 / 数字 / 布尔 | `"abc"`、`42`、`true` |
| 数组 | `string[]` | 数组 | `["a", "b"]` |
| 对象 | `{ id: number; title: string }` | 对象 | `{ id: 1, title: "x" }` |
| 可选属性 | `done?: boolean` | 键可能不存在 | `{ id: 1, title: "x" }` |
| 联合类型 | `string \| null` | 多种可能之一 | 查询结果可能为空 |
| 字面量联合 | `"low" \| "mid" \| "high"` | 限定取值清单 | 优先级只有三档 |
| 函数类型 | `(a: number) => string` | 函数 | `(n) => String(n)` |

### 联合类型与字面量联合：把非法值挡在门外

JS 里 `role` 是 string，什么都能塞；TS 里可以把它**收窄到有限取值**：

```ts
type Role = "student" | "admin"      // role 只能是这两个字符串
function setRole(role: Role) {}
setRole("student")                   // ✅ 通过
setRole("superadmin")                // ❌ 编译期报错，根本活不到运行时
```

联合类型的另一半价值是**收窄（narrowing）**：用 `if`/`switch` 判断过之后，编译器会在分支内自动缩小类型范围——`if (typeof x === "string")` 里 x 就是 string，else 分支里它就不再是。这是 TS 代码「写着像 JS、读起来有保险」的关键机制：**类型跟着控制流走**。

### interface vs type：一句话分工

两者都能给对象形状起名字，新手期几乎等价：`interface Todo {...}` 与 `type Todo = {...}` 大部分场景可互换。**团队选一个统一用**（本课程默认 interface），需要联合类型、映射类型等高级玩法时再用 type——不必纠结，纠结的成本比两者差异本身高。

### 渐进迁移：TS 的工程现实

TS 最大的工程优势是**允许 `.js` 与 `.ts` 混存在同一个项目里**：老项目可以一个文件一个文件地迁，先给公共函数加注解，再逐步收紧 tsconfig。不必「一次性重写」——这与软件工程课「小步重构、每步可验证」的原则完全一致。

## 代码示例

主线任务：把三件套课写过的 **todo 数据层**（`Todo` 对象数组 + 增删改查函数）从 JS 重写为 TS。重写过程会**故意保留 JS 版的几处 bug**，让编译器逐个抓给你看——「编译期抓错」不是口号，是能亲手复现的体验。建议开着 TypeScript Playground 跟做，约 30 分钟。

### 第 0 步：JS 版数据层，先看它藏了什么雷

```js
// todo.js —— 三件套课的原始版本（纯 JS）
function createTodo(title, priority) {
  return { id: Date.now(), title, priority, done: false }
}

function toggleTodo(todo) {
  todo.done = !todo.dno                 // ① 拼错属性：!undefined 得 true，碰巧"能跑"
  return todo
}

function filterTodos(todos, priority) {
  return todos.filter(t => t.prority === priority)   // ② 又一处拼错
}

const list = []
list.push(createTodo("买牛奶", "high"))
console.log(filterTodos(list, "high"))
```

运行一下：① 处 `todo.dno` 是 `undefined`，取反后得 `true`，碰巧看起来正常；② 处 filter 永远返回空数组，页面无声无息地错。**两个 bug 都要等到运行甚至用户反馈才暴露**——这就是三件套课结尾说「该上 TS 了」的原因。

### 第 1 步：定义 Todo 接口——给数据形状立规矩

```ts
interface Todo {
  id: number
  title: string
  priority: "low" | "mid" | "high"   // 字面量联合：优先级只有三档
  done: boolean
}
```

写完这 6 行，`Todo` 成了项目里的「合法数据凭证」：任何值想冒充 Todo，编译器都会逐字段核对。

### 第 2 步：给函数写签名

```ts
function createTodo(title: string, priority: Todo["priority"]): Todo {
  return { id: Date.now(), title, priority, done: false }
}

function toggleTodo(todo: Todo): Todo {
  return { ...todo, done: !todo.done }    // 顺带改成纯函数：不改原对象
}

function filterTodos(todos: Todo[], priority: Todo["priority"]): Todo[] {
  return todos.filter(t => t.priority === priority)
}
```

两个细节：`Todo["priority"]` 表示「取 Todo 里 priority 字段的类型」，复用联合而不必抄第二遍；`toggleTodo` 改成返回新对象、不改入参——类型改对了，顺手把设计也改对了，这是类型系统反哺设计的常见现象。

### 第 3 步：逐个体验编译期抓错

现在故意写下三个错误调用，看编译器反应（每条都是真实报错原文）：

```ts
const t1 = createTodo("买牛奶", "higher")
// ❌ Argument of type '"higher"' is not assignable to
//    parameter of type '"low" | "mid" | "high"'
```

**逐段解读这条报错**：`Argument of type '"higher"'`——出问题的是哪个实参、值是什么；`is not assignable to`——不能赋给；`parameter of type '"low" | "mid" | "high"'`——形参声明的类型。三段连读就是**「你给的值不在允许清单里」**。读报错的通用套路永远是三问：哪个位置（文件:行:列 + 哪个实参）？给的什么？要的什么？90% 的报错答完三问就解了。

```ts
const t2: Todo = { id: 1, title: "写作业" }
// ❌ Property 'priority' is missing in type
//    '{ id: number; title: string; }' but required in type 'Todo'
```

解读：`Property 'priority' is missing`——缺了哪个字段；`but required in type 'Todo'`——在哪个接口里是必填。少字段、多字段、类型不匹配是对象字面量的三大报错，句式固定，见多两次就熟。

```ts
console.log(t2.dno)
// ❌ Property 'dno' does not exist on type 'Todo'.
//    Did you mean to access 'done'?
```

解读：第一句说「Todo 上没有这个属性」，第二句 `Did you mean` 是编译器在猜你想写什么——TS 报错的提示性是它最好用的特性之一，**照着提示改就行**。对比第 0 步：同样的拼错，JS 版运行时都发现不了，TS 版敲下句点的同时就红。

### 第 4 步：收窄——让漏掉的情况自己浮出来

```ts
function label(priority: Todo["priority"]): string {
  switch (priority) {
    case "low":  return "低优先级"
    case "mid":  return "中优先级"
    case "high": return "高优先级"
  }
}
```

如果漏写一个 case，开启严格空值检查后返回类型会从 `string` 变成 `string | undefined`——联合类型在逼你把每种情况都处理完。收窄的日常价值就在这：**你漏想的情况，类型替你记得**。

### 第 5 步：编译产物——亲眼确认类型消失了

```bash
npx tsc todo.ts --target es2020
```

打开生成的 `todo.js`：`interface Todo` 不见了，`title: string` 变成了 `title`，所有报错所在的代码在产物里毫无痕迹——运行时就是普通 JS。现在回头再看「编译期 vs 运行时」那张表，你已经有体感了。

## 常见坑

1. **坑 1：用 `any` 兜底让报错闭嘴**。现象：满屏红线嫌烦，全标成 any。原因：any 是「显式关掉检查」，报错不是消失了，是被你扣下，运行时照炸。排查：全局搜 `: any`，逐个换成具体类型或 `unknown` + 收窄。
2. **坑 2：以为 interface 能校验接口返回的 JSON**。现象：`resp.json() as Todo[]` 之后放心用，线上却炸 `t.priority.toUpperCase`。原因：as 只是给编译器的「口供」，运行时数据没变（下一课展开）。排查：跨边界数据要么后端保证，要么前端校验库（zod）。
3. **坑 3：第三方库全是 any**。现象：import lodash 没有补全也没有检查。原因：类型包没装——库本体和 `@types/lodash` 是两个包。排查：看到 "Could not find a declaration file" 提示就装对应 `@types/*`。
4. **坑 4：非空断言 `!` 当补丁**。现象：`todo!.title` 红线消失就完事。原因：`!` 的含义是「我担保它不是 null/undefined」，担保错了运行时照炸。排查：搜 `!.`，每个都问「我真的能担保吗」，不能就改成 if 收窄。
5. **坑 5：类型体操炫技**。现象：入门期硬写条件类型、infer。原因：类型是给人读的说明书，不是谜语；能被基础类型 + interface 表达的就不要上高级类型。排查： review 时问一句「三个月后的自己读得懂吗」。
6. **坑 6：可选属性 `?` 与 undefined 不处理**。现象：`done?: boolean` 后直接把 `todo.done` 当确定存在的布尔用。原因：可选意味着类型是 `boolean | undefined`。排查：strict 模式下会报 "Object is possibly 'undefined'"，照着把 undefined 分支处理掉。

## 小练习

1. 在 Playground 里定义 `interface Todo`（沿用第 1 步），写 `toggle(todo: Todo): Todo` 返回 done 取反的新对象；再把 `done` 改成可选 `done?: boolean`，观察 `!todo.done` 是否报错并解释原因。
2. 给 `priority` 的字面量联合增加一档 `"urgent"`，体验一次「改类型、全体调用点排队报错」——抄下每条报错的位置和句式。
3. 把这条报错逐段翻译成中文并写出修复方案：`Type '"42"' is not assignable to type 'number'.`（提示：注意引号里是字符串 "42"）。
4. **综合任务**：补全数据层——实现 `removeTodo(todos: Todo[], id: number): Todo[]`（返回删除后的新数组）和 `stats(todos: Todo[]): { total: number; done: number }`；然后故意制造 3 个编译错误（拼错字段、传错类型、漏必填字段），按「位置/给的/要的」三问格式逐条解读报错原文。
