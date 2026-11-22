---
id: l-vue-router-pinia
slug: vue-router-pinia
title: Vue Router 与 Pinia：多页面与全局状态
difficulty: 3
estMinutes: 85
tags: [Vue, Router, Pinia, SPA]
summary: SPA 的两根骨架：Router 管「URL 与组件怎么绑定」（RouterView 是窗口、守卫设卡防死循环），Pinia 管「跨组件状态放哪」（setup 风格 store + 三分法）——主线搭出列表页、详情页与全局购物车联动。
updated: 2026-11-22
resources:
  - id: r-vue-router
    title: Vue Router 官方文档
    url: https://router.vuejs.org/zh/
    type: doc
    difficulty: 2
    note: 动态路由、嵌套路由与导航守卫的权威参考。
  - id: r-pinia-doc
    title: Pinia 官方文档
    url: https://pinia.vuejs.org/zh/
    type: doc
    difficulty: 2
    note: 官方推荐的状态管理方案，defineStore 两种风格与 getter 的细节都在 Core Concepts 页。
---

> 一句话定义：Router 把 **URL 和组件绑定**（切页面不再刷新整页，`<RouterView>` 是那扇窗口），Pinia 把**跨组件状态收敛到 store**（全局单例、只有一份出处）——两者是真实前端项目的标准骨架。

## 概念讲解

### 从多页面到单页应用：Router 解决什么问题

传统多页网站（MPA）里，每个 URL 对应服务器上的一整份 HTML：切页面 = 重新请求 + 整页刷新，白屏闪烁，填了一半的表单全部丢失。单页应用（SPA）只有一个 HTML 壳，切换视图靠 JS 局部替换——但 URL 也必须跟着变，否则刷新、分享、后退全乱套。**Router 的工作就是让「地址栏变化 ↔ 显示哪个组件」双向同步**：

```text
 URL /todos          URL /todos/2        URL /login
    │                   │                   │
    ▼ 查路由表          ▼ 查路由表          ▼ 查路由表
 TodoList.vue       TodoDetail.vue      Login.vue
    └────────── 都显示在同一个 <RouterView> 窗口 ──────────┘
```

地址变化靠 `history.pushState`——**只改地址栏，不向服务器发请求**，页面自然不闪。对照着理解两种架构：

| 维度 | 多页网站 MPA | 单页应用 SPA |
| ---- | ---- | ---- |
| URL 与页面 | 一个 URL 一份完整 HTML | 一个壳 HTML，URL 只决定窗口里显示哪个组件 |
| 切换体验 | 整页刷新、白屏 | 局部替换、即时反馈 |
| 状态存续 | 刷新即丢 | 跨「页面」存活（一直在内存里） |
| 后退/刷新 | 浏览器天然处理正确 | 必须由 Router 接管 URL 才正确 |

### RouterView：挂在模板里的「窗口」

`<RouterView />` 写在 App.vue 里，相当于墙上开的一扇窗：地址变 → Router 查路由表 → 把匹配到的组件塞进窗口，**窗口外的部分（导航栏、页脚）一动不动**——这就是 SPA「局部换页」的本质。导航用 `<RouterLink to="/todos">`（渲染成 a 标签，但拦截点击、走 Router 换内容而不是真跳转）；主动跳转用 `router.push('/todos')`。

### 动态路由与参数读取

路由表里写 `path: '/todos/:id'`，冒号开头叫**路径参数**（动态路由）：`/todos/2`、`/todos/42` 都匹配这条规则。组件里用 `useRoute()` 读取：

```js
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()      // 读：当前地址信息（params/query/fullPath）
const router = useRouter()    // 写：主动跳转（push/replace/back）
console.log(route.params.id)  // 访问 /todos/3 时得到 '3'（注意是字符串）
router.push(`/todos/${todo.id}`)
```

`route` 是响应式对象——但**别解构它**：上一课刚讲过响应式丢失，`const { id } = route.params` 拿到的是死快照。要 `route.params.id` 直接访问，或 `computed(() => route.params.id)` 常驻跟踪。

### 导航守卫：跳转前设卡，白名单防死循环

`router.beforeEach((to) => ...)` 在**每次跳转前**执行：返回 `true` 放行，返回一个路由对象则重定向。经典用途是「未登录访问受保护页面 → 踢回登录页」。这里埋着新手必踩的死循环：如果 `/login` 也被守卫拦截，重定向到 `/login` 会再次触发守卫，无限递归直到浏览器报错。解法是**白名单**：列出不需要登录就能看的路径，命中直接放行。

```js
const WHITE_LIST = ['/todos', '/login']
router.beforeEach((to) => {
  const logged = localStorage.getItem('token')
  if (logged || WHITE_LIST.some((p) => to.path.startsWith(p))) return true
  return { path: '/login', query: { redirect: to.fullPath } }
})
```

记住这条纪律：**写任何守卫，第一件事是先想「我要拦的页面自己会不会被拦」**。

### 关键的坑：路由参数变了，组件不重跑

从 `/todos/2` 跳到 `/todos/3`，Router 的判断是「仍是 TodoDetail 这个组件」，于是**复用同一个组件实例**——`setup`、`onMounted` 都不重跑，页面数据停在旧 id 上。这是 Router 的性能设计（销毁重建实例太贵），副作用是「参数变化」没有现成的生命周期钩子，要你自己接：标准方案是 watch 路由参数重取数据（本站课程详情页「上一篇/下一篇不刷新」就是这个问题的真实修复）。另一种解法是给 `<RouterView :key="$route.fullPath" />`——key 变了组件就重建，代价是丢掉复用的性能收益，二选一。

### Pinia：跨组件状态的唯一出处

组件私有数据用 ref 已经够（上一课）。可当购物车角标要同时出现在头部、列表页、详情页时，props 层层传递就成了「管道地狱」（prop drilling）。Pinia 的解法：把状态放进 **store**（仓库），任何组件 import 后直接读写，全局单例、只有一份：

```js
// stores/cart.js —— setup 风格：跟写组件完全一样
export const useCartStore = defineStore('cart', () => {
  const items = ref([])                                  // 数据
  const count = computed(() =>                           // 派生值（getter）
    items.value.reduce((s, it) => s + it.qty, 0)
  )
  function add(item) { /* 动作 */ }
  return { items, count, add }
})
```

setup 风格让 store 与组件同构：**ref 管数据、computed 管派生、函数管动作**——上一课的「三问定归属」原封不动搬进 store。派生值写进 store（getter）还有复用红利：总价只算一次，头部、购物车页、结算页处处直接用，不必每个组件各手算一遍——存两份（一份原始数据 + 一份手动维护的总数）迟早不同步。

### 状态放哪：三分法决策表

| 数据特征 | 放哪 | 理由 |
| ---- | ---- | ---- |
| URL 能表达的（资源 id、筛选词、页码） | **路由参数 / query** | 刷新不丢、可分享、可回退——别放进任何状态 |
| 跨组件共享、跨页面存活（购物车、登录态、主题） | **Pinia store** | 全局单份、响应式贯通全站 |
| 组件私有（输入框草稿、面板开关） | **组件 ref** | 别人用不到，放 store 是污染 |

口诀：**能进 URL 的进 URL，多人用的进 store，独享的留组件**。最容易犯的是把「页面的身份」放进状态：课程详情的 id 放进 store，刷新就丢、也没法分享链接；写进路由参数 `/courses/:id`，这两件事自动成立。反过来理解 store 的软肋：它存在内存里，**整页刷新即清空**——所以「登录态」这类要扛刷新的数据，实体（token）放 localStorage，store 只作为运行时的便捷出口。

### 把骨架拼成全景图

```text
 URL ─→ 路由表匹配 ─→ <RouterView> 窗口换组件 ─→ 页面组件（setup/onMounted/watch）
                          │
                          ├── 读 store：header 角标、任意页面 useCartStore()
                          └── 写 store：列表页 cart.add() → 所有订阅处自动更新
 守卫 beforeEach：放行 / 拦截 / 重定向（白名单防死循环）
```

## 代码示例

主线任务：搭一个**双页面 + 全局购物车**的最小项目——todos 列表页、`/todos/:id` 详情页（路由参数），Pinia store 全局共享；守卫拦一名未登录访客；验证两个页面与头部角标联动。全程约 35 分钟，脚手架用 `npm create vue@latest`（勾选 Router 与 Pinia）。

### 第 0 步：路由表与守卫（src/router/index.js）

```js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/todos' },
    { path: '/todos', component: () => import('../pages/TodoList.vue') },
    { path: '/todos/:id', component: () => import('../pages/TodoDetail.vue') },
    { path: '/login', component: () => import('../pages/Login.vue') },
  ],
})

// 白名单：不登录也能看的页面（/login 必须放行，否则重定向死循环）
const WHITE_LIST = ['/todos', '/login']
router.beforeEach((to) => {
  const logged = localStorage.getItem('token')
  if (logged || WHITE_LIST.some((p) => to.path.startsWith(p))) return true
  return { path: '/login', query: { redirect: to.fullPath } }  // 登录后跳回原页
})
export default router
```

main.js 里 `createApp(App).use(createPinia()).use(router).mount('#app')`——两个插件各管一摊，本课聚焦它们本身。

### 第 1 步：购物车 store（src/stores/cart.js）

```js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])                      // 数据
  const count = computed(() =>               // 派生值 1：件数
    items.value.reduce((s, it) => s + it.qty, 0)
  )
  const total = computed(() =>               // 派生值 2：金额
    items.value.reduce((s, it) => s + it.price * it.qty, 0)
  )
  function add(item) {                       // 动作：已存在则加数量，否则新条目
    const hit = items.value.find((it) => it.id === item.id)
    if (hit) hit.qty += 1
    else items.value.push({ ...item, qty: 1 })
  }
  return { items, count, total, add }
})
```

与上一课写组件完全同构——只是这份状态现在全局只有一份。

### 第 2 步：列表页（src/pages/TodoList.vue）

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCartStore } from '../stores/cart'

const todos = ref([])
onMounted(async () => {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5')
  todos.value = await res.json()
})
const cart = useCartStore()
function buy(todo) {
  cart.add({ id: todo.id, name: `待办#${todo.id}`, price: todo.id })
}
</script>

<template>
  <ul>
    <li v-for="t in todos" :key="t.id">
      <RouterLink :to="`/todos/${t.id}`">{{ t.title }}</RouterLink>
      <button @click="buy(t)">加入购物车</button>
    </li>
  </ul>
</template>
```

### 第 3 步：详情页（src/pages/TodoDetail.vue）——路由参数 + watch 重取

```vue
<script setup>
import { ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

const route = useRoute()
const todo = ref(null)

async function load(id) {
  const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
  todo.value = await res.json()
}
load(route.params.id)                        // 首次进入：直接取
watch(() => route.params.id, (id) => load(id))  // 参数变化：组件被复用，setup 不会重跑
</script>

<template>
  <div v-if="todo">
    <h2>{{ todo.title }}</h2>
    <p>状态：{{ todo.completed ? '已完成' : '未完成' }}</p>
    <RouterLink to="/todos">← 返回列表</RouterLink>
  </div>
</template>
```

### 第 4 步：壳组件（src/App.vue）——RouterView 窗口 + 跨页角标

```vue
<script setup>
import { RouterView, RouterLink } from 'vue-router'
import { useCartStore } from './stores/cart'
const cart = useCartStore()
</script>

<template>
  <header>
    <RouterLink to="/todos">列表</RouterLink> |
    购物车：{{ cart.count }} 件 / ¥{{ cart.total }}
  </header>
  <RouterView />   <!-- URL 决定这扇窗口里显示哪个页面组件 -->
</template>
```

### 第 5 步：逐个动作，对答案

- 打开 `/todos`：列表渲染 5 条。点「待办#3」的加购按钮 → **头部角标立即变 `1 件 / ¥3`**——列表页没写过任何「更新头部」的代码，store 的响应式自动贯通两处。
- 点标题进入 `/todos/3`：**地址栏变了，页面没有整页刷新**，header 与角标纹丝不动——SPA 局部换页 + store 存活的直接证据（MPA 里刷新即丢）。
- 在详情页把地址栏的 3 手动改成 4 回车：**内容换成第 4 条**。组件实例被复用，setup 没重跑——是 `watch(() => route.params.id)` 接住了变化重新取数。删掉这行 watch 再试，页面就停在旧数据上：亲手复现本课最大的坑。
- 清掉 localStorage 里的 token，访问 `/todos/2`：被守卫重定向到 `/login?redirect=/todos/2`——`/login` 在白名单里，没有死循环；登录后读 `route.query.redirect` 即可跳回原页。
- 按 F5 整页刷新：购物车清零（store 在内存里，刷新即清空），但**你仍停留在 /todos/2，详情照常显示**——路由参数写在 URL 里，刷新不丢。这就是三分法「能进 URL 的进 URL」的物理意义。

## 常见坑

1. **坑 1：守卫死循环**。现象：访问任意页面卡住，控制台报「Maximum redirects」类错误。原因：重定向目标（如 /login）本身也在守卫拦截范围内，重定向再次触发守卫，无限递归。排查：检查 beforeEach 里重定向目标是否在白名单内；口令是「先放行，再拦截」，白名单用 `to.path.startsWith` 匹配前缀。
2. **坑 2：路由参数变化页面不更新**。现象：详情页之间跳转（上一篇/下一篇）内容停在旧数据。原因：同路由不同参数复用组件实例，setup/onMounted 不重跑。排查：加 `watch(() => route.params.id, load)`；或改 `<RouterView :key="$route.fullPath" />` 强制重建（牺牲性能换省心）。
3. **坑 3：解构 route 丢响应式**。现象：`const { id } = route.params` 之后页面不随地址变化更新。原因：route 虽是响应式对象，解构出的 id 是当次快照——上一课「响应式属于容器」的规则同样适用于这里。排查：改 `route.params.id` 直取，或 `computed(() => route.params.id)`。
4. **坑 4：params 类型是字符串**。现象：`route.params.id === 2` 永远为 false；按 id 找数据找不到。原因：URL 片段天然是字符串，'/todos/2' 解析出 `'2'`。排查：用前先 `Number(route.params.id)` 转换，或路由声明处加正则约束 `'/todos/:id(\\d+)'` 挡住非法 id。
5. **坑 5：刷新后 store 数据蒸发**。现象：购物车/登录态刷新全没。原因：store 是内存态，整页刷新即清空——这不是 bug，是设计。排查：需要扛刷新的数据（token、偏好设置）落 localStorage 或后端，store 只做运行时出口；纯临时态（当前筛选草稿）别持久化，顺带检查它是不是本该进 URL。
6. **坑 6：把 URL 能表达的塞进 store**。现象：分享链接给别人，对方看到的不是你这一页；刷新后回到列表页。原因：资源 id、页码、筛选词这些「定位信息」放进了状态而不是地址。排查：逐条问「这条数据是页面的身份还是页面的内容？」——身份进 URL，内容才进状态。

## 小练习

1. 加一个 `/about` 页面：注册路由、导航里加 `RouterLink`、故意先**不**放进白名单并访问，观察重定向行为，再修复——把「白名单防死循环」变成肌肉记忆。
2. 给详情页加「上一篇 / 下一篇」两个按钮，用 `router.push('/todos/' + (Number(route.params.id) ± 1))` 跳转，确认内容更新靠的是 watch 而不是组件重建。
3. 给 store 加 `remove(id)` 动作：在列表页删除一件商品，观察头部角标与金额同时变化——体会「一份状态、处处同步」，并解释为什么 remove 不需要通知任何组件。
4. **综合任务**：补全登录闭环——Login.vue 读取 `route.query.redirect`，伪造登录成功（写入 token）后 `router.push(redirect || '/todos')`；再用守卫完整验证三条路径：未登录访问受保护页被拦、登录后跳回原页、直接访问 /login 不被拦。要求全程无死循环、无整页刷新。
