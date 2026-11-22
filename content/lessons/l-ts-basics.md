---
id: l-ts-basics
slug: ts-basics
title: TypeScript 入门：给 JS 加上类型
difficulty: 2
estMinutes: 40
tags: [TypeScript, 前端]
summary: TS 是「带类型检查的 JS」——类型是写给人看、给编译器查的说明书，编辑器补全与重构信心都从它来。
updated: 2026-11-22
resources:
  - id: r-ts-doc
    title: TypeScript 官方手册（TS for the New Programmer）
    url: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html
    type: doc
    difficulty: 1
    note: 官方 5 分钟入门，后续 Handbook 按需查。
  - id: r-ts-playground
    title: TypeScript Playground
    url: https://www.typescriptlang.org/play
    type: tool
    difficulty: 1
    note: 网页里写 TS 看报错，不用装任何东西。
---

> 一句话定义：TypeScript = JavaScript + **静态类型**——写的时候多花 10% 标注类型，换来编译期报错、编辑器补全和大重构的信心。

## 概念讲解

先澄清最大的误解：**TS 不是新语言**。它是 JS 的超集——所有合法 JS 都是合法 TS，TS 只额外加了「类型标注 + 编译期检查」，最终编译回纯 JS 运行。你现有的 JS 知识 100% 有效。

类型标注的两个位置：

```ts
let count: number = 0            // 变量：类型写在名字后面
function greet(name: string): string {   // 参数与返回值
  return `你好，${name}`
}
```

最常用的一批类型，多数能从值直接读出来：

| 类型 | 对应 JS 值 | 例 |
| ---- | ---- | ---- |
| `string` / `number` / `boolean` | 基础值 | `"abc"`、`42`、`true` |
| `string[]` | 数组 | `["a", "b"]` |
| `{ id: number; title: string }` | 对象 | `{ id: 1, title: "x" }` |
| 联合类型 `string \| null` | 可能缺失 | 查询结果可能没有 |

联合类型是 TS 的招牌：`string | null` 精确表达了「可能是字符串、可能是 null」——编译器会**强制**你处理 null 的情况，那个 famous 的「Cannot read properties of null」从此在编译期就被抓住。

两个高频辅助字：`interface`/`type` 给对象形状起名字（`interface Article { id: number; title: string }`），`as const` 把字面量变成不可变常量。

## 代码示例

同一个函数，JS 与 TS 对比——错误是编译期的还是运行到半夜才发现的：

```ts
// JS 版：totle 拼错、user 缺字段，全都运行时才炸
function renderUser(user) {
  return `欢迎 ${user.totle}`      // undefined 悄悄混进页面
}

// TS 版：声明形状，编辑器红线直接标在你脸上
interface User {
  name: string
  role: "student" | "admin"       // 字面量联合：role 只能是这两个值
}

function renderUser(user: User): string {
  return `欢迎 ${user.totle}`     // ❌ Property 'totle' does not exist. Did you mean 'title'?
}
```

渐进迁移是 TS 的工程现实：`.js` 和 `.ts` 可以混存在一个项目里。从给公共函数加注解开始，逐步收紧——`tsc` 编译器（或 Vite 的检查插件）帮你守住每一步。

## 常见坑

1. **坑 1：把类型写成 `any` 兜底**。`function f(data: any)` 等于关掉所有检查，TS 白装。不知道类型时先 `unknown` + 收窄，实在不行再 `any` 并留注释。
2. **坑 2：以为类型是运行时保护**。TS 编译成 JS 后类型信息就没了——**它只在编译期检查**。接口返回的 JSON 不会自动变成你的 interface，运行时数据校验要靠后端（Pydantic）或前端校验库。
3. **坑 3：过度类型体操**。新手阶段能用基础类型 + interface 表达的，不要硬上条件类型——类型是帮人读代码的，不是炫技场。
4. **坑 4：忘了装依赖的 `@types/*`**。`npm i -D @types/lodash` 这类类型包不装，第三方库在 TS 里全是 any。

## 小练习

1. 在 Playground 里定义 `interface Todo { id: number; title: string; done: boolean }`，写一个 `toggle(todo: Todo): Todo` 返回 done 取反的新对象。
2. 把 `role: string` 改成字面量联合，体会把非法值挡在编译期的好处。
3. 思考题：「Python 入门」的动态类型 vs TS 的静态类型——为什么 Python 后端能用注解校验（Pydantic），而 TS 的类型不能做运行时校验？
