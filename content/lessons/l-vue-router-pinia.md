---
id: l-vue-router-pinia
slug: vue-router-pinia
title: Vue Router 与 Pinia：多页面与全局状态
difficulty: 3
estMinutes: 45
tags: [Vue, Router, Pinia]
summary: 单页应用的两根骨架：Router 管「页面怎么切换」，Pinia 管「跨组件的数据放哪」——URL 与视图绑定，全局状态有唯一出处。
updated: 2026-11-22
resources:
  - id: r-vue-router
    title: Vue Router 官方文档
    url: https://router.vuejs.org/zh/
    type: doc
    difficulty: 2
    note: 动态路由、导航守卫都在官方文档。
  - id: r-pinia-doc
    title: Pinia 官方文档
    url: https://pinia.vuejs.org/zh/
    type: doc
    difficulty: 2
    note: 本站实际在用的状态管理方案，文档即教程。
---

> 一句话定义：Router 把 **URL 和组件绑定**（切页面不再刷新整页），Pinia 把**跨组件状态收敛到 store**（数据只有一个出处）——两者是真实前端项目的标准骨架。

## 概念讲解

**Router 解决的问题**：多页面网站靠浏览器刷新整页来切页面；单页应用（SPA）只有一个 HTML，切换视图靠 JS。Router 的工作就是让「地址栏变化 ↔ 显示哪个组件」同步：

```text
URL /lesson/vue-intro  →  LessonPage 组件（携带参数渲染）
URL /course/dsa-basics →  CoursePage 组件
<RouterView /> 就是「显示当前匹配组件的窗口」
```

两件高频事：**动态路由**（`/course/:slug` 一个模式匹配所有课程页，`route.params.slug` 取参数）和**导航守卫**（跳转前拦截——未登录不让进个人中心，`router.beforeEach`）。

**Pinia 解决的问题**：props 逐层下发、事件逐层上报，组件隔两三层就开始痛苦（prop drilling）。Pinia 把共享状态放进 store——任何组件直接读写，且自动响应式：

```text
stores/user.ts：登录态、进度记录 → 谁需要谁取
组件 A 修改 store → 组件 B/C/D 立即同步（同一份数据，单一出处）
```

分工心法：**组件私有的放 ref，跨组件共享的进 Pinia，URL 能表达的不进任何状态**（课程 id 放路由参数，刷新/分享都不丢——本站的课程页就是这么做的）。

## 代码示例

注册路由 + 定义 store + 组件消费，三段拼成最小骨架：

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import LessonPage from '@/pages/LessonPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/course/:courseSlug', component: CoursePage },
    { path: '/course/:courseSlug/:lessonSlug', component: LessonPage },  // 动态参数
  ],
})
```

```ts
// stores/cart.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref<{ id: number; price: number }[]>([])      // 全局状态
  const total = computed(() => items.value.reduce((s, i) => s + i.price, 0))
  function add(item: { id: number; price: number }) { items.value.push(item) }
  return { items, total, add }
})
```

```vue
<!-- 任意组件里消费 -->
<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const router = useRouter()          // 主动跳转：router.push('/course/dsa-basics')
const route = useRoute()            // 读参数：route.params.courseSlug
const cart = useCartStore()         // 读写全局状态，无需层层传 props
</script>

<template>
  <button @click="cart.add({ id: 42, price: 99 })">加入购物车</button>
  <span>共 {{ cart.total }} 元</span>
</template>
```

## 常见坑

1. **坑 1：组件复用不刷新**。`/course/a` → `/course/b` 是同一个组件实例，`setup` 不重跑、参数不自动重取——要在 `watch(() => route.params, ...)` 里响应变化（本站修过的「上一篇/下一篇不刷新」就是它）。
2. **坑 2：把 URL 该表达的东西塞进 Pinia**。课程 id、搜索关键词放路由参数，刷新和分享链接才不丢；store 只放「切页面也该活着」的登录态、购物车。
3. **坑 3：store 里存派生值**。总数、过滤结果用 computed 从原始数据算——存两份迟早不同步，呼应「单一数据出处」。
4. **坑 4：守卫里忘了放行路径**。beforeEach 全局拦登录时，记得给 `/login` 自身开白名单，否则重定向死循环。

## 小练习

1. 用 Vite 建一个带 Router + Pinia 的 Vue 项目，实现 `/todos` 列表页与 `/todos/:id` 详情页，详情页从路由参数取 id。
2. 把待办列表放进 Pinia store，在两个不同页面里增删，观察另一页面是否同步。
3. 思考题：本站的「学习进度」为什么存在 Pinia + localStorage 而不是路由参数？从「刷新是否应保留」的角度想。
