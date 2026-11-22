---
id: l-ts-generics
slug: ts-generics
title: 泛型与 tsconfig：类型的复用与工程配置
difficulty: 3
estMinutes: 80
tags: [TypeScript, 泛型, 工程配置]
summary: 泛型是「类型的参数」——一个写法适配所有类型且逐处精确检查。主线给 fetch 响应包一层 Result<T> 并实现 keyof 约束版 pick/omit，再逐项读懂 tsconfig 四个高频配置。
updated: 2026-11-22
resources:
  - id: r-ts-generics
    title: TypeScript Handbook · Generics
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
    type: doc
    difficulty: 3
    note: 泛型官方讲解，泛型约束与 keyof 一章配 Playground 边读边试。
  - id: r-tsconfig-ref
    title: TSConfig Reference
    url: https://www.typescriptlang.org/tsconfig/
    type: doc
    difficulty: 3
    note: 每个配置项的权威含义；本文只精讲高频的那几个，其余用到再查。
  - id: r-zod
    title: zod 官方文档
    url: https://zod.dev/
    type: doc
    difficulty: 3
    note: 运行时数据校验库——「编译期管不了的数据」的正确补法，本文只点到为止。
---

> 一句话定义：泛型给函数与接口「类型的参数」——`function first<T>(arr: T[]): T | undefined` 一个写法适配所有数组且逐处精确检查；tsconfig 则是项目的类型宪法，strict 是唯一推荐答案。

## 概念讲解

### 没有泛型的世界：复制粘贴困境

上一课的 todo 数据层里，如果想写一个「取数组第一项」的工具函数，没有泛型时只有两条烂路：

```ts
function firstNumber(arr: number[]): number | undefined { return arr[0] }
function firstString(arr: string[]): string | undefined { return arr[0] }
function firstTodo(arr: Todo[]): Todo | undefined { return arr[0] }
// 路一：每种类型复制一份，逻辑一字不差，改 bug 要改 N 处；路二：统一 any，检查全关
```

复制粘贴是逻辑债（改一处漏 N 处），any 是检查债（错误重新回到运行时）。**两个方向的债都还不起**——这正是泛型要解决的问题。

### 泛型：类型的参数

你早就会给函数传**值**参数了；泛型只是把「**类型**」也变成可以传的参数。`T` 是类型的占位符（Type 的首字母），调用时由编译器「填空」：

```text
调用 first([1, 2, 3])              调用 first(["a", "b"])
        │                                  │
        ▼ 实参推导                          ▼
   T = number                         T = string
        │                                  │
        ▼                                  ▼
(arr: number[]): number | undefined   (arr: string[]): string | undefined
        └──────── 一个写法，编译出无数个专属版本 ────────┘
```

类比：**泛型之于类型，就像参数之于值**。函数参数复用的是「逻辑」，泛型复用的是「逻辑 + 类型」。记住这个类比，后面所有泛型语法都是在回答「这个类型参数怎么传、怎么约束」。

### T 自动推导：99% 的场景不用手写

```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}
const n = first([1, 2, 3])       // T 被推导为 number → n: number | undefined
const s = first(["a", "b"])      // T 被推导为 string → s: string | undefined
```

推导规则朴素：**从实参往回推**。传 number 数组，T 就是 number。显式写 `first<number>([1,2,3])` 合法但多余；真正需要显式标注的场景是「推导不出」——比如 `apiGet<User[]>(url)`，返回值类型无法从 url 字符串里推出来，只能调用方手动告知。这是下一节主线的主角。

### 泛型接口 Result<T>：一个壳装所有响应

后端响应几乎都是统一外壳 + 各异的数据：`{ code, data, message }`，data 有时是用户数组、有时是 todo 列表。没有泛型就得每种数据复制一份接口；有了泛型：

```ts
interface Result<T> {
  code: number
  data: T
  message?: string
}
```

`Result<User>` 和 `Result<Todo[]>` 共用同一个壳，data 的类型各自精确。类比：**快递盒**——盒子（外壳字段）固定，内容物（T）随订单变；但快递单上写清了里面是什么，你拆盒前就知道该用什么方式处理它。

### keyof 与约束：把「键名」也变成类型

两个操作符拆开看：

- `keyof T`：取「T 所有键名组成的联合类型」。`keyof User` 就是 `"id" | "name" | "role"`。
- `K extends keyof T`：**约束（constraint）**——声明「K 必须是 keyof T 清单里的一员」，传清单外的键直接编译期报错。

```text
function pick<T, K extends keyof T>(obj: T, key: K): T[K]
T[K]：T 里 K 这个键的「值类型」——pick(user, "name") 的返回类型是 string
```

约束的本质：**给类型参数划合法范围**。没有约束时 T 什么都能是（所以访问 `obj[key]` 编译器不放心）；加了约束，编译器同时知道「键合法」和「返回类型精确」两件事。泛型的精髓一半在参数化，另一半就在约束。

### 常用工具类型速览：内置的泛型模板

TS 内置了一批「泛型模板」，都是本文两个知识点（参数化 + 约束）的组合运用：

| 工具类型 | 含义 | 一例 |
| ---- | ---- | ---- |
| `Partial<T>` | 所有字段变可选 | 表单编辑草稿：`Partial<Todo>` |
| `Pick<T, K>` | 只挑出部分字段 | 列表页只要 id/title：`Pick<Todo, "id" \| "title">` |
| `Omit<T, K>` | 去掉部分字段 | 提交时排除 id：`Omit<Todo, "id">` |
| `Record<K, V>` | 用键清单造对象类型 | `Record<"low" \| "high", string>` 造标签表 |

注意：它们都是**类型级**操作——只改变编译器的视角，运行时对象一个字节都不会变。「类型消失」原则在工具类型上依然成立。

### tsconfig：项目的类型宪法

tsconfig.json 决定「编译器按什么标准检查你的项目」，四个高频项逐个讲：

| 配置项 | 管什么 | 推荐值与理由 |
| ---- | ---- | ---- |
| `strict` | 一揽子严格开关：null 检查、禁隐式 any 等 | `true`——唯一推荐，见下节 |
| `target` | 编译成哪个版本的 JS | `ES2022`——现代浏览器直接支持，产物更短 |
| `moduleResolution` | 怎么找 `import` 的模块 | `bundler`——配合 Vite 的解析方式 |
| `noUncheckedIndexedAccess` | `arr[i]` 的类型要不要带 `undefined` | `true`——逼你处理越界，下一节亲眼看它拦截 |

`strict: true` 不是可选项的稳妥说法：它包含的 `strictNullChecks`（null/undefined 必须显式处理）与 `noImplicitAny`（不许悄悄 any）正是类型系统大半价值所在——关掉它，等于只用了 TS 的补全，没用 TS 的检查。

### strict:false 为什么是伪命题

「先宽松写，以后再收紧」听起来渐进，实际是伪命题：宽松模式下，每个偷懒的 `any`、每个没处理的 null 都在被**持续生产**；等你想收紧时，全项目几千个新报错，没人还得起这笔债——于是 strict 永远开不起来。正确姿势：**新项目第一天就 strict；旧项目用「按目录渐进收紧 + 每个合并不新增错误」的方式收紧**。这和软件工程课的技术债模型完全同构：债务按复利增长，越晚还得越多。

### as 断言的边界：编译期的「担保书」

`resp.json() as Result<User>` 的含义是「我担保它是这个形状」——**担保，不是验证**。编译器信了你，红线消失；运行时数据还是原始 JSON，字段缺失、类型不对照样炸。跨边界数据（接口返回、localStorage 读出）的正确补法：要么后端用 Pydantic 这类工具在出口保证，要么前端用 **zod** 在入口校验（校验通过后才交给 TS 类型）。记住分工：**TS 管编译期的一致性，运行时的真实性要靠校验**。

## 代码示例

主线任务：给上一课的 todo 项目接一层**泛型 API 客户端**（Result\<T\> + apiGet\<T\>），再亲手实现 keyof 约束版的 **pick / omit**，逐个看编译期拦截非法调用；最后配一份完整的 tsconfig 并验证 noUncheckedIndexedAccess 的拦截效果。继续开 Playground 跟做，约 30 分钟。

### 第 0 步：裸 fetch 的问题——resp.json() 是 any

```ts
// 没有 TS 类型加持的 fetch：返回 any，data 上访问什么都不检查
const resp = await fetch("/api/todos")
const data = await resp.json()
data[0].titel            // ❓ 拼错了，但 any 不报错——运行时 undefined 悄悄混入
```

`resp.json()` 返回 any：拼错属性、当数组用、当对象用，编译器全部沉默。**any 的问题不是报错，是不报错**。

### 第 1 步：Result<T> 与 apiGet<T>

```ts
interface Result<T> {
  code: number
  data: T
  message?: string
}

async function apiGet<T>(url: string): Promise<Result<T>> {
  const resp = await fetch(url)
  return resp.json() as Promise<Result<T>>   // as 只是声明；真实项目应在入口用 zod 校验
}

interface Todo { id: number; title: string; priority: "low" | "mid" | "high"; done: boolean }

const r = await apiGet<Todo[]>("/api/todos")
if (r.code === 0) {
  r.data[0].title     // ✅ 编辑器知道 data 是 Todo[]：补全、拼写检查全都在
}
```

调用处必须显式写 `<Todo[]>`——因为 T 推导不出来（url 是字符串，推不出数据形状），这正是上一节说的「显式标注的合法场景」。

### 第 2 步：编译期拦截非法调用

```ts
r.data[0].titel
// ❌ Property 'titel' does not exist on type 'Todo'.
//    Did you mean to access 'title'?

r.data.toUpperCase()
// ❌ Property 'toUpperCase' does not exist on type 'Todo[]'
```

逐段解读第二条：`Property 'toUpperCase'`——你想调字符串方法；`does not exist on type 'Todo[]'`——但 data 是 Todo 数组，数组上没有它。编译器不仅知道「有 data」，还知道 data **确切是什么**——这就是泛型参数 T 的全部意义：把 any 变成精确类型。

### 第 3 步：pick——keyof 约束实战

```ts
function pick<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { id: 1, name: "小明", role: "student" as const }

pick(user, "name")    // ✅ 返回类型精确为 string
pick(user, "age")     // ❌ Argument of type '"age"' is not assignable to
                      //    parameter of type 'keyof { id: number; name: string; role: "student" }'
```

逐段解读：`Argument of type '"age"'`——第 2 个实参是 "age"；`is not assignable to parameter of type 'keyof …'`——形参要求是「键名清单」中的一员。也就是说 `K extends keyof T` 约束把「传错键名」这类 bug 从运行时挪到了敲代码的瞬间。没有约束的 `pick(obj, key)` 会直接报隐式 any 错误——约束不是装饰，是让函数类型成立的前提。

### 第 4 步：omit——反向操作

```ts
function omit<T, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

const withoutRole = omit(user, "role")
withoutRole.id        // ✅ 类型是 number
withoutRole.role      // ❌ Property 'role' does not exist on type
                      //    'Omit<{...}, "role">'——编译器知道键被删了
```

`Omit<T, K>` 是内置工具类型：「T 去掉 K 之后剩下的形状」。注意返回的是**新对象**（copy），而 `Omit<T, K>` 只是返回值的类型描述——再次印证「类型级操作不改变运行时对象」。

### 第 5 步：工具类型各来一例

```ts
const draft: Partial<Todo> = { title: "草稿标题" }        // 全字段可选：表单草稿
const row: Pick<Todo, "id" | "title"> = { id: 1, title: "x" }  // 列表行只要两列
const input: Omit<Todo, "id"> = { title: "x", priority: "low", done: false }
const labels: Record<Todo["priority"], string> = {
  low: "低", mid: "中", high: "高",
}
labels.urgent   // ❌ Property 'urgent' does not exist——Record 的键清单也受检查
```

### 第 6 步：tsconfig 全文与 noUncheckedIndexedAccess

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "moduleResolution": "bundler",
    "noUncheckedIndexedAccess": true
  }
}
```

在开启第 4 项后，数组索引访问的类型带上 `| undefined`：

```ts
const todos: Todo[] = []
todos[0].title
// ❌ 'todos[0]' is possibly 'undefined'
const first = todos[0]
if (first) first.title      // ✅ 收窄之后才能安全访问
```

这正是它的价值：**「数组是空的」是真实世界天天发生的事**，默认配置假装它不存在，开了这项编译器逼你先处理。

## 常见坑

1. **坑 1：手写类型参数**。现象：`first<number>([1,2,3])` 处处显式标注。原因：99% 场景 TS 从实参推导得比你准，显式写反而多一层要维护的东西。排查：只在「推不出来」（返回值-only、空数组、Result 包装）处显式写 T，其余交给推导。
2. **坑 2：`strict: false` 起步**。现象：新项目图省事关掉 strict。原因：宽松代码持续生产 any 债与 null 债，回头收紧的成本指数增长，最后永远开不起来。排查：新项目第一天 strict；旧项目按目录渐进，CI 里卡「不新增错误」。
3. **坑 3：泛型约束忘了加**。现象：`function f<T>(obj: T) { return obj.name }` 报错。原因：T 什么都不是，编译器无从知道它有没有 name。排查：想访问什么属性，就约束什么——`T extends { name: string }` 或 `K extends keyof T`。
4. **坑 4：as 当万能胶**。现象：类型对不上就 `as` 一下，红线立刻消失。原因：as 是担保不是验证，运行时数据没变，错误只是从编译期推迟回运行时。排查：全局搜 ` as `，每个都问「这个担保我能签字吗」，跨边界数据改用 zod 校验。
5. **坑 5：把工具类型当运行时操作**。现象：以为 `Omit<Todo, "id">` 会真的从对象里删键。原因：工具类型只改编译器视角，运行时要删键得自己写 `{ ...obj }` + delete（如第 4 步）。排查：类型与值的分界时刻默念「编译后类型消失」。
6. **坑 6：noUncheckedIndexedAccess 开了就烦关了就忘**。现象：团队嫌 `possibly 'undefined'` 烦人关掉这项。原因：越界访问是真 bug 高发区，关掉等于放弃这块保护。排查：写一个 `safeGet(arr, i)` 帮手函数收窄一次，全项目复用，而不是关检查。

## 小练习

1. 写 `function isOk<T>(r: Result<T>): boolean { return r.code === 0 }`，并回答：为什么它不需要给 T 加任何约束？（提示：它只碰了外壳，没碰 data。）
2. 用 `keyof` + 泛型实现 `setField<T, K extends keyof T>(obj: T, key: K, value: T[K]): T`——返回更新后的新对象；然后故意传一个与字段类型不符的 value，抄下报错并按「位置/给的/要的」解读。
3. 把第 6 步的 `noUncheckedIndexedAccess` 关掉再打开，对比 `todos[0].title` 的检查差异，用一句话向团队解释为什么值得忍受这个开关。
4. **综合任务**：组装一个迷你 API 客户端——`apiGet<T>`（Result\<T\> 包装）、`pick`、`omit`、`setField` 四件套，配套定义 `User` 接口；然后写一段「非法调用清单」（错误键名、错误字段类型、越界索引、拼写错误），逐条验证编译器都能拦截，并把每条报错的「位置/给的/要的」三问答案写出来。
