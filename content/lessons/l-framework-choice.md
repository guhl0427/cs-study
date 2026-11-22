---
id: l-framework-choice
slug: framework-choice
title: 选型与学习路径：Vue 还是 React
difficulty: 2
estMinutes: 70
tags: [Vue, React, 选型]
summary: 二选一深入，另一门了解即可——两个框架的世界观差异、生态地图、招聘市场与学习路径建议，给你一个可执行的决策表。
updated: 2026-11-22
resources:
  - id: r-npmtrends
    title: npm trends（框架下载量对比）
    url: https://npmtrends.com/react-vs-vue-vs-@angular/core-vs-svelte
    type: tool
    difficulty: 1
    note: 用数据看生态热度，本课结论的出处。
  - id: r-state-of-js
    title: State of JS 年度调查
    url: https://stateofjs.com/
    type: doc
    difficulty: 2
    note: 社区满意度与使用率年度报告。
---

> 一句话定义：Vue 与 React 解决同一个问题，世界观与生态各有侧重——**选型看目标市场与团队存量，学习路径看「先精一门、再通第二门」**，两个都会切换成本很低。

## 概念讲解

**世界观差异**（概览课已埋伏笔，这里钉死）：

| 维度 | Vue 3 | React |
| ---- | ---- | ---- |
| 更新机制 | 响应式追踪：数据变→精准更新对应位置 | 函数重渲染：状态变→整个函数重跑→diff |
| 模板 | 模板 + 指令（v-if/v-for） | JSX（在 JS 里写 HTML） |
| 状态管理 | ref/computed/reactive | useState/useReducer |
| 官方全家桶 | Router + Pinia 官方出品，一致性强 | Router/状态库是社区方案，选择多 |
| 心智负担 | 模板约束多、套路固定 | JSX 灵活（等于全写 JS）、自由度高 |

**生态地图**——框架本身只是核心，真实项目用的是生态：

```text
Vue 系：Vue Router（路由）+ Pinia（状态）+ Element Plus / Naive UI（组件库）
React 系：React Router（路由）+ Zustand / Redux Toolkit（状态）+ Ant Design / shadcn（组件库）
两边通用：TanStack Query（请求缓存）、Vite（构建）、TypeScript
```

**选型决策表**（按真实约束排序）：

| 你的情况 | 建议 | 理由 |
| ---- | ---- | ---- |
| 目标国内就业市场 | Vue 优先 | 国内大厂 Vue 存量巨大（阿里/字节均有），岗位多 |
| 目标外企/海外/大厂通用 | React 优先 | 全球市场 React 份额第一，生态最大 |
| 已有团队代码库 | 跟团队走 | 团队存量经验 > 一切技术优劣论证 |
| 纯自学、第一次学框架 | Vue 或 React 都行 | 世界观相通；先精通一门，第二门一周可上手 |
| 小工具/表单类项目 | Vue | 上手快、官方全家桶少踩坑 |

**警惕「框架战争」**：两边的极端粉丝争论没有信息量——下载量、岗位数、满意度都是「在某处更好的证据」而非「更好的证明」。工程决策看约束，不看信仰。

**学习路径建议**（无论选哪个）：

```text
第一步：把概览课的「为什么需要框架」用所选框架重写一遍（计数器对照）
第二步：官方教程完整走一遍（Vue 官方文档 / react.dev 都是行业最佳实践级）
第三步：框架深入课——路由 + 状态管理两大生态件
第四步：做一个完整小项目（TodoMVC 级别），把路由、状态、请求全部串起来
第五步：回头看另一门框架——此时你只需学「差异」，一两天即可上手
```

**「另一门了解即可」的底气**来自概念迁移：响应式 vs 重渲染、props/事件 vs props/回调、路由守卫 vs 拦截组件——概念一一对应，只是语法不同。精通一门后第二门的成本是「翻译」而不是「重学」。

## 代码示例

主线：同一个「带路由与全局状态的待办应用」骨架，两框架逐文件对照（感受「概念相同、语法不同」）：

**路由注册对照**：

```js
// Vue Router：配置式注册
const routes = [
  { path: "/todos", component: TodoList },
  { path: "/todos/:id", component: TodoDetail },
]
createRouter({ history: createWebHistory(), routes })

// React Router：声明式组件
const router = createBrowserRouter([
  { path: "/todos", element: <TodoList /> },
  { path: "/todos/:id", element: <TodoDetail /> },
])
<RouterProvider router={router} />
```

**全局状态对照**：

```js
// Pinia（Vue）：defineStore + ref
export const useTodoStore = defineStore("todo", () => {
  const items = ref([])
  const add = (t) => items.value.push(t)
  return { items, add }
})

// Zustand（React）：create + set
export const useTodoStore = create((set) => ({
  items: [],
  add: (t) => set((s) => ({ items: [...s.items, t] })),   // 不可变更新
}))
```

对照读完的结论：**路由的「路径→组件」映射、状态的「单一出处 + 方法修改」、组件间通信的「数据下行/事件上行」——三个概念完全一致**。差异只在语法皮肤与不可变性纪律（React 必须不可变，Vue 可以直接改）。

## 常见坑

1. **坑 1：两门同时学**。初学者同时学两套语法，概念还没建立就开始互相干扰——先精通一门（做出完整项目），第二门是翻译不是重学。
2. **坑 2：按「哪个更牛」选型**。技术优劣论证永远吵不完——按目标市场（岗位）、团队存量、项目约束选，这三个是可验证的现实约束。
3. **坑 3：跳过官方文档直接看视频**。Vue 官方文档与 react.dev 都是业界公认的最佳教程，视频只能当引子；文档里的「深入指南」部分才是面试与实战的分水岭。
4. **坑 4：把组件库当框架学**。先学框架核心（组件/状态/路由），组件库（AntD/Element）是查表用的工具——上来就背组件库 API 是本末倒置。

## 小练习

1. 用 npmtrends 查看 React/Vue/Angular/Svelte 近五年下载量曲线，记录两个数据点并解释曲线变化的原因（如 React 18 发布、Vue 3 生态成熟）。
2. 在 TodoMVC 上各打开 Vue 与 React 的实现源码，找到「添加一条待办」的代码位置，对照两边的状态更新写法。
3. 综合任务：写出你的选型决策——列出你的目标市场、现有基础、时间预算三项约束，给出结论和理由（这是面试「为什么学 X」的真实答案）。
4. 思考题：为什么精通一门框架后，学第二门的成本是「翻译」而不是「重学」？哪些概念是跨框架通用的？
