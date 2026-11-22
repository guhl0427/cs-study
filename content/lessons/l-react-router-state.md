---
id: l-react-router-state
slug: react-router-state
title: React Router 与状态管理：多页面与全局数据
difficulty: 3
estMinutes: 85
tags: [React, Router, 状态管理, Zustand]
summary: 声明式路由（createBrowserRouter/Outlet 嵌套、useParams/useNavigate）+ 状态先分类再选库（服务端数据→请求缓存库、客户端共享→Zustand、私有→useState）——主线两级路由课程站 + Zustand 购物车跨页联动。
updated: 2026-11-22
resources:
  - id: r-react-router
    title: React Router 官方文档
    url: https://reactrouter.com/home
    type: doc
    difficulty: 2
    note: v7 的 createBrowserRouter、嵌套路由与数据加载文档。
  - id: r-zustand
    title: Zustand 官方文档
    url: https://zustand.docs.pmnd.rs/
    type: doc
    difficulty: 2
    note: 轻量状态库的代表，本课用它演示（Redux Toolkit 思路相同）。
---

> 一句话定义：React Router 用**声明式 `<Route>` 把 URL 映射到组件**（路由表就是组件树，`<Outlet>` 是子路由窗口），状态管理先**分类再选库**——服务端数据进请求缓存库、客户端共享状态进 Zustand、组件私有留 useState。

## 概念讲解

### 路由的 React 味道：路由表就是组件树的一部分

Vue Router 用一个 `routes` 配置数组描述全部路由；React Router 的做法是**把路由写成 JSX**——`createBrowserRouter` 收一棵 `<Route>` 树，交给 `<RouterProvider>` 挂载。嵌套路由不再是 `children` 数组里的字符串约定，而是**字面意义上的 JSX 嵌套**：

```jsx
const router = createBrowserRouter([
  { path: '/', element: <Layout />,           // 父级：布局组件
    children: [
      { index: true, element: <CourseList /> },             // / 显示列表
      { path: 'courses/:id', element: <CourseDetail /> },   // /courses/:id 详情
    ] },
])
```

```text
        <Layout>  ← header / 页脚永远在
            │
       <Outlet />  ← 子路由的显示窗口（URL 决定窗口里是谁）
        ├─ /            → CourseList
        └─ /courses/:id → CourseDetail
```

`<Outlet />` 就是 React 世界的 `<RouterView>`：父级布局只写一次，URL 变化只换窗口内容——header、侧边栏、页脚纹丝不动。

### useParams 与 useNavigate：读参数、主动跳转

```js
const { id } = useParams()        // 读路径参数（注意：字符串！'2' 不是 2）
const navigate = useNavigate()
navigate('/courses/3')            // 主动跳转
navigate(-1)                      // 等价后退一步
```

`<Link to="...">` 用于用户点击的导航；`navigate()` 用于逻辑触发的跳转（登录成功后进首页、提交后跳列表）。

### 关键的坑：路径参数变化，组件复用不重跑

从 `/courses/2` 到 `/courses/3`，React Router 认为「还是 CourseDetail」，**不卸载不重挂**——`useState` 的初始值、effect 之外的一切都不会重来。和 Vue Router 同一个坑、同一个缘由（复用比重建便宜），解法也是两选一：

- **推荐**：让 effect 依赖参数——`useEffect(load, [id])`，id 一变就重新取数；
- 或者强制重建：包一层组件 `<CourseDetail key={id} />`，key 变了 React 就销毁重挂，代价是丢掉复用。

### 状态管理：先分类，再选库（三分法决策树）

React 世界没有官方状态库，**选错库的代价大于写错代码**，所以先分类：

```text
 这份状态从哪来？
  ├─ 来自服务器、会过期、要重新取（列表/详情/用户资料）
  │     → 请求缓存库：TanStack Query / SWR（缓存、重试、竞态都替你做）
  ├─ 纯客户端、多组件共享（购物车、主题、登录态）
  │     → 全局状态库：Zustand / Redux
  └─ 只属于一个组件（输入框草稿、面板开关）
        → useState，别让它出门
```

| 工具 | 适合管什么 | 代价/边界 |
| ---- | ---- | ---- |
| `useState` | 组件私有状态 | 出了组件就够不着 |
| Context | 低频共享（登录态、主题） | value 一变**所有消费者都重渲染**，高频状态别放 |
| Zustand/Redux | 高频共享、跨页状态 | 要守不可变更新与选择器纪律 |
| TanStack Query | 服务端数据 | 只管「服务器来的」，不是万能 store |

URL 定位信息（资源 id、页码、筛选词）照旧属于**路由参数**，不属于任何状态库——与 Vue 课的三分法完全同构。

### Context 的位置与高频重渲染陷阱

Context 解决「**传递**」问题（免掉层层 props），不解决「**更新**」问题：Provider 的 `value` 一变，**所有消费该 Context 的组件全部重渲染**。登录布尔值这种低频状态没问题；购物车这种每点一次加购就变的，用 Context 会造成大面积重渲染——这正是 Zustand 的用武之地，它的**选择器订阅**让组件只在自己用到的切片变化时才重渲染。

### Zustand 最小用法：create + set/get + 选择器

```js
import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items: [],                                        // state
  add(item) {                                       // 动作：set 用「覆盖」语义
    set((s) => ({ items: [...s.items, item] }))     // 不可变更新：造新数组
  },
}))

// 组件里按「切片」订阅——只取需要的，重渲染才不会扩散
const count = useCartStore((s) => s.items.length)
const add = useCartStore((s) => s.add)
```

三个要点：`create` 建全局单份 store，**不需要 Provider 包裹**；`set` 是浅合并的对象覆盖，改数组要造新引用；`useCartStore(selector)` 里 selector 返回什么，组件就只在**那个值变化**时重渲染。派生值（总价、件数）没有 computed 关键字，写成选择器函数在渲染期直接算即可——这与 Vue 课「派生进 store getter」殊途同归。

## 代码示例

主线任务：搭一个**两级路由的课程站**——列表页（搜索 + 加购）、详情页（路由参数取数），Zustand 购物车贯穿 header 角标与两个页面。全程约 35 分钟，`npm create vite@latest` 选 React 模板，再 `npm i react-router zustand`。

### 第 0 步：共享数据（src/data.js）与路由表（src/main.jsx）

```js
export const COURSES = [
  { id: 1, name: '计算机网络', price: 99 },
  { id: 2, name: '操作系统', price: 129 },
  { id: 3, name: '数据结构', price: 149 },
]
```

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import Layout from './pages/Layout'
import CourseList from './pages/CourseList'
import CourseDetail from './pages/CourseDetail'

const router = createBrowserRouter([
  { path: '/', element: <Layout />,
    children: [
      { index: true, element: <CourseList /> },
      { path: 'courses/:id', element: <CourseDetail /> },
    ] },
])

createRoot(document.getElementById('root'))
  .render(<StrictMode><RouterProvider router={router} /></StrictMode>)
```

### 第 1 步：Zustand 购物车（src/stores/cart.js）

```js
import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items: [],                                     // state
  add(item) {                                    // 动作：覆盖式、不可变
    set((s) => ({ items: [...s.items, item] }))
  },
  remove(id) {
    set((s) => ({ items: s.items.filter((it) => it.id !== id) }))
  },
}))

export const selectCount = (s) => s.items.length          // 派生：件数
export const selectTotal = (s) => s.items.reduce((sum, it) => sum + it.price, 0)  // 总价
```

### 第 2 步：布局（src/pages/Layout.jsx）——Outlet 窗口 + 跨页角标

```jsx
import { Outlet, Link } from 'react-router'
import { useCartStore, selectCount, selectTotal } from '../stores/cart'

export default function Layout() {
  const count = useCartStore(selectCount)        // 切片订阅：件数变才重渲染
  const total = useCartStore(selectTotal)
  return (
    <div>
      <header><Link to="/">课程列表</Link> | 购物车：{count} 件 / ¥{total}</header>
      <Outlet />   {/* 子路由窗口：URL 变只换这里 */}
    </div>
  )
}
```

### 第 3 步：课程列表页（src/pages/CourseList.jsx）

```jsx
import { useState } from 'react'
import { Link } from 'react-router'
import { useCartStore } from '../stores/cart'
import { COURSES } from '../data'

export default function CourseList() {
  const [q, setQ] = useState('')                 // 组件私有：搜索词草稿
  const add = useCartStore((s) => s.add)         // 动作引用稳定，订阅它不引发重渲染
  const shown = COURSES.filter((c) =>            // 派生值：渲染期直接算，无需缓存
    c.name.toLowerCase().includes(q.toLowerCase())
  )
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜课程" />
      <ul>
        {shown.map((c) => (
          <li key={c.id}>
            <Link to={`/courses/${c.id}`}>{c.name} ¥{c.price}</Link>{' '}
            <button onClick={() => add(c)}>加入购物车</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### 第 4 步：课程详情页（src/pages/CourseDetail.jsx）——useParams + 参数变化重取

```jsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useCartStore } from '../stores/cart'
import { COURSES } from '../data'

export default function CourseDetail() {
  const { id } = useParams()                     // 字符串！'2'
  const navigate = useNavigate()
  const add = useCartStore((s) => s.add)
  const [course, setCourse] = useState(null)

  useEffect(() => {
    let ignore = false                           // 上一课的竞态骨架，直接复用
    setCourse(null)
    const timer = setTimeout(() => {             // 模拟网络延迟 300ms
      if (!ignore) setCourse(COURSES.find((c) => c.id === Number(id)) ?? null)
    }, 300)
    return () => { ignore = true; clearTimeout(timer) }
  }, [id])                                       // id 变 → 重取：组件被复用，effect 接住

  if (!course) return <p>加载中…</p>
  return (
    <div>
      <h2>{course.name} —— ¥{course.price}</h2>
      <button onClick={() => add(course)}>加入购物车</button>{' '}
      <button onClick={() => navigate(`/courses/${Number(id) - 1 || 3}`)}>上一门</button>{' '}
      <Link to="/">← 返回列表</Link>
    </div>
  )
}
```

### 第 5 步：逐个动作，对答案

- 打开 `/`：列表渲染 3 条；搜索框输入「数据」→ 只剩数据结构。`q` 是 useState 私有草稿，没进任何全局状态——三分法的第三类。
- 点「加入购物车」→ **header 角标立即 +1**：列表页没写过「更新 header」的代码，Zustand 的切片订阅贯通两处；输入搜索词时角标组件**不**重渲染（q 不在 store 里）。
- 点课程标题进 `/courses/2`：URL 变化、**无整页刷新**，header 与角标纹丝不动——换的只是 `<Outlet>` 窗口里的内容。
- 在详情页点「上一门」跳 `/courses/1`：内容换成第 1 门。组件**没有**卸载重挂（顶部加一行 `console.log('mounted')` 即可验证）——是 effect 的 `[id]` 依赖接住了参数变化；忘了这个依赖，页面就停在旧课程上，上一课的骨架在这一课救场。
- 列表 ↔ 详情来回切，角标数量一直保留（store 跨页存活）；按 F5 刷新则购物车清零（store 在内存里），但 `/courses/2` **直达且详情照常**——URL 是页面的身份。「刷新丢 / 跨页留」这条存活边界，两种方案现在都能亲手区分。

## 常见坑

1. **坑 1：useParams 的值是字符串**。现象：`course.id === id` 永远 false、按 id 查数据查不到。原因：URL 片段天然是字符串，`/courses/2` 解析出 `'2'`。排查：用前 `Number(id)` 转换，或比较时统一一边的类型。
2. **坑 2：路径参数变化页面不更新**。现象：详情页之间跳转内容停在旧课程。原因：React Router 复用组件实例，useState 初始值与 effect 外逻辑不会重来。排查：`useEffect(load, [id])` 让 effect 跟着参数走；或包一层 `<CourseDetail key={id} />` 强制重建。
3. **坑 3：把高频状态塞进 Context**。现象：点一次加购，半个页面都重渲染，输入框都跟着卡。原因：Provider 的 value 一变，**所有**消费组件全部重渲染，Context 只解决传递不解决更新。排查：低频（登录态/主题）可留 Context；高频共享换 Zustand + 切片选择器。
4. **坑 4：忘写 `<Outlet />` 或忘挂 RouterProvider**。现象：子路由页面「存在但看不到」——白屏只显示布局；或控制台报「useContext 为空」。排查：嵌套路由的父 element 里必须有 `<Outlet />`；`<RouterProvider router={router}/>` 必须包住整棵树。
5. **坑 5：解构整个 store**。现象：`const { items, add } = useCartStore()` 之后，购物车任何字段变化都引发本组件重渲染。原因：不带选择器等于订阅整个 store。排查：逐字段切片订阅 `useCartStore((s) => s.add)`；派生值写成独立的选择器函数复用。
6. **坑 6：set 里原地改数组/对象**。现象：push 之后界面不动、选择器「感觉不到变化」。原因：Zustand 靠新旧**引用**比较判断要不要通知订阅者，原地修改引用没变。排查：一律不可变更新——`set((s) => ({ items: [...s.items, item] }))`、filter/map 代替 push/splice。

## 小练习

1. 给详情页加「下一门」按钮，与「上一门」一起连点横跳，观察每次跳转触发几次 effect、是否重挂组件——用 `console.log` 区分「重渲染」与「重新挂载」。
2. 把详情页改成 **key 方案**：在路由表里用 `{ path: 'courses/:id', element: <CourseDetailWrapper /> }`，Wrapper 里 `<CourseDetail key={id} />`；对比两种方案的 console 表现，写出一句适用场景。
3. 给 store 接 `persist` 中间件（`import { persist } from 'zustand/middleware'`），让购物车扛住 F5 刷新；再思考哪些字段**不该**持久化，体会「刷新是否应保留」的分类标准。
4. **综合任务**：用 Zustand 实现登录态（`isLogin` / `login()` / `logout()`），并在 Layout 里做受保护路由——未登录访问 `/courses/:id` 时 `navigate('/login?to=' + location.pathname)`，登录页读 `to` 参数登录成功后跳回。要求：登录状态跨页存活、刷新后由 localStorage 恢复、无死循环。
