---
id: l-ts-generics
slug: ts-generics
title: 泛型与 tsconfig：类型的复用与工程配置
difficulty: 3
estMinutes: 40
tags: [TypeScript, 泛型, 工程配置]
summary: 泛型是「类型的函数」——T 占个位，调用时填真身；tsconfig 则决定整个项目的严格程度，strict 是唯一推荐答案。
updated: 2026-11-22
resources:
  - id: r-ts-generics
    title: TypeScript Handbook · More on Functions / Generics
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
    type: doc
    difficulty: 3
    note: 泛型官方讲解，配 Playground 边读边试。
  - id: r-tsconfig-ref
    title: TSConfig Reference
    url: https://www.typescriptlang.org/tsconfig/
    type: doc
    difficulty: 3
    note: 每个配置项的权威含义，本文只讲高频的那几个。
---

> 一句话定义：泛型给函数「类型的参数」——`function first<T>(arr: T[]): T` 一个写法适配所有数组；tsconfig 则是项目的类型宪法。

## 概念讲解

没有泛型时，复用一个逻辑要复制粘贴：

```ts
function firstNumber(arr: number[]): number | undefined { ... }
function firstString(arr: string[]): string | undefined { ... }
// 每种类型一份……或者用 any 关掉检查
```

泛型把「类型」本身参数化——`T` 是类型的占位符，调用时由 TypeScript **自动推导**：

```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}
const n = first([1, 2, 3])       // T 被推导为 number → n: number
const s = first(["a", "b"])      // T 被推导为 string → s: string
```

读到「T 是什么」时记住类比：**泛型之于类型，就像参数之于值**。你早就会传值了，泛型只是把「传类型」也变成可能。

三个高频场景就能覆盖入门期：

1. **API 响应包装**：`interface Result<T> { code: number; data: T }`，`Result<User>` 和 `Result<Todo[]>` 共用一个壳；
2. **工具函数**：`pick<T, K extends keyof T>(obj: T, key: K)`——`keyof` 约束保证只能传对象上真实存在的键；
3. **框架类型**：`useState<string>`、`ref<number>`——框架库的 API 全是泛型，读懂它就懂得怎么用框架。

## 代码示例

泛型 API 包装 + keyof 约束，两个最有复用价值的模式：

```ts
interface Result<T> {
  code: number
  data: T
  message?: string
}

async function apiGet<T>(url: string): Promise<Result<T>> {
  const resp = await fetch(url)
  return resp.json() as Promise<Result<T>>     // 真实项目里这里应做运行时校验
}

interface User { id: number; name: string; role: string }
const r = await apiGet<User[]>("/api/users")
r.data[0].name        // 编辑器知道这是 User 数组，补全和检查全都在

function pick<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
const user: User = { id: 1, name: "小明", role: "student" }
pick(user, "name")    // ✅ 类型是 string
pick(user, "age")     // ❌ Argument of type '"age"' is not assignable to parameter of type 'keyof User'
```

tsconfig 的高频配置——新项目只改两个就够了：

```jsonc
{
  "compilerOptions": {
    "strict": true,            // 唯一推荐：null 检查、隐式 any 全部收紧
    "target": "ES2022",        // 编译成什么版本的 JS（现代浏览器够用）
    "moduleResolution": "bundler",   // 配合 Vite 的模块解析方式
    "noUncheckedIndexedAccess": true // arr[i] 的类型带上 undefined，逼你处理越界
  }
}
```

## 常见坑

1. **坑 1：手写类型参数**。`first<number>([1,2,3])` 能跑但多余——99% 场景 TS 推导得比你准，显式写 T 只在推导不出来的边界用。
2. **坑 2：`strict: false` 起步**。「先宽松以后收紧」在类型上是伪命题：宽松写的代码回头全是 `any` 债。**新项目直接 strict**，旧项目渐进收紧。
3. **坑 3：泛型约束忘了加**。`function f<T>(obj: T) { return obj.name }` 报错——T 什么都不是，哪来的 name？加约束 `T extends { name: string }`。
4. **坑 4：as 断言当万能胶**。`resp.json() as User[]` 只是「骗」编译器，运行时还是原始 JSON。跨边界的数据要么后端保证（Pydantic），要么前端用 zod 校验，不要靠 as。

## 小练习

1. 给 `Result<T>` 加一个泛型方法 `isOk(): this is Result<T> & { code: 0 }` 太难？那就先写 `function isOk<T>(r: Result<T>): boolean { return r.code === 0 }`，并解释为什么它不需要泛型约束。
2. 用 `keyof` + 泛型实现 `pick` 的反面：`omit(obj, key)` 返回去掉一个键的新对象（提示：`Omit<T, K>` 工具类型）。
3. 思考题：「软件工程实践」说重构要有测试兜底——类型系统在重构里扮演什么角色？哪些重构它能兜住、哪些兜不住？
